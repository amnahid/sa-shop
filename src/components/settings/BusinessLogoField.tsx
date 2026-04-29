"use client";

import { useMemo, useState } from "react";
import { FormField } from "@/components/app/FormField";
import { ImageUpload } from "@/components/app/ImageUpload";
import { Button } from "@/components/ui/button";

interface BusinessLogoFieldProps {
  initialLogoUrl?: string | null;
}

export function BusinessLogoField({ initialLogoUrl }: BusinessLogoFieldProps) {
  const [logoUrl, setLogoUrl] = useState(initialLogoUrl || "");
  const [logoRemoved, setLogoRemoved] = useState(false);
  const imageValues = useMemo(() => (logoUrl ? [logoUrl] : []), [logoUrl]);

  return (
    <div className="space-y-3">
      <FormField label="Business Logo" htmlFor="logoUrl">
        <div className="space-y-3">
          <input type="hidden" id="logoUrl" name="logoUrl" value={logoUrl} />
          <input type="hidden" name="logoRemoved" value={logoRemoved ? "1" : "0"} />
          <ImageUpload
            value={imageValues}
            onChange={(urls) => {
              const nextLogoUrl = urls[0] || "";
              setLogoUrl(nextLogoUrl);
              setLogoRemoved(nextLogoUrl.length === 0);
            }}
            maxImages={1}
          />
          <div className="flex items-center justify-between gap-3">
            <p className="text-[10px] font-bold uppercase tracking-tight text-gray-400">
              Upload only. Accepted: JPG, PNG, WebP, GIF, SVG.
            </p>
            {logoUrl ? (
              <Button
                type="button"
                variant="outline"
                size="xs"
                onClick={() => {
                  setLogoUrl("");
                  setLogoRemoved(true);
                }}
              >
                Remove Logo
              </Button>
            ) : null}
          </div>
        </div>
      </FormField>
    </div>
  );
}
