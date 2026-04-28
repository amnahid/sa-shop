import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import mongoose from "mongoose";
import {
  resolveEmailTemplateForDelivery,
  resolveNotificationTemplateForDelivery,
} from "@/lib/template-delivery";

test("saved email template resolves and renders for an authorized tenant", async () => {
  const tenantId = new mongoose.Types.ObjectId();

  const resolved = await resolveEmailTemplateForDelivery({
    tenantId,
    actorTenantId: tenantId,
    templateKey: "invite",
    variables: {
      name: "Mona",
      inviteUrl: "https://app.test/invite/token",
    },
    requireTemplate: true,
    findTemplate: async () => ({
      subject: "Welcome {{name}}",
      htmlBody: "Click <a href='{{inviteUrl}}'>here</a>",
      textBody: "Open {{inviteUrl}}",
    }),
  });

  assert.equal("error" in resolved, false);
  assert.equal(resolved.template?.subject, "Welcome Mona");
  assert.match(resolved.template?.htmlBody || "", /https:\/\/app\.test\/invite\/token/);
  assert.equal(resolved.template?.textBody, "Open https://app.test/invite/token");
});

test("template delivery blocks cross-tenant send attempts", async () => {
  const resolved = await resolveEmailTemplateForDelivery({
    tenantId: new mongoose.Types.ObjectId(),
    actorTenantId: new mongoose.Types.ObjectId(),
    templateKey: "invite",
    variables: {},
    requireTemplate: true,
    findTemplate: async () => ({
      subject: "Hello",
      htmlBody: "Body",
    }),
  });

  assert.equal("error" in resolved, true);
  assert.match((resolved as { error: string }).error, /cross-tenant/);
});

test("template delivery returns clear errors for missing template and missing variables", async () => {
  const tenantId = new mongoose.Types.ObjectId();

  const missingTemplate = await resolveEmailTemplateForDelivery({
    tenantId,
    actorTenantId: tenantId,
    templateKey: "invoice-receipt",
    variables: {},
    requireTemplate: true,
    findTemplate: async () => null,
  });

  assert.equal("error" in missingTemplate, true);
  assert.match((missingTemplate as { error: string }).error, /not found/);

  const missingVariables = await resolveEmailTemplateForDelivery({
    tenantId,
    actorTenantId: tenantId,
    templateKey: "invite",
    variables: { name: "Mona" },
    requireTemplate: true,
    findTemplate: async () => ({
      subject: "Hi {{name}}",
      htmlBody: "Open {{inviteUrl}}",
    }),
  });

  assert.equal("error" in missingVariables, true);
  assert.match((missingVariables as { error: string }).error, /missing variables: inviteUrl/);
});

test("notification template resolution supports variable substitution", async () => {
  const tenantId = new mongoose.Types.ObjectId();

  const resolved = await resolveNotificationTemplateForDelivery({
    tenantId,
    actorTenantId: tenantId,
    templateKey: "payment-reminder",
    variables: { customerName: "Mona", amount: "100.00" },
    requireTemplate: true,
    findTemplate: async () => ({
      title: "Reminder for {{customerName}}",
      message: "Amount due: {{amount}}",
      channel: "in_app",
    }),
  });

  assert.equal("error" in resolved, false);
  assert.equal(resolved.template?.title, "Reminder for Mona");
  assert.equal(resolved.template?.message, "Amount due: 100.00");
  assert.equal(resolved.template?.channel, "in_app");
});

test("outbound send flows include tenant-aware template context", () => {
  const sendFlows: Array<[string, RegExp[]]> = [
    [
      "src/lib/actions/invite.ts",
      [/sendEmail\("invite"/, /tenantId:\s*validated\.data\.tenantId/, /actorTenantId:\s*auth\.membership\.tenantId/],
    ],
    [
      "src/lib/actions/pos.ts",
      [/sendInvoiceReceipt\(/, /tenantId/, /actorTenantId:\s*membership\.tenantId/],
    ],
    [
      "src/lib/utils/stock-email.ts",
      [/sendLowStockAlert\(/, /tenantId:\s*tenant\._id/],
    ],
  ];

  for (const [relativePath, patterns] of sendFlows) {
    const source = readFileSync(path.join(process.cwd(), relativePath), "utf8");
    for (const pattern of patterns) {
      assert.match(source, pattern, `${relativePath} should provide tenant-aware send context`);
    }
  }
});
