import mongoose from "mongoose";
import fs from "fs";
import path from "path";
import readline from "readline";

// Load .env.local manually if MONGODB_URI is not in process.env
if (!process.env.MONGODB_URI) {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf8");
    for (const line of envContent.split("\n")) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#")) {
        const parts = trimmed.split("=");
        if (parts.length >= 2) {
          const key = parts[0].trim();
          const value = parts.slice(1).join("=").trim().replace(/^['"]|['"]$/g, "");
          process.env[key] = value;
        }
      }
    }
  }
}

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/sa-shop";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const question = (query: string): Promise<string> => {
  return new Promise((resolve) => rl.question(query, resolve));
};

async function main() {
  console.log("🔌 Connecting to MongoDB...");
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(MONGODB_URI);
  }
  console.log("✅ Connected successfully.\n");

  // Dynamically import models after environment variables are loaded
  const { User, Tenant, Membership } = await import("../src/models");

  let email = process.argv[2];
  let name = process.argv[3];
  let password = process.argv[4];

  if (!email || !name || !password) {
    console.log("💡 No CLI arguments provided, entering interactive mode...");
    if (!email) {
      email = await question("Enter Email: ");
    }
    if (!name) {
      name = await question("Enter Name: ");
    }
    if (!password) {
      password = await question("Enter Password: ");
    }
  }

  email = email.trim().toLowerCase();
  name = name.trim();
  password = password.trim();

  if (!email || !name || !password) {
    console.error("❌ Email, Name, and Password are required.");
    rl.close();
    await mongoose.disconnect();
    process.exit(1);
  }

  // 1. Check if user already exists
  let user = await User.findOne({ email });

  if (user) {
    console.log(`\n👤 User with email ${email} already exists.`);
    const confirm = await question("Do you want to promote this user to Super Admin and update their password/name? (y/n): ");
    if (confirm.toLowerCase().startsWith("y")) {
      user.name = name;
      user.passwordHash = password; // pre-save hook will hash it
      user.isSuperAdmin = true;
      user.emailVerifiedAt = user.emailVerifiedAt || new Date();
      await user.save();
      console.log(`\n🎉 User ${email} has been updated to Super Admin.`);
    } else {
      console.log("\n❌ Operation cancelled.");
      rl.close();
      await mongoose.disconnect();
      process.exit(0);
    }
  } else {
    // Create new super admin
    user = await User.create({
      email,
      name,
      passwordHash: password, // pre-save hook will hash it
      isSuperAdmin: true,
      emailVerifiedAt: new Date(),
    });
    console.log(`\n🎉 Super Admin user created successfully:`);
    console.log(`   ID:    ${user._id}`);
    console.log(`   Email: ${email}`);
    console.log(`   Name:  ${name}`);
  }

  // 2. Offer to link to an existing tenant
  const tenants = await Tenant.find().limit(10);
  const tenantOption = process.argv[5];

  if (tenants.length > 0) {
    let selection: number | null = null;

    if (tenantOption) {
      if (tenantOption.toLowerCase() === "first") {
        selection = 1;
      } else if (tenantOption.toLowerCase() === "skip") {
        selection = tenants.length + 1;
      } else {
        // Check if it's a valid ObjectId or name match
        const foundIdx = tenants.findIndex(t => t._id.toString() === tenantOption || t.name.toLowerCase() === tenantOption.toLowerCase());
        if (foundIdx !== -1) {
          selection = foundIdx + 1;
        } else {
          selection = tenants.length + 1;
        }
      }
    }

    if (selection === null) {
      console.log("\n🏢 Existing Tenants in database:");
      tenants.forEach((t, i) => {
        console.log(`   [${i + 1}] ${t.name} (${t.nameAr || "N/A"}) - ID: ${t._id}`);
      });
      console.log(`   [${tenants.length + 1}] None (Do not link to any tenant)`);

      const selectionStr = await question(`\nSelect tenant to link to (1-${tenants.length + 1}): `);
      selection = parseInt(selectionStr.trim(), 10);
    }

    if (selection >= 1 && selection <= tenants.length) {
      const selectedTenant = tenants[selection - 1];
      
      // Check if membership already exists
      const membership = await Membership.findOne({
        userId: user._id,
        tenantId: selectedTenant._id,
      });

      if (membership) {
        membership.role = "owner";
        membership.status = "active";
        await membership.save();
        console.log(`\n✅ Membership updated to Owner for tenant: ${selectedTenant.name}`);
      } else {
        await Membership.create({
          userId: user._id,
          tenantId: selectedTenant._id,
          role: "owner",
          branchIds: [],
          status: "active",
          acceptedAt: new Date(),
        });
        console.log(`\n✅ Membership created as Owner for tenant: ${selectedTenant.name}`);
      }
    } else {
      console.log("\nℹ️ Not linking to any tenant. The super admin can onboard a new business via the UI.");
    }
  } else {
    console.log("\nℹ️ No tenants found in database. The super admin can onboard a new business via the UI.");
  }

  rl.close();
  await mongoose.disconnect();
  console.log("\n👋 Done!");
}

main().catch((err) => {
  console.error("\n❌ Error creating super admin:", err);
  rl.close();
  mongoose.disconnect();
  process.exit(1);
});
