"use server";

import { revalidatePath } from "next/cache";
import { Customer, Invoice } from "@/models";
import mongoose from "mongoose";
import { runAuthorizedBulkAction } from "@/lib/actions/bulk";
import { getAuthorizedSessionMembership } from "@/lib/utils/server-authorization";

const CUSTOMERS_PERMISSION = "customers:view" as const;

async function getAuthorizedCustomersContext() {
  const auth = await getAuthorizedSessionMembership(CUSTOMERS_PERMISSION);
  if ("error" in auth || !("membership" in auth)) {
    return { error: auth.error ?? "Unauthorized" };
  }

  return {
    tenantId: auth.membership.tenantId.toString(),
  };
}

export async function createCustomer(formData: FormData) {
  const auth = await getAuthorizedCustomersContext();
  if ("error" in auth) return { error: auth.error };

  const name = (formData.get("name") as string | null)?.trim() ?? "";
  const phone = (formData.get("phone") as string | null)?.trim() ?? "";

  if (!name) return { error: "Name is required" };

  const customer = await Customer.create({
    tenantId: auth.tenantId,
    name,
    nameAr: formData.get("nameAr") as string || undefined,
    phone: phone || undefined,
    email: formData.get("email") as string || undefined,
    vatNumber: formData.get("vatNumber") as string || undefined,
    addressLines: formData.get("addressLines") as string || undefined,
    city: formData.get("city") as string || undefined,
  });

  const customerId = customer._id.toString();
  revalidatePath("/customers");
  revalidatePath(`/customers/${customerId}`);
  return { success: true, customerId, message: "Customer created successfully" };
}

export async function updateCustomer(customerId: string, formData: FormData) {
  const auth = await getAuthorizedCustomersContext();
  if ("error" in auth) return { error: auth.error };

  if (!mongoose.Types.ObjectId.isValid(customerId)) {
    return { error: "Invalid customer ID" };
  }

  const updated = await Customer.findOneAndUpdate(
    { _id: customerId, tenantId: auth.tenantId },
    {
      name: formData.get("name") as string,
      nameAr: formData.get("nameAr") as string || undefined,
      phone: formData.get("phone") as string || undefined,
      email: formData.get("email") as string || undefined,
      vatNumber: formData.get("vatNumber") as string || undefined,
      addressLines: formData.get("addressLines") as string || undefined,
      city: formData.get("city") as string || undefined,
    },
    { new: true }
  );

  if (!updated) {
    return { error: "Customer not found" };
  }

  revalidatePath("/customers");
  revalidatePath(`/customers/${customerId}`);
  return { success: true, message: "Customer updated successfully" };
}

export async function archiveCustomer(customerId: string) {
  const auth = await getAuthorizedCustomersContext();
  if ("error" in auth) return { error: auth.error };

  if (!mongoose.Types.ObjectId.isValid(customerId)) {
    return { error: "Invalid customer ID" };
  }

  const updated = await Customer.findOneAndUpdate(
    { _id: customerId, tenantId: auth.tenantId, deletedAt: null },
    { deletedAt: new Date() }
  );

  if (!updated) {
    return { error: "Customer not found or already archived" };
  }

  revalidatePath("/customers");
  revalidatePath(`/customers/${customerId}`);
  return { success: true, message: "Customer archived successfully" };
}

export async function restoreCustomer(customerId: string) {
  const auth = await getAuthorizedCustomersContext();
  if ("error" in auth) return { error: auth.error };

  if (!mongoose.Types.ObjectId.isValid(customerId)) {
    return { error: "Invalid customer ID" };
  }

  const updated = await Customer.findOneAndUpdate(
    { _id: customerId, tenantId: auth.tenantId, deletedAt: { $ne: null } },
    { deletedAt: null }
  );

  if (!updated) {
    return { error: "Customer not found or already active" };
  }

  revalidatePath("/customers");
  revalidatePath(`/customers/${customerId}`);
  return { success: true, message: "Customer restored successfully" };
}

export async function permanentlyDeleteCustomer(customerId: string) {
  const auth = await getAuthorizedCustomersContext();
  if ("error" in auth) return { error: auth.error };

  if (!mongoose.Types.ObjectId.isValid(customerId)) {
    return { error: "Invalid customer ID" };
  }

  const result = await Customer.deleteOne({
    _id: customerId,
    tenantId: auth.tenantId,
    deletedAt: { $ne: null },
  });

  if ((result.deletedCount ?? 0) === 0) {
    return { error: "Archived customer not found" };
  }

  revalidatePath("/customers");
  revalidatePath(`/customers/${customerId}`);
  return { success: true, message: "Customer deleted permanently" };
}

export async function deleteCustomer(customerId: string) {
  return archiveCustomer(customerId);
}

export async function searchCustomers(tenantId: string, query?: string) {
  const auth = await getAuthorizedCustomersContext();
  if ("error" in auth) {
    return [];
  }

  if (tenantId !== auth.tenantId) {
    return [];
  }

  const filter: Record<string, unknown> = {
    tenantId: new mongoose.Types.ObjectId(auth.tenantId),
    deletedAt: null,
  };

  if (query) {
    filter.$or = [
      { name: { $regex: query, $options: "i" } },
      { phone: { $regex: query, $options: "i" } },
    ];
  }

  const customers = await Customer.find(filter).sort({ name: 1 }).limit(20);

  return customers.map(c => ({
    _id: c._id.toString(),
    name: c.name,
    nameAr: c.nameAr,
    phone: c.phone,
    email: c.email,
    vatNumber: c.vatNumber,
  }));
}

export async function getCustomerWithHistory(customerId: string) {
  const auth = await getAuthorizedCustomersContext();
  if ("error" in auth) {
    return { error: auth.error };
  }

  if (!mongoose.Types.ObjectId.isValid(customerId)) {
    return { error: "Invalid customer ID" };
  }

  const tId = new mongoose.Types.ObjectId(auth.tenantId);
  const customer = await Customer.findOne({ _id: customerId, tenantId: tId });
  if (!customer) return null;

  const invoices = await Invoice.find({
    tenantId: tId,
    customerId: customer._id,
    status: "completed",
  }).sort({ issuedAt: -1 }).limit(20);

  return {
    customer: {
      _id: customer._id.toString(),
      name: customer.name,
      nameAr: customer.nameAr,
      phone: customer.phone,
      email: customer.email,
      vatNumber: customer.vatNumber,
      addressLines: customer.addressLines,
      city: customer.city,
      totalSpent: parseFloat(customer.totalSpent.toString()),
      visitCount: customer.visitCount,
      lastVisitAt: customer.lastVisitAt,
      deletedAt: customer.deletedAt,
    },
    invoices: invoices.map(i => ({
      _id: i._id.toString(),
      invoiceNumber: i.invoiceNumber,
      issuedAt: i.issuedAt,
      grandTotal: parseFloat(i.grandTotal.toString()),
      status: i.status,
    })),
  };
}

export async function bulkArchiveCustomers(formData: FormData) {
  return runAuthorizedBulkAction(
    formData,
    {
      permission: CUSTOMERS_PERMISSION,
      revalidatePaths: ["/customers"],
    },
    async ({ selectedIds, tenantId }) => {
      const objectIds = selectedIds
        .filter((value) => mongoose.Types.ObjectId.isValid(value))
        .map((value) => new mongoose.Types.ObjectId(value));

      if (objectIds.length === 0) {
        return {
          processed: 0,
          failed: selectedIds.length,
          errors: ["No valid customer IDs were provided."],
        };
      }

      const [matchedCount, archivableCount] = await Promise.all([
        Customer.countDocuments({ tenantId, _id: { $in: objectIds } }),
        Customer.countDocuments({ tenantId, _id: { $in: objectIds }, deletedAt: null }),
      ]);

      const result = await Customer.updateMany(
        { tenantId, _id: { $in: objectIds }, deletedAt: null },
        { $set: { deletedAt: new Date() } }
      );

      const invalidIdCount = selectedIds.length - objectIds.length;
      const missingCount = objectIds.length - matchedCount;
      const alreadyArchivedCount = matchedCount - archivableCount;

      return {
        processed: result.modifiedCount,
        skipped: alreadyArchivedCount,
        failed: invalidIdCount + missingCount,
        errors: [
          invalidIdCount > 0 ? `${invalidIdCount} invalid customer ID(s) were ignored.` : "",
          missingCount > 0 ? `${missingCount} customer(s) were not found in your tenant.` : "",
        ].filter(Boolean),
      };
    }
  );
}

export async function bulkRestoreCustomers(formData: FormData) {
  return runAuthorizedBulkAction(
    formData,
    {
      permission: CUSTOMERS_PERMISSION,
      revalidatePaths: ["/customers"],
    },
    async ({ selectedIds, tenantId }) => {
      const objectIds = selectedIds
        .filter((value) => mongoose.Types.ObjectId.isValid(value))
        .map((value) => new mongoose.Types.ObjectId(value));

      if (objectIds.length === 0) {
        return {
          processed: 0,
          failed: selectedIds.length,
          errors: ["No valid customer IDs were provided."],
        };
      }

      const [matchedCount, restorableCount] = await Promise.all([
        Customer.countDocuments({ tenantId, _id: { $in: objectIds } }),
        Customer.countDocuments({ tenantId, _id: { $in: objectIds }, deletedAt: { $ne: null } }),
      ]);

      const result = await Customer.updateMany(
        { tenantId, _id: { $in: objectIds }, deletedAt: { $ne: null } },
        { $set: { deletedAt: null } }
      );

      const invalidIdCount = selectedIds.length - objectIds.length;
      const missingCount = objectIds.length - matchedCount;
      const alreadyActiveCount = matchedCount - restorableCount;

      return {
        processed: result.modifiedCount,
        skipped: alreadyActiveCount,
        failed: invalidIdCount + missingCount,
        errors: [
          invalidIdCount > 0 ? `${invalidIdCount} invalid customer ID(s) were ignored.` : "",
          missingCount > 0 ? `${missingCount} customer(s) were not found in your tenant.` : "",
        ].filter(Boolean),
      };
    }
  );
}

export async function bulkDeleteCustomers(formData: FormData) {
  return runAuthorizedBulkAction(
    formData,
    {
      permission: CUSTOMERS_PERMISSION,
      revalidatePaths: ["/customers"],
    },
    async ({ selectedIds, tenantId }) => {
      const objectIds = selectedIds
        .filter((value) => mongoose.Types.ObjectId.isValid(value))
        .map((value) => new mongoose.Types.ObjectId(value));

      if (objectIds.length === 0) {
        return {
          processed: 0,
          failed: selectedIds.length,
          errors: ["No valid customer IDs were provided."],
        };
      }

      const [matchedCount, deletableCount] = await Promise.all([
        Customer.countDocuments({ tenantId, _id: { $in: objectIds } }),
        Customer.countDocuments({ tenantId, _id: { $in: objectIds }, deletedAt: { $ne: null } }),
      ]);

      const result = await Customer.deleteMany({
        tenantId,
        _id: { $in: objectIds },
        deletedAt: { $ne: null },
      });

      const invalidIdCount = selectedIds.length - objectIds.length;
      const missingCount = objectIds.length - matchedCount;
      const activeCount = matchedCount - deletableCount;

      return {
        processed: result.deletedCount ?? 0,
        failed: invalidIdCount + missingCount + activeCount,
        errors: [
          invalidIdCount > 0 ? `${invalidIdCount} invalid customer ID(s) were ignored.` : "",
          missingCount > 0 ? `${missingCount} customer(s) were not found in your tenant.` : "",
          activeCount > 0
            ? `${activeCount} active customer(s) must be archived before permanent deletion.`
            : "",
        ].filter(Boolean),
      };
    }
  );
}
