"use client";

import { BulkActions } from "./BulkActions";
import { bulkImportCustomers } from "@/lib/actions/bulk";
import { exportCustomersCsv } from "@/lib/utils/csv-export";

export function CustomersBulkActions({ customers }: { customers: any[] }) {
  const handleExport = () => {
    const csv = exportCustomersCsv(customers);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `customers-export-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  return (
    <BulkActions
      entityName="customers"
      onExport={handleExport}
      onImport={bulkImportCustomers}
    />
  );
}
