"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { getSession } from "@/lib/auth-utils";
import { Branch, Category, Membership, Product, StockLevel, StockMovement } from "@/models";
import mongoose from "mongoose";
import { type ProductsActionState } from "./onboarding.types";

const productsSchema = z.object({
  csv: z.string().trim().min(1, "CSV data is required"),
});

type ParsedProduct = {
  sku: string;
  barcode: string;
  name: string;
  nameAr: string;
  category: string;
  unit: string;
  sellingPrice: number;
  vatRate: number;
  trackStock: boolean;
  lowStockThreshold: number;
  expiryTracking: boolean;
  quantity: number;
};

function parseCSV(csvText: string): ParsedProduct[] {
  const lines = csvText.trim().split("\n");
  if (lines.length < 2) {
    return [];
  }

  const headers = lines[0].split(",").map((header) => header.trim().toLowerCase());
  const products: ParsedProduct[] = [];

  for (let index = 1; index < lines.length; index += 1) {
    const values = lines[index].split(",").map((value) => value.trim());
    const row: Record<string, string> = {};

    headers.forEach((header, headerIndex) => {
      row[header] = values[headerIndex] || "";
    });

    const name = row.name;
    if (!name) {
      continue;
    }

    products.push({
      sku: row.sku || `SKU${Date.now()}${index}`,
      barcode: row.barcode || "",
      name,
      nameAr: row.namear || "",
      category: row.category || "",
      unit: row.unit || "piece",
      sellingPrice: parseFloat(row.sellingprice || "0"),
      vatRate: parseFloat(row.vatrate || "0.15"),
      trackStock: row.trackstock !== "false",
      lowStockThreshold: parseInt(row.lowstockthreshold || "10", 10),
      expiryTracking: row.expirytracking === "true",
      quantity: parseFloat(row.quantity || "0"),
    });
  }

  return products;
}

export async function importProductsAction(
  _prevState: ProductsActionState,
  formData: FormData
): Promise<ProductsActionState> {
  const parsedInput = productsSchema.safeParse({
    csv: formData.get("csv"),
  });

  if (!parsedInput.success) {
    return {
      status: "error",
      code: "VALIDATION_ERROR",
      message: "Please provide CSV data before importing.",
      fieldErrors: {
        csv: parsedInput.error.flatten().fieldErrors.csv?.[0],
      },
    };
  }

  const parsedProducts = parseCSV(parsedInput.data.csv);
  if (parsedProducts.length === 0) {
    return {
      status: "error",
      code: "EMPTY_CSV",
      message: "No valid product rows were found in your CSV.",
      fieldErrors: {
        csv: "Add at least one row with a product name.",
      },
    };
  }

  const sessionUser = await getSession();
  if (!sessionUser?.user?.id) {
    return {
      status: "error",
      code: "AUTH_REQUIRED",
      message: "Your session has expired. Please sign in again.",
    };
  }

  const membership = await Membership.findOne({ userId: sessionUser.user.id, status: "active" });
  if (!membership) {
    return {
      status: "error",
      code: "SETUP_CONTEXT_MISSING",
      message: "Unable to continue setup for this account. Please contact support.",
    };
  }

  const tenantId = membership.tenantId;
  const branch = await Branch.findOne({ tenantId, isHeadOffice: true });

  try {
    for (const productInput of parsedProducts) {
      let categoryId: mongoose.Types.ObjectId | undefined;

      if (productInput.category) {
        let category = await Category.findOne({ tenantId, name: productInput.category });
        if (!category) {
          category = await Category.create({
            tenantId,
            name: productInput.category,
            nameAr: "",
            active: true,
          });
        }

        categoryId = category._id as mongoose.Types.ObjectId;
      }

      const product = await Product.create({
        tenantId,
        sku: productInput.sku,
        barcode: productInput.barcode,
        name: productInput.name,
        nameAr: productInput.nameAr,
        categoryId,
        unit: productInput.unit,
        sellingPrice: productInput.sellingPrice.toString(),
        vatRate: productInput.vatRate,
        vatInclusivePrice: true,
        trackStock: productInput.trackStock,
        lowStockThreshold: productInput.lowStockThreshold,
        expiryTracking: productInput.expiryTracking,
        active: true,
      });

      if (productInput.quantity > 0 && branch && productInput.trackStock) {
        await StockLevel.create({
          tenantId,
          productId: product._id,
          branchId: branch._id,
          quantity: productInput.quantity.toString(),
          reservedQuantity: "0",
        });

        await StockMovement.create({
          tenantId,
          productId: product._id,
          branchId: branch._id,
          type: "purchase",
          quantityDelta: productInput.quantity.toString(),
          quantityAfter: productInput.quantity.toString(),
          reason: "Initial stock",
          userId: new mongoose.Types.ObjectId(sessionUser.user.id),
        });
      }
    }
  } catch (error) {
    console.error("Import error:", error);
    return {
      status: "error",
      code: "SERVER_ERROR",
      message: "We could not import products right now. Please try again.",
    };
  }

  redirect("/onboarding/team");
}
