import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import mongoose from "mongoose";
import { canAccessPermission } from "@/lib/utils/permissions";
import { isTenantAccessible } from "@/lib/utils/tenant-access";

test("permission checks honor role defaults and explicit deny/allow overrides", () => {
  assert.equal(canAccessPermission("inventory.purchaseOrders:view", "cashier"), false);
  assert.equal(
    canAccessPermission("inventory.purchaseOrders:view", "cashier", {
      "inventory.purchaseOrders:view": true,
    }),
    true
  );
  assert.equal(
    canAccessPermission("settings.branches:view", "manager", {
      "settings.branches:view": false,
    }),
    false
  );
  assert.equal(
    canAccessPermission("sales.proposals:view", "manager", {
      "sales.proposals:view": false,
    }),
    false
  );
});

test("tenant scope helper blocks cross-tenant access attempts", () => {
  const currentTenantId = new mongoose.Types.ObjectId();
  const requestedTenantId = new mongoose.Types.ObjectId();

  assert.equal(isTenantAccessible(currentTenantId, currentTenantId.toString()), true);
  assert.equal(isTenantAccessible(currentTenantId, requestedTenantId.toString()), false);
});

test("privileged actions and report export route use shared authorization guards", () => {
  const guardedFiles: Array<[string, RegExp]> = [
    ["src/lib/actions/branches.ts", /getAuthorizedSessionMembership\("settings\.branches:view"\)/],
    ["src/lib/actions/purchase-orders.ts", /getAuthorizedSessionMembership\("inventory\.purchaseOrders:view"\)/],
    ["src/lib/actions/proposals.ts", /getAuthorizedSessionMembership\("sales\.proposals:view"\)/],
    ["src/lib/actions/retainers.ts", /getAuthorizedSessionMembership\("sales\.retainers:view"\)/],
    ["src/lib/actions/accounting.ts", /getAuthorizedSessionMembership\("accounting:view"\)/],
    ["src/lib/actions/invite.ts", /getAuthorizedSessionMembership\("settings\.team:view"\)/],
    ["src/lib/actions/invite.ts", /isTenantAccessible\(/],
    ["src/lib/media/upload.ts", /getAuthorizedSessionMembership\("settings\.media:view"\)/],
    ["src/app/api/reports/export/route.ts", /getAuthorizedSessionMembership\("reports:view"\)/],
    ["src/app/api/reports/export/route.ts", /REPORT_PERMISSION_BY_TYPE/],
  ];

  for (const [relativePath, pattern] of guardedFiles) {
    const fullPath = path.join(process.cwd(), relativePath);
    const source = readFileSync(fullPath, "utf8");
    assert.match(source, pattern, `${relativePath} should enforce shared authorization guards`);
  }
});
