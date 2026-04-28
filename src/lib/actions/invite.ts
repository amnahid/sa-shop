"use server";

import { sendEmail } from "@/lib/email";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import { Invitation, User, Membership, Tenant } from "@/models";
import mongoose from "mongoose";
import { canAccessPermission } from "@/lib/utils/permissions";
import { getAuthorizedSessionMembership } from "@/lib/utils/server-authorization";
import { isTenantAccessible } from "@/lib/utils/tenant-access";

const INVITE_EXPIRY_DAYS = 7;

const inviteSchema = z.object({
  email: z.string().email("Invalid email address").toLowerCase(),
  role: z.enum(["owner", "manager", "cashier"]),
  tenantId: z.string(),
});

const invitationIdSchema = z.object({
  invitationId: z.string().trim().min(1, "Invitation not found"),
});

type InvitationRole = "owner" | "manager" | "cashier";
type InvitationStatus = "pending" | "accepted" | "expired" | "revoked";

type InvitationRecord = {
  _id: mongoose.Types.ObjectId | string;
  tenantId: mongoose.Types.ObjectId | string;
  email: string;
  role: InvitationRole;
  invitedBy: mongoose.Types.ObjectId | string;
  token?: string;
  expiresAt: Date;
  acceptedAt?: Date | null;
  revokedAt?: Date | null;
  revokedBy?: mongoose.Types.ObjectId | string | null;
  createdAt?: Date;
  save?: () => Promise<unknown>;
};

export type TeamInvitationRecord = {
  id: string;
  email: string;
  role: InvitationRole;
  status: InvitationStatus;
  invitedBy: string;
  expiresAt: Date;
  acceptedAt?: Date;
  revokedAt?: Date;
  createdAt?: Date;
};

type InviteLifecycleDeps = {
  now: () => Date;
  createToken: () => string;
  getAuth: typeof getAuthorizedSessionMembership;
  canAccess: typeof canAccessPermission;
  tenantAccessible: typeof isTenantAccessible;
  findTenantById: (tenantId: string) => Promise<{ name: string } | null>;
  findActiveInvitationByEmail: (
    tenantId: string,
    email: string,
    now: Date
  ) => Promise<InvitationRecord | null>;
  createInvitation: (payload: {
    email: string;
    role: InvitationRole;
    tenantId: mongoose.Types.ObjectId;
    invitedBy: mongoose.Types.ObjectId;
    token: string;
    expiresAt: Date;
  }) => Promise<void>;
  findInvitationById: (invitationId: string, tenantId: string) => Promise<InvitationRecord | null>;
  persistInvitation: (invitation: InvitationRecord) => Promise<void>;
  listInvitationsByTenant: (tenantId: string) => Promise<InvitationRecord[]>;
  sendInviteEmail?: (payload: {
    to: string;
    businessName: string;
    token: string;
    tenantId: string;
    actorTenantId: string;
  }) => Promise<void>;
};

const inviteLifecycleDeps: InviteLifecycleDeps = {
  now: () => new Date(),
  createToken: () => uuidv4(),
  getAuth: getAuthorizedSessionMembership,
  canAccess: canAccessPermission,
  tenantAccessible: isTenantAccessible,
  findTenantById: async (tenantId) => {
    const tenant = await Tenant.findById(tenantId);
    return tenant ? { name: tenant.name } : null;
  },
  findActiveInvitationByEmail: (tenantId, email, now) =>
    Invitation.findOne({
      email,
      tenantId: new mongoose.Types.ObjectId(tenantId),
      acceptedAt: null,
      revokedAt: null,
      expiresAt: { $gt: now },
    }) as unknown as Promise<InvitationRecord | null>,
  createInvitation: async (payload) => {
    await Invitation.create(payload);
  },
  findInvitationById: (invitationId, tenantId) =>
    Invitation.findOne({
      _id: invitationId,
      tenantId: new mongoose.Types.ObjectId(tenantId),
    }) as unknown as Promise<InvitationRecord | null>,
  persistInvitation: async (invitation) => {
    if (typeof invitation.save === "function") {
      await invitation.save();
      return;
    }
    await Invitation.findByIdAndUpdate(invitation._id, invitation);
  },
  listInvitationsByTenant: (tenantId) =>
    Invitation.find({
      tenantId: new mongoose.Types.ObjectId(tenantId),
    })
      .sort({ createdAt: -1 })
      .lean() as unknown as Promise<InvitationRecord[]>,
};

async function getInviteAuth(
  deps: InviteLifecycleDeps,
  overrides: Partial<InviteLifecycleDeps>
) {
  if (overrides.getAuth) {
    return deps.getAuth("settings.team:view");
  }
  return getAuthorizedSessionMembership("settings.team:view");
}

function computeInvitationExpiry(now: Date) {
  const expiresAt = new Date(now);
  expiresAt.setDate(expiresAt.getDate() + INVITE_EXPIRY_DAYS);
  return expiresAt;
}

function toInvitationStatus(invitation: Pick<InvitationRecord, "acceptedAt" | "revokedAt" | "expiresAt">, now: Date) {
  if (invitation.acceptedAt) return "accepted";
  if (invitation.revokedAt) return "revoked";
  if (invitation.expiresAt <= now) return "expired";
  return "pending";
}

function getInvitationStatus(
  invitation: Pick<InvitationRecord, "acceptedAt" | "revokedAt" | "expiresAt">,
  now = new Date()
): InvitationStatus {
  return toInvitationStatus(invitation, now);
}

function canManageOwnerInvites(
  role: InvitationRole,
  membershipRole: InvitationRole,
  permissionOverrides: Record<string, boolean> | Map<string, boolean> | undefined,
  deps: InviteLifecycleDeps
) {
  if (role !== "owner") return true;
  return deps.canAccess("settings.admin.manage", membershipRole, permissionOverrides);
}

function normalizeInvitationRecord(invitation: InvitationRecord, now: Date): TeamInvitationRecord {
  return {
    id: invitation._id.toString(),
    email: invitation.email,
    role: invitation.role,
    status: toInvitationStatus(invitation, now),
    invitedBy: invitation.invitedBy.toString(),
    expiresAt: invitation.expiresAt,
    acceptedAt: invitation.acceptedAt ?? undefined,
    revokedAt: invitation.revokedAt ?? undefined,
    createdAt: invitation.createdAt,
  };
}

export async function listTenantInvitations(overrides: Partial<InviteLifecycleDeps> = {}) {
  const deps = { ...inviteLifecycleDeps, ...overrides };
  const auth = await getInviteAuth(deps, overrides);
  if ("error" in auth) return { error: auth.error };

  const invitations = await deps.listInvitationsByTenant(auth.membership.tenantId.toString());
  const now = deps.now();
  return {
    invitations: invitations.map((invitation) => normalizeInvitationRecord(invitation, now)),
  };
}

export async function sendInvite(formData: FormData, overrides: Partial<InviteLifecycleDeps> = {}) {
  const email = formData.get("email") as string;
  const role = formData.get("role") as string;
  const tenantId = formData.get("tenantId") as string;

  const validated = inviteSchema.safeParse({ email, role, tenantId });
  if (!validated.success) {
    return { error: validated.error.issues[0].message };
  }

  const deps = { ...inviteLifecycleDeps, ...overrides };
  const auth = await getInviteAuth(deps, overrides);
  if ("error" in auth) return { error: auth.error };

  const hasTenantAccess = overrides.tenantAccessible
    ? deps.tenantAccessible(auth.membership.tenantId, validated.data.tenantId)
    : isTenantAccessible(auth.membership.tenantId, validated.data.tenantId);

  if (!hasTenantAccess) {
    return { error: "Insufficient permissions" };
  }

  if (
    !canManageOwnerInvites(
      validated.data.role,
      auth.membership.role,
      auth.membership.permissionOverrides as Record<string, boolean> | Map<string, boolean> | undefined,
      deps
    )
  ) {
    return { error: "Insufficient permissions" };
  }

  const tenant = await deps.findTenantById(validated.data.tenantId);
  if (!tenant) {
    return { error: "Tenant not found" };
  }

  const now = deps.now();
  const existingInvitation = await deps.findActiveInvitationByEmail(validated.data.tenantId, validated.data.email, now);
  if (existingInvitation) {
    return { error: "Invitation already sent" };
  }

  const token = deps.createToken();
  const expiresAt = computeInvitationExpiry(now);

  await deps.createInvitation({
    email: validated.data.email,
    role: validated.data.role,
    tenantId: new mongoose.Types.ObjectId(validated.data.tenantId),
    invitedBy: new mongoose.Types.ObjectId(auth.sessionUserId),
    token,
    expiresAt,
  });

  if (deps.sendInviteEmail) {
    await deps.sendInviteEmail({
      to: validated.data.email,
      businessName: tenant.name,
      token,
      tenantId: validated.data.tenantId,
      actorTenantId: auth.membership.tenantId.toString(),
    });
  } else {
    await sendEmail("invite",
      {
        to: validated.data.email,
        businessName: tenant.name,
        token,
      },
      {
        tenantId: validated.data.tenantId,
        actorTenantId: auth.membership.tenantId,
      }
    );
  }

  return { success: true, message: `Invitation sent to ${validated.data.email}.` };
}

export async function resendInvite(formData: FormData, overrides: Partial<InviteLifecycleDeps> = {}) {
  const validated = invitationIdSchema.safeParse({
    invitationId: formData.get("invitationId"),
  });
  if (!validated.success) {
    return { error: validated.error.issues[0].message };
  }

  const deps = { ...inviteLifecycleDeps, ...overrides };
  const auth = await getInviteAuth(deps, overrides);
  if ("error" in auth) return { error: auth.error };

  const tenantId = auth.membership.tenantId.toString();
  const invitation = await deps.findInvitationById(validated.data.invitationId, tenantId);
  if (!invitation) {
    return { error: "Invitation not found" };
  }

  if (
    !canManageOwnerInvites(
      invitation.role,
      auth.membership.role,
      auth.membership.permissionOverrides as Record<string, boolean> | Map<string, boolean> | undefined,
      deps
    )
  ) {
    return { error: "Insufficient permissions" };
  }

  const now = deps.now();
  const status = toInvitationStatus(invitation, now);
  if (status !== "pending") {
    return { error: "Only pending invitations can be resent" };
  }

  const tenant = await deps.findTenantById(tenantId);
  if (!tenant) {
    return { error: "Tenant not found" };
  }

  const token = deps.createToken();
  invitation.token = token;
  invitation.expiresAt = computeInvitationExpiry(now);

  await deps.persistInvitation(invitation);

  if (deps.sendInviteEmail) {
    await deps.sendInviteEmail({
      to: invitation.email,
      businessName: tenant.name,
      token,
      tenantId,
      actorTenantId: tenantId,
    });
  } else {
    await sendEmail("invite",
      {
        to: invitation.email,
        businessName: tenant.name,
        token,
      },
      {
        tenantId,
        actorTenantId: auth.membership.tenantId,
      }
    );
  }

  return { success: true, message: `Invitation resent to ${invitation.email}.` };
}

export async function revokeInvite(formData: FormData, overrides: Partial<InviteLifecycleDeps> = {}) {
  const validated = invitationIdSchema.safeParse({
    invitationId: formData.get("invitationId"),
  });
  if (!validated.success) {
    return { error: validated.error.issues[0].message };
  }

  const deps = { ...inviteLifecycleDeps, ...overrides };
  const auth = await getInviteAuth(deps, overrides);
  if ("error" in auth) return { error: auth.error };

  const tenantId = auth.membership.tenantId.toString();
  const invitation = await deps.findInvitationById(validated.data.invitationId, tenantId);
  if (!invitation) {
    return { error: "Invitation not found" };
  }

  if (
    !canManageOwnerInvites(
      invitation.role,
      auth.membership.role,
      auth.membership.permissionOverrides as Record<string, boolean> | Map<string, boolean> | undefined,
      deps
    )
  ) {
    return { error: "Insufficient permissions" };
  }

  const status = toInvitationStatus(invitation, deps.now());
  if (status !== "pending") {
    return { error: "Only pending invitations can be revoked" };
  }

  invitation.revokedAt = deps.now();
  invitation.revokedBy = new mongoose.Types.ObjectId(auth.sessionUserId);
  await deps.persistInvitation(invitation);

  return { success: true, message: `Invitation revoked for ${invitation.email}.` };
}

export async function acceptInvite(token: string, password: string, name: string) {
  const invitation = await Invitation.findOne({ token, acceptedAt: null, revokedAt: null });

  if (!invitation) {
    return { error: "Invalid or expired invitation" };
  }

  if (invitation.expiresAt < new Date()) {
    return { error: "Invitation expired" };
  }

  let user = await User.findOne({ email: invitation.email.toLowerCase() });

  if (!user) {
    user = await User.create({
      email: invitation.email.toLowerCase(),
      name,
      passwordHash: password,
      emailVerifiedAt: new Date(),
    });
  }

  await Membership.create({
    userId: user._id,
    tenantId: invitation.tenantId,
    role: invitation.role,
    branchIds: invitation.branchIds,
    invitedBy: invitation.invitedBy,
    acceptedAt: new Date(),
    status: "active",
  });

  invitation.acceptedAt = new Date();
  await invitation.save();

  return { success: true, userId: user._id };
}
