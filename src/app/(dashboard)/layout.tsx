import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth-utils";
import { AppShell } from "@/components/app/shell/AppShell";
import { getCurrentMembership } from "@/lib/utils/membership";
import { isMembershipRole } from "@/lib/utils/membership-roles";

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

  return (
    <AppShell
      userName={session.user?.name}
      userEmail={session.user?.email}
      membershipRole={membershipRole}
    >
      {children}
    </AppShell>
  );
}
