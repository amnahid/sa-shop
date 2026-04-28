import { auth } from "@/lib/auth";
import { getCurrentMembership } from "@/lib/utils/membership";
import { Product, StockLevel, Branch, Category } from "@/models";
import { PageHeader } from "@/components/app/PageHeader";
import { POSClient } from "@/components/pos/POSClient";

export default async function POSPage() {
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
      <div className="min-h-0 flex-1">
        <POSClient
          products={productsWithStock}
          branches={branches.map(b => ({ _id: b._id.toString(), name: b.name, isHeadOffice: b.isHeadOffice }))}
          categories={categories.map(c => ({ _id: c._id.toString(), name: c.name }))}
          userId={session.user.id}
          tenantId={tenantId.toString()}
        />
      </div>
    </div>
  );
}
