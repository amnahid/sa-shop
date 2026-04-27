
import { redirect } from "next/navigation";
import { Branch } from "@/models";
import { updateBranch, deactivateBranch } from "@/lib/actions/branches";
import { getCurrentMembership } from "@/lib/utils/membership";

export default async function SettingsBranchesPage() {
  const membership = await getCurrentMembership();
  if (!membership) {
    return <div>No active membership</div>;
  }

  if (membership.role === "cashier") {
    redirect("/");
  }

  const branches = await Branch.find({ tenantId: membership.tenantId }).sort({ isHeadOffice: -1, name: 1 });

  return (
    <div className="p-6 max-w-3xl">
      <h1 className="text-2xl font-bold text-foreground mb-6">Branch Management</h1>

      <div className="space-y-6">
        {branches.map(branch => {
          const canDelete = !branch.isHeadOffice && branch.active;

          return (
            <div key={branch._id.toString()} className="bg-card border rounded-lg p-6">
              <form action={async (formData) => {
                "use server";
                await updateBranch(branch._id.toString(), formData);
              }} className="space-y-3">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="font-semibold flex items-center gap-2">
                    {branch.name}
                    {branch.isHeadOffice && <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">Head Office</span>}
                    {!branch.active && <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">Inactive</span>}
                  </h2>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">Name (EN)</label>
                    <input name="name" defaultValue={branch.name} required className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Name (AR)</label>
                    <input name="nameAr" defaultValue={branch.nameAr || ""} dir="rtl" className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">City</label>
                    <input name="city" defaultValue={branch.city || ""} className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Phone</label>
                    <input name="phone" defaultValue={branch.phone || ""} type="tel" className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">Address</label>
                    <input name="address" defaultValue={branch.address || ""} className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">VAT Branch Code</label>
                    <input name="vatBranchCode" defaultValue={branch.vatBranchCode || ""} className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
                  </div>
                </div>

                <div className="flex gap-2 pt-1">
                  <button type="submit" className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground h-9 px-4 text-sm font-medium">Save</button>
                  {canDelete && (
                    <form action={async () => {
                      "use server";
                      await deactivateBranch(branch._id.toString());
                    }}>
                      <button type="submit" className="inline-flex items-center justify-center rounded-md border border-red-300 text-red-600 h-9 px-4 text-sm font-medium">Deactivate</button>
                    </form>
                  )}
                </div>
              </form>
            </div>
          );
        })}
      </div>

      {branches.length === 0 && (
        <div className="text-center text-muted-foreground py-12">No branches found</div>
      )}
    </div>
  );
}
