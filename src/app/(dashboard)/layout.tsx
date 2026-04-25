import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth-utils";
import { AppShell } from "@/components/app/shell/AppShell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  return (
    <AppShell userName={session.user?.name} userEmail={session.user?.email}>
      {children}
    </AppShell>
  );
}
