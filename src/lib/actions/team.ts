"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth-utils";
import { Membership, User } from "@/models";
import type { MembershipRole } from "@/lib/utils/membership-roles";
import {
  ADMIN_SCOPED_PERMISSION_KEYS,
  canAccessPermission,
  canRoleAccessPermission,
  isAppPermissionKey,
  type AppPermissionKey,
} from "@/lib/utils/permissions";
import mongoose from "mongoose";
import { z } from "zod";

async function getCurrentActiveMembership() {
  const session = await getSession();
  if (!session?.user?.id) {
    return { error: "Unauthorized" as const };
  }

  const membership = await Membership.findOne({ userId: session.user.id, status: "active" });
  if (!membership) {
    return { error: "No active membership" as const };
  }

  return { membership };
}

function asOptionalString(value: FormDataEntryValue | null) {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

const PROFILE_FORM_NAME = "profile";
const PASSWORD_FORM_NAME = "password";
const BUSINESS_FORM_NAME = "business";
const ZATCA_FORM_NAME = "zatca";

function isSupportedAvatarUrl(value: string) {
  if (value.startsWith("/")) {
    return /^\/uploads\/media\/[a-zA-Z0-9._/-]+$/.test(value) && !value.includes("..");
  }

  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

const profileUpdateSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120, "Name must be 120 characters or fewer"),
  phone: z.string().trim().max(50, "Phone number must be 50 characters or fewer").optional(),
  avatarUrl: z
    .string()
    .trim()
    .max(2048, "Avatar URL is too long")
    .refine((value) => isSupportedAvatarUrl(value), "Avatar URL must be a valid http(s) URL or media path")
    .optional(),
});

const passwordChangeSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z
      .string()
      .min(8, "New password must be at least 8 characters")
      .max(128, "New password must be 128 characters or fewer")
      .regex(/[a-z]/, "New password must include a lowercase letter")
      .regex(/[A-Z]/, "New password must include an uppercase letter")
      .regex(/\d/, "New password must include a number"),
    confirmPassword: z.string().min(1, "Please confirm your new password"),
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    path: ["confirmPassword"],
    message: "New password and confirmation do not match",
  });

export type ProfileFieldErrors = Partial<Record<"name" | "phone" | "avatarUrl", string[]>>;
export type PasswordFieldErrors = Partial<
  Record<"currentPassword" | "newPassword" | "confirmPassword", string[]>
>;

export type ProfileActionResponse =
  | {
      success: true;
      form: typeof PROFILE_FORM_NAME;
      message: string;
    }
  | {
      success: false;
      form: typeof PROFILE_FORM_NAME;
      error: string;
      fieldErrors?: ProfileFieldErrors;
    };

export type PasswordActionResponse =
  | {
      success: true;
      form: typeof PASSWORD_FORM_NAME;
      message: string;
    }
  | {
      success: false;
      form: typeof PASSWORD_FORM_NAME;
      error: string;
      fieldErrors?: PasswordFieldErrors;
    };

function getSafeProfileActionError(error: string) {
  if (error === "Unauthorized" || error === "No active membership") {
    return "Unable to verify your account. Please sign in again.";
  }

  if (error === "Insufficient permissions") {
    return "You do not have access to update profile settings.";
  }

  return "Unable to update profile details right now. Please try again.";
}

function getSafePasswordActionError(error: string) {
  if (error === "Unauthorized" || error === "No active membership") {
    return "Unable to verify your account. Please sign in again.";
  }

  if (error === "Insufficient permissions") {
    return "You do not have access to update password settings.";
  }

  return "Unable to update password right now. Please try again.";
}

type ParsedProfileUpdate =
  | {
      success: true;
      data: {
        name: string;
        phone?: string;
        avatarUrl?: string;
      };
    }
  | {
      success: false;
      error: string;
      fieldErrors: ProfileFieldErrors;
    };

type ParsedPasswordChange =
  | {
      success: true;
      data: {
        currentPassword: string;
        newPassword: string;
      };
    }
  | {
      success: false;
      error: string;
      fieldErrors: PasswordFieldErrors;
    };

function parseProfileUpdate(formData: FormData): ParsedProfileUpdate {
  const validated = profileUpdateSchema.safeParse({
    name: asOptionalString(formData.get("name")) ?? "",
    phone: asOptionalString(formData.get("phone")),
    avatarUrl: asOptionalString(formData.get("avatarUrl")),
  });

  if (!validated.success) {
    return {
      success: false,
      error: "Invalid profile details",
      fieldErrors: validated.error.flatten().fieldErrors,
    };
  }

  return {
    success: true,
    data: validated.data,
  };
}

function parsePasswordChange(formData: FormData): ParsedPasswordChange {
  const validated = passwordChangeSchema.safeParse({
    currentPassword: typeof formData.get("currentPassword") === "string" ? formData.get("currentPassword") : "",
    newPassword: typeof formData.get("newPassword") === "string" ? formData.get("newPassword") : "",
    confirmPassword: typeof formData.get("confirmPassword") === "string" ? formData.get("confirmPassword") : "",
  });

  if (!validated.success) {
    return {
      success: false,
      error: "Invalid password update",
      fieldErrors: validated.error.flatten().fieldErrors,
    };
  }

  return {
    success: true,
    data: {
      currentPassword: validated.data.currentPassword,
      newPassword: validated.data.newPassword,
    },
  };
}

export async function updateMemberRole(memberId: string, newRole: "owner" | "manager" | "cashier") {
  const current = await getCurrentActiveMembership();
  if ("error" in current) return { error: current.error ?? "Unauthorized" };

  const currentMember = current.membership;
  if (!canAccessPermission("settings.admin.manage", currentMember.role, currentMember.permissionOverrides)) {
    return { error: "Insufficient permissions" };
  }

  if (newRole === "owner") {
    return { error: "Cannot assign owner role" };
  }

  const targetMembership = await Membership.findOne({ _id: memberId, tenantId: currentMember.tenantId });
  if (!targetMembership) {
    return { error: "Member not found" };
  }

  if (targetMembership.userId.toString() === currentMember.userId.toString()) {
    return { error: "Cannot change your own role" };
  }

  if (targetMembership.role === "owner") {
    return { error: "Cannot change owner role" };
  }

  await Membership.findByIdAndUpdate(memberId, { role: newRole });

  return { success: true };
}

export async function suspendMember(memberId: string) {
  const current = await getCurrentActiveMembership();
  if ("error" in current) return { error: current.error ?? "Unauthorized" };

  const currentMember = current.membership;
  if (!canAccessPermission("settings.admin.manage", currentMember.role, currentMember.permissionOverrides)) {
    return { error: "Insufficient permissions" };
  }

  const target = await Membership.findOne({ _id: memberId, tenantId: currentMember.tenantId });
  if (!target || target.role === "owner") {
    return { error: "Cannot suspend owner" };
  }

  if (target.userId.toString() === currentMember.userId.toString()) {
    return { error: "Cannot suspend yourself" };
  }

  await Membership.findOneAndUpdate(
    { _id: memberId, tenantId: currentMember.tenantId },
    { status: "suspended" }
  );
  return { success: true };
}

export async function reactivateMember(memberId: string) {
  const current = await getCurrentActiveMembership();
  if ("error" in current) return { error: current.error ?? "Unauthorized" };

  const currentMember = current.membership;
  if (!canAccessPermission("settings.admin.manage", currentMember.role, currentMember.permissionOverrides)) {
    return { error: "Insufficient permissions" };
  }

  const updated = await Membership.findOneAndUpdate(
    { _id: memberId, tenantId: currentMember.tenantId, role: { $ne: "owner" } },
    { status: "active" }
  );
  if (!updated) {
    return { error: "Member not found or cannot reactivate owner" };
  }
  return { success: true };
}

export async function updateProfile(formData: FormData): Promise<ProfileActionResponse> {
  const session = await getSession();
  if (!session?.user?.id) {
    return {
      success: false,
      form: PROFILE_FORM_NAME,
      error: getSafeProfileActionError("Unauthorized"),
    };
  }

  const current = await getCurrentActiveMembership();
  if ("error" in current) {
    return {
      success: false,
      form: PROFILE_FORM_NAME,
      error: getSafeProfileActionError(current.error ?? "Unauthorized"),
    };
  }

  if (!canAccessPermission("settings.profile:view", current.membership.role, current.membership.permissionOverrides)) {
    return {
      success: false,
      form: PROFILE_FORM_NAME,
      error: getSafeProfileActionError("Insufficient permissions"),
    };
  }

  const parsed = parseProfileUpdate(formData);
  if (!parsed.success) {
    return {
      success: false,
      form: PROFILE_FORM_NAME,
      error: parsed.error,
      fieldErrors: parsed.fieldErrors,
    };
  }

  try {
    await User.findByIdAndUpdate(new mongoose.Types.ObjectId(session.user.id), {
      name: parsed.data.name,
      phone: parsed.data.phone,
      avatarUrl: parsed.data.avatarUrl,
    });

    revalidatePath("/settings/profile");
  } catch {
    return {
      success: false,
      form: PROFILE_FORM_NAME,
      error: getSafeProfileActionError("PERSISTENCE_FAILURE"),
    };
  }

  return {
    success: true,
    form: PROFILE_FORM_NAME,
    message: "Profile updated successfully",
  };
}

export async function updateMemberScopedPermissions(memberId: string, enabledPermissions: string[]) {
  const current = await getCurrentActiveMembership();
  if ("error" in current) return { error: current.error ?? "Unauthorized" };

  const currentMember = current.membership;
  if (!canAccessPermission("settings.admin.manage", currentMember.role, currentMember.permissionOverrides)) {
    return { error: "Insufficient permissions" };
  }

  const targetMembership = await Membership.findOne({ _id: memberId, tenantId: currentMember.tenantId });
  if (!targetMembership) {
    return { error: "Member not found" };
  }

  if (targetMembership.role === "owner") {
    return { error: "Owner permissions cannot be modified" };
  }

  if (targetMembership.userId.toString() === currentMember.userId.toString()) {
    return { error: "Cannot change your own permissions" };
  }

  const validEnabledPermissions = enabledPermissions.filter((value): value is AppPermissionKey =>
    isAppPermissionKey(value)
  );
  const enabledPermissionSet = new Set(validEnabledPermissions);
  const targetRole = targetMembership.role as MembershipRole;
  const nextOverrides: Record<string, boolean> = {};

  for (const permissionKey of ADMIN_SCOPED_PERMISSION_KEYS) {
    const defaultValue = canRoleAccessPermission(permissionKey, targetRole);
    const nextValue = enabledPermissionSet.has(permissionKey);

    if (nextValue !== defaultValue) {
      nextOverrides[permissionKey] = nextValue;
    }
  }

  await Membership.findByIdAndUpdate(memberId, {
    permissionOverrides: Object.keys(nextOverrides).length ? nextOverrides : undefined,
  });

  return { success: true };
}

export async function changePassword(formData: FormData): Promise<PasswordActionResponse> {
  const session = await getSession();
  if (!session?.user?.id) {
    return {
      success: false,
      form: PASSWORD_FORM_NAME,
      error: getSafePasswordActionError("Unauthorized"),
    };
  }

  const current = await getCurrentActiveMembership();
  if ("error" in current) {
    return {
      success: false,
      form: PASSWORD_FORM_NAME,
      error: getSafePasswordActionError(current.error ?? "Unauthorized"),
    };
  }

  if (!canAccessPermission("settings.profile:view", current.membership.role, current.membership.permissionOverrides)) {
    return {
      success: false,
      form: PASSWORD_FORM_NAME,
      error: getSafePasswordActionError("Insufficient permissions"),
    };
  }

  const parsed = parsePasswordChange(formData);
  if (!parsed.success) {
    return {
      success: false,
      form: PASSWORD_FORM_NAME,
      error: parsed.error,
      fieldErrors: parsed.fieldErrors,
    };
  }

  const user = await User.findById(session.user.id);
  if (!user) {
    return {
      success: false,
      form: PASSWORD_FORM_NAME,
      error: getSafePasswordActionError("USER_NOT_FOUND"),
    };
  }

  const valid = await user.comparePassword(parsed.data.currentPassword);
  if (!valid) {
    return {
      success: false,
      form: PASSWORD_FORM_NAME,
      error: "Current password is incorrect",
      fieldErrors: { currentPassword: ["Current password is incorrect"] },
    };
  }

  try {
    const bcrypt = await import("bcryptjs");
    const hash = await bcrypt.hash(parsed.data.newPassword, 12);
    await User.findByIdAndUpdate(user._id, { passwordHash: hash });
    revalidatePath("/settings/profile");
  } catch {
    return {
      success: false,
      form: PASSWORD_FORM_NAME,
      error: getSafePasswordActionError("PERSISTENCE_FAILURE"),
    };
  }

  return {
    success: true,
    form: PASSWORD_FORM_NAME,
    message: "Password updated successfully",
  };
}

type TenantSettingsMembership = {
  tenantId: mongoose.Types.ObjectId | string;
  role: MembershipRole;
  permissionOverrides?: Record<string, boolean>;
};

type TenantSettingsAuthResult =
  | { membership: TenantSettingsMembership }
  | { error: string };

type TenantSettingsDeps = {
  getCurrentMembership: () => Promise<TenantSettingsAuthResult>;
  canAccess: typeof canAccessPermission;
  updateTenantById: (tenantId: mongoose.Types.ObjectId | string, update: Record<string, unknown>) => Promise<void>;
  revalidateSettingsPath: () => void;
};

async function defaultUpdateTenantById(tenantId: mongoose.Types.ObjectId | string, update: Record<string, unknown>) {
  const { Tenant } = await import("@/models");
  await Tenant.findByIdAndUpdate(tenantId, update);
}

const tenantSettingsDeps: TenantSettingsDeps = {
  getCurrentMembership: async () => {
    const result = await getCurrentActiveMembership();
    if ("error" in result) {
      return { error: result.error ?? "Unauthorized" };
    }

    return {
      membership: {
        tenantId: result.membership.tenantId,
        role: result.membership.role,
        permissionOverrides: result.membership.permissionOverrides as Record<string, boolean> | undefined,
      },
    };
  },
  canAccess: canAccessPermission,
  updateTenantById: defaultUpdateTenantById,
  revalidateSettingsPath: () => revalidatePath("/settings"),
};

export async function updateTenantSettings(
  formData: FormData,
  overrides: Partial<TenantSettingsDeps> = {}
): Promise<TenantSettingsActionResponse> {
  const requestedForm = formData.get("settingsForm") === ZATCA_FORM_NAME ? ZATCA_FORM_NAME : BUSINESS_FORM_NAME;
  const deps = { ...tenantSettingsDeps, ...overrides };
  const current = await deps.getCurrentMembership();
  if ("error" in current) {
    return { success: false, form: requestedForm, error: current.error ?? "Unauthorized" };
  }

  const membership = current.membership;
  if (!deps.canAccess("settings:view", membership.role, membership.permissionOverrides)) {
    return { success: false, form: requestedForm, error: "Insufficient permissions" };
  }

  const parsed = parseTenantSettingsUpdate(formData);
  if (!parsed.success) {
    return parsed;
  }

  await deps.updateTenantById(membership.tenantId, parsed.data);
  deps.revalidateSettingsPath();

  return {
    success: true,
    form: parsed.form,
    message: parsed.form === "zatca" ? "ZATCA settings saved successfully" : "Business settings saved successfully",
  };
}

function isValidTimeZone(value: string) {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

const businessSettingsSchema = z.object({
  name: z.string().trim().min(1, "Business name is required"),
  nameAr: z.string().trim().min(1, "Arabic business name is required"),
  crNumber: z.string().trim().max(50).optional(),
  vatNumber: z
    .string()
    .trim()
    .regex(/^3\d{13}3$/, "VAT number must match Saudi VAT format")
    .optional(),
  address: z.string().trim().max(500).optional(),
  addressAr: z.string().trim().max(500).optional(),
  phone: z.string().trim().max(50).optional(),
  email: z.string().trim().email("Email is invalid").optional(),
  logoUrl: z
    .string()
    .trim()
    .refine((value) => {
      try {
        const parsed = new URL(value);
        return parsed.protocol === "https:" || parsed.protocol === "http:";
      } catch {
        return false;
      }
    }, "Logo URL must be a valid http(s) URL")
    .optional(),
  primaryColor: z
    .string()
    .trim()
    .regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, "Invalid color format")
    .optional(),
  baseCurrency: z.string().trim().regex(/^[A-Z]{3}$/, "Base currency must be a valid 3-letter currency code"),
  timezone: z.string().trim().refine((value) => isValidTimeZone(value), "Timezone is invalid"),
  defaultLanguage: z.enum(["ar", "en"]),
  vatRegistered: z.boolean(),
});

const zatcaSettingsSchema = z.object({
  zatcaPhase: z.union([z.literal(1), z.literal(2)]),
  zatcaCsid: z.string().trim().max(255).optional(),
  zatcaSolutionId: z.string().trim().max(255).optional(),
  zatcaCertificateId: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9._-]+$/, "Certificate ID contains invalid characters")
    .max(255)
    .optional(),
});

export type TenantSettingsFieldErrors = Partial<
  Record<
    | "name"
    | "nameAr"
    | "crNumber"
    | "vatNumber"
    | "address"
    | "addressAr"
    | "phone"
    | "email"
    | "logoUrl"
    | "primaryColor"
    | "baseCurrency"
    | "timezone"
    | "defaultLanguage"
    | "vatRegistered"
    | "zatcaPhase"
    | "zatcaCsid"
    | "zatcaSolutionId"
    | "zatcaCertificateId",
    string[]
  >
>;

export type TenantSettingsActionResponse =
  | {
      success: true;
      form: typeof BUSINESS_FORM_NAME | typeof ZATCA_FORM_NAME;
      message: string;
    }
  | {
      success: false;
      form: typeof BUSINESS_FORM_NAME | typeof ZATCA_FORM_NAME;
      error: string;
      fieldErrors?: TenantSettingsFieldErrors;
    };

type ParsedTenantSettingsUpdate =
  | {
      success: true;
      form: typeof BUSINESS_FORM_NAME | typeof ZATCA_FORM_NAME;
      data: Record<string, unknown>;
    }
  | {
      success: false;
      form: typeof BUSINESS_FORM_NAME | typeof ZATCA_FORM_NAME;
      error: string;
      fieldErrors?: TenantSettingsFieldErrors;
    };

function parseTenantSettingsUpdate(formData: FormData): ParsedTenantSettingsUpdate {
  const requestedForm = formData.get("settingsForm");
  const form = requestedForm === ZATCA_FORM_NAME ? ZATCA_FORM_NAME : BUSINESS_FORM_NAME;

  if (form === ZATCA_FORM_NAME) {
    const validated = zatcaSettingsSchema.safeParse({
      zatcaPhase: Number(formData.get("zatcaPhase") ?? 1),
      zatcaCsid: asOptionalString(formData.get("zatcaCsid")),
      zatcaSolutionId: asOptionalString(formData.get("zatcaSolutionId")),
      zatcaCertificateId: asOptionalString(formData.get("zatcaCertificateId")),
    });

    if (!validated.success) {
      return {
        success: false,
        form,
        error: "Invalid ZATCA settings",
        fieldErrors: validated.error.flatten().fieldErrors,
      };
    }

    return {
      success: true,
      form,
      data: validated.data,
    };
  }

  const validated = businessSettingsSchema.safeParse({
    name: asOptionalString(formData.get("name")) ?? "",
    nameAr: asOptionalString(formData.get("nameAr")) ?? "",
    crNumber: asOptionalString(formData.get("crNumber")),
    vatNumber: asOptionalString(formData.get("vatNumber")),
    address: asOptionalString(formData.get("address")),
    addressAr: asOptionalString(formData.get("addressAr")),
    phone: asOptionalString(formData.get("phone")),
    email: asOptionalString(formData.get("email")),
    logoUrl: asOptionalString(formData.get("logoUrl")),
    primaryColor: asOptionalString(formData.get("primaryColor")),
    baseCurrency: asOptionalString(formData.get("baseCurrency")),
    timezone: asOptionalString(formData.get("timezone")),
    defaultLanguage: asOptionalString(formData.get("defaultLanguage")),
    vatRegistered: formData.get("vatRegistered") === "on",
  });

  if (!validated.success) {
    return {
      success: false,
      form,
      error: "Invalid business settings",
      fieldErrors: validated.error.flatten().fieldErrors,
    };
  }

  return {
    success: true,
    form,
    data: validated.data,
  };
}
