import { Branch } from "@/models";
import { getCurrentMembership } from "@/lib/utils/membership";
import { PageHeader } from "@/components/app/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/app/FormField";
import { Plus, Building2, MapPin, Phone, Hash } from "lucide-react";
import { cn } from "@/lib/utils";

export default async function BranchesPage() {
  const membership = await getCurrentMembership();
  if (!membership) {
    return <div>No active membership</div>;
  }

  const tenantId = membership.tenantId;

  const branches = await Branch.find({ tenantId }).sort({ isHeadOffice: -1, name: 1 });

  return (
    <>
      <PageHeader
        title="Branches"
        section="Inventory"
        breadcrumbs={[{ label: "Branches" }]}
        description={`Manage your ${branches.length} business locations and branch-specific VAT configurations.`}
      />

      <Card className="mb-8">
        <CardHeader className="flex flex-row items-center gap-2 py-3 border-b border-gray-50">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-soft-primary text-primary">
            <Plus className="size-4" />
          </div>
          <CardTitle className="text-sm font-bold uppercase tracking-tight">Add New Branch</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
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
          }} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
              <FormField label="Branch Name" htmlFor="name" required>
                <Input id="name" name="name" type="text" placeholder="Main Store" required />
              </FormField>
              <FormField label="الاسم (Arabic)" htmlFor="nameAr" className="text-right">
                <Input id="nameAr" name="nameAr" type="text" dir="rtl" placeholder="اسم الفرع" />
              </FormField>
              <FormField label="City" htmlFor="city">
                <Input id="city" name="city" type="text" placeholder="Riyadh" />
              </FormField>
              <FormField label="Phone" htmlFor="phone">
                <Input id="phone" name="phone" type="tel" placeholder="+966..." />
              </FormField>
            </div>
            <div className="flex flex-col md:flex-row items-end justify-between gap-6 pt-2">
              <div className="w-full md:max-w-xs">
                <FormField label="VAT Branch Code" htmlFor="vatBranchCode">
                  <Input id="vatBranchCode" name="vatBranchCode" type="text" placeholder="0001" />
                </FormField>
              </div>
              <Button type="submit" className="w-full md:w-auto font-bold uppercase tracking-wider text-[11px] px-10 h-11">
                Create Branch
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {branches.map(branch => (
          <Card key={branch._id.toString()} className="group hover:border-primary/30 transition-all duration-200 shadow-sm overflow-hidden">
            <CardHeader className="py-4 border-b border-gray-50">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <h3 className="font-black text-gray-900 flex items-center gap-2">
                    {branch.name}
                    {branch.isHeadOffice && (
                      <span className="text-[10px] font-black uppercase tracking-widest bg-soft-primary text-primary px-2 py-0.5 rounded border border-primary/10">
                        HQ
                      </span>
                    )}
                  </h3>
                  {branch.nameAr && <p className="text-xs font-bold text-gray-400" dir="rtl">{branch.nameAr}</p>}
                </div>
                <span className={cn(
                  "text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded border",
                  branch.active ? "bg-soft-success text-success border-success/10" : "bg-soft-secondary text-secondary border-secondary/10"
                )}>
                  {branch.active ? "Active" : "Inactive"}
                </span>
              </div>
            </CardHeader>
            <CardContent className="pt-5 pb-6 bg-white space-y-4">
              <div className="grid grid-cols-1 gap-3">
                <div className="flex items-center gap-3 text-gray-500">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-50 text-gray-400 group-hover:text-primary transition-colors">
                    <MapPin className="size-4" />
                  </div>
                  <span className="text-[13px] font-medium">{branch.city || "No city set"}</span>
                </div>
                <div className="flex items-center gap-3 text-gray-500">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-50 text-gray-400 group-hover:text-primary transition-colors">
                    <Phone className="size-4" />
                  </div>
                  <span className="text-[13px] font-medium">{branch.phone || "No phone set"}</span>
                </div>
                <div className="flex items-center gap-3 text-gray-500">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-50 text-gray-400 group-hover:text-primary transition-colors">
                    <Hash className="size-4" />
                  </div>
                  <span className="text-[13px] font-medium">VAT: {branch.vatBranchCode || "Default"}</span>
                </div>
              </div>
              <div className="pt-4 border-t border-gray-50 flex justify-end">
                <Button variant="secondary" size="xs" className="font-bold uppercase text-[10px] tracking-widest px-4">Manage Branch</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {branches.length === 0 && (
        <div className="bg-white border rounded-xl border-dashed border-gray-200 text-center py-20 mt-8">
           <Building2 className="size-10 text-gray-200 mx-auto mb-4" />
           <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">No branches found</p>
        </div>
      )}
    </>
  );
}
