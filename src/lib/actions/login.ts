"use server";

import { signIn } from "next-auth/react";
import { redirect } from "next/navigation";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export async function loginUser(_formData: FormData) {
  const email = _formData.get("email") as string;
  const password = _formData.get("password") as string;

  const validated = loginSchema.safeParse({ email, password });

  if (!validated.success) {
    return;
  }

  try {
    const result = await signIn("credentials", {
      email: validated.data.email,
      password: validated.data.password,
      redirect: false,
    });

    if (result?.error) {
      return;
    }

    redirect("/");
  } catch (error) {
    console.error("Login error:", error);
    return;
  }
}