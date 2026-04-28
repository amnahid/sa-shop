import { SidebarToggle } from "./SidebarToggle";
import { UserMenu } from "./UserMenu";
import type { SidebarMembershipRole } from "./navigation-config";

interface TopBarProps {
  userName?: string | null;
  userEmail?: string | null;
  membershipRole?: SidebarMembershipRole | null;
}

export function TopBar({ userName, userEmail, membershipRole = null }: TopBarProps) {
  return (
    <header className="flex h-12 items-center justify-between border-b bg-background px-4">
      <div className="flex items-center gap-2">
        <SidebarToggle membershipRole={membershipRole} />
      </div>
      <UserMenu name={userName} email={userEmail} />
    </header>
  );
}
