function csvLine(values: Array<string | number | boolean | null | undefined>) {
  return values
    .map((value) => {
      const raw = value === null || value === undefined ? "" : String(value);
      if (/[",\n]/.test(raw)) {
        const escaped = raw.replace(/"/g, '""');
        return `"${escaped}"`;
      }
      return raw;
    })
    .join(",");
}

export function exportProductsCsv(products: Record<string, any>[]): string {
  const lines: string[] = ["SKU,Barcode,Name,Arabic Name,Price,Unit,VAT Rate,Stock Track,Low Stock Threshold"];
  products.forEach((p) => {
    lines.push(
      csvLine([
        p.sku,
        p.barcode || "",
        p.name,
        p.nameAr || "",
        p.sellingPrice,
        p.unit || "piece",
        p.vatRate,
        p.trackStock ? "TRUE" : "FALSE",
        p.lowStockThreshold || 10,
      ])
    );
  });
  return lines.join("\n");
}

export function exportCustomersCsv(customers: any[]): string {
  const lines: string[] = ["Name,Arabic Name,Phone,Email,VAT Number,City"];
  customers.forEach((c) => {
    lines.push(
      csvLine([
        c.name,
        c.nameAr || "",
        c.phone || "",
        c.email || "",
        c.vatNumber || "",
        c.city || "",
      ])
    );
  });
  return lines.join("\n");
}

export function exportSuppliersCsv(suppliers: any[]): string {
  const lines: string[] = ["Name,Contact,Phone,Email,VAT Number,Payment Terms"];
  suppliers.forEach((s) => {
    lines.push(
      csvLine([
        s.name,
        s.contactName || "",
        s.phone || "",
        s.email || "",
        s.vatNumber || "",
        s.paymentTerms || "",
      ])
    );
  });
  return lines.join("\n");
}

export function exportSalesCsv(data: {
  summary: Record<string, unknown>;
  hourly: Array<{ hour: number; label: string; total: number; count: number }>;
  byBranch: Array<{ branchName: string; total: number; count: number }>;
}): string {
  const lines: string[] = ["Type,Label,Total,Count"];
  lines.push(csvLine(["Summary", "Total Sales", data.summary.totalSales as number, data.summary.transactionCount as number]));
  lines.push(csvLine(["Summary", "Total VAT", data.summary.totalVat as number, ""]));
  lines.push(csvLine(["Summary", "Total Discount", data.summary.totalDiscount as number, ""]));
  lines.push("");
  lines.push("Hourly Breakdown");
  lines.push("Hour,Total,Transactions");
  data.hourly.forEach((h) => {
    lines.push(csvLine([h.label, h.total, h.count]));
  });
  lines.push("");
  lines.push("By Branch");
  lines.push("Branch,Total,Transactions");
  data.byBranch.forEach((b) => {
    lines.push(csvLine([b.branchName, b.total, b.count]));
  });
  return lines.join("\n");
}

export function exportMovementsCsv(movements: Array<{
  createdAt: Date;
  type: string;
  quantityDelta: string;
  quantityAfter: number;
  reason: string;
  product: { name: string; sku: string };
  branch: { name: string };
  user: { name: string };
}>): string {
  const lines: string[] = ["Date,Product,SKU,Branch,Type,Qty,After,Reason,User"];
  movements.forEach((m) => {
    lines.push(
      csvLine([
        m.createdAt.toISOString(),
        m.product?.name || "",
        m.product?.sku || "",
        m.branch?.name || "",
        m.type,
        m.quantityDelta,
        m.quantityAfter,
        m.reason || "",
        m.user?.name || "",
      ])
    );
  });
  return lines.join("\n");
}

export function exportLowStockCsv(items: Array<{
  productName: string;
  productSku: string;
  branchName: string;
  quantity: number;
  threshold: number;
  deficit: number;
}>): string {
  const lines: string[] = ["Product,SKU,Branch,Current Stock,Threshold,Deficit"];
  items.forEach((i) => {
    lines.push(csvLine([i.productName, i.productSku, i.branchName, i.quantity, i.threshold, i.deficit]));
  });
  return lines.join("\n");
}

export function exportTrialBalanceCsv(data: {
  rows: Array<{
    accountCode: string;
    accountName: string;
    accountType: string;
    debit: number;
    credit: number;
    balance: number;
  }>;
  totalDebit: number;
  totalCredit: number;
}): string {
  const lines: string[] = ["Account Code,Account Name,Type,Debit,Credit,Balance"];
  data.rows.forEach((row) => {
    lines.push(csvLine([row.accountCode, row.accountName, row.accountType, row.debit, row.credit, row.balance]));
  });
  lines.push(csvLine(["TOTAL", "", "", data.totalDebit, data.totalCredit, data.totalDebit - data.totalCredit]));
  return lines.join("\n");
}

export function exportLedgerByAccountCsv(data: {
  account: { code: string; name: string; type: string } | null;
  openingBalance: number;
  closingBalance: number;
  periodDebit: number;
  periodCredit: number;
  rows: Array<{
    entryDate: Date;
    kind: string;
    counterpartyName: string;
    referenceId: string;
    notes: string;
    debit: number;
    credit: number;
    runningBalance: number;
  }>;
}): string {
  const accountLabel = data.account
    ? `${data.account.code} · ${data.account.name} (${data.account.type})`
    : "Unknown Account";
  const lines: string[] = [
    csvLine(["Account", accountLabel]),
    csvLine(["Opening Balance", data.openingBalance]),
    "Date,Type,Counterparty,Reference,Notes,Debit,Credit,Running Balance",
  ];
  data.rows.forEach((row) => {
    lines.push(
      csvLine([
        row.entryDate.toISOString().split("T")[0],
        row.kind,
        row.counterpartyName,
        row.referenceId,
        row.notes,
        row.debit,
        row.credit,
        row.runningBalance,
      ])
    );
  });
  lines.push(csvLine(["", "", "", "", "Period Totals", data.periodDebit, data.periodCredit, data.closingBalance]));
  return lines.join("\n");
}

export function exportProfitAndLossSummaryCsv(data: {
  revenueByAccount: Array<{ accountCode: string; accountName: string; total: number }>;
  expenseByAccount: Array<{ accountCode: string; accountName: string; total: number }>;
  totalRevenue: number;
  totalExpense: number;
  netProfit: number;
}): string {
  const lines: string[] = ["Section,Account Code,Account Name,Amount"];
  data.revenueByAccount.forEach((item) => {
    lines.push(csvLine(["Revenue", item.accountCode, item.accountName, item.total]));
  });
  data.expenseByAccount.forEach((item) => {
    lines.push(csvLine(["Expense", item.accountCode, item.accountName, item.total]));
  });
  lines.push(csvLine(["TOTAL", "Revenue", "", data.totalRevenue]));
  lines.push(csvLine(["TOTAL", "Expense", "", data.totalExpense]));
  lines.push(csvLine(["TOTAL", "Net Profit/Loss", "", data.netProfit]));
  return lines.join("\n");
}
