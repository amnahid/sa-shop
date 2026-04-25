"use server";

import { getSession } from "@/lib/auth-utils";
import { Supplier, Membership } from "@/models";
import mongoose from "mongoose";

export async function createSupplier(formData: FormData) {
  const session = await getSession();
  if (!session?.user?.id) return { error: "Unauthorized" };

  const membership = await Membership.findOne({ userId: session.user.id, status: "active" });
  if (!membership) return { error: "No active membership" };

  const name = formData.get("name") as string;
  if (!name) return { error: "Name is required" };

  const supplier = await Supplier.create({
    tenantId: membership.tenantId,
    name,
    nameAr: formData.get("nameAr") as string || undefined,
    contactName: formData.get("contactName") as string || undefined,
    phone: formData.get("phone") as string || undefined,
    email: formData.get("email") as string || undefined,
    vatNumber: formData.get("vatNumber") as string || undefined,
    paymentTerms: formData.get("paymentTerms") as string || undefined,
    active: true,
  });

  return { supplierId: supplier._id.toString() };
}

export async function updateSupplier(supplierId: string, formData: FormData) {
  const session = await getSession();
  if (!session?.user?.id) return { error: "Unauthorized" };

  const membership = await Membership.findOne({ userId: session.user.id, status: "active" });
  if (!membership) return { error: "No active membership" };

  await Supplier.findOneAndUpdate(
    { _id: supplierId, tenantId: membership.tenantId },
    {
      name: formData.get("name") as string,
      nameAr: formData.get("nameAr") as string || undefined,
      contactName: formData.get("contactName") as string || undefined,
      phone: formData.get("phone") as string || undefined,
      email: formData.get("email") as string || undefined,
      vatNumber: formData.get("vatNumber") as string || undefined,
      paymentTerms: formData.get("paymentTerms") as string || undefined,
    }
  );

  return { success: true };
}

export async function deleteSupplier(supplierId: string) {
  const session = await getSession();
  if (!session?.user?.id) return { error: "Unauthorized" };

  const membership = await Membership.findOne({ userId: session.user.id, status: "active" });
  if (!membership) return { error: "No active membership" };

  await Supplier.findOneAndUpdate(
    { _id: supplierId, tenantId: membership.tenantId },
    { deletedAt: new Date() }
  );

  return { success: true };
}

export async function searchSuppliers(tenantId: string, query?: string) {
  const filter: Record<string, unknown> = {
    tenantId: new mongoose.Types.ObjectId(tenantId),
    deletedAt: null,
    active: true,
  };

  if (query) {
    filter.$or = [
      { name: { $regex: query, $options: "i" } },
      { phone: { $regex: query, $options: "i" } },
    ];
  }

  const suppliers = await Supplier.find(filter).sort({ name: 1 }).limit(20);

  return suppliers.map(s => ({
    _id: s._id.toString(),
    name: s.name,
    nameAr: s.nameAr,
    phone: s.phone,
    email: s.email,
  }));
}