import { z } from "zod";

function asOptionalString(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return undefined;
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

function isSupportedLogoUrl(value: string) {
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

function isValidTimeZone(value: string) {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: value });
    return true;
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

const businessSettingsSchema = z.object({
  name: z.string().trim().min(1, "Business name is required").max(120),
  nameAr: z.string().trim().max(120).optional(),
  crNumber: z.string().trim().max(100).optional(),
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
    .max(2048, "Logo URL is too long")
    .refine((value) => isSupportedLogoUrl(value), "Logo URL must be a valid http(s) URL or media path")
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

export type ProfileFieldErrors = Partial<Record<"name" | "phone" | "avatarUrl", string[]>>;
export type PasswordFieldErrors = Partial<
  Record<"currentPassword" | "newPassword" | "confirmPassword", string[]>
>;
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

export type ParsedProfileUpdate =
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

export type ParsedPasswordChange =
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

export type ParsedTenantSettingsUpdate =
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

export function getSafeProfileActionError(error: string) {
  if (error === "Unauthorized" || error === "No active membership") {
    return "Unable to verify your account. Please sign in again.";
  }
  if (error === "Insufficient permissions") {
    return "You do not have access to update profile settings.";
  }
  return "Unable to update profile details right now. Please try again.";
}

export function getSafePasswordActionError(error: string) {
  if (error === "Unauthorized" || error === "No active membership") {
    return "Unable to verify your account. Please sign in again.";
  }
  if (error === "Insufficient permissions") {
    return "You do not have access to update password settings.";
  }
  return "Unable to update password right now. Please try again.";
}

export function parseProfileUpdate(formData: FormData): ParsedProfileUpdate {
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

  return { success: true, data: validated.data };
}

export function parsePasswordChange(formData: FormData): ParsedPasswordChange {
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

export function parseTenantSettingsUpdate(formData: FormData): ParsedTenantSettingsUpdate {
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

    return { success: true, form, data: validated.data };
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

  const data = { ...validated.data };
  if (formData.get("logoRemoved") === "1") {
    data.logoUrl = "";
  }

  return { success: true, form, data };
}
