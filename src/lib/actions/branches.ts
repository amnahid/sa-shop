"use server";

import { Branch } from "@/models";
import { getAuthorizedSessionMembership } from "@/lib/utils/server-authorization";
import { revalidatePath } from "next/cache";

function getBranchPayload(formData: FormData) {
  const name = (formData.get("name") as string)?.trim();
  const nameAr = (formData.get("nameAr") as string)?.trim();
  const address = (formData.get("address") as string)?.trim();
  const city = (formData.get("city") as string)?.trim();
  const phone = (formData.get("phone") as string)?.trim();
  const vatBranchCode = (formData.get("vatBranchCode") as string)?.trim();

  return {
    name,
    nameAr: nameAr || name,
    address: address || undefined,
    city: city || undefined,
    phone: phone || undefined,
    vatBranchCode: vatBranchCode || undefined,
  };
}

export async function createBranch(formData: FormData) {
  const auth = await getAuthorizedSessionMembership("settings.branches:view");
  if ("error" in auth) return { error: auth.error };

  const tenantId = auth.membership.tenantId;
  const { name, nameAr, address, city, phone, vatBranchCode } = getBranchPayload(formData);

  if (!name) {
    return { error: "Branch name is required" };
  }

  try {
    await Branch.create({
      tenantId,
      name,
      nameAr,
      address,
      city,
      phone,
      vatBranchCode,
      isHeadOffice: false,
      active: true,
    });
  } catch {
    return { error: "Failed to create branch. Please try again." };
  }

  revalidatePath("/settings/branches");

  return { success: true, message: "Branch created successfully." };
}

export async function updateBranch(id: string, formData: FormData) {
  const auth = await getAuthorizedSessionMembership("settings.branches:view");
  if ("error" in auth) return { error: auth.error };

  const { name, nameAr, address, city, phone, vatBranchCode } = getBranchPayload(formData);

  if (!name) {
    return { error: "Branch name is required" };
  }

  const updated = await Branch.findOneAndUpdate(
    { _id: id, tenantId: auth.membership.tenantId },
    { name, nameAr, address, city, phone, vatBranchCode },
    { new: true }
  );

  if (!updated) {
    return { error: "Branch not found." };
  }

  revalidatePath("/settings/branches");

  return { success: true, message: "Branch updated successfully." };
}

export async function deactivateBranch(id: string) {
  const auth = await getAuthorizedSessionMembership("settings.branches:view");
  if ("error" in auth) return { error: auth.error };

  const branch = await Branch.findOne({ _id: id, tenantId: auth.membership.tenantId });
  if (!branch) {
    return { error: "Branch not found." };
  }

  if (branch.isHeadOffice) {
    return { error: "Head office cannot be deactivated." };
  }

  if (!branch.active) {
    return { error: "Branch is already inactive." };
  }

  await Branch.updateOne(
    { _id: id, tenantId: auth.membership.tenantId, isHeadOffice: false, active: true },
    { active: false }
  );

  revalidatePath("/settings/branches");

  return { success: true, message: "Branch deactivated successfully." };
}

export async function reactivateBranch(id: string) {
  const auth = await getAuthorizedSessionMembership("settings.branches:view");
  if ("error" in auth) return { error: auth.error };

  const updated = await Branch.findOneAndUpdate(
    { _id: id, tenantId: auth.membership.tenantId, active: false },
    { active: true },
    { new: true }
  );

  if (!updated) {
    return { error: "Inactive branch not found." };
  }

  revalidatePath("/settings/branches");

  return { success: true, message: "Branch reactivated successfully." };
}
