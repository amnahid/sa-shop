"use server";

import crypto from "crypto";
import { User, Membership } from "@/models";
import { sendEmail } from "@/lib/email";
import mongoose from "mongoose";

const RESET_TOKEN_EXPIRY = 60 * 60 * 1000;

export async function requestPasswordReset(formData: FormData) {
  const email = formData.get("email") as string;
  if (!email) return { error: "Email is required" };

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) return { success: true };

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRY);

  const { PasswordResetToken } = await import("@/models");
  await PasswordResetToken.findOneAndDelete({ userId: user._id });
  await PasswordResetToken.create({
    userId: user._id,
    token,
    expiresAt,
  });

  const membership = await Membership.findOne({ userId: user._id, status: "active" });
  let businessName = "SA Shop";
  if (membership) {
    const { Tenant } = await import("@/models");
    const tenant = await Tenant.findById(membership.tenantId);
    businessName = tenant?.name || "SA Shop";
  }

  await sendEmail("password-reset", {
    to: user.email,
    name: user.name,
    token,
    businessName,
  }, {
    tenantId: membership?.tenantId,
  });

  return { success: true };
}

export async function resetPassword(token: string, newPassword: string) {
  const { PasswordResetToken } = await import("@/models");
  const record = await PasswordResetToken.findOne({ token, expiresAt: { $gt: new Date() } });
  if (!record) return { error: "Invalid or expired token" };

  const user = await User.findById(record.userId);
  if (!user) return { error: "User not found" };

  const bcrypt = await import("bcryptjs");
  user.passwordHash = await bcrypt.hash(newPassword, 12);
  await user.save();
  await PasswordResetToken.findByIdAndDelete(record._id);

  return { success: true };
}
