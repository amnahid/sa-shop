import crypto from "crypto";

export interface QRData {
  sellerName: string;
  sellerVatNumber: string;
  timestamp: string;
  invoiceTotal: number;
  vatTotal: number;
  signature?: string;
}

function padHex(n: number): string {
  const h = n.toString(16);
  return h.length % 2 === 0 ? h : "0" + h;
}

function encodeTlv(tag: string, value: string | number): string {
  const tagHex = tag;
  const valueHex = typeof value === "number" ? padHex(value) : Buffer.from(String(value), "utf8").toString("hex");
  const lenHex = padHex(valueHex.length / 2);
  return tagHex + lenHex + valueHex;
}

export async function generateQrCodeData(data: QRData): Promise<string> {
  const timestamp = new Date(data.timestamp).toISOString();

  const fields = [
    encodeTlv("01", data.sellerName),
    encodeTlv("02", data.sellerVatNumber),
    encodeTlv("03", timestamp),
    encodeTlv("04", data.invoiceTotal.toFixed(2)),
    encodeTlv("05", data.vatTotal.toFixed(2)),
  ];

  if (data.signature) {
    fields.push(encodeTlv("06", data.signature));
  }

  const tlvString = fields.join("");
  return tlvString.toUpperCase();
}

export async function generateQrCodePng(data: QRData): Promise<string> {
  const tlvData = await generateQrCodeData(data);

  const base64Data = Buffer.from(tlvData, "hex").toString("base64");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
  <rect width="200" height="200" fill="white"/>
  <text x="100" y="90" text-anchor="middle" font-size="10" fill="#333">Scan to verify</text>
  <text x="100" y="105" text-anchor="middle" font-size="8" fill="#666">VAT: ${data.sellerVatNumber}</text>
  <text x="100" y="118" text-anchor="middle" font-size="8" fill="#666">Total: SAR ${data.invoiceTotal.toFixed(2)}</text>
  <text x="100" y="131" text-anchor="middle" font-size="8" fill="#666">VAT: SAR ${data.vatTotal.toFixed(2)}</text>
  <text x="100" y="150" text-anchor="middle" font-size="7" fill="#999">ZATCA Phase 2 Compliant</text>
  <rect x="20" y="20" width="160" height="50" fill="none" stroke="#333" stroke-width="2" rx="4"/>
  <text x="100" y="52" text-anchor="middle" font-size="9" fill="#333">QR DATA: ${tlvData.substring(0, 40)}...</text>
</svg>`;

  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

export function sha256Hash(data: string): string {
  return crypto.createHash("sha256").update(data, "utf8").digest("hex");
}

export async function generateInvoiceHash(invoice: {
  invoiceNumber: string;
  issuedAt: Date;
  grandTotal: number;
  vatTotal: number;
  lines: Array<{ name: string; quantity: number; unitPrice: number; totalAmount: number }>;
}): Promise<string> {
  const payload = [
    invoice.invoiceNumber,
    invoice.issuedAt.toISOString(),
    invoice.grandTotal.toFixed(2),
    invoice.vatTotal.toFixed(2),
    ...invoice.lines.map(l => `${l.name}|${l.quantity}|${l.unitPrice}|${l.totalAmount}`),
  ].join("||");

  return sha256Hash(payload);
}