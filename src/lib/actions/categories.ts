"use server";

import { revalidatePath } from "next/cache";
import { Category, Product } from "@/models";
import mongoose from "mongoose";
import { runAuthorizedBulkAction } from "@/lib/actions/bulk";
import { getAuthorizedSessionMembership } from "@/lib/utils/server-authorization";

const CATEGORIES_PERMISSION = "inventory.categories:view" as const;

async function getAuthorizedCategoriesContext() {
  const auth = await getAuthorizedSessionMembership(CATEGORIES_PERMISSION);
  if ("error" in auth || !("membership" in auth)) {
    return { error: auth.error ?? "Unauthorized" };
  }

  return {
    tenantId: auth.membership.tenantId.toString(),
  };
}

export async function createCategory(formData: FormData) {
  const auth = await getAuthorizedCategoriesContext();
  if ("error" in auth) return { error: auth.error };

  const name = (formData.get("name") as string | null)?.trim() ?? "";
  if (!name) {
    return { error: "Name is required" };
  }

  const nameAr = formData.get("nameAr") as string;
  const parentId = formData.get("parentId") as string;

  if (parentId && !mongoose.Types.ObjectId.isValid(parentId)) {
    return { error: "Invalid parent category" };
  }

  if (parentId) {
    const parent = await Category.findOne({
      _id: new mongoose.Types.ObjectId(parentId),
      tenantId: auth.tenantId,
      deletedAt: null,
      active: true,
    }).select({ _id: 1 });
    if (!parent) {
      return { error: "Parent category is unavailable" };
    }
  }

  const category = await Category.create({
    tenantId: auth.tenantId,
    name,
    nameAr: nameAr || undefined,
    parentId: parentId ? new mongoose.Types.ObjectId(parentId) : undefined,
    active: true,
  });

  revalidatePath("/inventory/categories");
  revalidatePath(`/inventory/categories/${category._id.toString()}`);
  return { success: true, categoryId: category._id.toString(), message: "Category created successfully" };
}

export async function updateCategory(id: string, formData: FormData) {
  const auth = await getAuthorizedCategoriesContext();
  if ("error" in auth) return { error: auth.error };

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return { error: "Invalid category ID" };
  }

  const name = formData.get("name") as string;
  const nameAr = formData.get("nameAr") as string;
  const parentId = formData.get("parentId") as string;

  if (parentId && !mongoose.Types.ObjectId.isValid(parentId)) {
    return { error: "Invalid parent category" };
  }

  if (parentId) {
    if (parentId === id) {
      return { error: "Category cannot be its own parent" };
    }

    const parent = await Category.findOne({
      _id: new mongoose.Types.ObjectId(parentId),
      tenantId: auth.tenantId,
      deletedAt: null,
      active: true,
    }).select({ _id: 1 });
    if (!parent) {
      return { error: "Parent category is unavailable" };
    }
  }

  const updated = await Category.findOneAndUpdate(
    { _id: id, tenantId: auth.tenantId },
    {
      name,
      nameAr: nameAr || undefined,
      parentId: parentId ? new mongoose.Types.ObjectId(parentId) : undefined,
    },
    { new: true }
  );

  if (!updated) {
    return { error: "Category not found" };
  }

  revalidatePath("/inventory/categories");
  revalidatePath(`/inventory/categories/${id}`);
  return { success: true, message: "Category updated successfully" };
}

export async function archiveCategory(id: string) {
  const auth = await getAuthorizedCategoriesContext();
  if ("error" in auth) return { error: auth.error };

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return { error: "Invalid category ID" };
  }

  const protectedIds = await getProtectedCategoryIds({
    tenantId: auth.tenantId,
    categoryIds: [new mongoose.Types.ObjectId(id)],
  });
  if (protectedIds.has(id)) {
    return {
      error: "Category cannot be archived because it still has active products or subcategories.",
    };
  }

  const updated = await Category.findOneAndUpdate(
    { _id: id, tenantId: auth.tenantId, deletedAt: null },
    { deletedAt: new Date() }
  );

  if (!updated) {
    return { error: "Category not found or already archived" };
  }

  revalidatePath("/inventory/categories");
  revalidatePath(`/inventory/categories/${id}`);
  return { success: true, message: "Category archived successfully" };
}

export async function restoreCategory(id: string) {
  const auth = await getAuthorizedCategoriesContext();
  if ("error" in auth) return { error: auth.error };

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return { error: "Invalid category ID" };
  }

  const category = await Category.findOne({
    _id: id,
    tenantId: auth.tenantId,
    deletedAt: { $ne: null },
  }).select({ _id: 1, parentId: 1 });

  if (!category) {
    return { error: "Category not found or already active" };
  }

  if (category.parentId) {
    const parent = await Category.findOne({
      _id: category.parentId,
      tenantId: auth.tenantId,
    }).select({ deletedAt: 1 });

    if (parent?.deletedAt) {
      return { error: "Cannot restore category while its parent is archived." };
    }
  }

  await Category.updateOne(
    { _id: category._id, tenantId: auth.tenantId, deletedAt: { $ne: null } },
    { $set: { deletedAt: null } }
  );

  revalidatePath("/inventory/categories");
  revalidatePath(`/inventory/categories/${id}`);
  return { success: true, message: "Category restored successfully" };
}

export async function permanentlyDeleteCategory(id: string) {
  const auth = await getAuthorizedCategoriesContext();
  if ("error" in auth) return { error: auth.error };

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return { error: "Invalid category ID" };
  }

  const objectId = new mongoose.Types.ObjectId(id);
  const category = await Category.findOne({
    _id: objectId,
    tenantId: auth.tenantId,
    deletedAt: { $ne: null },
  }).select({ _id: 1 });

  if (!category) {
    return { error: "Archived category not found" };
  }

  const protectedIds = await getProtectedCategoryIds({
    tenantId: auth.tenantId,
    categoryIds: [objectId],
  });
  if (protectedIds.has(id)) {
    return {
      error: "Archived category cannot be deleted while active products or subcategories reference it.",
    };
  }

  await Category.deleteOne({
    _id: objectId,
    tenantId: auth.tenantId,
    deletedAt: { $ne: null },
  });

  revalidatePath("/inventory/categories");
  revalidatePath(`/inventory/categories/${id}`);
  return { success: true, message: "Category deleted permanently" };
}

export async function deleteCategory(id: string) {
  return archiveCategory(id);
}

async function getProtectedCategoryIds({
  tenantId,
  categoryIds,
}: {
  tenantId: string;
  categoryIds: mongoose.Types.ObjectId[];
}) {
  if (categoryIds.length === 0) {
    return new Set<string>();
  }

  const [childRows, productRows] = await Promise.all([
    Category.find({
      tenantId,
      parentId: { $in: categoryIds },
      deletedAt: null,
    })
      .select({ parentId: 1 })
      .lean(),
    Product.find({
      tenantId,
      categoryId: { $in: categoryIds },
      deletedAt: null,
    })
      .select({ categoryId: 1 })
      .lean(),
  ]);

  const protectedIds = new Set<string>();
  for (const child of childRows) {
    if (child.parentId) {
      protectedIds.add(child.parentId.toString());
    }
  }
  for (const product of productRows) {
    if (product.categoryId) {
      protectedIds.add(product.categoryId.toString());
    }
  }

  return protectedIds;
}

export async function bulkArchiveCategories(formData: FormData) {
  return runAuthorizedBulkAction(
    formData,
    {
      permission: CATEGORIES_PERMISSION,
      revalidatePaths: ["/inventory/categories"],
    },
    async ({ selectedIds, tenantId }) => {
      const objectIds = selectedIds
        .filter((value) => mongoose.Types.ObjectId.isValid(value))
        .map((value) => new mongoose.Types.ObjectId(value));

      if (objectIds.length === 0) {
        return {
          processed: 0,
          failed: selectedIds.length,
          errors: ["No valid category IDs were provided."],
        };
      }

      const [matchedCount, archivableCategories, protectedIds] = await Promise.all([
        Category.countDocuments({ tenantId, _id: { $in: objectIds } }),
        Category.find({ tenantId, _id: { $in: objectIds }, deletedAt: null }).select({ _id: 1 }).lean(),
        getProtectedCategoryIds({ tenantId, categoryIds: objectIds }),
      ]);

      const archivableIds = archivableCategories
        .map((category) => category._id.toString())
        .filter((id) => !protectedIds.has(id))
        .map((id) => new mongoose.Types.ObjectId(id));

      const result =
        archivableIds.length > 0
          ? await Category.updateMany(
              { tenantId, _id: { $in: archivableIds }, deletedAt: null },
              { $set: { deletedAt: new Date() } }
            )
          : { modifiedCount: 0 };

      const invalidIdCount = selectedIds.length - objectIds.length;
      const missingCount = objectIds.length - matchedCount;
      const alreadyArchivedCount = matchedCount - archivableCategories.length;
      const blockedCount = archivableCategories.length - archivableIds.length;

      return {
        processed: result.modifiedCount,
        skipped: alreadyArchivedCount,
        failed: invalidIdCount + missingCount + blockedCount,
        errors: [
          invalidIdCount > 0 ? `${invalidIdCount} invalid category ID(s) were ignored.` : "",
          missingCount > 0 ? `${missingCount} category(s) were not found in your tenant.` : "",
          blockedCount > 0
            ? `${blockedCount} category(s) cannot be archived because they still have active products or subcategories.`
            : "",
        ].filter(Boolean),
      };
    }
  );
}

export async function bulkRestoreCategories(formData: FormData) {
  return runAuthorizedBulkAction(
    formData,
    {
      permission: CATEGORIES_PERMISSION,
      revalidatePaths: ["/inventory/categories"],
    },
    async ({ selectedIds, tenantId }) => {
      const objectIds = selectedIds
        .filter((value) => mongoose.Types.ObjectId.isValid(value))
        .map((value) => new mongoose.Types.ObjectId(value));

      if (objectIds.length === 0) {
        return {
          processed: 0,
          failed: selectedIds.length,
          errors: ["No valid category IDs were provided."],
        };
      }

      const [matchedCount, archivedCategories] = await Promise.all([
        Category.countDocuments({ tenantId, _id: { $in: objectIds } }),
        Category.find({
          tenantId,
          _id: { $in: objectIds },
          deletedAt: { $ne: null },
        })
          .select({ _id: 1, parentId: 1 })
          .lean(),
      ]);

      const archivedIdSet = new Set(archivedCategories.map((category) => category._id.toString()));
      const parentIds = archivedCategories
        .map((category) => category.parentId?.toString())
        .filter((value): value is string => Boolean(value))
        .map((value) => new mongoose.Types.ObjectId(value));

      const parentCategories =
        parentIds.length > 0
          ? await Category.find({ tenantId, _id: { $in: parentIds } }).select({ _id: 1, deletedAt: 1 }).lean()
          : [];

      const parentDeletedSet = new Set(
        parentCategories
          .filter((category) => category.deletedAt !== null)
          .map((category) => category._id.toString())
      );

      const blockedIds = new Set<string>();
      for (const category of archivedCategories) {
        if (!category.parentId) continue;
        const parentId = category.parentId.toString();
        if (parentDeletedSet.has(parentId) && !archivedIdSet.has(parentId)) {
          blockedIds.add(category._id.toString());
        }
      }

      const restorableIds = archivedCategories
        .map((category) => category._id.toString())
        .filter((id) => !blockedIds.has(id))
        .map((id) => new mongoose.Types.ObjectId(id));

      const result =
        restorableIds.length > 0
          ? await Category.updateMany(
              { tenantId, _id: { $in: restorableIds }, deletedAt: { $ne: null } },
              { $set: { deletedAt: null } }
            )
          : { modifiedCount: 0 };

      const invalidIdCount = selectedIds.length - objectIds.length;
      const missingCount = objectIds.length - matchedCount;
      const alreadyActiveCount = matchedCount - archivedCategories.length;
      const blockedCount = blockedIds.size;

      return {
        processed: result.modifiedCount,
        skipped: alreadyActiveCount,
        failed: invalidIdCount + missingCount + blockedCount,
        errors: [
          invalidIdCount > 0 ? `${invalidIdCount} invalid category ID(s) were ignored.` : "",
          missingCount > 0 ? `${missingCount} category(s) were not found in your tenant.` : "",
          blockedCount > 0
            ? `${blockedCount} category(s) cannot be restored while their parent category is archived.`
            : "",
        ].filter(Boolean),
      };
    }
  );
}

export async function bulkDeleteCategories(formData: FormData) {
  return runAuthorizedBulkAction(
    formData,
    {
      permission: CATEGORIES_PERMISSION,
      revalidatePaths: ["/inventory/categories"],
    },
    async ({ selectedIds, tenantId }) => {
      const objectIds = selectedIds
        .filter((value) => mongoose.Types.ObjectId.isValid(value))
        .map((value) => new mongoose.Types.ObjectId(value));

      if (objectIds.length === 0) {
        return {
          processed: 0,
          failed: selectedIds.length,
          errors: ["No valid category IDs were provided."],
        };
      }

      const [matchedCount, deletableCategories, protectedIds] = await Promise.all([
        Category.countDocuments({ tenantId, _id: { $in: objectIds } }),
        Category.find({ tenantId, _id: { $in: objectIds }, deletedAt: { $ne: null } })
          .select({ _id: 1 })
          .lean(),
        getProtectedCategoryIds({ tenantId, categoryIds: objectIds }),
      ]);

      const deletableIds = deletableCategories
        .map((category) => category._id.toString())
        .filter((id) => !protectedIds.has(id))
        .map((id) => new mongoose.Types.ObjectId(id));

      const result =
        deletableIds.length > 0
          ? await Category.deleteMany({
              tenantId,
              _id: { $in: deletableIds },
              deletedAt: { $ne: null },
            })
          : { deletedCount: 0 };

      const invalidIdCount = selectedIds.length - objectIds.length;
      const missingCount = objectIds.length - matchedCount;
      const activeCount = matchedCount - deletableCategories.length;
      const blockedCount = deletableCategories.length - deletableIds.length;

      return {
        processed: result.deletedCount ?? 0,
        failed: invalidIdCount + missingCount + activeCount + blockedCount,
        errors: [
          invalidIdCount > 0 ? `${invalidIdCount} invalid category ID(s) were ignored.` : "",
          missingCount > 0 ? `${missingCount} category(s) were not found in your tenant.` : "",
          activeCount > 0
            ? `${activeCount} active category(s) must be archived before permanent deletion.`
            : "",
          blockedCount > 0
            ? `${blockedCount} archived category(s) cannot be deleted while active products or subcategories still reference them.`
            : "",
        ].filter(Boolean),
      };
    }
  );
}
