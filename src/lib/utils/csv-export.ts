export function exportSalesCsv(data: {
  summary: Record<string, unknown>;
  hourly: Array<{ hour: number; label: string; total: number; count: number }>;
  byBranch: Array<{ branchName: string; total: number; count: number }>;
}): string {
  const lines: string[] = ["Type,Label,Total,Count"];
  lines.push(`Summary,Total Sales,${data.summary.totalSales},${data.summary.transactionCount}`);
  lines.push(`Summary,Total VAT,${data.summary.totalVat},`);
  lines.push(`Summary,Total Discount,${data.summary.totalDiscount},`);
  lines.push("");
  lines.push("Hourly Breakdown");
  lines.push("Hour,Total,Transactions");
  data.hourly.forEach(h => {
    lines.push(`${h.label},${h.total},${h.count}`);
  });
  lines.push("");
  lines.push("By Branch");
  lines.push("Branch,Total,Transactions");
  data.byBranch.forEach(b => {
    lines.push(`${b.branchName},${b.total},${b.count}`);
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
  movements.forEach(m => {
    lines.push([
      m.createdAt.toISOString(),
      `"${m.product?.name || ""}"`,
      m.product?.sku || "",
      m.branch?.name || "",
      m.type,
      m.quantityDelta,
      m.quantityAfter,
      `"${m.reason || ""}"`,
      m.user?.name || "",
    ].join(","));
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
  items.forEach(i => {
    lines.push([
      `"${i.productName}"`,
      i.productSku,
      i.branchName,
      i.quantity,
      i.threshold,
      i.deficit,
    ].join(","));
  });
  return lines.join("\n");
}