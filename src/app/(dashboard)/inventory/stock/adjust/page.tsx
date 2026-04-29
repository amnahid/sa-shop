import Link from "next/link";
import { redirect } from "next/navigation";
import mongoose from "mongoose";
import { Product, StockLevel, Branch, StockMovement } from "@/models";
import { getCurrentMembership } from "@/lib/utils/membership";
import { PageHeader } from "@/components/app/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField } from "@/components/app/FormField";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PackageSearch } from "lucide-react";

export default async function AdjustStockPage() {
  const membership = await getCurrentMembership();
  if (!membership) return <div>No active membership</div>;

  const tenantId = membership.tenantId;

  const products = await Product.find({ tenantId, deletedAt: null, trackStock: true }).sort({ name: 1 });
  const branches = await Branch.find({ tenantId, active: true }).sort({ name: 1 });

  const productOptions = products.map(p => ({ value: p._id.toString(), label: `${p.name} (${p.sku})` }));
  const branchOptions = branches.map(b => ({ value: b._id.toString(), label: b.name }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Adjust Stock"
        section="Inventory"
        breadcrumbs={[
          { label: "Stock", href: "/inventory/stock" },
          { label: "Adjustments" },
        ]}
        description="Manually correct stock levels for specific products at any branch location."
      />

      <Card className="max-w-2xl">
        <CardHeader className="py-4 border-b border-gray-100">
           <CardTitle className="text-sm font-bold uppercase tracking-tight flex items-center gap-2">
              <PackageSearch className="size-4 text-primary" />
              Adjustment Details
           </CardTitle>
        </CardHeader>
        <CardContent className="pt-8">
          <form action={async (formData) => {
            "use server";
            const membership = await getCurrentMembership();
            if (!membership) return;

            const tenantId = membership.tenantId;
            const userId = membership.userId;

            const productId = formData.get("productId") as string;
            const branchId = formData.get("branchId") as string;
            const adjustment = parseInt(formData.get("adjustment") as string);
            const reason = formData.get("reason") as string;

            if (!productId || !branchId || isNaN(adjustment)) return;

            const stockLevel = await StockLevel.findOne({
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
          }} className="space-y-6">
            <FormField label="Target Product *" htmlFor="productId" required>
              <SearchableSelect
                name="productId"
                options={productOptions}
                required
                placeholder="Select product to adjust"
                searchPlaceholder="Search products..."
              />
            </FormField>

            <FormField label="Branch *" htmlFor="branchId" required>
              <SearchableSelect
                name="branchId"
                options={branchOptions}
                required
                placeholder="Select branch location"
                searchPlaceholder="Search branches..."
              />
            </FormField>

            <FormField label="Adjustment Quantity *" htmlFor="adjustment" required hint="Use positive to add (e.g. 10), negative to remove (e.g. -5)">
              <Input id="adjustment" name="adjustment" type="number" required placeholder="0" />
            </FormField>

            <FormField label="Reason for Adjustment" htmlFor="reason">
              <Select name="reason" defaultValue="count_correction">
                <SelectTrigger id="reason">
                  <SelectValue placeholder="Select reason" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="count_correction">Count correction</SelectItem>
                  <SelectItem value="damage">Damaged goods</SelectItem>
                  <SelectItem value="found">Found stock</SelectItem>
                  <SelectItem value="received">Stock received</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </FormField>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-50">
              <Button asChild variant="outline" className="font-black uppercase tracking-widest text-[11px] px-8 h-11">
                <Link href="/inventory/stock">Cancel</Link>
              </Button>
              <Button type="submit" className="font-black uppercase tracking-widest text-[11px] px-12 h-11 shadow-lg">
                Submit Adjustment
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
