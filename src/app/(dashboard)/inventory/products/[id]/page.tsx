

import { redirect } from "next/navigation";
import mongoose from "mongoose";
import { Product, Category } from "@/models";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { getCurrentMembership } from "@/lib/utils/membership";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditProductPage({ params }: Props) {
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

  const updateProductAction = async (formData: FormData) => {
    "use server";
    const membership = await getCurrentMembership();
    if (!membership) return;

    const categoryIdStr = formData.get("categoryId") as string;
    const categoryId = categoryIdStr ? new mongoose.Types.ObjectId(categoryIdStr) : undefined;

    await Product.findOneAndUpdate(
      { _id: id, tenantId: membership.tenantId },
      {
        sku: formData.get("sku") as string,
        barcode: formData.get("barcode") as string || undefined,
        name: formData.get("name") as string,
        nameAr: formData.get("nameAr") as string || undefined,
        categoryId,
        unit: formData.get("unit") as string,
        sellingPrice: formData.get("sellingPrice") as string,
        vatRate: parseFloat(formData.get("vatRate") as string),
        trackStock: formData.get("trackStock") === "on",
        lowStockThreshold: parseInt(formData.get("lowStockThreshold") as string || "10"),
        expiryTracking: formData.get("expiryTracking") === "on",
      }
    );

    redirect("/inventory/products");
  };

  return (
    <div className="p-6 max-w-2xl">
      <Breadcrumb items={[{ label: "Products", href: "/inventory/products" }, { label: product.name }]} />
      <h1 className="text-2xl font-bold text-foreground mt-4 mb-6">Edit Product</h1>

      <form action={updateProductAction} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="sku" className="block text-sm font-medium text-foreground mb-1">SKU</label>
            <input id="sku" name="sku" type="text" defaultValue={product.sku} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
          </div>
          <div>
            <label htmlFor="barcode" className="block text-sm font-medium text-foreground mb-1">Barcode</label>
            <input id="barcode" name="barcode" type="text" defaultValue={product.barcode || ""} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
          </div>
        </div>

        <div>
          <label htmlFor="name" className="block text-sm font-medium text-foreground mb-1">Name *</label>
          <input id="name" name="name" type="text" required defaultValue={product.name} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
        </div>

        <div>
          <label htmlFor="nameAr" className="block text-sm font-medium text-foreground mb-1">الاسم (Arabic)</label>
          <input id="nameAr" name="nameAr" type="text" dir="rtl" defaultValue={product.nameAr || ""} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="categoryId" className="block text-sm font-medium text-foreground mb-1">Category</label>
            <select id="categoryId" name="categoryId" defaultValue={product.categoryId?.toString() || ""} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
              <option value="">No category</option>
              {categories.map((cat) => (
                <option key={cat._id.toString()} value={cat._id.toString()}>{cat.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="unit" className="block text-sm font-medium text-foreground mb-1">Unit</label>
            <select id="unit" name="unit" defaultValue={product.unit} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
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
            <input id="sellingPrice" name="sellingPrice" type="number" step="0.01" required defaultValue={product.sellingPrice.toString()} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
          </div>
          <div>
            <label htmlFor="vatRate" className="block text-sm font-medium text-foreground mb-1">VAT Rate</label>
            <select id="vatRate" name="vatRate" defaultValue={product.vatRate.toString()} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
              <option value="0.15">15%</option>
              <option value="0">0%</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="lowStockThreshold" className="block text-sm font-medium text-foreground mb-1">Low Stock Threshold</label>
            <input id="lowStockThreshold" name="lowStockThreshold" type="number" defaultValue={product.lowStockThreshold} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
          </div>
          <div className="flex items-center gap-4 pt-6">
            <label className="flex items-center gap-2">
              <input type="checkbox" name="trackStock" defaultChecked={product.trackStock} className="size-4" />
              <span className="text-sm">Track Stock</span>
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" name="expiryTracking" defaultChecked={product.expiryTracking} className="size-4" />
              <span className="text-sm">Expiry Tracking</span>
            </label>
          </div>
        </div>

        <div className="flex justify-between gap-2 pt-4">
          <a href="/inventory/products" className="inline-flex items-center justify-center rounded-md border border-input bg-background text-foreground h-10 px-4 py-2 text-sm font-medium">Cancel</a>
          <button type="submit" className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground h-10 px-4 py-2 text-sm font-medium">Save Changes</button>
        </div>
      </form>
    </div>
  );
}
