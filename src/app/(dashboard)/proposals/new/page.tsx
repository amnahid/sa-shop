import Link from "next/link";
import { redirect } from "next/navigation";
import { Branch, Customer, Product } from "@/models";
import { getCurrentMembership } from "@/lib/utils/membership";
import { createProposal } from "@/lib/actions/proposals";

export default async function NewProposalPage() {
  const membership = await getCurrentMembership();
  if (!membership) {
    return <div>No active membership</div>;
  }
  if (membership.role === "cashier") {
    redirect("/dashboard");
  }

  const branches = await Branch.find({ tenantId: membership.tenantId, active: true }).sort({ name: 1 });
  const customers = await Customer.find({
    tenantId: membership.tenantId,
    deletedAt: null,
  }).sort({ name: 1 }).limit(100);
  const products = await Product.find({
    tenantId: membership.tenantId,
    deletedAt: null,
    active: true,
  }).sort({ name: 1 }).limit(100);

  return (
    <div className="max-w-5xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">New Sales Proposal</h1>
        <Link href="/proposals" className="text-primary hover:underline">
          ← Back to Proposals
        </Link>
      </div>

      <form
        action={async (formData) => {
          "use server";
          const result = await createProposal(formData);
          if (result.proposalId) {
            redirect(`/proposals/${result.proposalId}`);
          }
          console.error(result.error);
        }}
        className="space-y-6 rounded-lg border bg-card p-6"
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm font-medium">Proposal Title</label>
            <input
              type="text"
              name="title"
              placeholder="Website redesign package"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Customer</label>
            <select
              name="customerId"
              defaultValue=""
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">Walk-in / not specified</option>
              {customers.map((customer) => (
                <option key={customer._id.toString()} value={customer._id.toString()}>
                  {customer.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Branch *</label>
            <select
              name="branchId"
              defaultValue=""
              required
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">Select branch</option>
              {branches.map((branch) => (
                <option key={branch._id.toString()} value={branch._id.toString()}>
                  {branch.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium">Valid Until</label>
            <input
              type="date"
              name="validUntil"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Notes</label>
            <textarea
              name="notes"
              rows={2}
              placeholder="Scope and payment terms..."
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div>
          <h3 className="mb-2 text-sm font-medium">Line Items</h3>
          <div id="proposal-lines" className="space-y-2">
            <div className="grid grid-cols-[1fr_100px_120px_110px_120px_36px] gap-2 rounded border bg-muted p-2 text-xs text-muted-foreground">
              <span>Product</span>
              <span className="text-right">Qty</span>
              <span className="text-right">Unit Price</span>
              <span className="text-right">VAT</span>
              <span className="text-right">Total</span>
              <span></span>
            </div>
            <div id="line-template" className="hidden">
              <div className="line-row grid grid-cols-[1fr_100px_120px_110px_120px_36px] items-center gap-2">
                <select className="line-product h-11 rounded-md border border-gray-200 bg-white bg-background px-2 text-sm">
                  <option value="">Select product</option>
                  {products.map((product) => (
                    <option
                      key={product._id.toString()}
                      value={product._id.toString()}
                      data-name={product.name}
                      data-sku={product.sku}
                      data-price={parseFloat(product.sellingPrice.toString())}
                      data-vat={product.vatRate ?? 0.15}
                    >
                      {product.name} ({product.sku})
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min="1"
                  defaultValue="1"
                  className="line-qty h-11 rounded-md border border-gray-200 bg-white bg-background px-2 text-right text-sm"
                />
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue="0"
                  className="line-price h-11 rounded-md border border-gray-200 bg-white bg-background px-2 text-right text-sm"
                />
                <select className="line-vat h-11 rounded-md border border-gray-200 bg-white bg-background px-2 text-right text-sm">
                  <option value="0.15">15%</option>
                  <option value="0">0%</option>
                </select>
                <span className="line-total text-right text-sm font-medium">SAR 0.00</span>
                <button type="button" className="h-9 rounded border border-red-300 text-red-500 hover:bg-red-50">
                  ×
                </button>
              </div>
            </div>
          </div>
          <input type="hidden" name="lines" id="proposal-lines-json" />
          <button type="button" id="add-line-btn" className="mt-3 text-sm text-primary hover:underline">
            + Add Line
          </button>
        </div>

        <div className="flex justify-end gap-3 border-t pt-4">
          <Link
            href="/proposals"
            className="flex h-10 items-center rounded-md border border-input bg-background px-4 text-sm font-medium"
          >
            Cancel
          </Link>
          <button
            type="submit"
            className="h-10 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
          >
            Create Proposal
          </button>
        </div>
      </form>

      <script
        dangerouslySetInnerHTML={{
          __html: `
            (function() {
              var lines = [];
              function toFixed2(value) {
                return Math.round((value + Number.EPSILON) * 100) / 100;
              }
              function updateHiddenInput() {
                document.getElementById("proposal-lines-json").value = JSON.stringify(lines);
              }
              function recalcRow(row, idx) {
                var qty = parseFloat(row.querySelector(".line-qty").value) || 0;
                var price = parseFloat(row.querySelector(".line-price").value) || 0;
                var vat = parseFloat(row.querySelector(".line-vat").value) || 0;
                var total = toFixed2(qty * price * (1 + vat));
                row.querySelector(".line-total").textContent = "SAR " + total.toFixed(2);
                lines[idx].quantity = qty;
                lines[idx].unitPrice = price;
                lines[idx].vatRate = vat;
                updateHiddenInput();
              }
              function createLine() {
                lines.push({ productId: "", sku: "", name: "", quantity: 1, unitPrice: 0, vatRate: 0.15 });
                var idx = lines.length - 1;
                var clone = document.getElementById("line-template").firstElementChild.cloneNode(true);
                clone.dataset.idx = idx.toString();
                var productSelect = clone.querySelector(".line-product");
                var qtyInput = clone.querySelector(".line-qty");
                var priceInput = clone.querySelector(".line-price");
                var vatSelect = clone.querySelector(".line-vat");
                var removeBtn = clone.querySelector("button");
                productSelect.onchange = function() {
                  var opt = this.selectedOptions[0];
                  lines[idx].productId = this.value;
                  lines[idx].name = opt ? (opt.dataset.name || "") : "";
                  lines[idx].sku = opt ? (opt.dataset.sku || "") : "";
                  if (opt && opt.value) {
                    priceInput.value = (parseFloat(opt.dataset.price) || 0).toFixed(2);
                    vatSelect.value = (parseFloat(opt.dataset.vat) || 0.15).toString();
                  }
                  recalcRow(clone, idx);
                };
                qtyInput.oninput = function() { recalcRow(clone, idx); };
                priceInput.oninput = function() { recalcRow(clone, idx); };
                vatSelect.onchange = function() { recalcRow(clone, idx); };
                removeBtn.onclick = function() {
                  var removedIndex = parseInt(clone.dataset.idx);
                  lines.splice(removedIndex, 1);
                  clone.remove();
                  Array.from(document.querySelectorAll(".line-row")).forEach(function(row, i) {
                    row.dataset.idx = i.toString();
                  });
                  updateHiddenInput();
                };
                document.getElementById("proposal-lines").appendChild(clone);
                recalcRow(clone, idx);
              }
              document.getElementById("add-line-btn").onclick = createLine;
              document.querySelector("form").onsubmit = function(e) {
                var actual = [];
                Array.from(document.querySelectorAll(".line-row")).forEach(function(row) {
                  var product = row.querySelector(".line-product");
                  var productId = product.value;
                  if (!productId) return;
                  var opt = product.selectedOptions[0];
                  var quantity = parseFloat(row.querySelector(".line-qty").value) || 0;
                  var unitPrice = parseFloat(row.querySelector(".line-price").value) || 0;
                  var vatRate = parseFloat(row.querySelector(".line-vat").value) || 0;
                  if (quantity <= 0) return;
                  actual.push({
                    productId: productId,
                    sku: opt ? (opt.dataset.sku || "") : "",
                    name: opt ? (opt.dataset.name || "") : "",
                    quantity: quantity,
                    unitPrice: unitPrice,
                    vatRate: vatRate
                  });
                });
                document.getElementById("proposal-lines-json").value = JSON.stringify(actual);
                if (actual.length === 0) {
                  e.preventDefault();
                  alert("Add at least one line item");
                }
              };
              createLine();
            })();
          `,
        }}
      />
    </div>
  );
}
