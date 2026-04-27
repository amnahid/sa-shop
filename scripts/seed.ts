import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { v4 as uuidv4 } from "uuid";
import { 
  User, Tenant, Membership, Branch, Category, Product, 
  StockLevel, Customer, InvoiceCounter, Invoice, 
  Supplier, PurchaseOrder, StockBatch, StockMovement 
} from "../src/models";

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
  unit: 'piece' | 'kg' | 'g' | 'l' | 'ml' | 'pack';
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
  { category: "Plastic Bags", name: "Plastic Bags Roll 30pc", nameAr: "أكياس بلاستيك ٣٠ حبة", unit: "pack", costPrice: 4.00, sellingPrice: 5.99, vatRate: 0.15, sku: "CLN-004", barcode: "6281000000050" },
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
  { name: "Al Safeer Distribution", nameAr: "توزيع الصفير", contactName: "Omar Khalid", phone: "0112345678", email: "orders@alsafeer.sa", vatNumber: "310123456789003", paymentTerms: "net30" },
  { name: "Gulf Fresh Foods", nameAr: "غولف فريش فودز", contactName: "Saeed Al-Mutairi", phone: "0113456789", email: "supply@gulffresh.sa", vatNumber: "310234567890003", paymentTerms: "net15" },
  { name: "Nakheel Trading Co.", nameAr: "شركة نخيل التجارية", contactName: "Fahad Al-Harbi", phone: "0114567890", email: "info@nakheeltrading.sa", vatNumber: "310345678901003", paymentTerms: "net30" },
  { name: "Saudi Beverages Ltd.", nameAr: "المشروبات السعودية", contactName: "Hassan Al-Dosari", phone: "0115678901", email: "orders@saudibev.sa", vatNumber: "310456789012003", paymentTerms: "net45" },
];

// ── Main Seeder ────────────────────────────────────────────────────────────────

async function seed() {
  console.log("🌱 Connecting to MongoDB...");
  await connect();
  console.log("✅ Connected\n");

  const demoTenantId = new mongoose.Types.ObjectId("000000000000000000000001");

  console.log("🧹 Cleaning previous demo data...");
  const models = [
    StockMovement, StockBatch, StockLevel,
    Invoice, InvoiceCounter,
    Customer, PurchaseOrder, Supplier,
    Product, Category,
    Branch,
    Membership,
    Tenant,
    User,
  ];

  for (const model of models) {
    if (model === User) {
      await User.deleteMany({ email: "demo@sa-shop.com" });
    } else if (model === Tenant) {
      await Tenant.deleteMany({ _id: demoTenantId });
    } else {
      await (model as any).deleteMany({ tenantId: demoTenantId } as any);
    }
  }
  console.log("✅ Cleaned\n");

  // ── Step 1: User + Tenant + Membership ────────────────────────────────────
  console.log("👤 Creating user, tenant, membership...");
  
  const user = await User.create({
    email: "demo@sa-shop.com",
    name: "Demo Owner",
    passwordHash: "demo1234", // Will be hashed by pre-save hook
    emailVerifiedAt: new Date(),
  });
  console.log(`   User: demo@sa-shop.com / demo1234`);

  const tenant = await Tenant.create({
    _id: demoTenantId,
    name: "Al Nakheel Grocery",
    nameAr: "بقالة النخيل",
    vatNumber: "310987654321003",
    crNumber: "CR123456789",
    address: "King Fahd Road, Al Nakheel District",
    addressAr: "طريق الملك فهد، حي النخيل",
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
  });
  const tenantId = tenant._id;
  console.log(`   Tenant: Al Nakheel Grocery (Riyadh)`);

  await Membership.create({
    userId: user._id,
    tenantId,
    role: "owner",
    branchIds: [],
    status: "active",
    acceptedAt: new Date(),
  });

  // ── Step 2: Branches ────────────────────────────────────────────────────────
  console.log("\n🏪 Creating branches...");
  const branchIds: mongoose.Types.ObjectId[] = [];

  const hqBranch = await Branch.create({
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
  });
  branchIds.push(hqBranch._id);

  const olayaBranch = await Branch.create({
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
  });
  branchIds.push(olayaBranch._id);
  console.log(`   2 branches created: HQ + Olaya`);

  // ── Step 3: Categories ─────────────────────────────────────────────────────
  console.log("\n📂 Creating categories...");
  const categoryMap: Record<string, mongoose.Types.ObjectId> = {};

  for (const cat of CATEGORIES) {
    const parent = await Category.create({
      tenantId,
      name: cat.name,
      nameAr: cat.nameAr,
      parentId: undefined,
      sortOrder: 0,
      active: true,
    });
    categoryMap[cat.name] = parent._id;

    for (const childName of cat.children) {
      const child = await Category.create({
        tenantId,
        name: childName,
        nameAr: childName, // For demo, use same name
        parentId: parent._id,
        sortOrder: 0,
        active: true,
      });
      categoryMap[childName] = child._id;
    }
  }
  console.log(`   ${CATEGORIES.length} parent + ${CATEGORIES.reduce((s, c) => s + c.children.length, 0)} child categories created`);

  // ── Step 4: Products ───────────────────────────────────────────────────────
  console.log("\n📦 Creating products...");
  const products: any[] = [];

  for (const p of PRODUCTS_DATA) {
    const categoryId = categoryMap[p.category];
    const product = await Product.create({
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
    });
    products.push(product);
  }
  console.log(`   ${products.length} products created`);

  // ── Step 5: Stock Levels ───────────────────────────────────────────────────
  console.log("\n📊 Creating stock levels...");
  let stockCount = 0;

  for (const product of products) {
    for (const branchId of branchIds) {
      const qty = randomInt(20, 200);
      await StockLevel.create({
        tenantId,
        productId: product._id,
        branchId,
        quantity: qty,
        reservedQuantity: 0,
      });
      stockCount++;
    }
  }
  console.log(`   ${stockCount} stock level records created`);

  // ── Step 6: Customers ──────────────────────────────────────────────────────
  console.log("\n👥 Creating customers...");
  const customerIds: mongoose.Types.ObjectId[] = [];

  for (const c of CUSTOMERS_DATA) {
    const result = await Customer.create({
      tenantId,
      name: c.name,
      nameAr: c.nameAr,
      phone: c.phone,
      city: c.city,
      totalSpent: 0,
      visitCount: 0,
      pdplConsent: {
        givenAt: new Date(),
        version: "1.0",
        ipAddress: "127.0.0.1",
      },
    });
    customerIds.push(result._id);
  }
  console.log(`   ${customerIds.length} customers created`);

  // ── Step 7: Invoice Counters ───────────────────────────────────────────────
  console.log("\n🔢 Creating invoice counters...");
  for (const branchId of branchIds) {
    await InvoiceCounter.create({
      tenantId,
      branchId,
      currentValue: 0,
    });
  }
  // Global counter
  await InvoiceCounter.create({
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
    const branchIdx = i < 15 ? 0 : 1;
    const branchId = branchIds[branchIdx];
    const issuedAt = randomDate(30, 1);
    const numItems = randomInt(3, 8);

    const shuffled = [...products].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, numItems);

    const lines = selected.map((p) => {
      const qty = randomInt(1, 5);
      const vatInclusive = p.vatRate > 0;
      const net = vatInclusive ? p.sellingPrice / 1.15 : p.sellingPrice;
      const netAmount = Math.round(net * qty * 100) / 100;
      const vatAmount = Math.round(netAmount * p.vatRate * 100) / 100;
      const totalAmount = Math.round((netAmount + vatAmount) * 100) / 100;
      return {
        productId: p._id,
        sku: p.sku,
        name: p.name,
        nameAr: p.nameAr,
        quantity: qty,
        unitPrice: p.sellingPrice,
        discountAmount: 0,
        netAmount: netAmount,
        vatRate: p.vatRate,
        vatAmount: vatAmount,
        totalAmount: totalAmount,
      };
    });

    const subtotal = lines.reduce((s, l) => s + Number(l.netAmount), 0);
    const vatTotal = lines.reduce((s, l) => s + Number(l.vatAmount), 0);
    const grandTotal = lines.reduce((s, l) => s + Number(l.totalAmount), 0);

    const counter = await InvoiceCounter.findOneAndUpdate(
      { tenantId },
      { $inc: { currentValue: 1 } },
      { returnDocument: "after" }
    );
    const invoiceNum = `INV-${String(counter!.currentValue).padStart(6, "0")}`;

    const uuid = uuidv4();
    const prevHash = previousHashes[branchId.toString()];

    const hashPayload = [
      invoiceNum,
      issuedAt.toISOString(),
      grandTotal.toFixed(2),
      vatTotal.toFixed(2),
      ...lines.map((l) => `${l.name}|${l.quantity}|${l.unitPrice}|${l.totalAmount}`),
    ].join("||");
    const invoiceHash = sha256Hash(hashPayload);

    const qrData = await generateTlvQr({
      sellerName: "Al Nakheel Grocery",
      sellerVatNumber: "310987654321003",
      timestamp: issuedAt.toISOString(),
      invoiceTotal: grandTotal,
      vatTotal: vatTotal,
    });

    const customerId = Math.random() < 0.3 ? customerIds[randomInt(0, customerIds.length - 1)] : undefined;
    const paymentMethod = Math.random() < 0.6 ? "cash" : "mada";
    const status = i === 12 ? "refunded" : "completed";

    await Invoice.create({
      tenantId,
      branchId,
      cashierId: user._id,
      invoiceNumber: invoiceNum,
      uuid,
      invoiceType: "simplified",
      status,
      issuedAt,
      previousHash: prevHash,
      invoiceHash,
      qrCode: qrData,
      customerId,
      subtotal,
      discountTotal: 0,
      vatTotal,
      grandTotal,
      payments: [
        {
          method: paymentMethod,
          amount: grandTotal,
          receivedAt: issuedAt,
        },
      ],
      lines,
      createdAt: issuedAt,
    });

    previousHashes[branchId.toString()] = invoiceHash;
    invoiceCount++;

    for (const line of lines) {
      await StockMovement.create({
        tenantId,
        productId: line.productId,
        branchId,
        type: "sale",
        quantityDelta: -line.quantity,
        quantityAfter: 0,
        userId: user._id,
        createdAt: issuedAt,
      });
    }
  }
  console.log(`   ${invoiceCount} invoices created (with ZATCA QR + hash chain)`);

  // ── Step 9: Suppliers ─────────────────────────────────────────────────────
  console.log("\n🚚 Creating suppliers...");
  const suppliers: any[] = [];

  for (const s of SUPPLIERS_DATA) {
    const result = await Supplier.create({
      tenantId,
      name: s.name,
      nameAr: s.nameAr,
      contactName: s.contactName,
      phone: s.phone,
      email: s.email,
      vatNumber: s.vatNumber,
      paymentTerms: s.paymentTerms,
      active: true,
    });
    suppliers.push(result);
  }
  console.log(`   ${suppliers.length} suppliers created`);

  // ── Step 10: Purchase Orders ───────────────────────────────────────────────
  console.log("\n📋 Creating purchase orders...");

  const poStatuses = ["draft", "submitted", "submitted", "partially_received", "received", "cancelled"];
  let poCount = 0;

  for (let i = 0; i < 6; i++) {
    const supplier = suppliers[i % suppliers.length];
    const branchId = branchIds[i % 2];
    const status = poStatuses[i];
    const createdAt = randomDate(45, 1);
    const issuedAt = status !== "draft" ? new Date(createdAt.getTime() + 2 * 60 * 60 * 1000) : null;

    const poProducts = products.slice(i * 8, i * 8 + 8);
    const lines = poProducts.map((p) => {
      const orderedQty = randomInt(20, 100);
      let receivedQty = 0;
      if (status === "received") receivedQty = orderedQty;
      else if (status === "partially_received") receivedQty = randomInt(5, orderedQty - 1);

      return {
        productId: p._id,
        sku: p.sku,
        name: p.name,
        nameAr: p.nameAr,
        quantityOrdered: orderedQty,
        quantityReceived: receivedQty,
        unitCost: p.costPrice,
        totalCost: Math.round(p.costPrice * orderedQty * 100) / 100,
      };
    });

    const poNumber = `PO-${String(i + 1).padStart(6, "0")}`;

    await PurchaseOrder.create({
      tenantId,
      supplierId: supplier._id,
      branchId,
      createdById: user._id,
      poNumber,
      status,
      issuedAt: issuedAt || undefined,
      deliveredAt: status === "received" ? new Date(createdAt.getTime() + 3 * 24 * 60 * 60 * 1000) : undefined,
      expectedDate: new Date(createdAt.getTime() + 7 * 24 * 60 * 60 * 1000),
      lines,
      createdAt,
    });

    poCount++;

    if (status === "received" || status === "partially_received") {
      for (const line of lines) {
        if (line.quantityReceived > 0) {
          const batchNumber = `BATCH-${poNumber}-${line.sku}`;
          await StockBatch.create({
            tenantId,
            productId: line.productId,
            branchId,
            batchNumber,
            expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
            quantity: line.quantityReceived,
            costPrice: line.unitCost,
            supplierId: supplier._id,
            receivedAt: new Date(),
          });

          await StockLevel.updateOne(
            { tenantId, productId: line.productId, branchId },
            { $inc: { quantity: line.quantityReceived } }
          );

          await StockMovement.create({
            tenantId,
            productId: line.productId,
            branchId,
            type: "purchase",
            quantityDelta: line.quantityReceived,
            quantityAfter: 0,
            reason: `PO ${poNumber}`,
            userId: user._id,
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

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});