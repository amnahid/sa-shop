"use server";

import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth-utils";
import { sendEmail } from "@/lib/email";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import { Invitation, User, Membership, Tenant } from "@/models";
import mongoose from "mongoose";

const inviteSchema = z.object({
  email: z.string().email("Invalid email address").toLowerCase(),
  role: z.enum(["owner", "manager", "cashier"]),
  tenantId: z.string(),
});

export async function sendInvite(formData: FormData) {
  const email = formData.get("email") as string;
  const role = formData.get("role") as string;
  const tenantId = formData.get("tenantId") as string;

  const validated = inviteSchema.safeParse({ email, role, tenantId });

  if (!validated.success) {
    return { error: validated.error.issues[0].message };
  }

  const session = await getSession();
  if (!session?.user) {
    return { error: "Unauthorized" };
  }

  const tenant = await Tenant.findById(validated.data.tenantId);
  if (!tenant) {
    return { error: "Tenant not found" };
  }

  const existingInvitation = await Invitation.findOne({
    email: validated.data.email,
    tenantId: new mongoose.Types.ObjectId(validated.data.tenantId),
    acceptedAt: null,
  });

  if (existingInvitation) {
    return { error: "Invitation already sent" };
  }

  const token = uuidv4();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  await Invitation.create({
    email: validated.data.email,
    role: validated.data.role,
    tenantId: new mongoose.Types.ObjectId(validated.data.tenantId),
    invitedBy: new mongoose.Types.ObjectId(session.user.id),
    expiresAt,
  });

  await sendEmail("invite", {
    to: validated.data.email,
    businessName: tenant.name,
    token,
  });

  return { success: true };
}

export async function acceptInvite(token: string, password: string, name: string) {
  const invitation = await Invitation.findOne({ token, acceptedAt: null });

  if (!invitation) {
    return { error: "Invalid or expired invitation" };
  }

  if (invitation.expiresAt < new Date()) {
    return { error: "Invitation expired" };
  }

  let user = await User.findOne({ email: invitation.email.toLowerCase() });

  if (!user) {
    user = await User.create({
      email: invitation.email.toLowerCase(),
      name,
      passwordHash: password,
      emailVerifiedAt: new Date(),
    });
  }

  await Membership.create({
    userId: user._id,
    tenantId: invitation.tenantId,
    role: invitation.role,
    branchIds: invitation.branchIds,
    invitedBy: invitation.invitedBy,
    acceptedAt: new Date(),
    status: "active",
  });

  invitation.acceptedAt = new Date();
  await invitation.save();

  return { success: true, userId: user._id };
}