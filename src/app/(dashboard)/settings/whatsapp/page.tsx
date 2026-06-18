import { redirect } from "next/navigation";
import { PageHeader } from "@/components/app/PageHeader";
import { getCurrentMembership } from "@/lib/utils/membership";
import { getWhatsAppConfig, saveWhatsAppConfig, testWhatsAppConnection } from "@/lib/actions/settings-whatsapp";

interface Props {
  searchParams: Promise<{
    error?: string;
    success?: string;
  }>;
}

export default async function WhatsAppSettingsPage({ searchParams }: Props) {
  const { error, success } = await searchParams;

  const membership = await getCurrentMembership();
  if (!membership) redirect("/login");

  const result = await getWhatsAppConfig();

  return (
    <>
      <PageHeader
        title="WhatsApp Integration"
        section="Settings"
        breadcrumbs={[{ label: "Settings", href: "/settings" }, { label: "WhatsApp" }]}
        description="Configure Meta WhatsApp Cloud API for sending invoices and proposals to customers."
      />

      {error ? (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}
      {success ? (
        <div className="mb-4 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
          {success}
        </div>
      ) : null}

      <div className="rounded-lg border bg-card p-6">
        <h2 className="mb-4 text-lg font-semibold">API Configuration</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          To send WhatsApp messages, you need a Meta Business Account with WhatsApp Cloud API set up.
          Create a permanent access token in the Meta Business Manager and enter the details below.
        </p>

        <form className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Phone Number ID</label>
            <input
              type="text"
              name="phoneNumberId"
              defaultValue={"config" in result && result.config ? result.config.phoneNumberId : ""}
              className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
              placeholder="e.g. 123456789012345"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Business Account ID (WABA ID)</label>
            <input
              type="text"
              name="businessAccountId"
              defaultValue={"config" in result && result.config ? result.config.businessAccountId : ""}
              className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
              placeholder="e.g. 123456789012345"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Permanent Access Token</label>
            <input
              type="password"
              name="accessToken"
              defaultValue={"config" in result && result.config ? result.config.accessToken : ""}
              className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
              placeholder="EAAT..."
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">From Phone Number</label>
            <input
              type="text"
              name="fromPhoneNumber"
              defaultValue={"config" in result && result.config ? result.config.fromPhoneNumber : ""}
              className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
              placeholder="+9665XXXXXXXX"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              The WhatsApp Business phone number in E.164 format (e.g. +966512345678).
            </p>
          </div>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              name="isActive"
              defaultChecked={"config" in result && result.config ? result.config.isActive : false}
              className="h-4 w-4 rounded border-gray-300"
            />
            <span className="text-sm font-medium">Active</span>
          </label>

          <div className="flex gap-3">
            <button
              type="submit"
              formAction={async (formData) => {
                "use server";
                const result = await saveWhatsAppConfig(formData);
                if (result.error) {
                  redirect(`/settings/whatsapp?error=${encodeURIComponent(result.error)}`);
                }
                redirect("/settings/whatsapp?success=Configuration saved successfully");
              }}
              className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
            >
              Save Configuration
            </button>
          </div>
        </form>
      </div>

      {"config" in result && result.config && result.config.isActive ? (
        <div className="mt-4 rounded-lg border bg-card p-6">
          <h2 className="mb-4 text-lg font-semibold">Test Connection</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Send a test message to verify your WhatsApp integration is working.
          </p>
          <form>
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <label className="mb-1 block text-sm font-medium">Recipient Phone Number</label>
                <input
                  type="text"
                  name="testPhone"
                  className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
                  placeholder="+9665XXXXXXXX"
                />
              </div>
              <button
                type="submit"
                formAction={async (formData) => {
                  "use server";
                  const result = await testWhatsAppConnection(formData);
                  if (result.error) {
                    redirect(`/settings/whatsapp?error=${encodeURIComponent(result.error)}`);
                  }
                  redirect("/settings/whatsapp?success=Test message sent. Check your WhatsApp.");
                }}
                className="inline-flex h-9 items-center justify-center rounded-md border bg-background px-4 text-sm font-medium hover:bg-accent"
              >
                Send Test
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}
