import { auth } from "@/lib/auth";
import { getCurrentMembership } from "@/lib/utils/membership";
import { Product, StockLevel, Branch, Category, Customer, Proposal, Retainer } from "@/models";
import { PageHeader } from "@/components/app/PageHeader";
import { POSClient } from "@/components/pos/POSClient";
import Link from "next/link";

interface Props {
  searchParams: Promise<{ proposalId?: string; retainerId?: string }>;
}

export default async function POSPage({ searchParams }: Props) {
  const { proposalId, retainerId } = await searchParams;
  const session = await auth();
  const membership = await getCurrentMembership();
  if (!membership || !session?.user?.id) {
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
  const sourceProposal = proposalId
    ? await Proposal.findOne({ _id: proposalId, tenantId }).select("proposalNumber status customerName grandTotal")
    : null;
  const sourceRetainer = retainerId
    ? await Retainer.findOne({ _id: retainerId, tenantId, status: "active" }).select(
        "retainerNumber customerId totalAmount consumedAmount"
      )
    : null;
  const retainerCustomer = sourceRetainer?.customerId
    ? await Customer.findOne({ _id: sourceRetainer.customerId, tenantId }).select(
        "_id name nameAr phone email vatNumber"
      )
    : null;
  const retainerRemaining = sourceRetainer
    ? Math.max(
        0,
        parseFloat(sourceRetainer.totalAmount.toString()) -
          parseFloat(sourceRetainer.consumedAmount.toString())
      )
    : 0;

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
    <div className="flex h-full min-h-0 flex-col">
      <PageHeader
        title="Point of Sale"
        section="Sales"
        breadcrumbs={[{ label: "Point of Sale" }]}
        description="Create and complete sales transactions."
      />
      {sourceProposal && (
        <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
          <p className="font-medium">
            Invoice handoff from proposal {sourceProposal.proposalNumber}
          </p>
          <p>
            Customer: {sourceProposal.customerName || "Walk-in"} • Proposed total: SAR{" "}
            {parseFloat(sourceProposal.grandTotal.toString()).toFixed(2)}
          </p>
          <Link
            href={`/proposals/${sourceProposal._id.toString()}`}
            className="mt-2 inline-block text-blue-700 underline"
          >
            View proposal details
          </Link>
        </div>
      )}
      {sourceRetainer && (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          <p className="font-medium">Retainer consumption {sourceRetainer.retainerNumber}</p>
          <p>
            Customer: {retainerCustomer?.name || "Not set"} • Remaining balance: SAR{" "}
            {retainerRemaining.toFixed(2)}
          </p>
          <Link
            href={`/retainers/${sourceRetainer._id.toString()}`}
            className="mt-2 inline-block text-emerald-700 underline"
          >
            View retainer details
          </Link>
        </div>
      )}
      <div className="min-h-0 flex-1">
        <POSClient
          products={productsWithStock}
          branches={branches.map(b => ({ _id: b._id.toString(), name: b.name, isHeadOffice: b.isHeadOffice }))}
          categories={categories.map(c => ({ _id: c._id.toString(), name: c.name }))}
          userId={session.user.id}
          tenantId={tenantId.toString()}
          sourceRetainer={
            sourceRetainer
              ? {
                  _id: sourceRetainer._id.toString(),
                  retainerNumber: sourceRetainer.retainerNumber,
                  remainingAmount: retainerRemaining,
                }
              : undefined
          }
          initialCustomer={
            retainerCustomer
              ? {
                  _id: retainerCustomer._id.toString(),
                  name: retainerCustomer.name,
                  nameAr: retainerCustomer.nameAr,
                  phone: retainerCustomer.phone,
                  email: retainerCustomer.email,
                  vatNumber: retainerCustomer.vatNumber,
                }
              : null
          }
        />
      </div>
    </div>
  );
}
