import assert from "node:assert/strict";
import test from "node:test";
import { buildLifecycleTransitionMetadata } from "@/lib/audit-trail";

test("audit metadata captures accounting transition changes", () => {
  const metadata = buildLifecycleTransitionMetadata("accounting-entry", "draft", "posted", ["status"]);

  assert.deepEqual(metadata.changedFields, ["status"]);
  assert.equal(metadata.summary, "accounting-entry status changed from draft to posted");
});

test("audit metadata captures proposal lifecycle transitions", () => {
  const metadata = buildLifecycleTransitionMetadata("proposal", "sent", "accepted", ["status"]);

  assert.deepEqual(metadata.changedFields, ["status"]);
  assert.equal(metadata.summary, "proposal status changed from sent to accepted");
});

test("audit metadata captures retainer close transition fields", () => {
  const metadata = buildLifecycleTransitionMetadata("retainer", "active", "closed", [
    "status",
    "closedAt",
    "closedById",
  ]);

  assert.deepEqual(metadata.changedFields, ["status", "closedAt", "closedById"]);
  assert.equal(metadata.summary, "retainer status changed from active to closed");
});
