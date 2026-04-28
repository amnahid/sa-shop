import mongoose from "mongoose";

export type TemplateVariableValue = string | number | boolean | Date | null | undefined;
export type TemplateVariables = Record<string, TemplateVariableValue>;
export type NotificationChannel = "in_app" | "sms" | "whatsapp" | "push";

type TenantIdentifier = string | mongoose.Types.ObjectId;

export interface ResolvedEmailTemplate {
  subject: string;
  htmlBody: string;
  textBody?: string;
}

export interface ResolvedNotificationTemplate {
  title: string;
  message: string;
  channel: NotificationChannel;
}

interface BaseTemplateResolutionInput {
  tenantId: TenantIdentifier;
  actorTenantId?: TenantIdentifier;
  templateKey: string;
  variables: TemplateVariables;
}

interface ResolveEmailTemplateInput extends BaseTemplateResolutionInput {
  requireTemplate?: boolean;
  findTemplate?: (
    tenantId: mongoose.Types.ObjectId,
    templateKey: string
  ) => Promise<{ subject: string; htmlBody: string; textBody?: string | null } | null>;
}

interface ResolveNotificationTemplateInput extends BaseTemplateResolutionInput {
  requireTemplate?: boolean;
  findTemplate?: (
    tenantId: mongoose.Types.ObjectId,
    templateKey: string
  ) => Promise<{ title: string; message: string; channel: NotificationChannel } | null>;
}

function toObjectId(value: TenantIdentifier) {
  if (value instanceof mongoose.Types.ObjectId) return value;
  if (!mongoose.Types.ObjectId.isValid(value)) return null;
  return new mongoose.Types.ObjectId(value);
}

export function assertTenantSendAuthorized(targetTenantId: TenantIdentifier, actorTenantId?: TenantIdentifier) {
  if (!actorTenantId) return { success: true as const };
  if (targetTenantId.toString() !== actorTenantId.toString()) {
    return {
      success: false as const,
      error: "Insufficient permissions for cross-tenant send",
    };
  }
  return { success: true as const };
}

export function renderTemplateString(template: string, variables: TemplateVariables) {
  const missingVariables = new Set<string>();

  const rendered = template.replace(/\{\{\s*([a-zA-Z0-9._-]+)\s*\}\}/g, (_token, variableName: string) => {
    const value = variables[variableName];
    if (value === null || value === undefined) {
      missingVariables.add(variableName);
      return `{{${variableName}}}`;
    }

    if (value instanceof Date) return value.toISOString();
    return String(value);
  });

  return { rendered, missingVariables: [...missingVariables] };
}

async function defaultFindEmailTemplate(tenantId: mongoose.Types.ObjectId, templateKey: string) {
  const { EmailTemplate } = await import("@/models");
  return EmailTemplate.findOne({ tenantId, key: templateKey, isActive: true })
    .select("subject htmlBody textBody")
    .lean<{ subject: string; htmlBody: string; textBody?: string | null }>();
}

async function defaultFindNotificationTemplate(tenantId: mongoose.Types.ObjectId, templateKey: string) {
  const { NotificationTemplate } = await import("@/models");
  return NotificationTemplate.findOne({ tenantId, key: templateKey, isActive: true })
    .select("title message channel")
    .lean<{ title: string; message: string; channel: NotificationChannel }>();
}

export async function resolveEmailTemplateForDelivery({
  tenantId,
  actorTenantId,
  templateKey,
  variables,
  requireTemplate = false,
  findTemplate = defaultFindEmailTemplate,
}: ResolveEmailTemplateInput) {
  const authorization = assertTenantSendAuthorized(tenantId, actorTenantId);
  if (!authorization.success) {
    return { error: authorization.error };
  }

  const normalizedTenantId = toObjectId(tenantId);
  if (!normalizedTenantId) {
    return { error: "Invalid tenant context for email delivery" };
  }

  const savedTemplate = await findTemplate(normalizedTenantId, templateKey);
  if (!savedTemplate) {
    if (requireTemplate) {
      return { error: `Email template \"${templateKey}\" not found` };
    }
    return { template: null };
  }

  const renderedSubject = renderTemplateString(savedTemplate.subject, variables);
  const renderedHtml = renderTemplateString(savedTemplate.htmlBody, variables);
  const renderedText = savedTemplate.textBody
    ? renderTemplateString(savedTemplate.textBody, variables)
    : undefined;

  const missingVariables = [
    ...renderedSubject.missingVariables,
    ...renderedHtml.missingVariables,
    ...(renderedText?.missingVariables || []),
  ];

  if (missingVariables.length > 0) {
    return {
      error: `Template \"${templateKey}\" is missing variables: ${[...new Set(missingVariables)].join(", ")}`,
    };
  }

  return {
    template: {
      subject: renderedSubject.rendered,
      htmlBody: renderedHtml.rendered,
      textBody: renderedText?.rendered,
    } satisfies ResolvedEmailTemplate,
  };
}

export async function resolveNotificationTemplateForDelivery({
  tenantId,
  actorTenantId,
  templateKey,
  variables,
  requireTemplate = true,
  findTemplate = defaultFindNotificationTemplate,
}: ResolveNotificationTemplateInput) {
  const authorization = assertTenantSendAuthorized(tenantId, actorTenantId);
  if (!authorization.success) {
    return { error: authorization.error };
  }

  const normalizedTenantId = toObjectId(tenantId);
  if (!normalizedTenantId) {
    return { error: "Invalid tenant context for notification delivery" };
  }

  const savedTemplate = await findTemplate(normalizedTenantId, templateKey);
  if (!savedTemplate) {
    if (requireTemplate) {
      return { error: `Notification template \"${templateKey}\" not found` };
    }
    return { template: null };
  }

  const renderedTitle = renderTemplateString(savedTemplate.title, variables);
  const renderedMessage = renderTemplateString(savedTemplate.message, variables);

  const missingVariables = [...renderedTitle.missingVariables, ...renderedMessage.missingVariables];
  if (missingVariables.length > 0) {
    return {
      error: `Template \"${templateKey}\" is missing variables: ${[...new Set(missingVariables)].join(", ")}`,
    };
  }

  return {
    template: {
      title: renderedTitle.rendered,
      message: renderedMessage.rendered,
      channel: savedTemplate.channel,
    } satisfies ResolvedNotificationTemplate,
  };
}
