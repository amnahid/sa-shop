"use client";

import { useEffect, type ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { usePathname } from "next/navigation";
import { cn, hexToHsl } from "@/lib/utils";
import type { NavigationPermissionKey, SidebarMembershipRole } from "./navigation-config";

interface AppShellProps {
  children: ReactNode;
  userName?: string | null;
  userEmail?: string | null;
  membershipRole?: SidebarMembershipRole | null;
  membershipPermissionOverrides?: Partial<Record<NavigationPermissionKey, boolean>>;
  primaryColor?: string | null;
  logoUrl?: string | null;
  unreadNotificationsCount?: number;
}

export function AppShell({
  children,
  userName,
  userEmail,
  membershipRole = null,
  membershipPermissionOverrides,
  primaryColor,
  logoUrl,
  unreadNotificationsCount = 0,
}: AppShellProps) {
  const pathname = usePathname();
  const isPosPage = pathname === "/pos";

  useEffect(() => {
    document.documentElement.dataset.dashboardShell = "true";
    document.body.dataset.dashboardShell = "true";

    return () => {
      delete document.documentElement.dataset.dashboardShell;
      delete document.body.dataset.dashboardShell;
    };
  }, []);

  const customStyle = primaryColor ? {
    "--primary": hexToHsl(primaryColor),
    "--ring": hexToHsl(primaryColor),
    "--sidebar-primary": hexToHsl(primaryColor),
    "--sidebar-ring": hexToHsl(primaryColor),
    "--soft-primary": `${hexToHsl(primaryColor)} / 0.15`,
  } as React.CSSProperties : undefined;

  return (
    <div className="flex h-dvh min-h-0 overflow-hidden bg-background" style={customStyle}>
      <Sidebar
        membershipRole={membershipRole}
        membershipPermissionOverrides={membershipPermissionOverrides}
        logoUrl={logoUrl}
      />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <TopBar
          userName={userName}
          userEmail={userEmail}
          membershipRole={membershipRole}
          membershipPermissionOverrides={membershipPermissionOverrides}
          unreadNotificationsCount={unreadNotificationsCount}
        />
        <main 
          className={cn(
            "flex-1 min-h-0",
            isPosPage ? "p-0 overflow-hidden" : "overflow-x-hidden overflow-y-auto overscroll-contain p-6"
          )}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
