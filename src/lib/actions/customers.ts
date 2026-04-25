"use server";

import { redirect } from "next/navigation";
import { Customer, Membership, Invoice } from "@/models";
import mongoose from "mongoose";

export async function createCustomer(formData: FormData) {
  const session = await import("@/lib/auth").then(m => m.auth());
  if (!session?.user?.id) return { error: "Unauthorized" };

  const membership = await Membership.findOne({ userId: session.user.id, status: "active" });
  if (!membership) return { error: "No active membership" };

  const name = formData.get("name") as string;
  const phone = formData.get("phone") as string;

  if (!name) return { error: "Name is required" };

  const customer = await Customer.create({
    tenantId: membership.tenantId,
    name,
    nameAr: formData.get("nameAr") as string || undefined,
    phone: phone || undefined,
    email: formData.get("email") as string || undefined,
    vatNumber: formData.get("vatNumber") as string || undefined,
    addressLines: formData.get("addressLines") as string || undefined,
    city: formData.get("city") as string || undefined,
  });

  return { customerId: customer._id.toString() };
}

export async function updateCustomer(customerId: string, formData: FormData) {
  const session = await import("@/lib/auth").then(m => m.auth());
  if (!session?.user?.id) return { error: "Unauthorized" };

  const membership = await Membership.findOne({ userId: session.user.id, status: "active" });
  if (!membership) return { error: "No active membership" };

  await Customer.findOneAndUpdate(
    { _id: customerId, tenantId: membership.tenantId },
    {
      name: formData.get("name") as string,
      nameAr: formData.get("nameAr") as string || undefined,
      phone: formData.get("phone") as string || undefined,
      email: formData.get("email") as string || undefined,
      vatNumber: formData.get("vatNumber") as string || undefined,
      addressLines: formData.get("addressLines") as string || undefined,
      city: formData.get("city") as string || undefined,
    }
  );

  return { success: true };
}

export async function deleteCustomer(customerId: string) {
  const session = await import("@/lib/auth").then(m => m.auth());
  if (!session?.user?.id) return { error: "Unauthorized" };

  const membership = await Membership.findOne({ userId: session.user.id, status: "active" });
  if (!membership) return { error: "No active membership" };

  await Customer.findOneAndUpdate(
    { _id: customerId, tenantId: membership.tenantId },
    { deletedAt: new Date() }
  );

  return { success: true };
}

export async function searchCustomers(tenantId: string, query?: string) {
  const filter: Record<string, unknown> = {
    tenantId: new mongoose.Types.ObjectId(tenantId),
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

export async function getCustomerWithHistory(customerId: string, tenantId: mongoose.Types.ObjectId) {
  const customer = await Customer.findOne({ _id: customerId, tenantId, deletedAt: null });
  if (!customer) return null;

  const invoices = await Invoice.find({
    tenantId,
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