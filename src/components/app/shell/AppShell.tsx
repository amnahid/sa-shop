import type { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import type { SidebarMembershipRole } from "./navigation-config";

interface AppShellProps {
  children: ReactNode;
  userName?: string | null;
  userEmail?: string | null;
  membershipRole?: SidebarMembershipRole | null;
}

export function AppShell({
  children,
  userName,
  userEmail,
  membershipRole = null,
}: AppShellProps) {
  return (
    <div className="flex min-h-screen">
      <div className="hidden w-60 shrink-0 border-r lg:block">
        <Sidebar membershipRole={membershipRole} />
      </div>
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar userName={userName} userEmail={userEmail} membershipRole={membershipRole} />
        <main className="flex-1 overflow-auto p-5">{children}</main>
      </div>
    </div>
  );
}
