import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

test("media library page delegates to client upload UI", () => {
  const pagePath = path.join(process.cwd(), "src/app/(dashboard)/settings/media-library/page.tsx");
  const source = readFileSync(pagePath, "utf8");

  assert.match(source, /MediaLibraryClient/);
  assert.doesNotMatch(source, /URL-based MVP/);
});

test("media library client provides file upload primary flow and metadata actions", () => {
  const clientPath = path.join(process.cwd(), "src/components/settings/MediaLibraryClient.tsx");
  const source = readFileSync(clientPath, "utf8");

  assert.match(source, /type="file"/);
  assert.match(source, /fetch\("\/api\/media\/upload"/);
  assert.match(source, /updateMediaAsset\(/);
  assert.match(source, /archiveMediaAsset\(/);
  assert.match(source, /restoreMediaAsset\(/);
  assert.match(source, /FormFeedback/);
});
