"use server";

import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth-utils";
import { Product, StockLevel, Category, Branch, Membership } from "@/models";
import mongoose from "mongoose";
import { generateSKU } from "@/lib/utils/csv";

export async function createProduct(formData: FormData) {
  const session = await getSession();
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  const membership = await Membership.findOne({ userId: session.user.id, status: "active" });
  if (!membership) {
    return { error: "No active membership" };
  }

  const tenantId = membership.tenantId;

  const sku = (formData.get("sku") as string) || generateSKU();
  const name = formData.get("name") as string;
  if (!name) {
    return { error: "Name is required" };
  }

  const existing = await Product.findOne({ tenantId, sku });
  if (existing) {
    return { error: "SKU already exists" };
  }

  const categoryIdStr = formData.get("categoryId") as string;
  const categoryId = categoryIdStr ? new mongoose.Types.ObjectId(categoryIdStr) : undefined;

  const product = await Product.create({
    tenantId,
    sku,
    barcode: formData.get("barcode") as string || undefined,
    name,
    nameAr: formData.get("nameAr") as string || undefined,
    categoryId,
    unit: formData.get("unit") as string || "piece",
    sellingPrice: formData.get("sellingPrice") as string || "0",
    vatRate: parseFloat(formData.get("vatRate") as string || "0.15"),
    vatInclusivePrice: true,
    trackStock: formData.get("trackStock") === "on",
    lowStockThreshold: parseInt(formData.get("lowStockThreshold") as string || "10"),
    expiryTracking: formData.get("expiryTracking") === "on",
    active: true,
  });

  const branches = await Branch.find({ tenantId, active: true });
  for (const branch of branches) {
    await StockLevel.create({
      tenantId,
      productId: product._id,
      branchId: branch._id,
      quantity: "0",
      reservedQuantity: "0",
    });
  }

  redirect("/inventory/products");
}

export async function updateProduct(id: string, formData: FormData) {
  const session = await getSession();
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  const membership = await Membership.findOne({ userId: session.user.id, status: "active" });
  if (!membership) {
    return { error: "No active membership" };
  }

  const tenantId = membership.tenantId;

  const categoryIdStr = formData.get("categoryId") as string;
  const categoryId = categoryIdStr ? new mongoose.Types.ObjectId(categoryIdStr) : undefined;

  await Product.findOneAndUpdate(
    { _id: id, tenantId },
    {
      sku: formData.get("sku") as string,
      barcode: formData.get("barcode") as string || undefined,
      name: formData.get("name") as string,
      nameAr: formData.get("nameAr") as string || undefined,
      categoryId,
      unit: formData.get("unit") as string,
      sellingPrice: formData.get("sellingPrice") as string,
      vatRate: parseFloat(formData.get("vatRate") as string),
      trackStock: formData.get("trackStock") === "on",
      lowStockThreshold: parseInt(formData.get("lowStockThreshold") as string || "10"),
      expiryTracking: formData.get("expiryTracking") === "on",
    }
  );

  redirect("/inventory/products");
}

export async function deleteProduct(id: string) {
  const session = await getSession();
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  const membership = await Membership.findOne({ userId: session.user.id, status: "active" });
  if (!membership) {
    return { error: "No active membership" };
  }

  const tenantId = membership.tenantId;

  await Product.findOneAndUpdate(
    { _id: id, tenantId },
    { deletedAt: new Date() }
  );

  return { success: true };
}