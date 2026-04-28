import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

test("settings team and admin pages render invitation lifecycle sections", () => {
  const files = [
    "src/app/(dashboard)/settings/team/page.tsx",
    "src/app/(dashboard)/settings/admin/page.tsx",
  ];

  for (const relativePath of files) {
    const source = readFileSync(path.join(process.cwd(), relativePath), "utf8");
    assert.match(source, /Invitations/);
    assert.match(source, /pending|accepted|expired|revoked/);
    assert.match(source, /resendInvite/);
    assert.match(source, /revokeInvite/);
  }
});
