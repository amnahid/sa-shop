import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentMembership } from "@/lib/utils/membership";
import { Product, Category, StockLevel, Branch } from "@/models";
import {
  archiveProduct,
  bulkArchiveProducts,
  bulkDeleteProducts,
  bulkRestoreProducts,
  permanentlyDeleteProduct,
  restoreProduct,
} from "@/lib/actions/products";
import { PageHeader } from "@/components/app/PageHeader";
import { Button } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/components/app/DataTable";
import { StatusBadge } from "@/components/app/StatusBadge";
import { FormFeedback } from "@/components/app/FormFeedback";
import { ProductsBulkActions } from "@/components/app/ProductsBulkActions";

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
  archived: boolean;
}

interface ProductsPageProps {
  searchParams: Promise<{ error?: string; success?: string }>;
}

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const membership = await getCurrentMembership();
  if (!membership) return <div>No active membership</div>;
  const { error, success } = await searchParams;

  const tenantId = membership.tenantId;

  const products = await Product.find({ tenantId })
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
    archived: p.deletedAt !== null,
  }));

  const columns: DataTableColumn<ProductRow>[] = [
    {
      key: "sku",
      header: "SKU",
      render: (r) => <span className="font-mono text-xs font-bold text-gray-400">{r.sku}</span>,
    },
    {
      key: "name",
      header: "Product Name",
      render: (r) => (
        <div>
          <div className="font-bold text-gray-900">{r.name}</div>
          {r.nameAr && (
            <div className="text-xs text-muted-foreground font-medium" dir="rtl">
              {r.nameAr}
            </div>
          )}
        </div>
      ),
    },
    { 
      key: "category", 
      header: "Category", 
      render: (r) => <span className="font-medium text-gray-600">{r.category}</span> 
    },
    {
      key: "price",
      header: "Selling Price",
      align: "right",
      render: (r) => <span className="font-black text-primary">SAR {r.price.toFixed(2)}</span>,
    },
    {
      key: "stock",
      header: "Inventory",
      align: "right",
      render: (r) =>
        r.trackStock ? (
          <StatusBadge
            status={`${r.stock} in stock`}
            variant={r.stock <= r.threshold ? "danger" : "success"}
          />
        ) : (
          <span className="text-xs font-bold text-gray-300 uppercase tracking-widest">No Track</span>
        ),
    },
    {
      key: "status",
      header: "Status",
      render: (r) => (
        <StatusBadge status={r.archived ? "Archived" : "Active"} variant={r.archived ? "warning" : "success"} />
      ),
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      render: (r) => (
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="secondary" size="xs" className="font-bold uppercase text-[10px] tracking-widest px-4" asChild>
            <Link href={`/inventory/products/${r.id}`}>Edit</Link>
          </Button>
          {r.archived ? (
            <>
              <Button
                type="submit"
                formAction={async () => {
                  "use server";
                  const result = await restoreProduct(r.id);
                  if ("error" in result) {
                    redirect(`/inventory/products?error=${encodeURIComponent(result.error ?? "Operation failed")}`);
                  }
                  redirect(`/inventory/products?success=${encodeURIComponent(result.message ?? "Operation succeeded")}`);
                }}
                variant="outline"
                size="xs"
                className="font-bold uppercase text-[10px] tracking-widest px-4"
              >
                Restore
              </Button>
              <Button
                type="submit"
                formAction={async () => {
                  "use server";
                  const result = await permanentlyDeleteProduct(r.id);
                  if ("error" in result) {
                    redirect(`/inventory/products?error=${encodeURIComponent(result.error ?? "Operation failed")}`);
                  }
                  redirect(`/inventory/products?success=${encodeURIComponent(result.message ?? "Operation succeeded")}`);
                }}
                variant="destructive"
                size="xs"
                className="font-bold uppercase text-[10px] tracking-widest px-4"
              >
                Delete
              </Button>
            </>
          ) : (
            <Button
              type="submit"
              formAction={async () => {
                "use server";
                const result = await archiveProduct(r.id);
                if ("error" in result) {
                  redirect(`/inventory/products?error=${encodeURIComponent(result.error ?? "Operation failed")}`);
                }
                redirect(`/inventory/products?success=${encodeURIComponent(result.message ?? "Operation succeeded")}`);
              }}
              variant="destructive"
              size="xs"
              className="font-bold uppercase text-[10px] tracking-widest px-4"
            >
              Archive
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Inventory Products"
        section="Inventory"
        breadcrumbs={[{ label: "Products" }]}
        actions={
          <div className="flex gap-3">
            <ProductsBulkActions products={products.map(p => ({
              sku: p.sku,
              barcode: p.barcode,
              name: p.name,
              nameAr: p.nameAr,
              sellingPrice: p.sellingPrice,
              unit: p.unit,
              vatRate: p.vatRate,
              trackStock: p.trackStock,
              lowStockThreshold: p.lowStockThreshold
            }))} />
            <Button asChild variant="outline" size="sm" className="font-bold uppercase tracking-wider text-[11px]">
              <Link href="/inventory/categories">Categories</Link>
            </Button>
            <Button asChild size="sm" className="font-bold uppercase tracking-wider text-[11px] px-6">
              <Link href="/inventory/products/add">Add Product</Link>
            </Button>
          </div>
        }
      />
      <FormFeedback status="error" message={error} />
      <FormFeedback status="success" message={success} />
      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(r) => r.id}
        bulk={{
          getRowLabel: (r) => r.name,
          actions: [
            {
              key: "archive",
              label: "Archive selected",
              action: async (formData) => {
                "use server";
                const result = await bulkArchiveProducts(formData);
                if (result.error) {
                  redirect(`/inventory/products?error=${encodeURIComponent(result.error ?? "Operation failed")}`);
                }
                redirect(`/inventory/products?success=${encodeURIComponent(result.message ?? "Operation succeeded")}`);
              },
              variant: "destructive",
            },
            {
              key: "restore",
              label: "Restore selected",
              action: async (formData) => {
                "use server";
                const result = await bulkRestoreProducts(formData);
                if (result.error) {
                  redirect(`/inventory/products?error=${encodeURIComponent(result.error ?? "Operation failed")}`);
                }
                redirect(`/inventory/products?success=${encodeURIComponent(result.message ?? "Operation succeeded")}`);
              },
              variant: "secondary",
            },
            {
              key: "delete",
              label: "Delete selected",
              action: async (formData) => {
                "use server";
                const result = await bulkDeleteProducts(formData);
                if (result.error) {
                  redirect(`/inventory/products?error=${encodeURIComponent(result.error ?? "Operation failed")}`);
                }
                redirect(`/inventory/products?success=${encodeURIComponent(result.message ?? "Operation succeeded")}`);
              },
              variant: "destructive",
            },
          ],
        }}
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
