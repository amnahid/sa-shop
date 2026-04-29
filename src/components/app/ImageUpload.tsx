"use client";

import { useState, useRef } from "react";
import { Upload, X, Loader2, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

interface ImageUploadProps {
  value?: string[];
  onChange: (urls: string[]) => void;
  label?: string;
  maxImages?: number;
  className?: string;
}

export function ImageUpload({
  value = [],
  onChange,
  label,
  maxImages = 5,
  className,
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (value.length + files.length > maxImages) {
      showToast(`You can only upload up to ${maxImages} images`, "error");
      return;
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

  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <label className="text-[11px] font-black uppercase tracking-widest text-gray-700 ml-0.5">
          {label}
        </label>
      )}
      
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {value.map((url) => (
          <div
            key={url}
            className="group relative aspect-square rounded-lg border border-gray-200 bg-gray-50 overflow-hidden shadow-sm"
          >
            <img
              src={url}
              alt="Uploaded asset"
              className="h-full w-full object-cover transition-transform group-hover:scale-105"
            />
            <button
              type="button"
              onClick={() => removeImage(url)}
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
              "aspect-square flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-white transition-all hover:border-primary/50 hover:bg-soft-primary/10",
              uploading && "cursor-not-allowed opacity-50"
            )}
          >
            {uploading ? (
              <Loader2 className="size-6 text-primary animate-spin" />
            ) : (
              <>
                <Upload className="size-6 text-gray-400 mb-1" />
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Upload</span>
              </>
            )}
          </button>
        )}
      </div>

      <input
        type="file"
        multiple
        accept="image/*"
        className="hidden"
        ref={fileInputRef}
        onChange={handleFileChange}
      />
      
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">
        PNG, JPG, WebP up to 10MB. {value.length} / {maxImages} uploaded.
      </p>
    </div>
  );
}
