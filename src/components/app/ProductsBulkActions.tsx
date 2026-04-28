"use client";

import { BulkActions } from "./BulkActions";
import { bulkImportProducts } from "@/lib/actions/bulk";
import { exportProductsCsv } from "@/lib/utils/csv-export";

export function ProductsBulkActions({ products }: { products: any[] }) {
  const handleExport = () => {
    const csv = exportProductsCsv(products);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `products-export-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  return (
    <BulkActions
      entityName="products"
      onExport={handleExport}
      onImport={bulkImportProducts}
    />
  );
}
