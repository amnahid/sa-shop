"use server";

import { getSession } from "@/lib/auth-utils";
import {
  Invoice, InvoiceCounter, ParkedSale, Product, StockLevel, StockMovement,
  Branch, Customer, Membership, IdempotencyRecord, Retainer, Tenant,
  TenantZatcaConfig
} from "@/models";
import { ZatcaClient } from "@/integration/zatca/ZatcaClient";
import { ZatcaInvoiceData, ZATCA_INITIAL_PIH } from "@/integration/zatca/types";
import { sendInvoiceReceipt } from "@/lib/email";
import { reportCriticalFailure } from "@/lib/ops-monitoring";
import { sendInvoiceViaWhatsApp } from "@/lib/actions/invoice-whatsapp";
import { generateQrCodePng, generateInvoiceHash } from "@/lib/utils/zatca-qr";
import mongoose from "mongoose";

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

async function checkIdempotency(key: string) {
  return IdempotencyRecord.findOne({ key });
}

export async function processSale(formData: FormData) {
  const session = await getSession();
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  const membership = await Membership.findOne({ userId: session.user.id, status: "active" });
  if (!membership) {
    return { error: "No active membership" };
  }

  const tenantId = membership.tenantId;
  const userId = session.user.id;

  const mongoSession = await mongoose.startSession();
  mongoSession.startTransaction();

  try {
    const linesRaw = formData.get("lines");
    if (!linesRaw) return { error: "No items" };

    let lines: Array<{
      productId: string;
      sku: string;
      name: string;
      nameAr?: string;
      quantity: number;
      unitPrice: number;
      discountAmount: number;
      netAmount: number;
      vatRate: number;
      vatAmount: number;
      totalAmount: number;
    }>;
    try {
      lines = JSON.parse(linesRaw as string);
    } catch {
      return { error: "Invalid cart data" };
    }

    if (lines.length === 0) return { error: "Cart is empty" };

    const branchId = formData.get("branchId") as string;
    const customerId = formData.get("customerId") as string || undefined;
    const retainerId = formData.get("retainerId") as string || undefined;
    const paymentMethod = formData.get("paymentMethod") as string;
    const shippingAmount = parseFloat(formData.get("shippingAmount") as string) || 0;
    const globalDiscountAmount = parseFloat(formData.get("discountAmount") as string) || 0;
    const idempotencyKey = formData.get("idempotencyKey") as string;

    if (!branchId) return { error: "No branch selected" };

    if (idempotencyKey) {
      const existing = await checkIdempotency(idempotencyKey);
      if (existing) return { invoiceId: (existing.responseBody as { invoiceId: string }).invoiceId };
    }

  const subtotal = round2(lines.reduce((s, l) => s + l.netAmount, 0));
  const lineDiscountTotal = round2(lines.reduce((s, l) => s + l.discountAmount, 0));
  const discountTotal = round2(lineDiscountTotal + globalDiscountAmount);
  const vatTotal = round2(lines.reduce((s, l) => s + l.vatAmount, 0));
  const grandTotal = round2(subtotal + vatTotal - discountTotal + shippingAmount);
  let resolvedCustomerId = customerId;

  let sourceRetainer:
    | {
        _id: mongoose.Types.ObjectId;
        totalAmount: number;
        consumedAmount: number;
        customerId?: mongoose.Types.ObjectId;
      }
    | undefined;

  if (retainerId) {
    const retainer = await Retainer.findOne({
      _id: new mongoose.Types.ObjectId(retainerId),
      tenantId,
      status: "active",
    }).select("_id totalAmount consumedAmount customerId");

    if (!retainer) return { error: "Retainer not found or closed" };

    const retainerTotal = parseFloat(retainer.totalAmount.toString());
    const retainerConsumed = parseFloat(retainer.consumedAmount.toString());
    const retainerRemaining = round2(retainerTotal - retainerConsumed);

    if (retainerRemaining <= 0) return { error: "Retainer has no remaining balance" };
    if (grandTotal > retainerRemaining) {
      return {
        error: `Invoice total exceeds retainer balance (remaining SAR ${retainerRemaining.toFixed(2)})`,
      };
    }

    if (retainer.customerId) {
      if (resolvedCustomerId && resolvedCustomerId !== retainer.customerId.toString()) {
        return { error: "Invoice customer must match retainer customer" };
      }
      resolvedCustomerId = retainer.customerId.toString();
    }

    sourceRetainer = {
      _id: retainer._id as mongoose.Types.ObjectId,
      totalAmount: retainerTotal,
      consumedAmount: retainerConsumed,
      customerId: retainer.customerId as mongoose.Types.ObjectId | undefined,
    };
  }

  const stockLevels = await StockLevel.find({
    tenantId,
    productId: { $in: lines.map(l => new mongoose.Types.ObjectId(l.productId)) },
    branchId: new mongoose.Types.ObjectId(branchId),
  });

  const branch = await Branch.findById(branchId);

  for (const line of lines) {
    const stock = stockLevels.find(
      s => s.productId.toString() === line.productId
    );
    const available = stock ? parseFloat(stock.quantity.toString()) : 0;
    if (available < line.quantity) {
      return { error: `Insufficient stock for ${line.name}. Available: ${available}` };
    }
  }

    const invoiceId = new mongoose.Types.ObjectId();
    const now = new Date();

    // 1. Atomic sequence and PIH fetch/update
    const counter = await InvoiceCounter.findOneAndUpdate(
      { tenantId, branchId: new mongoose.Types.ObjectId(branchId) },
      { $inc: { currentValue: 1 } },
      { 
        new: true, 
        upsert: true, 
        session: mongoSession,
        setDefaultsOnInsert: true 
      }
    );

    const invoiceNumber = `INV-${counter.currentValue.toString().padStart(8, "0")}`;
    const previousHash = counter.previousInvoiceHash || ZATCA_INITIAL_PIH;

    // 2. Prepare ZATCA signing
    const tenant = await Tenant.findById(tenantId).session(mongoSession);
    if (!tenant) {
      return { error: "Tenant not found" };
    }

    const zatcaConfig = await TenantZatcaConfig.findOne({ tenantId }).session(mongoSession);
    const customer = resolvedCustomerId ? await Customer.findById(resolvedCustomerId).session(mongoSession) : null;
    const invoiceType: "Simplified" | "Standard" = (grandTotal >= 1000 && customer?.vatNumber) ? "Standard" : "Simplified";

    let zatcaResult;
    const canSubmit = zatcaConfig && (zatcaConfig.productionCsid || zatcaConfig.complianceCsid);

    if (canSubmit) {
      try {
        const zatcaClient = new ZatcaClient(zatcaConfig);
        const zatcaData: ZatcaInvoiceData = {
          uuid: invoiceId.toString(),
          invoiceNumber,
          invoiceType,
          issueDate: now,
          pih: previousHash,
          currency: "SAR",
          subtotal,
          vatTotal,
          totalWithVat: grandTotal,
          seller: {
            name: zatcaConfig.sellerName,
            nameAr: zatcaConfig.sellerNameAr,
            trn: zatcaConfig.trn,
            buildingNumber: zatcaConfig.address.buildingNumber,
            streetName: zatcaConfig.address.streetName,
            district: zatcaConfig.address.district,
            city: zatcaConfig.address.city,
            postalCode: zatcaConfig.address.postalCode,
            countryCode: "SA",
          },
          buyer: {
            name: customer?.name || "Walk-in Customer",
            trn: customer?.vatNumber || undefined,
            buildingNumber: "1234", 
            streetName: "Street",
            district: "District",
            city: "City",
            postalCode: "12345",
          },
          lineItems: lines.map(l => ({
            name: l.name,
            quantity: l.quantity,
            unitPrice: l.unitPrice,
            vatRate: l.vatRate * 100,
            vatAmount: l.vatAmount,
            totalAmount: l.totalAmount,
          })),
        };
        zatcaResult = await zatcaClient.processInvoice(zatcaData);
      } catch (zatcaError) {
        console.error("ZATCA signing failed, falling back to Phase 1:", zatcaError);
      }
    }

    if (!zatcaResult) {
      // Fallback: Generate a standard Phase 1 compliant QR code and mock invoice hash
      const mockQrCode = await generateQrCodePng({
        sellerName: tenant.name || "SA Shop",
        sellerVatNumber: tenant.vatNumber || "310987654321003",
        timestamp: now.toISOString(),
        invoiceTotal: grandTotal,
        vatTotal: vatTotal,
      });

      const mockHash = await generateInvoiceHash({
        invoiceNumber,
        issuedAt: now,
        grandTotal,
        vatTotal,
        lines: lines.map(l => ({
          name: l.name,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          totalAmount: l.totalAmount,
        })),
      });

      zatcaResult = {
        uuid: invoiceId.toString(),
        qrCode: mockQrCode,
        xml: "N/A",
        xmlHash: mockHash,
        status: "failed", // Set status to failed as in car-dealership, but allow checkout to succeed
      };
    }

    // 3. Update PIH for next invoice
    await InvoiceCounter.updateOne(
      { _id: counter._id },
      { previousInvoiceHash: zatcaResult.xmlHash },
      { session: mongoSession }
    );

    const invoiceLines = lines.map(l => ({
      productId: new mongoose.Types.ObjectId(l.productId),
      sku: l.sku,
      name: l.name,
      nameAr: l.nameAr,
      quantity: mongoose.Types.Decimal128.fromString(l.quantity.toString()),
      unitPrice: mongoose.Types.Decimal128.fromString(l.unitPrice.toString()),
      discountAmount: mongoose.Types.Decimal128.fromString(l.discountAmount.toString()),
      netAmount: mongoose.Types.Decimal128.fromString(l.netAmount.toString()),
      vatRate: l.vatRate,
      vatAmount: mongoose.Types.Decimal128.fromString(l.vatAmount.toString()),
      totalAmount: mongoose.Types.Decimal128.fromString(l.totalAmount.toString()),
    }));

    const payments = [{
      method: paymentMethod as "cash" | "mada" | "visa" | "mastercard" | "stc_pay",
      amount: mongoose.Types.Decimal128.fromString(grandTotal.toString()),
      receivedAt: now,
    }];

    await Invoice.create([{
      _id: invoiceId,
      tenantId,
      branchId: new mongoose.Types.ObjectId(branchId),
      cashierId: new mongoose.Types.ObjectId(userId),
      invoiceNumber,
      invoiceType: invoiceType.toLowerCase(),
      status: "completed",
      zatcaStatus: zatcaResult.status,
      uuid: invoiceId.toString(),
      issuedAt: now,
      previousHash,
      invoiceHash: zatcaResult.xmlHash,
      qrCode: zatcaResult.qrCode,
      xmlPayload: zatcaResult.xml,
      subtotal: mongoose.Types.Decimal128.fromString(subtotal.toString()),
      discountTotal: mongoose.Types.Decimal128.fromString(discountTotal.toString()),
      shippingTotal: mongoose.Types.Decimal128.fromString(shippingAmount.toString()),
      vatTotal: mongoose.Types.Decimal128.fromString(vatTotal.toString()),
      grandTotal: mongoose.Types.Decimal128.fromString(grandTotal.toString()),
      payments,
      customerId: resolvedCustomerId ? new mongoose.Types.ObjectId(resolvedCustomerId) : undefined,
      retainerId: sourceRetainer?._id,
      lines: invoiceLines,
    }], { session: mongoSession });

    for (const line of lines) {
      const stock = stockLevels.find(s => s.productId.toString() === line.productId);
      const currentQty = stock ? parseFloat(stock.quantity.toString()) : 0;

      if (stock) {
        await StockLevel.findByIdAndUpdate(stock._id, {
          quantity: (currentQty - line.quantity).toString(),
        }, { session: mongoSession });
      }

      await StockMovement.create([{
        tenantId,
        productId: new mongoose.Types.ObjectId(line.productId),
        branchId: new mongoose.Types.ObjectId(branchId),
        type: "sale",
        quantityDelta: (-line.quantity).toString(),
        quantityAfter: currentQty - line.quantity,
        reason: `Sale #${invoiceNumber}`,
        userId: new mongoose.Types.ObjectId(userId),
      }], { session: mongoSession });
    }

    if (resolvedCustomerId) {
      await Customer.findByIdAndUpdate(resolvedCustomerId, {
        $inc: { visitCount: 1 },
        $set: { lastVisitAt: now },
      }, { session: mongoSession });
    }

    if (sourceRetainer) {
      const newConsumed = round2(sourceRetainer.consumedAmount + grandTotal);
      const shouldClose = newConsumed >= sourceRetainer.totalAmount;
      await Retainer.findByIdAndUpdate(sourceRetainer._id, {
        consumedAmount: mongoose.Types.Decimal128.fromString(newConsumed.toFixed(2)),
        status: shouldClose ? "closed" : "active",
        closedAt: shouldClose ? now : undefined,
        closedById: shouldClose ? new mongoose.Types.ObjectId(userId) : undefined,
        $push: {
          consumptions: {
            invoiceId,
            invoiceNumber,
            amount: mongoose.Types.Decimal128.fromString(grandTotal.toFixed(2)),
            consumedAt: now,
            consumedById: new mongoose.Types.ObjectId(userId),
          },
        },
      }, { session: mongoSession });
    }

    if (idempotencyKey) {
      await IdempotencyRecord.findOneAndUpdate(
        { key: idempotencyKey },
        { key: idempotencyKey, tenantId, userId, responseBody: { invoiceId: invoiceId.toString() } },
        { upsert: true, session: mongoSession }
      );
    }

    await mongoSession.commitTransaction();
    mongoSession.endSession();

  const emailReceipt = formData.get("emailReceipt") === "true";
  const receiptEmail = formData.get("receiptEmail") as string;

  if (emailReceipt && receiptEmail) {
    await sendInvoiceReceipt({
      to: receiptEmail,
      businessName: tenant?.name || "SA Shop",
      businessAddress: tenant?.address,
      businessVat: tenant?.vatNumber,
      invoiceNumber,
      issuedAt: now,
      branchName: branch?.name,
      lines: lines.map(l => ({
        name: l.name,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        total: l.totalAmount,
      })),
      subtotal,
      vatTotal,
      grandTotal,
      paymentMethod: paymentMethod.replace("_", " "),
    }, {
      tenantId,
      actorTenantId: membership.tenantId,
    });
  }

  const whatsappReceipt = formData.get("whatsappReceipt") === "true";
  if (whatsappReceipt) {
    const waResult = await sendInvoiceViaWhatsApp(invoiceId.toString());
    if (waResult.error) {
      await reportCriticalFailure({
        domain: "pos-checkout",
        operation: "process-sale-whatsapp",
        error: new Error(waResult.error),
        tenantId,
        actorTenantId: membership.tenantId,
        branchId: (formData.get("branchId") as string) || undefined,
        route: "/pos",
        metadata: { invoiceId: invoiceId.toString() },
      });
    }
  }

    return { invoiceId: invoiceId.toString() };
  } catch (error) {
    if (mongoSession.inTransaction()) {
      await mongoSession.abortTransaction();
    }
    mongoSession.endSession();
    
    await reportCriticalFailure({
      domain: "pos-checkout",
      operation: "process-sale",
      error,
      tenantId,
      actorTenantId: membership.tenantId,
      branchId: (formData.get("branchId") as string) || undefined,
      route: "/pos",
      metadata: {
        lineCount: (() => {
          try {
            const lines = JSON.parse((formData.get("lines") as string) || "[]");
            return Array.isArray(lines) ? lines.length : 0;
          } catch {
            return 0;
          }
        })(),
        paymentMethod: (formData.get("paymentMethod") as string) || undefined,
        hasRetainer: Boolean(formData.get("retainerId")),
        hasCustomer: Boolean(formData.get("customerId")),
        hasIdempotencyKey: Boolean(formData.get("idempotencyKey")),
      },
    });
    return { error: "Checkout failed due to a system issue. Please try again." };
  }
}

export async function holdSale(formData: FormData) {
  const session = await getSession();
  if (!session?.user?.id) return { error: "Unauthorized" };

  const membership = await Membership.findOne({ userId: session.user.id, status: "active" });
  if (!membership) return { error: "No active membership" };

  const linesRaw = formData.get("lines") as string;
  if (!linesRaw) return { error: "No items" };

  let lines: Array<{
    productId: string;
    sku: string;
    name: string;
    nameAr?: string;
    quantity: number;
    unitPrice: number;
    discountAmount: number;
    netAmount: number;
    vatRate: number;
    vatAmount: number;
    totalAmount: number;
  }>;
  try {
    lines = JSON.parse(linesRaw);
  } catch {
    return { error: "Invalid cart data" };
  }

  if (lines.length === 0) return { error: "Cart is empty" };

  const branchId = formData.get("branchId") as string;
  const note = formData.get("note") as string;
  const customerId = formData.get("customerId") as string || undefined;

  const parked = await ParkedSale.create({
    tenantId: membership.tenantId,
    branchId: new mongoose.Types.ObjectId(branchId),
    cashierId: new mongoose.Types.ObjectId(session.user.id),
    customerId: customerId ? new mongoose.Types.ObjectId(customerId) : undefined,
    lines: lines.map(l => ({
      productId: new mongoose.Types.ObjectId(l.productId),
      sku: l.sku,
      name: l.name,
      nameAr: l.nameAr,
      quantity: mongoose.Types.Decimal128.fromString(l.quantity.toString()),
      unitPrice: mongoose.Types.Decimal128.fromString(l.unitPrice.toString()),
      discountAmount: mongoose.Types.Decimal128.fromString(l.discountAmount.toString()),
      netAmount: mongoose.Types.Decimal128.fromString(l.netAmount.toString()),
      vatRate: l.vatRate,
      vatAmount: mongoose.Types.Decimal128.fromString(l.vatAmount.toString()),
      totalAmount: mongoose.Types.Decimal128.fromString(l.totalAmount.toString()),
    })),
    note,
    expiresAt: new Date(Date.now() + 86400 * 1000),
  });

  return { parkedId: parked._id.toString() };
}

export async function recallSale(parkedId: string) {
  const session = await getSession();
  if (!session?.user?.id) return null;

  const parked = await ParkedSale.findById(parkedId);
  if (!parked) return null;

  const lines = parked.lines.map(l => ({
    productId: l.productId.toString(),
    sku: l.sku,
    name: l.name,
    nameAr: l.nameAr,
    quantity: parseFloat(l.quantity.toString()),
    unitPrice: parseFloat(l.unitPrice.toString()),
    discountAmount: parseFloat(l.discountAmount.toString()),
    netAmount: parseFloat(l.netAmount.toString()),
    vatRate: l.vatRate,
    vatAmount: parseFloat(l.vatAmount.toString()),
    totalAmount: parseFloat(l.totalAmount.toString()),
  }));

  await ParkedSale.findByIdAndDelete(parkedId);

  return {
    lines,
    branchId: parked.branchId.toString(),
    customerId: parked.customerId?.toString(),
    note: parked.note,
  };
}

export async function listParkedSales(tenantId: string, branchId: string) {
  const session = await getSession();
  if (!session?.user?.id) return [];

  const parked = await ParkedSale.find({
    tenantId: new mongoose.Types.ObjectId(tenantId),
    branchId: new mongoose.Types.ObjectId(branchId),
    expiresAt: { $gt: new Date() },
  }).populate("customerId").sort({ createdAt: -1 });

  return parked.map(p => ({
    _id: p._id.toString(),
    customerName: (p.customerId as unknown as { name: string })?.name || "Walk In Customer",
    itemCount: p.lines.length,
    totalAmount: p.lines.reduce((s, l) => s + parseFloat(l.totalAmount.toString()), 0),
    createdAt: p.createdAt,
    note: p.note,
  }));
}

export async function loadProducts(tenantId: string, branchId: string, categoryId?: string, search?: string) {
  const filter: Record<string, unknown> = {
    tenantId: new mongoose.Types.ObjectId(tenantId),
    deletedAt: null,
    active: true,
  };

  if (categoryId) filter.categoryId = new mongoose.Types.ObjectId(categoryId);
  if (search) filter.$text = { $search: search };

  const products = await Product.find(filter).sort({ name: 1 }).limit(100);

  const stockLevels = await StockLevel.find({
    tenantId: new mongoose.Types.ObjectId(tenantId),
    branchId: new mongoose.Types.ObjectId(branchId),
  });

  return products.map(p => {
    const stock = stockLevels.find(
      s => s.productId.toString() === p._id.toString()
    );
    return {
      _id: p._id.toString(),
      name: p.name,
      nameAr: p.nameAr,
      sku: p.sku,
      barcode: p.barcode,
      unit: p.unit,
      sellingPrice: parseFloat(p.sellingPrice.toString()),
      vatRate: p.vatRate,
      vatInclusivePrice: p.vatInclusivePrice,
      trackStock: p.trackStock,
      lowStockThreshold: p.lowStockThreshold,
      imageUrls: p.imageUrls,
      stock: stock ? parseFloat(stock.quantity.toString()) : 0,
    };
  });
}
