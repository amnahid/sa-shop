import { redirect } from "next/navigation";
import { Branch, Customer, Product } from "@/models";
import { getCurrentMembership } from "@/lib/utils/membership";
import { PageHeader } from "@/components/app/PageHeader";
import { ProposalFormClient } from "./ProposalFormClient";

export default async function NewProposalPage() {
  const membership = await getCurrentMembership();
  if (!membership) {
    return <div>No active membership</div>;
  }
  if (membership.role === "cashier") {
    redirect("/dashboard");
  }

  const branches = await Branch.find({ tenantId: membership.tenantId, active: true }).sort({ name: 1 });
  const customers = await Customer.find({
    tenantId: membership.tenantId,
    deletedAt: null,
  }).sort({ name: 1 }).limit(200);
  const products = await Product.find({
    tenantId: membership.tenantId,
    deletedAt: null,
    active: true,
  }).sort({ name: 1 }).limit(200);

  const customerOptions = customers.map(c => ({ value: c._id.toString(), label: c.name }));
  const branchOptions = branches.map(b => ({ value: b._id.toString(), label: b.name }));
  const productData = products.map(p => ({
    _id: p._id.toString(),
    name: p.name,
    sku: p.sku,
    sellingPrice: p.sellingPrice ? parseFloat(p.sellingPrice.toString()) : 0,
    vatRate: p.vatRate ?? 0.15
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="New Sales Proposal"
        section="Sales"
        breadcrumbs={[{ label: "Sales Proposals", href: "/proposals" }, { label: "New Proposal" }]}
        description="Draft a professional sales proposal for your customer."
      />

      <ProposalFormClient 
        customers={customerOptions}
        branches={branchOptions}
        products={productData}
      />
    </div>
  );
}
