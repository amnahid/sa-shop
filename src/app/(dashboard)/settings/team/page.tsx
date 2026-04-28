import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/app/PageHeader";
import { FormFeedback } from "@/components/app/FormFeedback";
import { getCurrentMembership } from "@/lib/utils/membership";
import { canAccessPermission } from "@/lib/utils/permissions";
import { Membership } from "@/models";
import { listTenantInvitations, resendInvite, revokeInvite, sendInvite } from "@/lib/actions/invite";

type TeamMember = {
  _id: { toString(): string };
  userId: { _id: string; name?: string; email?: string };
  role: "owner" | "manager" | "cashier";
  status: "invited" | "active" | "suspended";
};

interface TeamPageProps {
  searchParams: Promise<{ error?: string; success?: string }>;
}

const invitationStatusBadge: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  accepted: "bg-green-100 text-green-800",
  expired: "bg-gray-100 text-gray-800",
  revoked: "bg-red-100 text-red-800",
};

function redirectWithFeedback(
  pathname: string,
  result: { error?: string; success?: boolean; message?: string }
) {
  const params = new URLSearchParams();
  if (result.error) {
    params.set("error", result.error);
  } else {
    params.set("success", result.message ?? "Operation completed successfully");
  }
  redirect(`${pathname}?${params.toString()}`);
}

export default async function TeamPage({ searchParams }: TeamPageProps) {
  const membership = await getCurrentMembership();
  if (!membership) {
    return <div>No active membership</div>;
  }

  if (!canAccessPermission("settings.team:view", membership.role, membership.permissionOverrides)) {
    redirect("/");
  }

  const canManageAdmin = canAccessPermission(
    "settings.admin.manage",
    membership.role,
    membership.permissionOverrides
  );

  const members = (await Membership.find({ tenantId: membership.tenantId })
    .populate("userId")
    .sort({ role: 1, createdAt: 1 })) as unknown as TeamMember[];

  const invitationsResult = await listTenantInvitations();
  const invitations =
    "invitations" in invitationsResult ? (invitationsResult.invitations ?? []) : [];

  const { error, success } = await searchParams;

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
        description="Manage members and invitation lifecycle."
      />

      <FormFeedback status="error" message={error} />
      <FormFeedback status="success" message={success} />

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
            {members.map((member) => {
              const user = member.userId;
              const isOwner = member.role === "owner";
              const isCurrentUser = user._id.toString() === membership.userId.toString();
              const canManage = canManageAdmin && !isCurrentUser && !isOwner;

              return (
                <tr key={member._id.toString()} className="border-t">
                  <td className="p-3 font-medium">
                    {user.name}
                    {isCurrentUser && <span className="ml-2 text-xs text-muted-foreground">(you)</span>}
                  </td>
                  <td className="p-3 text-muted-foreground">{user.email}</td>
                  <td className="p-3 text-center">
                    <span className={`text-xs px-2 py-1 rounded ${roleColors[member.role] || ""}`}>
                      {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                    </span>
                  </td>
                  <td className="p-3 text-center">
                    <span className={`text-xs px-2 py-1 rounded ${statusColors[member.status] || ""}`}>
                      {member.status}
                    </span>
                  </td>
                  <td className="p-3 text-center text-xs text-muted-foreground">
                    {canManage ? "Manage from Admin Access page" : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-6 rounded-lg border bg-card p-4">
        <h2 className="text-sm font-medium mb-3">Invite Team Member</h2>
        <form
          action={async (formData) => {
            "use server";
            const result = await sendInvite(formData);
            redirectWithFeedback("/settings/team", result);
          }}
          className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px_auto]"
        >
          <input type="hidden" name="tenantId" value={membership.tenantId.toString()} />
          <input
            name="email"
            type="email"
            required
            placeholder="teammate@example.com"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
          <select name="role" defaultValue="cashier" className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm">
            <option value="cashier">Cashier</option>
            <option value="manager">Manager</option>
            {canManageAdmin && <option value="owner">Owner</option>}
          </select>
          <button
            type="submit"
            className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
          >
            Send Invite
          </button>
        </form>
        <p className="mt-2 text-xs text-muted-foreground">
          Invitee permissions are role-based. Only admin managers can create owner invites.
        </p>
      </div>

      <div className="mt-6 bg-card border rounded-lg overflow-hidden">
        <div className="border-b bg-muted px-4 py-3">
          <h2 className="text-sm font-medium">Invitations</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr>
              <th className="text-left p-3 font-medium">Email</th>
              <th className="text-center p-3 font-medium">Role</th>
              <th className="text-center p-3 font-medium">Status</th>
              <th className="text-center p-3 font-medium">Sent</th>
              <th className="text-center p-3 font-medium">Expires</th>
              <th className="text-center p-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {invitations.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-4 text-center text-muted-foreground">
                  No invitations yet.
                </td>
              </tr>
            ) : (
              invitations.map((invitation) => {
                const isPending = invitation.status === "pending";
                const canManageOwnerInvite = invitation.role !== "owner" || canManageAdmin;

                return (
                  <tr key={invitation.id} className="border-t">
                    <td className="p-3">{invitation.email}</td>
                    <td className="p-3 text-center capitalize">{invitation.role}</td>
                    <td className="p-3 text-center">
                      <span className={`text-xs px-2 py-1 rounded ${invitationStatusBadge[invitation.status] || ""}`}>
                        {invitation.status}
                      </span>
                    </td>
                    <td className="p-3 text-center text-muted-foreground">
                      {invitation.createdAt ? new Date(invitation.createdAt).toLocaleDateString() : "—"}
                    </td>
                    <td className="p-3 text-center text-muted-foreground">
                      {new Date(invitation.expiresAt).toLocaleDateString()}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center justify-center gap-3 text-xs">
                        {isPending && canManageOwnerInvite ? (
                          <>
                            <form
                              action={async (formData) => {
                                "use server";
                                const result = await resendInvite(formData);
                                redirectWithFeedback("/settings/team", result);
                              }}
                            >
                              <input type="hidden" name="invitationId" value={invitation.id} />
                              <button type="submit" className="text-primary hover:underline">
                                Resend
                              </button>
                            </form>
                            <form
                              action={async (formData) => {
                                "use server";
                                const result = await revokeInvite(formData);
                                redirectWithFeedback("/settings/team", result);
                              }}
                            >
                              <input type="hidden" name="invitationId" value={invitation.id} />
                              <button type="submit" className="text-red-600 hover:underline">
                                Revoke
                              </button>
                            </form>
                          </>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4">
        <Link href="/settings/admin" className="text-sm text-primary hover:underline">
          Manage roles and scoped permissions in Admin Access →
        </Link>
      </div>
    </div>
  );
}
