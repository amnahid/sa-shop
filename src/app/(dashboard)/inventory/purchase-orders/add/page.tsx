import { redirect } from "next/navigation";
import Link from "next/link";
import { Supplier, Branch, Product } from "@/models";
import { createPurchaseOrder } from "@/lib/actions/purchase-orders";
import { getCurrentMembership } from "@/lib/utils/membership";
import { PageHeader } from "@/components/app/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField } from "@/components/app/FormField";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Plus, ListPlus } from "lucide-react";

interface Props {
  searchParams: Promise<{ supplierId?: string }>;
}

export default async function AddPurchaseOrderPage({ searchParams }: Props) {
  const { supplierId } = await searchParams;

  const membership = await getCurrentMembership();
  if (!membership) return <div>No active membership</div>;
  if (membership.role === "cashier") redirect("/");

  const suppliers = await Supplier.find({ tenantId: membership.tenantId, deletedAt: null, active: true }).sort({ name: 1 });
  const branches = await Branch.find({ tenantId: membership.tenantId, active: true }).sort({ name: 1 });
  const products = await Product.find({ tenantId: membership.tenantId, deletedAt: null, active: true, trackStock: true }).sort({ name: 1 }).limit(100);

  return (
    <div className="space-y-6">
      <PageHeader
        title="New Purchase Order"
        section="Inventory"
        breadcrumbs={[{ label: "Purchase Orders", href: "/inventory/purchase-orders" }, { label: "New PO" }]}
        description="Initiate a procurement order for inventory items from your suppliers."
      />

      <form action={async (formData) => {
        "use server";
        const result = await createPurchaseOrder(formData);
        if (result.poId) redirect(`/inventory/purchase-orders/${result.poId}`);
      }} className="space-y-8 max-w-5xl">
        
        <Card>
          <CardHeader className="py-4 border-b border-gray-100">
             <CardTitle className="text-sm font-bold uppercase tracking-tight">Order Basics</CardTitle>
          </CardHeader>
          <CardContent className="pt-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <FormField label="Supplier *" htmlFor="supplierId" required>
                <select name="supplierId" id="supplierId" defaultValue={supplierId || ""} required className="flex h-11 w-full rounded-md border border-gray-400 bg-white px-3 text-sm focus:border-primary outline-none">
                  <option value="">Select supplier</option>
                  {suppliers.map(s => (
                    <option key={s._id.toString()} value={s._id.toString()}>{s.name}</option>
                  ))}
                </select>
              </FormField>
              <FormField label="Receive at Branch *" htmlFor="branchId" required>
                <select name="branchId" id="branchId" required className="flex h-11 w-full rounded-md border border-gray-400 bg-white px-3 text-sm focus:border-primary outline-none">
                  <option value="">Select branch</option>
                  {branches.map(b => (
                    <option key={b._id.toString()} value={b._id.toString()}>{b.name}</option>
                  ))}
                </select>
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
            <div id="po-lines" className="space-y-4">
              <div className="grid grid-cols-[1fr_100px_120px_130px_36px] gap-4 px-2 text-[10px] font-black uppercase tracking-widest text-gray-400">
                <span>Product</span>
                <span className="text-right">Qty</span>
                <span className="text-right">Unit Cost</span>
                <span className="text-right">Total</span>
                <span></span>
              </div>
              
              <div id="line-template" className="hidden">
                <div className="line-row grid grid-cols-[1fr_100px_120px_130px_36px] items-center gap-4 group">
                  <select name="productId" className="line-product h-11 rounded-md border border-gray-400 bg-white px-3 text-[13px] font-bold text-gray-800 outline-none focus:border-primary">
                    <option value="">Select product</option>
                    {products.map(p => (
                      <option key={p._id.toString()} value={p._id.toString()} data-name={p.name} data-sku={p.sku} data-cost={p.costPrice ? parseFloat(p.costPrice.toString()) : 0}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                  <input type="number" name="quantityOrdered" min="1" defaultValue="1" className="line-qty h-11 rounded-md border border-gray-400 bg-white px-3 text-right text-[13px] font-bold text-gray-800 outline-none focus:border-primary" />
                  <input type="number" name="unitCost" min="0" step="0.01" defaultValue="0" className="line-cost h-11 rounded-md border border-gray-400 bg-white px-3 text-right text-[13px] font-bold text-gray-800 outline-none focus:border-primary" />
                  <span className="line-total text-right text-sm font-black text-primary">SAR 0.00</span>
                  <button type="button" className="flex h-9 w-9 items-center justify-center rounded-md bg-soft-danger text-danger hover:bg-danger hover:text-white transition-colors">×</button>
                </div>
              </div>
            </div>
            
            <input type="hidden" name="lines" id="po-lines-json" />
            
            <div className="mt-6 pt-4 border-t border-gray-50">
              <Button type="button" id="add-line-btn" variant="soft" size="sm" className="font-black uppercase tracking-widest text-[10px]">
                <Plus className="size-3.5 mr-2" />
                Add Item to PO
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3 pt-4">
          <Button asChild variant="outline" className="font-black uppercase tracking-widest text-[11px] px-8 h-11">
             <Link href="/inventory/purchase-orders">Cancel</Link>
          </Button>
          <Button type="submit" className="font-black uppercase tracking-widest text-[11px] px-12 h-11 shadow-lg">
            Create Purchase Order
          </Button>
        </div>
      </form>

      <script dangerouslySetInnerHTML={{ __html: `
        (function() {
          var lines = [];
          function renderLines() {
            document.getElementById('po-lines-json').value = JSON.stringify(lines);
          }
          function syncLine(row, idx) {
            var qty = parseInt(row.querySelector('.line-qty').value) || 0;
            var cost = parseFloat(row.querySelector('.line-cost').value) || 0;
            lines[idx].quantityOrdered = qty;
            lines[idx].unitCost = cost;
            var total = qty * cost;
            row.querySelector('.line-total').textContent = 'SAR ' + total.toFixed(2);
            renderLines();
          }
          function createLine() {
            lines.push({ productId: '', sku: '', name: '', quantityOrdered: 1, unitCost: 0 });
            var idx = lines.length - 1;
            var tmpl = document.getElementById('line-template').firstElementChild;
            var clone = tmpl.cloneNode(true);
            clone.dataset.idx = idx;
            var productSelect = clone.querySelector('.line-product');
            var qtyInput = clone.querySelector('.line-qty');
            var costInput = clone.querySelector('.line-cost');
            var removeBtn = clone.querySelector('button');
            
            productSelect.onchange = function() {
              var opt = this.selectedOptions[0];
              if (opt && opt.value) {
                lines[idx].productId = opt.value;
                lines[idx].sku = opt.dataset.sku || '';
                lines[idx].name = opt.dataset.name || '';
                lines[idx].unitCost = parseFloat(opt.dataset.cost) || 0;
                costInput.value = lines[idx].unitCost.toFixed(2);
                syncLine(clone, idx);
              }
            };
            qtyInput.oninput = function() { syncLine(clone, idx); };
            costInput.oninput = function() { syncLine(clone, idx); };
            removeBtn.onclick = function() {
              var removedIdx = parseInt(clone.dataset.idx);
              lines.splice(removedIdx, 1);
              clone.remove();
              document.querySelectorAll('.line-row').forEach(function(r, i) { r.dataset.idx = i; });
              renderLines();
            };
            document.getElementById('po-lines').appendChild(clone);
            syncLine(clone, idx);
          }
          document.getElementById('add-line-btn').onclick = createLine;
          document.querySelector('form').onsubmit = function(e) {
            if (lines.length === 0) { e.preventDefault(); alert('Add at least one line item'); }
          };
          createLine();
        })();
      ` }} />
    </div>
  );
}
