
import { redirect } from "next/navigation";
import { getCurrentMembership } from "@/lib/utils/membership";
import { Tenant } from "@/models";
import { updateTenantSettings } from "@/lib/actions/team";

export default async function SettingsPage() {
  const membership = await getCurrentMembership();
  if (!membership) {
    return <div>No active membership</div>;
  }

  if (membership.role === "cashier") {
    redirect("/");
  }

  const tenant = await Tenant.findById(membership.tenantId);
  if (!tenant) {
    return <div>Tenant not found</div>;
  }

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-foreground mb-6">Settings</h1>

      <div className="space-y-6">
        <form action={async (formData) => {
          "use server";
          const result = await updateTenantSettings(formData);
          if (result.error) {
            console.error(result.error);
          }
        }} className="bg-card border rounded-lg p-6 space-y-4">
          <h2 className="text-lg font-semibold">Business Information</h2>

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
            <input name="logoUrl" defaultValue={tenant.logoUrl || ""} placeholder="https://..." className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
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

          <button type="submit" className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground h-10 px-4 text-sm font-medium">Save Business Info</button>
        </form>

        <form action={async (formData) => {
          "use server";
          const result = await updateTenantSettings(formData);
          if (result.error) {
            console.error(result.error);
          }
        }} className="bg-card border rounded-lg p-6 space-y-4">
          <h2 className="text-lg font-semibold">ZATCA / E-Invoicing</h2>

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
