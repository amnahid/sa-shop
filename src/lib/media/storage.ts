import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

export interface StoreMediaFileInput {
  tenantId: string;
  fileName: string;
  contentType: string;
  bytes: Uint8Array;
}

export interface StoredMediaFile {
  relativePath: string;
  publicUrl: string;
}

export interface MediaStorageAdapter {
  store(input: StoreMediaFileInput): Promise<StoredMediaFile>;
  remove?(relativePath: string): Promise<void>;
}

type StorageProvider = "local" | "vercel-blob";

type VercelBlobPutResult = {
  url: string;
};

type VercelBlobPut = (
  pathname: string,
  body: Uint8Array,
  options: {
    access: "public";
    addRandomSuffix: boolean;
    contentType: string;
    token: string;
  }
) => Promise<VercelBlobPutResult>;

type VercelBlobDel = (pathnames: string[], options: { token: string }) => Promise<void>;

type VercelBlobClient = {
  put: VercelBlobPut;
  del?: VercelBlobDel;
};

function sanitizePathSegment(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "file";
}

function parseBooleanEnv(value: string | undefined) {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on";
}

function resolveStorageProviderFromEnv(): StorageProvider {
  const configuredProvider = process.env.STORAGE_PROVIDER?.trim().toLowerCase();
  if (configuredProvider === "vercel" || configuredProvider === "vercel-blob") {
    return "vercel-blob";
  }

  if (configuredProvider && configuredProvider !== "local") {
    console.warn("[media-storage] Unsupported STORAGE_PROVIDER value. Falling back to local filesystem.");
    return "local";
  }

  return parseBooleanEnv(process.env.ENABLE_VERCEL_BLOB) ? "vercel-blob" : "local";
}

function createLocalStorageAdapter() {
  const configuredUploadDirectory = process.env.MEDIA_UPLOADS_DIR;
  const uploadsDirectory = configuredUploadDirectory
    ? path.isAbsolute(configuredUploadDirectory)
      ? configuredUploadDirectory
      : path.join(process.cwd(), configuredUploadDirectory)
    : undefined;

  return new LocalFilesystemMediaStorageAdapter({
    uploadsDirectory,
    publicBasePath: process.env.MEDIA_UPLOADS_PUBLIC_PATH,
  });
}

async function loadVercelBlobClient(): Promise<VercelBlobClient> {
  const moduleName = "@vercel/blob";
  const maybeModule = (await import(moduleName)) as Record<string, unknown>;
  const put = maybeModule.put;
  const del = maybeModule.del;

  if (typeof put !== "function") {
    throw new Error("Vercel Blob SDK not available");
  }

  return {
    put: put as VercelBlobPut,
    del: typeof del === "function" ? (del as VercelBlobDel) : undefined,
  };
}

export class LocalFilesystemMediaStorageAdapter implements MediaStorageAdapter {
  private readonly uploadsDirectory: string;

  private readonly publicBasePath: string;

  constructor(options?: { uploadsDirectory?: string; publicBasePath?: string }) {
    this.uploadsDirectory = options?.uploadsDirectory || path.join(process.cwd(), "uploads", "media");
    this.publicBasePath = (options?.publicBasePath || "/uploads/media").replace(/\/+$/, "");
  }

  async store(input: StoreMediaFileInput): Promise<StoredMediaFile> {
    const tenantSegment = sanitizePathSegment(input.tenantId);
    const fileSegment = sanitizePathSegment(path.basename(input.fileName));
    const tenantDir = path.join(this.uploadsDirectory, tenantSegment);

    await mkdir(tenantDir, { recursive: true });

    const relativePath = path.posix.join(tenantSegment, fileSegment);
    const absolutePath = path.join(this.uploadsDirectory, relativePath);

    await writeFile(absolutePath, input.bytes);

    return {
      relativePath,
      publicUrl: `${this.publicBasePath}/${relativePath}`,
    };
  }

  async remove(relativePath: string): Promise<void> {
    const sanitizedRelativePath = relativePath
      .split(/[\\/]/)
      .map((segment) => sanitizePathSegment(segment))
      .join(path.sep);

    await rm(path.join(this.uploadsDirectory, sanitizedRelativePath), { force: true });
  }
}

export class VercelBlobMediaStorageAdapter implements MediaStorageAdapter {
  private readonly token: string;

  private readonly fallbackAdapter: MediaStorageAdapter;

  private readonly loadClient: () => Promise<VercelBlobClient>;

  private readonly keyPrefix: string;

  constructor(options: {
    token: string;
    fallbackAdapter: MediaStorageAdapter;
    loadClient?: () => Promise<VercelBlobClient>;
    keyPrefix?: string;
  }) {
    this.token = options.token;
    this.fallbackAdapter = options.fallbackAdapter;
    this.loadClient = options.loadClient || loadVercelBlobClient;
    this.keyPrefix = options.keyPrefix || "media";
  }

  async store(input: StoreMediaFileInput): Promise<StoredMediaFile> {
    const tenantSegment = sanitizePathSegment(input.tenantId);
    const fileSegment = sanitizePathSegment(path.basename(input.fileName));
    const relativePath = path.posix.join(this.keyPrefix, tenantSegment, fileSegment);

    try {
      const client = await this.loadClient();
      const stored = await client.put(relativePath, input.bytes, {
        access: "public",
        addRandomSuffix: false,
        contentType: input.contentType,
        token: this.token,
      });

      return {
        relativePath,
        publicUrl: stored.url,
      };
    } catch {
      console.warn("[media-storage] Vercel Blob write failed. Falling back to local filesystem adapter.");
      return this.fallbackAdapter.store(input);
    }
  }

  async remove(relativePath: string): Promise<void> {
    if (!relativePath.startsWith(`${this.keyPrefix}/`)) {
      if (typeof this.fallbackAdapter.remove === "function") {
        await this.fallbackAdapter.remove(relativePath);
      }
      return;
    }

    try {
      const client = await this.loadClient();
      if (typeof client.del !== "function") {
        throw new Error("Vercel Blob delete API unavailable");
      }

      await client.del([relativePath], { token: this.token });
    } catch {
      console.warn("[media-storage] Vercel Blob delete failed for media cleanup.");
    }
  }
}

let defaultStorageAdapter: MediaStorageAdapter | undefined;

export function getMediaStorageAdapter() {
  if (defaultStorageAdapter) {
    return defaultStorageAdapter;
  }

  // STORAGE_PROVIDER controls media backend selection.
  // Supported values: "local" (default) and "vercel"/"vercel-blob".
  // ENABLE_VERCEL_BLOB=true can also enable Vercel Blob when STORAGE_PROVIDER is not set.
  const provider = resolveStorageProviderFromEnv();
  const localAdapter = createLocalStorageAdapter();

  if (provider === "local") {
    console.info("[media-storage] Using local filesystem media storage provider.");
    defaultStorageAdapter = localAdapter;
    return defaultStorageAdapter;
  }

  const token =
    process.env.BLOB_READ_WRITE_TOKEN || process.env.VERCEL_BLOB_READ_WRITE_TOKEN || process.env.VERCEL_BLOB_TOKEN;

  if (!token) {
    console.warn("[media-storage] Vercel Blob provider enabled but token is missing. Falling back to local filesystem.");
    defaultStorageAdapter = localAdapter;
    return defaultStorageAdapter;
  }

  console.info("[media-storage] Using Vercel Blob media storage provider.");
  defaultStorageAdapter = new VercelBlobMediaStorageAdapter({
    token,
    fallbackAdapter: localAdapter,
  });

  return defaultStorageAdapter;
}

export function __resetMediaStorageAdapterForTests() {
  defaultStorageAdapter = undefined;
}
