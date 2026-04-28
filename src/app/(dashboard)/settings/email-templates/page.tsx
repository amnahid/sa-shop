import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/app/PageHeader";
import { Button } from "@/components/ui/button";
import { createEmailTemplate } from "@/lib/actions/templates-modules";
import { getCurrentMembership } from "@/lib/utils/membership";
import { canAccessPermission } from "@/lib/utils/permissions";
import { EmailTemplate } from "@/models";

export default async function EmailTemplatesPage() {
  const membership = await getCurrentMembership();
  if (!membership) {
    return <div>No active membership</div>;
  }

  if (
    !canAccessPermission(
      "settings.templates.email:view",
      membership.role,
      membership.permissionOverrides
    )
  ) {
    redirect("/settings");
  }

  const templates = await EmailTemplate.find({ tenantId: membership.tenantId }).sort({
    updatedAt: -1,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Email Templates"
        section="Administration"
        breadcrumbs={[
          { label: "Settings", href: "/settings" },
          { label: "Email Templates" },
        ]}
        description="Manage reusable tenant-scoped email templates for operational messages."
      />

      <section className="rounded-lg border bg-card p-5 space-y-4">
        <h2 className="text-base font-semibold">Create Template</h2>
        <form
          action={async (formData) => {
            "use server";
            await createEmailTemplate(formData);
          }}
          className="grid gap-3 md:grid-cols-2"
        >
          <div className="space-y-1">
            <label className="text-sm font-medium">Key</label>
            <input
              name="key"
              required
              placeholder="invoice-payment-reminder"
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Name</label>
            <input
              name="name"
              required
              placeholder="Invoice Payment Reminder"
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Subject</label>
            <input
              name="subject"
              required
              placeholder="Your invoice is due soon"
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Text body (optional)</label>
            <input
              name="textBody"
              placeholder="Plain text fallback"
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            />
          </div>
          <div className="space-y-1 md:col-span-2">
            <label className="text-sm font-medium">HTML body</label>
            <textarea
              name="htmlBody"
              required
              rows={6}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              defaultValue="<p>Hello {{customerName}},</p>"
            />
          </div>
          <label className="flex items-center gap-2 text-sm md:col-span-2">
            <input name="isActive" type="checkbox" defaultChecked className="h-4 w-4" />
            Active
          </label>
          <div className="md:col-span-2">
            <Button type="submit">Create Template</Button>
          </div>
        </form>
      </section>

      <section className="rounded-lg border bg-card p-5">
        <h2 className="mb-4 text-base font-semibold">Templates</h2>
        {templates.length === 0 ? (
          <p className="text-sm text-muted-foreground">No email templates created yet.</p>
        ) : (
          <div className="overflow-hidden rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="p-3 text-left font-medium">Name</th>
                  <th className="p-3 text-left font-medium">Key</th>
                  <th className="p-3 text-left font-medium">Subject</th>
                  <th className="p-3 text-center font-medium">Status</th>
                  <th className="p-3 text-right font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {templates.map((template) => (
                  <tr key={template._id.toString()} className="border-t">
                    <td className="p-3 font-medium">{template.name}</td>
                    <td className="p-3 text-muted-foreground">{template.key}</td>
                    <td className="p-3">{template.subject}</td>
                    <td className="p-3 text-center">
                      <span
                        className={`rounded px-2 py-1 text-xs ${
                          template.isActive
                            ? "bg-green-100 text-green-800"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {template.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/settings/email-templates/${template._id.toString()}`}>
                          Edit
                        </Link>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
