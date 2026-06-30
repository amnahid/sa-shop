"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Printer, ChevronDown, FileText, Receipt } from "lucide-react";

interface PrintFormatSelectorProps {
  invoiceId: string;
  invoiceType: "simplified" | "standard";
}

type PrintFormat = "a4" | "thermal-80" | "thermal-58";

const formatInfo: Record<PrintFormat, { label: string; icon: typeof FileText }> = {
  "a4": { label: "A4 Invoice", icon: FileText },
  "thermal-80": { label: "80mm Receipt", icon: Receipt },
  "thermal-58": { label: "58mm Receipt", icon: Receipt },
};

export function PrintFormatSelector({ invoiceType }: PrintFormatSelectorProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const recommended: PrintFormat = invoiceType === "standard" ? "a4" : "thermal-80";

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (format: PrintFormat) => {
    setOpen(false);
    const baseUrl = pathname;
    router.push(`${baseUrl}?format=${format}`);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 flex-1 py-2 px-3 rounded-md border border-input text-sm font-medium bg-background hover:bg-accent"
      >
        <Printer className="w-4 h-4" />
        <span>Print</span>
        <ChevronDown className="w-3 h-3 ml-auto" />
      </button>

      {open && (
        <div className="absolute bottom-full mb-1 left-0 right-0 bg-white border rounded-lg shadow-lg z-50 overflow-hidden">
          {(Object.keys(formatInfo) as PrintFormat[]).map((format) => {
            const Icon = formatInfo[format].icon;
            const isRecommended = format === recommended;
            return (
              <button
                key={format}
                onClick={() => handleSelect(format)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-accent text-left ${
                  isRecommended ? "bg-primary/5" : ""
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <div className="flex-1">
                  <span className="font-medium">{formatInfo[format].label}</span>
                  {isRecommended && (
                    <span className="ml-2 text-[10px] uppercase tracking-wider text-primary font-bold">
                      Recommended
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
