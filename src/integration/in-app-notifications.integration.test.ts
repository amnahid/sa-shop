import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import mongoose from "mongoose";
import { sendInAppNotification } from "@/lib/in-app-notifications";

test("in-app dispatch writes one inbox entry per unique recipient", async () => {
  const tenantId = new mongoose.Types.ObjectId();
  const userA = new mongoose.Types.ObjectId();
  const userB = new mongoose.Types.ObjectId();
  const inserted: unknown[] = [];

  const result = await sendInAppNotification(
    {
      tenantId,
      recipientUserIds: [userA, userA, userB],
      type: "test.event",
      title: "Test title",
      message: "Test message",
    },
    {
      insertMany: async (entries) => {
        inserted.push(...entries);
        return { insertedCount: entries.length };
      },
    }
  );

  assert.equal(result.success, true);
  assert.equal(result.insertedCount, 2);
  assert.equal(inserted.length, 2);
});

test("in-app dispatch rejects non in-app template channel", async () => {
  const result = await sendInAppNotification(
    {
      tenantId: new mongoose.Types.ObjectId(),
      recipientUserIds: [new mongoose.Types.ObjectId()],
      templateKey: "sms-alert",
      templateVariables: { foo: "bar" },
    },
    {
      resolveTemplate: async () => ({
        template: {
          title: "SMS title",
          message: "SMS message",
          channel: "sms",
        },
      }),
    }
  );

  assert.equal(result.success, false);
  assert.match(result.error, /not configured for in-app/);
});

test("notification actions and triggers remain tenant and recipient scoped", () => {
  const sourceChecks: Array<[string, RegExp[]]> = [
    [
      "src/lib/actions/notifications.ts",
      [/tenantId:\s*auth\.membership\.tenantId/, /recipientUserId:\s*new mongoose\.Types\.ObjectId\(auth\.sessionUserId\)/],
    ],
    [
      "src/lib/actions/invite.ts",
      [/sendInAppNotification\(/, /type:\s*"team\.invite\.created"/, /type:\s*"team\.invite\.accepted"/],
    ],
    [
      "src/lib/utils/stock-email.ts",
      [/sendInAppNotification\(/, /type:\s*"inventory\.low_stock"/],
    ],
    [
      "src/lib/ops-monitoring.ts",
      [/sendInAppNotification\(/, /type:\s*"ops\.critical_failure"/],
    ],
  ];

  for (const [relativePath, patterns] of sourceChecks) {
    const source = readFileSync(path.join(process.cwd(), relativePath), "utf8");
    for (const pattern of patterns) {
      assert.match(source, pattern, `${relativePath} should include pattern ${pattern}`);
    }
  }
});

