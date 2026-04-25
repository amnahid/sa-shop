"use server";

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Product, StockLevel, Branch, Membership, StockMovement } from "@/models";
import mongoose from "mongoose";

export default async function AdjustStockPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const membership = await Membership.findOne({ userId: session.user.id, status: "active" });
  if (!membership) {
    return <div>No active membership</div>;
  }

  const tenantId = membership.tenantId;

  const products = await Product.find({ tenantId, deletedAt: null, trackStock: true }).sort({ name: 1 });
  const branches = await Branch.find({ tenantId, active: true }).sort({ name: 1 });

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-foreground mb-6">Adjust Stock</h1>

      <form action={async (formData) => {
        "use server";
        const session = await auth();
        if (!session?.user?.id) return;

        const membership = await Membership.findOne({ userId: session.user.id, status: "active" });
        if (!membership) return;

        const tenantId = membership.tenantId;
        const userId = session.user.id;

        const productId = formData.get("productId") as string;
        const branchId = formData.get("branchId") as string;
        const adjustment = parseInt(formData.get("adjustment") as string);
        const reason = formData.get("reason") as string;

        if (!productId || !branchId || isNaN(adjustment)) return;

        let stockLevel = await StockLevel.findOne({
          tenantId,
          productId: new mongoose.Types.ObjectId(productId),
          branchId: new mongoose.Types.ObjectId(branchId),
        });

        const currentQty = stockLevel ? parseFloat(stockLevel.quantity.toString()) : 0;
        const newQty = currentQty + adjustment;

        if (newQty < 0) return;

        if (stockLevel) {
          await StockLevel.findByIdAndUpdate(stockLevel._id, { quantity: newQty.toString() });
        } else {
          await StockLevel.create({
            tenantId,
            productId: new mongoose.Types.ObjectId(productId),
            branchId: new mongoose.Types.ObjectId(branchId),
            quantity: newQty.toString(),
            reservedQuantity: "0",
          });
        }

        await StockMovement.create({
          tenantId,
          productId: new mongoose.Types.ObjectId(productId),
          branchId: new mongoose.Types.ObjectId(branchId),
          type: adjustment > 0 ? "purchase" : "adjustment",
          quantityDelta: adjustment.toString(),
          quantityAfter: newQty,
          reason: reason || (adjustment > 0 ? "Manual adjustment" : "Count correction"),
          userId: new mongoose.Types.ObjectId(userId),
        });

        redirect("/inventory/stock");
      }} className="space-y-4">
        <div>
          <label htmlFor="productId" className="block text-sm font-medium text-foreground mb-1">Product *</label>
          <select id="productId" name="productId" required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
            <option value="">Select product</option>
            {products.map(p => (
              <option key={p._id.toString()} value={p._id.toString()}>{p.name} ({p.sku})</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="branchId" className="block text-sm font-medium text-foreground mb-1">Branch *</label>
          <select id="branchId" name="branchId" required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
            <option value="">Select branch</option>
            {branches.map(b => (
              <option key={b._id.toString()} value={b._id.toString()}>{b.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="adjustment" className="block text-sm font-medium text-foreground mb-1">Adjustment *</label>
          <input id="adjustment" name="adjustment" type="number" required placeholder="e.g. 10 or -5" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
          <p className="text-xs text-muted-foreground mt-1">Use positive number to add, negative to remove</p>
        </div>

        <div>
          <label htmlFor="reason" className="block text-sm font-medium text-foreground mb-1">Reason</label>
          <select id="reason" name="reason" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
            <option value="count_correction">Count correction</option>
            <option value="damage">Damaged goods</option>
            <option value="found">Found stock</option>
            <option value="received">Stock received</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div className="flex justify-between gap-2 pt-4">
          <a href="/inventory/stock" className="inline-flex items-center justify-center rounded-md border border-input bg-background text-foreground h-10 px-4 py-2 text-sm font-medium">Cancel</a>
          <button type="submit" className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground h-10 px-4 py-2 text-sm font-medium">Adjust Stock</button>
        </div>
      </form>
    </div>
  );
}