
import { redirect } from "next/navigation";
import { Branch } from "@/models";
import { getCurrentMembership } from "@/lib/utils/membership";
import { canAccessPermission } from "@/lib/utils/permissions";
import { SettingsBranchesClient } from "@/components/settings/SettingsBranchesClient";

export default async function SettingsBranchesPage() {
  const membership = await getCurrentMembership();
  if (!membership) {
    return <div>No active membership</div>;
  }

  if (!canAccessPermission("settings.branches:view", membership.role, membership.permissionOverrides)) {
    redirect("/");
  }

  const branches = await Branch.find({ tenantId: membership.tenantId })
    .sort({ isHeadOffice: -1, name: 1 })
    .lean();

  const serializedBranches = branches.map(branch => ({
    _id: branch._id.toString(),
    name: branch.name,
    nameAr: branch.nameAr,
    address: branch.address,
    city: branch.city,
    phone: branch.phone,
    vatBranchCode: branch.vatBranchCode,
    isHeadOffice: branch.isHeadOffice,
    active: branch.active,
  }));

  return <SettingsBranchesClient branches={serializedBranches} />;
}
