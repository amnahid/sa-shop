"use server";

import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth-utils";
import { Tenant, Membership } from "@/models";

export async function businessAction(formData: FormData) {
  const name = formData.get("name") as string;
  const nameAr = formData.get("nameAr") as string;
  const vatNumber = formData.get("vatNumber") as string;
  const crNumber = formData.get("crNumber") as string;
  const address = formData.get("address") as string;
  const addressAr = formData.get("addressAr") as string;
  const phone = formData.get("phone") as string;
  const email = formData.get("email") as string;

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

  await Tenant.findByIdAndUpdate(membership.tenantId, {
    name: name || nameAr + "'s Shop",
    nameAr: nameAr || "",
    vatNumber: vatNumber || undefined,
    crNumber: crNumber || undefined,
    address: address || undefined,
    addressAr: addressAr || undefined,
    phone: phone || undefined,
    email: email || undefined,
    vatRegistered: !!vatNumber,
  });

  redirect("/onboarding/branch");
}