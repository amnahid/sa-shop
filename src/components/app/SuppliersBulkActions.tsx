"use client";

import { BulkActions } from "./BulkActions";
import { bulkImportSuppliers } from "@/lib/actions/bulk";
import { exportSuppliersCsv } from "@/lib/utils/csv-export";

export function SuppliersBulkActions({ suppliers }: { suppliers: unknown[] }) {
  const handleExport = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const csv = exportSuppliersCsv(suppliers as any[]);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `suppliers-export-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  return (
    <BulkActions
      entityName="suppliers"
      onExport={handleExport}
      onImport={bulkImportSuppliers}
    />
  );
}
