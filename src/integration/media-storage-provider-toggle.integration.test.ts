import assert from "node:assert/strict";
import test from "node:test";
import {
  __resetMediaStorageAdapterForTests,
  getMediaStorageAdapter,
  LocalFilesystemMediaStorageAdapter,
  VercelBlobMediaStorageAdapter,
} from "@/lib/media/storage";

const envKeys = [
  "STORAGE_PROVIDER",
  "ENABLE_VERCEL_BLOB",
  "BLOB_READ_WRITE_TOKEN",
  "VERCEL_BLOB_READ_WRITE_TOKEN",
  "VERCEL_BLOB_TOKEN",
  "MEDIA_UPLOADS_DIR",
  "MEDIA_UPLOADS_PUBLIC_PATH",
] as const;

const envSnapshot = new Map<string, string | undefined>(envKeys.map((key) => [key, process.env[key]]));

function resetEnv() {
  for (const key of envKeys) {
    const snapshotValue = envSnapshot.get(key);
    if (snapshotValue === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = snapshotValue;
    }
  }
}

test.afterEach(() => {
  resetEnv();
  __resetMediaStorageAdapterForTests();
});

test("storage provider defaults to local filesystem when no provider env is configured", () => {
  delete process.env.STORAGE_PROVIDER;
  delete process.env.ENABLE_VERCEL_BLOB;

  const adapter = getMediaStorageAdapter();

  assert.equal(adapter instanceof LocalFilesystemMediaStorageAdapter, true);
});

test("storage provider uses Vercel Blob when enabled via STORAGE_PROVIDER and token exists", () => {
  process.env.STORAGE_PROVIDER = "vercel";
  process.env.BLOB_READ_WRITE_TOKEN = "blob-test-token";

  const adapter = getMediaStorageAdapter();

  assert.equal(adapter instanceof VercelBlobMediaStorageAdapter, true);
});

test("storage provider falls back to local filesystem when Vercel is enabled but token is missing", () => {
  process.env.STORAGE_PROVIDER = "vercel-blob";
  delete process.env.BLOB_READ_WRITE_TOKEN;
  delete process.env.VERCEL_BLOB_READ_WRITE_TOKEN;
  delete process.env.VERCEL_BLOB_TOKEN;

  const adapter = getMediaStorageAdapter();

  assert.equal(adapter instanceof LocalFilesystemMediaStorageAdapter, true);
});

test("storage provider prefers BLOB_READ_WRITE_TOKEN over legacy token vars", () => {
  process.env.STORAGE_PROVIDER = "vercel";
  process.env.BLOB_READ_WRITE_TOKEN = "primary-token";
  process.env.VERCEL_BLOB_READ_WRITE_TOKEN = "legacy-token";
  process.env.VERCEL_BLOB_TOKEN = "oldest-token";

  const adapter = getMediaStorageAdapter();

  assert.equal(adapter instanceof VercelBlobMediaStorageAdapter, true);
});

test("ENABLE_VERCEL_BLOB enables Vercel provider when STORAGE_PROVIDER is not set", () => {
  delete process.env.STORAGE_PROVIDER;
  process.env.ENABLE_VERCEL_BLOB = "true";
  process.env.BLOB_READ_WRITE_TOKEN = "blob-test-token";

  const adapter = getMediaStorageAdapter();

  assert.equal(adapter instanceof VercelBlobMediaStorageAdapter, true);
});

test("storage adapter selection remains deterministic until explicit reset", () => {
  delete process.env.STORAGE_PROVIDER;
  delete process.env.ENABLE_VERCEL_BLOB;

  const initial = getMediaStorageAdapter();
  process.env.STORAGE_PROVIDER = "vercel";
  process.env.BLOB_READ_WRITE_TOKEN = "blob-test-token";

  const cached = getMediaStorageAdapter();

  assert.equal(initial instanceof LocalFilesystemMediaStorageAdapter, true);
  assert.equal(cached, initial);
});

test("Vercel adapter falls back to local adapter on Vercel write failure", async () => {
  let fallbackCalled = false;
  const adapter = new VercelBlobMediaStorageAdapter({
    token: "blob-test-token",
    fallbackAdapter: {
      store: async (input) => {
        fallbackCalled = true;
        return {
          relativePath: `${input.tenantId}/${input.fileName}`,
          publicUrl: `/uploads/media/${input.tenantId}/${input.fileName}`,
        };
      },
      remove: async () => undefined,
    },
    loadClient: async () => ({
      put: async () => {
        throw new Error("simulated vercel error");
      },
    }),
  });

  const result = await adapter.store({
    tenantId: "tenant_1",
    fileName: "logo.png",
    contentType: "image/png",
    bytes: new Uint8Array([1, 2, 3]),
  });

  assert.equal(fallbackCalled, true);
  assert.match(result.publicUrl, /^\/uploads\/media\//);
});
