
import { Invoice, Branch, Tenant } from "@/models";
import { getCurrentMembership } from "@/lib/utils/membership";
import { ReceiptActions } from "@/components/pos/ReceiptActions";

interface Props {
  params: Promise<{ invoiceId: string }>;
}

export default async function ReceiptPage({ params }: Props) {
  const { invoiceId } = await params;

  const membership = await getCurrentMembership();
  if (!membership) {
    return <div>No active membership</div>;
  }

  const invoice = await Invoice.findOne({
    _id: invoiceId,
    tenantId: membership.tenantId,
  });

  if (!invoice) {
    return <div>Invoice not found</div>;
  }

  const branch = await Branch.findById(invoice.branchId);
  const tenant = await Tenant.findById(invoice.tenantId);

  const subtotal = parseFloat(invoice.subtotal.toString());
  const discountTotal = parseFloat(invoice.discountTotal.toString());
  const vatTotal = parseFloat(invoice.vatTotal.toString());
  const grandTotal = parseFloat(invoice.grandTotal.toString());

  const paymentMethodLabels: Record<string, string> = {
    cash: "Cash",
    mada: "Mada",
    visa: "Visa",
    mastercard: "Mastercard",
    amex: "American Express",
    stc_pay: "STC Pay",
    apple_pay: "Apple Pay",
    tabby: "Tabby",
    tamara: "Tamara",
    bank_transfer: "Bank Transfer",
    store_credit: "Store Credit",
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="bg-white text-black w-full max-w-sm rounded-lg border shadow-sm overflow-hidden">
        <div className="p-6 text-center border-b">
          {tenant?.logoUrl && (
            <img src={tenant.logoUrl} alt="logo" className="h-12 mx-auto mb-3 object-contain" />
          )}
          <h1 className="text-lg font-bold">{tenant?.name || "Shop"}</h1>
          {tenant?.address && <p className="text-sm text-gray-600">{tenant.address}</p>}
          {tenant?.phone && <p className="text-sm text-gray-600">{tenant.phone}</p>}
          {tenant?.vatNumber && <p className="text-sm text-gray-600">VAT: {tenant.vatNumber}</p>}
          <div className="mt-3 border-t pt-3 text-sm text-gray-600">
            <p><span className="font-medium">Invoice:</span> {invoice.invoiceNumber}</p>
            <p><span className="font-medium">Branch:</span> {branch?.name || "-"}</p>
            <p><span className="font-medium">Date:</span> {invoice.issuedAt.toLocaleDateString("en-SA")}</p>
          </div>
        </div>

        <div className="p-4">
          {invoice.lines.length > 0 && (
            <table className="w-full text-sm mb-4">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-1 text-gray-600 font-medium">Item</th>
                  <th className="text-center py-1 text-gray-600 font-medium">Qty</th>
                  <th className="text-right py-1 text-gray-600 font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {invoice.lines.map((line, i) => (
                  <tr key={i} className="border-b">
                    <td className="py-1">
                      <span className="block font-medium">{line.name}</span>
                      <span className="text-xs text-gray-500">
                        SAR {parseFloat(line.unitPrice.toString()).toFixed(2)} × {parseFloat(line.quantity.toString())}
                      </span>
                    </td>
                    <td className="py-1 text-center">{parseFloat(line.quantity.toString())}</td>
                    <td className="py-1 text-right">
                      SAR {parseFloat(line.totalAmount.toString()).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Subtotal</span>
              <span>SAR {subtotal.toFixed(2)}</span>
            </div>
            {discountTotal > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">Discount</span>
                <span>-SAR {discountTotal.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-600">VAT (15%)</span>
              <span>SAR {vatTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-base font-bold border-t pt-2 mt-1">
              <span>TOTAL</span>
              <span>SAR {grandTotal.toFixed(2)}</span>
            </div>
          </div>

          {invoice.payments.length > 0 && (
            <div className="mt-4 pt-3 border-t text-sm">
              {invoice.payments.map((p, i) => {
                const amt = parseFloat(p.amount.toString());
                return (
                  <div key={i} className="flex justify-between">
                    <span className="text-gray-600">Paid by {paymentMethodLabels[p.method] || p.method}</span>
                    <span>SAR {amt.toFixed(2)}</span>
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-4 pt-3 border-t text-center text-xs text-gray-500">
            {tenant?.vatRegistered && (
              <p>VAT has been collected per ZATCA regulations</p>
            )}
            <p className="mt-1">Thank you for your purchase!</p>
          </div>

          {invoice.qrCode && (
            <div className="mt-4 flex justify-center">
              <img src={invoice.qrCode} alt="QR" className="w-24 h-24" />
            </div>
          )}
        </div>

        <ReceiptActions />
      </div>
    </div>
  );
}
