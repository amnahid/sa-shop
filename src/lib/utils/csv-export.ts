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

export function exportProductsCsv(products: Record<string, unknown>[]): string {
  const lines: string[] = ["SKU,Barcode,Name,Arabic Name,Price,Unit,VAT Rate,Stock Track,Low Stock Threshold"];
  products.forEach((p) => {
    lines.push(
      csvLine([
        p.sku as string,
        (p.barcode as string) || "",
        p.name as string,
        (p.nameAr as string) || "",
        p.sellingPrice as number,
        (p.unit as string) || "piece",
        p.vatRate as number,
        p.trackStock ? "TRUE" : "FALSE",
        (p.lowStockThreshold as number) || 10,
      ])
    );
  });
  return lines.join("\n");
}

export function exportCustomersCsv(customers: Record<string, unknown>[]): string {
  const lines: string[] = ["Name,Arabic Name,Phone,Email,VAT Number,City"];
  customers.forEach((c) => {
    lines.push(
      csvLine([
        c.name as string,
        (c.nameAr as string) || "",
        (c.phone as string) || "",
        (c.email as string) || "",
        (c.vatNumber as string) || "",
        (c.city as string) || "",
      ])
    );
  });
  return lines.join("\n");
}

export function exportSuppliersCsv(suppliers: Record<string, unknown>[]): string {
  const lines: string[] = ["Name,Contact,Phone,Email,VAT Number,Payment Terms"];
  suppliers.forEach((s) => {
    lines.push(
      csvLine([
        s.name as string,
        (s.contactName as string) || "",
        (s.phone as string) || "",
        (s.email as string) || "",
        (s.vatNumber as string) || "",
        (s.paymentTerms as string) || "",
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
    accountNameAr?: string;
    accountType: string;
    openingBalance?: number;
    debit: number;
    credit: number;
    balance: number;
    closingBalance?: number;
  }>;
  totalDebit: number;
  totalCredit: number;
}): string {
  const lines: string[] = ["Account Code,Account Name,Arabic Name,Type,Opening Balance,Debit,Credit,Closing Balance"];
  data.rows.forEach((row) => {
    const closing = row.closingBalance ?? row.balance;
    const opening = row.openingBalance ?? 0;
    lines.push(csvLine([row.accountCode, row.accountName, row.accountNameAr ?? "", row.accountType, opening, row.debit, row.credit, closing]));
  });
  const totalOpening = data.rows.reduce((s, r) => s + (r.openingBalance ?? 0), 0);
  const totalClosing = data.rows.reduce((s, r) => s + (r.closingBalance ?? r.balance), 0);
  lines.push(csvLine(["TOTAL", "", "", "", totalOpening, data.totalDebit, data.totalCredit, totalClosing]));
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
