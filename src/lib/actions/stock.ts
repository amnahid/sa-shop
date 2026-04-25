"use server";

import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth-utils";
import { StockLevel, StockMovement, Product, Branch, Membership } from "@/models";
import mongoose from "mongoose";

export async function adjustStock(formData: FormData) {
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

  const productId = formData.get("productId") as string;
  const branchId = formData.get("branchId") as string;
  const adjustment = parseInt(formData.get("adjustment") as string);
  const reason = formData.get("reason") as string;
  const notes = formData.get("notes") as string;

  if (!productId || !branchId) {
    return { error: "Product and branch are required" };
  }

  const stockLevel = await StockLevel.findOne({
    tenantId,
    productId: new mongoose.Types.ObjectId(productId),
    branchId: new mongoose.Types.ObjectId(branchId),
  });

  const currentQty = stockLevel ? parseFloat(stockLevel.quantity.toString()) : 0;
  const newQty = currentQty + adjustment;

  if (newQty < 0) {
    return { error: "Cannot reduce stock below 0" };
  }

  if (stockLevel) {
    await StockLevel.findByIdAndUpdate(stockLevel._id, {
      quantity: newQty.toString(),
    });
  } else {
    await StockLevel.create({
      tenantId,
      productId: new mongoose.Types.ObjectId(productId),
      branchId: new mongoose.Types.ObjectId(branchId),
      quantity: newQty.toString(),
      reservedQuantity: "0",
    });
  }

  await StockMovement.create({
    tenantId,
    productId: new mongoose.Types.ObjectId(productId),
    branchId: new mongoose.Types.ObjectId(branchId),
    type: adjustment > 0 ? "purchase" : "adjustment",
    quantityDelta: adjustment.toString(),
    quantityAfter: newQty.toString(),
    reason: reason || (adjustment > 0 ? "Manual adjustment" : "Count correction"),
    userId: new mongoose.Types.ObjectId(userId),
  });

  return { success: true };
}

export async function transferStock(formData: FormData) {
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

  const productId = formData.get("productId") as string;
  const fromBranchId = formData.get("fromBranchId") as string;
  const toBranchId = formData.get("toBranchId") as string;
  const quantity = parseInt(formData.get("quantity") as string);

  if (!productId || !fromBranchId || !toBranchId || fromBranchId === toBranchId) {
    return { error: "Invalid transfer details" };
  }

  if (quantity <= 0) {
    return { error: "Quantity must be greater than 0" };
  }

  const fromStock = await StockLevel.findOne({
    tenantId,
    productId: new mongoose.Types.ObjectId(productId),
    branchId: new mongoose.Types.ObjectId(fromBranchId),
  });

  if (!fromStock || parseFloat(fromStock.quantity.toString()) < quantity) {
    return { error: "Insufficient stock in source branch" };
  }

  const toStock = await StockLevel.findOne({
    tenantId,
    productId: new mongoose.Types.ObjectId(productId),
    branchId: new mongoose.Types.ObjectId(toBranchId),
  });

  const fromQty = parseFloat(fromStock.quantity.toString());
  const toQty = toStock ? parseFloat(toStock.quantity.toString()) : 0;

  await StockLevel.findByIdAndUpdate(fromStock._id, {
    quantity: (fromQty - quantity).toString(),
  });

  if (toStock) {
    await StockLevel.findByIdAndUpdate(toStock._id, {
      quantity: (toQty + quantity).toString(),
    });
  } else {
    await StockLevel.create({
      tenantId,
      productId: new mongoose.Types.ObjectId(productId),
      branchId: new mongoose.Types.ObjectId(toBranchId),
      quantity: quantity.toString(),
      reservedQuantity: "0",
    });
  }

  const product = await Product.findById(productId);

  await StockMovement.create({
    tenantId,
    productId: new mongoose.Types.ObjectId(productId),
    branchId: new mongoose.Types.ObjectId(fromBranchId),
    type: "transfer_out",
    quantityDelta: (-quantity).toString(),
    quantityAfter: fromQty - quantity,
    reason: `Transfer to ${(await Branch.findById(toBranchId))?.name}`,
    userId: new mongoose.Types.ObjectId(userId),
  });

  await StockMovement.create({
    tenantId,
    productId: new mongoose.Types.ObjectId(productId),
    branchId: new mongoose.Types.ObjectId(toBranchId),
    type: "transfer_in",
    quantityDelta: quantity.toString(),
    quantityAfter: toQty + quantity,
    reason: `Transfer from ${(await Branch.findById(fromBranchId))?.name}`,
    userId: new mongoose.Types.ObjectId(userId),
  });

  return { success: true };
}