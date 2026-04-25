"use server";

import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth-utils";
import {
  Invoice, InvoiceCounter, ParkedSale, Product, StockLevel, StockMovement,
  Branch, Customer, Membership, IdempotencyRecord, Tenant,
} from "@/models";
import { generateInvoiceHash, generateQrCodePng } from "@/lib/utils/zatca-qr";
import { buildInvoiceXml } from "@/lib/utils/zatca-xml";
import { sendInvoiceReceipt } from "@/lib/email";
import mongoose from "mongoose";

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

async function getNextInvoiceNumber(tenantId: mongoose.Types.ObjectId) {
  const counter = await InvoiceCounter.findOneAndUpdate(
    { tenantId },
    { $inc: { currentValue: 1 } },
    { new: true, upsert: true }
  );
  return `INV-${counter.currentValue.toString().padStart(8, "0")}`;
}

async function checkIdempotency(key: string) {
  return IdempotencyRecord.findOne({ key });
}

async function saveIdempotency(key: string, tenantId: mongoose.Types.ObjectId, userId: mongoose.Types.ObjectId, body: Record<string, unknown>) {
  await IdempotencyRecord.findOneAndUpdate(
    { key },
    { key, tenantId, userId, responseBody: body },
    { upsert: true }
  );
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
  const paymentMethod = formData.get("paymentMethod") as string;
  const cashReceived = parseFloat(formData.get("cashReceived") as string) || 0;
  const idempotencyKey = formData.get("idempotencyKey") as string;

  if (!branchId) return { error: "No branch selected" };

  if (idempotencyKey) {
    const existing = await checkIdempotency(idempotencyKey);
    if (existing) return { invoiceId: (existing.responseBody as { invoiceId: string }).invoiceId };
  }

  const subtotal = round2(lines.reduce((s, l) => s + l.netAmount, 0));
  const discountTotal = round2(lines.reduce((s, l) => s + l.discountAmount, 0));
  const vatTotal = round2(lines.reduce((s, l) => s + l.vatAmount, 0));
  const grandTotal = round2(subtotal + vatTotal - discountTotal);

  const products = await Product.find({
    _id: { $in: lines.map(l => new mongoose.Types.ObjectId(l.productId)) },
  });

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

  const invoiceNumber = await getNextInvoiceNumber(tenantId);
  const now = new Date();
  const invoiceId = new mongoose.Types.ObjectId();

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
    method: paymentMethod as "cash" | "mada" | "visa" | "mastercard" | "amex" | "stc_pay" | "apple_pay",
    amount: mongoose.Types.Decimal128.fromString(grandTotal.toString()),
    receivedAt: now,
  }];

  const tenant = await Tenant.findById(tenantId);
  const previousInvoice = await Invoice.findOne({ tenantId, branchId: new mongoose.Types.ObjectId(branchId) })
    .sort({ issuedAt: -1 });

  const invoiceHash = await generateInvoiceHash({
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

  const qrCodeImage = await generateQrCodePng({
    sellerName: tenant?.name || "Shop",
    sellerVatNumber: tenant?.vatNumber || "",
    timestamp: now.toISOString(),
    invoiceTotal: grandTotal,
    vatTotal,
    signature: invoiceHash.substring(0, 64),
  });

  const xmlPayload = buildInvoiceXml(
    {
      _id: invoiceId,
      tenantId,
      branchId: new mongoose.Types.ObjectId(branchId),
      cashierId: new mongoose.Types.ObjectId(userId),
      invoiceNumber,
      invoiceType: "simplified" as const,
      status: "completed" as const,
      uuid: invoiceId.toString(),
      issuedAt: now,
      subtotal: mongoose.Types.Decimal128.fromString(subtotal.toString()),
      discountTotal: mongoose.Types.Decimal128.fromString(discountTotal.toString()),
      vatTotal: mongoose.Types.Decimal128.fromString(vatTotal.toString()),
      grandTotal: mongoose.Types.Decimal128.fromString(grandTotal.toString()),
      lines: invoiceLines,
      payments,
    } as Parameters<typeof buildInvoiceXml>[0],
    {
      sellerName: tenant?.name || "Shop",
      sellerVatNumber: tenant?.vatNumber || "",
      sellerAddress: tenant?.address || "",
      sellerCrNumber: tenant?.crNumber || "",
      invoiceType: "simplified",
      invoiceHash,
    }
  );

  await Invoice.create({
    _id: invoiceId,
    tenantId,
    branchId: new mongoose.Types.ObjectId(branchId),
    cashierId: new mongoose.Types.ObjectId(userId),
    invoiceNumber,
    invoiceType: "simplified",
    status: "completed",
    uuid: invoiceId.toString(),
    issuedAt: now,
    previousHash: previousInvoice?.invoiceHash || "",
    invoiceHash,
    qrCode: qrCodeImage,
    xmlPayload,
    subtotal: mongoose.Types.Decimal128.fromString(subtotal.toString()),
    discountTotal: mongoose.Types.Decimal128.fromString(discountTotal.toString()),
    vatTotal: mongoose.Types.Decimal128.fromString(vatTotal.toString()),
    grandTotal: mongoose.Types.Decimal128.fromString(grandTotal.toString()),
    payments,
    customerId: customerId ? new mongoose.Types.ObjectId(customerId) : undefined,
    lines: invoiceLines,
  });

  for (const line of lines) {
    const stock = stockLevels.find(s => s.productId.toString() === line.productId);
    const currentQty = stock ? parseFloat(stock.quantity.toString()) : 0;

    if (stock) {
      await StockLevel.findByIdAndUpdate(stock._id, {
        quantity: (currentQty - line.quantity).toString(),
      });
    }

    await StockMovement.create({
      tenantId,
      productId: new mongoose.Types.ObjectId(line.productId),
      branchId: new mongoose.Types.ObjectId(branchId),
      type: "sale",
      quantityDelta: (-line.quantity).toString(),
      quantityAfter: currentQty - line.quantity,
      reason: `Sale #${invoiceNumber}`,
      userId: new mongoose.Types.ObjectId(userId),
    });
  }

  if (customerId) {
    await Customer.findByIdAndUpdate(customerId, {
      $inc: { visitCount: 1 },
      $set: { lastVisitAt: now },
    });
  }

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
    });
  }

  if (idempotencyKey) {
    await saveIdempotency(idempotencyKey, tenantId, new mongoose.Types.ObjectId(userId), { invoiceId: invoiceId.toString() });
  }

  return { invoiceId: invoiceId.toString() };
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