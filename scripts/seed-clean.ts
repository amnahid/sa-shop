import mongoose from "mongoose";
import fs from "fs";
import path from "path";

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

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/sa-shop";

const demoEmails = [
  "demo@sa-shop.com",
  "coffee@sa-shop.com",
  "boutique@sa-shop.com",
  "pharma@sa-shop.com",
];

const demoTenantIds = [
  new mongoose.Types.ObjectId("000000000000000000000001"),
  new mongoose.Types.ObjectId("000000000000000000000002"),
  new mongoose.Types.ObjectId("000000000000000000000003"),
  new mongoose.Types.ObjectId("000000000000000000000004"),
];

async function clean() {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(MONGODB_URI);
  }

  console.log("🧹 Cleaning demo data for 4 demo tenants...");

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

  let total = 0;
  for (const col of collections) {
    try {
      const result = await mongoose.connection.collection(col).deleteMany({ 
        tenantId: { $in: demoTenantIds } 
      });
      if (result.deletedCount > 0) {
        console.log(`   ${col}: ${result.deletedCount} deleted`);
        total += result.deletedCount;
      }
    } catch {
      // skip
    }
  }

  // Also clean users by email
  const users = await mongoose.connection.collection("users").deleteMany({ 
    email: { $in: demoEmails } 
  });
  if (users.deletedCount > 0) {
    console.log(`   users (demo accounts): ${users.deletedCount} deleted`);
    total += users.deletedCount;
  }

  console.log(`\n✅ Cleaned ${total} documents`);
  await mongoose.disconnect();
}

clean().catch((err) => {
  console.error("❌ Clean failed:", err);
  process.exit(1);
});