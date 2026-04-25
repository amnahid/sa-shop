export interface ParsedProduct {
  sku: string;
  barcode?: string;
  name: string;
  nameAr?: string;
  category?: string;
  unit: string;
  sellingPrice: number;
  vatRate: number;
  trackStock: boolean;
  lowStockThreshold: number;
  expiryTracking: boolean;
  quantity: number;
}

export function parseCSV(csvText: string): ParsedProduct[] {
  const lines = csvText.trim().split("\n");
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const products: ParsedProduct[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",").map((v) => v.trim());
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] || "";
    });

    const name = row.name;
    if (!name) continue;

    const sku = row.sku || `SKU-${Date.now()}-${i}`;

    products.push({
      sku,
      barcode: row.barcode || undefined,
      name,
      nameAr: row.namear || undefined,
      category: row.category || undefined,
      unit: row.unit || "piece",
      sellingPrice: parseFloat(row.sellingprice || "0"),
      vatRate: parseFloat(row.vatrate || "0.15"),
      trackStock: row.trackstock !== "false",
      lowStockThreshold: parseInt(row.lowstockthreshold || "10"),
      expiryTracking: row.expirytracking === "true",
      quantity: parseFloat(row.quantity || "0"),
    });
  }

  return products;
}

export function generateSKU(prefix: string = "SKU"): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${timestamp}${random}`;
}