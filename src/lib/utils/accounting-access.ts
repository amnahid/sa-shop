import type { MembershipRole } from "@/lib/utils/membership-roles";
import { canAccessPermission, type PermissionOverrides } from "@/lib/utils/permissions";

interface AccountingAccessCandidate {
  role: MembershipRole | null | undefined;
  permissionOverrides?: PermissionOverrides;
}

export function hasAccountingRouteAccess<T extends AccountingAccessCandidate>(
  membership: T | null | undefined
): membership is T {
  if (!membership) {
    return false;
  }

  return canAccessPermission("accounting:view", membership.role, membership.permissionOverrides);
}

