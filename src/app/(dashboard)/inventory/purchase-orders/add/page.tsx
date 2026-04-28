
import { redirect } from "next/navigation";
import Link from "next/link";
import { Supplier, Branch, Product } from "@/models";
import { createPurchaseOrder } from "@/lib/actions/purchase-orders";
import { getCurrentMembership } from "@/lib/utils/membership";

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
  const products = await Product.find({ tenantId: membership.tenantId, deletedAt: null, active: true, trackStock: true }).sort({ name: 1 }).limit(50);

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground">New Purchase Order</h1>
        <Link href="/inventory/purchase-orders" className="text-primary hover:underline">← Back</Link>
      </div>

      <form action={async (formData) => {
        "use server";
        const result = await createPurchaseOrder(formData);
        if (result.error) {
          console.error(result.error);
          return;
        }
        if (result.poId) redirect(`/inventory/purchase-orders/${result.poId}`);
      }} className="bg-card border rounded-lg p-6 space-y-6">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Supplier *</label>
            <select name="supplierId" defaultValue={supplierId || ""} required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
              <option value="">Select supplier</option>
              {suppliers.map(s => (
                <option key={s._id.toString()} value={s._id.toString()}>{s.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Receive at Branch *</label>
            <select name="branchId" required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
              <option value="">Select branch</option>
              {branches.map(b => (
                <option key={b._id.toString()} value={b._id.toString()}>{b.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Expected Date</label>
            <input type="date" name="expectedDate" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Notes</label>
          <textarea name="notes" rows={2} placeholder="Special instructions..." className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
        </div>

        <div>
          <h3 className="font-medium text-sm mb-2">Line Items</h3>
          <div id="po-lines" className="space-y-2">
            <div className="flex gap-2 text-xs text-muted-foreground bg-muted p-2 rounded border">
              <span className="flex-1">Product</span>
              <span className="w-20 text-right">Qty</span>
              <span className="w-28 text-right">Unit Cost</span>
              <span className="w-28 text-right">Total</span>
              <span className="w-8"></span>
            </div>
            <div id="line-template" className="hidden">
              <div className="flex gap-2 items-center">
                <select name="productId" className="flex-1 h-11 rounded-md border border-gray-200 bg-white bg-background px-2 text-sm line-product">
                  <option value="">Select product</option>
                  {products.map(p => (
                    <option key={p._id.toString()} value={p._id.toString()} data-name={p.name} data-sku={p.sku} data-cost={p.costPrice ? parseFloat(p.costPrice.toString()) : 0}>
                      {p.name} ({p.sku})
                    </option>
                  ))}
                </select>
                <input type="number" name="quantityOrdered" min="1" value="1" placeholder="Qty" className="w-20 h-11 rounded-md border border-gray-200 bg-white bg-background px-2 text-sm text-right line-qty" />
                <input type="number" name="unitCost" min="0" step="0.01" placeholder="SAR" className="w-28 h-11 rounded-md border border-gray-200 bg-white bg-background px-2 text-sm text-right line-cost" />
                <span className="w-28 text-right text-sm line-total">SAR 0.00</span>
                <button type="button" className="w-8 h-9 rounded border border-red-300 text-red-500 text-lg hover:bg-red-50">×</button>
              </div>
            </div>
          </div>
          <input type="hidden" name="lines" id="po-lines-json" />
          <button type="button" className="mt-2 text-sm text-primary hover:underline" id="add-line-btn">+ Add Line</button>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Link href="/inventory/purchase-orders" className="h-10 px-4 rounded-md border border-input bg-background text-sm font-medium flex items-center">Cancel</Link>
          <button type="submit" className="h-10 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium">Create PO</button>
        </div>
      </form>

      <script dangerouslySetInnerHTML={{ __html: `
        (function() {
          var lines = [];
          function renderLines() {
            document.getElementById('po-lines-json').value = JSON.stringify(lines);
          }
          function syncLine(el) {
            var row = el.closest('.line-row');
            var idx = parseInt(row.dataset.idx);
            var l = lines[idx];
            var total = l.quantityOrdered * l.unitCost;
            row.querySelector('.line-total').textContent = 'SAR ' + total.toFixed(2);
            renderLines();
          }
          document.getElementById('add-line-btn').onclick = function() {
            lines.push({ productId: '', sku: '', name: '', quantityOrdered: 1, unitCost: 0 });
            var idx = lines.length - 1;
            var tmpl = document.getElementById('line-template');
            var clone = tmpl.cloneNode(true);
            clone.className = 'flex gap-2 items-center line-row';
            clone.dataset.idx = idx;
            clone.querySelector('.line-product').name = 'line_product_' + idx;
            clone.querySelector('.line-qty').name = 'line_qty_' + idx;
            clone.querySelector('.line-cost').name = 'line_cost_' + idx;
            clone.querySelector('.line-product').onchange = function() {
              var opt = this.selectedOptions[0];
              if (opt && opt.value) {
                lines[idx].productId = opt.value;
                lines[idx].sku = opt.dataset.sku || '';
                lines[idx].name = opt.dataset.name || '';
                lines[idx].unitCost = parseFloat(opt.dataset.cost) || 0;
                this.closest('.line-row').querySelector('.line-cost').value = lines[idx].unitCost;
                syncLine(this);
              }
            };
            clone.querySelector('.line-qty').oninput = function() {
              lines[idx].quantityOrdered = parseInt(this.value) || 0;
              syncLine(this);
            };
            clone.querySelector('.line-cost').oninput = function() {
              lines[idx].unitCost = parseFloat(this.value) || 0;
              syncLine(this);
            };
            clone.querySelector('button').onclick = function() {
              lines.splice(idx, 1);
              clone.remove();
              document.querySelectorAll('.line-row').forEach(function(r, i) { r.dataset.idx = i; });
              renderLines();
            };
            clone.querySelector('.line-product').closest('.line-row').style.display = 'flex';
            clone.id = '';
            document.getElementById('po-lines').appendChild(clone);
          };
          document.querySelector('form').onsubmit = function(e) {
            var actual = [];
            document.querySelectorAll('.line-row').forEach(function(row, i) {
              var pid = row.querySelector('.line-product').value;
              var sku = row.querySelector('.line-product').selectedOptions[0]?.dataset.sku || '';
              var name = row.querySelector('.line-product').selectedOptions[0]?.dataset.name || '';
              var qty = parseInt(row.querySelector('.line-qty').value) || 0;
              var cost = parseFloat(row.querySelector('.line-cost').value) || 0;
              if (pid && qty > 0) actual.push({ productId: pid, sku: sku, name: name, quantityOrdered: qty, unitCost: cost });
            });
            document.getElementById('po-lines-json').value = JSON.stringify(actual);
            if (actual.length === 0) { e.preventDefault(); alert('Add at least one line item'); }
          };
        })();
      ` }} />
    </div>
  );
}
