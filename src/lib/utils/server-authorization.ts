import mongoose from "mongoose";
import { getSession } from "@/lib/auth-utils";
import { Membership } from "@/models";
import { canAccessPermission, type AppPermissionKey } from "@/lib/utils/permissions";

export async function getSessionMembership() {
  const session = await getSession();
  if (!session?.user?.id) {
    return { error: "Unauthorized" as const };
  }

  const membership = await Membership.findOne({
    userId: new mongoose.Types.ObjectId(session.user.id),
    status: "active",
  });
  if (!membership) {
    return { error: "No active membership" as const };
  }

  return { sessionUserId: session.user.id, membership };
}

export async function getAuthorizedSessionMembership(permissionKey: AppPermissionKey) {
  const auth = await getSessionMembership();
  if ("error" in auth) {
    return auth;
  }

  if (!canAccessPermission(permissionKey, auth.membership.role, auth.membership.permissionOverrides)) {
    return { error: "Insufficient permissions" as const };
  }

  return auth;
}
