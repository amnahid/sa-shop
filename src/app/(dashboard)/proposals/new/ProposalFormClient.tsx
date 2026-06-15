"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createProposal } from "@/lib/actions/proposals";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField } from "@/components/app/FormField";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Plus, ListPlus, Trash2, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/toast";

interface Option {
  value: string;
  label: string;
}

interface ProductData {
  _id: string;
  name: string;
  sku: string;
  sellingPrice: number;
  vatRate: number;
}

interface Props {
  customers: Option[];
  branches: Option[];
  products: ProductData[];
}

interface LineItem {
  productId: string;
  sku: string;
  name: string;
  quantity: number;
  unitPrice: number;
  vatRate: number;
}

export function ProposalFormClient({ customers, branches, products }: Props) {
  const router = useRouter();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [lines, setLines] = useState<LineItem[]>([
    { productId: "", sku: "", name: "", quantity: 1, unitPrice: 0, vatRate: 0.15 },
  ]);

  const addLine = () => {
    setLines([...lines, { productId: "", sku: "", name: "", quantity: 1, unitPrice: 0, vatRate: 0.15 }]);
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
        line.unitPrice = product.sellingPrice || 0;
        line.vatRate = product.vatRate ?? 0.15;
      }
    } else if (field === "quantity") {
      line.quantity = parseFloat(value as string) || 0;
    } else if (field === "unitPrice") {
      line.unitPrice = parseFloat(value as string) || 0;
    } else if (field === "vatRate") {
      line.vatRate = parseFloat(value as string) || 0;
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
      const result = await createProposal(formData);
      if (result.error) {
        showToast(result.error, "error");
      } else if (result.proposalId) {
        showToast("Proposal created successfully", "success");
        router.push(`/proposals/${result.proposalId}`);
      }
    } catch {
      showToast("Failed to create Proposal", "error");
    } finally {
      setLoading(false);
    }
  };

  const productOptions = products.map(p => ({ value: p._id, label: `${p.name} (${p.sku})` }));

  return (
    <form action={handleSubmit} className="space-y-8 max-w-5xl">
      <Card>
        <CardHeader className="py-4 border-b border-gray-100">
          <CardTitle className="text-sm font-bold uppercase tracking-tight">Proposal Basics</CardTitle>
        </CardHeader>
        <CardContent className="pt-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <FormField label="Proposal Title" htmlFor="title">
              <Input type="text" name="title" id="title" placeholder="Website redesign package" />
            </FormField>
            <FormField label="Customer" htmlFor="customerId">
              <SearchableSelect
                name="customerId"
                options={customers}
                placeholder="Select customer"
                searchPlaceholder="Search customers..."
              />
            </FormField>
            <FormField label="Branch *" htmlFor="branchId" required>
              <SearchableSelect
                name="branchId"
                options={branches}
                required
                placeholder="Select branch"
                searchPlaceholder="Search branches..."
              />
            </FormField>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <FormField label="Valid Until" htmlFor="validUntil">
              <Input type="date" name="validUntil" id="validUntil" />
            </FormField>
            <FormField label="Notes" htmlFor="notes">
              <Textarea name="notes" id="notes" placeholder="Scope and payment terms..." />
            </FormField>
          </div>
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
            <div className="grid grid-cols-[1.5fr_100px_120px_110px_120px_36px] gap-4 px-2 text-[10px] font-black uppercase tracking-widest text-gray-400">
              <span>Product</span>
              <span className="text-end">Qty</span>
              <span className="text-end">Unit Price</span>
              <span className="text-end">VAT</span>
              <span className="text-end">Total</span>
              <span></span>
            </div>

            {lines.map((line, idx) => (
              <div key={idx} className="grid grid-cols-[1.5fr_100px_120px_110px_120px_36px] items-center gap-4 group">
                <div className="min-w-0">
                  <SearchableSelect
                    options={productOptions}
                    value={line.productId}
                    onChange={(val) => updateLine(idx, "productId", val)}
                    placeholder="Select product"
                    searchPlaceholder="Search products..."
                  />
                </div>
                <Input
                  type="number"
                  min="1"
                  step="any"
                  value={line.quantity}
                  onChange={(e) => updateLine(idx, "quantity", e.target.value)}
                  className="h-11 text-end font-bold"
                />
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={line.unitPrice}
                  onChange={(e) => updateLine(idx, "unitPrice", e.target.value)}
                  className="h-11 text-end font-bold"
                />
                <select
                  value={line.vatRate}
                  onChange={(e) => updateLine(idx, "vatRate", e.target.value)}
                  className="h-11 rounded-md border border-gray-400 bg-white px-3 text-[13px] font-bold text-gray-800 outline-none focus:border-primary"
                >
                  <option value="0.15">15%</option>
                  <option value="0.05">5%</option>
                  <option value="0">0%</option>
                </select>
                <span className="text-end text-sm font-black text-primary">
                  SAR {(line.quantity * line.unitPrice * (1 + line.vatRate)).toFixed(2)}
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
              Add Line Item
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3 pt-4">
        <Button asChild variant="outline" className="font-black uppercase tracking-widest text-[11px] px-8 h-11">
          <Link href="/proposals">Cancel</Link>
        </Button>
        <Button type="submit" disabled={loading} className="font-black uppercase tracking-widest text-[11px] px-12 h-11 shadow-lg">
          {loading ? (
            <>
              <Loader2 className="size-4 me-2 animate-spin" />
              Processing...
            </>
          ) : (
            "Create Proposal"
          )}
        </Button>
      </div>
    </form>
  );
}
