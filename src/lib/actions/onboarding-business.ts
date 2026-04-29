"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { getSession } from "@/lib/auth-utils";
import { Membership, Tenant } from "@/models";
import { type BusinessFields, type BusinessActionState } from "./onboarding.types";

const businessSchema = z.object({
  name: z.string().trim().min(1, "Business name is required"),
  nameAr: z.string().trim().optional(),
  vatNumber: z.string().trim().optional(),
  crNumber: z.string().trim().optional(),
  address: z.string().trim().optional(),
  addressAr: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  email: z.string().trim().email("Enter a valid email").or(z.literal("")),
});

export async function businessAction(
  _prevState: BusinessActionState,
  formData: FormData
): Promise<BusinessActionState> {
  const parsed = businessSchema.safeParse({
    name: formData.get("name"),
    nameAr: formData.get("nameAr") || "",
    vatNumber: formData.get("vatNumber") || "",
    crNumber: formData.get("crNumber") || "",
    address: formData.get("address") || "",
    addressAr: formData.get("addressAr") || "",
    phone: formData.get("phone") || "",
    email: (formData.get("email") as string | null)?.trim() || "",
  });

  if (!parsed.success) {
    const errors = parsed.error.flatten().fieldErrors;
    return {
      status: "error",
      code: "VALIDATION_ERROR",
      message: "Please correct the highlighted fields.",
      fieldErrors: {
        name: errors.name?.[0],
        email: errors.email?.[0],
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

  const payload = parsed.data;

  try {
    await Tenant.findByIdAndUpdate(membership.tenantId, {
      name: payload.name || `${payload.nameAr}'s Shop`,
      nameAr: payload.nameAr || "",
      vatNumber: payload.vatNumber || undefined,
      crNumber: payload.crNumber || undefined,
      address: payload.address || undefined,
      addressAr: payload.addressAr || undefined,
      phone: payload.phone || undefined,
      email: payload.email || undefined,
      vatRegistered: !!payload.vatNumber,
    });
  } catch (error) {
    console.error("Business onboarding error:", error);
    return {
      status: "error",
      code: "SERVER_ERROR",
      message: "We could not save your business details right now. Please try again.",
    };
  }

  redirect("/onboarding/branch");
}
