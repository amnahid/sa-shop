"use server";

import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth-utils";
import { Branch, Tenant, Membership } from "@/models";

export async function branchAction(formData: FormData) {
  const name = formData.get("name") as string;
  const nameAr = formData.get("nameAr") as string;
  const address = formData.get("address") as string;
  const addressAr = formData.get("addressAr") as string;
  const city = formData.get("city") as string;
  const region = formData.get("region") as string;
  const phone = formData.get("phone") as string;
  const vatBranchCode = formData.get("vatBranchCode") as string;

  if (!name) {
    return;
  }

  const session = await getSession();
  if (!session?.user?.id) {
    return;
  }

  const membership = await Membership.findOne({ userId: session.user.id, status: "active" });
  if (!membership) {
    return;
  }

  const tenantId = membership.tenantId;

  const existingHeadOffice = await Branch.findOne({ tenantId, isHeadOffice: true });
  if (existingHeadOffice) {
    return;
  }

  await Branch.create({
    tenantId,
    name,
    nameAr: nameAr || "",
    address: address || undefined,
    addressAr: addressAr || undefined,
    city: city || undefined,
    region: region || undefined,
    phone: phone || undefined,
    vatBranchCode: vatBranchCode || undefined,
    isHeadOffice: true,
    active: true,
  });

  await Tenant.findByIdAndUpdate(tenantId, { address, addressAr });

  redirect("/onboarding/products");
}