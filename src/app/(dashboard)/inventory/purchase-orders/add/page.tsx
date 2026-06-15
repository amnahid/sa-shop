import { redirect } from "next/navigation";
import { Supplier, Branch, Product } from "@/models";
import { getCurrentMembership } from "@/lib/utils/membership";
import { PageHeader } from "@/components/app/PageHeader";
import { PurchaseOrderFormClient } from "./PurchaseOrderFormClient";

interface Props {
  searchParams: Promise<{ supplierId?: string }>;
}

export default async function AddPurchaseOrderPage({ searchParams }: Props) {
  const { supplierId } = await searchParams;

  const membership = await getCurrentMembership();
  if (!membership) return <div>No active membership</div>;
  if (membership.role === "cashier") redirect("/");

  const suppliers = await Supplier.find({ tenantId: membership.tenantId, deletedAt: null, active: true }).sort({ name: 1 });
  const branches = await Branch.find({ tenantId: membership.tenantId, active: true }).sort({ name: 1 });
  const products = await Product.find({ tenantId: membership.tenantId, deletedAt: null, active: true, trackStock: true }).sort({ name: 1 }).limit(200);

  const supplierOptions = suppliers.map(s => ({ value: s._id.toString(), label: s.name }));
  const branchOptions = branches.map(b => ({ value: b._id.toString(), label: b.name }));
  const productData = products.map(p => ({
    _id: p._id.toString(),
    name: p.name,
    sku: p.sku,
    costPrice: p.costPrice ? parseFloat(p.costPrice.toString()) : 0
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="New Purchase Order"
        section="Inventory"
        breadcrumbs={[{ label: "Purchase Orders", href: "/inventory/purchase-orders" }, { label: "New PO" }]}
        description="Initiate a procurement order for inventory items from your suppliers."
      />

      <PurchaseOrderFormClient 
        supplierId={supplierId}
        suppliers={supplierOptions}
        branches={branchOptions}
        products={productData}
      />
    </div>
  );
}
