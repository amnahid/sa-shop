"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { getSession } from "@/lib/auth-utils";
import { sendEmail } from "@/lib/email";
import { Invitation, Membership, Tenant } from "@/models";
import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";
import { type TeamActionState } from "./onboarding.types";

const inviteSchema = z.object({
  email: z.string().trim().email("Enter a valid email"),
  role: z.enum(["cashier", "manager"]),
});

export async function inviteTeamAction(
_prevState: TeamActionState, formData: FormData): Promise<TeamActionState> {
  const parsed = inviteSchema.safeParse({
    email: formData.get("email"),
    role: formData.get("role"),
  });

  if (!parsed.success) {
    const errors = parsed.error.flatten().fieldErrors;
    return {
      status: "error",
      code: "VALIDATION_ERROR",
      message: "Please correct the highlighted fields.",
      fieldErrors: {
        email: errors.email?.[0],
        role: errors.role?.[0],
      },
    };
  }

  const sessionUser = await getSession();
  if (!sessionUser?.user?.id) {
    return {
      status: "error",
      code: "AUTH_REQUIRED",
      message: "Your session has expired. Please sign in again.",
    };
  }

  const membership = await Membership.findOne({ userId: sessionUser.user.id, status: "active" });
  if (!membership) {
    return {
      status: "error",
      code: "SETUP_CONTEXT_MISSING",
      message: "Unable to continue setup for this account. Please contact support.",
    };
  }

  const tenant = await Tenant.findById(membership.tenantId);
  if (!tenant) {
    return {
      status: "error",
      code: "SETUP_CONTEXT_MISSING",
      message: "Unable to continue setup for this account. Please contact support.",
    };
  }

  const token = uuidv4();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  try {
    await Invitation.create({
      tenantId: membership.tenantId,
      email: parsed.data.email.toLowerCase(),
      role: parsed.data.role,
      invitedBy: new mongoose.Types.ObjectId(sessionUser.user.id),
      token,
      expiresAt,
    });

    await sendEmail(
      "invite",
      {
        to: parsed.data.email,
        token,
        businessName: tenant.name,
      },
      {
        tenantId: membership.tenantId,
        actorTenantId: membership.tenantId,
      }
    );
  } catch (error) {
    console.error("Invite onboarding error:", error);
    return {
      status: "error",
      code: "SERVER_ERROR",
      message: "We could not send the invitation right now. Please try again.",
    };
  }

  return {
    status: "success",
    code: "INVITE_SENT",
    message: `Invitation sent to ${parsed.data.email}.`,
  };
}

export async function finishSetup() {
  redirect("/");
}
