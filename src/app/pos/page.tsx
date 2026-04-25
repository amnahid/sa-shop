"use server";

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Product, StockLevel, Branch, Membership, Category } from "@/models";
import mongoose from "mongoose";
import { POSClient } from "@/components/pos/POSClient";

export default async function POSPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const membership = await Membership.findOne({ userId: session.user.id, status: "active" });
  if (!membership) {
    return <div>No active membership</div>;
  }

  const tenantId = membership.tenantId;
  const branches = await Branch.find({ tenantId, active: true }).sort({ name: 1 });

  const products = await Product.find({
    tenantId,
    deletedAt: null,
    active: true,
    trackStock: true,
  }).sort({ name: 1 }).limit(100);

  const stockLevels = await StockLevel.find({
    tenantId,
    branchId: { $in: branches.map(b => b._id) },
  });

  const categories = await Category.find({ tenantId }).sort({ name: 1 });

  const defaultBranchId = branches.find(b => b.isHeadOffice)?._id?.toString() || branches[0]?._id?.toString() || "";

  const productsWithStock = products.map(p => {
    const stock = stockLevels.find(
      s => s.productId.toString() === p._id.toString() && s.branchId.toString() === defaultBranchId
    );
    return {
      _id: p._id.toString(),
      name: p.name,
      nameAr: p.nameAr,
      sku: p.sku,
      barcode: p.barcode,
      unit: p.unit,
      sellingPrice: parseFloat(p.sellingPrice.toString()),
      vatRate: p.vatRate ?? 0.15,
      vatInclusivePrice: p.vatInclusivePrice,
      trackStock: p.trackStock,
      lowStockThreshold: p.lowStockThreshold,
      imageUrls: p.imageUrls,
      stock: stock ? parseFloat(stock.quantity.toString()) : 0,
    };
  });

  return (
    <POSClient
      products={productsWithStock}
      branches={branches.map(b => ({ _id: b._id.toString(), name: b.name, isHeadOffice: b.isHeadOffice }))}
      categories={categories.map(c => ({ _id: c._id.toString(), name: c.name }))}
      userId={session.user.id}
      tenantId={tenantId.toString()}
    />
  );
}