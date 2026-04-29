import { redirect } from "next/navigation";
import { Product, Category } from "@/models";
import { getCurrentMembership } from "@/lib/utils/membership";
import {
  archiveProduct,
  permanentlyDeleteProduct,
  restoreProduct,
} from "@/lib/actions/products";
import { PageHeader } from "@/components/app/PageHeader";
import { Button } from "@/components/ui/button";
import { ProductForm } from "@/components/inventory/ProductForm";
import { RotateCcw, Trash2, Archive } from "lucide-react";

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; success?: string }>;
}

export default async function EditProductPage({ params, searchParams }: Props) {
  const { id } = await params;
  
  const membership = await getCurrentMembership();
  if (!membership) {
    return <div>No active membership</div>;
  }

  const tenantId = membership.tenantId;

  const product = await Product.findOne({ _id: id, tenantId });
  if (!product) {
    return <div>Product not found</div>;
  }

  const categories = await Category.find({ tenantId, deletedAt: null }).sort({ name: 1 });
  const { error, success } = await searchParams;
  const isArchived = product.deletedAt !== null;

  return (
    <div className="space-y-6">
      <PageHeader
        title={product.name}
        section="Inventory"
        breadcrumbs={[
          { label: "Products", href: "/inventory/products" },
          { label: product.name },
        ]}
        actions={
          <div className="flex gap-2">
            {isArchived ? (
              <>
                <form
                  action={async () => {
                    "use server";
                    await restoreProduct(id);
                    redirect(`/inventory/products/${id}?success=Restored`);
                  }}
                >
                  <Button type="submit" variant="outline" size="sm" className="font-bold uppercase tracking-widest text-[10px]">
                    <RotateCcw className="size-3.5 mr-2" />
                    Restore
                  </Button>
                </form>
                <form
                  action={async () => {
                    "use server";
                    await permanentlyDeleteProduct(id);
                    redirect("/inventory/products?success=Deleted");
                  }}
                >
                  <Button type="submit" variant="destructive" size="sm" className="font-bold uppercase tracking-widest text-[10px]">
                    <Trash2 className="size-3.5 mr-2" />
                    Delete
                  </Button>
                </form>
              </>
            ) : (
              <form
                action={async () => {
                  "use server";
                  await archiveProduct(id);
                  redirect(`/inventory/products/${id}?success=Archived`);
                }}
              >
                <Button type="submit" variant="soft-danger" size="sm" className="font-bold uppercase tracking-widest text-[10px]">
                  <Archive className="size-3.5 mr-2" />
                  Archive
                </Button>
              </form>
            )}
          </div>
        }
      />

      {error ? (
        <div className="rounded-md border border-danger/20 bg-soft-danger px-4 py-3 text-sm text-danger font-bold uppercase tracking-tight">
          {error}
        </div>
      ) : null}
      {success ? (
        <div className="rounded-md border border-success/20 bg-soft-success px-4 py-3 text-sm text-success font-bold uppercase tracking-tight">
          {success}
        </div>
      ) : null}

      <ProductForm 
        categories={categories} 
        isEdit 
        initialData={{
          id: product._id.toString(),
          sku: product.sku,
          barcode: product.barcode,
          name: product.name,
          nameAr: product.nameAr,
          categoryId: product.categoryId,
          unit: product.unit,
          price: parseFloat(product.sellingPrice.toString()),
          vatRate: product.vatRate,
          trackStock: product.trackStock,
          threshold: product.lowStockThreshold,
          expiryTracking: product.expiryTracking,
          imageUrls: product.imageUrls,
        }} 
      />
    </div>
  );
}
