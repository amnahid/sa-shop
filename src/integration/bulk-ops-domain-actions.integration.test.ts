import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { buildBulkActionMessage, getBulkSelectedIds } from "@/lib/actions/bulk-helpers";

test("bulk helper normalizes selected ids and builds partial-failure messages", () => {
  const formData = new FormData();
  formData.append("selectedRowIds", "  id-1 ");
  formData.append("selectedRowIds", "id-2");
  formData.append("selectedRowIds", "id-1");
  formData.append("selectedRowIds", "");

  assert.deepEqual(getBulkSelectedIds(formData), ["id-1", "id-2"]);

  const message = buildBulkActionMessage({
    requested: 4,
    processed: 2,
    skipped: 1,
    failed: 1,
    errors: ["1 active record must be archived before deletion."],
  });

  assert.equal(
    message,
    "Processed 2 of 4 selected items. 1 skipped. 1 failed. 1 active record must be archived before deletion."
  );
});

test("bulk helper supports custom selection field names and trims error segments", () => {
  const formData = new FormData();
  formData.append("records", " product-1 ");
  formData.append("records", "product-2");
  formData.append("records", "product-2");

  const selected = getBulkSelectedIds(formData, "records");
  assert.deepEqual(selected, ["product-1", "product-2"]);

  const message = buildBulkActionMessage({
    requested: 3,
    processed: 1,
    failed: 2,
    errors: [" 1 record is outside tenant scope. ", " ", "1 record is invalid."],
  });

  assert.equal(
    message,
    "Processed 1 of 3 selected items. 2 failed. 1 record is outside tenant scope. 1 record is invalid."
  );
});

test("domain bulk actions enforce shared auth, tenant filters, and result accounting", () => {
  const guardedFiles: Array<[string, RegExp[]]> = [
    [
      "src/lib/actions/products.ts",
      [
        /runAuthorizedBulkAction\(/,
        /permission:\s*/,
        /Product\.updateMany\(\s*\{\s*tenantId,\s*_id:\s*\{\s*\$in:\s*objectIds\s*\}/,
        /Product\.deleteMany\(\s*\{\s*tenantId,\s*_id:\s*\{\s*\$in:\s*objectIds\s*\}/,
        /processed:/,
        /failed:/,
      ],
    ],
    [
      "src/lib/actions/customers.ts",
      [
        /runAuthorizedBulkAction\(/,
        /permission:\s*/,
        /Customer\.updateMany\(\s*\{\s*tenantId,\s*_id:\s*\{\s*\$in:\s*objectIds\s*\}/,
        /Customer\.deleteMany\(\s*\{\s*tenantId,\s*_id:\s*\{\s*\$in:\s*objectIds\s*\}/,
        /processed:/,
        /failed:/,
      ],
    ],
    [
      "src/lib/actions/categories.ts",
      [
        /runAuthorizedBulkAction\(/,
        /permission:\s*/,
        /Category\.updateMany\(\s*\{\s*tenantId,\s*_id:\s*\{\s*\$in:\s*archivableIds\s*\}/,
        /Category\.deleteMany\(\s*\{\s*tenantId,\s*_id:\s*\{\s*\$in:\s*deletableIds\s*\}/,
        /processed:/,
        /failed:/,
      ],
    ],
    [
      "src/lib/actions/templates-modules.ts",
      [
        /runAuthorizedBulkAction\(/,
        /permission:\s*/,
        /MediaAsset\.updateMany\(\s*\{\s*tenantId,\s*_id:\s*\{\s*\$in:\s*objectIds\s*\}/,
        /MediaAsset\.deleteMany\(\s*\{\s*tenantId,\s*_id:\s*\{\s*\$in:\s*objectIds\s*\}/,
        /processed:/,
        /failed:/,
      ],
    ],
  ];

  for (const [relativePath, patterns] of guardedFiles) {
    const fullPath = path.join(process.cwd(), relativePath);
    const source = readFileSync(fullPath, "utf8");
    for (const pattern of patterns) {
      assert.match(source, pattern, `${relativePath} should match ${pattern}`);
    }
  }
});

test("dashboard pages wire shared bulk toolbar actions for target domains", () => {
  const uiFiles: Array<[string, RegExp[]]> = [
    [
      "src/app/(dashboard)/customers/page.tsx",
      [/bulk=\{/, /bulkArchiveCustomers/, /bulkRestoreCustomers/, /bulkDeleteCustomers/],
    ],
    [
      "src/app/(dashboard)/inventory/products/page.tsx",
      [/bulk=\{/, /bulkArchiveProducts/, /bulkRestoreProducts/, /bulkDeleteProducts/],
    ],
    [
      "src/app/(dashboard)/inventory/categories/page.tsx",
      [/bulk=\{/, /bulkArchiveCategories/, /bulkRestoreCategories/, /bulkDeleteCategories/],
    ],
    [
      "src/components/settings/MediaLibraryClient.tsx",
      [/bulk=\{/, /bulkArchiveMediaAssets/, /bulkRestoreMediaAssets/, /bulkDeleteMediaAssets/],
    ],
  ];

  for (const [relativePath, patterns] of uiFiles) {
    const fullPath = path.join(process.cwd(), relativePath);
    const source = readFileSync(fullPath, "utf8");
    for (const pattern of patterns) {
      assert.match(source, pattern, `${relativePath} should expose ${pattern}`);
    }
  }
});

test("core CRUD modules expose single-item lifecycle actions with tenant/permission guards", () => {
  const guardedFiles: Array<[string, RegExp[]]> = [
    [
      "src/lib/actions/products.ts",
      [
        /const PRODUCTS_PERMISSION = "inventory\.products:view"/,
        /getAuthorizedSessionMembership\(PRODUCTS_PERMISSION\)/,
        /export async function archiveProduct/,
        /export async function restoreProduct/,
        /export async function permanentlyDeleteProduct/,
        /tenantId:/,
      ],
    ],
    [
      "src/lib/actions/customers.ts",
      [
        /const CUSTOMERS_PERMISSION = "customers:view"/,
        /getAuthorizedSessionMembership\(CUSTOMERS_PERMISSION\)/,
        /export async function archiveCustomer/,
        /export async function restoreCustomer/,
        /export async function permanentlyDeleteCustomer/,
        /tenantId:/,
      ],
    ],
    [
      "src/lib/actions/categories.ts",
      [
        /const CATEGORIES_PERMISSION = "inventory\.categories:view"/,
        /getAuthorizedSessionMembership\(CATEGORIES_PERMISSION\)/,
        /export async function archiveCategory/,
        /export async function restoreCategory/,
        /export async function permanentlyDeleteCategory/,
        /tenantId:/,
      ],
    ],
  ];

  for (const [relativePath, patterns] of guardedFiles) {
    const source = readFileSync(path.join(process.cwd(), relativePath), "utf8");
    for (const pattern of patterns) {
      assert.match(source, pattern, `${relativePath} should include ${pattern}`);
    }
  }
});

test("bulk delete semantics stay consistent across products, customers, and categories", () => {
  const sources = {
    products: readFileSync(path.join(process.cwd(), "src/lib/actions/products.ts"), "utf8"),
    customers: readFileSync(path.join(process.cwd(), "src/lib/actions/customers.ts"), "utf8"),
    categories: readFileSync(path.join(process.cwd(), "src/lib/actions/categories.ts"), "utf8"),
  };

  assert.match(
    sources.products,
    /active product\(s\) must be archived before permanent deletion\./
  );
  assert.match(
    sources.customers,
    /active customer\(s\) must be archived before permanent deletion\./
  );
  assert.match(
    sources.categories,
    /active category\(s\) must be archived before permanent deletion\./
  );
  assert.match(
    sources.categories,
    /archived category\(s\) cannot be deleted while active products or subcategories still reference them\./
  );
});

test("products, customers, and categories pages route CRUD mutations through shared action layer", () => {
  const pageFiles: Array<[string, RegExp[]]> = [
    [
      "src/app/(dashboard)/inventory/products/add/page.tsx",
      [/createProduct\(/, /redirect\(`\/inventory\/products\/add\?error=/],
    ],
    [
      "src/app/(dashboard)/inventory/products/[id]/page.tsx",
      [/updateProduct\(/, /archiveProduct\(/, /restoreProduct\(/, /permanentlyDeleteProduct\(/],
    ],
    [
      "src/app/(dashboard)/customers/[id]/page.tsx",
      [/updateCustomer\(/, /archiveCustomer\(/, /restoreCustomer\(/, /permanentlyDeleteCustomer\(/],
    ],
    [
      "src/app/(dashboard)/inventory/categories/[id]/page.tsx",
      [/updateCategory\(/, /archiveCategory\(/, /restoreCategory\(/, /permanentlyDeleteCategory\(/],
    ],
    [
      "src/app/(dashboard)/inventory/categories/page.tsx",
      [/Link href=\{`\/inventory\/categories\/\$\{row\.id\}`\}/, /createCategory\(/],
    ],
  ];

  for (const [relativePath, patterns] of pageFiles) {
    const source = readFileSync(path.join(process.cwd(), relativePath), "utf8");
    for (const pattern of patterns) {
      assert.match(source, pattern, `${relativePath} should match ${pattern}`);
    }
  }
});

test("bulk action helper provides authorization and user-facing feedback primitives", () => {
  const source = readFileSync(path.join(process.cwd(), "src/lib/actions/bulk-helpers.ts"), "utf8");

  for (const pattern of [
    /export function getBulkSelectedIds/,
    /export function buildBulkActionMessage/,
    /Processed \${processed} of \${requested} selected items\./,
  ]) {
    assert.match(source, pattern, `bulk action helper should include ${pattern}`);
  }
});

test("core CRUD list pages wire bulk lifecycle actions with explicit success/error redirects", () => {
  const listPages: Array<[string, RegExp[]]> = [
    [
      "src/app/(dashboard)/inventory/products/page.tsx",
      [
        /bulkArchiveProducts\(/,
        /bulkRestoreProducts\(/,
        /bulkDeleteProducts\(/,
        /redirect\(`\/inventory\/products\?error=/,
        /redirect\(`\/inventory\/products\?success=/,
      ],
    ],
    [
      "src/app/(dashboard)/customers/page.tsx",
      [
        /bulkArchiveCustomers\(/,
        /bulkRestoreCustomers\(/,
        /bulkDeleteCustomers\(/,
        /redirect\(`\/customers\?error=/,
        /redirect\(`\/customers\?success=/,
      ],
    ],
    [
      "src/app/(dashboard)/inventory/categories/page.tsx",
      [
        /bulkArchiveCategories\(/,
        /bulkRestoreCategories\(/,
        /bulkDeleteCategories\(/,
        /redirect\(`\/inventory\/categories\?error=/,
        /redirect\(`\/inventory\/categories\?success=/,
      ],
    ],
  ];

  for (const [relativePath, patterns] of listPages) {
    const source = readFileSync(path.join(process.cwd(), relativePath), "utf8");
    for (const pattern of patterns) {
      assert.match(source, pattern, `${relativePath} should include ${pattern}`);
    }
    assert.doesNotMatch(
      source,
      /(Product|Customer|Category)\.(create|update|updateOne|updateMany|findOneAndUpdate|deleteOne|deleteMany)/,
      `${relativePath} should not perform direct model mutations`
    );
  }
});

test("customer search action enforces tenant guard before querying", () => {
  const source = readFileSync(path.join(process.cwd(), "src/lib/actions/customers.ts"), "utf8");
  assert.match(source, /getAuthorizedCustomersContext\(\)/);
  assert.match(source, /if \(tenantId !== auth\.tenantId\)/);
});
