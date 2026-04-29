import { redirect } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/app/PageHeader";
import { FormFeedback } from "@/components/app/FormFeedback";
import { listTenantInvitations, resendInvite, revokeInvite, sendInvite } from "@/lib/actions/invite";
import { updateMemberRole, updateMemberScopedPermissions } from "@/lib/actions/team";
import { getCurrentMembership } from "@/lib/utils/membership";
import {
  ADMIN_SCOPED_PERMISSION_KEYS,
  canAccessPermission,
  type AppPermissionKey,
} from "@/lib/utils/permissions";
import { Membership } from "@/models";

const PERMISSION_LABELS: Record<AppPermissionKey, string> = {
  "dashboard:view": "Dashboard",
  "pos:view": "POS",
  "pos.invoices:view": "POS Invoices",
  "sales.proposals:view": "Sales Proposals",
  "sales.retainers:view": "Sales Retainers",
  "customers:view": "Customers",
  "inventory.products:view": "Inventory Products",
  "inventory.stock:view": "Inventory Stock",
  "inventory.stock.adjust": "Stock Adjustments",
  "inventory.stock.transfer": "Stock Transfers",
  "inventory.categories:view": "Inventory Categories",
  "inventory.suppliers:view": "Suppliers",
  "inventory.purchaseOrders:view": "Purchase Orders",
  "inventory.branches:view": "Branch Inventory",
  "reports:view": "Reports",
  "reports.sales:view": "Sales Reports",
  "reports.profit:view": "Profit Reports",
  "reports.lowStock:view": "Low Stock Reports",
  "reports.stockMovements:view": "Stock Movement Reports",
  "notifications:view": "Notifications",
  "settings:view": "Settings",
  "settings.profile:view": "Profile Settings",
  "settings.team:view": "Team Settings",
  "settings.branches:view": "Branch Settings",
  "settings.admin:view": "Admin Settings",
  "settings.admin.manage": "Manage Admin Access",
  "settings.media:view": "Media Library",
  "settings.templates.email:view": "Email Templates",
  "settings.templates.notification:view": "Notification Templates",
  "accounting:view": "Accounting",
  "hr:view": "HR",
  "promotions:view": "Promotions",
  "integrations:view": "Integrations",
  "ai:view": "AI Insights",
};

type MembershipWithUser = {
  _id: { toString(): string };
  userId: { _id: { toString(): string }; name?: string; email?: string };
  role: "owner" | "manager" | "cashier";
  status: "invited" | "active" | "suspended";
  permissionOverrides?: Map<string, boolean> | Record<string, boolean>;
};

interface SettingsAdminPageProps {
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

export default async function SettingsAdminPage({ searchParams }: SettingsAdminPageProps) {
  const currentMembership = await getCurrentMembership();
  if (!currentMembership) {
    return <div>No active membership</div>;
  }

  const canViewAdmin = canAccessPermission(
    "settings.admin:view",
    currentMembership.role,
    currentMembership.permissionOverrides
  );
  if (!canViewAdmin) {
    redirect("/settings");
  }

  const canManageAdmin = canAccessPermission(
    "settings.admin.manage",
    currentMembership.role,
    currentMembership.permissionOverrides
  );

  const members = (await Membership.find({ tenantId: currentMembership.tenantId })
    .populate("userId")
    .sort({ role: 1, createdAt: 1 })) as unknown as MembershipWithUser[];
  const invitationsResult = await listTenantInvitations();
  const invitations =
    "invitations" in invitationsResult ? (invitationsResult.invitations ?? []) : [];
  const { error, success } = await searchParams;

  return (
    <div>
      <PageHeader
        title="Admin Access"
        section="Administration"
        breadcrumbs={[
          { label: "Settings", href: "/settings" },
          { label: "Admin" },
        ]}
        description="Assign roles and apply scoped permission overrides for tenant members."
      />
      <FormFeedback status="error" message={error} />
      <FormFeedback status="success" message={success} />

      <div className="space-y-6">
        {members.map((member) => {
          const memberId = member._id.toString();
          const user = member.userId;
          const userId = user._id.toString();
          const isOwner = member.role === "owner";
          const isCurrentUser = userId === currentMembership.userId.toString();
          const canEditMember = canManageAdmin && !isOwner && !isCurrentUser;

          return (
            <section key={memberId} className="rounded-lg border bg-card p-5 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-base font-semibold">
                    {user.name || "Unnamed user"}
                    {isCurrentUser && (
                      <span className="ml-2 text-xs text-muted-foreground">(you)</span>
                    )}
                  </h2>
                  <p className="text-sm text-muted-foreground">{user.email || "No email"}</p>
                </div>
                <div className="text-right text-xs text-muted-foreground space-y-1">
                  <p>
                    Role: <span className="font-medium capitalize text-foreground">{member.role}</span>
                  </p>
                  <p>
                    Status:{" "}
                    <span className="font-medium capitalize text-foreground">{member.status}</span>
                  </p>
                </div>
              </div>

              {canEditMember ? (
                <form
                  action={async (formData) => {
                    "use server";
                    const nextRole = formData.get("role");
                    if (nextRole !== "manager" && nextRole !== "cashier") {
                      return;
                    }
                    await updateMemberRole(memberId, nextRole);
                  }}
                  className="flex items-end gap-3"
                >
                  <div>
                    <label className="text-sm font-medium">Role</label>
                    <select
                      name="role"
                      defaultValue={member.role}
                      className="mt-1 flex h-11 rounded-md border border-input bg-white bg-background px-3 text-sm"
                    >
                      <option value="manager">Manager</option>
                      <option value="cashier">Cashier</option>
                    </select>
                  </div>
                  <button
                    type="submit"
                    className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
                  >
                    Save Role
                  </button>
                </form>
              ) : (
                <p className="text-xs text-muted-foreground">
                  {isOwner
                    ? "Owner role is fixed."
                    : isCurrentUser
                      ? "You cannot change your own role or permissions."
                      : "You have read-only access."}
                </p>
              )}

              <form
                action={async (formData) => {
                  "use server";
                  if (!canEditMember) {
                    return;
                  }
                  const enabledPermissions = formData
                    .getAll("enabledPermissions")
                    .filter((value): value is string => typeof value === "string");
                  await updateMemberScopedPermissions(memberId, enabledPermissions);
                }}
                className="space-y-3"
              >
                <h3 className="text-sm font-medium">Scoped Permissions (MVP)</h3>
                <div className="grid gap-2 sm:grid-cols-2">
                  {ADMIN_SCOPED_PERMISSION_KEYS.map((permissionKey) => {
                    const enabled = canAccessPermission(
                      permissionKey,
                      member.role,
                      member.permissionOverrides
                    );

                    return (
                      <label
                        key={permissionKey}
                        className="flex items-center justify-between rounded border px-3 py-2 text-sm"
                      >
                        <span>{PERMISSION_LABELS[permissionKey]}</span>
                        <input
                          type="checkbox"
                          name="enabledPermissions"
                          value={permissionKey}
                          defaultChecked={enabled}
                          disabled={!canEditMember}
                          className="h-4 w-4"
                        />
                      </label>
                    );
                  })}
                </div>
                {canEditMember && (
                  <button
                    type="submit"
                    className="inline-flex h-9 items-center justify-center rounded-md border px-4 text-sm font-medium"
                  >
                    Save Permissions
                  </button>
                )}
              </form>
            </section>
          );
        })}
      </div>

      <section className="mt-8 rounded-lg border bg-card p-5">
        <h2 className="text-sm font-medium mb-3">Invite Team Member</h2>
        <form
          action={async (formData) => {
            "use server";
            const result = await sendInvite(formData);
            redirectWithFeedback("/settings/admin", result);
          }}
          className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px_auto]"
        >
          <input type="hidden" name="tenantId" value={currentMembership.tenantId.toString()} />
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
      </section>

      <section className="mt-6 bg-card border rounded-lg overflow-hidden">
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
                                redirectWithFeedback("/settings/admin", result);
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
                                redirectWithFeedback("/settings/admin", result);
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
      </section>

      <div className="mt-4">
        <Link href="/settings/team" className="text-sm text-primary hover:underline">
          Open Team page for member roster →
        </Link>
      </div>
    </div>
  );
}
