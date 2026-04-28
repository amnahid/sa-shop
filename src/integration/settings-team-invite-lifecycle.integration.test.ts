import assert from "node:assert/strict";
import test from "node:test";
import mongoose from "mongoose";
import { getInvitationStatus } from "@/lib/actions/invite-helpers";
import { listTenantInvitations, resendInvite, revokeInvite, sendInvite } from "@/lib/actions/invite";

function createAuth(role: "owner" | "manager" | "cashier" = "owner") {
  return {
    sessionUserId: new mongoose.Types.ObjectId().toString(),
    membership: {
      tenantId: new mongoose.Types.ObjectId().toString(),
      role,
      permissionOverrides: {},
    },
  };
}

test("getInvitationStatus resolves invitation lifecycle states", () => {
  const now = new Date("2026-01-10T00:00:00.000Z");

  assert.equal(getInvitationStatus({ expiresAt: new Date("2026-01-11T00:00:00.000Z") }, now), "pending");
  assert.equal(
    getInvitationStatus(
      {
        acceptedAt: new Date("2026-01-09T00:00:00.000Z"),
        expiresAt: new Date("2026-01-11T00:00:00.000Z"),
      },
      now
    ),
    "accepted"
  );
  assert.equal(
    getInvitationStatus(
      {
        revokedAt: new Date("2026-01-08T00:00:00.000Z"),
        expiresAt: new Date("2026-01-11T00:00:00.000Z"),
      },
      now
    ),
    "revoked"
  );
  assert.equal(getInvitationStatus({ expiresAt: new Date("2026-01-09T00:00:00.000Z") }, now), "expired");
});

test("sendInvite blocks owner invitations without admin-manage permission", async () => {
  const auth = createAuth("manager");
  const formData = new FormData();
  formData.set("email", "owner@example.com");
  formData.set("role", "owner");
  formData.set("tenantId", auth.membership.tenantId);

  let created = false;

  const result = await sendInvite(formData, {
    getAuth: async () => auth,
    tenantAccessible: () => true,
    canAccess: (permissionKey) => permissionKey === "settings.team:view",
    findTenantById: async () => ({ name: "Tenant One" }),
    findActiveInvitationByEmail: async () => null,
    createInvitation: async () => {
      created = true;
    },
    sendInviteEmail: async () => {},
  });

  assert.deepEqual(result, { error: "Insufficient permissions" });
  assert.equal(created, false);
});

test("sendInvite blocks cross-tenant invite attempts", async () => {
  const auth = createAuth("owner");
  const formData = new FormData();
  formData.set("email", "tenant-mismatch@example.com");
  formData.set("role", "manager");
  formData.set("tenantId", new mongoose.Types.ObjectId().toString());

  let created = false;

  const result = await sendInvite(formData, {
    getAuth: async () => auth,
    tenantAccessible: () => false,
    findTenantById: async () => ({ name: "Tenant One" }),
    findActiveInvitationByEmail: async () => null,
    createInvitation: async () => {
      created = true;
    },
    sendInviteEmail: async () => {},
  });

  assert.deepEqual(result, { error: "Insufficient permissions" });
  assert.equal(created, false);
});

test("resendInvite refreshes pending invitation token and expiry", async () => {
  const initialExpiry = new Date("2026-02-01T00:00:00.000Z");
  const now = new Date("2026-01-10T12:00:00.000Z");
  const invitation = {
    _id: "inv-1",
    tenantId: "tenant-1",
    email: "team@example.com",
    role: "cashier" as const,
    invitedBy: "user-2",
    token: "old-token",
    expiresAt: initialExpiry,
    acceptedAt: null,
    revokedAt: null,
  };

  let saved = false;
  let emailedToken = "";

  const formData = new FormData();
  formData.set("invitationId", "inv-1");

  const result = await resendInvite(formData, {
    getAuth: async () => createAuth("owner"),
    now: () => now,
    createToken: () => "new-token",
    findInvitationById: async () => invitation,
    findTenantById: async () => ({ name: "Tenant One" }),
    persistInvitation: async () => {
      saved = true;
    },
    sendInviteEmail: async ({ token }) => {
      emailedToken = token;
    },
  });

  assert.equal("success" in result, true);
  assert.equal(saved, true);
  assert.equal(invitation.token, "new-token");
  assert.equal(invitation.expiresAt.toISOString(), "2026-01-17T12:00:00.000Z");
  assert.equal(emailedToken, "new-token");
});

test("resendInvite blocks owner invitations without admin-manage permission", async () => {
  const auth = createAuth("manager");
  const formData = new FormData();
  formData.set("invitationId", "inv-1");

  const result = await resendInvite(formData, {
    getAuth: async () => auth,
    findInvitationById: async () => ({
      _id: "inv-1",
      tenantId: auth.membership.tenantId,
      email: "owner@example.com",
      role: "owner",
      invitedBy: auth.sessionUserId,
      token: "token-1",
      expiresAt: new Date("2026-01-12T00:00:00.000Z"),
      acceptedAt: null,
      revokedAt: null,
    }),
    canAccess: () => false,
    findTenantById: async () => ({ name: "Tenant One" }),
    persistInvitation: async () => {},
    sendInviteEmail: async () => {},
  });

  assert.deepEqual(result, { error: "Insufficient permissions" });
});

test("revokeInvite only revokes pending invitations", async () => {
  const now = new Date("2026-01-10T12:00:00.000Z");
  const pendingInvitation = {
    _id: "inv-2",
    tenantId: "tenant-1",
    email: "member@example.com",
    role: "manager" as const,
    invitedBy: "user-2",
    expiresAt: new Date("2026-01-12T00:00:00.000Z"),
    acceptedAt: null,
    revokedAt: null as Date | null,
    revokedBy: null as string | null,
  };

  let saved = false;

  const pendingFormData = new FormData();
  pendingFormData.set("invitationId", "inv-2");

  const pendingResult = await revokeInvite(pendingFormData, {
    getAuth: async () => createAuth("owner"),
    now: () => now,
    findInvitationById: async () => pendingInvitation,
    persistInvitation: async () => {
      saved = true;
    },
  });

  assert.equal("success" in pendingResult, true);
  assert.equal(saved, true);
  assert.equal(pendingInvitation.revokedAt?.toISOString(), now.toISOString());
  assert.ok(pendingInvitation.revokedBy);

  const expiredFormData = new FormData();
  expiredFormData.set("invitationId", "inv-3");

  const expiredResult = await revokeInvite(expiredFormData, {
    getAuth: async () => createAuth("owner"),
    now: () => now,
    findInvitationById: async () => ({
      ...pendingInvitation,
      _id: "inv-3",
      expiresAt: new Date("2026-01-08T00:00:00.000Z"),
      revokedAt: null,
    }),
    persistInvitation: async () => {},
  });

  assert.deepEqual(expiredResult, { error: "Only pending invitations can be revoked" });
});

test("revokeInvite blocks owner invitations without admin-manage permission", async () => {
  const auth = createAuth("manager");
  const formData = new FormData();
  formData.set("invitationId", "inv-owner");

  const result = await revokeInvite(formData, {
    getAuth: async () => auth,
    findInvitationById: async () => ({
      _id: "inv-owner",
      tenantId: auth.membership.tenantId,
      email: "owner@example.com",
      role: "owner",
      invitedBy: auth.sessionUserId,
      expiresAt: new Date("2026-01-14T00:00:00.000Z"),
      acceptedAt: null,
      revokedAt: null,
    }),
    canAccess: () => false,
    persistInvitation: async () => {},
  });

  assert.deepEqual(result, { error: "Insufficient permissions" });
});

test("listTenantInvitations maps statuses from invitation records", async () => {
  const now = new Date("2026-01-10T00:00:00.000Z");

  const result = await listTenantInvitations({
    getAuth: async () => createAuth("owner"),
    now: () => now,
    listInvitationsByTenant: async () => [
      {
        _id: "pending",
        tenantId: "tenant-1",
        email: "pending@example.com",
        role: "cashier",
        invitedBy: "user-2",
        expiresAt: new Date("2026-01-11T00:00:00.000Z"),
      },
      {
        _id: "accepted",
        tenantId: "tenant-1",
        email: "accepted@example.com",
        role: "manager",
        invitedBy: "user-2",
        expiresAt: new Date("2026-01-11T00:00:00.000Z"),
        acceptedAt: new Date("2026-01-09T00:00:00.000Z"),
      },
      {
        _id: "expired",
        tenantId: "tenant-1",
        email: "expired@example.com",
        role: "cashier",
        invitedBy: "user-2",
        expiresAt: new Date("2026-01-08T00:00:00.000Z"),
      },
      {
        _id: "revoked",
        tenantId: "tenant-1",
        email: "revoked@example.com",
        role: "manager",
        invitedBy: "user-2",
        expiresAt: new Date("2026-01-11T00:00:00.000Z"),
        revokedAt: new Date("2026-01-09T00:00:00.000Z"),
      },
    ],
  });

  assert.equal("invitations" in result, true);
  if (!("invitations" in result)) return;

  assert.deepEqual(
    result.invitations.map((item) => item.status),
    ["pending", "accepted", "expired", "revoked"]
  );
});
