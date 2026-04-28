
import { redirect } from "next/navigation";
import { getCurrentMembership } from "@/lib/utils/membership";
import { Membership } from "@/models";
import { updateMemberRole, suspendMember, reactivateMember } from "@/lib/actions/team";
import { PageHeader } from "@/components/app/PageHeader";

export default async function TeamPage() {
  const membership = await getCurrentMembership();
  if (!membership) {
    return <div>No active membership</div>;
  }

  if (membership.role === "cashier") {
    redirect("/");
  }

  const members = await Membership.find({ tenantId: membership.tenantId })
    .populate("userId")
    .sort({ role: 1, createdAt: 1 });

  const statusColors: Record<string, string> = {
    active: "bg-green-100 text-green-800",
    invited: "bg-yellow-100 text-yellow-800",
    suspended: "bg-red-100 text-red-800",
  };

  const roleColors: Record<string, string> = {
    owner: "bg-purple-100 text-purple-800",
    manager: "bg-blue-100 text-blue-800",
    cashier: "bg-gray-100 text-gray-800",
  };

  return (
    <div>
      <PageHeader
        title="Team"
        section="Administration"
        breadcrumbs={[
          { label: "Settings", href: "/settings" },
          { label: "Team" },
        ]}
      />

      <div className="bg-card border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="text-left p-3 font-medium">Name</th>
              <th className="text-left p-3 font-medium">Email</th>
              <th className="text-center p-3 font-medium">Role</th>
              <th className="text-center p-3 font-medium">Status</th>
              <th className="text-center p-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {members.map(m => {
              const user = m.userId as unknown as { _id: string; name: string; email: string };
              const isOwner = m.role === "owner";
              const isCurrentUser = user._id === membership.userId.toString();
              const canManage = membership.role === "owner" && !isCurrentUser && !isOwner;

              return (
                <tr key={m._id.toString()} className="border-t">
                  <td className="p-3 font-medium">
                    {user.name}
                    {isCurrentUser && <span className="ml-2 text-xs text-muted-foreground">(you)</span>}
                  </td>
                  <td className="p-3 text-muted-foreground">{user.email}</td>
                  <td className="p-3 text-center">
                    <span className={`text-xs px-2 py-1 rounded ${roleColors[m.role] || ""}`}>
                      {m.role.charAt(0).toUpperCase() + m.role.slice(1)}
                    </span>
                    {canManage && (
                      <form action={async () => {
                        "use server";
                        await updateMemberRole(m._id.toString(), m.role === "cashier" ? "manager" : "cashier");
                      }} className="inline ml-2">
                        <button type="submit" className="text-xs text-primary hover:underline">
                          {m.role === "cashier" ? "Make Manager" : "Make Cashier"}
                        </button>
                      </form>
                    )}
                  </td>
                  <td className="p-3 text-center">
                    <span className={`text-xs px-2 py-1 rounded ${statusColors[m.status] || ""}`}>
                      {m.status}
                    </span>
                  </td>
                  <td className="p-3 text-center">
                    {canManage && (
                      <div className="flex justify-center gap-2">
                        {m.status === "suspended" ? (
                          <form action={async () => {
                            "use server";
                            await reactivateMember(m._id.toString());
                          }}>
                            <button type="submit" className="text-xs text-green-600 hover:text-green-800">Reactivate</button>
                          </form>
                        ) : (
                          <form action={async () => {
                            "use server";
                            await suspendMember(m._id.toString());
                          }}>
                            <button type="submit" className="text-xs text-red-500 hover:text-red-700">Suspend</button>
                          </form>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-6 bg-card border rounded-lg p-4">
        <h2 className="text-sm font-medium mb-2">Invite Team Member</h2>
        <p className="text-sm text-muted-foreground">
          Share the invite link from onboarding or send invitations from the team page.
        </p>
        <a href="/onboarding/team" className="text-sm text-primary hover:underline mt-1 inline-block">
          Go to Invite page →
        </a>
      </div>
    </div>
  );
}
