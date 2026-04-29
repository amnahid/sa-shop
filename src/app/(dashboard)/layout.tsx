import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth-utils";
import { AppShell } from "@/components/app/shell/AppShell";
import { getCurrentMembership } from "@/lib/utils/membership";
import { isMembershipRole } from "@/lib/utils/membership-roles";
import { serializePermissionOverrides } from "@/lib/utils/permissions";
import { Tenant } from "@/models";
import { getUnreadNotificationCount } from "@/lib/actions/notifications";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  const membership = await getCurrentMembership();

  if (!session) {
    redirect("/login");
  }

  if (!membership || !isMembershipRole(membership.role)) {
    redirect("/onboarding/business");
  }

  const membershipRole = membership.role;
  const membershipPermissionOverrides = serializePermissionOverrides(membership.permissionOverrides);

  const [tenant, unreadNotificationsResult] = await Promise.all([
    Tenant.findById(membership.tenantId),
    getUnreadNotificationCount(),
  ]);
  const unreadNotificationsCount =
    "error" in unreadNotificationsResult ? 0 : unreadNotificationsResult.unreadCount;

  return (
    <AppShell
      userName={session.user?.name}
      userEmail={session.user?.email}
      membershipRole={membershipRole}
      membershipPermissionOverrides={membershipPermissionOverrides}
      primaryColor={tenant?.primaryColor}
      logoUrl={tenant?.logoUrl}
      unreadNotificationsCount={unreadNotificationsCount}
    >
      {children}
    </AppShell>
  );
}
