"use server";

import { getSession } from "@/lib/auth-utils";
import { Category, Membership } from "@/models";
import mongoose from "mongoose";

export async function createCategory(formData: FormData) {
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
    return { error: "Name is required" };
  }

  const nameAr = formData.get("nameAr") as string;
  const parentId = formData.get("parentId") as string;

  await Category.create({
    tenantId: membership.tenantId,
    name,
    nameAr: nameAr || undefined,
    parentId: parentId ? new mongoose.Types.ObjectId(parentId) : undefined,
    active: true,
  });

  return { success: true };
}

export async function updateCategory(id: string, formData: FormData) {
  const session = await getSession();
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  const membership = await Membership.findOne({ userId: session.user.id, status: "active" });
  if (!membership) {
    return { error: "No active membership" };
  }

  const name = formData.get("name") as string;
  const nameAr = formData.get("nameAr") as string;
  const parentId = formData.get("parentId") as string;

  await Category.findOneAndUpdate(
    { _id: id, tenantId: membership.tenantId },
    {
      name,
      nameAr: nameAr || undefined,
      parentId: parentId ? new mongoose.Types.ObjectId(parentId) : undefined,
    }
  );

  return { success: true };
}

export async function deleteCategory(id: string) {
  const session = await getSession();
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  const membership = await Membership.findOne({ userId: session.user.id, status: "active" });
  if (!membership) {
    return { error: "No active membership" };
  }

  await Category.findOneAndUpdate(
    { _id: id, tenantId: membership.tenantId },
    { deletedAt: new Date() }
  );

  return { success: true };
}