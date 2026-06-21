"use client";

import Link from "next/link";
import { useMemo } from "react";
import { usePathname } from "next/navigation";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { UserMenu } from "./UserMenu";
import { Menu, Printer, Layers, Bell, LayoutDashboard } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { NavDropdown } from "./NavDropdown";
import { cn } from "@/lib/utils";
import {
  canAccessSidebarPermission,
  filterSidebarNavigationByRole,
  sidebarNavigationConfig,
  type NavigationPermissionKey,
  type SidebarMembershipRole,
} from "./navigation-config";

interface TopBarProps {
  onToggleSidebar: () => void;
  userName?: string | null;
  userEmail?: string | null;
  membershipRole?: SidebarMembershipRole | null;
  membershipPermissionOverrides?: Partial<Record<NavigationPermissionKey, boolean>>;
  unreadNotificationsCount?: number;
}

export function TopBar({
  onToggleSidebar,
  userName,
  userEmail,
  membershipRole = null,
  membershipPermissionOverrides,
  unreadNotificationsCount = 0,
}: TopBarProps) {
  const pathname = usePathname();
  const { showToast } = useToast();

  const filteredGroups = useMemo(
    () =>
      filterSidebarNavigationByRole(
        sidebarNavigationConfig,
        membershipRole,
        membershipPermissionOverrides
      ),
    [membershipRole, membershipPermissionOverrides]
  );

  const canViewNotifications = canAccessSidebarPermission(
    "notifications:view",
    membershipRole,
    membershipPermissionOverrides
  );

  const handlePrint = () => {
    window.print();
  };

  const handleClearCache = () => {
    localStorage.clear();
    sessionStorage.clear();
    showToast("Application cache cleared. Reloading...", "success");
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  };

  const navGroups = filteredGroups.filter((g) => g.id !== "overview");

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4 print:hidden">
      <div className="flex items-center gap-1 min-w-0">
        <button
          onClick={onToggleSidebar}
          aria-label="Toggle sidebar"
          className="rounded-md p-2 text-gray-600 hover:bg-gray-100 transition-colors"
        >
          <Menu className="size-5" />
        </button>

        <div className="h-5 w-px bg-gray-200 mx-2" />

        <Link
          href="/"
          className="flex items-center mr-2"
        >
          <span className="text-xl font-bold tracking-tight mr-4">
            <span className="text-primary">e</span>
            <span className="text-gray-900">Shop</span>
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-1">
          <Link
            href="/dashboard"
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap",
              pathname === "/dashboard" || pathname.startsWith("/dashboard/")
                ? "bg-primary/10 text-primary"
                : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
            )}
          >
            <LayoutDashboard className="size-4" />
            <span>Dashboard</span>
          </Link>

          {navGroups.map((group) => (
            <NavDropdown
              key={group.id}
              label={group.label}
              items={group.items}
            />
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <div className="hidden md:flex items-center gap-1">
          <LanguageSwitcher />

          <button
            onClick={handlePrint}
            title="Print Page"
            className="h-9 w-9 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center transition-colors"
          >
            <Printer className="w-4 h-4" />
          </button>

          <button
            onClick={handleClearCache}
            className="h-9 px-4 rounded-md bg-[#e6f0ff] hover:bg-[#d0e1ff] text-[#377dff] text-sm font-medium flex items-center gap-2 transition-colors"
          >
            <Layers className="w-4 h-4" />
            Clear Cache
          </button>
        </div>

        {canViewNotifications ? (
          <Link href="/notifications" className="relative text-gray-600 hover:text-gray-900 transition-colors hidden md:flex">
            <Bell className="w-5 h-5" />
            {unreadNotificationsCount > 0 ? (
              <span className="absolute -top-1 -end-1 flex min-h-3 min-w-3 items-center justify-center rounded-full bg-[#377dff] px-0.5 text-[8px] font-bold text-white border border-white">
                {unreadNotificationsCount > 9 ? "9+" : unreadNotificationsCount}
              </span>
            ) : null}
          </Link>
        ) : null}

        <div className="h-5 w-px bg-gray-200 mx-1 hidden md:block" />

        <UserMenu
          name={userName}
          email={userEmail}
          role={membershipRole}
          permissionOverrides={membershipPermissionOverrides}
        />
      </div>
    </header>
  );
}
