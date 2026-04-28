export const MEMBERSHIP_ROLES = ["owner", "manager", "cashier"] as const;

export type MembershipRole = (typeof MEMBERSHIP_ROLES)[number];

export function isMembershipRole(value: unknown): value is MembershipRole {
  return typeof value === "string" && MEMBERSHIP_ROLES.includes(value as MembershipRole);
}
