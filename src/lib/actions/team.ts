"use server";

import { getSession } from "@/lib/auth-utils";
import { Membership, User } from "@/models";
import mongoose from "mongoose";

export async function updateMemberRole(memberId: string, newRole: "owner" | "manager" | "cashier") {
  const session = await getSession();
  if (!session?.user?.id) return { error: "Unauthorized" };

  const currentMember = await Membership.findOne({ userId: session.user.id, status: "active" });
  if (!currentMember || (currentMember.role !== "owner" && currentMember.role !== "manager")) {
    return { error: "Insufficient permissions" };
  }

  if (newRole === "owner") {
    return { error: "Cannot assign owner role" };
  }

  await Membership.findOneAndUpdate(
    { _id: memberId, tenantId: currentMember.tenantId },
    { role: newRole }
  );

  return { success: true };
}

export async function suspendMember(memberId: string) {
  const session = await getSession();
  if (!session?.user?.id) return { error: "Unauthorized" };

  const currentMember = await Membership.findOne({ userId: session.user.id, status: "active" });
  if (!currentMember || currentMember.role !== "owner") {
    return { error: "Only owners can suspend members" };
  }

  const target = await Membership.findById(memberId);
  if (!target || target.role === "owner") {
    return { error: "Cannot suspend owner" };
  }

  await Membership.findByIdAndUpdate(memberId, { status: "suspended" });
  return { success: true };
}

export async function reactivateMember(memberId: string) {
  const session = await getSession();
  if (!session?.user?.id) return { error: "Unauthorized" };

  const currentMember = await Membership.findOne({ userId: session.user.id, status: "active" });
  if (!currentMember || currentMember.role !== "owner") {
    return { error: "Only owners can reactivate members" };
  }

  await Membership.findByIdAndUpdate(memberId, { status: "active" });
  return { success: true };
}

export async function updateProfile(formData: FormData) {
  const session = await getSession();
  if (!session?.user?.id) return { error: "Unauthorized" };

  const userId = new mongoose.Types.ObjectId(session.user.id);

  const name = formData.get("name") as string;
  const phone = formData.get("phone") as string;

  await User.findByIdAndUpdate(userId, {
    name: name || undefined,
    phone: phone || undefined,
  });

  return { success: true };
}

export async function changePassword(currentPassword: string, newPassword: string) {
  const session = await getSession();
  if (!session?.user?.id) return { error: "Unauthorized" };

  const user = await User.findById(session.user.id);
  if (!user) return { error: "User not found" };

  const valid = await user.comparePassword(currentPassword);
  if (!valid) return { error: "Current password is incorrect" };

  if (newPassword.length < 8) return { error: "New password must be at least 8 characters" };

  const bcrypt = await import("bcryptjs");
  const hash = await bcrypt.hash(newPassword, 12);
  await User.findByIdAndUpdate(user._id, { passwordHash: hash });

  return { success: true };
}

export async function updateTenantSettings(formData: FormData) {
  const session = await getSession();
  if (!session?.user?.id) return { error: "Unauthorized" };

  const membership = await Membership.findOne({ userId: session.user.id, status: "active" });
  if (!membership || (membership.role !== "owner" && membership.role !== "manager")) {
    return { error: "Insufficient permissions" };
  }

  const { Tenant } = await import("@/models");

  await Tenant.findByIdAndUpdate(membership.tenantId, {
    name: formData.get("name") as string || undefined,
    nameAr: formData.get("nameAr") as string || undefined,
    crNumber: formData.get("crNumber") as string || undefined,
    vatNumber: formData.get("vatNumber") as string || undefined,
    address: formData.get("address") as string || undefined,
    addressAr: formData.get("addressAr") as string || undefined,
    phone: formData.get("phone") as string || undefined,
    email: formData.get("email") as string || undefined,
    logoUrl: formData.get("logoUrl") as string || undefined,
    defaultLanguage: formData.get("defaultLanguage") as "ar" | "en" || undefined,
    vatRegistered: formData.get("vatRegistered") === "on",
    zatcaPhase: parseInt(formData.get("zatcaPhase") as string) as 1 | 2 || 1,
    zatcaCsid: formData.get("zatcaCsid") as string || undefined,
    zatcaSolutionId: formData.get("zatcaSolutionId") as string || undefined,
  });

  return { success: true };
}