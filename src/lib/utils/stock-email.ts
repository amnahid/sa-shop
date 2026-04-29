import { StockLevel, Product, Branch, Membership, Tenant } from "@/models";
import { sendLowStockAlert } from "@/lib/email";
import { reportCriticalFailure } from "@/lib/ops-monitoring";
import { sendInAppNotification } from "@/lib/in-app-notifications";
import mongoose from "mongoose";

export async function sendLowStockEmails() {
  const tenants = await Tenant.find({});

  for (const tenant of tenants) {
    try {
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

        const result = await sendLowStockAlert({
          to: user.email,
          name: user.name,
          businessName: tenant.name,
          items,
          totalCount: lowStockProducts.length,
        }, {
          tenantId: tenant._id,
        });

        if (!result.success) {
          await reportCriticalFailure({
            domain: "background-low-stock",
            operation: "send-low-stock-alert-email",
            error: result.error || "low-stock-alert-send-failed",
            tenantId: tenant._id,
            actorTenantId: tenant._id,
            jobName: "low-stock-cron",
            metadata: {
              lowStockItemsCount: lowStockProducts.length,
            },
          });
          continue;
        }

        const inAppResult = await sendInAppNotification({
          tenantId: tenant._id,
          actorTenantId: tenant._id,
          recipientUserIds: [user._id],
          type: "inventory.low_stock",
          title: "Low stock alert",
          message: `${lowStockProducts.length} item(s) need restocking.`,
          linkUrl: "/reports/low-stock",
          metadata: {
            totalCount: lowStockProducts.length,
            items: items.slice(0, 10),
          },
        });
        if (!inAppResult.success) {
          await reportCriticalFailure({
            domain: "background-low-stock",
            operation: "send-low-stock-in-app-notification",
            error: inAppResult.error,
            tenantId: tenant._id,
            actorTenantId: tenant._id,
            jobName: "low-stock-cron",
          });
        }

        console.log(`[LOW STOCK] Email sent to ${user.email} for tenant ${tenant.name}: ${lowStockProducts.length} items`);
      }
    } catch (error) {
      await reportCriticalFailure({
        domain: "background-low-stock",
        operation: "send-low-stock-emails",
        error,
        tenantId: tenant._id,
        actorTenantId: tenant._id,
        jobName: "low-stock-cron",
      });
    }
  }
}
