import { SidebarToggle } from "./SidebarToggle";
import { UserMenu } from "./UserMenu";
import { Globe, Printer, Layers, Bell } from "lucide-react";
import type { SidebarMembershipRole } from "./navigation-config";

interface TopBarProps {
  userName?: string | null;
  userEmail?: string | null;
  membershipRole?: SidebarMembershipRole | null;
}

export function TopBar({ userName, userEmail, membershipRole = null }: TopBarProps) {
  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-6">
      <div className="flex items-center gap-3">
        <SidebarToggle membershipRole={membershipRole} />
        
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
        <button className="relative text-gray-600 hover:text-gray-900 transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute -top-1 -right-1 flex h-3 w-3 items-center justify-center rounded-full bg-[#377dff] text-[8px] font-bold text-white border border-white">
            3
          </span>
        </button>
        
        <div className="h-5 w-px bg-gray-200 mx-1" />

        <UserMenu name={userName} email={userEmail} />
      </div>
    </header>
  );
}
