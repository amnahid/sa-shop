import Image from "next/image";
import { formatSAR, formatDateShort } from "@/lib/printing/format";
import type { IInvoice } from "@/models/sales/Invoice";
import type { ITenant } from "@/models/tenancy/Tenant";
import type { IBranch } from "@/models/tenancy/Branch";
import arDict from "@/lib/i18n/dictionaries/ar.json";
import enDict from "@/lib/i18n/dictionaries/en.json";

interface ThermalReceiptProps {
  invoice: IInvoice;
  tenant: ITenant | null;
  branch: IBranch | null;
  customer: { phone?: string; name?: string } | null;
  width: "80mm" | "58mm";
  locale?: string;
}

export function ThermalReceipt({ invoice, tenant, branch, customer, width, locale = "en" }: ThermalReceiptProps) {
  const subtotal = parseFloat(invoice.subtotal.toString());
  const discountTotal = parseFloat(invoice.discountTotal.toString());
  const shippingTotal = invoice.shippingTotal ? parseFloat(invoice.shippingTotal.toString()) : 0;
  const vatTotal = parseFloat(invoice.vatTotal.toString());
  const grandTotal = parseFloat(invoice.grandTotal.toString());
  const isNarrow = width === "58mm";

  const dict = locale === "ar" ? arDict : enDict;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const t = (key: string, fallback: string) => (dict as any).receipt?.[key] || fallback;

  const paymentMethodLabels: Record<string, string> = {
    cash: locale === "ar" ? "نقداً" : "Cash",
    mada: locale === "ar" ? "مدى" : "Mada",
    visa: locale === "ar" ? "فيزا" : "Visa",
    mastercard: locale === "ar" ? "ماستركارد" : "Mastercard",
    amex: locale === "ar" ? "أمريكان إكسبريس" : "American Express",
    stc_pay: locale === "ar" ? "إس تي سي باي" : "STC Pay",
    apple_pay: locale === "ar" ? "أبل باي" : "Apple Pay",
    tabby: locale === "ar" ? "تابي" : "Tabby",
    tamara: locale === "ar" ? "تمارا" : "Tamara",
    bank_transfer: locale === "ar" ? "تحويل بنكي" : "Bank Transfer",
    store_credit: locale === "ar" ? "رصيد المتجر" : "Store Credit",
  };

  return (
    <div className={`print-thermal print-thermal-${width === "80mm" ? "80" : "58"}`}>
      <div className="thermal-page" style={{ width: width === "80mm" ? "80mm" : "58mm" }} dir={locale === "ar" ? "rtl" : "ltr"}>
        {/* Header */}
        <div className="thermal-header">
          {tenant?.logoUrl && (
            <Image src={tenant.logoUrl} alt="logo" width={isNarrow ? 80 : 120} height={isNarrow ? 30 : 40} unoptimized className="thermal-logo" />
          )}
          <h1 className={`thermal-business-name ${isNarrow ? "thermal-business-name-sm" : ""}`}>
            {locale === "ar" && tenant?.nameAr ? tenant.nameAr : (tenant?.name || "Shop")}
          </h1>
          {tenant?.address && <p className={`thermal-address ${isNarrow ? "thermal-text-xs" : "thermal-text-sm"}`}>{tenant.address}</p>}
          {tenant?.phone && <p className={`thermal-phone ${isNarrow ? "thermal-text-xs" : "thermal-text-sm"}`}>{tenant.phone}</p>}
          {tenant?.vatNumber && <p className={`thermal-vat ${isNarrow ? "thermal-text-xs" : "thermal-text-sm"}`}>VAT / الرقم الضريبي: {tenant.vatNumber}</p>}
        </div>

        {/* Divider */}
        <div className="thermal-divider" />

        {/* Invoice Meta */}
        <div className={`thermal-meta ${isNarrow ? "thermal-text-xs" : "thermal-text-sm"}`}>
          <div className="thermal-meta-row">
            <span>{t("invoice", "Invoice")}:</span>
            <span>{invoice.invoiceNumber}</span>
          </div>
          <div className="thermal-meta-row">
            <span>{t("date", "Date")}:</span>
            <span>{formatDateShort(invoice.issuedAt)}</span>
          </div>
          {branch?.name && (
            <div className="thermal-meta-row">
              <span>{t("branch", "Branch")}:</span>
              <span>{branch.name}</span>
            </div>
          )}
          {customer?.name && (
            <div className="thermal-meta-row">
              <span>{t("customer", "Customer")}:</span>
              <span>{customer.name}</span>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="thermal-divider" />

        {/* Line Items */}
        <table className={`thermal-items ${isNarrow ? "thermal-text-xs" : "thermal-text-sm"}`}>
          <thead>
            <tr className="thermal-items-header">
              <th className="thermal-th-item">{t("item", "Item")}</th>
              {!isNarrow && <th className="thermal-th-price">Price</th>}
              <th className="thermal-th-qty">{t("qty", "Qty")}</th>
              {!isNarrow && <th className="thermal-th-disc">Disc</th>}
              <th className="thermal-th-total">{t("total", "Total")}</th>
            </tr>
          </thead>
          <tbody>
            {invoice.lines.map((line, i) => {
              const unitPrice = parseFloat(line.unitPrice.toString());
              const qty = parseFloat(line.quantity.toString());
              const discount = parseFloat(line.discountAmount.toString());
              const total = parseFloat(line.totalAmount.toString());
              return (
                <tr key={i} className="thermal-item-row">
                  <td className="thermal-td-item">
                    <span className="thermal-item-name">{locale === "ar" && line.nameAr ? line.nameAr : line.name}</span>
                    <span className="thermal-item-sku">{line.sku}</span>
                  </td>
                  {!isNarrow && <td className="thermal-td-price">{unitPrice.toFixed(2)}</td>}
                  <td className="thermal-td-qty">{qty}</td>
                  {!isNarrow && <td className="thermal-td-disc">{discount > 0 ? discount.toFixed(2) : "-"}</td>}
                  <td className="thermal-td-total">{total.toFixed(2)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Divider */}
        <div className="thermal-divider" />

        {/* Totals */}
        <div className={`thermal-totals ${isNarrow ? "thermal-text-xs" : "thermal-text-sm"}`}>
          <div className="thermal-total-row">
            <span>{t("subtotal", "Subtotal")}</span>
            <span>{formatSAR(subtotal)}</span>
          </div>
          {discountTotal > 0 && (
            <div className="thermal-total-row">
              <span>{t("discount", "Discount")}</span>
              <span>-{formatSAR(discountTotal)}</span>
            </div>
          )}
          {shippingTotal > 0 && (
            <div className="thermal-total-row">
              <span>{t("shipping", "Shipping")}</span>
              <span>{formatSAR(shippingTotal)}</span>
            </div>
          )}
          <div className="thermal-total-row">
            <span>{t("vat", "VAT (15%)")}</span>
            <span>{formatSAR(vatTotal)}</span>
          </div>
          <div className="thermal-total-row thermal-total-row-grand">
            <span>{t("total", "TOTAL")}</span>
            <span>{formatSAR(grandTotal)}</span>
          </div>
        </div>

        {/* Payment */}
        {invoice.payments.length > 0 && (
          <div className={`thermal-payment ${isNarrow ? "thermal-text-xs" : "thermal-text-sm"}`}>
            <div className="thermal-divider" />
            {invoice.payments.map((p, i) => {
              const amt = parseFloat(p.amount.toString());
              return (
                <div key={i} className="thermal-payment-row">
                  <span>{t("paidBy", "Paid by")} {paymentMethodLabels[p.method] || p.method}</span>
                  <span>{formatSAR(amt)}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* VAT Notice */}
        {tenant?.vatRegistered && (
          <div className={`thermal-vat-notice ${isNarrow ? "thermal-text-xs" : "thermal-text-sm"}`}>
            {t("vatCollected", "VAT collected per ZATCA regulations")}
          </div>
        )}

        {/* QR Code */}
        {invoice.qrCode && (
          <div className="thermal-qr">
            <Image src={invoice.qrCode} alt="QR" width={isNarrow ? 64 : 80} height={isNarrow ? 64 : 80} unoptimized className="thermal-qr-image" />
          </div>
        )}

        {/* Footer */}
        <div className={`thermal-footer ${isNarrow ? "thermal-text-xs" : "thermal-text-sm"}`}>
          <p>{t("thankYou", "Thank you for your purchase!")}</p>
          {tenant?.vatRegistered && <p className="thermal-footer-vat">VAT Invoice / فاتورة ضريبية</p>}
        </div>
      </div>
    </div>
  );
}
