import assert from "node:assert/strict";
import test from "node:test";
import mongoose from "mongoose";
import {
  MAX_MEDIA_UPLOAD_SIZE_BYTES,
  processMediaBinaryUpload,
  type MediaUploadErrorCode,
} from "@/lib/media/upload";

const tenantId = new mongoose.Types.ObjectId();

function createAuthorizedContext() {
  return {
    sessionUserId: new mongoose.Types.ObjectId().toString(),
    membership: {
      tenantId,
    },
  };
}

function createFile(overrides?: { type?: string; size?: number; name?: string }) {
  const size = overrides?.size ?? 5;
  const content = "a".repeat(size);
  return new File([content], overrides?.name || "logo.png", {
    type: overrides?.type || "image/png",
  });
}

test("binary media upload rejects unsupported mime types with typed error", async () => {
  const formData = new FormData();
  formData.set("file", createFile({ type: "application/octet-stream" }));

  const result = await processMediaBinaryUpload(formData, {
    authorize: async () => createAuthorizedContext(),
  });

  assert.equal(result.ok, false);
  if (result.ok) assert.fail("Expected invalid mime type error");
  assert.equal(result.code satisfies MediaUploadErrorCode, "INVALID_MIME_TYPE");
  assert.equal(result.status, 400);
});

test("binary media upload maps auth failures to typed unauthorized/permission responses", async () => {
  const formData = new FormData();
  formData.set("file", createFile());

  const unauthorized = await processMediaBinaryUpload(formData, {
    authorize: async () => ({ error: "Unauthorized" }),
  });
  assert.equal(unauthorized.ok, false);
  if (unauthorized.ok) assert.fail("Expected unauthorized result");
  assert.equal(unauthorized.code satisfies MediaUploadErrorCode, "UNAUTHORIZED");
  assert.equal(unauthorized.status, 401);

  const forbidden = await processMediaBinaryUpload(formData, {
    authorize: async () => ({ error: "Insufficient permissions" }),
  });
  assert.equal(forbidden.ok, false);
  if (forbidden.ok) assert.fail("Expected permission result");
  assert.equal(forbidden.code satisfies MediaUploadErrorCode, "INSUFFICIENT_PERMISSIONS");
  assert.equal(forbidden.status, 403);
});

test("binary media upload rejects oversized files with typed error", async () => {
  const formData = new FormData();
  formData.set("file", createFile({ size: MAX_MEDIA_UPLOAD_SIZE_BYTES + 1 }));

  const result = await processMediaBinaryUpload(formData, {
    authorize: async () => createAuthorizedContext(),
  });

  assert.equal(result.ok, false);
  if (result.ok) assert.fail("Expected file too large error");
  assert.equal(result.code satisfies MediaUploadErrorCode, "FILE_TOO_LARGE");
  assert.equal(result.status, 400);
});

test("binary media upload stores file and persists tenant-scoped media metadata", async () => {
  const formData = new FormData();
  formData.set("file", createFile({ name: "brand-logo.png", size: 12 }));
  formData.set("name", "Brand Logo");
  formData.set("tags", "branding,logo");

  let storeInput: { tenantId: string; fileName: string; contentType: string; bytes: Uint8Array } | null = null;
  let persistedTenantId = "";

  const result = await processMediaBinaryUpload(formData, {
    authorize: async () => createAuthorizedContext(),
    storage: {
      store: async (input) => {
        storeInput = input;
        return { relativePath: `${input.tenantId}/${input.fileName}`, publicUrl: `/uploads/media/${input.tenantId}/${input.fileName}` };
      },
    },
    persist: async (input) => {
      persistedTenantId = input.tenantId.toString();
      return { _id: new mongoose.Types.ObjectId() };
    },
  });

  assert.equal(result.ok, true);
  if (!result.ok) assert.fail("Expected successful upload");
  assert.equal(storeInput?.tenantId, tenantId.toString());
  assert.equal(storeInput?.contentType, "image/png");
  assert.ok((storeInput?.fileName || "").endsWith(".png"));
  assert.equal(result.asset.name, "Brand Logo");
  assert.equal(persistedTenantId, tenantId.toString());
  assert.match(result.asset.url, /^\/uploads\/media\//);
});

test("binary media upload returns typed storage error when adapter fails", async () => {
  const formData = new FormData();
  formData.set("file", createFile());

  const result = await processMediaBinaryUpload(formData, {
    authorize: async () => createAuthorizedContext(),
    storage: {
      store: async () => {
        throw new Error("disk full");
      },
    },
  });

  assert.equal(result.ok, false);
  if (result.ok) assert.fail("Expected storage failure");
  assert.equal(result.code satisfies MediaUploadErrorCode, "STORAGE_FAILURE");
  assert.equal(result.status, 500);
});

test("binary media upload cleans up stored blob when metadata persistence fails", async () => {
  const formData = new FormData();
  formData.set("file", createFile({ name: "asset.png", size: 8 }));
  formData.set("tags", "branding, header");

  let removedRelativePath = "";
  const result = await processMediaBinaryUpload(formData, {
    authorize: async () => createAuthorizedContext(),
    storage: {
      store: async () => ({
        relativePath: `${tenantId.toString()}/asset.png`,
        publicUrl: `/uploads/media/${tenantId.toString()}/asset.png`,
      }),
    },
    persist: async () => {
      throw new Error("write failed");
    },
    removeStoredFile: async (relativePath) => {
      removedRelativePath = relativePath;
    },
  });

  assert.equal(result.ok, false);
  if (result.ok) assert.fail("Expected persistence failure");
  assert.equal(result.code satisfies MediaUploadErrorCode, "PERSISTENCE_FAILURE");
  assert.equal(result.status, 500);
  assert.equal(removedRelativePath, `${tenantId.toString()}/asset.png`);
});
