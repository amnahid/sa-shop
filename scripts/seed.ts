import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { v4 as uuidv4 } from "uuid";

// ── DB Connection ─────────────────────────────────────────────────────────────
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/sa-shop";

async function connect() {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(MONGODB_URI);
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function padHex(n: number): string {
  const h = n.toString(16);
  return h.length % 2 === 0 ? h : "0" + h;
}

function encodeTlv(tag: string, value: string | number): string {
  const tagHex = tag;
  const valueHex =
    typeof value === "number"
      ? padHex(value)
      : Buffer.from(String(value), "utf8").toString("hex");
  const lenHex = padHex(valueHex.length / 2);
  return tagHex + lenHex + valueHex;
}

async function generateTlvQr(data: {
  sellerName: string;
  sellerVatNumber: string;
  timestamp: string;
  invoiceTotal: number;
  vatTotal: number;
}): Promise<string> {
  const timestamp = new Date(data.timestamp).toISOString();
  const fields = [
    encodeTlv("01", data.sellerName),
    encodeTlv("02", data.sellerVatNumber),
    encodeTlv("03", timestamp),
    encodeTlv("04", data.invoiceTotal.toFixed(2)),
    encodeTlv("05", data.vatTotal.toFixed(2)),
  ];
  return fields.join("").toUpperCase();
}

function sha256Hash(data: string): string {
  return crypto.createHash("sha256").update(data, "utf8").digest("hex");
}

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDate(daysAgo: number, daysRange: number): Date {
  const now = Date.now();
  const start = now - daysAgo * 24 * 60 * 60 * 1000;
  const end = now - (daysAgo - daysRange) * 24 * 60 * 60 * 1000;
  return new Date(start + Math.random() * (end - start));
}

// ── ZATCA XML Builder ──────────────────────────────────────────────────────────
function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function buildInvoiceXml(data: {
  invoiceNumber: string;
  uuid: string;
  issuedAt: Date;
  lines: Array<{
    sku: string;
    name: string;
    nameAr?: string;
    quantity: number;
    unitPrice: number;
    netAmount: number;
    vatAmount: number;
    totalAmount: number;
    vatRate: number;
    discountAmount: number;
  }>;
  subtotal: number;
  discountTotal: number;
  vatTotal: number;
  grandTotal: number;
  sellerName: string;
  sellerVatNumber: string;
  sellerAddress: string;
  sellerCrNumber: string;
  invoiceType: "simplified" | "standard";
  invoiceHash: string;
}): string {
  const lines = data.lines
    .map(
      (line) => `
    <inv:InvoiceLine>
      <inv:ID>${escapeXml(line.sku)}</inv:ID>
      <inv:ItemName>${escapeXml(line.name)}</inv:ItemName>
      ${line.nameAr ? `<inv:ItemNameAr>${escapeXml(line.nameAr)}</inv:ItemNameAr>` : ""}
      <inv:Quantity unitCode="C62">${line.quantity}</inv:Quantity>
      <inv:UnitPrice>${line.unitPrice.toFixed(2)}</inv:UnitPrice>
      <inv:TaxableAmount>${line.netAmount.toFixed(2)}</inv:TaxableAmount>
      <inv:TaxAmount>${line.vatAmount.toFixed(2)}</inv:TaxAmount>
      <inv:TaxPercentage>${(line.vatRate * 100).toFixed(0)}</inv:TaxPercentage>
      <inv:DiscountAmount>${line.discountAmount.toFixed(2)}</inv:DiscountAmount>
      <inv:LineTotalAmount>${line.totalAmount.toFixed(2)}</inv:LineTotalAmount>
    </inv:InvoiceLine>`
    )
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<inv:Invoice xmlns:inv="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
             xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
             xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"
             xmlns:ext="urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2">
  <cbc:UBLVersionID>2.1</cbc:UBLVersionID>
  <cbc:ProfileID>reporting:1.0</cbc:ProfileID>
  <cbc:ID>${escapeXml(data.invoiceNumber)}</cbc:ID>
  <cbc:UUID>${data.uuid}</cbc:UUID>
  <cbc:IssueDate>${data.issuedAt.toISOString().split("T")[0]}</cbc:IssueDate>
  <cbc:IssueTime>${data.issuedAt.toISOString().split("T")[1]?.substring(0, 8) || "00:00:00"}</cbc:IssueTime>
  <cbc:InvoiceTypeCode>388</cbc:InvoiceTypeCode>
  <cbc:DocumentCurrencyCode>SAR</cbc:DocumentCurrencyCode>
  <cbc:TaxCurrencyCode>SAR</cbc:TaxCurrencyCode>
  <inv:Seller>
    <inv:SellerName>${escapeXml(data.sellerName)}</inv:SellerName>
    <inv:SellerAddress>${escapeXml(data.sellerAddress)}</inv:SellerAddress>
    <inv:SellerTIN>${escapeXml(data.sellerCrNumber)}</inv:SellerTIN>
    <inv:SellerVATNumber>${escapeXml(data.sellerVatNumber)}</inv:SellerVATNumber>
  </inv:Seller>
  <inv:InvoiceLines>${lines}
  </inv:InvoiceLines>
  <inv:TaxTotal>
    <inv:TaxAmount currencyID="SAR">${data.vatTotal.toFixed(2)}</inv:TaxAmount>
    <inv:TaxSubtotal>
      <inv:TaxableAmount currencyID="SAR">${data.subtotal.toFixed(2)}</inv:TaxableAmount>
      <inv:TaxAmount currencyID="SAR">${data.vatTotal.toFixed(2)}</inv:TaxAmount>
      <inv:TaxCategory>S</inv:TaxCategory>
      <inv:TaxPercentage>15</inv:TaxPercentage>
    </inv:TaxSubtotal>
  </inv:TaxTotal>
  <inv:LegalMonetaryTotal>
    <inv:LineExtensionAmount currencyID="SAR">${data.subtotal.toFixed(2)}</inv:LineExtensionAmount>
    <inv:DiscountTotalAmount currencyID="SAR">${data.discountTotal.toFixed(2)}</inv:DiscountTotalAmount>
    <inv:TaxExclusiveAmount currencyID="SAR">${(data.subtotal - data.discountTotal).toFixed(2)}</inv:TaxExclusiveAmount>
    <inv:TaxInclusiveAmount currencyID="SAR">${data.grandTotal.toFixed(2)}</inv:TaxInclusiveAmount>
    <inv:PayableAmount currencyID="SAR">${data.grandTotal.toFixed(2)}</inv:PayableAmount>
  </inv:LegalMonetaryTotal>
  <inv:InvoiceHash>${escapeXml(data.invoiceHash)}</inv:InvoiceHash>
</inv:Invoice>`;
}

// ── Seed Data ─────────────────────────────────────────────────────────────────

const CATEGORIES = [
  { name: "Fresh & Dairy", nameAr: "طازج وألبان", children: ["Fresh Milk", "Yogurt", "Labneh", "Cheese", "Butter", "Cream", "Eggs"] },
  { name: "Bakery", nameAr: "مخبز", children: ["Arabic Bread", "Pita Bread", "Buns", "Croissants", "Cakes"] },
  { name: "Beverages", nameAr: "مشروبات", children: ["Mineral Water", "Juice Box", "Soft Drinks", "Energy Drinks", "Arabic Coffee", "Tea"] },
  { name: "Snacks", nameAr: "وجبات خفيفة", children: ["Chips", "Mixed Nuts", "Biscuits", "Chocolate", "Dates"] },
  { name: "Rice & Grains", nameAr: "أرز وحبوب", children: ["Basmati Rice", "Jasmine Rice", "Flour", "Semolina", "Oats"] },
  { name: "Cooking Essentials", nameAr: "مستلزمات الطبخ", children: ["Vegetable Oil", "Olive Oil", "Ghee", "Tomato Paste", "Mixed Spices"] },
  { name: "Cleaning & Home", nameAr: "تنظيف ومنزل", children: ["Dish Soap", "Laundry Detergent", "Tissue Box", "Plastic Bags", "Bleach"] },
  { name: "Personal Care", nameAr: "العناية الشخصية", children: ["Shampoo", "Bath Soap", "Toothpaste", "Deodorant", "Hand Cream"] },
];

const PRODUCTS_DATA: Array<{
  category: string;
  name: string;
  nameAr: string;
  unit: string;
  costPrice: number;
  sellingPrice: number;
  vatRate: number;
  sku: string;
  barcode: string;
}> = [
  // Fresh & Dairy
  { category: "Fresh Milk", name: "Fresh Milk 1L", nameAr: "حليب طازج ١ لتر", unit: "l", costPrice: 3.20, sellingPrice: 4.50, vatRate: 0.15, sku: "FND-001", barcode: "6281000000001" },
  { category: "Fresh Milk", name: "Fresh Milk 500ml", nameAr: "حليب طازج ٥٠٠ مل", unit: "l", costPrice: 1.80, sellingPrice: 2.50, vatRate: 0.15, sku: "FND-002", barcode: "6281000000002" },
  { category: "Yogurt", name: "Plain Yogurt 1kg", nameAr: "زبادي سادة ١ كغ", unit: "kg", costPrice: 5.50, sellingPrice: 7.99, vatRate: 0.15, sku: "FND-003", barcode: "6281000000003" },
  { category: "Yogurt", name: "Flavored Yogurt Pack", nameAr: "زبادي بنكهات", unit: "pack", costPrice: 4.00, sellingPrice: 5.99, vatRate: 0.15, sku: "FND-004", barcode: "6281000000004" },
  { category: "Labneh", name: "Labneh Ball 400g", nameAr: "لبنة كورة ٤٠٠ غ", unit: "pack", costPrice: 6.00, sellingPrice: 8.50, vatRate: 0.15, sku: "FND-005", barcode: "6281000000005" },
  { category: "Cheese", name: "Cheddar Cheese 500g", nameAr: "جبنة شيدر ٥٠٠ غ", unit: "pack", costPrice: 12.00, sellingPrice: 16.99, vatRate: 0.15, sku: "FND-006", barcode: "6281000000006" },
  { category: "Cheese", name: "White Cheese 400g", nameAr: "جبنة بيضاء ٤٠٠ غ", unit: "pack", costPrice: 8.00, sellingPrice: 11.50, vatRate: 0.15, sku: "FND-007", barcode: "6281000000007" },
  { category: "Butter", name: "Butter 250g", nameAr: "زبدة ٢٥٠ غ", unit: "pack", costPrice: 8.00, sellingPrice: 11.99, vatRate: 0.15, sku: "FND-008", barcode: "6281000000008" },
  { category: "Cream", name: "Cooking Cream 250ml", nameAr: "كريمة طبخ ٢٥٠ مل", unit: "pack", costPrice: 4.50, sellingPrice: 6.50, vatRate: 0.15, sku: "FND-009", barcode: "6281000000009" },
  { category: "Eggs", name: "Eggs 30 Count", nameAr: "بيض ٣٠ حبة", unit: "pack", costPrice: 10.00, sellingPrice: 14.99, vatRate: 0.15, sku: "FND-010", barcode: "6281000000010" },
  // Bakery
  { category: "Arabic Bread", name: "Arabic Bread (Pita)", nameAr: "خبز عربي", unit: "piece", costPrice: 0.40, sellingPrice: 1.00, vatRate: 0, sku: "BAK-001", barcode: "6281000000011" },
  { category: "Arabic Bread", name: "Saj Bread", nameAr: "خبز الصاج", unit: "piece", costPrice: 0.60, sellingPrice: 1.50, vatRate: 0, sku: "BAK-002", barcode: "6281000000012" },
  { category: "Pita Bread", name: "Pita Bread Pack 5pc", nameAr: "خبز بيتا ٥ حبة", unit: "pack", costPrice: 2.50, sellingPrice: 3.99, vatRate: 0, sku: "BAK-003", barcode: "6281000000013" },
  { category: "Buns", name: "Hamburger Buns 6pc", nameAr: "خبز برغر ٦ حبة", unit: "pack", costPrice: 3.00, sellingPrice: 4.99, vatRate: 0, sku: "BAK-004", barcode: "6281000000014" },
  { category: "Croissants", name: "Croissant 4pc", nameAr: "كرواسون ٤ حبة", unit: "pack", costPrice: 6.00, sellingPrice: 8.99, vatRate: 0.15, sku: "BAK-005", barcode: "6281000000015" },
  { category: "Cakes", name: "Chocolate Cake Slice", nameAr: "قطعة كيك شوكولاتة", unit: "piece", costPrice: 4.00, sellingPrice: 5.99, vatRate: 0.15, sku: "BAK-006", barcode: "6281000000016" },
  // Beverages
  { category: "Mineral Water", name: "Water Bottle 500ml", nameAr: "ماء معدني ٥٠٠ مل", unit: "piece", costPrice: 0.80, sellingPrice: 1.50, vatRate: 0, sku: "BEV-001", barcode: "6281000000017" },
  { category: "Mineral Water", name: "Water Gallon 5L", nameAr: "جالون ماء ٥ لتر", unit: "piece", costPrice: 4.00, sellingPrice: 6.99, vatRate: 0, sku: "BEV-002", barcode: "6281000000018" },
  { category: "Juice Box", name: "Orange Juice 1L", nameAr: "عصير برتقال ١ لتر", unit: "l", costPrice: 4.50, sellingPrice: 6.99, vatRate: 0.15, sku: "BEV-003", barcode: "6281000000019" },
  { category: "Juice Box", name: "Mango Juice 1L", nameAr: "عصير مانجو ١ لتر", unit: "l", costPrice: 4.50, sellingPrice: 6.99, vatRate: 0.15, sku: "BEV-004", barcode: "6281000000020" },
  { category: "Soft Drinks", name: "Cola Can 330ml", nameAr: "كولا علبة ٣٣٠ مل", unit: "piece", costPrice: 1.20, sellingPrice: 2.00, vatRate: 0.15, sku: "BEV-005", barcode: "6281000000021" },
  { category: "Soft Drinks", name: "Soft Drink 1.5L", nameAr: "مشروب غازي ١.٥ لتر", unit: "piece", costPrice: 2.50, sellingPrice: 3.99, vatRate: 0.15, sku: "BEV-006", barcode: "6281000000022" },
  { category: "Energy Drinks", name: "Energy Drink 250ml", nameAr: "مشروب طاقة ٢٥٠ مل", unit: "piece", costPrice: 4.00, sellingPrice: 6.00, vatRate: 0.15, sku: "BEV-007", barcode: "6281000000023" },
  { category: "Arabic Coffee", name: "Arabic Coffee 500g", nameAr: "قهوة عربية ٥٠٠ غ", unit: "pack", costPrice: 15.00, sellingPrice: 22.00, vatRate: 0.15, sku: "BEV-008", barcode: "6281000000024" },
  { category: "Tea", name: "Tea Box 100 bags", nameAr: "شاي ١٠٠ كيس", unit: "pack", costPrice: 6.00, sellingPrice: 9.50, vatRate: 0.15, sku: "BEV-009", barcode: "6281000000025" },
  // Snacks
  { category: "Chips", name: "Lays Chips 150g", nameAr: "شيبس لايز ١٥٠ غ", unit: "pack", costPrice: 4.00, sellingPrice: 5.99, vatRate: 0.15, sku: "SNK-001", barcode: "6281000000026" },
  { category: "Chips", name: "Doritos 180g", nameAr: "دوريتوس ١٨٠ غ", unit: "pack", costPrice: 5.00, sellingPrice: 7.50, vatRate: 0.15, sku: "SNK-002", barcode: "6281000000027" },
  { category: "Mixed Nuts", name: "Mixed Nuts 300g", nameAr: "مكسرات مشكلة ٣٠٠ غ", unit: "pack", costPrice: 12.00, sellingPrice: 17.99, vatRate: 0.15, sku: "SNK-003", barcode: "6281000000028" },
  { category: "Biscuits", name: "Oreo Pack 3x132g", nameAr: "أوريو ٣×١٣٢ غ", unit: "pack", costPrice: 8.00, sellingPrice: 11.99, vatRate: 0.15, sku: "SNK-004", barcode: "6281000000029" },
  { category: "Biscuits", name: "Digestive Biscuits 400g", nameAr: "بسكويت دايجستف ٤٠٠ غ", unit: "pack", costPrice: 5.00, sellingPrice: 7.50, vatRate: 0.15, sku: "SNK-005", barcode: "6281000000030" },
  { category: "Chocolate", name: "Cadbury Dairy Milk 120g", nameAr: "كادبوري حليب ١٢٠ غ", unit: "pack", costPrice: 7.00, sellingPrice: 9.99, vatRate: 0.15, sku: "SNK-006", barcode: "6281000000031" },
  { category: "Chocolate", name: "Kit Kat 4 Finger", nameAr: "كيت كات ٤ أصابع", unit: "pack", costPrice: 3.00, sellingPrice: 4.50, vatRate: 0.15, sku: "SNK-007", barcode: "6281000000032" },
  { category: "Dates", name: "Ajwa Dates 500g", nameAr: "تمر عجوة ٥٠٠ غ", unit: "pack", costPrice: 15.00, sellingPrice: 22.00, vatRate: 0.15, sku: "SNK-008", barcode: "6281000000033" },
  { category: "Dates", name: "Medjool Dates 400g", nameAr: "تمر مجدول ٤٠٠ غ", unit: "pack", costPrice: 20.00, sellingPrice: 29.99, vatRate: 0.15, sku: "SNK-009", barcode: "6281000000034" },
  // Rice & Grains
  { category: "Basmati Rice", name: "Basmati Rice 5kg", nameAr: "أرز بسمتي ٥ كغ", unit: "kg", costPrice: 28.00, sellingPrice: 39.99, vatRate: 0.15, sku: "RIC-001", barcode: "6281000000035" },
  { category: "Jasmine Rice", name: "Jasmine Rice 5kg", nameAr: "أرز ياباني ٥ كغ", unit: "kg", costPrice: 25.00, sellingPrice: 35.99, vatRate: 0.15, sku: "RIC-002", barcode: "6281000000036" },
  { category: "Flour", name: "White Flour 1kg", nameAr: "دقيق أبيض ١ كغ", unit: "kg", costPrice: 2.50, sellingPrice: 3.99, vatRate: 0, sku: "RIC-003", barcode: "6281000000037" },
  { category: "Flour", name: "Whole Wheat Flour 1kg", nameAr: "دقيق قمح كامل ١ كغ", unit: "kg", costPrice: 3.00, sellingPrice: 4.50, vatRate: 0, sku: "RIC-004", barcode: "6281000000038" },
  { category: "Semolina", name: "Semolina 1kg", nameAr: "سميد ١ كغ", unit: "kg", costPrice: 3.00, sellingPrice: 4.50, vatRate: 0.15, sku: "RIC-005", barcode: "6281000000039" },
  { category: "Oats", name: "Oats 500g", nameAr: "شوفان ٥٠٠ غ", unit: "pack", costPrice: 5.00, sellingPrice: 7.50, vatRate: 0.15, sku: "RIC-006", barcode: "6281000000040" },
  // Cooking Essentials
  { category: "Vegetable Oil", name: "Vegetable Oil 1.5L", nameAr: "زيت نباتي ١.٥ لتر", unit: "l", costPrice: 8.00, sellingPrice: 11.99, vatRate: 0.15, sku: "COK-001", barcode: "6281000000041" },
  { category: "Olive Oil", name: "Extra Virgin Olive Oil 1L", nameAr: "زيت زيتون بكر ١ لتر", unit: "l", costPrice: 25.00, sellingPrice: 35.99, vatRate: 0.15, sku: "COK-002", barcode: "6281000000042" },
  { category: "Ghee", name: "Ghee 500g", nameAr: "سمن ٥٠٠ غ", unit: "pack", costPrice: 18.00, sellingPrice: 25.99, vatRate: 0.15, sku: "COK-003", barcode: "6281000000043" },
  { category: "Tomato Paste", name: "Tomato Paste 400g", nameAr: "معجون طماطم ٤٠٠ غ", unit: "pack", costPrice: 2.50, sellingPrice: 3.99, vatRate: 0.15, sku: "COK-004", barcode: "6281000000044" },
  { category: "Mixed Spices", name: "Baharat Spice Mix 200g", nameAr: "بهارات مشكلة ٢٠٠ غ", unit: "pack", costPrice: 5.00, sellingPrice: 7.50, vatRate: 0.15, sku: "COK-005", barcode: "6281000000045" },
  { category: "Mixed Spices", name: "Cumin 100g", nameAr: "كمون ١٠٠ غ", unit: "pack", costPrice: 3.00, sellingPrice: 4.50, vatRate: 0.15, sku: "COK-006", barcode: "6281000000046" },
  // Cleaning & Home
  { category: "Dish Soap", name: "Dish Soap 750ml", nameAr: "غسول صحون ٧٥٠ مل", unit: "piece", costPrice: 4.00, sellingPrice: 5.99, vatRate: 0.15, sku: "CLN-001", barcode: "6281000000047" },
  { category: "Laundry Detergent", name: "Laundry Powder 3kg", nameAr: "مسحوق غسيل ٣ كغ", unit: "piece", costPrice: 15.00, sellingPrice: 21.99, vatRate: 0.15, sku: "CLN-002", barcode: "6281000000048" },
  { category: "Tissue Box", name: "Tissue Box 200 sheets", nameAr: "مناديل ٢٠٠ ورقة", unit: "piece", costPrice: 2.50, sellingPrice: 3.99, vatRate: 0.15, sku: "CLN-003", barcode: "6281000000049" },
  { category: "Plastic Bags", name: "Plastic Bags Roll 30pc", nameAr: "أكياس بلاستيك ٣٠ حبة", unit: "roll", costPrice: 4.00, sellingPrice: 5.99, vatRate: 0.15, sku: "CLN-004", barcode: "6281000000050" },
  { category: "Bleach", name: "Bleach 2L", nameAr: "مبيض ٢ لتر", unit: "piece", costPrice: 5.00, sellingPrice: 7.50, vatRate: 0.15, sku: "CLN-005", barcode: "6281000000051" },
  // Personal Care
  { category: "Shampoo", name: "Shampoo 400ml", nameAr: "شامبو ٤٠٠ مل", unit: "piece", costPrice: 8.00, sellingPrice: 12.00, vatRate: 0.15, sku: "PER-001", barcode: "6281000000052" },
  { category: "Bath Soap", name: "Bath Soap 100g", nameAr: "صابون ١٠٠ غ", unit: "piece", costPrice: 2.50, sellingPrice: 3.99, vatRate: 0.15, sku: "PER-002", barcode: "6281000000053" },
  { category: "Toothpaste", name: "Toothpaste 100ml", nameAr: "معجون أسنان ١٠٠ مل", unit: "piece", costPrice: 4.00, sellingPrice: 5.99, vatRate: 0.15, sku: "PER-004", barcode: "6281000000054" },
  { category: "Deodorant", name: "Deodorant 150ml", nameAr: "مزيل عرق ١٥٠ مل", unit: "piece", costPrice: 10.00, sellingPrice: 14.99, vatRate: 0.15, sku: "PER-005", barcode: "6281000000055" },
  { category: "Hand Cream", name: "Hand Cream 100ml", nameAr: "كريم يد ١٠٠ مل", unit: "piece", costPrice: 7.00, sellingPrice: 10.50, vatRate: 0.15, sku: "PER-006", barcode: "6281000000056" },
];

const CUSTOMERS_DATA = [
  { name: "Ahmed Al-Rashid", nameAr: "أحمد الراشد", phone: "0501112233", city: "Riyadh" },
  { name: "Fatima Hassan", nameAr: "فاطمة حسن", phone: "0502233444", city: "Riyadh" },
  { name: "Mohammed Ali", nameAr: "محمد علي", phone: "0503344555", city: "Dammam" },
  { name: "Sara Abdullah", nameAr: "سارة عبد الله", phone: "0504455666", city: "Jeddah" },
  { name: "Khalid Ibrahim", nameAr: "خالد إبراهيم", phone: "0505566777", city: "Riyadh" },
  { name: "Noura Al-Zahrani", nameAr: "نورة الزرعاني", phone: "0506677888", city: "Riyadh" },
  { name: "Youssef Mansour", nameAr: "يوسف منصور", phone: "0507788999", city: "Mecca" },
  { name: "Layan Ahmed", nameAr: "لayan أحمد", phone: "0508899000", city: "Riyadh" },
  { name: "Abdulrahman Al-Sultan", nameAr: "عبد الرحمن السلطان", phone: "0509900111", city: "Riyadh" },
  { name: "Reem Nasser", nameAr: "ريم ناصر", phone: "0510011222", city: "Dammam" },
];

const SUPPLIERS_DATA = [
  { name: "Al Safeer Distribution", nameAr: "توزيع الصفير", contactName: "Omar Khalid", phone: "0112345678", email: "orders@alsafeer.sa", vatNumber: "310123456789001", paymentTerms: "net30" },
  { name: "Gulf Fresh Foods", nameAr: "غولف فريش فودز", contactName: "Saeed Al-Mutairi", phone: "0113456789", email: "supply@gulffresh.sa", vatNumber: "310234567890002", paymentTerms: "net15" },
  { name: "Nakheel Trading Co.", nameAr: "شركة نخيل التجارية", contactName: "Fahad Al-Harbi", phone: "0114567890", email: "info@nakheeltrading.sa", vatNumber: "310345678901003", paymentTerms: "net30" },
  { name: "Saudi Beverages Ltd.", nameAr: "المشروبات السعودية", contactName: "Hassan Al-Dosari", phone: "0115678901", email: "orders@saudibev.sa", vatNumber: "310456789012004", paymentTerms: "net45" },
];

// ── Main Seeder ────────────────────────────────────────────────────────────────

async function seed() {
  console.log("🌱 Connecting to MongoDB...");
  await connect();
  console.log("✅ Connected\n");

  console.log("🧹 Cleaning previous demo data...");
  const demoTenantId = new mongoose.Types.ObjectId("000000000000000000000001");

  const collections = [
    "stockmovements", "stockbatches", "stocklevels",
    "parkedsales", "cashdrawers", "invoices", "invoicecounters",
    "customers", "purchaseorders", "suppliers",
    "products", "categories",
    "branches",
    "memberships",
    "tenants",
    "users",
  ];

  for (const col of collections) {
    try {
      await mongoose.connection.collection(col).deleteMany({});
    } catch {
      // collection might not exist yet
    }
  }
  console.log("✅ Cleaned\n");

  // ── Step 1: User + Tenant + Membership ────────────────────────────────────
  console.log("👤 Creating user, tenant, membership...");
  const passwordHash = await bcrypt.hash("demo1234", 10);

  const user = await mongoose.connection.collection("users").insertOne({
    email: "demo@sa-shop.com",
    name: "Demo Owner",
    passwordHash,
    emailVerifiedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  const userId = user.insertedId;
  console.log(`   User: demo@sa-shop.com / demo1234`);

  const tenantId = new mongoose.Types.ObjectId("000000000000000000000001");
  await mongoose.connection.collection("tenants").insertOne({
    _id: tenantId,
    name: "Al Nakheel Grocery",
    nameAr: "بقالة النخيل",
    vatNumber: "310987654321000",
    crNumber: "CR123456789",
    address: "King Fahd Road, Al Nakheel District",
    addressAr: "طريق الملك فهد، حي النخيل",
    city: "Riyadh",
    region: "Riyadh",
    phone: "0112345678",
    email: "info@alnakhilgrocery.sa",
    baseCurrency: "SAR",
    timezone: "Asia/Riyadh",
    defaultLanguage: "en",
    vatRegistered: true,
    zatcaPhase: 2,
    zatcaCsid: "CSID-DEMO-001",
    zatcaSolutionId: "SOL-DEMO-001",
    zatcaCertificateId: "CERT-DEMO-001",
    plan: "starter",
    planExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  console.log(`   Tenant: Al Nakheel Grocery (Riyadh)`);

  await mongoose.connection.collection("memberships").insertOne({
    userId,
    tenantId,
    role: "owner",
    branchIds: [],
    status: "active",
    acceptedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  // ── Step 2: Branches ────────────────────────────────────────────────────────
  console.log("\n🏪 Creating branches...");
  const branchIds: mongoose.Types.ObjectId[] = [];

  const hqBranch = await mongoose.connection.collection("branches").insertOne({
    tenantId,
    name: "Al Nakheel Branch",
    nameAr: "فرع النخيل",
    address: "King Fahd Road, Al Nakheel District",
    addressAr: "طريق الملك فهد، حي النخيل",
    city: "Riyadh",
    region: "Riyadh",
    phone: "0112345678",
    vatBranchCode: "BR001",
    isHeadOffice: true,
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  branchIds.push(hqBranch.insertedId);

  const olayaBranch = await mongoose.connection.collection("branches").insertOne({
    tenantId,
    name: "Olaya Branch",
    nameAr: "فرع العليا",
    address: "Olaya Main Street",
    addressAr: "شارع العليا الرئيسي",
    city: "Riyadh",
    region: "Riyadh",
    phone: "0119876543",
    vatBranchCode: "BR002",
    isHeadOffice: false,
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  branchIds.push(olayaBranch.insertedId);
  console.log(`   2 branches created: HQ + Olaya`);

  // ── Step 3: Categories ─────────────────────────────────────────────────────
  console.log("\n📂 Creating categories...");
  const categoryMap: Record<string, mongoose.Types.ObjectId> = {};
  const parentIds: Record<string, mongoose.Types.ObjectId> = {};

  for (const cat of CATEGORIES) {
    const parent = await mongoose.connection.collection("categories").insertOne({
      tenantId,
      name: cat.name,
      nameAr: cat.nameAr,
      parentId: null,
      sortOrder: 0,
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    parentIds[cat.name] = parent.insertedId;
    categoryMap[cat.name] = parent.insertedId;

    for (const childName of cat.children) {
      const child = await mongoose.connection.collection("categories").insertOne({
        tenantId,
        name: childName,
        nameAr: "",
        parentId: parent.insertedId,
        sortOrder: 0,
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      categoryMap[childName] = child.insertedId;
    }
  }
  console.log(`   ${CATEGORIES.length} parent + ${CATEGORIES.reduce((s, c) => s + c.children.length, 0)} child categories created`);

  // ── Step 4: Products ───────────────────────────────────────────────────────
  console.log("\n📦 Creating products...");
  const productIds: Array<{ _id: mongoose.Types.ObjectId; data: (typeof PRODUCTS_DATA)[0] }> = [];

  for (const p of PRODUCTS_DATA) {
    const categoryId = categoryMap[p.category];
    const result = await mongoose.connection.collection("products").insertOne({
      tenantId,
      sku: p.sku,
      barcode: p.barcode,
      name: p.name,
      nameAr: p.nameAr,
      categoryId,
      unit: p.unit,
      sellingPrice: p.sellingPrice,
      vatRate: p.vatRate,
      vatInclusivePrice: true,
      costPrice: p.costPrice,
      imageUrls: [],
      trackStock: true,
      lowStockThreshold: 10,
      expiryTracking: false,
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    productIds.push({ _id: result.insertedId, data: p });
  }
  console.log(`   ${productIds.length} products created`);

  // ── Step 5: Stock Levels ───────────────────────────────────────────────────
  console.log("\n📊 Creating stock levels...");
  let stockCount = 0;

  for (const product of productIds) {
    for (const branchId of branchIds) {
      const qty = randomInt(20, 200);
      await mongoose.connection.collection("stocklevels").insertOne({
        tenantId,
        productId: product._id,
        branchId,
        quantity: qty,
        reservedQuantity: 0,
        updatedAt: new Date(),
      });
      stockCount++;
    }
  }
  console.log(`   ${stockCount} stock level records created`);

  // ── Step 6: Customers ──────────────────────────────────────────────────────
  console.log("\n👥 Creating customers...");
  const customerIds: mongoose.Types.ObjectId[] = [];

  for (const c of CUSTOMERS_DATA) {
    const result = await mongoose.connection.collection("customers").insertOne({
      tenantId,
      name: c.name,
      nameAr: c.nameAr,
      phone: c.phone,
      city: c.city,
      totalSpent: 0,
      visitCount: 0,
      pdplConsent: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    customerIds.push(result.insertedId);
  }
  console.log(`   ${customerIds.length} customers created`);

  // ── Step 7: Invoice Counters ───────────────────────────────────────────────
  console.log("\n🔢 Creating invoice counters...");
  for (const branchId of branchIds) {
    await mongoose.connection.collection("invoicecounters").insertOne({
      tenantId,
      branchId,
      currentValue: 0,
    });
  }
  await mongoose.connection.collection("invoicecounters").insertOne({
    tenantId,
    currentValue: 0,
  });
  console.log(`   3 counters created`);

  // ── Step 8: Invoices (25 invoices, last 30 days) ────────────────────────────
  console.log("\n🧾 Creating invoices with ZATCA compliance...");

  const previousHashes: Record<string, string> = {
    [branchIds[0].toString()]: "0000000000000000000000000000000000000000000000000000000000000000",
    [branchIds[1].toString()]: "0000000000000000000000000000000000000000000000000000000000000000",
  };

  let invoiceCount = 0;

  for (let i = 0; i < 25; i++) {
    const branchIdx = i < 15 ? 0 : 1; // more at HQ
    const branchId = branchIds[branchIdx];
    const issuedAt = randomDate(30, 1);
    const numItems = randomInt(3, 8);

    // Pick random products
    const shuffled = [...productIds].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, numItems);

    const lines = selected.map((p) => {
      const qty = randomInt(1, 5);
      const vatInclusive = p.data.vatRate > 0;
      const net = vatInclusive ? p.data.sellingPrice / 1.15 : p.data.sellingPrice;
      const netAmount = Math.round(net * qty * 100) / 100;
      const vatAmount = Math.round(netAmount * p.data.vatRate * 100) / 100;
      const totalAmount = Math.round((netAmount + vatAmount) * 100) / 100;
      return {
        productId: p._id,
        sku: p.data.sku,
        name: p.data.name,
        nameAr: p.data.nameAr,
        quantity: qty,
        unitPrice: p.data.sellingPrice,
        discountAmount: 0,
        netAmount: Math.round(netAmount * 100) / 100,
        vatRate: p.data.vatRate,
        vatAmount: Math.round(vatAmount * 100) / 100,
        totalAmount: Math.round(totalAmount * 100) / 100,
      };
    });

    const subtotal = lines.reduce((s, l) => s + Number(l.netAmount), 0);
    const vatTotal = lines.reduce((s, l) => s + Number(l.vatAmount), 0);
    const grandTotal = lines.reduce((s, l) => s + Number(l.totalAmount), 0);

    // Get next invoice number
    const counter = await mongoose.connection.collection("invoicecounters").findOneAndUpdate(
      { tenantId },
      { $inc: { currentValue: 1 } },
      { returnDocument: "after" }
    );
    const invoiceNum = `INV-${String(counter!.currentValue).padStart(6, "0")}`;

    const uuid = uuidv4();
    const prevHash = previousHashes[branchId.toString()];

    // Build hash
    const hashPayload = [
      invoiceNum,
      issuedAt.toISOString(),
      grandTotal.toFixed(2),
      vatTotal.toFixed(2),
      ...lines.map((l) => `${l.name}|${l.quantity}|${l.unitPrice}|${l.totalAmount}`),
    ].join("||");
    const invoiceHash = sha256Hash(hashPayload);

    // Generate TLV QR
    const qrData = await generateTlvQr({
      sellerName: "Al Nakheel Grocery",
      sellerVatNumber: "310987654321000",
      timestamp: issuedAt.toISOString(),
      invoiceTotal: grandTotal,
      vatTotal: vatTotal,
    });

    // Build XML
    const xmlPayload = buildInvoiceXml({
      invoiceNumber: invoiceNum,
      uuid,
      issuedAt,
      lines,
      subtotal,
      discountTotal: 0,
      vatTotal,
      grandTotal,
      sellerName: "Al Nakheel Grocery",
      sellerVatNumber: "310987654321000",
      sellerAddress: "King Fahd Road, Al Nakheel District, Riyadh",
      sellerCrNumber: "CR123456789",
      invoiceType: "simplified",
      invoiceHash,
    });

    // Assign customer randomly (30% chance)
    const customerId = Math.random() < 0.3 ? customerIds[randomInt(0, customerIds.length - 1)] : null;

    // Payment method
    const paymentMethod = Math.random() < 0.6 ? "cash" : "card";
    const cashReceived = paymentMethod === "cash" ? Math.ceil(grandTotal / 5) * 5 + 5 : undefined;

    const isRefunded = i === 12; // Invoice #13 is refunded
    const status = isRefunded ? "refunded" : "completed";

    await mongoose.connection.collection("invoices").insertOne({
      tenantId,
      branchId,
      cashierId: userId,
      invoiceNumber: invoiceNum,
      uuid,
      invoiceType: "simplified",
      status,
      issuedAt,
      previousHash: prevHash,
      invoiceHash,
      qrCode: qrData,
      xmlPayload,
      customerId,
      subtotal,
      discountTotal: 0,
      vatTotal,
      grandTotal,
      payments: [
        {
          method: paymentMethod,
          amount: grandTotal,
          cashReceived: cashReceived || 0,
          changeGiven: cashReceived ? Math.max(0, cashReceived - grandTotal) : 0,
        },
      ],
      lines: lines.map((l) => ({
        ...l,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        discountAmount: l.discountAmount,
        netAmount: l.netAmount,
        vatAmount: l.vatAmount,
        totalAmount: l.totalAmount,
      })),
      refundedInvoiceId: null,
      voidedAt: null,
      voidedBy: null,
      voidReason: null,
      idempotencyKey: null,
      createdAt: issuedAt,
      updatedAt: issuedAt,
    });

    // Update previous hash
    previousHashes[branchId.toString()] = invoiceHash;
    invoiceCount++;

    // Create stock movements
    for (const line of lines) {
      await mongoose.connection.collection("stockmovements").insertOne({
        tenantId,
        productId: line.productId,
        branchId,
        batchId: null,
        type: "sale",
        quantityDelta: -line.quantity,
        quantityAfter: 0,
        refCollection: "invoices",
        refId: null,
        userId,
        createdAt: issuedAt,
        updatedAt: issuedAt,
      });
    }

    // If refunded, also create refund movement
    if (isRefunded) {
      for (const line of lines) {
        await mongoose.connection.collection("stockmovements").insertOne({
          tenantId,
          productId: line.productId,
          branchId,
          batchId: null,
          type: "refund",
          quantityDelta: line.quantity,
          quantityAfter: 0,
          refCollection: "invoices",
          refId: null,
          userId,
          createdAt: new Date(issuedAt.getTime() + 5 * 60 * 1000),
          updatedAt: new Date(issuedAt.getTime() + 5 * 60 * 1000),
        });
      }
    }
  }
  console.log(`   ${invoiceCount} invoices created (with ZATCA QR + XML + hash chain)`);

  // ── Step 9: Suppliers ─────────────────────────────────────────────────────
  console.log("\n🚚 Creating suppliers...");
  const supplierIds: mongoose.Types.ObjectId[] = [];

  for (const s of SUPPLIERS_DATA) {
    const result = await mongoose.connection.collection("suppliers").insertOne({
      tenantId,
      name: s.name,
      nameAr: s.nameAr,
      contactName: s.contactName,
      phone: s.phone,
      email: s.email,
      vatNumber: s.vatNumber,
      paymentTerms: s.paymentTerms,
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    supplierIds.push(result.insertedId);
  }
  console.log(`   ${supplierIds.length} suppliers created`);

  // ── Step 10: Purchase Orders ───────────────────────────────────────────────
  console.log("\n📋 Creating purchase orders...");

  const poStatuses = ["draft", "submitted", "submitted", "partially_received", "received", "cancelled"];
  let poCount = 0;

  for (let i = 0; i < 6; i++) {
    const supplierId = supplierIds[i % supplierIds.length];
    const branchId = branchIds[i % 2];
    const status = poStatuses[i];
    const createdAt = randomDate(45, 1);
    const issuedAt = status !== "draft" ? new Date(createdAt.getTime() + 2 * 60 * 60 * 1000) : null;

    // Select products for PO
    const poProducts = productIds.slice(i * 8, i * 8 + 8);
    const lines = poProducts.map((p) => {
      const orderedQty = randomInt(20, 100);
      let receivedQty = 0;
      if (status === "received") receivedQty = orderedQty;
      else if (status === "partially_received") receivedQty = randomInt(5, orderedQty - 1);

      return {
        productId: p._id,
        sku: p.data.sku,
        name: p.data.name,
        nameAr: p.data.nameAr,
        orderedQty,
        receivedQty,
        unitCost: p.data.costPrice,
        totalCost: Math.round(p.data.costPrice * orderedQty * 100) / 100,
      };
    });

    const counter = await mongoose.connection.collection("invoicecounters").findOneAndUpdate(
      { tenantId },
      { $inc: { currentValue: 1 } },
      { returnDocument: "after" }
    );
    const poNumber = `PO-${String(counter!.currentValue).padStart(6, "0")}`;

    await mongoose.connection.collection("purchaseorders").insertOne({
      tenantId,
      supplierId,
      branchId,
      createdById: userId,
      poNumber,
      status,
      issuedAt: issuedAt || null,
      deliveredAt: status === "received" ? new Date(createdAt.getTime() + 3 * 24 * 60 * 60 * 1000) : null,
      notes: "",
      expectedDate: new Date(createdAt.getTime() + 7 * 24 * 60 * 60 * 1000),
      lines,
      createdAt,
      updatedAt: new Date(),
    });

    poCount++;

    // If received, create stock batches + movements
    if (status === "received" || status === "partially_received") {
      for (const line of lines) {
        if (line.receivedQty > 0) {
          const batchNumber = `BATCH-${poNumber}-${line.sku}`;
          await mongoose.connection.collection("stockbatches").insertOne({
            tenantId,
            productId: line.productId,
            branchId,
            batchNumber,
            expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
            quantity: line.receivedQty,
            costPrice: line.unitCost,
            supplierId,
            receivedAt: new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
          });

          // Update stock level
          await mongoose.connection.collection("stocklevels").updateOne(
            { tenantId, productId: line.productId, branchId },
            { $inc: { quantity: line.receivedQty }, $set: { updatedAt: new Date() } }
          );

          // Stock movement
          await mongoose.connection.collection("stockmovements").insertOne({
            tenantId,
            productId: line.productId,
            branchId,
            batchId: null,
            type: "purchase",
            quantityDelta: line.receivedQty,
            quantityAfter: 0,
            refCollection: "purchaseorders",
            refId: null,
            reason: `PO ${poNumber}`,
            userId,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }
      }
    }
  }
  console.log(`   ${poCount} purchase orders created`);

  // ── Done ───────────────────────────────────────────────────────────────────
  console.log("\n✅ Seed complete!");
  console.log("\n📋 Demo credentials:");
  console.log("   Email:    demo@sa-shop.com");
  console.log("   Password: demo1234");
  console.log("   Tenant:   Al Nakheel Grocery (Riyadh)");
  console.log("\n🌱 Run 'npm run seed:clean' to clean demo data");

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});