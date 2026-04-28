import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentMembership } from "@/lib/utils/membership";
import { Category } from "@/models";
import { createProduct } from "@/lib/actions/products";
import { FormFeedback } from "@/components/app/FormFeedback";

interface AddProductPageProps {
  searchParams: Promise<{ error?: string; success?: string }>;
}

export default async function AddProductPage({ searchParams }: AddProductPageProps) {
  const membership = await getCurrentMembership();
  if (!membership) {
    return <div>No active membership</div>;
  }

  const tenantId = membership.tenantId;

  const categories = await Category.find({ tenantId, deletedAt: null }).sort({ name: 1 });
  const { error, success } = await searchParams;

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-foreground mb-6">Add Product</h1>
      <FormFeedback status="error" message={error} />
      <FormFeedback status="success" message={success} />

      <form
        action={async (formData) => {
          "use server";
          const result = await createProduct(formData);
          if ("error" in result) {
            redirect(`/inventory/products/add?error=${encodeURIComponent(result.error ?? "Unable to create product")}`);
          }
          redirect("/inventory/products?success=Product%20created%20successfully");
        }}
        className="space-y-4"
      >
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="sku" className="block text-sm font-medium text-foreground mb-1">SKU</label>
            <input id="sku" name="sku" type="text" placeholder="Auto-generated" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
          </div>
          <div>
            <label htmlFor="barcode" className="block text-sm font-medium text-foreground mb-1">Barcode</label>
            <input id="barcode" name="barcode" type="text" placeholder="Optional" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
          </div>
        </div>

        <div>
          <label htmlFor="name" className="block text-sm font-medium text-foreground mb-1">Name *</label>
          <input id="name" name="name" type="text" required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
        </div>

        <div>
          <label htmlFor="nameAr" className="block text-sm font-medium text-foreground mb-1">الاسم (Arabic)</label>
          <input id="nameAr" name="nameAr" type="text" dir="rtl" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="categoryId" className="block text-sm font-medium text-foreground mb-1">Category</label>
            <select id="categoryId" name="categoryId" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
              <option value="">No category</option>
              {categories.map((cat) => (
                <option key={cat._id.toString()} value={cat._id.toString()}>{cat.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="unit" className="block text-sm font-medium text-foreground mb-1">Unit</label>
            <select id="unit" name="unit" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
              <option value="piece">Piece</option>
              <option value="kg">Kg</option>
              <option value="g">Gram</option>
              <option value="l">Liter</option>
              <option value="ml">ML</option>
              <option value="pack">Pack</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="sellingPrice" className="block text-sm font-medium text-foreground mb-1">Selling Price (SAR) *</label>
            <input id="sellingPrice" name="sellingPrice" type="number" step="0.01" required defaultValue="0" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
          </div>
          <div>
            <label htmlFor="vatRate" className="block text-sm font-medium text-foreground mb-1">VAT Rate</label>
            <select id="vatRate" name="vatRate" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
              <option value="0.15">15%</option>
              <option value="0">0%</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="lowStockThreshold" className="block text-sm font-medium text-foreground mb-1">Low Stock Threshold</label>
            <input id="lowStockThreshold" name="lowStockThreshold" type="number" defaultValue="10" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
          </div>
          <div className="flex items-center gap-4 pt-6">
            <label className="flex items-center gap-2">
              <input type="checkbox" name="trackStock" defaultChecked className="size-4" />
              <span className="text-sm">Track Stock</span>
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" name="expiryTracking" className="size-4" />
              <span className="text-sm">Expiry Tracking</span>
            </label>
          </div>
        </div>

        <div className="flex justify-between gap-2 pt-4">
          <Link href="/inventory/products" className="inline-flex items-center justify-center rounded-md border border-input bg-background text-foreground h-10 px-4 py-2 text-sm font-medium">Cancel</Link>
          <button type="submit" className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground h-10 px-4 py-2 text-sm font-medium">Add Product</button>
        </div>
      </form>
    </div>
  );
}
