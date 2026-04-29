import type { MembershipRole } from "@/lib/utils/membership-roles";

export const APP_PERMISSION_KEYS = [
  "dashboard:view",
  "pos:view",
  "pos.invoices:view",
  "sales.proposals:view",
  "sales.retainers:view",
  "customers:view",
  "inventory.products:view",
  "inventory.stock:view",
  "inventory.stock.adjust",
  "inventory.stock.transfer",
  "inventory.categories:view",
  "inventory.suppliers:view",
  "inventory.purchaseOrders:view",
  "inventory.branches:view",
  "reports:view",
  "reports.sales:view",
  "reports.profit:view",
  "reports.lowStock:view",
  "reports.stockMovements:view",
  "notifications:view",
  "settings:view",
  "settings.profile:view",
  "settings.team:view",
  "settings.branches:view",
  "settings.admin:view",
  "settings.admin.manage",
  "settings.media:view",
  "settings.templates.email:view",
  "settings.templates.notification:view",
  "accounting:view",
  "hr:view",
  "promotions:view",
  "integrations:view",
  "ai:view",
] as const;

export type AppPermissionKey = (typeof APP_PERMISSION_KEYS)[number];

export const ADMIN_SCOPED_PERMISSION_KEYS: AppPermissionKey[] = [
  "sales.proposals:view",
  "sales.retainers:view",
  "inventory.purchaseOrders:view",
  "inventory.branches:view",
  "settings:view",
  "settings.team:view",
  "settings.branches:view",
  "settings.admin:view",
  "settings.admin.manage",
  "settings.media:view",
  "settings.templates.email:view",
  "settings.templates.notification:view",
  "accounting:view",
];

const ALL_MEMBERSHIP_ROLES: MembershipRole[] = ["owner", "manager", "cashier"];
const MANAGEMENT_MEMBERSHIP_ROLES: MembershipRole[] = ["owner", "manager"];
const OWNER_MEMBERSHIP_ROLES: MembershipRole[] = ["owner"];

export const permissionRoleDefaults: Record<AppPermissionKey, readonly MembershipRole[]> = {
  "dashboard:view": ALL_MEMBERSHIP_ROLES,
  "pos:view": ALL_MEMBERSHIP_ROLES,
  "pos.invoices:view": ALL_MEMBERSHIP_ROLES,
  "sales.proposals:view": MANAGEMENT_MEMBERSHIP_ROLES,
  "sales.retainers:view": MANAGEMENT_MEMBERSHIP_ROLES,
  "customers:view": ALL_MEMBERSHIP_ROLES,
  "inventory.products:view": ALL_MEMBERSHIP_ROLES,
  "inventory.stock:view": ALL_MEMBERSHIP_ROLES,
  "inventory.stock.adjust": ALL_MEMBERSHIP_ROLES,
  "inventory.stock.transfer": ALL_MEMBERSHIP_ROLES,
  "inventory.categories:view": ALL_MEMBERSHIP_ROLES,
  "inventory.suppliers:view": ALL_MEMBERSHIP_ROLES,
  "inventory.purchaseOrders:view": MANAGEMENT_MEMBERSHIP_ROLES,
  "inventory.branches:view": MANAGEMENT_MEMBERSHIP_ROLES,
  "reports:view": ALL_MEMBERSHIP_ROLES,
  "reports.sales:view": ALL_MEMBERSHIP_ROLES,
  "reports.profit:view": ALL_MEMBERSHIP_ROLES,
  "reports.lowStock:view": ALL_MEMBERSHIP_ROLES,
  "reports.stockMovements:view": ALL_MEMBERSHIP_ROLES,
  "notifications:view": ALL_MEMBERSHIP_ROLES,
  "settings:view": MANAGEMENT_MEMBERSHIP_ROLES,
  "settings.profile:view": MANAGEMENT_MEMBERSHIP_ROLES,
  "settings.team:view": MANAGEMENT_MEMBERSHIP_ROLES,
  "settings.branches:view": MANAGEMENT_MEMBERSHIP_ROLES,
  "settings.admin:view": OWNER_MEMBERSHIP_ROLES,
  "settings.admin.manage": OWNER_MEMBERSHIP_ROLES,
  "settings.media:view": MANAGEMENT_MEMBERSHIP_ROLES,
  "settings.templates.email:view": MANAGEMENT_MEMBERSHIP_ROLES,
  "settings.templates.notification:view": MANAGEMENT_MEMBERSHIP_ROLES,
  "accounting:view": OWNER_MEMBERSHIP_ROLES,
  "hr:view": OWNER_MEMBERSHIP_ROLES,
  "promotions:view": OWNER_MEMBERSHIP_ROLES,
  "integrations:view": OWNER_MEMBERSHIP_ROLES,
  "ai:view": OWNER_MEMBERSHIP_ROLES,
};

export type PermissionOverrides =
  | Map<string, boolean>
  | Record<string, boolean>
  | null
  | undefined;

export function isAppPermissionKey(value: string): value is AppPermissionKey {
  return APP_PERMISSION_KEYS.includes(value as AppPermissionKey);
}

export function canRoleAccessPermission(
  permissionKey: AppPermissionKey | undefined,
  role: MembershipRole | null | undefined
) {
  if (!permissionKey) {
    return true;
  }

  if (!role) {
    return false;
  }

  const allowedRoles = permissionRoleDefaults[permissionKey];
  if (!allowedRoles) {
    return false;
  }

  return allowedRoles.includes(role);
}

function getPermissionOverride(
  permissionOverrides: PermissionOverrides,
  permissionKey: AppPermissionKey
): boolean | undefined {
  if (!permissionOverrides) {
    return undefined;
  }

  if (permissionOverrides instanceof Map) {
    return permissionOverrides.get(permissionKey);
  }

  return permissionOverrides[permissionKey];
}

export function canAccessPermission(
  permissionKey: AppPermissionKey | undefined,
  role: MembershipRole | null | undefined,
  permissionOverrides?: PermissionOverrides
) {
  if (!permissionKey) {
    return true;
  }

  const override = getPermissionOverride(permissionOverrides, permissionKey);
  if (typeof override === "boolean") {
    return override;
  }

  return canRoleAccessPermission(permissionKey, role);
}

export function serializePermissionOverrides(permissionOverrides?: PermissionOverrides) {
  if (!permissionOverrides) {
    return undefined;
  }

  const entries =
    permissionOverrides instanceof Map
      ? Array.from(permissionOverrides.entries())
      : Object.entries(permissionOverrides);

  if (entries.length === 0) {
    return undefined;
  }

  return Object.fromEntries(entries) as Record<string, boolean>;
}
