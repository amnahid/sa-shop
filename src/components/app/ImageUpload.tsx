"use client";

import { useState, useRef } from "react";
import { Upload, X, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

interface ImageUploadProps {
  value?: string[];
  onChange: (urls: string[]) => void;
  label?: string;
  maxImages?: number;
  className?: string;
  previewSize?: "compact" | "comfortable";
}

export function ImageUpload({
  value = [],
  onChange,
  label,
  maxImages = 5,
  className,
  previewSize = "comfortable",
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();
  const maxFileSizeBytes = 10 * 1024 * 1024;
  const allowedMimeTypes = new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "image/svg+xml",
  ]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (value.length + files.length > maxImages) {
      showToast(`You can only upload up to ${maxImages} images`, "error");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    for (const file of Array.from(files)) {
      if (!allowedMimeTypes.has(file.type)) {
        showToast(`Unsupported image type: ${file.type || "unknown"}`, "error");
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }

      if (file.size > maxFileSizeBytes) {
        showToast(`"${file.name}" exceeds 10MB upload limit`, "error");
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }
    }

    setUploading(true);
    const newUrls = [...value];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append("file", file);
        formData.append("name", file.name);

        const response = await fetch("/api/media/upload", {
          method: "POST",
          body: formData,
        });

        const result = await response.json();
        if (response.ok && result.asset?.url) {
          newUrls.push(result.asset.url);
        } else {
          showToast(result.error?.message || "Failed to upload image", "error");
        }
      }
      onChange(newUrls);
    } catch (error) {
      showToast("An error occurred during upload", "error");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeImage = (urlToRemove: string) => {
    onChange(value.filter((url) => url !== urlToRemove));
  };

  const isSingleMode = maxImages === 1;
  const gridClassName = isSingleMode
    ? "grid grid-cols-1"
    : previewSize === "compact"
      ? "grid grid-cols-2 sm:grid-cols-3 gap-3"
      : "grid grid-cols-2 gap-3 sm:grid-cols-2 md:grid-cols-3";
  const tileAspectClassName = isSingleMode
    ? "aspect-[4/3] min-h-44"
    : previewSize === "compact"
      ? "aspect-square"
      : "aspect-[4/3] sm:aspect-square";

  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <label className="text-[11px] font-black uppercase tracking-widest text-gray-700 ml-0.5">
          {label}
        </label>
      )}
      
      <div className={gridClassName}>
        {value.map((url) => (
          <div
            key={url}
            className={cn(
              "group relative rounded-lg border border-gray-200 bg-gray-50 overflow-hidden shadow-sm",
              tileAspectClassName
            )}
          >
            <img
              src={url}
              alt="Uploaded asset"
              className="h-full w-full object-cover transition-transform group-hover:scale-105"
            />
            <button
              type="button"
              onClick={() => removeImage(url)}
              aria-label="Remove uploaded image"
              className="absolute top-1 right-1 p-1 bg-white/90 rounded-full text-danger shadow-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white"
            >
              <X className="size-3" />
            </button>
          </div>
        ))}

        {value.length < maxImages && (
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              "flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-white transition-all hover:border-primary/50 hover:bg-soft-primary/10",
              tileAspectClassName,
              uploading && "cursor-not-allowed opacity-50"
            )}
            aria-label={uploading ? "Uploading image" : "Upload image"}
          >
            {uploading ? (
              <Loader2 className="size-6 text-primary animate-spin" />
            ) : (
              <>
                <Upload className="size-6 text-gray-400 mb-1" />
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                  {value.length === 0 ? "Upload" : "Add more"}
                </span>
              </>
            )}
          </button>
        )}
      </div>

      <input
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
        className="hidden"
        ref={fileInputRef}
        onChange={handleFileChange}
      />
      
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">
        JPG, PNG, WebP, GIF, SVG up to 10MB. {value.length} / {maxImages} uploaded.
      </p>
    </div>
  );
}
