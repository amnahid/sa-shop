import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  filterSidebarNavigationByRole,
  sidebarNavigationConfig,
  type SidebarNavigationGroup,
} from "@/components/app/shell/navigation-config";
import { hasAccountingRouteAccess } from "@/lib/utils/accounting-access";

function hasRoute(groups: SidebarNavigationGroup[], route: string): boolean {
  const hasRouteInItems = (items: { route: string; children?: { route: string }[] }[]) =>
    items.some((item) => item.route === route || Boolean(item.children?.some((child) => child.route === route)));

  return groups.some((group) => hasRouteInItems(group.items));
}

test("accounting menu visibility changes by role and overrides", () => {
  const ownerMenu = filterSidebarNavigationByRole(sidebarNavigationConfig, "owner");
  const managerMenu = filterSidebarNavigationByRole(sidebarNavigationConfig, "manager");
  const managerWithAccess = filterSidebarNavigationByRole(sidebarNavigationConfig, "manager", {
    "accounting:view": true,
  });
  const ownerDenied = filterSidebarNavigationByRole(sidebarNavigationConfig, "owner", {
    "accounting:view": false,
  });

  assert.equal(hasRoute(ownerMenu, "/accounting"), true);
  assert.equal(hasRoute(ownerMenu, "/accounting/reports"), true);
  assert.equal(hasRoute(managerMenu, "/accounting"), false);
  assert.equal(hasRoute(managerWithAccess, "/accounting"), true);
  assert.equal(hasRoute(ownerDenied, "/accounting"), false);
});

test("accounting access behavior allows authorized membership and blocks unauthorized", () => {
  assert.equal(hasAccountingRouteAccess(null), false);
  assert.equal(hasAccountingRouteAccess({ role: "owner" }), true);
  assert.equal(hasAccountingRouteAccess({ role: "manager" }), false);
  assert.equal(
    hasAccountingRouteAccess({
      role: "manager",
      permissionOverrides: { "accounting:view": true },
    }),
    true
  );
  assert.equal(
    hasAccountingRouteAccess({
      role: "owner",
      permissionOverrides: { "accounting:view": false },
    }),
    false
  );
});

test("critical accounting routes enforce shared accounting access guard", () => {
  const routeFiles = [
    "src/app/(dashboard)/accounting/page.tsx",
    "src/app/(dashboard)/accounting/chart-of-accounts/page.tsx",
    "src/app/(dashboard)/accounting/chart-of-accounts/[id]/page.tsx",
    "src/app/(dashboard)/accounting/entries/page.tsx",
    "src/app/(dashboard)/accounting/payments/page.tsx",
    "src/app/(dashboard)/accounting/reports/page.tsx",
  ];

  for (const routeFile of routeFiles) {
    const fullPath = path.join(process.cwd(), routeFile);
    const source = readFileSync(fullPath, "utf8");
    assert.match(source, /hasAccountingRouteAccess\(membership\)/, `${routeFile} should use shared access guard`);
    assert.match(source, /redirect\("\/dashboard"\)/, `${routeFile} should redirect unauthorized users`);
  }
});

