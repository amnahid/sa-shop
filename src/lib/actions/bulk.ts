"use server";

import { Product, Customer, Supplier, Category } from "@/models";
import { getCurrentMembership } from "@/lib/utils/membership";
import { getAuthorizedSessionMembership } from "@/lib/utils/server-authorization";
import type { AppPermissionKey } from "@/lib/utils/permissions";
import { revalidatePath } from "next/cache";

type CsvImportValue = string | number | boolean | null | undefined;
type CsvImportRow = Record<string, CsvImportValue>;

interface BulkMutationSummary {
  requested: number;
  processed: number;
  skipped?: number;
  failed?: number;
  errors?: string[];
}

interface AuthorizedBulkConfig {
  permission: AppPermissionKey;
  revalidatePaths?: string[];
  selectionName?: string;
}

interface AuthorizedBulkContext {
  selectedIds: string[];
  tenantId: string;
}

type AuthorizedBulkHandlerResult = Omit<BulkMutationSummary, "requested">;

function asString(value: CsvImportValue) {
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return "";
}

function getBulkSelectedIds(formData: FormData, selectionName = "selectedRowIds") {
  const selectedIds = formData.getAll(selectionName);
  const uniqueIds = new Set<string>();

  for (const value of selectedIds) {
    const normalized = typeof value === "string" ? value.trim() : "";
    if (!normalized) {
      continue;
    }
    uniqueIds.add(normalized);
  }

  return Array.from(uniqueIds);
}

function buildBulkActionMessage({
  requested,
  processed,
  skipped = 0,
  failed = 0,
  errors = [],
}: BulkMutationSummary) {
  const segments = [`Processed ${processed} of ${requested} selected items.`];

  if (skipped > 0) {
    segments.push(`${skipped} skipped.`);
  }

  if (failed > 0) {
    segments.push(`${failed} failed.`);
  }

  const normalizedErrors = errors
    .map((error) => error.trim())
    .filter(Boolean);
  if (normalizedErrors.length > 0) {
    segments.push(normalizedErrors.join(" "));
  }

  return segments.join(" ");
}

export async function runAuthorizedBulkAction(
  formData: FormData,
  { permission, revalidatePaths = [], selectionName = "selectedRowIds" }: AuthorizedBulkConfig,
  execute: (context: AuthorizedBulkContext) => Promise<AuthorizedBulkHandlerResult>
) {
  const auth = await getAuthorizedSessionMembership(permission);
  if ("error" in auth) {
    return { success: false, error: auth.error, message: auth.error };
  }

  const selectedIds = getBulkSelectedIds(formData, selectionName);
  if (selectedIds.length === 0) {
    return {
      success: false,
      error: "Select at least one record to continue.",
      message: "Select at least one record to continue.",
    };
  }

  try {
    const result = await execute({
      selectedIds,
      tenantId: auth.membership.tenantId.toString(),
    });

    for (const path of revalidatePaths) {
      revalidatePath(path);
    }

    const processed = result.processed ?? 0;
    const skipped = result.skipped ?? 0;
    const failed = result.failed ?? 0;
    const message = buildBulkActionMessage({
      requested: selectedIds.length,
      processed,
      skipped,
      failed,
      errors: result.errors ?? [],
    });

    if (failed > 0) {
      return {
        success: processed > 0,
        error: message,
        message,
        processed,
        skipped,
        failed,
      };
    }

    return {
      success: true,
      message,
      processed,
      skipped,
      failed,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Bulk action failed";
    return {
      success: false,
      error: message,
      message,
    };
  }
}

export async function bulkImportProducts(data: CsvImportRow[]) {
  const membership = await getCurrentMembership();
  if (!membership) return { error: "No active membership" };
  const tenantId = membership.tenantId;

  try {
    for (const row of data) {
      if (!row.name) continue;

      let categoryId = null;
      if (row.category) {
        const categoryName = asString(row.category);
        let cat = await Category.findOne({ tenantId, name: categoryName, deletedAt: null });
        if (!cat) {
          cat = await Category.create({ tenantId, name: categoryName, active: true });
        }
        categoryId = cat._id;
      }

      await Product.create({
        tenantId,
        sku: asString(row.sku) || `SKU-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        barcode: asString(row.barcode) || undefined,
        name: asString(row.name),
        nameAr: asString(row.namear) || asString(row["arabic name"]) || undefined,
        categoryId: categoryId ?? undefined,
        sellingPrice: parseFloat(asString(row.sellingprice) || asString(row.price) || "0"),
        unit: asString(row.unit) || "piece",
        vatRate: parseFloat(asString(row.vatrate) || "0.15"),
        trackStock:
          asString(row.trackstock).toUpperCase() !== "FALSE" &&
          asString(row["stock track"]).toUpperCase() !== "FALSE",
        lowStockThreshold: parseInt(
          asString(row.lowstockthreshold) || asString(row["low stock threshold"]) || "10",
          10
        ),
        active: true,
      });
    }
    revalidatePath("/inventory/products");
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Product import failed" };
  }
}

export async function bulkImportCustomers(data: CsvImportRow[]) {
  const membership = await getCurrentMembership();
  if (!membership) return { error: "No active membership" };
  const tenantId = membership.tenantId;

  try {
    for (const row of data) {
      if (!row.name) continue;
      await Customer.create({
        tenantId,
        name: asString(row.name),
        nameAr: asString(row.namear) || asString(row["arabic name"]) || undefined,
        phone: asString(row.phone) || undefined,
        email: asString(row.email) || undefined,
        vatNumber: asString(row.vatnumber) || asString(row["vat number"]) || undefined,
        city: asString(row.city) || undefined,
      });
    }
    revalidatePath("/customers");
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Customer import failed" };
  }
}

export async function bulkImportSuppliers(data: CsvImportRow[]) {
  const membership = await getCurrentMembership();
  if (!membership) return { error: "No active membership" };
  const tenantId = membership.tenantId;

  try {
    for (const row of data) {
      if (!row.name) continue;
      await Supplier.create({
        tenantId,
        name: asString(row.name),
        contactName: asString(row.contact) || asString(row["contact person"]) || undefined,
        phone: asString(row.phone) || undefined,
        email: asString(row.email) || undefined,
        vatNumber: asString(row.vatnumber) || asString(row["vat number"]) || undefined,
        paymentTerms: asString(row.paymentterms) || asString(row["payment terms"]) || undefined,
        active: true,
      });
    }
    revalidatePath("/inventory/suppliers");
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Supplier import failed" };
  }
}
