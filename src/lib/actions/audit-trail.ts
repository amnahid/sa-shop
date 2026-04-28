"use server";

import mongoose from "mongoose";
import type { AppPermissionKey } from "@/lib/utils/permissions";
import { getAuthorizedSessionMembership } from "@/lib/utils/server-authorization";
import {
  getAuditTimelineForEntityIds,
  getEntityAuditTimeline,
  type AuditedEntityType,
} from "@/lib/audit-trail";

export async function loadEntityAuditTimeline(
  entityType: AuditedEntityType,
  entityId: string,
  permissionKey: AppPermissionKey
) {
  const auth = await getAuthorizedSessionMembership(permissionKey);
  if ("error" in auth) return { error: auth.error };

  if (!mongoose.Types.ObjectId.isValid(entityId)) {
    return { error: "Entity not found" as const };
  }

  const timeline = await getEntityAuditTimeline(
    auth.membership.tenantId,
    entityType,
    new mongoose.Types.ObjectId(entityId),
    30
  );

  return { timeline };
}

export async function loadEntityAuditTimelineBatch(
  entityType: AuditedEntityType,
  entityIds: string[],
  permissionKey: AppPermissionKey
) {
  const auth = await getAuthorizedSessionMembership(permissionKey);
  if ("error" in auth) return { error: auth.error };

  const validIds = entityIds
    .filter((id) => mongoose.Types.ObjectId.isValid(id))
    .map((id) => new mongoose.Types.ObjectId(id));

  const timeline = await getAuditTimelineForEntityIds(auth.membership.tenantId, entityType, validIds, 300);
  return { timeline };
}
