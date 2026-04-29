"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField } from "@/components/app/FormField";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ImageUpload } from "@/components/app/ImageUpload";
import { useToast } from "@/components/ui/toast";
import { createProduct, updateProduct } from "@/lib/actions/products";

interface ProductFormProps {
  initialData?: any;
  categories: any[];
  isEdit?: boolean;
}

export function ProductForm({ initialData, categories, isEdit = false }: ProductFormProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [imageUrls, setImageUrls] = useState<string[]>(initialData?.imageUrls || []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    imageUrls.forEach(url => formData.append("imageUrls", url));

    try {
      const result = isEdit 
        ? await updateProduct(initialData.id, formData)
        : await createProduct(formData);

      if ("error" in result) {
        showToast(result.error || "An error occurred", "error");
      } else {
        showToast(isEdit ? "Product updated" : "Product created", "success");
        router.push("/inventory/products");
        router.refresh();
      }
    } catch (error) {
      showToast("Failed to save product", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-4xl">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="py-4 border-b border-gray-100">
              <CardTitle className="text-sm font-bold uppercase tracking-tight">Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField label="SKU" htmlFor="sku">
                  <Input name="sku" id="sku" defaultValue={initialData?.sku} placeholder="Auto-generated if empty" />
                </FormField>
                <FormField label="Barcode" htmlFor="barcode">
                  <Input name="barcode" id="barcode" defaultValue={initialData?.barcode} placeholder="EAN-13 / UPC" />
                </FormField>
              </div>

              <FormField label="Product Name (English) *" htmlFor="name" required>
                <Input name="name" id="name" defaultValue={initialData?.name} placeholder="Product Title" required />
              </FormField>

              <FormField label="الاسم (Arabic)" htmlFor="nameAr" className="text-right">
                <Input name="nameAr" id="nameAr" defaultValue={initialData?.nameAr} dir="rtl" placeholder="اسم المنتج" />
              </FormField>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField label="Category" htmlFor="categoryId">
                  <Select name="categoryId" defaultValue={initialData?.categoryId?.toString()}>
                    <SelectTrigger id="categoryId">
                      <SelectValue placeholder="Select Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">No Category</SelectItem>
                      {categories.map((cat) => (
                        <SelectItem key={cat._id.toString()} value={cat._id.toString()}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>
                <FormField label="Unit" htmlFor="unit">
                  <Select name="unit" defaultValue={initialData?.unit || "piece"}>
                    <SelectTrigger id="unit">
                      <SelectValue placeholder="Select Unit" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="piece">Piece</SelectItem>
                      <SelectItem value="kg">Kg</SelectItem>
                      <SelectItem value="g">Gram</SelectItem>
                      <SelectItem value="l">Liter</SelectItem>
                      <SelectItem value="ml">ML</SelectItem>
                      <SelectItem value="pack">Pack</SelectItem>
                    </SelectContent>
                  </Select>
                </FormField>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="py-4 border-b border-gray-100">
              <CardTitle className="text-sm font-bold uppercase tracking-tight">Pricing & Inventory</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField label="Selling Price (SAR) *" htmlFor="sellingPrice" required>
                  <Input name="sellingPrice" id="sellingPrice" type="number" step="0.01" defaultValue={initialData?.price || 0} required />
                </FormField>
                <FormField label="VAT Rate" htmlFor="vatRate">
                  <Select name="vatRate" defaultValue={initialData?.vatRate?.toString() || "0.15"}>
                    <SelectTrigger id="vatRate">
                      <SelectValue placeholder="Select VAT" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0.15">15% Standard</SelectItem>
                      <SelectItem value="0">0% Exempt</SelectItem>
                    </SelectContent>
                  </Select>
                </FormField>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-50">
                <FormField label="Low Stock Alert" htmlFor="lowStockThreshold">
                  <Input name="lowStockThreshold" id="lowStockThreshold" type="number" defaultValue={initialData?.threshold || 10} />
                </FormField>
                <div className="flex flex-col justify-center space-y-3">
                   <label className="inline-flex items-center gap-3 cursor-pointer">
                      <input type="checkbox" name="trackStock" defaultChecked={initialData?.trackStock ?? true} className="size-4 rounded border-gray-300 text-primary focus:ring-primary" />
                      <span className="text-[11px] font-black uppercase tracking-widest text-gray-700">Track Inventory</span>
                   </label>
                   <label className="inline-flex items-center gap-3 cursor-pointer">
                      <input type="checkbox" name="expiryTracking" defaultChecked={initialData?.expiryTracking ?? false} className="size-4 rounded border-gray-300 text-primary focus:ring-primary" />
                      <span className="text-[11px] font-black uppercase tracking-widest text-gray-700">Expiry Tracking</span>
                   </label>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader className="py-4 border-b border-gray-100">
              <CardTitle className="text-sm font-bold uppercase tracking-tight">Product Gallery</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <ImageUpload 
                value={imageUrls} 
                onChange={setImageUrls}
                maxImages={6}
              />
            </CardContent>
          </Card>

          <div className="flex flex-col gap-3">
             <Button type="submit" disabled={loading} className="w-full font-black uppercase tracking-widest text-xs h-12 shadow-lg">
                {loading ? (isEdit ? "Updating..." : "Creating...") : (isEdit ? "Update Product" : "Create Product")}
             </Button>
             <Button asChild variant="outline" className="w-full font-black uppercase tracking-widest text-xs h-12">
                <Link href="/inventory/products">Cancel</Link>
             </Button>
          </div>
        </div>
      </div>
    </form>
  );
}
