"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createPurchaseOrder } from "@/lib/actions/purchase-orders";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField } from "@/components/app/FormField";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Plus, ListPlus, Trash2, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/toast";

interface SupplierOption {
  value: string;
  label: string;
}

interface BranchOption {
  value: string;
  label: string;
}

interface ProductData {
  _id: string;
  name: string;
  sku: string;
  costPrice: number;
}

interface Props {
  supplierId?: string;
  suppliers: SupplierOption[];
  branches: BranchOption[];
  products: ProductData[];
}

interface LineItem {
  productId: string;
  sku: string;
  name: string;
  quantityOrdered: number;
  unitCost: number;
}

export function PurchaseOrderFormClient({ supplierId, suppliers, branches, products }: Props) {
  const router = useRouter();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [lines, setLines] = useState<LineItem[]>([
    { productId: "", sku: "", name: "", quantityOrdered: 1, unitCost: 0 },
  ]);

  const addLine = () => {
    setLines([...lines, { productId: "", sku: "", name: "", quantityOrdered: 1, unitCost: 0 }]);
  };

  const removeLine = (index: number) => {
    if (lines.length === 1) {
      showToast("At least one line item is required", "error");
      return;
    }
    setLines(lines.filter((_, i) => i !== index));
  };

  const updateLine = (index: number, field: keyof LineItem, value: string | number) => {
    const newLines = [...lines];
    const line = { ...newLines[index] };

    if (field === "productId") {
      const product = products.find((p) => p._id === value);
      if (product) {
        line.productId = product._id;
        line.sku = product.sku;
        line.name = product.name;
        line.unitCost = product.costPrice || 0;
      }
    } else if (field === "quantityOrdered") {
      line.quantityOrdered = parseInt(value as string) || 0;
    } else if (field === "unitCost") {
      line.unitCost = parseFloat(value as string) || 0;
    }

    newLines[index] = line;
    setLines(newLines);
  };

  const handleSubmit = async (formData: FormData) => {
    if (lines.some((l) => !l.productId)) {
      showToast("Please select a product for all lines", "error");
      return;
    }

    setLoading(true);
    formData.set("lines", JSON.stringify(lines));

    try {
      const result = await createPurchaseOrder(formData);
      if (result.error) {
        showToast(result.error, "error");
      } else if (result.poId) {
        showToast("Purchase Order created successfully", "success");
        router.push(`/inventory/purchase-orders/${result.poId}`);
      }
    } catch {
      showToast("Failed to create Purchase Order", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form action={handleSubmit} className="space-y-8 max-w-5xl">
      <Card>
        <CardHeader className="py-4 border-b border-gray-100">
          <CardTitle className="text-sm font-bold uppercase tracking-tight">Order Basics</CardTitle>
        </CardHeader>
        <CardContent className="pt-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <FormField label="Supplier *" htmlFor="supplierId" required>
              <SearchableSelect
                name="supplierId"
                defaultValue={supplierId}
                options={suppliers}
                required
                placeholder="Select supplier"
                searchPlaceholder="Search suppliers..."
              />
            </FormField>
            <FormField label="Receive at Branch *" htmlFor="branchId" required>
              <SearchableSelect
                name="branchId"
                options={branches}
                required
                placeholder="Select branch"
                searchPlaceholder="Search branches..."
              />
            </FormField>
            <FormField label="Expected Date" htmlFor="expectedDate">
              <Input type="date" name="expectedDate" id="expectedDate" />
            </FormField>
          </div>

          <FormField label="Internal Notes" htmlFor="notes">
            <Textarea name="notes" id="notes" rows={2} placeholder="Special instructions for receiving..." />
          </FormField>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="py-4 border-b border-gray-100">
          <CardTitle className="text-sm font-bold uppercase tracking-tight flex items-center gap-2">
            <ListPlus className="size-4 text-primary" />
            Line Items
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="grid grid-cols-[1fr_100px_120px_130px_36px] gap-4 px-2 text-[10px] font-black uppercase tracking-widest text-gray-400">
              <span>Product</span>
              <span className="text-end">Qty</span>
              <span className="text-end">Unit Cost</span>
              <span className="text-end">Total</span>
              <span></span>
            </div>

            {lines.map((line, idx) => (
              <div key={idx} className="grid grid-cols-[1fr_100px_120px_130px_36px] items-center gap-4 group">
                <select
                  name="productId"
                  value={line.productId}
                  onChange={(e) => updateLine(idx, "productId", e.target.value)}
                  className="h-11 rounded-md border border-gray-400 bg-white px-3 text-[13px] font-bold text-gray-800 outline-none focus:border-primary"
                >
                  <option value="">Select product</option>
                  {products.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                <Input
                  type="number"
                  min="1"
                  value={line.quantityOrdered}
                  onChange={(e) => updateLine(idx, "quantityOrdered", e.target.value)}
                  className="h-11 text-end font-bold"
                />
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={line.unitCost}
                  onChange={(e) => updateLine(idx, "unitCost", e.target.value)}
                  className="h-11 text-end font-bold"
                />
                <span className="text-end text-sm font-black text-primary">
                  SAR {(line.quantityOrdered * line.unitCost).toFixed(2)}
                </span>
                <button
                  type="button"
                  onClick={() => removeLine(idx)}
                  className="flex h-9 w-9 items-center justify-center rounded-md bg-soft-danger text-danger hover:bg-danger hover:text-white transition-colors"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-4 border-t border-gray-50">
            <Button
              type="button"
              variant="soft"
              size="sm"
              onClick={addLine}
              className="font-black uppercase tracking-widest text-[10px]"
            >
              <Plus className="size-3.5 me-2" />
              Add Item to PO
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3 pt-4">
        <Button asChild variant="outline" className="font-black uppercase tracking-widest text-[11px] px-8 h-11">
          <Link href="/inventory/purchase-orders">Cancel</Link>
        </Button>
        <Button type="submit" disabled={loading} className="font-black uppercase tracking-widest text-[11px] px-12 h-11 shadow-lg">
          {loading ? (
            <>
              <Loader2 className="size-4 me-2 animate-spin" />
              Processing...
            </>
          ) : (
            "Create Purchase Order"
          )}
        </Button>
      </div>
    </form>
  );
}
