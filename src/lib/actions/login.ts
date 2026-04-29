"use server";

import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { z } from "zod";
import { signIn } from "@/lib/auth";
import {
  type LoginFields,
  type LoginActionState,
  type LoginSubmissionResult,
} from "./login.types";

const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

type LoginDependencies = {
  authenticate: (email: string, password: string, redirectTo: string) => Promise<"ok" | "invalid" | "error">;
};

function isNextRedirectError(error: unknown): boolean {
  if (typeof error !== "object" || error === null || !("digest" in error)) {
    return false;
  }

  const digest = error.digest;
  return typeof digest === "string" && digest.startsWith("NEXT_REDIRECT");
}

const defaultDependencies: LoginDependencies = {
  authenticate: async (email, password, redirectTo) => {
    try {
      await signIn("credentials", {
        email,
        password,
        redirectTo,
      });
      return "ok";
    } catch (error) {
      if (isNextRedirectError(error)) {
        throw error;
      }

      if (error instanceof AuthError) {
        return error.type === "CredentialsSignin" ? "invalid" : "error";
      }

      console.error("Login error:", error);
      return "error";
    }
  },
};

function fieldErrorsFromSchema(error: z.ZodError): Partial<Record<LoginFields, string>> {
  const formatted = error.format();
  return {
    email: formatted.email?._errors[0],
    password: formatted.password?._errors[0],
  };
}

export async function submitLogin(
  formData: FormData,
  dependencies: LoginDependencies = defaultDependencies
): Promise<LoginSubmissionResult> {
  const parsed = loginSchema.safeParse({
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

  const redirectTo = "/dashboard";
  const authResult = await dependencies.authenticate(parsed.data.email, parsed.data.password, redirectTo);

  if (authResult === "ok") {
    return {
      ok: true,
      redirectTo,
    };
  }

  if (authResult === "invalid") {
    return {
      ok: false,
      code: "INVALID_CREDENTIALS",
      message: "Invalid email or password.",
    };
  }

  return {
    ok: false,
    code: "AUTH_ERROR",
    message: "Unable to sign in right now. Please try again.",
  };
}

export async function loginAction(_prevState: LoginActionState, formData: FormData): Promise<LoginActionState> {
  const result = await submitLogin(formData);

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
