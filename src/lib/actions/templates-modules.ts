"use server";

import mongoose from "mongoose";
import { revalidatePath } from "next/cache";
import {
  EmailTemplate,
  MediaAsset,
  NotificationTemplate,
  type NotificationChannel,
} from "@/models";
import { getAuthorizedSessionMembership } from "@/lib/utils/server-authorization";
import { runAuthorizedBulkAction } from "@/lib/actions/bulk";

function deriveFileName(url: string) {
  try {
    const parsed = new URL(url);
    const pathname = parsed.pathname || "";
    const segments = pathname.split("/").filter(Boolean);
    return segments[segments.length - 1] || "asset";
  } catch {
    const cleaned = url.split("?")[0];
    const segments = cleaned.split("/").filter(Boolean);
    return segments[segments.length - 1] || "asset";
  }
}

function normalizeTemplateKey(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function parseStringList(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function getMediaKindFromMime(mimeType: string) {
  if (mimeType.startsWith("image/")) return "image";
  if (
    mimeType.includes("pdf") ||
    mimeType.includes("word") ||
    mimeType.includes("sheet") ||
    mimeType.includes("presentation") ||
    mimeType.startsWith("text/")
  ) {
    return "document";
  }
  return "other";
}

export async function createMediaAsset(formData: FormData) {
  const auth = await getAuthorizedSessionMembership("settings.media:view");
  if ("error" in auth) return { error: auth.error };

  const name = (formData.get("name") as string | null)?.trim();
  const url = (formData.get("url") as string | null)?.trim();
  const mimeType =
    (formData.get("mimeType") as string | null)?.trim() || "application/octet-stream";

  if (!name) return { error: "Name is required" };
  if (!url) return { error: "Asset URL is required" };

  const sizeRaw = (formData.get("sizeBytes") as string | null)?.trim();
  const sizeBytes = sizeRaw ? Number(sizeRaw) : 0;

  await MediaAsset.create({
    tenantId: auth.membership.tenantId,
    uploadedById: new mongoose.Types.ObjectId(auth.sessionUserId),
    name,
    fileName: deriveFileName(url),
    url,
    mimeType,
    sizeBytes: Number.isFinite(sizeBytes) && sizeBytes > 0 ? Math.round(sizeBytes) : 0,
    tags: parseStringList((formData.get("tags") as string | null) || ""),
    altText: ((formData.get("altText") as string | null) || "").trim() || undefined,
    kind: getMediaKindFromMime(mimeType),
    status: "active",
  });

  revalidatePath("/settings/media-library");
  return { success: true };
}

export async function updateMediaAsset(assetId: string, formData: FormData) {
  const auth = await getAuthorizedSessionMembership("settings.media:view");
  if ("error" in auth) return { error: auth.error };

  const name = (formData.get("name") as string | null)?.trim();
  const tags = parseStringList((formData.get("tags") as string | null) || "");
  const altText = ((formData.get("altText") as string | null) || "").trim() || undefined;

  const updated = await MediaAsset.findOneAndUpdate(
    {
      _id: new mongoose.Types.ObjectId(assetId),
      tenantId: auth.membership.tenantId,
    },
    {
      ...(name ? { name } : {}),
      tags,
      altText,
    }
  );

  if (!updated) {
    return { error: "Asset not found" };
  }

  revalidatePath("/settings/media-library");
  return { success: true };
}

export async function archiveMediaAsset(assetId: string) {
  const auth = await getAuthorizedSessionMembership("settings.media:view");
  if ("error" in auth) return { error: auth.error };

  const updated = await MediaAsset.findOneAndUpdate(
    {
      _id: new mongoose.Types.ObjectId(assetId),
      tenantId: auth.membership.tenantId,
    },
    { status: "archived" }
  );

  if (!updated) {
    return { error: "Asset not found" };
  }

  revalidatePath("/settings/media-library");
  return { success: true };
}

export async function restoreMediaAsset(assetId: string) {
  const auth = await getAuthorizedSessionMembership("settings.media:view");
  if ("error" in auth) return { error: auth.error };

  const updated = await MediaAsset.findOneAndUpdate(
    {
      _id: new mongoose.Types.ObjectId(assetId),
      tenantId: auth.membership.tenantId,
    },
    { status: "active" }
  );

  if (!updated) {
    return { error: "Asset not found" };
  }

  revalidatePath("/settings/media-library");
  return { success: true };
}

export async function bulkArchiveMediaAssets(formData: FormData) {
  return runAuthorizedBulkAction(
    formData,
    {
      permission: "settings.media:view",
      revalidatePaths: ["/settings/media-library"],
    },
    async ({ selectedIds, tenantId }) => {
      const objectIds = selectedIds
        .filter((value) => mongoose.Types.ObjectId.isValid(value))
        .map((value) => new mongoose.Types.ObjectId(value));

      if (objectIds.length === 0) {
        return {
          processed: 0,
          failed: selectedIds.length,
          errors: ["No valid media asset IDs were provided."],
        };
      }

      const [matchedCount, archivableCount] = await Promise.all([
        MediaAsset.countDocuments({ tenantId, _id: { $in: objectIds } }),
        MediaAsset.countDocuments({ tenantId, _id: { $in: objectIds }, status: { $ne: "archived" } }),
      ]);

      const result = await MediaAsset.updateMany(
        { tenantId, _id: { $in: objectIds }, status: { $ne: "archived" } },
        { $set: { status: "archived" } }
      );

      const invalidIdCount = selectedIds.length - objectIds.length;
      const missingCount = objectIds.length - matchedCount;
      const alreadyArchivedCount = matchedCount - archivableCount;

      return {
        processed: result.modifiedCount,
        skipped: alreadyArchivedCount,
        failed: invalidIdCount + missingCount,
        errors: [
          invalidIdCount > 0 ? `${invalidIdCount} invalid media asset ID(s) were ignored.` : "",
          missingCount > 0 ? `${missingCount} media asset(s) were not found in your tenant.` : "",
        ].filter(Boolean),
      };
    }
  );
}

export async function bulkRestoreMediaAssets(formData: FormData) {
  return runAuthorizedBulkAction(
    formData,
    {
      permission: "settings.media:view",
      revalidatePaths: ["/settings/media-library"],
    },
    async ({ selectedIds, tenantId }) => {
      const objectIds = selectedIds
        .filter((value) => mongoose.Types.ObjectId.isValid(value))
        .map((value) => new mongoose.Types.ObjectId(value));

      if (objectIds.length === 0) {
        return {
          processed: 0,
          failed: selectedIds.length,
          errors: ["No valid media asset IDs were provided."],
        };
      }

      const [matchedCount, restorableCount] = await Promise.all([
        MediaAsset.countDocuments({ tenantId, _id: { $in: objectIds } }),
        MediaAsset.countDocuments({ tenantId, _id: { $in: objectIds }, status: "archived" }),
      ]);

      const result = await MediaAsset.updateMany(
        { tenantId, _id: { $in: objectIds }, status: "archived" },
        { $set: { status: "active" } }
      );

      const invalidIdCount = selectedIds.length - objectIds.length;
      const missingCount = objectIds.length - matchedCount;
      const alreadyActiveCount = matchedCount - restorableCount;

      return {
        processed: result.modifiedCount,
        skipped: alreadyActiveCount,
        failed: invalidIdCount + missingCount,
        errors: [
          invalidIdCount > 0 ? `${invalidIdCount} invalid media asset ID(s) were ignored.` : "",
          missingCount > 0 ? `${missingCount} media asset(s) were not found in your tenant.` : "",
        ].filter(Boolean),
      };
    }
  );
}

export async function bulkDeleteMediaAssets(formData: FormData) {
  return runAuthorizedBulkAction(
    formData,
    {
      permission: "settings.media:view",
      revalidatePaths: ["/settings/media-library"],
    },
    async ({ selectedIds, tenantId }) => {
      const objectIds = selectedIds
        .filter((value) => mongoose.Types.ObjectId.isValid(value))
        .map((value) => new mongoose.Types.ObjectId(value));

      if (objectIds.length === 0) {
        return {
          processed: 0,
          failed: selectedIds.length,
          errors: ["No valid media asset IDs were provided."],
        };
      }

      const [matchedCount, deletableCount] = await Promise.all([
        MediaAsset.countDocuments({ tenantId, _id: { $in: objectIds } }),
        MediaAsset.countDocuments({ tenantId, _id: { $in: objectIds }, status: "archived" }),
      ]);

      const result = await MediaAsset.deleteMany({
        tenantId,
        _id: { $in: objectIds },
        status: "archived",
      });

      const invalidIdCount = selectedIds.length - objectIds.length;
      const missingCount = objectIds.length - matchedCount;
      const activeCount = matchedCount - deletableCount;

      return {
        processed: result.deletedCount ?? 0,
        failed: invalidIdCount + missingCount + activeCount,
        errors: [
          invalidIdCount > 0 ? `${invalidIdCount} invalid media asset ID(s) were ignored.` : "",
          missingCount > 0 ? `${missingCount} media asset(s) were not found in your tenant.` : "",
          activeCount > 0
            ? `${activeCount} active media asset(s) must be archived before permanent deletion.`
            : "",
        ].filter(Boolean),
      };
    }
  );
}

export async function createEmailTemplate(formData: FormData) {
  const auth = await getAuthorizedSessionMembership("settings.templates.email:view");
  if ("error" in auth) return { error: auth.error };

  const keyInput = (formData.get("key") as string | null) || "";
  const key = normalizeTemplateKey(keyInput);
  const name = (formData.get("name") as string | null)?.trim();
  const subject = (formData.get("subject") as string | null)?.trim();
  const htmlBody = (formData.get("htmlBody") as string | null) || "";

  if (!key) return { error: "Template key is required" };
  if (!name) return { error: "Template name is required" };
  if (!subject) return { error: "Subject is required" };
  if (!htmlBody.trim()) return { error: "HTML body is required" };

  try {
    const template = await EmailTemplate.create({
      tenantId: auth.membership.tenantId,
      key,
      name,
      subject,
      htmlBody,
      textBody: ((formData.get("textBody") as string | null) || "").trim() || undefined,
      isActive: formData.get("isActive") === "on",
      updatedById: new mongoose.Types.ObjectId(auth.sessionUserId),
    });

    revalidatePath("/settings/email-templates");
    revalidatePath(`/settings/email-templates/${template._id.toString()}`);
    return { success: true, templateId: template._id.toString() };
  } catch (error) {
    if (
      error instanceof mongoose.Error &&
      "code" in error &&
      (error as mongoose.Error & { code?: number }).code === 11000
    ) {
      return { error: "Template key already exists" };
    }
    return { error: "Failed to create template" };
  }
}

export async function updateEmailTemplate(templateId: string, formData: FormData) {
  const auth = await getAuthorizedSessionMembership("settings.templates.email:view");
  if ("error" in auth) return { error: auth.error };

  const subject = (formData.get("subject") as string | null)?.trim();
  const htmlBody = (formData.get("htmlBody") as string | null) || "";

  if (!subject) return { error: "Subject is required" };
  if (!htmlBody.trim()) return { error: "HTML body is required" };

  const updated = await EmailTemplate.findOneAndUpdate(
    {
      _id: new mongoose.Types.ObjectId(templateId),
      tenantId: auth.membership.tenantId,
    },
    {
      name: ((formData.get("name") as string | null) || "").trim() || undefined,
      subject,
      htmlBody,
      textBody: ((formData.get("textBody") as string | null) || "").trim() || undefined,
      isActive: formData.get("isActive") === "on",
      updatedById: new mongoose.Types.ObjectId(auth.sessionUserId),
    }
  );

  if (!updated) return { error: "Template not found" };

  revalidatePath("/settings/email-templates");
  revalidatePath(`/settings/email-templates/${templateId}`);
  return { success: true };
}

export async function createNotificationTemplate(formData: FormData) {
  const auth = await getAuthorizedSessionMembership("settings.templates.notification:view");
  if ("error" in auth) return { error: auth.error };

  const key = normalizeTemplateKey((formData.get("key") as string | null) || "");
  const name = (formData.get("name") as string | null)?.trim();
  const title = (formData.get("title") as string | null)?.trim();
  const message = (formData.get("message") as string | null) || "";
  const channel = (formData.get("channel") as NotificationChannel | null) || "in_app";

  if (!key) return { error: "Template key is required" };
  if (!name) return { error: "Template name is required" };
  if (!title) return { error: "Notification title is required" };
  if (!message.trim()) return { error: "Message body is required" };

  try {
    const template = await NotificationTemplate.create({
      tenantId: auth.membership.tenantId,
      key,
      name,
      channel,
      title,
      message,
      variables: parseStringList((formData.get("variables") as string | null) || ""),
      isActive: formData.get("isActive") === "on",
      updatedById: new mongoose.Types.ObjectId(auth.sessionUserId),
    });

    revalidatePath("/settings/notification-templates");
    revalidatePath(`/settings/notification-templates/${template._id.toString()}`);
    return { success: true, templateId: template._id.toString() };
  } catch (error) {
    if (
      error instanceof mongoose.Error &&
      "code" in error &&
      (error as mongoose.Error & { code?: number }).code === 11000
    ) {
      return { error: "Template key already exists" };
    }
    return { error: "Failed to create template" };
  }
}

export async function updateNotificationTemplate(templateId: string, formData: FormData) {
  const auth = await getAuthorizedSessionMembership("settings.templates.notification:view");
  if ("error" in auth) return { error: auth.error };

  const title = (formData.get("title") as string | null)?.trim();
  const message = (formData.get("message") as string | null) || "";
  const channel = (formData.get("channel") as NotificationChannel | null) || "in_app";

  if (!title) return { error: "Notification title is required" };
  if (!message.trim()) return { error: "Message body is required" };

  const updated = await NotificationTemplate.findOneAndUpdate(
    {
      _id: new mongoose.Types.ObjectId(templateId),
      tenantId: auth.membership.tenantId,
    },
    {
      name: ((formData.get("name") as string | null) || "").trim() || undefined,
      channel,
      title,
      message,
      variables: parseStringList((formData.get("variables") as string | null) || ""),
      isActive: formData.get("isActive") === "on",
      updatedById: new mongoose.Types.ObjectId(auth.sessionUserId),
    }
  );

  if (!updated) return { error: "Template not found" };

  revalidatePath("/settings/notification-templates");
  revalidatePath(`/settings/notification-templates/${templateId}`);
  return { success: true };
}
