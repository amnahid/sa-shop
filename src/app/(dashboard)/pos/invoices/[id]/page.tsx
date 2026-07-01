import { redirect } from "next/navigation";
import Link from "next/link";
import { voidInvoice, refundInvoice } from "@/lib/actions/invoices";
import { Invoice, Branch, Retainer, Tenant, Customer } from "@/models";
import { getCurrentMembership } from "@/lib/utils/membership";
import { SendInvoiceWhatsAppDialog } from "@/components/pos/SendInvoiceWhatsAppDialog";
import { cookies } from "next/headers";
import { getDictionary, Locale } from "@/lib/i18n/get-dictionary";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function InvoiceDetailPage({ params }: Props) {
  const { id } = await params;

  const membership = await getCurrentMembership();
  const cookieStore = await cookies();
  const locale = (cookieStore.get("NEXT_LOCALE")?.value as Locale) || "en";
  const dict = await getDictionary(locale);
  const t = (key: string, fallback: string) => (dict.invoiceDetails as any)?.[key] || fallback;

  if (!membership) {
    return <div>{t("noMembership", "No active membership")}</div>;
  }

  const invoice = await Invoice.findOne({
    _id: id,
    tenantId: membership.tenantId,
  });

  if (!invoice) {
    return <div>{t("notFound", "Invoice not found")}</div>;
  }

  const branch = await Branch.findById(invoice.branchId);
  const tenant = await Tenant.findById(invoice.tenantId);
  const linkedRetainer = invoice.retainerId
    ? await Retainer.findById(invoice.retainerId).select("_id retainerNumber")
    : null;

  // Retrieve customer phone number
  let customerPhone: string | null = null;
  if (invoice.customerId) {
    const customer = await Customer.findById(invoice.customerId).select("phone").lean();
    if (customer && "phone" in customer && customer.phone) {
      customerPhone = customer.phone;
    }
  }

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

  const formattedDate = invoice.issuedAt.toLocaleDateString(locale === "ar" ? "ar-SA" : "en-SA", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="p-6 max-w-3xl" dir={locale === "ar" ? "rtl" : "ltr"}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{invoice.invoiceNumber}</h1>
          <p className="text-muted-foreground">{formattedDate}</p>
        </div>
        <Link href="/pos/invoices" className="text-primary hover:underline font-bold text-xs uppercase tracking-wider">
          {t("back", "← Back to Invoices")}
        </Link>
      </div>

      <div className="grid gap-6">
        <div className="bg-card border rounded-lg p-6">
          <div className="flex items-center justify-between mb-4 border-b pb-2 border-gray-100">
            <h2 className="font-bold text-sm uppercase tracking-widest text-gray-400">{t("details", "Invoice Details")}</h2>
            <span className={`text-xs font-black uppercase tracking-widest px-3 py-1 rounded-full border ${statusColors[invoice.status] || ""}`}>
              {invoice.status}
            </span>
          </div>

          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-0.5">{t("branch", "Branch")}</dt>
              <dd className="font-bold text-gray-800">{branch?.name || "-"}</dd>
            </div>
            <div>
              <dt className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-0.5">{t("type", "Type")}</dt>
              <dd className="font-bold text-gray-800 capitalize">{invoice.invoiceType}</dd>
            </div>
            {invoice.customerName && (
              <div>
                <dt className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-0.5">{t("customer", "Customer")}</dt>
                <dd className="font-bold text-gray-800">{invoice.customerName}</dd>
              </div>
            )}
            {invoice.customerVatNumber && (
              <div>
                <dt className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-0.5">{t("customerVat", "Customer VAT #")}</dt>
                <dd className="font-bold text-gray-800">{invoice.customerVatNumber}</dd>
              </div>
            )}
            {linkedRetainer && (
              <div>
                <dt className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-0.5">{t("retainer", "Retainer")}</dt>
                <dd className="font-bold text-gray-800">
                  <Link href={`/retainers/${linkedRetainer._id.toString()}`} className="text-primary hover:underline">
                    {linkedRetainer.retainerNumber}
                  </Link>
                </dd>
              </div>
            )}
            {tenant?.vatNumber && (
              <div>
                <dt className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-0.5">{t("sellerVat", "Seller VAT #")}</dt>
                <dd className="font-bold text-gray-800">{tenant.vatNumber}</dd>
              </div>
            )}
            {invoice.uuid && (
              <div className="col-span-2">
                <dt className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-0.5">{t("uuid", "UUID")}</dt>
                <dd className="font-mono text-xs text-gray-500 break-all">{invoice.uuid}</dd>
              </div>
            )}
          </dl>
        </div>

        <div className="bg-card border rounded-lg overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <h2 className="font-bold text-xs uppercase tracking-widest text-gray-400">{t("lineItems", "Line Items")}</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr className="border-b border-gray-100">
                  <th className="text-start p-3 text-[10px] font-black uppercase tracking-widest text-gray-500">{t("product", "Product")}</th>
                  <th className="text-end p-3 text-[10px] font-black uppercase tracking-widest text-gray-500">{t("unitPrice", "Unit Price")}</th>
                  <th className="text-center p-3 text-[10px] font-black uppercase tracking-widest text-gray-500">{t("qty", "Qty")}</th>
                  <th className="text-end p-3 text-[10px] font-black uppercase tracking-widest text-gray-500">{t("net", "Net")}</th>
                  <th className="text-end p-3 text-[10px] font-black uppercase tracking-widest text-gray-500">{t("vat", "VAT")}</th>
                  <th className="text-end p-3 text-[10px] font-black uppercase tracking-widest text-gray-500">{t("total", "Total")}</th>
                </tr>
              </thead>
              <tbody>
                {invoice.lines.map((line, i) => {
                  const total = parseFloat(line.totalAmount.toString());
                  return (
                    <tr key={i} className="border-t border-gray-100 hover:bg-gray-50/50 transition-colors">
                      <td className="p-3">
                        <span className="font-bold text-gray-800">{locale === "ar" && line.nameAr ? line.nameAr : line.name}</span>
                        <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">{line.sku}</span>
                      </td>
                      <td className="p-3 text-end font-bold text-gray-700">SAR {parseFloat(line.unitPrice.toString()).toFixed(2)}</td>
                      <td className="p-3 text-center font-bold text-gray-600">{parseFloat(line.quantity.toString())}</td>
                      <td className="p-3 text-end font-bold text-gray-700">SAR {parseFloat(line.netAmount.toString()).toFixed(2)}</td>
                      <td className="p-3 text-end font-bold text-gray-700">SAR {parseFloat(line.vatAmount.toString()).toFixed(2)}</td>
                      <td className={`p-3 text-end font-bold ${total < 0 ? "text-danger" : "text-gray-800"}`}>
                        SAR {total.toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="p-4 border-t border-gray-100 space-y-2 text-sm bg-gray-50/30">
            <div className="flex justify-between font-medium">
              <span className="text-gray-400 font-bold uppercase tracking-wider text-[11px]">{t("subtotal", "Subtotal")}</span>
              <span className="font-bold text-gray-800">SAR {subtotal.toFixed(2)}</span>
            </div>
            {discountTotal !== 0 && (
              <div className="flex justify-between font-medium">
                <span className="text-gray-400 font-bold uppercase tracking-wider text-[11px]">{t("discount", "Discount")}</span>
                <span className={`font-bold ${discountTotal < 0 ? "text-emerald-600" : "text-gray-800"}`}>
                  SAR {discountTotal.toFixed(2)}
                </span>
              </div>
            )}
            <div className="flex justify-between font-medium">
              <span className="text-gray-400 font-bold uppercase tracking-wider text-[11px]">{t("vatPercent", "VAT (15%)")}</span>
              <span className="font-bold text-gray-800">SAR {vatTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-base font-black border-t border-gray-100 pt-2">
              <span className="text-gray-800 uppercase tracking-widest text-xs font-black">{t("grandTotal", "Grand Total")}</span>
              <span className={grandTotal < 0 ? "text-danger" : "text-primary"}>
                SAR {grandTotal.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {invoice.payments.length > 0 && (
          <div className="bg-card border rounded-lg p-5">
            <h2 className="font-bold text-xs uppercase tracking-widest text-gray-400 mb-3">{t("payments", "Payments")}</h2>
            <div className="space-y-2 text-sm">
              {invoice.payments.map((p, i) => (
                <div key={i} className="flex justify-between font-bold text-gray-800">
                  <span className="text-gray-500 capitalize">{p.method.replace("_", " ")}</span>
                  <span>SAR {parseFloat(p.amount.toString()).toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {(canVoid || canRefund) && (
          <div className="bg-card border rounded-lg p-4 flex justify-end gap-3">
            {canVoid && (
              <VoidButton invoiceId={invoice._id.toString()} label={t("void", "Void Invoice")} />
            )}
            {canRefund && (
              <RefundButton invoiceId={invoice._id.toString()} label={t("refund", "Refund Invoice")} />
            )}
          </div>
        )}

        {invoice.voidedAt && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-800 font-medium">
            <p className="font-black uppercase tracking-wider text-xs">{t("voidedAlert", "This invoice was voided")}</p>
            <p className="text-red-600 mt-1">{t("voidedAt", "Voided at")}: {invoice.voidedAt.toLocaleString()}</p>
          </div>
        )}

        {/* Action Buttons Row */}
        <div className="flex flex-col gap-3">
          <div className="flex gap-3">
            <Link
              href={`/pos/receipt/${invoice._id}?format=a4`}
              className="flex-1 text-center py-2.5 rounded-md border border-input bg-background text-xs font-black uppercase tracking-widest hover:bg-accent transition-colors"
            >
              {t("printA4", "Print A4")}
            </Link>
            <Link
              href={`/pos/receipt/${invoice._id}?format=thermal-80`}
              className="flex-1 text-center py-2.5 rounded-md border border-input bg-background text-xs font-black uppercase tracking-widest hover:bg-accent transition-colors"
            >
              {t("print80", "Print 80mm")}
            </Link>
            <Link
              href={`/pos/receipt/${invoice._id}?format=thermal-58`}
              className="flex-1 text-center py-2.5 rounded-md border border-input bg-background text-xs font-black uppercase tracking-widest hover:bg-accent transition-colors"
            >
              {t("print58", "Print 58mm")}
            </Link>
          </div>

          <div className="flex">
            <SendInvoiceWhatsAppDialog invoiceId={invoice._id.toString()} defaultPhone={customerPhone} />
          </div>
        </div>
      </div>
    </div>
  );
}

async function VoidButton({ invoiceId, label }: { invoiceId: string; label: string }) {
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
        className="px-4 py-2 rounded-md border border-red-300 text-red-600 text-sm font-semibold hover:bg-red-50 transition-colors"
      >
        {label}
      </button>
    </form>
  );
}

async function RefundButton({ invoiceId, label }: { invoiceId: string; label: string }) {
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
        className="px-4 py-2 rounded-md bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
      >
        {label}
      </button>
    </form>
  );
}
