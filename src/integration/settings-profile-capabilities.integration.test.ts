import assert from "node:assert/strict";
import test from "node:test";
import {
  getSafePasswordActionError,
  getSafeProfileActionError,
  parsePasswordChange,
  parseProfileUpdate,
} from "@/lib/actions/team-helpers";

function createProfileFormData(overrides?: Partial<Record<"name" | "phone" | "avatarUrl", string>>) {
  const formData = new FormData();
  formData.set("name", overrides?.name ?? "Mona Ahmed");
  formData.set("phone", overrides?.phone ?? "+966500000000");
  if (overrides?.avatarUrl !== undefined) {
    formData.set("avatarUrl", overrides.avatarUrl);
  }
  return formData;
}

function createPasswordFormData(
  overrides?: Partial<Record<"currentPassword" | "newPassword" | "confirmPassword", string>>
) {
  const formData = new FormData();
  formData.set("currentPassword", overrides?.currentPassword ?? "CurrentPassword123");
  formData.set("newPassword", overrides?.newPassword ?? "NewPassword123");
  formData.set("confirmPassword", overrides?.confirmPassword ?? "NewPassword123");
  return formData;
}

test("parseProfileUpdate accepts valid avatar URL and managed media path", () => {
  const externalAvatar = createProfileFormData({ avatarUrl: "https://cdn.example.com/avatar.png" });
  const localAvatar = createProfileFormData({ avatarUrl: "/uploads/media/tenant-a/avatar.png" });

  const externalParsed = parseProfileUpdate(externalAvatar);
  const localParsed = parseProfileUpdate(localAvatar);

  assert.equal(externalParsed.success, true);
  assert.equal(localParsed.success, true);
});

test("parseProfileUpdate rejects unsafe avatar URL values", () => {
  const javascriptAvatar = createProfileFormData({ avatarUrl: "javascript:alert(1)" });
  const traversalAvatar = createProfileFormData({ avatarUrl: "/uploads/media/../../etc/passwd" });

  const javascriptParsed = parseProfileUpdate(javascriptAvatar);
  const traversalParsed = parseProfileUpdate(traversalAvatar);

  assert.equal(javascriptParsed.success, false);
  if (javascriptParsed.success) return;
  assert.ok(javascriptParsed.fieldErrors.avatarUrl?.length);

  assert.equal(traversalParsed.success, false);
  if (traversalParsed.success) return;
  assert.ok(traversalParsed.fieldErrors.avatarUrl?.length);
});

test("parsePasswordChange returns targeted field errors", () => {
  const formData = createPasswordFormData({
    newPassword: "lowercaseonly",
    confirmPassword: "different",
  });

  const parsed = parsePasswordChange(formData);

  assert.equal(parsed.success, false);
  if (parsed.success) return;
  assert.equal(parsed.error, "Invalid password update");
  assert.ok(parsed.fieldErrors.newPassword?.length);
  assert.ok(parsed.fieldErrors.confirmPassword?.length);
});

test("safe error mapping returns non-sensitive profile and password messages", () => {
  assert.equal(
    getSafeProfileActionError("Unauthorized"),
    "Unable to verify your account. Please sign in again."
  );
  assert.equal(
    getSafePasswordActionError("No active membership"),
    "Unable to verify your account. Please sign in again."
  );
  assert.equal(
    getSafeProfileActionError("Insufficient permissions"),
    "You do not have access to update profile settings."
  );
  assert.equal(
    getSafePasswordActionError("Insufficient permissions"),
    "You do not have access to update password settings."
  );
});
