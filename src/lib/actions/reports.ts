"use server";

import { Invoice, StockMovement, StockLevel, Product, Branch, Membership } from "@/models";
import mongoose from "mongoose";

export async function getSalesReport(
  tenantId: string,
  options: { fromDate?: Date; toDate?: Date; branchId?: string; cashierId?: string }
) {
  const tenantOid = new mongoose.Types.ObjectId(tenantId);
  const match: Record<string, unknown> = {
    tenantId: tenantOid,
    status: "completed",
  };

  if (options.branchId) {
    match.branchId = new mongoose.Types.ObjectId(options.branchId);
  }
  if (options.cashierId) {
    match.cashierId = new mongoose.Types.ObjectId(options.cashierId);
  }
  if (options.fromDate || options.toDate) {
    match.issuedAt = {};
    if (options.fromDate) (match.issuedAt as Record<string, Date>).$gte = options.fromDate;
    if (options.toDate) (match.issuedAt as Record<string, Date>).$lte = options.toDate;
  }

  const [summary, hourly, byBranch] = await Promise.all([
    Invoice.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          totalSales: { $sum: { $toDouble: "$grandTotal" } },
          totalVat: { $sum: { $toDouble: "$vatTotal" } },
          totalDiscount: { $sum: { $toDouble: "$discountTotal" } },
          transactionCount: { $sum: 1 },
          totalItems: { $sum: { $size: "$lines" } },
        },
      },
    ]),
    Invoice.aggregate([
      { $match: { ...match, issuedAt: { $gte: new Date(Date.now() - 86400000) } } },
      {
        $group: {
          _id: { $hour: "$issuedAt" },
          total: { $sum: { $toDouble: "$grandTotal" } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    Invoice.aggregate([
      { $match: match },
      {
        $group: {
          _id: "$branchId",
          total: { $sum: { $toDouble: "$grandTotal" } },
          count: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: "branches",
          localField: "_id",
          foreignField: "_id",
          as: "branch",
        },
      },
      { $unwind: "$branch" },
      { $sort: { total: -1 } },
    ]),
  ]);

  return {
    summary: summary[0] || { totalSales: 0, totalVat: 0, totalDiscount: 0, transactionCount: 0, totalItems: 0 },
    hourly: hourly.map(h => ({
      hour: h._id,
      label: `${String(h._id).padStart(2, "0")}:00`,
      total: h.total,
      count: h.count,
    })),
    byBranch: byBranch.map(b => ({
      branchId: b._id.toString(),
      branchName: b.branch.name,
      total: b.total,
      count: b.count,
    })),
  };
}

export async function getStockMovements(
  tenantId: string,
  options: {
    fromDate?: Date;
    toDate?: Date;
    branchId?: string;
    productId?: string;
    type?: string;
    limit?: number;
  }
) {
  const tenantOid = new mongoose.Types.ObjectId(tenantId);
  const match: Record<string, unknown> = { tenantId: tenantOid };

  if (options.branchId) match.branchId = new mongoose.Types.ObjectId(options.branchId);
  if (options.productId) match.productId = new mongoose.Types.ObjectId(options.productId);
  if (options.type) match.type = options.type;
  if (options.fromDate || options.toDate) {
    match.createdAt = {};
    if (options.fromDate) (match.createdAt as Record<string, Date>).$gte = options.fromDate;
    if (options.toDate) (match.createdAt as Record<string, Date>).$lte = options.toDate;
  }

  const movements = await StockMovement.aggregate([
    { $match: match },
    { $sort: { createdAt: -1 } },
    { $limit: options.limit || 200 },
    {
      $lookup: {
        from: "products",
        localField: "productId",
        foreignField: "_id",
        as: "product",
      },
    },
    { $unwind: { path: "$product", preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: "branches",
        localField: "branchId",
        foreignField: "_id",
        as: "branch",
      },
    },
    { $unwind: { path: "$branch", preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: "users",
        localField: "userId",
        foreignField: "_id",
        as: "user",
      },
    },
    { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
    {
      $project: {
        createdAt: 1,
        type: 1,
        quantityDelta: 1,
        quantityAfter: 1,
        reason: 1,
        "product.name": 1,
        "product.sku": 1,
        "branch.name": 1,
        "user.name": 1,
      },
    },
  ]);

  const typeSummary = await StockMovement.aggregate([
    { $match: match },
    {
      $group: {
        _id: "$type",
        count: { $sum: 1 },
        totalQty: { $sum: { $abs: { $toDouble: "$quantityDelta" } } },
      },
    },
    { $sort: { count: -1 } },
  ]);

  return { movements, typeSummary };
}

export async function getLowStockReport(tenantId: string, branchId?: string) {
  const tenantOid = new mongoose.Types.ObjectId(tenantId);
  const branchMatch: Record<string, unknown> = { tenantId: tenantOid };

  if (branchId) branchMatch.branchId = new mongoose.Types.ObjectId(branchId);

  const stockLevels = await StockLevel.aggregate([
    { $match: branchMatch },
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
        "product.active": true,
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
    {
      $project: {
        productId: "$product._id",
        productName: "$product.name",
        productSku: "$product.sku",
        branchId: "$branch._id",
        branchName: "$branch.name",
        quantity: { $toDouble: "$quantity" },
        threshold: "$product.lowStockThreshold",
        deficit: {
          $subtract: ["$product.lowStockThreshold", { $toDouble: "$quantity" }],
        },
      },
    },
    { $sort: { quantity: 1 } },
  ]);

  return stockLevels;
}

export async function getProfitReport(
  tenantId: string,
  options: { fromDate?: Date; toDate?: Date; branchId?: string }
) {
  const tenantOid = new mongoose.Types.ObjectId(tenantId);
  const match: Record<string, unknown> = {
    tenantId: tenantOid,
    status: "completed",
  };

  if (options.branchId) match.branchId = new mongoose.Types.ObjectId(options.branchId);
  if (options.fromDate || options.toDate) {
    match.issuedAt = {};
    if (options.fromDate) (match.issuedAt as Record<string, Date>).$gte = options.fromDate;
    if (options.toDate) (match.issuedAt as Record<string, Date>).$lte = options.toDate;
  }

  const byCategory = await Invoice.aggregate([
    { $match: match },
    { $unwind: "$lines" },
    {
      $lookup: {
        from: "products",
        localField: "lines.productId",
        foreignField: "_id",
        as: "product",
      },
    },
    { $unwind: { path: "$product", preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: "categories",
        localField: "product.categoryId",
        foreignField: "_id",
        as: "category",
      },
    },
    { $unwind: { path: "$category", preserveNullAndEmptyArrays: true } },
    {
      $group: {
        _id: "$category._id",
        categoryName: { $first: "$category.name" },
        totalRevenue: {
          $sum: { $toDouble: "$lines.totalAmount" },
        },
        totalCost: {
          $sum: {
            $multiply: [
              { $toDouble: "$lines.quantity" },
              { $ifNull: [{ $toDouble: "$product.costPrice" }, 0] },
            ],
          },
        },
        itemsSold: { $sum: { $toDouble: "$lines.quantity" } },
      },
    },
    { $sort: { totalRevenue: -1 } },
  ]);

  const totals = byCategory.reduce(
    (acc, c) => ({
      revenue: acc.revenue + c.totalRevenue,
      cost: acc.cost + c.totalCost,
    }),
    { revenue: 0, cost: 0 }
  );

  return {
    byCategory,
    totals: {
      ...totals,
      profit: totals.revenue - totals.cost,
      margin: totals.revenue > 0 ? ((totals.revenue - totals.cost) / totals.revenue) * 100 : 0,
    },
  };
}

