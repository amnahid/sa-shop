import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/app/PageHeader";
import { Button } from "@/components/ui/button";
import { updateEmailTemplate } from "@/lib/actions/templates-modules";
import { getCurrentMembership } from "@/lib/utils/membership";
import { canAccessPermission } from "@/lib/utils/permissions";
import { EmailTemplate } from "@/models";
import mongoose from "mongoose";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EmailTemplateDetailPage({ params }: Props) {
  const { id } = await params;
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

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return <div>Template not found</div>;
  }

  const template = await EmailTemplate.findOne({
    _id: new mongoose.Types.ObjectId(id),
    tenantId: membership.tenantId,
  });

  if (!template) {
    return <div>Template not found</div>;
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader
        title={template.name}
        section="Administration"
        breadcrumbs={[
          { label: "Settings", href: "/settings" },
          { label: "Email Templates", href: "/settings/email-templates" },
          { label: "Edit" },
        ]}
        description={`Template key: ${template.key}`}
        actions={
          <Button asChild variant="outline">
            <Link href="/settings/email-templates">Back to list</Link>
          </Button>
        }
      />

      <form
        action={async (formData) => {
          "use server";
          await updateEmailTemplate(id, formData);
        }}
        className="rounded-lg border bg-card p-5 space-y-4"
      >
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1">
            <label className="text-sm font-medium">Name</label>
            <input
              name="name"
              defaultValue={template.name}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Subject</label>
            <input
              name="subject"
              required
              defaultValue={template.subject}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium">HTML body</label>
          <textarea
            name="htmlBody"
            required
            rows={12}
            defaultValue={template.htmlBody}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium">Text body</label>
          <textarea
            name="textBody"
            rows={6}
            defaultValue={template.textBody || ""}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input name="isActive" type="checkbox" defaultChecked={template.isActive} className="h-4 w-4" />
          Active template
        </label>

        <Button type="submit">Save Template</Button>
      </form>
    </div>
  );
}
