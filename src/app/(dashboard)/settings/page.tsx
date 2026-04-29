import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentMembership } from "@/lib/utils/membership";
import { Tenant } from "@/models";
import { updateTenantSettings } from "@/lib/actions/team";
import { PageHeader } from "@/components/app/PageHeader";
import { canAccessPermission } from "@/lib/utils/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/app/FormField";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, ShieldCheck, Mail, Bell, Image as ImageIcon } from "lucide-react";

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
    <div className="max-w-4xl space-y-8">
      <PageHeader
        title="General Settings"
        section="Administration"
        breadcrumbs={[{ label: "Settings" }]}
        description="Configure your business profile, branding, and regulatory compliance settings."
      />

      {error ? (
        <div className="rounded-md border border-danger/20 bg-soft-danger px-4 py-3 text-sm text-danger font-bold uppercase tracking-tight">
          {feedbackPrefix}{error}
        </div>
      ) : null}
      {success ? (
        <div className="rounded-md border border-success/20 bg-soft-success px-4 py-3 text-sm text-success font-bold uppercase tracking-tight">
          {feedbackPrefix}{success}
        </div>
      ) : null}

      <div className="grid gap-6">
        {(canViewMediaLibrary || canViewEmailTemplates || canViewNotificationTemplates) && (
          <div className="grid gap-4 md:grid-cols-3">
            {canViewMediaLibrary && (
              <Link href="/settings/media-library">
                <Card className="hover:border-primary/40 transition-colors h-full">
                  <CardContent className="pt-6">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-soft-primary text-primary mb-3">
                       <ImageIcon className="size-5" />
                    </div>
                    <p className="font-black text-gray-900 uppercase text-[11px] tracking-widest">Media Library</p>
                    <p className="mt-1 text-xs text-gray-500 font-medium">Manage shared business assets.</p>
                  </CardContent>
                </Card>
              </Link>
            )}
            {canViewEmailTemplates && (
              <Link href="/settings/email-templates">
                <Card className="hover:border-primary/40 transition-colors h-full">
                  <CardContent className="pt-6">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-soft-info text-info mb-3">
                       <Mail className="size-5" />
                    </div>
                    <p className="font-black text-gray-900 uppercase text-[11px] tracking-widest">Email Templates</p>
                    <p className="mt-1 text-xs text-gray-500 font-medium">Customize automated emails.</p>
                  </CardContent>
                </Card>
              </Link>
            )}
            {canViewNotificationTemplates && (
              <Link href="/settings/notification-templates">
                <Card className="hover:border-primary/40 transition-colors h-full">
                  <CardContent className="pt-6">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-soft-warning text-warning mb-3">
                       <Bell className="size-5" />
                    </div>
                    <p className="font-black text-gray-900 uppercase text-[11px] tracking-widest">Notifications</p>
                    <p className="mt-1 text-xs text-gray-500 font-medium">Manage in-app alert copy.</p>
                  </CardContent>
                </Card>
              </Link>
            )}
          </div>
        )}

        <Card>
          <CardHeader className="flex flex-row items-center gap-2 py-4 border-b border-gray-50">
             <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-soft-primary text-primary">
                <Building2 className="size-4" />
             </div>
             <CardTitle className="text-sm font-bold uppercase tracking-tight">Business Information</CardTitle>
          </CardHeader>
          <CardContent className="pt-8">
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
              className="space-y-8"
            >
              <input type="hidden" name="settingsForm" value="business" />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <FormField label="Business Name (EN)" htmlFor="name" required>
                  <Input name="name" id="name" defaultValue={tenant.name} placeholder="Business Legal Name" required />
                </FormField>
                <FormField label="Business Name (AR)" htmlFor="nameAr" required className="text-right">
                  <Input name="nameAr" id="nameAr" defaultValue={tenant.nameAr || ""} dir="rtl" placeholder="اسم الشركة القانوني" required />
                </FormField>
                <FormField label="CR Number" htmlFor="crNumber">
                  <Input name="crNumber" id="crNumber" defaultValue={tenant.crNumber || ""} placeholder="Commercial Registration" />
                </FormField>
                <FormField label="VAT Registration Number" htmlFor="vatNumber">
                  <Input name="vatNumber" id="vatNumber" defaultValue={tenant.vatNumber || ""} placeholder="300000000000013" />
                </FormField>
                <FormField label="Phone Number" htmlFor="phone">
                  <Input name="phone" id="phone" defaultValue={tenant.phone || ""} type="tel" placeholder="+966 5x xxx xxxx" />
                </FormField>
                <FormField label="Public Email" htmlFor="email">
                  <Input name="email" id="email" defaultValue={tenant.email || ""} type="email" placeholder="contact@business.com" />
                </FormField>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <FormField label="Address (English)" htmlFor="address">
                    <Input name="address" id="address" defaultValue={tenant.address || ""} placeholder="Street, District, City" />
                 </FormField>
                 <FormField label="Address (Arabic)" htmlFor="addressAr" className="text-right">
                    <Input name="addressAr" id="addressAr" defaultValue={tenant.addressAr || ""} dir="rtl" placeholder="الشارع، الحي، المدينة" />
                 </FormField>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 border-t border-gray-50">
                <FormField label="Brand Primary Color" htmlFor="primaryColor">
                   <div className="flex items-center gap-4">
                      <input name="primaryColor" type="color" defaultValue={tenant.primaryColor || "#377dff"} className="h-11 w-20 cursor-pointer rounded-md border border-gray-300 bg-white p-1 shadow-sm hover:border-gray-400 transition-all" />
                      <p className="text-[11px] font-bold text-gray-400 uppercase tracking-tight">Main application theme color</p>
                   </div>
                </FormField>
                <FormField label="Logo URL" htmlFor="logoUrl">
                  <Input name="logoUrl" id="logoUrl" defaultValue={tenant.logoUrl || ""} placeholder="https://your-domain.com/logo.png" type="url" />
                </FormField>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-4 border-t border-gray-50">
                <FormField label="Base Currency" htmlFor="baseCurrency">
                  <Select name="baseCurrency" defaultValue={tenant.baseCurrency}>
                    <SelectTrigger id="baseCurrency">
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SAR">SAR - Saudi Riyal</SelectItem>
                      <SelectItem value="USD">USD - US Dollar</SelectItem>
                      <SelectItem value="EUR">EUR - Euro</SelectItem>
                      <SelectItem value="AED">AED - UAE Dirham</SelectItem>
                    </SelectContent>
                  </Select>
                </FormField>
                <FormField label="Timezone" htmlFor="timezone">
                  <Select name="timezone" defaultValue={tenant.timezone}>
                    <SelectTrigger id="timezone">
                      <SelectValue placeholder="Select timezone" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Asia/Riyadh">Asia/Riyadh</SelectItem>
                      <SelectItem value="Asia/Dubai">Asia/Dubai</SelectItem>
                      <SelectItem value="UTC">UTC</SelectItem>
                    </SelectContent>
                  </Select>
                </FormField>
                <FormField label="Default Language" htmlFor="defaultLanguage">
                   <Select name="defaultLanguage" defaultValue={tenant.defaultLanguage}>
                    <SelectTrigger id="defaultLanguage">
                      <SelectValue placeholder="Select language" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="ar">العربية</SelectItem>
                    </SelectContent>
                  </Select>
                </FormField>
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl border border-gray-100 bg-gray-50/50">
                 <div className="flex items-center gap-3">
                    <input
                      name="vatRegistered"
                      id="vatRegistered"
                      type="checkbox"
                      defaultChecked={tenant.vatRegistered}
                      className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <label htmlFor="vatRegistered" className="text-[11px] font-black uppercase tracking-widest text-gray-700 cursor-pointer">Business is VAT Registered (15%)</label>
                 </div>
                 <div className="flex items-center gap-4 text-xs font-bold text-gray-400 uppercase tracking-widest">
                    <span>Plan: <span className="text-primary">{tenant.plan}</span></span>
                    <div className="h-3 w-px bg-gray-200" />
                    <span>Expires: {tenant.planExpiresAt ? new Date(tenant.planExpiresAt).toLocaleDateString() : "Never"}</span>
                 </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-gray-50">
                <Button type="submit" className="font-black uppercase tracking-widest text-[11px] px-12 h-11 shadow-md">
                   Update Business Profile
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center gap-2 py-4 border-b border-gray-50">
             <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-soft-info text-info">
                <ShieldCheck className="size-4" />
             </div>
             <CardTitle className="text-sm font-bold uppercase tracking-tight">ZATCA / Regulatory Compliance</CardTitle>
          </CardHeader>
          <CardContent className="pt-8">
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
              className="space-y-8"
            >
              <input type="hidden" name="settingsForm" value="zatca" />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <FormField label="Compliance Phase" htmlFor="zatcaPhase">
                  <Select name="zatcaPhase" defaultValue={String(tenant.zatcaPhase)}>
                    <SelectTrigger id="zatcaPhase">
                      <SelectValue placeholder="Select phase" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Phase 1 (Basic Generation)</SelectItem>
                      <SelectItem value="2">Phase 2 (ZATCA Integration)</SelectItem>
                    </SelectContent>
                  </Select>
                </FormField>
                <FormField label="Solution ID" htmlFor="zatcaSolutionId">
                  <Input name="zatcaSolutionId" id="zatcaSolutionId" defaultValue={tenant.zatcaSolutionId || ""} placeholder="SAT-XXXX-XXXX" />
                </FormField>
              </div>

              <FormField label="ZATCA Certificate Identifier" htmlFor="zatcaCertificateId">
                <Input name="zatcaCertificateId" id="zatcaCertificateId" defaultValue={tenant.zatcaCertificateId || ""} placeholder="Identifier from ZATCA certificate" />
              </FormField>

              <FormField label="Client ID (CSID)" htmlFor="zatcaCsid">
                <Input name="zatcaCsid" id="zatcaCsid" defaultValue={tenant.zatcaCsid || ""} placeholder="Provided by ZATCA Portal" />
              </FormField>

              <div className="p-4 rounded-xl bg-soft-info text-info border border-info/10">
                <p className="text-[11px] font-bold uppercase tracking-wide leading-relaxed">
                  ZATCA Phase 2 requires active CSID credentials. Please ensure your business is onboarded on the ZATCA Fatoora portal before enabling full integration.
                </p>
              </div>

              <div className="flex justify-end pt-4 border-t border-gray-50">
                <Button type="submit" className="font-black uppercase tracking-widest text-[11px] px-12 h-11 shadow-md">
                   Update Compliance Settings
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
