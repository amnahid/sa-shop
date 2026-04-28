import assert from "node:assert/strict";
import test from "node:test";
import { updateTenantSettings } from "@/lib/actions/team";
import { parseTenantSettingsUpdate } from "@/lib/actions/team-helpers";

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

test("business settings validation rejects invalid logo URL and invalid currency code", () => {
  const formData = buildBusinessFormData();
  formData.set("logoUrl", "javascript:alert(1)");
  formData.set("baseCurrency", "US");

  const parsed = parseTenantSettingsUpdate(formData);
  assert.equal(parsed.success, false);
  if (parsed.success) return;

  assert.equal(parsed.form, "business");
  assert.ok(parsed.fieldErrors?.logoUrl?.length);
  assert.ok(parsed.fieldErrors?.baseCurrency?.length);
});

test("updateTenantSettings returns permission error without mutating tenant", async () => {
  const formData = buildBusinessFormData();
  let called = false;

  const result = await updateTenantSettings(formData, {
    getCurrentMembership: async () =>
      ({
        membership: {
          tenantId: "tenant-a",
          role: "manager",
          permissionOverrides: {},
        },
      }),
    canAccess: () => false,
    updateTenantById: async () => {
      called = true;
    },
  });

  assert.equal(result.success, false);
  if (result.success) return;
  assert.equal(result.error, "Insufficient permissions");
  assert.equal(called, false);
});

test("updateTenantSettings persists validated business settings payload", async () => {
  const formData = buildBusinessFormData();
  formData.set("logoUrl", "https://cdn.example.com/logo.png");
  formData.set("vatRegistered", "on");
  formData.set("email", "owner@example.com");

  let updatedTenantId = "";
  let updatedPayload: Record<string, unknown> | null = null;
  let revalidated = false;

  const result = await updateTenantSettings(formData, {
    getCurrentMembership: async () =>
      ({
        membership: {
          tenantId: "tenant-a",
          role: "owner",
          permissionOverrides: {},
        },
      }),
    canAccess: () => true,
    updateTenantById: async (tenantId, payload) => {
      updatedTenantId = tenantId.toString();
      updatedPayload = payload;
    },
    revalidateSettingsPath: () => {
      revalidated = true;
    },
  });

  assert.equal(result.success, true);
  if (!result.success) return;
  assert.equal(result.form, "business");
  assert.equal(updatedTenantId, "tenant-a");
  assert.equal(updatedPayload?.baseCurrency, "SAR");
  assert.equal(updatedPayload?.timezone, "Asia/Riyadh");
  assert.equal(updatedPayload?.logoUrl, "https://cdn.example.com/logo.png");
  assert.equal(updatedPayload?.vatRegistered, true);
  assert.equal(revalidated, true);
});

test("updateTenantSettings persists ZATCA certificate settings", async () => {
  const formData = new FormData();
  formData.set("settingsForm", "zatca");
  formData.set("zatcaPhase", "2");
  formData.set("zatcaCertificateId", "cert_123-abc");
  formData.set("zatcaCsid", "csid");
  formData.set("zatcaSolutionId", "solution");

  let updatedPayload: Record<string, unknown> | null = null;

  const result = await updateTenantSettings(formData, {
    getCurrentMembership: async () =>
      ({
        membership: {
          tenantId: "tenant-z",
          role: "owner",
          permissionOverrides: {},
        },
      }),
    canAccess: () => true,
    updateTenantById: async (_, payload) => {
      updatedPayload = payload;
    },
    revalidateSettingsPath: () => {},
  });

  assert.equal(result.success, true);
  if (!result.success) return;
  assert.equal(result.form, "zatca");
  assert.equal(updatedPayload?.zatcaPhase, 2);
  assert.equal(updatedPayload?.zatcaCertificateId, "cert_123-abc");
});
