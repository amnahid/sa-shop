"use client";

import { useState, useRef } from "react";
import { Upload, X, Loader2, Image as ImageIcon } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import Image from "next/image";

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
  const [isDragging, setIsDragging] = useState(false);
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

  const handleFiles = async (files: FileList | File[]) => {
    if (files.length === 0) return;

    if (value.length + files.length > maxImages) {
      showToast(`You can only upload up to ${maxImages} images`, "error");
      return;
    }

    // Validation
    for (const file of Array.from(files)) {
      if (!allowedMimeTypes.has(file.type)) {
        showToast(`Unsupported image type: ${file.type || "unknown"}`, "error");
        return;
      }
      if (file.size > maxFileSizeBytes) {
        showToast(`"${file.name}" exceeds 10MB upload limit`, "error");
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
          showToast(result.error?.message || `Failed to upload ${file.name}`, "error");
        }
      }
      onChange(newUrls);
    } catch {
      showToast("An error occurred during upload", "error");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) handleFiles(e.target.files);
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) handleFiles(e.dataTransfer.files);
  };

  const removeImage = (urlToRemove: string) => {
    onChange(value.filter((url) => url !== urlToRemove));
  };

  const isEmpty = value.length === 0;
  const isSingleMode = maxImages === 1;

  const gridClassName = isSingleMode
    ? "grid grid-cols-1"
    : previewSize === "compact"
      ? "grid grid-cols-2 sm:grid-cols-3 gap-3"
      : "grid grid-cols-2 gap-4 sm:grid-cols-2 md:grid-cols-3";

  const tileAspectClassName = isSingleMode
    ? "aspect-[4/3] min-h-44"
    : previewSize === "compact"
      ? "aspect-square"
      : "aspect-[4/3] sm:aspect-square";

  return (
    <div className={cn("space-y-3", className)}>
      {label && (
        <label className="text-[11px] font-black uppercase tracking-widest text-gray-700 ms-0.5">
          {label}
        </label>
      )}
      
      {isEmpty ? (
        <div
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            "relative group flex flex-col items-center justify-center py-10 px-6 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50/50 transition-all cursor-pointer hover:bg-soft-primary/5 hover:border-primary/30",
            isDragging && "bg-soft-primary/10 border-primary shadow-inner",
            uploading && "opacity-50 cursor-wait"
          )}
        >
          {uploading ? (
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="size-10 text-primary animate-spin" />
              <span className="text-xs font-bold text-primary uppercase tracking-widest animate-pulse">Uploading...</span>
            </div>
          ) : (
            <>
              <div className="p-4 rounded-full bg-white shadow-sm border border-gray-100 mb-4 group-hover:scale-110 transition-transform">
                <Upload className="size-8 text-gray-400 group-hover:text-primary transition-colors" />
              </div>
              <div className="text-center">
                <p className="text-xs font-black uppercase tracking-widest text-gray-700 mb-1">Click or drag images to upload</p>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">JPG, PNG, WebP, GIF up to 10MB (Max {maxImages})</p>
              </div>
            </>
          )}
        </div>
      ) : (
        <div className={gridClassName}>
          {value.map((url, index) => (
            <div
              key={url}
              className={cn(
                "group relative rounded-xl border border-gray-200 bg-gray-50 overflow-hidden shadow-sm",
                tileAspectClassName
              )}
            >
              <Image
                src={url}
                alt={`Uploaded asset ${index + 1}`}
                width={400}
                height={400}
                unoptimized
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => removeImage(url)}
                  className="p-2 bg-white rounded-full text-danger shadow-lg transform translate-y-2 group-hover:translate-y-0 transition-all duration-300 hover:bg-danger hover:text-white"
                  title="Remove image"
                >
                  <X className="size-4" />
                </button>
              </div>
              {index === 0 && !isSingleMode && (
                <div className="absolute top-2 start-2 px-2 py-0.5 bg-primary/90 text-[8px] font-black text-white uppercase tracking-widest rounded-full shadow-sm">
                  Main
                </div>
              )}
            </div>
          ))}

          {value.length < maxImages && (
            <button
              type="button"
              disabled={uploading}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 transition-all hover:border-primary/30 hover:bg-soft-primary/5 group",
                tileAspectClassName,
                isDragging && "bg-soft-primary/10 border-primary",
                uploading && "cursor-wait opacity-50"
              )}
            >
              {uploading ? (
                <Loader2 className="size-6 text-primary animate-spin" />
              ) : (
                <>
                  <Upload className="size-6 text-gray-400 mb-1 group-hover:text-primary transition-colors" />
                  <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest group-hover:text-primary transition-colors">Add More</span>
                </>
              )}
            </button>
          )}
        </div>
      )}

      <input
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
        className="hidden"
        ref={fileInputRef}
        onChange={handleFileChange}
      />
      
      {!isEmpty && (
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tight flex items-center gap-2">
          <ImageIcon className="size-3" />
          {value.length} of {maxImages} uploaded. {isSingleMode ? "Only one image allowed." : "First image is the main cover."}
        </p>
      )}
    </div>
  );
}
