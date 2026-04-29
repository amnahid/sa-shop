import mongoose from "mongoose";
import { sendEmail } from "@/lib/email";
import { assertTenantSendAuthorized } from "@/lib/template-delivery";
import { sendInAppNotification } from "@/lib/in-app-notifications";

type TenantIdentifier = string | mongoose.Types.ObjectId;

type MonitoringMetadata = Record<string, unknown>;

export interface CriticalFailureInput {
  domain: string;
  operation: string;
  error: unknown;
  tenantId?: TenantIdentifier;
  actorTenantId?: TenantIdentifier;
  branchId?: string;
  entityType?: string;
  entityId?: string;
  route?: string;
  jobName?: string;
  metadata?: MonitoringMetadata;
  alertEmail?: string;
}

interface MonitoringDependencies {
  logError?: (message: string, payload: string) => void;
  sendEmailFn?: typeof sendEmail;
  getAlertEmail?: () => string | undefined;
  now?: () => Date;
  randomId?: () => string;
}

const SENSITIVE_KEY_PATTERN = /(password|token|secret|email|phone|address|customer|supplier)/i;
const DEFAULT_MAX_DEPTH = 3;

function toObjectIdString(value?: TenantIdentifier) {
  if (!value) return undefined;
  return value.toString();
}

function sanitizeError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stackTop: error.stack?.split("\n")[0],
    };
  }

  if (typeof error === "string") {
    return { message: error };
  }

  return { message: "Unknown error" };
}

function sanitizeMetadataValue(value: unknown, depth = 0): unknown {
  if (depth >= DEFAULT_MAX_DEPTH) return "[truncated]";
  if (value === null || value === undefined) return value;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return value;
  if (value instanceof Date) return value.toISOString();

  if (Array.isArray(value)) {
    return value.slice(0, 20).map((item) => sanitizeMetadataValue(item, depth + 1));
  }

  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      out[key] = SENSITIVE_KEY_PATTERN.test(key) ? "[redacted]" : sanitizeMetadataValue(child, depth + 1);
    }
    return out;
  }

  return String(value);
}

function buildFailureId(now: Date, randomId?: () => string) {
  if (randomId) return randomId();
  return `ops-${now.getTime()}-${Math.random().toString(36).slice(2, 8)}`;
}

function getInAppRecipientIds(metadata?: MonitoringMetadata) {
  const candidate = metadata?.recipientUserIds;
  if (!Array.isArray(candidate)) return [];
  return candidate
    .filter((value): value is string | mongoose.Types.ObjectId =>
      typeof value === "string" || value instanceof mongoose.Types.ObjectId
    )
    .map((value) => value.toString());
}

export async function reportCriticalFailure(
  input: CriticalFailureInput,
  dependencies: MonitoringDependencies = {}
) {
  const now = dependencies.now?.() ?? new Date();
  const failureId = buildFailureId(now, dependencies.randomId);
  const tenantId = toObjectIdString(input.tenantId);
  const actorTenantId = toObjectIdString(input.actorTenantId);
  const tenantAuthorization = tenantId
    ? assertTenantSendAuthorized(tenantId, actorTenantId)
    : { success: true as const };

  const payload = {
    event: "critical-failure",
    severity: "critical",
    failureId,
    timestamp: now.toISOString(),
    domain: input.domain,
    operation: input.operation,
    tenantId,
    actorTenantId,
    branchId: input.branchId,
    entityType: input.entityType,
    entityId: input.entityId,
    route: input.route,
    jobName: input.jobName,
    error: sanitizeError(input.error),
    metadata: sanitizeMetadataValue(input.metadata || {}),
    alertSuppressedReason: tenantAuthorization.success ? undefined : tenantAuthorization.error,
  };

  const logError = dependencies.logError ?? ((message: string, structuredPayload: string) => console.error(message, structuredPayload));
  logError("[OPS_MONITOR]", JSON.stringify(payload));

  if (tenantId && tenantAuthorization.success) {
    const recipients = getInAppRecipientIds(input.metadata);
    if (recipients.length > 0) {
      const inAppResult = await sendInAppNotification({
        tenantId,
        actorTenantId: actorTenantId || tenantId,
        recipientUserIds: recipients,
        type: "ops.critical_failure",
        title: `Critical failure: ${input.domain}`,
        message: `${input.operation} failed (${failureId}).`,
        linkUrl: "/dashboard",
        metadata: {
          failureId,
          domain: input.domain,
          operation: input.operation,
          route: input.route,
          jobName: input.jobName,
        },
      });
      if (!inAppResult.success) {
        logError(
          "[OPS_MONITOR_IN_APP_ALERT_FAILED]",
          JSON.stringify({
            failureId,
            domain: input.domain,
            operation: input.operation,
            tenantId,
            error: inAppResult.error,
          })
        );
      }
    }
  }

  const alertEmail =
    input.alertEmail ||
    dependencies.getAlertEmail?.() ||
    process.env.OPS_ALERT_EMAIL ||
    process.env.ALERT_EMAIL_ADDRESS;

  if (!alertEmail) {
    return { logged: true, alerted: false, failureId, reason: "alert-channel-not-configured" as const };
  }

  if (!tenantAuthorization.success) {
    return { logged: true, alerted: false, failureId, reason: "cross-tenant-alert-blocked" as const };
  }

  const sendEmailFn = dependencies.sendEmailFn ?? sendEmail;
  const sendResult = await sendEmailFn(
    "critical-failure",
    {
      to: alertEmail,
      businessName: "SA Shop Ops",
      failureId,
      domain: input.domain,
      operation: input.operation,
      occurredAt: now,
      errorMessage: payload.error.message,
      contextSummary: JSON.stringify({
        tenantId,
        branchId: input.branchId,
        entityType: input.entityType,
        entityId: input.entityId,
        jobName: input.jobName,
      }),
    } as Parameters<typeof sendEmail>[1],
    tenantId
      ? {
          tenantId,
          actorTenantId: actorTenantId || tenantId,
          templateVariables: {
            failureId,
            domain: input.domain,
            operation: input.operation,
            occurredAt: now.toISOString(),
            errorMessage: payload.error.message,
            contextSummary: JSON.stringify(payload.metadata),
          },
        }
      : {
          templateVariables: {
            failureId,
            domain: input.domain,
            operation: input.operation,
            occurredAt: now.toISOString(),
            errorMessage: payload.error.message,
            contextSummary: JSON.stringify(payload.metadata),
          },
        }
  );

  if (!sendResult.success) {
    logError(
      "[OPS_MONITOR_ALERT_FAILED]",
      JSON.stringify({
        failureId,
        domain: input.domain,
        operation: input.operation,
        tenantId,
      })
    );
    return { logged: true, alerted: false, failureId, reason: "alert-send-failed" as const };
  }

  return { logged: true, alerted: true, failureId };
}
