import Link from "next/link";
import { redirect } from "next/navigation";
import { Branch, Customer, Product } from "@/models";
import { getCurrentMembership } from "@/lib/utils/membership";
import { createProposal } from "@/lib/actions/proposals";
import { PageHeader } from "@/components/app/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField } from "@/components/app/FormField";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, ListPlus } from "lucide-react";

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
    <div className="space-y-6">
      <PageHeader
        title="New Sales Proposal"
        section="Sales"
        breadcrumbs={[{ label: "Sales Proposals", href: "/proposals" }, { label: "New Proposal" }]}
        description="Draft a professional sales proposal for your customer."
      />

      <form
        action={async (formData) => {
          "use server";
          const result = await createProposal(formData);
          if (result.proposalId) {
            redirect(`/proposals/${result.proposalId}`);
          }
        }}
        className="space-y-8 max-w-5xl"
      >
        <Card>
          <CardHeader className="py-4 border-b border-gray-100">
             <CardTitle className="text-sm font-bold uppercase tracking-tight">Proposal Basics</CardTitle>
          </CardHeader>
          <CardContent className="pt-8 space-y-6">
            <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
              <FormField label="Proposal Title" htmlFor="title">
                <Input type="text" name="title" id="title" placeholder="Website redesign package" />
              </FormField>
              <FormField label="Customer" htmlFor="customerId">
                <select
                  name="customerId"
                  id="customerId"
                  defaultValue=""
                  className="flex h-11 w-full rounded-md border border-gray-400 bg-white px-3 text-sm focus:border-primary outline-none"
                >
                  <option value="">Walk-in / not specified</option>
                  {customers.map((customer) => (
                    <option key={customer._id.toString()} value={customer._id.toString()}>
                      {customer.name}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="Branch *" htmlFor="branchId" required>
                <select
                  name="branchId"
                  id="branchId"
                  defaultValue=""
                  required
                  className="flex h-11 w-full rounded-md border border-gray-400 bg-white px-3 text-sm focus:border-primary outline-none"
                >
                  <option value="">Select branch</option>
                  {branches.map((branch) => (
                    <option key={branch._id.toString()} value={branch._id.toString()}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              </FormField>
            </div>

            <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
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
            <div id="proposal-lines" className="space-y-4">
              <div className="grid grid-cols-[1fr_100px_120px_110px_120px_36px] gap-4 px-2 text-[10px] font-black uppercase tracking-widest text-gray-400">
                <span>Product</span>
                <span className="text-right">Qty</span>
                <span className="text-right">Unit Price</span>
                <span className="text-right">VAT</span>
                <span className="text-right">Total</span>
                <span></span>
              </div>
              
              <div id="line-template" className="hidden">
                <div className="line-row grid grid-cols-[1fr_100px_120px_110px_120px_36px] items-center gap-4 group">
                  <select className="line-product h-11 rounded-md border border-gray-400 bg-white px-3 text-[13px] font-bold text-gray-800 outline-none focus:border-primary">
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
                        {product.name}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min="1"
                    defaultValue="1"
                    className="line-qty h-11 rounded-md border border-gray-400 bg-white px-3 text-right text-[13px] font-bold text-gray-800 outline-none focus:border-primary"
                  />
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    defaultValue="0"
                    className="line-price h-11 rounded-md border border-gray-400 bg-white px-3 text-right text-[13px] font-bold text-gray-800 outline-none focus:border-primary"
                  />
                  <select className="line-vat h-11 rounded-md border border-gray-400 bg-white px-3 text-right text-[13px] font-bold text-gray-800 outline-none focus:border-primary">
                    <option value="0.15">15%</option>
                    <option value="0">0%</option>
                  </select>
                  <span className="line-total text-right text-sm font-black text-primary">SAR 0.00</span>
                  <button type="button" className="flex h-9 w-9 items-center justify-center rounded-md bg-soft-danger text-danger hover:bg-danger hover:text-white transition-colors">
                    ×
                  </button>
                </div>
              </div>
            </div>
            
            <input type="hidden" name="lines" id="proposal-lines-json" />
            
            <div className="mt-6 pt-4 border-t border-gray-50">
              <Button type="button" id="add-line-btn" variant="soft" size="sm" className="font-black uppercase tracking-widest text-[10px]">
                <Plus className="size-3.5 mr-2" />
                Add Line Item
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3 pt-4">
          <Button asChild variant="outline" className="font-black uppercase tracking-widest text-[11px] px-8 h-11">
             <Link href="/proposals">Cancel</Link>
          </Button>
          <Button type="submit" className="font-black uppercase tracking-widest text-[11px] px-12 h-11 shadow-lg">
            Create Proposal
          </Button>
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
                  updateHiddenInput();
                };
                document.getElementById("proposal-lines").appendChild(clone);
                recalcRow(clone, idx);
              }
              document.getElementById("add-line-btn").onclick = createLine;
              document.querySelector("form").onsubmit = function(e) {
                if (lines.length === 0) {
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
