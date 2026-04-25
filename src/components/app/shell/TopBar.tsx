import { SidebarToggle } from "./SidebarToggle";
import { UserMenu } from "./UserMenu";

interface TopBarProps {
  userName?: string | null;
  userEmail?: string | null;
}

export function TopBar({ userName, userEmail }: TopBarProps) {
  return (
    <header className="flex h-12 items-center justify-between border-b bg-background px-4">
      <div className="flex items-center gap-2">
        <SidebarToggle />
      </div>
      <UserMenu name={userName} email={userEmail} />
    </header>
  );
}
