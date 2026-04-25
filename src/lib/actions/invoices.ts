"use server";

import { Invoice, StockMovement, Membership, Branch, Product, StockLevel, Customer } from "@/models";
import { IInvoiceLine } from "@/models/sales/Invoice";
import mongoose from "mongoose";

interface InvoiceFilter {
  tenantId: mongoose.Types.ObjectId;
  branchId?: mongoose.Types.ObjectId;
  status?: string;
  fromDate?: Date;
  toDate?: Date;
}

export async function loadInvoices(
  tenantId: string,
  filters: InvoiceFilter
) {
  const match: Record<string, unknown> = { tenantId: new mongoose.Types.ObjectId(tenantId) };

  if (filters.branchId) {
    match.branchId = filters.branchId;
  }

  if (filters.status) {
    match.status = filters.status;
  }

  if (filters.fromDate || filters.toDate) {
    match.issuedAt = {};
    if (filters.fromDate) (match.issuedAt as Record<string, Date>).$gte = filters.fromDate;
    if (filters.toDate) (match.issuedAt as Record<string, Date>).$lte = filters.toDate;
  }

  const invoices = await Invoice.aggregate([
    { $match: match },
    { $sort: { issuedAt: -1 } },
    { $limit: 100 },
    {
      $lookup: {
        from: "branches",
        localField: "branchId",
        foreignField: "_id",
        as: "branch",
      },
    },
    { $unwind: "$branch" },
    {
      $lookup: {
        from: "users",
        localField: "cashierId",
        foreignField: "_id",
        as: "cashier",
      },
    },
    { $unwind: { path: "$cashier", preserveNullAndEmptyArrays: true } },
    {
      $project: {
        invoiceNumber: 1,
        issuedAt: 1,
        status: 1,
        grandTotal: 1,
        "branch.name": 1,
        "cashier.name": 1,
        itemCount: { $size: "$lines" },
      },
    },
  ]);

  return invoices;
}

export async function voidInvoice(invoiceId: string, userId: string) {
  const invoice = await Invoice.findById(invoiceId);
  if (!invoice) return { error: "Invoice not found" };
  if (invoice.status !== "completed") return { error: "Invoice is not completed" };
  if (invoice.voidedAt) return { error: "Invoice already voided" };

  for (const line of invoice.lines) {
    const stock = await StockLevel.findOne({
      tenantId: invoice.tenantId,
      productId: line.productId,
      branchId: invoice.branchId,
    });

    if (stock) {
      const currentQty = parseFloat(stock.quantity.toString());
      await StockLevel.findByIdAndUpdate(stock._id, {
        quantity: (currentQty + parseFloat(line.quantity.toString())).toString(),
      });
    }

    await StockMovement.create({
      tenantId: invoice.tenantId,
      productId: line.productId,
      branchId: invoice.branchId,
      type: "void",
      quantityDelta: line.quantity.toString(),
      quantityAfter: stock
        ? parseFloat(stock.quantity.toString()) + parseFloat(line.quantity.toString())
        : parseFloat(line.quantity.toString()),
      reason: `Void #${invoice.invoiceNumber}`,
      userId: new mongoose.Types.ObjectId(userId),
    });
  }

  await Invoice.findByIdAndUpdate(invoiceId, {
    status: "voided",
    voidedAt: new Date(),
    voidedBy: new mongoose.Types.ObjectId(userId),
  });

  return { success: true };
}

export async function refundInvoice(invoiceId: string, userId: string) {
  const invoice = await Invoice.findById(invoiceId);
  if (!invoice) return { error: "Invoice not found" };
  if (invoice.status !== "completed") return { error: "Can only refund completed invoices" };

  const refundedInvoice = await Invoice.findOne({ refundedInvoiceId: invoice._id });
  if (refundedInvoice) return { error: "Invoice already refunded" };

  for (const line of invoice.lines) {
    const stock = await StockLevel.findOne({
      tenantId: invoice.tenantId,
      productId: line.productId,
      branchId: invoice.branchId,
    });

    if (stock) {
      const currentQty = parseFloat(stock.quantity.toString());
      await StockLevel.findByIdAndUpdate(stock._id, {
        quantity: (currentQty + parseFloat(line.quantity.toString())).toString(),
      });
    }

    await StockMovement.create({
      tenantId: invoice.tenantId,
      productId: line.productId,
      branchId: invoice.branchId,
      type: "refund",
      quantityDelta: line.quantity.toString(),
      quantityAfter: stock
        ? parseFloat(stock.quantity.toString()) + parseFloat(line.quantity.toString())
        : parseFloat(line.quantity.toString()),
      reason: `Refund #${invoice.invoiceNumber}`,
      userId: new mongoose.Types.ObjectId(userId),
    });
  }

  const refundLines: IInvoiceLine[] = invoice.lines.map(line => {
    const neg = (v: mongoose.Types.Decimal128) => {
      const num = parseFloat(v.toString());
      return mongoose.Types.Decimal128.fromString((-num).toString());
    };
    return {
      productId: line.productId,
      sku: line.sku,
      name: line.name,
      nameAr: line.nameAr,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      discountAmount: line.discountAmount,
      netAmount: neg(line.netAmount),
      vatRate: line.vatRate,
      vatAmount: neg(line.vatAmount),
      totalAmount: neg(line.totalAmount),
    };
  });

  const counter = await mongoose.models.InvoiceCounter.findOneAndUpdate(
    { tenantId: invoice.tenantId },
    { $inc: { currentValue: 1 } },
    { new: true, upsert: true }
  );

  const now = new Date();
  await Invoice.create({
    tenantId: invoice.tenantId,
    branchId: invoice.branchId,
    cashierId: new mongoose.Types.ObjectId(userId),
    invoiceNumber: `REF-${counter.currentValue.toString().padStart(8, "0")}`,
    invoiceType: "simplified",
    status: "refunded",
    uuid: new mongoose.Types.ObjectId().toString(),
    issuedAt: now,
    subtotal: mongoose.Types.Decimal128.fromString((-parseFloat(invoice.subtotal.toString())).toString()),
    discountTotal: mongoose.Types.Decimal128.fromString((-parseFloat(invoice.discountTotal.toString())).toString()),
    vatTotal: mongoose.Types.Decimal128.fromString((-parseFloat(invoice.vatTotal.toString())).toString()),
    grandTotal: mongoose.Types.Decimal128.fromString(
      (-parseFloat(invoice.grandTotal.toString())).toString()
    ),
    payments: [],
    refundedInvoiceId: invoice._id,
    customerId: invoice.customerId,
    customerName: invoice.customerName,
    customerVatNumber: invoice.customerVatNumber,
    lines: refundLines,
  });

  return { success: true };
}

export async function getDashboardMetrics(tenantId: string, branchId?: string) {
  const tenantOid = new mongoose.Types.ObjectId(tenantId);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const branchFilter: Record<string, unknown> = { tenantId: tenantOid };
  if (branchId) branchFilter.branchId = new mongoose.Types.ObjectId(branchId);

  const todayInvoices = await Invoice.aggregate([
    {
      $match: {
        ...branchFilter,
        status: "completed",
        issuedAt: { $gte: today, $lt: tomorrow },
      },
    },
    {
      $group: {
        _id: null,
        totalSales: { $sum: { $toDouble: "$grandTotal" } },
        count: { $sum: 1 },
      },
    },
  ]);

  const productCount = await Product.countDocuments({
    tenantId: tenantOid,
    deletedAt: null,
    active: true,
  });

  const customerCount = await Customer.countDocuments({
    tenantId: tenantOid,
    deletedAt: null,
  });

  const lowStock = await StockLevel.aggregate([
    { $match: { tenantId: tenantOid } },
    {
      $lookup: {
        from: "products",
        localField: "productId",
        foreignField: "_id",
        as: "product",
      },
    },
    { $unwind: "$product" },
    {
      $match: {
        "product.deletedAt": null,
        "product.trackStock": true,
        $expr: { $lte: [{ $toDouble: "$quantity" }, "$product.lowStockThreshold"] },
      },
    },
    { $count: "count" },
  ]);

  const recentInvoices = await Invoice.aggregate([
    {
      $match: {
        ...branchFilter,
        status: { $in: ["completed", "refunded", "voided"] },
      },
    },
    { $sort: { issuedAt: -1 } },
    { $limit: 5 },
    {
      $lookup: {
        from: "branches",
        localField: "branchId",
        foreignField: "_id",
        as: "branch",
      },
    },
    { $unwind: "$branch" },
    {
      $project: {
        invoiceNumber: 1,
        issuedAt: 1,
        status: 1,
        grandTotal: 1,
        "branch.name": 1,
      },
    },
  ]);

  return {
    todaySales: todayInvoices[0]?.totalSales || 0,
    todayCount: todayInvoices[0]?.count || 0,
    productCount,
    customerCount,
    lowStockCount: lowStock[0]?.count || 0,
    recentInvoices,
  };
}