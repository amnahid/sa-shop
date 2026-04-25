import { StockLevel, Product, Branch, Membership, Tenant } from "@/models";
import { sendLowStockAlert } from "@/lib/email";
import mongoose from "mongoose";

export async function sendLowStockEmails() {
  const tenants = await Tenant.find({});

  for (const tenant of tenants) {
    const lowStockProducts = await StockLevel.aggregate([
      { $match: { tenantId: tenant._id } },
      {
        $lookup: {
          from: "products",
          localField: "productId",
          foreignField: "_id",
          as: "product",
        },
      },
      { $unwind: "$product" },
      {
        $match: {
          "product.deletedAt": null,
          "product.trackStock": true,
          $expr: {
            $or: [
              { $eq: [{ $toDouble: "$quantity" }, 0] },
              { $lte: [{ $toDouble: "$quantity" }, "$product.lowStockThreshold"] },
            ],
          },
        },
      },
      {
        $lookup: {
          from: "branches",
          localField: "branchId",
          foreignField: "_id",
          as: "branch",
        },
      },
      { $unwind: "$branch" },
    ]);

    if (lowStockProducts.length === 0) continue;

    const ownerMemberships = await Membership.find({
      tenantId: tenant._id,
      role: "owner",
      status: "active",
    }).populate("userId");

    for (const membership of ownerMemberships) {
      const user = membership.userId as unknown as { _id: mongoose.Types.ObjectId; email?: string; name?: string };
      if (!user?.email) continue;

      const items = lowStockProducts.map(p => ({
        name: p.product.name,
        branch: p.branch.name,
        quantity: parseFloat(p.quantity.toString()),
        threshold: p.product.lowStockThreshold,
      }));

      await sendLowStockAlert({
        to: user.email,
        name: user.name,
        businessName: tenant.name,
        items,
        totalCount: lowStockProducts.length,
      });

      console.log(`[LOW STOCK] Email sent to ${user.email} for tenant ${tenant.name}: ${lowStockProducts.length} items`);
    }
  }
}