import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import mongoose from "mongoose";
import {
  getSafePasswordActionError,
  getSafeProfileActionError,
} from "@/lib/actions/team-helpers";
import { updateTenantSettings } from "@/lib/actions/team";
import { parseTenantSettingsUpdate } from "@/lib/actions/team-helpers";
import { resendInvite, revokeInvite, sendInvite } from "@/lib/actions/invite";
import { canAccessPermission } from "@/lib/utils/permissions";

function buildBusinessFormData() {
  const formData = new FormData();
  formData.set("settingsForm", "business");
  formData.set("name", "Sample Shop");
  formData.set("nameAr", "متجر");
  formData.set("defaultLanguage", "en");
  formData.set("baseCurrency", "SAR");
  formData.set("timezone", "Asia/Riyadh");
  return formData;
}

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

test("settings permissions preserve view/manage boundaries with overrides", () => {
  assert.equal(canAccessPermission("settings:view", "manager"), true);
  assert.equal(canAccessPermission("settings:view", "cashier"), false);
  assert.equal(canAccessPermission("settings.admin.manage", "owner"), true);
  assert.equal(canAccessPermission("settings.admin.manage", "manager"), false);

  assert.equal(canAccessPermission("settings.admin.manage", "manager", { "settings.admin.manage": true }), true);
  assert.equal(canAccessPermission("settings:view", "owner", { "settings:view": false }), false);
});

test("tenant settings update returns requested form on membership authorization failure", async () => {
  const result = await updateTenantSettings(buildBusinessFormData(), {
    getCurrentMembership: async () => ({ error: "Unauthorized" }),
  });

  assert.equal(result.success, false);
  if (result.success) return;
  assert.equal(result.form, "business");
  assert.equal(result.error, "Unauthorized");
});

test("tenant settings parser blocks invalid timezone and language values", () => {
  const formData = buildBusinessFormData();
  formData.set("timezone", "Mars/Phobos");
  formData.set("defaultLanguage", "fr");

  const parsed = parseTenantSettingsUpdate(formData);
  assert.equal(parsed.success, false);
  if (parsed.success) return;

  assert.equal(parsed.form, "business");
  assert.equal(parsed.error, "Invalid business settings");
  assert.ok(parsed.fieldErrors?.timezone?.length);
  assert.ok(parsed.fieldErrors?.defaultLanguage?.length);
});

test("branch lifecycle actions keep create/deactivate/reactivate guardrails", () => {
  const source = readFileSync(path.join(process.cwd(), "src/lib/actions/branches.ts"), "utf8");

  assert.match(source, /export async function createBranch/);
  assert.match(source, /export async function deactivateBranch/);
  assert.match(source, /export async function reactivateBranch/);
  assert.match(source, /getAuthorizedSessionMembership\("settings\.branches:view"\)/);
  assert.match(source, /Head office cannot be deactivated/);
  assert.match(source, /Branch is already inactive/);
  assert.match(source, /Inactive branch not found/);
});

test("team invite owner contracts require admin-manage, but manager invites can proceed", async () => {
  const auth = createAuth("manager");
  const tenantId = auth.membership.tenantId;
  let createCalls = 0;

  const ownerInviteForm = new FormData();
  ownerInviteForm.set("email", "owner@example.com");
  ownerInviteForm.set("role", "owner");
  ownerInviteForm.set("tenantId", tenantId);

  const ownerResult = await sendInvite(ownerInviteForm, {
    getAuth: async () => auth,
    tenantAccessible: () => true,
    canAccess: () => false,
    findTenantById: async () => ({ name: "Tenant One" }),
    findActiveInvitationByEmail: async () => null,
    createInvitation: async () => {
      createCalls += 1;
    },
    sendInviteEmail: async () => {},
  });

  assert.deepEqual(ownerResult, { error: "Insufficient permissions" });

  const managerInviteForm = new FormData();
  managerInviteForm.set("email", "manager@example.com");
  managerInviteForm.set("role", "manager");
  managerInviteForm.set("tenantId", tenantId);

  const managerResult = await sendInvite(managerInviteForm, {
    getAuth: async () => auth,
    tenantAccessible: () => true,
    canAccess: () => false,
    findTenantById: async () => ({ name: "Tenant One" }),
    findActiveInvitationByEmail: async () => null,
    createInvitation: async () => {
      createCalls += 1;
    },
    sendInviteEmail: async () => {},
  });

  assert.equal("success" in managerResult, true);
  assert.equal(createCalls, 1);
});

test("team invite lifecycle only allows pending invitations for resend and revoke", async () => {
  const auth = createAuth("owner");
  const now = new Date("2026-01-10T12:00:00.000Z");
  const invitation = {
    _id: "inv-accepted",
    tenantId: auth.membership.tenantId,
    email: "member@example.com",
    role: "manager" as const,
    invitedBy: auth.sessionUserId,
    token: "token-1",
    expiresAt: new Date("2026-01-20T00:00:00.000Z"),
    acceptedAt: new Date("2026-01-09T00:00:00.000Z"),
    revokedAt: null,
  };

  const resendForm = new FormData();
  resendForm.set("invitationId", invitation._id);
  const resendResult = await resendInvite(resendForm, {
    getAuth: async () => auth,
    now: () => now,
    findInvitationById: async () => invitation,
    findTenantById: async () => ({ name: "Tenant One" }),
    persistInvitation: async () => {},
    sendInviteEmail: async () => {},
  });

  assert.deepEqual(resendResult, { error: "Only pending invitations can be resent" });

  const revokeForm = new FormData();
  revokeForm.set("invitationId", invitation._id);
  const revokeResult = await revokeInvite(revokeForm, {
    getAuth: async () => auth,
    now: () => now,
    findInvitationById: async () => invitation,
    persistInvitation: async () => {},
  });

  assert.deepEqual(revokeResult, { error: "Only pending invitations can be revoked" });
});

test("profile/password feedback mappers provide safe unauthorized, permission, and fallback responses", () => {
  assert.equal(
    getSafeProfileActionError("Unauthorized"),
    "Unable to verify your account. Please sign in again."
  );
  assert.equal(
    getSafePasswordActionError("Insufficient permissions"),
    "You do not have access to update password settings."
  );
  assert.equal(
    getSafeProfileActionError("PERSISTENCE_FAILURE"),
    "Unable to update profile details right now. Please try again."
  );
  assert.equal(
    getSafePasswordActionError("PERSISTENCE_FAILURE"),
    "Unable to update password right now. Please try again."
  );
});

test("profile/password actions preserve form-tagged feedback pathways", () => {
  const source = readFileSync(path.join(process.cwd(), "src/lib/actions/team.ts"), "utf8");

  assert.match(source, /export async function updateProfile/);
  assert.match(source, /form:\s*PROFILE_FORM_NAME/);
  assert.match(source, /getSafeProfileActionError\("Unauthorized"\)/);
  assert.match(source, /getSafeProfileActionError\("Insufficient permissions"\)/);

  assert.match(source, /export async function changePassword/);
  assert.match(source, /form:\s*PASSWORD_FORM_NAME/);
  assert.match(source, /getSafePasswordActionError\("Unauthorized"\)/);
  assert.match(source, /getSafePasswordActionError\("Insufficient permissions"\)/);
});
