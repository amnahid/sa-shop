
import { Branch } from "@/models";
import { getCurrentMembership } from "@/lib/utils/membership";

export default async function BranchesPage() {
  const membership = await getCurrentMembership();
  if (!membership) {
    return <div>No active membership</div>;
  }

  const tenantId = membership.tenantId;

  const branches = await Branch.find({ tenantId }).sort({ isHeadOffice: -1, name: 1 });

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground">Branches</h1>
      </div>

      <form action={async (formData) => {
        "use server";
        const membership = await getCurrentMembership();
        if (!membership) return;

        const name = formData.get("name") as string;
        if (!name) return;

        await Branch.create({
          tenantId: membership.tenantId,
          name,
          nameAr: formData.get("nameAr") as string || undefined,
          address: formData.get("address") as string || undefined,
          city: formData.get("city") as string || undefined,
          phone: formData.get("phone") as string || undefined,
          vatBranchCode: formData.get("vatBranchCode") as string || undefined,
          isHeadOffice: false,
          active: true,
        });
      }} className="mb-6 p-4 bg-card border rounded-lg">
        <h2 className="text-sm font-medium mb-3">Add New Branch</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <input name="name" type="text" placeholder="Branch name *" required className="flex h-9 rounded-md border border-input bg-background px-3 py-2 text-sm" />
          <input name="nameAr" type="text" dir="rtl" placeholder="الاسم" className="flex h-9 rounded-md border border-input bg-background px-3 py-2 text-sm" />
          <input name="city" type="text" placeholder="City" className="flex h-9 rounded-md border border-input bg-background px-3 py-2 text-sm" />
          <input name="phone" type="tel" placeholder="Phone" className="flex h-9 rounded-md border border-input bg-background px-3 py-2 text-sm" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
          <input name="vatBranchCode" type="text" placeholder="VAT Branch Code" className="flex h-9 rounded-md border border-input bg-background px-3 py-2 text-sm" />
          <button type="submit" className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground h-9 px-4 text-sm font-medium">Add Branch</button>
        </div>
      </form>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {branches.map(branch => (
          <div key={branch._id.toString()} className="bg-card border rounded-lg p-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-medium">
                  {branch.name}
                  {branch.isHeadOffice && <span className="ml-2 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">Head Office</span>}
                </h3>
                {branch.nameAr && <p className="text-sm text-muted-foreground" dir="rtl">{branch.nameAr}</p>}
              </div>
              <span className={`text-xs px-2 py-1 rounded ${branch.active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}`}>
                {branch.active ? "Active" : "Inactive"}
              </span>
            </div>
            <div className="mt-3 text-sm text-muted-foreground space-y-1">
              {branch.city && <p>📍 {branch.city}</p>}
              {branch.phone && <p>📞 {branch.phone}</p>}
              {branch.vatBranchCode && <p>🏷️ VAT Code: {branch.vatBranchCode}</p>}
            </div>
          </div>
        ))}
      </div>

      {branches.length === 0 && (
        <p className="text-center text-muted-foreground py-8">No branches yet</p>
      )}
    </div>
  );
}
