"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { getSession } from "@/lib/auth-utils";
import { Branch, Membership, Tenant } from "@/models";

const branchSchema = z.object({
  name: z.string().trim().min(1, "Branch name is required"),
  nameAr: z.string().trim().optional(),
  address: z.string().trim().optional(),
  addressAr: z.string().trim().optional(),
  city: z.string().trim().optional(),
  region: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  vatBranchCode: z.string().trim().optional(),
});

type BranchFields = "name";

export type BranchActionState =
  | { status: "idle" }
  | {
      status: "error";
      code:
        | "VALIDATION_ERROR"
        | "AUTH_REQUIRED"
        | "SETUP_CONTEXT_MISSING"
        | "HEAD_OFFICE_EXISTS"
        | "SERVER_ERROR";
      message: string;
      fieldErrors?: Partial<Record<BranchFields, string>>;
    };

export const initialBranchActionState: BranchActionState = { status: "idle" };

export async function branchAction(_prevState: BranchActionState, formData: FormData): Promise<BranchActionState> {
  const parsed = branchSchema.safeParse({
    name: formData.get("name"),
    nameAr: formData.get("nameAr") || "",
    address: formData.get("address") || "",
    addressAr: formData.get("addressAr") || "",
    city: formData.get("city") || "",
    region: formData.get("region") || "",
    phone: formData.get("phone") || "",
    vatBranchCode: formData.get("vatBranchCode") || "",
  });

  if (!parsed.success) {
    return {
      status: "error",
      code: "VALIDATION_ERROR",
      message: "Please correct the highlighted fields.",
      fieldErrors: {
        name: parsed.error.flatten().fieldErrors.name?.[0],
      },
    };
  }

  const session = await getSession();
  if (!session?.user?.id) {
    return {
      status: "error",
      code: "AUTH_REQUIRED",
      message: "Your session has expired. Please sign in again.",
    };
  }

  const membership = await Membership.findOne({ userId: session.user.id, status: "active" });
  if (!membership) {
    return {
      status: "error",
      code: "SETUP_CONTEXT_MISSING",
      message: "Unable to continue setup for this account. Please contact support.",
    };
  }

  const tenantId = membership.tenantId;
  const existingHeadOffice = await Branch.findOne({ tenantId, isHeadOffice: true });
  if (existingHeadOffice) {
    return {
      status: "error",
      code: "HEAD_OFFICE_EXISTS",
      message: "A main branch already exists for this shop.",
    };
  }

  const payload = parsed.data;

  try {
    await Branch.create({
      tenantId,
      name: payload.name,
      nameAr: payload.nameAr || "",
      address: payload.address || undefined,
      addressAr: payload.addressAr || undefined,
      city: payload.city || undefined,
      region: payload.region || undefined,
      phone: payload.phone || undefined,
      vatBranchCode: payload.vatBranchCode || undefined,
      isHeadOffice: true,
      active: true,
    });

    await Tenant.findByIdAndUpdate(tenantId, {
      address: payload.address || undefined,
      addressAr: payload.addressAr || undefined,
    });
  } catch (error) {
    console.error("Branch onboarding error:", error);
    return {
      status: "error",
      code: "SERVER_ERROR",
      message: "We could not save your branch details right now. Please try again.",
    };
  }

  redirect("/onboarding/products");
}
