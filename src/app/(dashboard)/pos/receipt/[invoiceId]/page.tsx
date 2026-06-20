
import { Invoice, Branch, Tenant, Customer } from "@/models";
import { getCurrentMembership } from "@/lib/utils/membership";
import { ReceiptActions } from "@/components/pos/ReceiptActions";
import { PrintPage } from "@/components/printing/PrintPage";
import { A4Invoice } from "@/components/printing/A4Invoice";
import { ThermalReceipt } from "@/components/printing/ThermalReceipt";
import { DirectPrint } from "@/components/printing/escpos/DirectPrint";
import Image from "next/image";

interface Props {
  params: Promise<{ invoiceId: string }>;
  searchParams: Promise<{ format?: string }>;
}

export default async function ReceiptPage({ params, searchParams }: Props) {
  const { invoiceId } = await params;
  const { format } = await searchParams;

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
  const customer = invoice.customerId
    ? await Customer.findById(invoice.customerId).select({ phone: 1, name: 1 }).lean()
    : null;

  const subtotal = parseFloat(invoice.subtotal.toString());
  const discountTotal = parseFloat(invoice.discountTotal.toString());
  const shippingTotal = invoice.shippingTotal ? parseFloat(invoice.shippingTotal.toString()) : 0;
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

  // If format is specified, render the dedicated print view
  if (format === "a4" || format === "thermal-80" || format === "thermal-58") {
    const backUrl = `/pos/receipt/${invoiceId}`;
    return (
      <PrintPage format={format} backUrl={backUrl}>
        {format === "a4" ? (
          <A4Invoice invoice={invoice} tenant={tenant} branch={branch} customer={customer} />
        ) : (
          <ThermalReceipt
            invoice={invoice}
            tenant={tenant}
            branch={branch}
            customer={customer}
            width={format === "thermal-80" ? "80mm" : "58mm"}
          />
        )}
      </PrintPage>
    );
  }

  // Default receipt view
  return (
    <div className="receipt-page-shell flex min-h-0 h-full bg-background items-start justify-center p-4">
      <div className="bg-white text-black w-full max-w-sm rounded-lg border shadow-sm overflow-hidden">
        <div className="p-6 text-center border-b">
          {tenant?.logoUrl && (
            <Image src={tenant.logoUrl} alt="logo" width={200} height={48} unoptimized className="h-12 mx-auto mb-3 object-contain" />
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
                  <th className="text-start py-1 text-gray-600 font-medium">Item</th>
                  <th className="text-center py-1 text-gray-600 font-medium">Qty</th>
                  <th className="text-end py-1 text-gray-600 font-medium">Total</th>
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
                    <td className="py-1 text-end">
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
            {shippingTotal > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">Shipping</span>
                <span>SAR {shippingTotal.toFixed(2)}</span>
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
              <Image src={invoice.qrCode} alt="QR" width={96} height={96} unoptimized className="w-24 h-24" />
            </div>
          )}
        </div>

        <ReceiptActions
          invoiceId={invoiceId}
          invoiceType={invoice.invoiceType}
          customerPhone={customer?.phone || null}
        />

        <div className="px-4 pb-4 no-print">
          <DirectPrint
            invoiceNumber={invoice.invoiceNumber}
            issuedAt={invoice.issuedAt}
            businessName={tenant?.name || "Shop"}
            businessNameAr={tenant?.nameAr}
            vatNumber={tenant?.vatNumber}
            address={tenant?.address}
            phone={tenant?.phone}
            lines={invoice.lines.map(l => ({
              name: l.name,
              nameAr: l.nameAr,
              sku: l.sku,
              price: parseFloat(l.unitPrice.toString()),
              qty: parseFloat(l.quantity.toString()),
              discount: parseFloat(l.discountAmount.toString()),
              total: parseFloat(l.totalAmount.toString()),
            }))}
            subtotal={subtotal}
            discountTotal={discountTotal}
            vatTotal={vatTotal}
            grandTotal={grandTotal}
            paymentMethod={invoice.payments[0]?.method || "cash"}
            qrData={invoice.qrCode ? invoice.invoiceNumber : undefined}
          />
        </div>
      </div>
    </div>
  );
}
