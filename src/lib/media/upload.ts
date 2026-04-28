import { randomUUID } from "node:crypto";
import path from "node:path";
import mongoose from "mongoose";
import { MediaAsset } from "@/models";
import { getAuthorizedSessionMembership } from "@/lib/utils/server-authorization";
import { getMediaStorageAdapter, type MediaStorageAdapter } from "@/lib/media/storage";

// MEDIA_UPLOAD_MAX_BYTES defines the upload size cap in bytes. Defaults to 10MB when unset.
export const MAX_MEDIA_UPLOAD_SIZE_BYTES = Number(process.env.MEDIA_UPLOAD_MAX_BYTES || 10 * 1024 * 1024);

export const ALLOWED_MEDIA_MIME_TYPES = new Set<string>([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
  "application/pdf",
  "text/plain",
]);

export type MediaUploadErrorCode =
  | "UNAUTHORIZED"
  | "INSUFFICIENT_PERMISSIONS"
  | "MISSING_FILE"
  | "EMPTY_FILE"
  | "INVALID_MIME_TYPE"
  | "FILE_TOO_LARGE"
  | "STORAGE_FAILURE"
  | "PERSISTENCE_FAILURE";

export type MediaUploadResult =
  | {
      ok: true;
      asset: {
        id: string;
        name: string;
        fileName: string;
        mimeType: string;
        sizeBytes: number;
        url: string;
      };
    }
  | {
      ok: false;
      code: MediaUploadErrorCode;
      status: number;
      message: string;
    };

type AuthorizedUploadContext = {
  sessionUserId: string;
  membership: {
    tenantId: mongoose.Types.ObjectId;
  };
};

type AuthorizeUpload = () => Promise<AuthorizedUploadContext | { error: string }>;

type PersistMediaAssetInput = {
  tenantId: mongoose.Types.ObjectId;
  uploadedById: mongoose.Types.ObjectId;
  name: string;
  originalFileName: string;
  storedFileName: string;
  url: string;
  mimeType: string;
  sizeBytes: number;
  tags: string[];
  altText?: string;
};

type PersistMediaAsset = (input: PersistMediaAssetInput) => Promise<{ _id: { toString(): string } }>;

type RemoveStoredFile = (relativePath: string) => Promise<void>;

type ProcessMediaBinaryUploadDependencies = {
  authorize: AuthorizeUpload;
  storage: MediaStorageAdapter;
  persist: PersistMediaAsset;
  removeStoredFile?: RemoveStoredFile;
};

function parseStringList(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeAssetName(value: string) {
  return value
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[_-]+/g, " ")
    .trim() || "Asset";
}

function getMediaKindFromMime(mimeType: string) {
  if (mimeType.startsWith("image/")) return "image" as const;
  if (mimeType.includes("pdf") || mimeType.startsWith("text/")) {
    return "document" as const;
  }
  return "other" as const;
}

function getFileExtension(file: File) {
  const fromName = path.extname(file.name || "").trim();
  if (fromName) {
    return fromName.toLowerCase();
  }

  const mimeToExt: Record<string, string> = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
    "image/svg+xml": ".svg",
    "application/pdf": ".pdf",
    "text/plain": ".txt",
  };

  return mimeToExt[file.type] || "";
}

function makeStoredFileName(file: File) {
  return `${randomUUID()}${getFileExtension(file)}`;
}

export function validateBinaryUploadFile(file: File): MediaUploadResult | null {
  if (!file || typeof file.arrayBuffer !== "function") {
    return {
      ok: false,
      code: "MISSING_FILE",
      status: 400,
      message: "A file is required for upload.",
    };
  }

  if (file.size <= 0) {
    return {
      ok: false,
      code: "EMPTY_FILE",
      status: 400,
      message: "Uploaded file is empty.",
    };
  }

  if (file.size > MAX_MEDIA_UPLOAD_SIZE_BYTES) {
    return {
      ok: false,
      code: "FILE_TOO_LARGE",
      status: 400,
      message: `File exceeds max size of ${MAX_MEDIA_UPLOAD_SIZE_BYTES} bytes.`,
    };
  }

  if (!ALLOWED_MEDIA_MIME_TYPES.has(file.type)) {
    return {
      ok: false,
      code: "INVALID_MIME_TYPE",
      status: 400,
      message: `Unsupported file type: ${file.type || "unknown"}.`,
    };
  }

  return null;
}

function mapAuthorizationError(error: string): MediaUploadResult {
  if (error === "Unauthorized") {
    return { ok: false, code: "UNAUTHORIZED", status: 401, message: error };
  }

  return {
    ok: false,
    code: "INSUFFICIENT_PERMISSIONS",
    status: 403,
    message: error,
  };
}

function getDefaultDependencies(): ProcessMediaBinaryUploadDependencies {
  const storage = getMediaStorageAdapter();

  return {
    authorize: async () => getAuthorizedSessionMembership("settings.media:view"),
    storage,
    persist: async (input) =>
      MediaAsset.create({
        tenantId: input.tenantId,
        uploadedById: input.uploadedById,
        name: input.name,
        fileName: input.originalFileName,
        url: input.url,
        mimeType: input.mimeType,
        sizeBytes: input.sizeBytes,
        tags: input.tags,
        altText: input.altText,
        kind: getMediaKindFromMime(input.mimeType),
        status: "active",
      }),
    removeStoredFile:
      typeof storage.remove === "function" ? (relativePath: string) => storage.remove!(relativePath) : undefined,
  };
}

export async function processMediaBinaryUpload(
  formData: FormData,
  dependencies: Partial<ProcessMediaBinaryUploadDependencies> = {}
): Promise<MediaUploadResult> {
  const defaults = getDefaultDependencies();
  const deps: ProcessMediaBinaryUploadDependencies = {
    ...defaults,
    ...dependencies,
  };

  const authorization = await deps.authorize();
  if ("error" in authorization) {
    return mapAuthorizationError(authorization.error);
  }

  const maybeFile = formData.get("file");
  if (!(maybeFile instanceof File)) {
    return {
      ok: false,
      code: "MISSING_FILE",
      status: 400,
      message: "A file is required for upload.",
    };
  }

  const validationError = validateBinaryUploadFile(maybeFile);
  if (validationError) {
    return validationError;
  }

  const nameInput = (formData.get("name") as string | null)?.trim();
  const name = nameInput || normalizeAssetName(maybeFile.name || "asset");
  const tags = parseStringList((formData.get("tags") as string | null) || "");
  const altText = ((formData.get("altText") as string | null) || "").trim() || undefined;

  const storedFileName = makeStoredFileName(maybeFile);
  let storedRelativePath = "";
  let publicUrl = "";

  try {
    const fileBytes = new Uint8Array(await maybeFile.arrayBuffer());
    const stored = await deps.storage.store({
      tenantId: authorization.membership.tenantId.toString(),
      fileName: storedFileName,
      contentType: maybeFile.type,
      bytes: fileBytes,
    });
    storedRelativePath = stored.relativePath;
    publicUrl = stored.publicUrl;
  } catch {
    return {
      ok: false,
      code: "STORAGE_FAILURE",
      status: 500,
      message: "Failed to store uploaded file.",
    };
  }

  try {
    const created = await deps.persist({
      tenantId: authorization.membership.tenantId,
      uploadedById: new mongoose.Types.ObjectId(authorization.sessionUserId),
      name,
      originalFileName: maybeFile.name,
      storedFileName,
      url: publicUrl,
      mimeType: maybeFile.type,
      sizeBytes: maybeFile.size,
      tags,
      altText,
    });

    return {
      ok: true,
      asset: {
        id: created._id.toString(),
        name,
        fileName: maybeFile.name,
        mimeType: maybeFile.type,
        sizeBytes: maybeFile.size,
        url: publicUrl,
      },
    };
  } catch {
    if (storedRelativePath && deps.removeStoredFile) {
      await deps.removeStoredFile(storedRelativePath).catch(() => undefined);
    }

    return {
      ok: false,
      code: "PERSISTENCE_FAILURE",
      status: 500,
      message: "Failed to persist uploaded asset metadata.",
    };
  }
}
