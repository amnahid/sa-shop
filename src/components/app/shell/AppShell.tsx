"use client";

import type { ReactNode } from "react";
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
}

export function AppShell({
  children,
  userName,
  userEmail,
  membershipRole = null,
  membershipPermissionOverrides,
  primaryColor,
  logoUrl,
}: AppShellProps) {
  const pathname = usePathname();
  const isPosPage = pathname === "/pos";

  const customStyle = primaryColor ? {
    "--primary": hexToHsl(primaryColor),
    "--ring": hexToHsl(primaryColor),
    "--sidebar-primary": hexToHsl(primaryColor),
    "--sidebar-ring": hexToHsl(primaryColor),
    "--soft-primary": `${hexToHsl(primaryColor)} / 0.15`,
  } as React.CSSProperties : undefined;

  return (
    <div className="flex h-screen bg-background" style={customStyle}>
      <div className="hidden h-full w-60 shrink-0 border-r border-sidebar-border lg:block">
        <Sidebar
          membershipRole={membershipRole}
          membershipPermissionOverrides={membershipPermissionOverrides}
          logoUrl={logoUrl}
        />
      </div>
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar
          userName={userName}
          userEmail={userEmail}
          membershipRole={membershipRole}
          membershipPermissionOverrides={membershipPermissionOverrides}
        />
        <main 
          className={cn(
            "flex-1 min-h-0",
            isPosPage ? "p-0 overflow-hidden" : "p-6 overflow-auto"
          )}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
