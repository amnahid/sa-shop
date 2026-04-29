"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { DataTable, type DataTableColumn } from "@/components/app/DataTable";
import { Button } from "@/components/ui/button";
import { FormFeedback } from "@/components/app/FormFeedback";
import {
  archiveMediaAsset,
  bulkArchiveMediaAssets,
  bulkDeleteMediaAssets,
  bulkRestoreMediaAssets,
  createMediaAsset,
  restoreMediaAsset,
  updateMediaAsset,
} from "@/lib/actions/templates-modules";

type MediaLibraryAsset = {
  id: string;
  name: string;
  fileName: string;
  url: string;
  mimeType: string;
  kind: "image" | "document" | "other";
  sizeBytes: number;
  tags: string[];
  altText?: string;
  status: "active" | "archived";
};

type FeedbackState = {
  status: "success" | "error";
  message: string;
};

type MediaTableRow = {
  id: string;
  name: string;
  fileName: string;
  kind: string;
  mimeType: string;
  status: "active" | "archived";
  url: string;
};

function extractUploadErrorMessage(payload: unknown, fallback = "Upload failed.") {
  if (!payload || typeof payload !== "object") return fallback;

  const maybeError = (payload as { error?: { message?: unknown } }).error;
  if (!maybeError || typeof maybeError !== "object") return fallback;

  const message = maybeError.message;
  return typeof message === "string" && message.trim() ? message : fallback;
}

export function MediaLibraryClient({ assets }: { assets: MediaLibraryAsset[] }) {
  const router = useRouter();
  const [uploadPending, setUploadPending] = useState(false);
  const [uploadFeedback, setUploadFeedback] = useState<FeedbackState | null>(null);
  const [assetFeedback, setAssetFeedback] = useState<FeedbackState | null>(null);
  const [selectedFileLabel, setSelectedFileLabel] = useState<string>("");
  const [actionPending, startTransition] = useTransition();
  const maxFileSizeBytes = 10 * 1024 * 1024;
  const maxFileSizeMb = Math.round(maxFileSizeBytes / (1024 * 1024));
  const allowedUploadMimeTypes = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "image/svg+xml",
    "application/pdf",
    "text/plain",
  ];
  const tableRows: MediaTableRow[] = assets.map((asset) => ({
    id: asset.id,
    name: asset.name,
    fileName: asset.fileName,
    kind: asset.kind,
    mimeType: asset.mimeType,
    status: asset.status,
    url: asset.url,
  }));

  const columns: DataTableColumn<MediaTableRow>[] = [
    {
      key: "asset",
      header: "Asset",
      render: (row) => (
        <div>
          <div className="font-medium">{row.name}</div>
          <div className="text-xs text-muted-foreground">{row.fileName}</div>
        </div>
      ),
    },
    {
      key: "type",
      header: "Type",
      render: (row) => (
        <div className="text-xs text-muted-foreground">
          {row.kind} • {row.mimeType}
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (row) => (
        <span className={row.status === "active" ? "text-emerald-700 font-semibold" : "text-amber-700 font-semibold"}>
          {row.status}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      render: (row) => (
        <div className="flex justify-end gap-2">
          <Button asChild variant="secondary" size="xs">
            <a href={row.url} target="_blank" rel="noreferrer">
              Open
            </a>
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="xs"
            disabled={actionPending}
            onClick={() =>
              runAssetAction(
                () => (row.status === "active" ? archiveMediaAsset(row.id) : restoreMediaAsset(row.id)),
                row.status === "active" ? "Asset archived successfully." : "Asset restored successfully."
              )
            }
          >
            {row.status === "active" ? "Archive" : "Restore"}
          </Button>
        </div>
      ),
    },
  ];

  const runAssetAction = (
    runner: () => Promise<{ error?: string; success?: boolean }>,
    successMessage: string,
    onSuccess?: () => void
  ) => {
    startTransition(async () => {
      const result = await runner();
      if (result.error) {
        setAssetFeedback({ status: "error", message: result.error });
        return;
      }

      setAssetFeedback({ status: "success", message: successMessage });
      onSuccess?.();
      router.refresh();
    });
  };

  return (
    <>
      <section className="rounded-lg border bg-card p-5 space-y-4">
        <h2 className="text-base font-semibold">Upload Asset</h2>
        <p className="text-sm text-muted-foreground">
          Upload a file directly. Storage backend is selected server-side by environment settings.
        </p>
        <FormFeedback status={uploadFeedback?.status || "success"} message={uploadFeedback?.message} />
        <form
          className="grid gap-3 md:grid-cols-2"
          onSubmit={async (event) => {
            event.preventDefault();
            setUploadFeedback(null);
            const form = event.currentTarget;
            const formData = new FormData(form);
              const maybeFile = formData.get("file");

              if (!(maybeFile instanceof File) || maybeFile.size <= 0) {
                setUploadFeedback({ status: "error", message: "Please choose a file to upload." });
                return;
              }

              if (!allowedUploadMimeTypes.includes(maybeFile.type)) {
                setUploadFeedback({
                  status: "error",
                  message: `Unsupported file type: ${maybeFile.type || "unknown"}.`,
                });
                return;
              }

              if (maybeFile.size > maxFileSizeBytes) {
                setUploadFeedback({
                  status: "error",
                  message: `File exceeds ${maxFileSizeMb}MB upload limit.`,
                });
                return;
              }

              setUploadPending(true);
              try {
                const response = await fetch("/api/media/upload", {
                method: "POST",
                body: formData,
              });
              const payload = await response.json().catch(() => null);

              if (!response.ok) {
                setUploadFeedback({
                  status: "error",
                  message: extractUploadErrorMessage(payload, "File upload failed."),
                });
                return;
              }

              setUploadFeedback({ status: "success", message: "Asset uploaded successfully." });
              setSelectedFileLabel("");
              form.reset();
              router.refresh();
            } catch {
              setUploadFeedback({
                status: "error",
                message: "Network error while uploading. Please try again.",
              });
            } finally {
              setUploadPending(false);
            }
          }}
        >
          <div className="space-y-1 md:col-span-2">
            <label className="text-sm font-medium">File</label>
            <input
              name="file"
              type="file"
              required
              accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml,application/pdf,text/plain"
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              onChange={(event) => {
                const file = event.currentTarget.files?.[0];
                if (!file) {
                  setSelectedFileLabel("");
                  return;
                }
                const readableSize =
                  file.size < 1024 * 1024
                    ? `${Math.max(1, Math.round(file.size / 1024))}KB`
                    : `${(file.size / (1024 * 1024)).toFixed(1)}MB`;
                setSelectedFileLabel(`${file.name} (${readableSize})`);
              }}
            />
            <p className="text-xs text-muted-foreground">
              JPG, PNG, WebP, GIF, SVG, PDF, TXT up to {maxFileSizeMb}MB.
              {selectedFileLabel ? ` Selected: ${selectedFileLabel}` : ""}
            </p>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Asset name (optional)</label>
            <input
              name="name"
              placeholder="Brand logo"
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Tags (comma separated)</label>
            <input
              name="tags"
              placeholder="logo, banner"
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            />
          </div>
          <div className="space-y-1 md:col-span-2">
            <label className="text-sm font-medium">Alt text</label>
            <input
              name="altText"
              placeholder="Accessibility description"
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            />
          </div>
          <div className="md:col-span-2">
            <Button type="submit" disabled={uploadPending}>
              {uploadPending ? "Uploading..." : "Upload File"}
            </Button>
          </div>
        </form>
      </section>

      <section className="rounded-lg border bg-card p-5 space-y-4">
        <h2 className="text-base font-semibold">Add Existing Public URL (fallback)</h2>
        <p className="text-sm text-muted-foreground">
          Use only when an asset is hosted externally and should not be uploaded here.
        </p>
        <form
          className="grid gap-3 md:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault();
            const form = event.currentTarget;
            const formData = new FormData(form);
            runAssetAction(() => createMediaAsset(formData), "External URL asset saved.", () => form.reset());
          }}
        >
          <div className="space-y-1">
            <label className="text-sm font-medium">Asset name</label>
            <input
              name="name"
              required
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Public URL</label>
            <input
              name="url"
              type="url"
              required
              placeholder="https://..."
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">MIME type</label>
            <input
              name="mimeType"
              placeholder="image/png"
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Size (bytes)</label>
            <input
              name="sizeBytes"
              type="number"
              min="0"
              placeholder="20480"
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Tags (comma separated)</label>
            <input
              name="tags"
              placeholder="logo, banner"
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Alt text</label>
            <input
              name="altText"
              placeholder="Accessibility description"
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            />
          </div>
          <div className="md:col-span-2">
            <Button type="submit" variant="outline" disabled={actionPending}>
              Save URL Asset
            </Button>
          </div>
        </form>
      </section>

      <section className="rounded-lg border bg-card p-5">
        <h2 className="mb-4 text-base font-semibold">Library Assets</h2>
        <FormFeedback status={assetFeedback?.status || "success"} message={assetFeedback?.message} />
        {assets.length === 0 ? (
          <p className="text-sm text-muted-foreground">No assets uploaded yet.</p>
        ) : (
          <div className="space-y-6">
            <DataTable
              columns={columns}
              rows={tableRows}
              rowKey={(row) => row.id}
              bulk={{
                getRowLabel: (row) => row.name,
                actions: [
                  {
                    key: "archive",
                    label: "Archive selected",
                    variant: "destructive",
                    action: async (formData) => {
                      const result = await bulkArchiveMediaAssets(formData);
                      setAssetFeedback({
                        status: result.success && !result.error ? "success" : "error",
                        message: result.error || result.message || "Bulk action completed.",
                      });
                      router.refresh();
                    },
                  },
                  {
                    key: "restore",
                    label: "Restore selected",
                    action: async (formData) => {
                      const result = await bulkRestoreMediaAssets(formData);
                      setAssetFeedback({
                        status: result.success && !result.error ? "success" : "error",
                        message: result.error || result.message || "Bulk action completed.",
                      });
                      router.refresh();
                    },
                  },
                  {
                    key: "delete",
                    label: "Delete selected",
                    variant: "destructive",
                    action: async (formData) => {
                      const result = await bulkDeleteMediaAssets(formData);
                      setAssetFeedback({
                        status: result.success && !result.error ? "success" : "error",
                        message: result.error || result.message || "Bulk action completed.",
                      });
                      router.refresh();
                    },
                  },
                ],
              }}
              noCard
            />
            {assets.map((asset) => (
              <article key={asset.id} className="rounded-md border p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium">{asset.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {asset.fileName} • {asset.mimeType} • {asset.kind}
                    </p>
                  </div>
                  <span
                    className={`rounded px-2 py-1 text-xs ${
                      asset.status === "active"
                        ? "bg-green-100 text-green-800"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {asset.status}
                  </span>
                </div>

                <a
                  href={asset.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-block text-sm text-primary hover:underline break-all"
                >
                  {asset.url}
                </a>

                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    const formData = new FormData(event.currentTarget);
                    runAssetAction(() => updateMediaAsset(asset.id, formData), "Asset metadata updated.");
                  }}
                  className="grid gap-3 md:grid-cols-3"
                >
                  <div className="space-y-1">
                    <label className="text-xs font-medium">Name</label>
                    <input
                      name="name"
                      defaultValue={asset.name}
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium">Tags</label>
                    <input
                      name="tags"
                      defaultValue={asset.tags.join(", ")}
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium">Alt text</label>
                    <input
                      name="altText"
                      defaultValue={asset.altText || ""}
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                    />
                  </div>
                  <div className="md:col-span-3 flex items-center gap-2">
                    <Button type="submit" variant="outline" disabled={actionPending}>
                      Update
                    </Button>
                  </div>
                </form>
              </article>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
