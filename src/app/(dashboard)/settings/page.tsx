
import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentMembership } from "@/lib/utils/membership";
import { Tenant } from "@/models";
import { updateTenantSettings } from "@/lib/actions/team";
import { PageHeader } from "@/components/app/PageHeader";
import { canAccessPermission } from "@/lib/utils/permissions";

interface SettingsPageProps {
  searchParams: Promise<{ error?: string; success?: string; form?: string }>;
}

const formLabelByKey: Record<string, string> = {
  business: "Business information",
  zatca: "ZATCA settings",
};

function getErrorMessage(error: string, fieldErrors?: Record<string, string[]>) {
  const firstFieldError = Object.values(fieldErrors ?? {}).find((messages) => messages?.length)?.[0];
  return firstFieldError ?? error;
}

export default async function SettingsPage({ searchParams }: SettingsPageProps) {
  const membership = await getCurrentMembership();
  if (!membership) {
    return <div>No active membership</div>;
  }

  if (!canAccessPermission("settings:view", membership.role, membership.permissionOverrides)) {
    redirect("/");
  }

  const canViewMediaLibrary = canAccessPermission(
    "settings.media:view",
    membership.role,
    membership.permissionOverrides
  );
  const canViewEmailTemplates = canAccessPermission(
    "settings.templates.email:view",
    membership.role,
    membership.permissionOverrides
  );
  const canViewNotificationTemplates = canAccessPermission(
    "settings.templates.notification:view",
    membership.role,
    membership.permissionOverrides
  );

  const tenant = await Tenant.findById(membership.tenantId);
  if (!tenant) {
    return <div>Tenant not found</div>;
  }

  const { error, success, form } = await searchParams;
  const feedbackPrefix = form ? `${formLabelByKey[form] ?? "Settings"}: ` : "";

  return (
    <div className="max-w-2xl">
      <PageHeader
        title="Settings"
        section="Administration"
        breadcrumbs={[{ label: "Settings" }]}
        description="Manage business profile and compliance settings."
      />

      {error ? (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {feedbackPrefix}
          {error}
        </div>
      ) : null}
      {success ? (
        <div className="mb-4 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
          {feedbackPrefix}
          {success}
        </div>
      ) : null}

      <div className="space-y-6">
        {(canViewMediaLibrary || canViewEmailTemplates || canViewNotificationTemplates) && (
          <section className="grid gap-3 md:grid-cols-3">
            {canViewMediaLibrary && (
              <Link
                href="/settings/media-library"
                className="rounded-lg border bg-card p-4 text-sm transition-colors hover:bg-accent"
              >
                <p className="font-medium">Media Library</p>
                <p className="mt-1 text-muted-foreground">
                  Upload and manage reusable media assets.
                </p>
              </Link>
            )}
            {canViewEmailTemplates && (
              <Link
                href="/settings/email-templates"
                className="rounded-lg border bg-card p-4 text-sm transition-colors hover:bg-accent"
              >
                <p className="font-medium">Email Templates</p>
                <p className="mt-1 text-muted-foreground">
                  Maintain tenant email template content.
                </p>
              </Link>
            )}
            {canViewNotificationTemplates && (
              <Link
                href="/settings/notification-templates"
                className="rounded-lg border bg-card p-4 text-sm transition-colors hover:bg-accent"
              >
                <p className="font-medium">Notification Templates</p>
                <p className="mt-1 text-muted-foreground">
                  Manage in-app, SMS, and push notification copy.
                </p>
              </Link>
            )}
          </section>
        )}

        <form
          action={async (formData) => {
            "use server";
            const result = await updateTenantSettings(formData);
            const params = new URLSearchParams({ form: result.form });
            if (!result.success) {
              params.set("error", getErrorMessage(result.error, result.fieldErrors));
              redirect(`/settings?${params.toString()}`);
            }
            params.set("success", result.message);
            redirect(`/settings?${params.toString()}`);
          }}
          className="bg-card border rounded-lg p-6 space-y-4"
        >
          <h2 className="text-lg font-semibold">Business Information</h2>
          <input type="hidden" name="settingsForm" value="business" />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Business Name (English)</label>
              <input name="name" defaultValue={tenant.name} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Business Name (Arabic)</label>
              <input name="nameAr" defaultValue={tenant.nameAr || ""} dir="rtl" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">CR Number</label>
              <input name="crNumber" defaultValue={tenant.crNumber || ""} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">VAT Number</label>
              <input name="vatNumber" defaultValue={tenant.vatNumber || ""} placeholder="300000000000013" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Phone</label>
              <input name="phone" defaultValue={tenant.phone || ""} type="tel" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <input name="email" defaultValue={tenant.email || ""} type="email" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Address (English)</label>
            <input name="address" defaultValue={tenant.address || ""} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Address (Arabic)</label>
            <input name="addressAr" defaultValue={tenant.addressAr || ""} dir="rtl" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Logo URL</label>
            <input name="logoUrl" defaultValue={tenant.logoUrl || ""} placeholder="https://..." type="url" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Brand Primary Color</label>
            <div className="flex items-center gap-3">
              <input name="primaryColor" type="color" defaultValue={tenant.primaryColor || "#377dff"} className="h-10 w-14 cursor-pointer rounded-md border border-input bg-background p-1" />
              <p className="text-xs text-muted-foreground">Select a brand color to customize the application theme.</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Base Currency</label>
              <select name="baseCurrency" defaultValue={tenant.baseCurrency} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="SAR">SAR - Saudi Riyal</option>
                <option value="USD">USD - US Dollar</option>
                <option value="EUR">EUR - Euro</option>
                <option value="GBP">GBP - British Pound</option>
                <option value="AED">AED - UAE Dirham</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Timezone</label>
              <select name="timezone" defaultValue={tenant.timezone} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="Asia/Riyadh">Asia/Riyadh</option>
                <option value="Asia/Dubai">Asia/Dubai</option>
                <option value="UTC">UTC</option>
                <option value="Europe/London">Europe/London</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Default Language</label>
              <select name="defaultLanguage" defaultValue={tenant.defaultLanguage} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="en">English</option>
                <option value="ar">العربية</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">VAT Registered</label>
              <div className="flex items-center h-10">
                <input
                  name="vatRegistered"
                  type="checkbox"
                  defaultChecked={tenant.vatRegistered}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <label className="ml-2 text-sm">VAT-registered business (15% VAT)</label>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 rounded-md border bg-muted/30 p-3 text-sm">
            <div>
              <p className="font-medium">Current Plan</p>
              <p className="text-muted-foreground capitalize">{tenant.plan}</p>
            </div>
            <div>
              <p className="font-medium">Plan Expires</p>
              <p className="text-muted-foreground">
                {tenant.planExpiresAt ? new Date(tenant.planExpiresAt).toLocaleDateString() : "No expiration"}
              </p>
            </div>
          </div>

          <button type="submit" className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground h-10 px-4 text-sm font-medium">Save Business Info</button>
        </form>

        <form
          action={async (formData) => {
            "use server";
            const result = await updateTenantSettings(formData);
            const params = new URLSearchParams({ form: result.form });
            if (!result.success) {
              params.set("error", getErrorMessage(result.error, result.fieldErrors));
              redirect(`/settings?${params.toString()}`);
            }
            params.set("success", result.message);
            redirect(`/settings?${params.toString()}`);
          }}
          className="bg-card border rounded-lg p-6 space-y-4"
        >
          <h2 className="text-lg font-semibold">ZATCA / E-Invoicing</h2>
          <input type="hidden" name="settingsForm" value="zatca" />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">ZATCA Phase</label>
              <select name="zatcaPhase" defaultValue={String(tenant.zatcaPhase)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="1">Phase 1 (Basic)</option>
                <option value="2">Phase 2 (Full)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Solution ID</label>
              <input name="zatcaSolutionId" defaultValue={tenant.zatcaSolutionId || ""} placeholder="SAT-XXXX" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Certificate ID</label>
            <input name="zatcaCertificateId" defaultValue={tenant.zatcaCertificateId || ""} placeholder="Certificate identifier from ZATCA" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">CSID (Client ID)</label>
            <input name="zatcaCsid" defaultValue={tenant.zatcaCsid || ""} placeholder="Generated by ZATCA portal" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
          </div>

          <p className="text-sm text-muted-foreground">
            ZATCA Phase 2 requires CSID credentials from the ZATCA portal. Contact ZATCA support for onboarding.
          </p>

          <button type="submit" className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground h-10 px-4 text-sm font-medium">Save ZATCA Settings</button>
        </form>
      </div>
    </div>
  );
}
