import Image from "next/image";
import { formatSAR, formatDateShort, numberToWords, getPaymentMethodLabel, getPaymentMethodLabelAr } from "@/lib/printing/format";
import type { IInvoice } from "@/models/sales/Invoice";
import type { ITenant } from "@/models/tenancy/Tenant";
import type { IBranch } from "@/models/tenancy/Branch";

interface A4InvoiceProps {
  invoice: IInvoice;
  tenant: ITenant | null;
  branch: IBranch | null;
  customer: { phone?: string; name?: string } | null;
}

export function A4Invoice({ invoice, tenant, branch, customer }: A4InvoiceProps) {
  const subtotal = parseFloat(invoice.subtotal.toString());
  const discountTotal = parseFloat(invoice.discountTotal.toString());
  const shippingTotal = invoice.shippingTotal ? parseFloat(invoice.shippingTotal.toString()) : 0;
  const vatTotal = parseFloat(invoice.vatTotal.toString());
  const grandTotal = parseFloat(invoice.grandTotal.toString());

  return (
    <div className="print-a4 min-h-0">
      <div className="a4-page">
        {/* Header */}
        <div className="a4-header">
          <div className="a4-header-left">
            {tenant?.logoUrl && (
              <Image src={tenant.logoUrl} alt="logo" width={160} height={48} unoptimized className="a4-logo" />
            )}
            <h1 className="a4-business-name">{tenant?.name || "Business Name"}</h1>
            <p className="a4-business-name-ar">{tenant?.nameAr || tenant?.name || ""}</p>
          </div>
          <div className="a4-header-right">
            <h2 className="a4-title">TAX INVOICE</h2>
            <p className="a4-title-ar">فاتورة ضريبية</p>
            <p className="a4-number">{invoice.invoiceNumber}</p>
          </div>
        </div>

        {/* Business Info */}
        <div className="a4-section a4-business-info">
          <div className="a4-info-block">
            <h3 className="a4-section-title">Seller / البائع</h3>
            <p className="a4-info-line">{tenant?.name || "-"}</p>
            <p className="a4-info-line-ar">{tenant?.nameAr || ""}</p>
            <p className="a4-info-line">{tenant?.address || ""}</p>
            <p className="a4-info-line-ar">{tenant?.addressAr || ""}</p>
            <p className="a4-info-line">VAT: {tenant?.vatNumber || "-"}</p>
            {tenant?.crNumber && <p className="a4-info-line">CR: {tenant.crNumber}</p>}
            {tenant?.phone && <p className="a4-info-line">Tel: {tenant.phone}</p>}
            {tenant?.email && <p className="a4-info-line">Email: {tenant.email}</p>}
          </div>
          <div className="a4-info-block">
            <h3 className="a4-section-title">Buyer / المشتري</h3>
            <p className="a4-info-line">{invoice.customerName || customer?.name || "Walk-in Customer"}</p>
            {invoice.customerName && <p className="a4-info-line-ar">{invoice.customerName}</p>}
            {invoice.customerVatNumber && <p className="a4-info-line">VAT: {invoice.customerVatNumber}</p>}
            {invoice.customerAddress && <p className="a4-info-line">{invoice.customerAddress}</p>}
            {customer?.phone && <p className="a4-info-line">Tel: {customer.phone}</p>}
          </div>
        </div>

        {/* Invoice Meta */}
        <div className="a4-section a4-meta">
          <table className="a4-meta-table">
            <tbody>
              <tr>
                <td className="a4-meta-label">Date / التاريخ</td>
                <td className="a4-meta-value">{formatDateShort(invoice.issuedAt)}</td>
                <td className="a4-meta-label">Branch / الفرع</td>
                <td className="a4-meta-value">{branch?.name || "-"}</td>
              </tr>
              <tr>
                <td className="a4-meta-label">Invoice # / رقم الفاتورة</td>
                <td className="a4-meta-value">{invoice.invoiceNumber}</td>
                <td className="a4-meta-label">Type / النوع</td>
                <td className="a4-meta-value">{invoice.invoiceType === "standard" ? "Standard / قياسية" : "Simplified / مبسطة"}</td>
              </tr>
              {invoice.uuid && (
                <tr>
                  <td className="a4-meta-label">UUID</td>
                  <td className="a4-meta-value" colSpan={3}>{invoice.uuid}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Line Items */}
        <div className="a4-section a4-items">
          <table className="a4-items-table">
            <thead>
              <tr>
                <th className="a4-th a4-th-num">#</th>
                <th className="a4-th a4-th-item">Item / الصنف</th>
                <th className="a4-th a4-th-sku">SKU</th>
                <th className="a4-th a4-th-price">Unit Price / سعر الوحدة</th>
                <th className="a4-th a4-th-qty">Qty / الكمية</th>
                <th className="a4-th a4-th-disc">Disc. / الخصم</th>
                <th className="a4-th a4-th-net">Net / الصافي</th>
                <th className="a4-th a4-th-vatrate">VAT%</th>
                <th className="a4-th a4-th-vat">VAT / الضريبة</th>
                <th className="a4-th a4-th-total">Total / الإجمالي</th>
              </tr>
            </thead>
            <tbody>
              {invoice.lines.map((line, i) => {
                const unitPrice = parseFloat(line.unitPrice.toString());
                const qty = parseFloat(line.quantity.toString());
                const discount = parseFloat(line.discountAmount.toString());
                const net = parseFloat(line.netAmount.toString());
                const vatAmt = parseFloat(line.vatAmount.toString());
                const total = parseFloat(line.totalAmount.toString());
                return (
                  <tr key={i}>
                    <td className="a4-td a4-td-num">{i + 1}</td>
                    <td className="a4-td a4-td-item">
                      <span className="a4-item-name">{line.name}</span>
                      {line.nameAr && <span className="a4-item-name-ar">{line.nameAr}</span>}
                    </td>
                    <td className="a4-td a4-td-sku">{line.sku}</td>
                    <td className="a4-td a4-td-price">{formatSAR(unitPrice)}</td>
                    <td className="a4-td a4-td-qty">{qty}</td>
                    <td className="a4-td a4-td-disc">{discount > 0 ? formatSAR(discount) : "-"}</td>
                    <td className="a4-td a4-td-net">{formatSAR(net)}</td>
                    <td className="a4-td a4-td-vatrate">{(line.vatRate * 100).toFixed(0)}%</td>
                    <td className="a4-td a4-td-vat">{formatSAR(vatAmt)}</td>
                    <td className="a4-td a4-td-total">{formatSAR(total)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="a4-section a4-totals">
          <div className="a4-totals-left">
            <div className="a4-amount-words">
              <p className="a4-amount-words-label">Amount in Words / المبلغ بالكتابة</p>
              <p className="a4-amount-words-en">{numberToWords(grandTotal, "en")}</p>
              <p className="a4-amount-words-ar">{numberToWords(grandTotal, "ar")}</p>
            </div>
            {tenant?.vatRegistered && (
              <p className="a4-zatca-note">VAT has been collected per ZATCA regulations / تم تحصيل ضريبة القيمة المضافة وفقاً للوائح زاتكا</p>
            )}
          </div>
          <div className="a4-totals-right">
            <div className="a4-total-row">
              <span className="a4-total-label">Subtotal / المجموع الفرعي</span>
              <span className="a4-total-value">{formatSAR(subtotal)}</span>
            </div>
            {discountTotal > 0 && (
              <div className="a4-total-row">
                <span className="a4-total-label">Discount / الخصم</span>
                <span className="a4-total-value a4-total-discount">-{formatSAR(discountTotal)}</span>
              </div>
            )}
            {shippingTotal > 0 && (
              <div className="a4-total-row">
                <span className="a4-total-label">Shipping / الشحن</span>
                <span className="a4-total-value">{formatSAR(shippingTotal)}</span>
              </div>
            )}
            <div className="a4-total-row">
              <span className="a4-total-label">VAT (15%) / ضريبة القيمة المضافة</span>
              <span className="a4-total-value">{formatSAR(vatTotal)}</span>
            </div>
            <div className="a4-total-row a4-total-row-grand">
              <span className="a4-total-label-grand">Grand Total / الإجمالي الكلي</span>
              <span className="a4-total-value-grand">{formatSAR(grandTotal)}</span>
            </div>
          </div>
        </div>

        {/* Payment */}
        {invoice.payments.length > 0 && (
          <div className="a4-section a4-payment">
            <h3 className="a4-section-title">Payment / الدفع</h3>
            {invoice.payments.map((p, i) => {
              const amt = parseFloat(p.amount.toString());
              return (
                <div key={i} className="a4-payment-row">
                  <span className="a4-payment-method">
                    {getPaymentMethodLabel(p.method)} / {getPaymentMethodLabelAr(p.method)}
                  </span>
                  <span className="a4-payment-amount">{formatSAR(amt)}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* QR Code */}
        {invoice.qrCode && (
          <div className="a4-section a4-qr">
            <Image src={invoice.qrCode} alt="ZATCA QR" width={120} height={120} unoptimized className="a4-qr-image" />
          </div>
        )}

        {/* Footer */}
        <div className="a4-footer">
          <p>Thank you for your business / شكراً لتعاملكم معنا</p>
          <p className="a4-footer-extra">This is a computer-generated invoice / هذه فاتورة صادرة بالحاسب الآلي</p>
        </div>
      </div>
    </div>
  );
}
