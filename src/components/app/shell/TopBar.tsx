import Link from "next/link";
import { SidebarToggle } from "./SidebarToggle";
import { UserMenu } from "./UserMenu";
import { Globe, Printer, Layers, Bell } from "lucide-react";
import {
  canAccessSidebarPermission,
  type NavigationPermissionKey,
  type SidebarMembershipRole,
} from "./navigation-config";

interface TopBarProps {
  userName?: string | null;
  userEmail?: string | null;
  membershipRole?: SidebarMembershipRole | null;
  membershipPermissionOverrides?: Partial<Record<NavigationPermissionKey, boolean>>;
  unreadNotificationsCount?: number;
}

export function TopBar({
  userName,
  userEmail,
  membershipRole = null,
  membershipPermissionOverrides,
  unreadNotificationsCount = 0,
}: TopBarProps) {
  const canViewNotifications = canAccessSidebarPermission(
    "notifications:view",
    membershipRole,
    membershipPermissionOverrides
  );

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-6">
      <div className="flex items-center gap-3">
        <SidebarToggle
          membershipRole={membershipRole}
          membershipPermissionOverrides={membershipPermissionOverrides}
        />
        
        <div className="h-5 w-px bg-gray-200 mx-2" />

        <button className="h-9 w-9 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center transition-colors">
          <Globe className="w-4 h-4" />
        </button>

        <button className="h-9 w-9 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center transition-colors">
          <Printer className="w-4 h-4" />
        </button>

        <button className="h-9 px-4 ml-1 rounded-md bg-[#e6f0ff] hover:bg-[#d0e1ff] text-[#377dff] text-sm font-medium flex items-center gap-2 transition-colors">
          <Layers className="w-4 h-4" />
          Clear Cache
        </button>
      </div>

      <div className="flex items-center gap-4">
        {canViewNotifications ? (
          <Link href="/notifications" className="relative text-gray-600 hover:text-gray-900 transition-colors">
            <Bell className="w-5 h-5" />
            {unreadNotificationsCount > 0 ? (
              <span className="absolute -top-1 -right-1 flex min-h-3 min-w-3 items-center justify-center rounded-full bg-[#377dff] px-0.5 text-[8px] font-bold text-white border border-white">
                {unreadNotificationsCount > 9 ? "9+" : unreadNotificationsCount}
              </span>
            ) : null}
          </Link>
        ) : null}
        
        <div className="h-5 w-px bg-gray-200 mx-1" />

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
