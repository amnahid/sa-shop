import mongoose from "mongoose";
import { InboxEntry } from "@/models";
import {
  resolveNotificationTemplateForDelivery,
  type NotificationChannel,
  type TemplateVariables,
} from "@/lib/template-delivery";

type ObjectIdLike = string | mongoose.Types.ObjectId;

interface ResolvedTemplate {
  title: string;
  message: string;
  channel: NotificationChannel;
}

interface InboxEntryInsertDocument {
  tenantId: mongoose.Types.ObjectId;
  recipientUserId: mongoose.Types.ObjectId;
  templateKey?: string;
  type: string;
  title: string;
  message: string;
  linkUrl?: string;
  metadata?: Record<string, unknown>;
  status: "unread";
  createdById?: mongoose.Types.ObjectId;
}

interface InAppDispatchInput {
  tenantId: ObjectIdLike;
  actorTenantId?: ObjectIdLike;
  recipientUserIds: ObjectIdLike[];
  templateKey?: string;
  templateVariables?: TemplateVariables;
  title?: string;
  message?: string;
  type?: string;
  linkUrl?: string;
  metadata?: Record<string, unknown>;
  createdById?: ObjectIdLike;
}

interface InAppDispatchDeps {
  resolveTemplate?: (input: {
    tenantId: ObjectIdLike;
    actorTenantId?: ObjectIdLike;
    templateKey: string;
    variables: TemplateVariables;
    requireTemplate: boolean;
  }) => Promise<{ error: string } | { template: ResolvedTemplate | null }>;
  insertMany?: (entries: InboxEntryInsertDocument[]) => Promise<{ insertedCount: number }>;
  logError?: (message: string, payload: Record<string, unknown>) => void;
  logInfo?: (message: string, payload: Record<string, unknown>) => void;
}

function normalizeObjectId(value: ObjectIdLike) {
  if (value instanceof mongoose.Types.ObjectId) return value;
  if (!mongoose.Types.ObjectId.isValid(value)) return null;
  return new mongoose.Types.ObjectId(value);
}

const defaultDeps: Required<InAppDispatchDeps> = {
  resolveTemplate: resolveNotificationTemplateForDelivery,
  insertMany: async (entries) => {
    const inserted = await InboxEntry.insertMany(entries, { ordered: true });
    return { insertedCount: inserted.length };
  },
  logError: (message, payload) => console.error(message, JSON.stringify(payload)),
  logInfo: (message, payload) => console.info(message, JSON.stringify(payload)),
};

export async function sendInAppNotification(
  input: InAppDispatchInput,
  deps: InAppDispatchDeps = {}
) {
  const mergedDeps = { ...defaultDeps, ...deps };

  const tenantId = normalizeObjectId(input.tenantId);
  if (!tenantId) {
    return { success: false as const, error: "Invalid tenant context for in-app notification" };
  }

  const recipientUserIds = [...new Set(input.recipientUserIds.map((value) => value.toString()))]
    .map((value) => normalizeObjectId(value))
    .filter((value): value is mongoose.Types.ObjectId => value !== null);

  if (recipientUserIds.length === 0) {
    return { success: false as const, error: "At least one valid recipient is required" };
  }

  const createdById = input.createdById ? normalizeObjectId(input.createdById) : null;

  let resolvedTitle = input.title?.trim();
  let resolvedMessage = input.message?.trim();

  if (input.templateKey) {
    const templateResult = await mergedDeps.resolveTemplate({
      tenantId,
      actorTenantId: input.actorTenantId,
      templateKey: input.templateKey,
      variables: input.templateVariables || {},
      requireTemplate: false,
    });

    if ("error" in templateResult) {
      mergedDeps.logError("[NOTIFICATIONS_IN_APP_TEMPLATE_ERROR]", {
        tenantId: tenantId.toString(),
        templateKey: input.templateKey,
        error: templateResult.error,
      });
      return { success: false as const, error: templateResult.error };
    }

    if (templateResult.template) {
      if (templateResult.template.channel !== "in_app") {
        return {
          success: false as const,
          error: `Template "${input.templateKey}" is not configured for in-app delivery`,
        };
      }
      resolvedTitle = templateResult.template.title.trim();
      resolvedMessage = templateResult.template.message.trim();
    }
  }

  if (!resolvedTitle || !resolvedMessage) {
    return {
      success: false as const,
      error: "Notification title and message are required when no in-app template is resolved",
    };
  }

  const entries: InboxEntryInsertDocument[] = recipientUserIds.map((recipientUserId) => ({
    tenantId,
    recipientUserId,
    templateKey: input.templateKey,
    type: input.type || "system",
    title: resolvedTitle as string,
    message: resolvedMessage as string,
    linkUrl: input.linkUrl,
    metadata: input.metadata,
    status: "unread",
    ...(createdById ? { createdById } : {}),
  }));

  let insertedCount = 0;
  try {
    const inserted = await mergedDeps.insertMany(entries);
    insertedCount = inserted.insertedCount;
  } catch (error) {
    mergedDeps.logError("[NOTIFICATIONS_IN_APP_DISPATCH_FAILED]", {
      tenantId: tenantId.toString(),
      type: input.type || "system",
      templateKey: input.templateKey,
      recipientCount: recipientUserIds.length,
      error: error instanceof Error ? error.message : String(error),
    });
    return { success: false as const, error: "Failed to persist in-app notification entries" };
  }

  mergedDeps.logInfo("[NOTIFICATIONS_IN_APP_DISPATCHED]", {
    tenantId: tenantId.toString(),
    type: input.type || "system",
    templateKey: input.templateKey,
    recipientCount: recipientUserIds.length,
    insertedCount,
  });

  return {
    success: true as const,
    insertedCount,
  };
}
