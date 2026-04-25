import type { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";

interface AppShellProps {
  children: ReactNode;
  userName?: string | null;
  userEmail?: string | null;
}

export function AppShell({ children, userName, userEmail }: AppShellProps) {
  return (
    <div className="flex min-h-screen">
      <div className="hidden lg:block">
        <Sidebar />
      </div>
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar userName={userName} userEmail={userEmail} />
        <main className="flex-1 overflow-auto p-4 md:pt-4">{children}</main>
      </div>
    </div>
  );
}
