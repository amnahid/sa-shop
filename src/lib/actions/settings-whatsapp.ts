"use server";

import mongoose from "mongoose";
import { revalidatePath } from "next/cache";
import { WhatsAppConfig } from "@/models";
import { getAuthorizedSessionMembership } from "@/lib/utils/server-authorization";
import { WhatsAppClient } from "@/lib/whatsapp";

export async function getWhatsAppConfig() {
  const auth = await getAuthorizedSessionMembership("settings:view");
  if ("error" in auth) return { error: auth.error };

  const config = await WhatsAppConfig.findOne({
    tenantId: auth.membership.tenantId,
  }).lean();

  if (!config) return { config: null };

  return {
    config: {
      phoneNumberId: config.phoneNumberId,
      businessAccountId: config.businessAccountId,
      fromPhoneNumber: config.fromPhoneNumber,
      isActive: config.isActive,
      accessToken: config.accessToken ? "••••••••" : "",
    },
  };
}

export async function saveWhatsAppConfig(formData: FormData) {
  const auth = await getAuthorizedSessionMembership("settings:view");
  if ("error" in auth) return { error: auth.error };

  const phoneNumberId = (formData.get("phoneNumberId") as string)?.trim();
  const businessAccountId = (formData.get("businessAccountId") as string)?.trim();
  const accessToken = (formData.get("accessToken") as string)?.trim();
  const fromPhoneNumber = (formData.get("fromPhoneNumber") as string)?.trim();
  const isActive = formData.get("isActive") === "on";

  if (!phoneNumberId) return { error: "Phone Number ID is required" };
  if (!businessAccountId) return { error: "Business Account ID is required" };
  if (!accessToken) return { error: "Access Token is required" };
  if (!fromPhoneNumber) return { error: "From Phone Number is required" };

  const existing = await WhatsAppConfig.findOne({
    tenantId: auth.membership.tenantId,
  });

  const updateData: Record<string, unknown> = {
    phoneNumberId,
    businessAccountId,
    fromPhoneNumber,
    isActive,
    updatedBy: new mongoose.Types.ObjectId(auth.sessionUserId),
  };

  if (existing && accessToken === "••••••••") {
    const current = await WhatsAppConfig.findById(existing._id).select("accessToken");
    updateData.accessToken = current?.accessToken || accessToken;
  } else {
    updateData.accessToken = accessToken;
  }

  await WhatsAppConfig.findOneAndUpdate(
    { tenantId: auth.membership.tenantId },
    updateData,
    { upsert: true, new: true }
  );

  revalidatePath("/settings/whatsapp");
  return { success: "WhatsApp configuration saved" };
}

export async function testWhatsAppConnection(formData: FormData) {
  const auth = await getAuthorizedSessionMembership("settings:view");
  if ("error" in auth) return { error: auth.error };

  const testPhone = (formData.get("testPhone") as string)?.trim();
  if (!testPhone) return { error: "Test phone number is required" };

  const config = await WhatsAppConfig.findOne({
    tenantId: auth.membership.tenantId,
  });

  if (!config) return { error: "No WhatsApp configuration found" };
  if (!config.isActive) return { error: "WhatsApp configuration is not active" };

  try {
    const client = new WhatsAppClient({
      accessToken: config.accessToken,
      phoneNumberId: config.phoneNumberId,
    });

    await client.sendTextMessage(
      testPhone,
      "This is a test message from your SA Shop Management system. Your WhatsApp integration is working correctly."
    );

    return { success: "Test message sent successfully" };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { error: `Failed to send test message: ${message}` };
  }
}
