import mongoose from "mongoose";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";

// Load .env.local if it exists
try {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (fs.existsSync(envPath)) {
    const envFile = fs.readFileSync(envPath, "utf-8");
    for (const line of envFile.split("\n")) {
      const match = line.match(/^\s*([^#=]+)\s*=\s*(.*)\s*$/);
      if (match) {
        const key = match[1].trim();
        let val = match[2].trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        process.env[key] = val;
      }
    }
  }
} catch (e) {
  // Ignore
}

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

// ── Seed Configurations ────────────────────────────────────────────────────────

const DEMO_TENANTS = [
  {
    id: "000000000000000000000001",
    name: "Al Nakheel Grocery",
    nameAr: "بقالة النخيل",
    email: "demo@sa-shop.com",
    ownerName: "Demo Owner",
    vatNumber: "310987654321003",
    crNumber: "CR123456789",
    address: "King Fahd Road, Al Nakheel District",
    addressAr: "طريق الملك فهد، حي النخيل",
    phone: "0112345678",
    emailTenant: "info@alnakhilgrocery.sa",
    plan: "starter" as const,
    primaryColor: "#377dff",
    sector: "Grocery",
  },
  {
    id: "000000000000000000000002",
    name: "Riyadh Heights Coffee",
    nameAr: "مقهى قمم الرياض",
    email: "coffee@sa-shop.com",
    ownerName: "Khalid Al-Mansoori",
    vatNumber: "310987654321013",
    crNumber: "CR987654321",
    address: "Olaya Street, Riyadh",
    addressAr: "شارع العليا، الرياض",
    phone: "0119998888",
    emailTenant: "contact@riyadhcoffee.sa",
    plan: "growth" as const,
    primaryColor: "#a67c52",
    sector: "F&B",
  },
  {
    id: "000000000000000000000003",
    name: "Al-Yasmin Boutique",
    nameAr: "بوتيك الياسمين",
    email: "boutique@sa-shop.com",
    ownerName: "Reem Al-Fahad",
    vatNumber: "310987654321023",
    crNumber: "CR555444333",
    address: "Tahlia Street, Jeddah",
    addressAr: "شارع التحلية، جدة",
    phone: "0123334444",
    emailTenant: "hello@yasminboutique.sa",
    plan: "pro" as const,
    primaryColor: "#e64980",
    sector: "Retail",
  },
  {
    id: "000000000000000000000004",
    name: "Medina Pharmacy",
    nameAr: "صيدلية المدينة",
    email: "pharma@sa-shop.com",
    ownerName: "Dr. Yasser Al-Harbi",
    vatNumber: "310987654321033",
    crNumber: "CR777888999",
    address: "Abu Bakr Road, Medina",
    addressAr: "طريق أبو بكر الصديق، المدينة المنورة",
    phone: "0145556666",
    emailTenant: "info@medinapharma.sa",
    plan: "enterprise" as const,
    primaryColor: "#0ca678",
    sector: "Pharmacy",
  }
];

const GROCERY_CATEGORIES = [
  { name: "Fresh & Dairy", nameAr: "طازج وألبان", children: ["Fresh Milk", "Yogurt", "Cheese", "Eggs"] },
  { name: "Bakery", nameAr: "مخبز", children: ["Arabic Bread", "Pita Bread", "Croissants"] },
  { name: "Beverages", nameAr: "مشروبات", children: ["Mineral Water", "Juice Box", "Soft Drinks", "Arabic Coffee"] },
];

const GROCERY_PRODUCTS = [
  { category: "Fresh Milk", name: "Fresh Milk 1L", nameAr: "حليب طازج ١ لتر", unit: "l" as const, costPrice: 3.20, sellingPrice: 4.50, vatRate: 0.15, sku: "FND-001", barcode: "6281000000001" },
  { category: "Yogurt", name: "Plain Yogurt 1kg", nameAr: "زبادي سادة ١ كغ", unit: "kg" as const, costPrice: 5.50, sellingPrice: 7.99, vatRate: 0.15, sku: "FND-003", barcode: "6281000000003" },
  { category: "Cheese", name: "Cheddar Cheese 500g", nameAr: "جبنة شيدر ٥٠٠ غ", unit: "pack" as const, costPrice: 12.00, sellingPrice: 16.99, vatRate: 0.15, sku: "FND-006", barcode: "6281000000006" },
  { category: "Eggs", name: "Eggs 30 Count", nameAr: "بيض ٣٠ حبة", unit: "pack" as const, costPrice: 10.00, sellingPrice: 14.99, vatRate: 0.15, sku: "FND-010", barcode: "6281000000010" },
  { category: "Arabic Bread", name: "Arabic Bread (Pita)", nameAr: "خبز عربي", unit: "piece" as const, costPrice: 0.40, sellingPrice: 1.00, vatRate: 0, sku: "BAK-001", barcode: "6281000000011" },
  { category: "Mineral Water", name: "Water Bottle 500ml", nameAr: "ماء معدني ٥٠٠ مل", unit: "piece" as const, costPrice: 0.80, sellingPrice: 1.50, vatRate: 0, sku: "BEV-001", barcode: "6281000000017" },
  { category: "Juice Box", name: "Orange Juice 1L", nameAr: "عصير برتقال ١ لتر", unit: "l" as const, costPrice: 4.50, sellingPrice: 6.99, vatRate: 0.15, sku: "BEV-003", barcode: "6281000000019" },
  { category: "Soft Drinks", name: "Cola Can 330ml", nameAr: "كولا علبة ٣٣٠ مل", unit: "piece" as const, costPrice: 1.20, sellingPrice: 2.00, vatRate: 0.15, sku: "BEV-005", barcode: "6281000000021" },
];

const CUSTOMERS_DATA = [
  { name: "Ahmed Al-Rashid", nameAr: "أحمد الراشد", phone: "0501112233", city: "Riyadh" },
  { name: "Fatima Hassan", nameAr: "فاطمة حسن", phone: "0502233444", city: "Riyadh" },
  { name: "Mohammed Ali", nameAr: "محمد علي", phone: "0503344555", city: "Dammam" },
  { name: "Sara Abdullah", nameAr: "سارة عبد الله", phone: "0504455666", city: "Jeddah" },
  { name: "Khalid Ibrahim", nameAr: "خالد إبراهيم", phone: "0505566777", city: "Riyadh" },
];

const SUPPLIERS_DATA = [
  { name: "Al Safeer Distribution", nameAr: "توزيع الصفير", contactName: "Omar Khalid", phone: "0112345678", email: "orders@alsafeer.sa", vatNumber: "310123456789003", paymentTerms: "net30" },
  { name: "Gulf Fresh Foods", nameAr: "غولف فريش فودز", contactName: "Saeed Al-Mutairi", phone: "0113456789", email: "supply@gulffresh.sa", vatNumber: "310234567890003", paymentTerms: "net15" },
];

function getSectorData(sector: string) {
  if (sector === "F&B") {
    return {
      categories: [
        { name: "Coffee & Drinks", nameAr: "القهوة والمشروبات", children: ["Espresso", "Latte", "Cold Brew", "Turkish Coffee"] },
        { name: "Bakery & Sweets", nameAr: "المخبوزات والحلويات", children: ["Croissants", "Cookies", "Cheese Cake"] },
      ],
      products: [
        { category: "Espresso", name: "Double Espresso", nameAr: "إسبريسو دبل", unit: "piece" as const, costPrice: 2.0, sellingPrice: 12.0, vatRate: 0.15, sku: "COF-001", barcode: "7281000000001" },
        { category: "Latte", name: "Spanish Latte", nameAr: "سبانش لاتيه", unit: "piece" as const, costPrice: 4.0, sellingPrice: 18.0, vatRate: 0.15, sku: "COF-002", barcode: "7281000000002" },
        { category: "Cold Brew", name: "Signature Cold Brew", nameAr: "كولد برو مميز", unit: "piece" as const, costPrice: 5.0, sellingPrice: 20.0, vatRate: 0.15, sku: "COF-003", barcode: "7281000000003" },
        { category: "Croissants", name: "Almond Croissant", nameAr: "كرواسون اللوز", unit: "piece" as const, costPrice: 3.5, sellingPrice: 14.0, vatRate: 0.15, sku: "COF-004", barcode: "7281000000004" },
        { category: "Cheese Cake", name: "Saffron Cheese Cake", nameAr: "تشيز كيك الزعفران", unit: "piece" as const, costPrice: 6.0, sellingPrice: 24.0, vatRate: 0.15, sku: "COF-005", barcode: "7281000000005" },
      ]
    };
  }
  
  if (sector === "Retail") {
    return {
      categories: [
        { name: "Menswear", nameAr: "ملابس رجالية", children: ["Thobes", "Shemagh"] },
        { name: "Womenswear", nameAr: "ملابس نسائية", children: ["Abayas", "Dresses"] },
        { name: "Perfumes", nameAr: "العطور", children: ["Oud", "Musk"] },
      ],
      products: [
        { category: "Thobes", name: "Premium White Thobe", nameAr: "ثوب أبيض فاخر", unit: "piece" as const, costPrice: 80.0, sellingPrice: 180.0, vatRate: 0.15, sku: "BOT-001", barcode: "8281000000001" },
        { category: "Shemagh", name: "Red Shemagh Classic", nameAr: "شماغ أحمر كلاسيك", unit: "piece" as const, costPrice: 60.0, sellingPrice: 150.0, vatRate: 0.15, sku: "BOT-002", barcode: "8281000000002" },
        { category: "Abayas", name: "Black Silk Abaya", nameAr: "عباية حرير سوداء", unit: "piece" as const, costPrice: 120.0, sellingPrice: 320.0, vatRate: 0.15, sku: "BOT-003", barcode: "8281000000003" },
        { category: "Oud", name: "Royal Oud Perfume 100ml", nameAr: "عطر العود الملكي ١٠٠ مل", unit: "piece" as const, costPrice: 150.0, sellingPrice: 450.0, vatRate: 0.15, sku: "BOT-004", barcode: "8281000000004" },
      ]
    };
  }

  if (sector === "Pharmacy") {
    return {
      categories: [
        { name: "Medicines", nameAr: "الأدوية", children: ["Pain Relief", "Cold & Flu"] },
        { name: "Supplements", nameAr: "المكملات الغذائية", children: ["Multivitamins", "Vitamin C"] },
        { name: "Hygiene & Skin", nameAr: "النظافة والبشرة", children: ["Sunscreen", "Face Wash"] },
      ],
      products: [
        { category: "Pain Relief", name: "Panadol Joint 24 tab", nameAr: "بنادول للمفاصل ٢٤ قرص", unit: "pack" as const, costPrice: 12.0, sellingPrice: 18.50, vatRate: 0.15, sku: "PHA-001", barcode: "9281000000001" },
        { category: "Vitamin C", name: "Vitamin C Effervescent 20tab", nameAr: "فيتامين سي فوار ٢٠ قرص", unit: "pack" as const, costPrice: 15.0, sellingPrice: 22.00, vatRate: 0.15, sku: "PHA-002", barcode: "9281000000002" },
        { category: "Sunscreen", name: "SPF 50+ Sunscreen Cream 50ml", nameAr: "كريم واقي شمس ٥٠ مل", unit: "piece" as const, costPrice: 45.0, sellingPrice: 85.00, vatRate: 0.15, sku: "PHA-003", barcode: "9281000000003" },
      ]
    };
  }

  // Default: Grocery
  return {
    categories: GROCERY_CATEGORIES,
    products: GROCERY_PRODUCTS,
  };
}

// ── Main Seeder ────────────────────────────────────────────────────────────────

async function seed() {
  console.log("🌱 Connecting to MongoDB...");
  await connect();
  console.log("✅ Connected\n");

  const { 
    User, Tenant, Membership, Branch, Category, Product, 
    StockLevel, Customer, InvoiceCounter, Invoice, 
    Supplier, PurchaseOrder, StockBatch, StockMovement,
    TenantZatcaConfig
  } = await import("../src/models");

  const demoEmails = DEMO_TENANTS.map(t => t.email);
  const demoTenantIds = DEMO_TENANTS.map(t => new mongoose.Types.ObjectId(t.id));

  console.log("🧹 Cleaning previous demo data...");
  const models = [
    StockMovement, StockBatch, StockLevel,
    Invoice, InvoiceCounter,
    Customer, PurchaseOrder, Supplier,
    Product, Category,
    Branch,
    Membership,
    TenantZatcaConfig,
    Tenant,
    User,
  ];

  for (const model of models) {
    if (model === User) {
      await User.deleteMany({ email: { $in: demoEmails } });
    } else if (model === Tenant) {
      await Tenant.deleteMany({ _id: { $in: demoTenantIds } });
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (model as any).deleteMany({ tenantId: { $in: demoTenantIds } } as any);
    }
  }
  console.log("✅ Cleaned\n");

  // Loop over each demo tenant config
  for (const dt of DEMO_TENANTS) {
    const curTenantId = new mongoose.Types.ObjectId(dt.id);
    console.log(`🚀 Seeding Tenant: ${dt.name} [${dt.sector}]`);

    // ── Step 1: User + Tenant + Membership ────────────────────────────────────
    const user = await User.create({
      email: dt.email,
      name: dt.ownerName,
      passwordHash: "demo1234", // Will be hashed by pre-save hook
      emailVerifiedAt: new Date(),
    });
    console.log(`   Owner: ${dt.email} / demo1234`);

    const tenant = await Tenant.create({
      _id: curTenantId,
      name: dt.name,
      nameAr: dt.nameAr,
      vatNumber: dt.vatNumber,
      crNumber: dt.crNumber,
      address: dt.address,
      addressAr: dt.addressAr,
      phone: dt.phone,
      email: dt.emailTenant,
      baseCurrency: "SAR",
      timezone: "Asia/Riyadh",
      defaultLanguage: "en",
      vatRegistered: true,
      zatcaPhase: 2,
      zatcaCsid: "CSID-DEMO-00" + dt.id.slice(-1),
      zatcaSolutionId: "SOL-DEMO-00" + dt.id.slice(-1),
      zatcaCertificateId: "CERT-DEMO-00" + dt.id.slice(-1),
      plan: dt.plan,
      planExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      primaryColor: dt.primaryColor,
    });
    const tenantId = tenant._id;

    await TenantZatcaConfig.create({
      tenantId,
      sellerName: dt.name,
      sellerNameAr: dt.nameAr,
      trn: dt.vatNumber,
      address: {
        buildingNumber: "1234",
        streetName: dt.address.split(",")[0] || "Olaya St",
        district: dt.address.split(",")[1] || "Al Nakheel",
        city: "Riyadh",
        postalCode: "12345",
        countryCode: "SA"
      },
      environment: "sandbox",
      isActive: true,
      updatedBy: user._id,
    });

    await Membership.create({
      userId: user._id,
      tenantId,
      role: "owner",
      branchIds: [],
      status: "active",
      acceptedAt: new Date(),
    });

    // ── Step 2: Branches ────────────────────────────────────────────────────────
    const branchIds: mongoose.Types.ObjectId[] = [];

    const hqBranch = await Branch.create({
      tenantId,
      name: `${dt.name} HQ`,
      nameAr: `فرع ${dt.nameAr} الرئيسي`,
      address: dt.address,
      addressAr: dt.addressAr,
      city: "Riyadh",
      region: "Riyadh",
      phone: dt.phone,
      vatBranchCode: "BR001",
      isHeadOffice: true,
      active: true,
    });
    branchIds.push(hqBranch._id);

    const olayaBranch = await Branch.create({
      tenantId,
      name: `${dt.name} Olaya`,
      nameAr: `فرع ${dt.nameAr} العليا`,
      address: "Olaya Main Road",
      addressAr: "طريق العليا العام",
      city: "Riyadh",
      region: "Riyadh",
      phone: dt.phone,
      vatBranchCode: "BR002",
      isHeadOffice: false,
      active: true,
    });
    branchIds.push(olayaBranch._id);
    console.log(`   Branches: HQ + Olaya`);

    // ── Step 3: Categories ─────────────────────────────────────────────────────
    const sectorData = getSectorData(dt.sector);
    const categoryMap: Record<string, mongoose.Types.ObjectId> = {};

    for (const cat of sectorData.categories) {
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
          nameAr: childName,
          parentId: parent._id,
          sortOrder: 0,
          active: true,
        });
        categoryMap[childName] = child._id;
      }
    }

    // ── Step 4: Products ───────────────────────────────────────────────────────
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const products: any[] = [];

    for (const p of sectorData.products) {
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
    console.log(`   Products: ${products.length} created`);

    // ── Step 5: Stock Levels ───────────────────────────────────────────────────
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
      }
    }

    // ── Step 6: Customers ──────────────────────────────────────────────────────
    const customerIds: mongoose.Types.ObjectId[] = [];

    for (const c of CUSTOMERS_DATA) {
      const result = await Customer.create({
        tenantId,
        name: `${c.name} (${dt.sector})`,
        nameAr: `${c.nameAr} (${dt.sector})`,
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
      customerIds.push(result._id as mongoose.Types.ObjectId);
    }

    // ── Step 7: Invoice Counters ───────────────────────────────────────────────
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

    // ── Step 8: Invoices (20 invoices, last 30 days) ────────────────────────────
    const previousHashes: Record<string, string> = {
      [branchIds[0].toString()]: "0000000000000000000000000000000000000000000000000000000000000000",
      [branchIds[1].toString()]: "0000000000000000000000000000000000000000000000000000000000000000",
    };

    let invoiceCount = 0;

    for (let i = 0; i < 20; i++) {
      const branchIdx = i < 12 ? 0 : 1;
      const branchId = branchIds[branchIdx];
      const issuedAt = randomDate(30, 1);
      const numItems = randomInt(1, Math.min(3, products.length));

      const shuffled = [...products].sort(() => Math.random() - 0.5);
      const selected = shuffled.slice(0, numItems);

      const lines = selected.map((p) => {
        const qty = randomInt(1, 4);
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
      const invoiceNum = `INV-${dt.id.slice(-2)}-${String(counter!.currentValue).padStart(6, "0")}`;

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
        sellerName: dt.name,
        sellerVatNumber: dt.vatNumber,
        timestamp: issuedAt.toISOString(),
        invoiceTotal: grandTotal,
        vatTotal: vatTotal,
      });

      const customerId = Math.random() < 0.3 ? customerIds[randomInt(0, customerIds.length - 1)] : undefined;
      const paymentMethod = Math.random() < 0.6 ? "cash" : "mada";
      const status = i === 9 ? "refunded" : "completed";

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
    console.log(`   Invoices: ${invoiceCount} created`);

    // ── Step 9: Suppliers ─────────────────────────────────────────────────────
    const suppliers: mongoose.Document[] = [];

    for (const s of SUPPLIERS_DATA) {
      const result = await Supplier.create({
        tenantId,
        name: `${s.name} (${dt.sector})`,
        nameAr: `${s.nameAr} (${dt.sector})`,
        contactName: s.contactName,
        phone: s.phone,
        email: s.email,
        vatNumber: s.vatNumber.slice(0, -2) + dt.id.slice(-2),
        paymentTerms: s.paymentTerms,
        active: true,
      });
      suppliers.push(result);
    }

    // ── Step 10: Purchase Orders ───────────────────────────────────────────────
    const poStatuses = ["draft", "submitted", "submitted", "partially_received", "received", "cancelled"];
    let poCount = 0;

    for (let i = 0; i < Math.min(6, products.length); i++) {
      const supplier = suppliers[i % suppliers.length];
      const branchId = branchIds[i % 2];
      const status = poStatuses[i];
      const createdAt = randomDate(45, 1);
      const issuedAt = status !== "draft" ? new Date(createdAt.getTime() + 2 * 60 * 60 * 1000) : null;

      const poProducts = products.slice(i, i + 2);
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

      const poNumber = `PO-${dt.id.slice(-2)}-${String(i + 1).padStart(6, "0")}`;

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
    console.log(`   Purchase Orders: ${poCount} created\n`);
  }

  // ── Done ───────────────────────────────────────────────────────────────────
  console.log("\n✅ Multi-tenant seed complete!");
  console.log("\n📋 Demo credentials:");
  for (const dt of DEMO_TENANTS) {
    console.log(`   - [${dt.sector}] Email: ${dt.email} / password: demo1234 (${dt.name})`);
  }

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});