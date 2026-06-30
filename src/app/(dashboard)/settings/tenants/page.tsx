import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { User } from "@/models";
import { TenantManagementClient } from "./TenantManagementClient";
import connectDB from "@/lib/mongodb";

export default async function TenantsPage() {
  await connectDB();
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  
  const user = await User.findById(session.user.id);
  const systemAdminEmails = (process.env.SYSTEM_ADMIN_EMAILS || "").split(",").map(e => e.trim().toLowerCase());
  const isSuperAdmin = user?.isSuperAdmin || (user?.email && systemAdminEmails.includes(user.email.toLowerCase()));
  
  if (!isSuperAdmin) {
    redirect("/dashboard");
  }
  
  return <TenantManagementClient />;
}
