

import { redirect } from "next/navigation";
import mongoose from "mongoose";
import { Product, StockLevel, Branch, StockMovement } from "@/models";
import { getCurrentMembership } from "@/lib/utils/membership";
import { PageHeader } from "@/components/app/PageHeader";
import { FormField } from "@/components/app/FormField";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Link from "next/link";

export default async function TransferStockPage() {
  const membership = await getCurrentMembership();
  if (!membership) return <div>No active membership</div>;

  const tenantId = membership.tenantId;

  const products = await Product.find({ tenantId, deletedAt: null, trackStock: true }).sort({ name: 1 });
  const branches = await Branch.find({ tenantId, active: true }).sort({ name: 1 });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Transfer Stock"
        section="Inventory"
        breadcrumbs={[
          { label: "Stock", href: "/inventory/stock" },
          { label: "Transfer" },
        ]}
        description="Move inventory between your business branches."
      />

      <div className="max-w-2xl bg-card border rounded-lg p-6">
        <form action={async (formData) => {
          "use server";
          const membership = await getCurrentMembership();
          if (!membership) return;

          const tenantId = membership.tenantId;
          const userId = membership.userId;

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
          <FormField label="Product" htmlFor="productId" required>
            <Select name="productId" required>
              <SelectTrigger id="productId">
                <SelectValue placeholder="Select product" />
              </SelectTrigger>
              <SelectContent>
                {products.map(p => (
                  <SelectItem key={p._id.toString()} value={p._id.toString()}>{p.name} ({p.sku})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="From Branch" htmlFor="fromBranchId" required>
              <Select name="fromBranchId" required>
                <SelectTrigger id="fromBranchId">
                  <SelectValue placeholder="Select branch" />
                </SelectTrigger>
                <SelectContent>
                  {branches.map(b => (
                    <SelectItem key={b._id.toString()} value={b._id.toString()}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>

            <FormField label="To Branch" htmlFor="toBranchId" required>
              <Select name="toBranchId" required>
                <SelectTrigger id="toBranchId">
                  <SelectValue placeholder="Select branch" />
                </SelectTrigger>
                <SelectContent>
                  {branches.map(b => (
                    <SelectItem key={b._id.toString()} value={b._id.toString()}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          </div>

          <FormField label="Quantity" htmlFor="quantity" required>
            <Input id="quantity" name="quantity" type="number" min="1" required placeholder="Amount to transfer" />
          </FormField>

          <div className="flex justify-between gap-2 pt-4">
            <Button variant="outline" asChild>
              <Link href="/inventory/stock">Cancel</Link>
            </Button>
            <Button type="submit">Transfer Stock</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
