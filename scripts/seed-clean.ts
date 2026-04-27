import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/sa-shop";

async function clean() {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(MONGODB_URI);
  }

  console.log("🧹 Cleaning demo data (tenantId: 000000000000000000000001)...");
  const tenantId = new mongoose.Types.ObjectId("000000000000000000000001");

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
      const result = await mongoose.connection.collection(col).deleteMany({ tenantId });
      if (result.deletedCount > 0) {
        console.log(`   ${col}: ${result.deletedCount} deleted`);
        total += result.deletedCount;
      }
    } catch {
      // skip
    }
  }

  // Also clean users by email
  const users = await mongoose.connection.collection("users").deleteMany({ email: "demo@sa-shop.com" });
  if (users.deletedCount > 0) {
    console.log(`   users (demo@sa-shop.com): ${users.deletedCount} deleted`);
    total += users.deletedCount;
  }

  console.log(`\n✅ Cleaned ${total} documents`);
  await mongoose.disconnect();
}

clean().catch((err) => {
  console.error("❌ Clean failed:", err);
  process.exit(1);
});