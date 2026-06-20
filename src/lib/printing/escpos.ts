export type TextAlignment = "left" | "center" | "right";
export type FontSize = "normal" | "small" | "large";

interface TextOptions {
  align?: TextAlignment;
  bold?: boolean;
  doubleWidth?: boolean;
  doubleHeight?: boolean;
  fontSize?: FontSize;
}

function textEncoder(text: string): Uint8Array {
  const encoder = new TextEncoder();
  return encoder.encode(text);
}

export function escposInit(): Uint8Array {
  return new Uint8Array([0x1b, 0x40]);
}

export function escposLineFeed(n: number = 1): Uint8Array {
  return new Uint8Array(n).fill(0x0a);
}

export function escposSetCharset(charset: number = 0): Uint8Array {
  return new Uint8Array([0x1b, 0x74, charset]);
}

export function escposSetAlignment(align: TextAlignment): Uint8Array {
  const values = { left: 0, center: 1, right: 2 };
  return new Uint8Array([0x1b, 0x61, values[align]]);
}

export function escposSetPrintMode(options: TextOptions): Uint8Array {
  let mode = 0;
  if (options.bold) mode |= 0x08;
  if (options.doubleHeight) mode |= 0x10;
  if (options.doubleWidth) mode |= 0x20;
  if (options.fontSize === "small") mode |= 0x01;
  return new Uint8Array([0x1b, 0x21, mode]);
}

export function escposResetPrintMode(): Uint8Array {
  return new Uint8Array([0x1b, 0x21, 0]);
}

export function escposBold(on: boolean): Uint8Array {
  return new Uint8Array([0x1b, 0x45, on ? 1 : 0]);
}

export function escposText(text: string): Uint8Array {
  return textEncoder(text);
}

export function escposLine(text: string, options: TextOptions = {}): Uint8Array {
  const parts: Uint8Array[] = [];
  if (options.align) parts.push(escposSetAlignment(options.align));
  if (options.bold) parts.push(escposBold(true));
  if (options.doubleWidth || options.doubleHeight) parts.push(escposSetPrintMode(options));
  parts.push(textEncoder(text));
  parts.push(escposLineFeed());
  if (options.bold) parts.push(escposBold(false));
  if (options.doubleWidth || options.doubleHeight) parts.push(escposResetPrintMode());
  if (options.align) parts.push(escposSetAlignment("left"));
  return concat(...parts);
}

export function escposDivider(char: string = "-", length: number = 42): Uint8Array {
  return escposLine(char.repeat(length));
}

export function escposQRCode(data: string, size: number = 6, ecc: "L" | "M" | "Q" | "H" = "M"): Uint8Array {
  const d = textEncoder(data);
  const dLen = d.length + 3;
  const pH = Math.floor(dLen / 256);
  const pL = dLen % 256;

  const eccMap = { L: 48, M: 49, Q: 50, H: 51 };

  return concat(
    // Function 165: Set QR model (model 2)
    new Uint8Array([0x1d, 0x28, 0x6b, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00]),
    // Function 167: Set QR size
    new Uint8Array([0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x43, size]),
    // Function 169: Set error correction
    new Uint8Array([0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x45, eccMap[ecc]]),
    // Function 180: Store QR data
    new Uint8Array([0x1d, 0x28, 0x6b, pL, pH, 0x31, 0x50, 0x30]),
    d,
    // Function 181: Print QR
    new Uint8Array([0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x51, 0x30]),
  );
}

export function escposCut(mode: "full" | "partial" = "full"): Uint8Array {
  return new Uint8Array([0x1d, 0x56, mode === "full" ? 0 : 1]);
}

export function escposOpenDrawer(): Uint8Array {
  return new Uint8Array([0x1b, 0x70, 0x00, 0x19, 0xfa]);
}

export function escposFeedAndCut(lines: number = 4): Uint8Array {
  return concat(escposLineFeed(lines), escposCut("partial"));
}

function concat(...arrays: Uint8Array[]): Uint8Array {
  const totalLength = arrays.reduce((acc, arr) => acc + arr.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }
  return result;
}

export function buildThermalReceipt(params: {
  businessName: string;
  businessNameAr?: string;
  vatNumber?: string;
  address?: string;
  phone?: string;
  invoiceNumber: string;
  date: string;
  items: Array<{ name: string; nameAr?: string; sku: string; price: number; qty: number; discount: number; total: number }>;
  subtotal: number;
  discountTotal: number;
  vatTotal: number;
  grandTotal: number;
  paymentMethod: string;
  qrData?: string;
  isNarrow?: boolean;
}): Uint8Array {
  const w = params.isNarrow ? 32 : 42;
  const fmtSAR = (n: number) => `SAR ${n.toFixed(2)}`;

  const leftCol = (label: string, value: string) => `${label.padEnd(w - value.length - 1, " ")} ${value}`;

  const parts: Uint8Array[] = [
    escposInit(),
    escposSetCharset(0),
  ];

  // Header
  parts.push(escposSetAlignment("center"));
  parts.push(escposSetPrintMode({ doubleWidth: true, doubleHeight: true, bold: true }));
  parts.push(escposLine(params.businessName));
  parts.push(escposResetPrintMode());

  if (params.businessNameAr) {
    parts.push(escposLine(params.businessNameAr));
  }
  if (params.address) parts.push(escposLine(params.address, { fontSize: "small" }));
  if (params.phone) parts.push(escposLine(params.phone, { fontSize: "small" }));
  if (params.vatNumber) parts.push(escposLine(`VAT: ${params.vatNumber}`, { fontSize: "small" }));

  parts.push(escposDivider("-", w));
  parts.push(escposSetAlignment("left"));

  // Meta
  parts.push(escposLine(`Invoice: ${params.invoiceNumber}`, { fontSize: "small" }));
  parts.push(escposLine(`Date: ${params.date}`, { fontSize: "small" }));

  parts.push(escposDivider("-", w));

  // Items header
  parts.push(escposSetPrintMode({ bold: true }));
  parts.push(escposLine("Item                     Price Qty Disc Total", { fontSize: "small" }));
  parts.push(escposResetPrintMode());

  for (const item of params.items) {
    const name = item.nameAr ? `${item.name} / ${item.nameAr}` : item.name;
    const truncated = name.length > 20 ? name.substring(0, 19) + "." : name;
    parts.push(escposLine(`${truncated.padEnd(20)}`));
    const detail = `${fmtSAR(item.price)} ${item.qty} ${item.discount > 0 ? fmtSAR(item.discount) : "-"} ${fmtSAR(item.total)}`;
    parts.push(escposLine(detail.padStart(w), { fontSize: "small" }));
  }

  parts.push(escposDivider("-", w));

  // Totals
  parts.push(escposLine(leftCol("Subtotal", fmtSAR(params.subtotal)), { fontSize: "small" }));
  if (params.discountTotal > 0) {
    parts.push(escposLine(leftCol("Discount", `-${fmtSAR(params.discountTotal)}`), { fontSize: "small" }));
  }
  parts.push(escposLine(leftCol("VAT (15%)", fmtSAR(params.vatTotal)), { fontSize: "small" }));

  parts.push(escposDivider("-", w));

  parts.push(escposSetPrintMode({ bold: true, doubleWidth: true }));
  parts.push(escposSetAlignment("center"));
  parts.push(escposLine(`TOTAL: ${fmtSAR(params.grandTotal)}`));
  parts.push(escposResetPrintMode());
  parts.push(escposSetAlignment("left"));

  // Payment
  parts.push(escposDivider("-", w));
  parts.push(escposLine(`Paid by: ${params.paymentMethod}`, { fontSize: "small" }));
  parts.push(escposLine(`Amount: ${fmtSAR(params.grandTotal)}`, { fontSize: "small" }));

  // QR code
  if (params.qrData) {
    parts.push(escposLineFeed(1));
    parts.push(escposSetAlignment("center"));
    parts.push(escposQRCode(params.qrData, params.isNarrow ? 4 : 6));
    parts.push(escposLineFeed(1));
    parts.push(escposSetAlignment("left"));
  }

  // Footer
  parts.push(escposSetAlignment("center"));
  parts.push(escposDivider("-", w));
  parts.push(escposLine("Thank you!"));
  parts.push(escposLineFeed(3));
  parts.push(escposCut("partial"));

  return concat(...parts);
}
