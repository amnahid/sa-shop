"use server";

import { revalidatePath } from "next/cache";
import { Product, StockLevel, Category, Branch } from "@/models";
import mongoose from "mongoose";
import { generateSKU } from "@/lib/utils/csv";
import { runAuthorizedBulkAction } from "@/lib/actions/bulk";
import { getAuthorizedSessionMembership } from "@/lib/utils/server-authorization";

const PRODUCTS_PERMISSION = "inventory.products:view" as const;

async function getAuthorizedProductsContext() {
  const auth = await getAuthorizedSessionMembership(PRODUCTS_PERMISSION);
  if ("error" in auth || !("membership" in auth)) {
    return { error: auth.error ?? "Unauthorized" };
  }

  return {
    tenantId: auth.membership.tenantId.toString(),
    sessionUserId: auth.sessionUserId,
  };
}

async function resolveCategoryForTenant(
  tenantId: string,
  categoryIdInput: string | null
): Promise<{ categoryId?: mongoose.Types.ObjectId; error?: string }> {
  const categoryIdStr = categoryIdInput?.trim();
  if (!categoryIdStr) {
    return {};
  }

  if (!mongoose.Types.ObjectId.isValid(categoryIdStr)) {
    return { error: "Invalid category selected" };
  }

  const categoryId = new mongoose.Types.ObjectId(categoryIdStr);
  const category = await Category.findOne({
    _id: categoryId,
    tenantId,
    deletedAt: null,
    active: true,
  }).select({ _id: 1 });

  if (!category) {
    return { error: "Selected category is unavailable" };
  }

  return { categoryId };
}

export async function createProduct(formData: FormData) {
  const auth = await getAuthorizedProductsContext();
  if ("error" in auth) {
    return { error: auth.error };
  }

  const tenantId = auth.tenantId;

  const sku = (formData.get("sku") as string) || generateSKU();
  const name = (formData.get("name") as string | null)?.trim() ?? "";
  if (!name) {
    return { error: "Name is required" };
  }

  const existing = await Product.findOne({ tenantId, sku });
  if (existing) {
    return { error: "SKU already exists" };
  }

  const categoryInput = await resolveCategoryForTenant(
    tenantId,
    (formData.get("categoryId") as string | null) ?? null
  );
  if (categoryInput.error) {
    return { error: categoryInput.error };
  }

  const product = await Product.create({
    tenantId,
    sku,
    barcode: formData.get("barcode") as string || undefined,
    name,
    nameAr: formData.get("nameAr") as string || undefined,
    categoryId: categoryInput.categoryId,
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

  revalidatePath("/inventory/products");
  revalidatePath(`/inventory/products/${product._id.toString()}`);
  return { success: true, productId: product._id.toString(), message: "Product created successfully" };
}

export async function updateProduct(id: string, formData: FormData) {
  const auth = await getAuthorizedProductsContext();
  if ("error" in auth) {
    return { error: auth.error };
  }

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return { error: "Invalid product ID" };
  }

  const tenantId = auth.tenantId;
  const categoryInput = await resolveCategoryForTenant(
    tenantId,
    (formData.get("categoryId") as string | null) ?? null
  );
  if (categoryInput.error) {
    return { error: categoryInput.error };
  }

  const updated = await Product.findOneAndUpdate(
    { _id: id, tenantId },
    {
      sku: formData.get("sku") as string,
      barcode: formData.get("barcode") as string || undefined,
      name: formData.get("name") as string,
      nameAr: formData.get("nameAr") as string || undefined,
      categoryId: categoryInput.categoryId,
      unit: formData.get("unit") as string,
      sellingPrice: formData.get("sellingPrice") as string,
      vatRate: parseFloat(formData.get("vatRate") as string),
      trackStock: formData.get("trackStock") === "on",
      lowStockThreshold: parseInt(formData.get("lowStockThreshold") as string || "10"),
      expiryTracking: formData.get("expiryTracking") === "on",
    },
    { new: true }
  );

  if (!updated) {
    return { error: "Product not found" };
  }

  revalidatePath("/inventory/products");
  revalidatePath(`/inventory/products/${updated._id.toString()}`);
  return { success: true, message: "Product updated successfully" };
}

export async function archiveProduct(id: string) {
  const auth = await getAuthorizedProductsContext();
  if ("error" in auth) {
    return { error: auth.error };
  }

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return { error: "Invalid product ID" };
  }

  const updated = await Product.findOneAndUpdate(
    { _id: id, tenantId: auth.tenantId, deletedAt: null },
    { deletedAt: new Date() }
  );

  if (!updated) {
    return { error: "Product not found or already archived" };
  }

  revalidatePath("/inventory/products");
  revalidatePath(`/inventory/products/${id}`);
  return { success: true, message: "Product archived successfully" };
}

export async function restoreProduct(id: string) {
  const auth = await getAuthorizedProductsContext();
  if ("error" in auth) {
    return { error: auth.error };
  }

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return { error: "Invalid product ID" };
  }

  const updated = await Product.findOneAndUpdate(
    { _id: id, tenantId: auth.tenantId, deletedAt: { $ne: null } },
    { deletedAt: null }
  );

  if (!updated) {
    return { error: "Product not found or already active" };
  }

  revalidatePath("/inventory/products");
  revalidatePath(`/inventory/products/${id}`);
  return { success: true, message: "Product restored successfully" };
}

export async function permanentlyDeleteProduct(id: string) {
  const auth = await getAuthorizedProductsContext();
  if ("error" in auth) {
    return { error: auth.error };
  }

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return { error: "Invalid product ID" };
  }

  const result = await Product.deleteOne({
    _id: id,
    tenantId: auth.tenantId,
    deletedAt: { $ne: null },
  });

  if ((result.deletedCount ?? 0) === 0) {
    return { error: "Archived product not found" };
  }

  revalidatePath("/inventory/products");
  revalidatePath(`/inventory/products/${id}`);
  return { success: true, message: "Product deleted permanently" };
}

export async function deleteProduct(id: string) {
  return archiveProduct(id);
}

export async function bulkArchiveProducts(formData: FormData) {
  return runAuthorizedBulkAction(
    formData,
    {
      permission: PRODUCTS_PERMISSION,
      revalidatePaths: ["/inventory/products"],
    },
    async ({ selectedIds, tenantId }) => {
      const objectIds = selectedIds
        .filter((value) => mongoose.Types.ObjectId.isValid(value))
        .map((value) => new mongoose.Types.ObjectId(value));

      if (objectIds.length === 0) {
        return {
          processed: 0,
          failed: selectedIds.length,
          errors: ["No valid product IDs were provided."],
        };
      }

      const [matchedCount, archivableCount] = await Promise.all([
        Product.countDocuments({ tenantId, _id: { $in: objectIds } }),
        Product.countDocuments({ tenantId, _id: { $in: objectIds }, deletedAt: null }),
      ]);

      const result = await Product.updateMany(
        { tenantId, _id: { $in: objectIds }, deletedAt: null },
        { $set: { deletedAt: new Date() } }
      );

      const invalidIdCount = selectedIds.length - objectIds.length;
      const missingCount = objectIds.length - matchedCount;
      const alreadyArchivedCount = matchedCount - archivableCount;
      const errors = [
        invalidIdCount > 0 ? `${invalidIdCount} invalid product ID(s) were ignored.` : "",
        missingCount > 0 ? `${missingCount} product(s) were not found in your tenant.` : "",
      ].filter(Boolean);

      return {
        processed: result.modifiedCount,
        skipped: alreadyArchivedCount,
        failed: invalidIdCount + missingCount,
        errors,
      };
    }
  );
}

export async function bulkRestoreProducts(formData: FormData) {
  return runAuthorizedBulkAction(
    formData,
    {
      permission: PRODUCTS_PERMISSION,
      revalidatePaths: ["/inventory/products"],
    },
    async ({ selectedIds, tenantId }) => {
      const objectIds = selectedIds
        .filter((value) => mongoose.Types.ObjectId.isValid(value))
        .map((value) => new mongoose.Types.ObjectId(value));

      if (objectIds.length === 0) {
        return {
          processed: 0,
          failed: selectedIds.length,
          errors: ["No valid product IDs were provided."],
        };
      }

      const [matchedCount, restorableCount] = await Promise.all([
        Product.countDocuments({ tenantId, _id: { $in: objectIds } }),
        Product.countDocuments({ tenantId, _id: { $in: objectIds }, deletedAt: { $ne: null } }),
      ]);

      const result = await Product.updateMany(
        { tenantId, _id: { $in: objectIds }, deletedAt: { $ne: null } },
        { $set: { deletedAt: null } }
      );

      const invalidIdCount = selectedIds.length - objectIds.length;
      const missingCount = objectIds.length - matchedCount;
      const alreadyActiveCount = matchedCount - restorableCount;
      const errors = [
        invalidIdCount > 0 ? `${invalidIdCount} invalid product ID(s) were ignored.` : "",
        missingCount > 0 ? `${missingCount} product(s) were not found in your tenant.` : "",
      ].filter(Boolean);

      return {
        processed: result.modifiedCount,
        skipped: alreadyActiveCount,
        failed: invalidIdCount + missingCount,
        errors,
      };
    }
  );
}

export async function bulkDeleteProducts(formData: FormData) {
  return runAuthorizedBulkAction(
    formData,
    {
      permission: PRODUCTS_PERMISSION,
      revalidatePaths: ["/inventory/products"],
    },
    async ({ selectedIds, tenantId }) => {
      const objectIds = selectedIds
        .filter((value) => mongoose.Types.ObjectId.isValid(value))
        .map((value) => new mongoose.Types.ObjectId(value));

      if (objectIds.length === 0) {
        return {
          processed: 0,
          failed: selectedIds.length,
          errors: ["No valid product IDs were provided."],
        };
      }

      const [matchedCount, deletableCount] = await Promise.all([
        Product.countDocuments({ tenantId, _id: { $in: objectIds } }),
        Product.countDocuments({ tenantId, _id: { $in: objectIds }, deletedAt: { $ne: null } }),
      ]);

      const result = await Product.deleteMany({
        tenantId,
        _id: { $in: objectIds },
        deletedAt: { $ne: null },
      });

      const invalidIdCount = selectedIds.length - objectIds.length;
      const missingCount = objectIds.length - matchedCount;
      const activeCount = matchedCount - deletableCount;
      const errors = [
        invalidIdCount > 0 ? `${invalidIdCount} invalid product ID(s) were ignored.` : "",
        missingCount > 0 ? `${missingCount} product(s) were not found in your tenant.` : "",
        activeCount > 0
          ? `${activeCount} active product(s) must be archived before permanent deletion.`
          : "",
      ].filter(Boolean);

      return {
        processed: result.deletedCount ?? 0,
        failed: invalidIdCount + missingCount + activeCount,
        errors,
      };
    }
  );
}
