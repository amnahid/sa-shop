"use server";

import { getSession } from "@/lib/auth-utils";
import { Branch, Membership } from "@/models";
import mongoose from "mongoose";

export async function createBranch(formData: FormData) {
  const session = await getSession();
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  const membership = await Membership.findOne({ userId: session.user.id, status: "active" });
  if (!membership) {
    return { error: "No active membership" };
  }

  const tenantId = membership.tenantId;
  const name = formData.get("name") as string;

  if (!name) {
    return { error: "Branch name is required" };
  }

  const nameAr = formData.get("nameAr") as string;
  const address = formData.get("address") as string;
  const city = formData.get("city") as string;
  const phone = formData.get("phone") as string;
  const vatBranchCode = formData.get("vatBranchCode") as string;

  await Branch.create({
    tenantId,
    name,
    nameAr: nameAr || undefined,
    address: address || undefined,
    city: city || undefined,
    phone: phone || undefined,
    vatBranchCode: vatBranchCode || undefined,
    isHeadOffice: false,
    active: true,
  });

  return { success: true };
}

export async function updateBranch(id: string, formData: FormData) {
  const session = await getSession();
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  const membership = await Membership.findOne({ userId: session.user.id, status: "active" });
  if (!membership) {
    return { error: "No active membership" };
  }

  const name = formData.get("name") as string;
  if (!name) {
    return { error: "Branch name is required" };
  }

  await Branch.findOneAndUpdate(
    { _id: id, tenantId: membership.tenantId },
    {
      name,
      nameAr: formData.get("nameAr") as string || undefined,
      address: formData.get("address") as string || undefined,
      city: formData.get("city") as string || undefined,
      phone: formData.get("phone") as string || undefined,
      vatBranchCode: formData.get("vatBranchCode") as string || undefined,
    }
  );

  return { success: true };
}

export async function deactivateBranch(id: string) {
  const session = await getSession();
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  const membership = await Membership.findOne({ userId: session.user.id, status: "active" });
  if (!membership) {
    return { error: "No active membership" };
  }

  await Branch.findOneAndUpdate(
    { _id: id, tenantId: membership.tenantId },
    { active: false }
  );

  return { success: true };
}