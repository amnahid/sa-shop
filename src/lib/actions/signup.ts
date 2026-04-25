"use server";

import { redirect } from "next/navigation";
import { User, Tenant, Membership } from "@/models";
import mongoose from "mongoose";

export async function signupAction(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const name = formData.get("name") as string;

  if (!email || !password || !name) {
    return;
  }

  if (password.length < 6) {
    return;
  }

  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    return;
  }

  const user = await User.create({
    email: email.toLowerCase(),
    name,
    passwordHash: password,
  });

  try {
    const tenant = await Tenant.create({
      name: name + "'s Shop",
      nameAr: "",
      baseCurrency: "SAR",
      timezone: "Asia/Riyadh",
      defaultLanguage: "en",
      vatRegistered: false,
      zatcaPhase: 1,
      plan: "starter",
    });

    await Membership.create({
      userId: user._id,
      tenantId: tenant._id,
      role: "owner",
      branchIds: [],
      status: "active",
    });
  } catch (error) {
    console.error("Signup error:", error);
    return;
  }

  redirect("/onboarding/business");
}