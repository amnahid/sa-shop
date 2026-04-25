"use server";

import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth-utils";
import { sendEmail } from "@/lib/email";
import { Invitation, Membership, Tenant } from "@/models";
import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";

export async function inviteTeamAction(formData: FormData) {
  const email = formData.get("email") as string;
  const role = formData.get("role") as string;

  if (!email || !role) {
    return;
  }

  const sessionUser = await getSession();
  if (!sessionUser?.user?.id) {
    return;
  }

  const membership = await Membership.findOne({ userId: sessionUser.user.id, status: "active" });
  if (!membership) {
    return;
  }

  const tenantId = membership.tenantId;
  const tenant = await Tenant.findById(tenantId);
  if (!tenant) {
    return;
  }

  const token = uuidv4();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  await Invitation.create({
    tenantId,
    email: email.toLowerCase(),
    role: role as any,
    invitedBy: new mongoose.Types.ObjectId(sessionUser.user.id),
    token,
    expiresAt,
  });

  await sendEmail("invite", {
    to: email,
    token,
    businessName: tenant.name,
  });

  return;
}

export async function finishSetup() {
  redirect("/");
}