"use server";

import { getSession } from "@/lib/auth-utils";
import { PurchaseOrder, Product, StockLevel, StockBatch, StockMovement, Branch, Supplier, Membership } from "@/models";
import mongoose from "mongoose";

async function getNextPoNumber(tenantId: mongoose.Types.ObjectId) {
  const count = await PurchaseOrder.countDocuments({ tenantId });
  return `PO-${(count + 1).toString().padStart(8, "0")}`;
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export async function createPurchaseOrder(formData: FormData) {
  const session = await getSession();
  if (!session?.user?.id) return { error: "Unauthorized" };

  const membership = await Membership.findOne({ userId: session.user.id, status: "active" });
  if (!membership) return { error: "No active membership" };

  if (membership.role === "cashier") return { error: "Insufficient permissions" };

  const linesRaw = formData.get("lines") as string;
  if (!linesRaw) return { error: "No items" };

  let lines: Array<{
    productId: string;
    sku: string;
    name: string;
    quantityOrdered: number;
    unitCost: number;
  }>;
  try {
    lines = JSON.parse(linesRaw);
  } catch {
    return { error: "Invalid line data" };
  }

  if (lines.length === 0) return { error: "At least one line item is required" };

  const supplierId = formData.get("supplierId") as string;
  const branchId = formData.get("branchId") as string;

  if (!supplierId || !branchId) return { error: "Supplier and branch are required" };

  const poLines = lines.map(l => ({
    productId: new mongoose.Types.ObjectId(l.productId),
    sku: l.sku,
    name: l.name,
    quantityOrdered: l.quantityOrdered,
    quantityReceived: 0,
    unitCost: round2(l.unitCost),
    totalCost: round2(l.quantityOrdered * l.unitCost),
  }));

  const po = await PurchaseOrder.create({
    tenantId: membership.tenantId,
    supplierId: new mongoose.Types.ObjectId(supplierId),
    branchId: new mongoose.Types.ObjectId(branchId),
    createdById: new mongoose.Types.ObjectId(session.user.id),
    poNumber: await getNextPoNumber(membership.tenantId),
    status: "draft",
    notes: formData.get("notes") as string || undefined,
    expectedDate: formData.get("expectedDate") as string
      ? new Date(formData.get("expectedDate") as string)
      : undefined,
    issuedAt: new Date(),
    lines: poLines,
  });

  return { poId: po._id.toString() };
}

export async function submitPurchaseOrder(poId: string) {
  const session = await getSession();
  if (!session?.user?.id) return { error: "Unauthorized" };

  const membership = await Membership.findOne({ userId: session.user.id, status: "active" });
  if (!membership || membership.role === "cashier") return { error: "Insufficient permissions" };

  const po = await PurchaseOrder.findOne({ _id: poId, tenantId: membership.tenantId });
  if (!po) return { error: "Purchase order not found" };
  if (po.status !== "draft") return { error: "Only draft orders can be submitted" };

  await PurchaseOrder.findByIdAndUpdate(poId, { status: "submitted" });
  return { success: true };
}

export async function cancelPurchaseOrder(poId: string) {
  const session = await getSession();
  if (!session?.user?.id) return { error: "Unauthorized" };

  const membership = await Membership.findOne({ userId: session.user.id, status: "active" });
  if (!membership || membership.role === "cashier") return { error: "Insufficient permissions" };

  const po = await PurchaseOrder.findOne({ _id: poId, tenantId: membership.tenantId });
  if (!po) return { error: "Purchase order not found" };
  if (po.status === "received" || po.status === "cancelled") {
    return { error: "Cannot cancel this order" };
  }

  await PurchaseOrder.findByIdAndUpdate(poId, { status: "cancelled" });
  return { success: true };
}

export async function receivePurchaseOrderLine(
  poId: string,
  lineIndex: number,
  receivedQty: number,
  batchNumber: string,
  expiryDate?: string
) {
  const session = await getSession();
  if (!session?.user?.id) return { error: "Unauthorized" };

  const membership = await Membership.findOne({ userId: session.user.id, status: "active" });
  if (!membership || membership.role === "cashier") return { error: "Insufficient permissions" };

  if (receivedQty <= 0) return { error: "Quantity must be positive" };

  const po = await PurchaseOrder.findOne({ _id: poId, tenantId: membership.tenantId });
  if (!po) return { error: "Purchase order not found" };
  if (po.status === "cancelled" || po.status === "received") {
    return { error: "Cannot receive on this order" };
  }

  const line = po.lines[lineIndex];
  if (!line) return { error: "Line not found" };

  const remaining = line.quantityOrdered - line.quantityReceived;
  if (receivedQty > remaining) {
    return { error: `Only ${remaining} remaining to receive` };
  }

  const newReceived = line.quantityReceived + receivedQty;
  const costPrice = line.unitCost;

  let stockLevel = await StockLevel.findOne({
    tenantId: membership.tenantId,
    productId: line.productId,
    branchId: po.branchId,
  });

  if (stockLevel) {
    await StockLevel.findByIdAndUpdate(stockLevel._id, {
      quantity: (parseFloat(stockLevel.quantity.toString()) + receivedQty).toString(),
    });
  } else {
    await StockLevel.create({
      tenantId: membership.tenantId,
      productId: line.productId,
      branchId: po.branchId,
      quantity: receivedQty.toString(),
      reservedQuantity: "0",
    });
    stockLevel = await StockLevel.findOne({
      tenantId: membership.tenantId,
      productId: line.productId,
      branchId: po.branchId,
    });
  }

  const batchCount = await StockBatch.countDocuments({ tenantId: membership.tenantId });
  await StockBatch.create({
    tenantId: membership.tenantId,
    productId: line.productId,
    branchId: po.branchId,
    batchNumber: batchNumber || `BATCH-${(batchCount + 1).toString().padStart(8, "0")}`,
    expiryDate: expiryDate ? new Date(expiryDate) : undefined,
    quantity: receivedQty,
    costPrice: mongoose.Types.Decimal128.fromString(costPrice.toString()),
    supplierId: po.supplierId,
    receivedAt: new Date(),
  });

  await StockMovement.create({
    tenantId: membership.tenantId,
    productId: line.productId,
    branchId: po.branchId,
    type: "purchase",
    quantityDelta: receivedQty.toString(),
    quantityAfter: stockLevel ? parseFloat(stockLevel.quantity.toString()) + receivedQty : receivedQty,
    reason: `PO #${po.poNumber}`,
    userId: new mongoose.Types.ObjectId(session.user.id),
  });

  po.lines[lineIndex].quantityReceived = newReceived;
  const allReceived = po.lines.every(l => l.quantityReceived >= l.quantityOrdered);
  const anyReceived = po.lines.some(l => l.quantityReceived > 0);

  await PurchaseOrder.findByIdAndUpdate(poId, {
    lines: po.lines,
    status: allReceived ? "received" : anyReceived ? "partially_received" : "submitted",
    deliveredAt: allReceived ? new Date() : undefined,
  });

  return { success: true };
}

export async function loadPurchaseOrders(tenantId: string, status?: string) {
  const filter: Record<string, unknown> = {
    tenantId: new mongoose.Types.ObjectId(tenantId),
  };
  if (status) filter.status = status;

  const pos = await PurchaseOrder.aggregate([
    { $match: filter },
    { $sort: { issuedAt: -1 } },
    { $limit: 100 },
    {
      $lookup: {
        from: "suppliers",
        localField: "supplierId",
        foreignField: "_id",
        as: "supplier",
      },
    },
    { $unwind: "$supplier" },
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
        poNumber: 1,
        status: 1,
        issuedAt: 1,
        expectedDate: 1,
        "supplier.name": 1,
        "branch.name": 1,
        totalValue: { $sum: "$lines.totalCost" },
        lineCount: { $size: "$lines" },
      },
    },
  ]);

  return pos;
}