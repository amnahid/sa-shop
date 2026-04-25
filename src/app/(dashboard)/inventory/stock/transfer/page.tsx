"use server";

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Product, StockLevel, Branch, Membership, StockMovement } from "@/models";
import mongoose from "mongoose";

export default async function TransferStockPage() {
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
      <h1 className="text-2xl font-bold text-foreground mb-6">Transfer Stock</h1>

      <form action={async (formData) => {
        "use server";
        const session = await auth();
        if (!session?.user?.id) return;

        const membership = await Membership.findOne({ userId: session.user.id, status: "active" });
        if (!membership) return;

        const tenantId = membership.tenantId;
        const userId = session.user.id;

        const productId = formData.get("productId") as string;
        const fromBranchId = formData.get("fromBranchId") as string;
        const toBranchId = formData.get("toBranchId") as string;
        const quantity = parseInt(formData.get("quantity") as string);

        if (!productId || !fromBranchId || !toBranchId || fromBranchId === toBranchId || isNaN(quantity) || quantity <= 0) {
          return;
        }

        const fromStock = await StockLevel.findOne({
          tenantId,
          productId: new mongoose.Types.ObjectId(productId),
          branchId: new mongoose.Types.ObjectId(fromBranchId),
        });

        if (!fromStock || parseFloat(fromStock.quantity.toString()) < quantity) {
          return;
        }

        const toStock = await StockLevel.findOne({
          tenantId,
          productId: new mongoose.Types.ObjectId(productId),
          branchId: new mongoose.Types.ObjectId(toBranchId),
        });

        const fromQty = parseFloat(fromStock.quantity.toString());
        const toQty = toStock ? parseFloat(toStock.quantity.toString()) : 0;

        await StockLevel.findByIdAndUpdate(fromStock._id, {
          quantity: (fromQty - quantity).toString(),
        });

        if (toStock) {
          await StockLevel.findByIdAndUpdate(toStock._id, {
            quantity: (toQty + quantity).toString(),
          });
        } else {
          await StockLevel.create({
            tenantId,
            productId: new mongoose.Types.ObjectId(productId),
            branchId: new mongoose.Types.ObjectId(toBranchId),
            quantity: quantity.toString(),
            reservedQuantity: "0",
          });
        }

        const fromBranch = await Branch.findById(fromBranchId);
        const toBranch = await Branch.findById(toBranchId);

        await StockMovement.create({
          tenantId,
          productId: new mongoose.Types.ObjectId(productId),
          branchId: new mongoose.Types.ObjectId(fromBranchId),
          type: "transfer_out",
          quantityDelta: (-quantity).toString(),
          quantityAfter: fromQty - quantity,
          reason: `Transfer to ${toBranch?.name}`,
          userId: new mongoose.Types.ObjectId(userId),
        });

        await StockMovement.create({
          tenantId,
          productId: new mongoose.Types.ObjectId(productId),
          branchId: new mongoose.Types.ObjectId(toBranchId),
          type: "transfer_in",
          quantityDelta: quantity.toString(),
          quantityAfter: toQty + quantity,
          reason: `Transfer from ${fromBranch?.name}`,
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

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="fromBranchId" className="block text-sm font-medium text-foreground mb-1">From Branch *</label>
            <select id="fromBranchId" name="fromBranchId" required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
              <option value="">Select</option>
              {branches.map(b => (
                <option key={b._id.toString()} value={b._id.toString()}>{b.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="toBranchId" className="block text-sm font-medium text-foreground mb-1">To Branch *</label>
            <select id="toBranchId" name="toBranchId" required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
              <option value="">Select</option>
              {branches.map(b => (
                <option key={b._id.toString()} value={b._id.toString()}>{b.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="quantity" className="block text-sm font-medium text-foreground mb-1">Quantity *</label>
          <input id="quantity" name="quantity" type="number" min="1" required placeholder="Amount to transfer" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
        </div>

        <div className="flex justify-between gap-2 pt-4">
          <a href="/inventory/stock" className="inline-flex items-center justify-center rounded-md border border-input bg-background text-foreground h-10 px-4 py-2 text-sm font-medium">Cancel</a>
          <button type="submit" className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground h-10 px-4 py-2 text-sm font-medium">Transfer</button>
        </div>
      </form>
    </div>
  );
}