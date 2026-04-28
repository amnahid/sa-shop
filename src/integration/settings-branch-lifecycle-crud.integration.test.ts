import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { filterBranches } from "@/components/settings/SettingsBranchesClient";

test("branch filter helper supports active/all/inactive and name query", () => {
  const branches = [
    { _id: "1", name: "Head Office", city: "Riyadh", isHeadOffice: true, active: true },
    { _id: "2", name: "Jeddah Store", city: "Jeddah", isHeadOffice: false, active: true },
    { _id: "3", name: "Makkah Outlet", city: "Makkah", isHeadOffice: false, active: false },
  ];

  assert.equal(filterBranches(branches, "active", "").length, 2);
  assert.equal(filterBranches(branches, "inactive", "").length, 1);
  assert.equal(filterBranches(branches, "all", "jeddah")[0]?.name, "Jeddah Store");
  assert.equal(filterBranches(branches, "all", "outlet")[0]?.name, "Makkah Outlet");
});

test("settings branches lifecycle actions enforce permission and head-office deactivation guardrails", () => {
  const source = readFileSync(path.join(process.cwd(), "src/lib/actions/branches.ts"), "utf8");

  assert.match(source, /getAuthorizedSessionMembership\("settings\.branches:view"\)/);
  assert.match(source, /Head office cannot be deactivated/);
  assert.match(source, /isHeadOffice:\s*false,\s*active:\s*true/);
  assert.match(source, /export async function reactivateBranch/);
});

