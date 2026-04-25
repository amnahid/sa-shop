"use server";

import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth-utils";
import { Product, StockLevel, Category, Membership, Branch, StockMovement } from "@/models";
import mongoose from "mongoose";

function parseCSV(csvText: string) {
  const lines = csvText.trim().split("\n");
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const products: any[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",").map((v) => v.trim());
    const row: any = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] || "";
    });

    const sku = row.sku || `SKU${Date.now()}${i}`;
    const name = row.name;
    if (!name) continue;

    products.push({
      sku,
      barcode: row.barcode,
      name,
      nameAr: row.namear,
      category: row.category,
      unit: row.unit || "piece",
      sellingPrice: parseFloat(row.sellingprice || "0"),
      vatRate: parseFloat(row.vatrate || "0.15"),
      trackStock: row.trackstock !== "false",
      lowStockThreshold: parseInt(row.lowstockthreshold || "10"),
      expiryTracking: row.expirytracking === "true",
      quantity: parseFloat(row.quantity || "0"),
    });
  }

  return products;
}

export async function importProductsAction(formData: FormData) {
  const csvText = formData.get("csv") as string;

  if (!csvText) {
    return;
  }

  const parsed = parseCSV(csvText);
  if (parsed.length === 0) {
    return;
  }

  const sessionUser = await getSession();
  if (!sessionUser?.user?.id) {
    return;
  }

  const membership = await Membership.findOne({ userId: sessionUser.user.id, status: "active" });
  if (!membership) {
    return;
  }

  const tenantId = membership.tenantId;
  const branch = await Branch.findOne({ tenantId, isHeadOffice: true });

  try {
    for (const p of parsed) {
      let categoryId;
      if (p.category) {
        let cat = await Category.findOne({ tenantId, name: p.category });
        if (!cat) {
          cat = await Category.create({ tenantId, name: p.category, nameAr: "", active: true });
        }
        categoryId = cat._id;
      }

      const product = await Product.create({
        tenantId,
        sku: p.sku,
        barcode: p.barcode,
        name: p.name,
        nameAr: p.nameAr,
        categoryId,
        unit: p.unit,
        sellingPrice: p.sellingPrice.toString(),
        vatRate: p.vatRate,
        vatInclusivePrice: true,
        trackStock: p.trackStock,
        lowStockThreshold: p.lowStockThreshold,
        expiryTracking: p.expiryTracking,
        active: true,
      });

      if (p.quantity > 0 && branch && p.trackStock) {
        await StockLevel.create({
          tenantId,
          productId: product._id,
          branchId: branch._id,
          quantity: p.quantity.toString(),
          reservedQuantity: "0",
        });

        await StockMovement.create({
          tenantId,
          productId: product._id,
          branchId: branch._id,
          type: "purchase",
          quantityDelta: p.quantity.toString(),
          quantityAfter: p.quantity.toString(),
          reason: "Initial stock",
          userId: new mongoose.Types.ObjectId(sessionUser.user.id),
        });
      }
    }
  } catch (error) {
    console.error("Import error:", error);
    return;
  }

  redirect("/onboarding/team");
}