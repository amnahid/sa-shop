"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import mongoose from "mongoose";
import { Membership, Tenant, User } from "@/models";

const signupSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  email: z.string().trim().email("Enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type SignupFields = "name" | "email" | "password";

export type SignupActionState =
  | { status: "idle" }
  | {
      status: "error";
      code: "VALIDATION_ERROR" | "DUPLICATE_EMAIL" | "SERVER_ERROR";
      message: string;
      fieldErrors?: Partial<Record<SignupFields, string>>;
    };

export const initialSignupActionState: SignupActionState = { status: "idle" };

type SignupSubmissionResult =
  | { ok: true; redirectTo: string }
  | {
      ok: false;
      code: "VALIDATION_ERROR" | "DUPLICATE_EMAIL" | "SERVER_ERROR";
      message: string;
      fieldErrors?: Partial<Record<SignupFields, string>>;
    };

type SignupDependencies = {
  findExistingUser: (email: string) => Promise<{ _id: unknown } | null>;
  createUser: (input: { email: string; name: string; passwordHash: string }) => Promise<{ _id: unknown }>;
  createTenant: (input: {
    name: string;
    nameAr: string;
    baseCurrency: string;
    timezone: string;
    defaultLanguage: string;
    vatRegistered: boolean;
    zatcaPhase: 1 | 2;
    plan: string;
  }) => Promise<{ _id: unknown }>;
  createMembership: (input: {
    userId: unknown;
    tenantId: unknown;
    role: "owner";
    branchIds: unknown[];
    status: "active";
  }) => Promise<void>;
};

const defaultDependencies: SignupDependencies = {
  findExistingUser: (email) => User.findOne({ email }).select("_id").lean<{ _id: unknown }>(),
  createUser: (input) => User.create(input),
  createTenant: (input) => Tenant.create(input),
  createMembership: async (input) => {
    await Membership.create({
      ...input,
      userId: new mongoose.Types.ObjectId(String(input.userId)),
      tenantId: new mongoose.Types.ObjectId(String(input.tenantId)),
      branchIds: input.branchIds.map((branchId) => new mongoose.Types.ObjectId(String(branchId))),
    });
  },
};

function fieldErrorsFromSchema(error: z.ZodError): Partial<Record<SignupFields, string>> {
  const formatted = error.format();
  return {
    name: formatted.name?._errors[0],
    email: formatted.email?._errors[0],
    password: formatted.password?._errors[0],
  };
}

export async function submitSignup(
  formData: FormData,
  dependencies: SignupDependencies = defaultDependencies
): Promise<SignupSubmissionResult> {
  const parsed = signupSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return {
      ok: false,
      code: "VALIDATION_ERROR",
      message: "Please correct the highlighted fields.",
      fieldErrors: fieldErrorsFromSchema(parsed.error),
    };
  }

  const email = parsed.data.email.toLowerCase();

  const existingUser = await dependencies.findExistingUser(email);
  if (existingUser) {
    return {
      ok: false,
      code: "DUPLICATE_EMAIL",
      message: "An account with this email already exists.",
      fieldErrors: { email: "This email is already registered." },
    };
  }

  try {
    const user = await dependencies.createUser({
      email,
      name: parsed.data.name,
      passwordHash: parsed.data.password,
    });

    const tenant = await dependencies.createTenant({
      name: `${parsed.data.name}'s Shop`,
      nameAr: "",
      baseCurrency: "SAR",
      timezone: "Asia/Riyadh",
      defaultLanguage: "en",
      vatRegistered: false,
      zatcaPhase: 1,
      plan: "starter",
    });

    await dependencies.createMembership({
      userId: user._id,
      tenantId: tenant._id,
      role: "owner",
      branchIds: [],
      status: "active",
    });

    return {
      ok: true,
      redirectTo: "/onboarding/business",
    };
  } catch (error) {
    console.error("Signup error:", error);
    return {
      ok: false,
      code: "SERVER_ERROR",
      message: "We could not create your account right now. Please try again.",
    };
  }
}

export async function signupAction(_prevState: SignupActionState, formData: FormData): Promise<SignupActionState> {
  const result = await submitSignup(formData);

  if (result.ok) {
    redirect(result.redirectTo);
  }

  return {
    status: "error",
    code: result.code,
    message: result.message,
    fieldErrors: result.fieldErrors,
  };
}
