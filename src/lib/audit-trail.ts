import mongoose from "mongoose";
import { User } from "@/models/tenancy/User";
import { AuditLog, logAudit } from "@/models/plugins/auditLog";

export type AuditedEntityType = "accounting-entry" | "proposal" | "retainer";

export interface AuditMetadata {
  changedFields?: string[];
  summary?: string;
  [key: string]: unknown;
}

export interface CreateAuditEntryInput {
  tenantId: mongoose.Types.ObjectId;
  actorUserId: mongoose.Types.ObjectId;
  entityType: AuditedEntityType;
  entityId: mongoose.Types.ObjectId;
  action: "create" | "update" | "void";
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  metadata?: AuditMetadata;
}

export interface AuditTimelineEntry {
  id: string;
  entityType: AuditedEntityType;
  entityId: string;
  action: "create" | "update" | "delete" | "void";
  actorUserId: string;
  actorName?: string;
  timestamp: Date;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  changedFields: string[];
  summary?: string;
}

function serializeAuditValue(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (value instanceof Date) return value.toISOString();
  if (value instanceof mongoose.Types.ObjectId) return value.toString();
  if (value instanceof mongoose.Types.Decimal128) return value.toString();
  if (Array.isArray(value)) return value.map((item) => serializeAuditValue(item));
  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, nested]) => [key, serializeAuditValue(nested)])
    );
  }
  return value;
}

function normalizeAuditSnapshot(snapshot?: Record<string, unknown>, metadata?: AuditMetadata) {
  if (!snapshot && !metadata) return undefined;
  const serialized = snapshot
    ? (serializeAuditValue(snapshot) as Record<string, unknown>)
    : {};

  if (!metadata) return serialized;

  const next = { ...serialized };
  if (metadata.changedFields?.length) next.changedFields = metadata.changedFields;
  if (metadata.summary) next.summary = metadata.summary;
  for (const [key, value] of Object.entries(metadata)) {
    if (key === "changedFields" || key === "summary") continue;
    next[key] = serializeAuditValue(value);
  }

  return next;
}

export function buildStatusTransitionSummary(
  entityType: AuditedEntityType,
  fromStatus: string,
  toStatus: string
) {
  return `${entityType} status changed from ${fromStatus} to ${toStatus}`;
}

export function buildLifecycleTransitionMetadata(
  entityType: AuditedEntityType,
  fromStatus: string,
  toStatus: string,
  changedFields: string[]
) {
  return {
    changedFields,
    summary: buildStatusTransitionSummary(entityType, fromStatus, toStatus),
  };
}

export async function createAuditEntry(input: CreateAuditEntryInput) {
  await logAudit({
    tenantId: input.tenantId,
    userId: input.actorUserId,
    action: input.action,
    collection: input.entityType,
    documentId: input.entityId,
    before: normalizeAuditSnapshot(input.before),
    after: normalizeAuditSnapshot(input.after, input.metadata),
  });
}

export async function getEntityAuditTimeline(
  tenantId: mongoose.Types.ObjectId,
  entityType: AuditedEntityType,
  entityId: mongoose.Types.ObjectId,
  limit = 20
) {
  return getAuditTimelineForEntityIds(tenantId, entityType, [entityId], limit);
}

export async function getAuditTimelineForEntityIds(
  tenantId: mongoose.Types.ObjectId,
  entityType: AuditedEntityType,
  entityIds: mongoose.Types.ObjectId[],
  limit = 100
) {
  if (entityIds.length === 0) return [] as AuditTimelineEntry[];

  const logs = await AuditLog.find({
    tenantId,
    collection: entityType,
    documentId: { $in: entityIds },
  })
    .sort({ timestamp: -1 })
    .limit(limit)
    .lean();

  const userIds = Array.from(new Set(logs.map((log) => log.userId.toString())));
  const users = await User.find({ _id: { $in: userIds } }).select({ _id: 1, name: 1 }).lean();
  const userById = new Map(users.map((user) => [user._id.toString(), user.name]));

  return logs.map((log) => {
    const after = (log.after || {}) as Record<string, unknown>;
    const changedFields = Array.isArray(after.changedFields)
      ? after.changedFields.filter((field): field is string => typeof field === "string")
      : [];
    const summary = typeof after.summary === "string" ? after.summary : undefined;

    return {
      id: log._id.toString(),
      entityType: log.collection as AuditedEntityType,
      entityId: log.documentId.toString(),
      action: log.action,
      actorUserId: log.userId.toString(),
      actorName: userById.get(log.userId.toString()),
      timestamp: log.timestamp,
      before: log.before as Record<string, unknown> | undefined,
      after: log.after as Record<string, unknown> | undefined,
      changedFields,
      summary,
    };
  });
}
