import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import mongoose from "mongoose";
import { reportCriticalFailure } from "@/lib/ops-monitoring";

test("critical failure monitoring redacts sensitive metadata and blocks cross-tenant alerting", async () => {
  const tenantId = new mongoose.Types.ObjectId();
  const actorTenantId = new mongoose.Types.ObjectId();
  const logs: Array<{ message: string; payload: string }> = [];
  const sentEmails: unknown[] = [];

  const result = await reportCriticalFailure(
    {
      domain: "accounting",
      operation: "create-accounting-entry",
      tenantId,
      actorTenantId,
      error: new Error("db write failed"),
      metadata: {
        lowStockItemsCount: 2,
        customerEmail: "sensitive@example.com",
      },
    },
    {
      now: () => new Date("2026-01-01T00:00:00.000Z"),
      randomId: () => "failure-1",
      getAlertEmail: () => "alerts@example.com",
      logError: (message, payload) => {
        logs.push({ message, payload });
      },
      sendEmailFn: async (...args) => {
        sentEmails.push(args);
        return { success: true, data: {} };
      },
    }
  );

  assert.equal(result.alerted, false);
  assert.equal(result.reason, "cross-tenant-alert-blocked");
  assert.equal(sentEmails.length, 0);
  assert.equal(logs.length, 1);

  const payload = JSON.parse(logs[0].payload) as {
    alertSuppressedReason?: string;
    metadata?: { customerEmail?: string; lowStockItemsCount?: number };
  };
  assert.match(payload.alertSuppressedReason || "", /cross-tenant/);
  assert.equal(payload.metadata?.customerEmail, "[redacted]");
  assert.equal(payload.metadata?.lowStockItemsCount, 2);
});

test("critical failure monitoring sends alert email when tenant context is authorized", async () => {
  const tenantId = new mongoose.Types.ObjectId();
  const sentEmails: unknown[][] = [];

  const result = await reportCriticalFailure(
    {
      domain: "pos-checkout",
      operation: "process-sale",
      tenantId,
      actorTenantId: tenantId,
      error: new Error("invoice create failed"),
    },
    {
      getAlertEmail: () => "alerts@example.com",
      logError: () => {},
      sendEmailFn: async (...args) => {
        sentEmails.push(args);
        return { success: true, data: {} };
      },
    }
  );

  assert.equal(result.alerted, true);
  assert.equal(sentEmails.length, 1);
  assert.equal(sentEmails[0][0], "critical-failure");
  assert.equal(
    (sentEmails[0][2] as { tenantId: mongoose.Types.ObjectId | string }).tenantId.toString(),
    tenantId.toString()
  );
});

test("critical paths include monitoring hooks for accounting checkout and low-stock background jobs", () => {
  const hooks: Array<[string, RegExp[]]> = [
    [
      "src/lib/actions/pos.ts",
      [/reportCriticalFailure\(/, /domain:\s*"pos-checkout"/, /operation:\s*"process-sale"/],
    ],
    [
      "src/lib/actions/accounting.ts",
      [
        /operation:\s*"create-accounting-entry"/,
        /operation:\s*"transition-accounting-entry-status"/,
        /operation:\s*"close-accounting-period"/,
      ],
    ],
    [
      "src/lib/utils/stock-email.ts",
      [/reportCriticalFailure\(/, /operation:\s*"send-low-stock-emails"/, /operation:\s*"send-low-stock-alert-email"/],
    ],
    [
      "src/app/api/cron/low-stock/route.ts",
      [/reportCriticalFailure\(/, /operation:\s*"cron-low-stock-route"/],
    ],
  ];

  for (const [relativePath, patterns] of hooks) {
    const source = readFileSync(path.join(process.cwd(), relativePath), "utf8");
    for (const pattern of patterns) {
      assert.match(source, pattern, `${relativePath} should include monitoring hook pattern ${pattern}`);
    }
  }
});
