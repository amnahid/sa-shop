import Link from "next/link";
import { getCurrentMembership } from "@/lib/utils/membership";
import { Product, Category, StockLevel, Branch } from "@/models";
import { PageHeader } from "@/components/app/PageHeader";
import { Button } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/components/app/DataTable";
import { StatusBadge } from "@/components/app/StatusBadge";

interface ProductRow {
  id: string;
  sku: string;
  name: string;
  nameAr?: string;
  category: string;
  price: number;
  trackStock: boolean;
  stock: number;
  threshold: number;
}

export default async function ProductsPage() {
  const membership = await getCurrentMembership();
  if (!membership) return <div>No active membership</div>;

  const tenantId = membership.tenantId;

  const products = await Product.find({ tenantId, deletedAt: null })
    .populate("categoryId")
    .sort({ name: 1 });
  await Category.find({ tenantId, deletedAt: null, parentId: null }).sort({ name: 1 });
  const branches = await Branch.find({ tenantId, active: true });
  const stockLevels = await StockLevel.find({
    tenantId,
    branchId: { $in: branches.map((b) => b._id) },
  });

  const headOffice = branches.find((b) => b.isHeadOffice);
  const getStock = (productId: string) => {
    if (!headOffice) return 0;
    const stock = stockLevels.find(
      (s) =>
        s.productId.toString() === productId &&
        s.branchId.toString() === headOffice._id.toString()
    );
    return stock ? parseFloat(stock.quantity.toString()) : 0;
  };

  const rows: ProductRow[] = products.map((p) => ({
    id: p._id.toString(),
    sku: p.sku,
    name: p.name,
    nameAr: p.nameAr,
    category: p.categoryId ? (p.categoryId as unknown as { name: string }).name : "—",
    price: parseFloat(p.sellingPrice.toString()),
    trackStock: p.trackStock,
    stock: getStock(p._id.toString()),
    threshold: p.lowStockThreshold,
  }));

  const columns: DataTableColumn<ProductRow>[] = [
    {
      key: "sku",
      header: "SKU",
      render: (r) => <span className="font-mono">{r.sku}</span>,
    },
    {
      key: "name",
      header: "Name",
      render: (r) => (
        <div>
          <div>{r.name}</div>
          {r.nameAr && (
            <div className="text-xs text-muted-foreground" dir="rtl">
              {r.nameAr}
            </div>
          )}
        </div>
      ),
    },
    { key: "category", header: "Category", render: (r) => r.category },
    {
      key: "price",
      header: "Price",
      align: "right",
      render: (r) => `SAR ${r.price.toFixed(2)}`,
    },
    {
      key: "stock",
      header: "Stock",
      align: "right",
      render: (r) =>
        r.trackStock ? (
          <StatusBadge
            status={String(r.stock)}
            variant={r.stock <= r.threshold ? "danger" : "success"}
          />
        ) : (
          "—"
        ),
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      render: (r) => (
        <Link
          href={`/inventory/products/${r.id}`}
          className="text-primary hover:underline"
        >
          Edit
        </Link>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Products"
        actions={
          <>
            <Button asChild variant="outline">
              <Link href="/inventory/categories">Categories</Link>
            </Button>
            <Button asChild>
              <Link href="/inventory/products/add">Add Product</Link>
            </Button>
          </>
        }
      />
      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(r) => r.id}
        empty={{
          title: "No products yet",
          action: (
            <Button asChild>
              <Link href="/inventory/products/add">Add your first product</Link>
            </Button>
          ),
        }}
      />
    </>
  );
}
