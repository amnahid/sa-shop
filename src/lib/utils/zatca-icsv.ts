export interface IcsvRow {
  invoiceNumber: string;
  uuid: string;
  issuedAt: string;
  sellerName: string;
  sellerVat: string;
  buyerName: string;
  buyerVat: string;
  invoiceType: string;
  grandTotal: number;
  vatTotal: number;
  totalExclusive: number;
  discountTotal: number;
  lineCount: number;
  invoiceHash: string;
}

const ICSV_HEADERS = [
  "invoice_number",
  "uuid",
  "issue_date",
  "issue_time",
  "seller_name",
  "seller_vat",
  "buyer_name",
  "buyer_vat",
  "invoice_type",
  "grand_total_sar",
  "vat_total_sar",
  "total_exclusive_sar",
  "discount_total_sar",
  "line_count",
  "invoice_hash",
];

export function buildIcsvHeader(): string {
  return ICSV_HEADERS.join(",");
}

export function buildIcsvRow(row: IcsvRow): string {
  const issued = new Date(row.issuedAt);
  const fields = [
    `"${row.invoiceNumber}"`,
    `"${row.uuid}"`,
    issued.toISOString().split("T")[0],
    issued.toISOString().split("T")[1]?.substring(0, 8) || "00:00:00",
    `"${row.sellerName}"`,
    `"${row.sellerVat}"`,
    `"${row.buyerName}"`,
    `"${row.buyerVat}"`,
    row.invoiceType,
    row.grandTotal.toFixed(2),
    row.vatTotal.toFixed(2),
    row.totalExclusive.toFixed(2),
    row.discountTotal.toFixed(2),
    row.lineCount.toString(),
    `"${row.invoiceHash}"`,
  ];
  return fields.join(",");
}

export function buildIcsv(rows: IcsvRow[]): string {
  const lines: string[] = [buildIcsvHeader()];
  rows.forEach(row => lines.push(buildIcsvRow(row)));
  return lines.join("\n");
}