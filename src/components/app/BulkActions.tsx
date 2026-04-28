"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Upload, Loader2 } from "lucide-react";
import { parseCSV } from "@/lib/utils/csv";
import { useToast } from "@/components/ui/toast";

interface BulkActionsProps {
  onExport: () => void;
  onImport: (data: any[]) => Promise<{ success?: boolean; error?: string }>;
  entityName: string;
}

export function BulkActions({ onExport, onImport, entityName }: BulkActionsProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const { showToast } = useToast();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      const data = parseCSV(text);
      
      if (data.length === 0) {
        showToast("Invalid or empty CSV file", "error");
        setImporting(false);
        return;
      }

      const result = await onImport(data);
      if (result.success) {
        showToast(`Successfully imported ${data.length} ${entityName}`, "success");
      } else {
        showToast(result.error || "Import failed", "error");
      }
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    };
    reader.readAsText(file);
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={onExport}
        className="font-bold uppercase tracking-wider text-[11px]"
      >
        <Download className="size-3.5 mr-2" />
        Export
      </Button>
      
      <div className="relative">
        <input
          type="file"
          accept=".csv"
          className="hidden"
          ref={fileInputRef}
          onChange={handleFileChange}
          disabled={importing}
        />
        <Button
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={importing}
          className="font-bold uppercase tracking-wider text-[11px]"
        >
          {importing ? (
            <Loader2 className="size-3.5 mr-2 animate-spin" />
          ) : (
            <Upload className="size-3.5 mr-2" />
          )}
          Import
        </Button>
      </div>
    </div>
  );
}
