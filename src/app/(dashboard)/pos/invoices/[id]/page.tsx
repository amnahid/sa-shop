
import { redirect } from "next/navigation";
import Link from "next/link";
import { voidInvoice, refundInvoice } from "@/lib/actions/invoices";
import { Invoice, Branch, Tenant } from "@/models";
import { getCurrentMembership } from "@/lib/utils/membership";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function InvoiceDetailPage({ params }: Props) {
  const { id } = await params;

  const membership = await getCurrentMembership();
  if (!membership) {
    return <div>No active membership</div>;
  }

  const invoice = await Invoice.findOne({
    _id: id,
    tenantId: membership.tenantId,
  });

  if (!invoice) {
    return <div>Invoice not found</div>;
  }

  const branch = await Branch.findById(invoice.branchId);
  const tenant = await Tenant.findById(invoice.tenantId);

  const grandTotal = parseFloat(invoice.grandTotal.toString());
  const subtotal = parseFloat(invoice.subtotal.toString());
  const vatTotal = parseFloat(invoice.vatTotal.toString());
  const discountTotal = parseFloat(invoice.discountTotal.toString());

  const canVoid = invoice.status === "completed" && !invoice.voidedAt;
  const canRefund = invoice.status === "completed";

  const statusColors: Record<string, string> = {
    completed: "bg-green-100 text-green-800",
    voided: "bg-gray-100 text-gray-800",
    refunded: "bg-blue-100 text-blue-800",
    draft: "bg-yellow-100 text-yellow-800",
  };

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{invoice.invoiceNumber}</h1>
          <p className="text-muted-foreground">
            {invoice.issuedAt.toLocaleDateString("en-SA", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>
        <Link href="/pos/invoices" className="text-primary hover:underline">
          ← Back to Invoices
        </Link>
      </div>

      <div className="grid gap-6">
        <div className="bg-card border rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Invoice Details</h2>
            <span className={`text-sm px-3 py-1 rounded ${statusColors[invoice.status] || ""}`}>
              {invoice.status}
            </span>
          </div>

          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-muted-foreground">Branch</dt>
              <dd className="font-medium">{branch?.name || "-"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Type</dt>
              <dd className="font-medium capitalize">{invoice.invoiceType}</dd>
            </div>
            {invoice.customerName && (
              <div>
                <dt className="text-muted-foreground">Customer</dt>
                <dd className="font-medium">{invoice.customerName}</dd>
              </div>
            )}
            {invoice.customerVatNumber && (
              <div>
                <dt className="text-muted-foreground">Customer VAT #</dt>
                <dd className="font-medium">{invoice.customerVatNumber}</dd>
              </div>
            )}
            {tenant?.vatNumber && (
              <div>
                <dt className="text-muted-foreground">Seller VAT #</dt>
                <dd className="font-medium">{tenant.vatNumber}</dd>
              </div>
            )}
            {invoice.uuid && (
              <div>
                <dt className="text-muted-foreground">UUID</dt>
                <dd className="font-medium text-xs break-all">{invoice.uuid}</dd>
              </div>
            )}
          </dl>
        </div>

        <div className="bg-card border rounded-lg overflow-hidden">
          <div className="p-4 border-b">
            <h2 className="font-semibold">Line Items</h2>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="text-left p-3 font-medium">Product</th>
                <th className="text-right p-3 font-medium">Unit Price</th>
                <th className="text-center p-3 font-medium">Qty</th>
                <th className="text-right p-3 font-medium">Net</th>
                <th className="text-right p-3 font-medium">VAT</th>
                <th className="text-right p-3 font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {invoice.lines.map((line, i) => {
                const total = parseFloat(line.totalAmount.toString());
                return (
                  <tr key={i} className="border-t">
                    <td className="p-3">
                      <span className="font-medium">{line.name}</span>
                      <span className="block text-xs text-muted-foreground">{line.sku}</span>
                    </td>
                    <td className="p-3 text-right">SAR {parseFloat(line.unitPrice.toString()).toFixed(2)}</td>
                    <td className="p-3 text-center">{parseFloat(line.quantity.toString())}</td>
                    <td className="p-3 text-right">SAR {parseFloat(line.netAmount.toString()).toFixed(2)}</td>
                    <td className="p-3 text-right">SAR {parseFloat(line.vatAmount.toString()).toFixed(2)}</td>
                    <td className={`p-3 text-right font-medium ${total < 0 ? "text-red-500" : ""}`}>
                      SAR {total.toFixed(2)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className="p-4 border-t space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>SAR {subtotal.toFixed(2)}</span>
            </div>
            {discountTotal !== 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Discount</span>
                <span className={discountTotal < 0 ? "text-green-600" : ""}>
                  SAR {discountTotal.toFixed(2)}
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">VAT (15%)</span>
              <span>SAR {vatTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-base font-bold border-t pt-2">
              <span>Grand Total</span>
              <span className={grandTotal < 0 ? "text-red-500" : ""}>
                SAR {grandTotal.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {invoice.payments.length > 0 && (
          <div className="bg-card border rounded-lg p-4">
            <h2 className="font-semibold mb-3">Payments</h2>
            <div className="space-y-2 text-sm">
              {invoice.payments.map((p, i) => (
                <div key={i} className="flex justify-between">
                  <span className="text-muted-foreground capitalize">{p.method.replace("_", " ")}</span>
                  <span>SAR {parseFloat(p.amount.toString()).toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {(canVoid || canRefund) && (
          <div className="bg-card border rounded-lg p-4 flex justify-end gap-3">
            {canVoid && (
              <VoidButton invoiceId={invoice._id.toString()} />
            )}
            {canRefund && (
              <RefundButton invoiceId={invoice._id.toString()} />
            )}
          </div>
        )}

        {invoice.voidedAt && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-800">
            <p className="font-medium">This invoice was voided</p>
            <p className="text-red-600 mt-1">Voided at: {invoice.voidedAt.toLocaleString()}</p>
          </div>
        )}

        <div className="flex gap-3">
          <Link
            href={`/pos/receipt/${invoice._id}`}
            className="flex-1 text-center py-2 rounded-md border border-input bg-background text-sm font-medium hover:bg-accent"
          >
            Print Receipt
          </Link>
        </div>
      </div>
    </div>
  );
}

async function VoidButton({ invoiceId }: { invoiceId: string }) {
  async function action() {
    "use server";
    const membership = await getCurrentMembership();
    if (!membership) return;
    await voidInvoice(invoiceId, membership.userId.toString());
    redirect("/pos/invoices");
  }
  return (
    <form action={action}>
      <button
        type="submit"
        className="px-4 py-2 rounded-md border border-red-300 text-red-600 text-sm font-medium hover:bg-red-50"
      >
        Void Invoice
      </button>
    </form>
  );
}

async function RefundButton({ invoiceId }: { invoiceId: string }) {
  async function action() {
    "use server";
    const membership = await getCurrentMembership();
    if (!membership) return;
    await refundInvoice(invoiceId, membership.userId.toString());
    redirect("/pos/invoices");
  }
  return (
    <form action={action}>
      <button
        type="submit"
        className="px-4 py-2 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
      >
        Refund Invoice
      </button>
    </form>
  );
}
