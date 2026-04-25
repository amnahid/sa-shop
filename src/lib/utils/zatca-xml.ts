import { IInvoice, IInvoiceLine } from "@/models/sales/Invoice";

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function formatDec(n: number, decimals = 2): string {
  return n.toFixed(decimals);
}

export interface XmlBuildOptions {
  sellerName: string;
  sellerVatNumber: string;
  sellerAddress: string;
  sellerCrNumber: string;
  buyerName?: string;
  buyerVatNumber?: string;
  buyerAddress?: string;
  invoiceType: "simplified" | "standard";
  invoiceHash: string;
  signatureValue?: string;
}

export function buildInvoiceXml(
  invoice: IInvoice,
  options: XmlBuildOptions
): string {
  const issuedAt = new Date(invoice.issuedAt);
  const subtotal = parseFloat(invoice.subtotal.toString());
  const discountTotal = parseFloat(invoice.discountTotal.toString());
  const vatTotal = parseFloat(invoice.vatTotal.toString());
  const grandTotal = parseFloat(invoice.grandTotal.toString());

  const lines = invoice.lines.map(line => {
    const qty = parseFloat(line.quantity.toString());
    const unitPrice = parseFloat(line.unitPrice.toString());
    const netAmount = parseFloat(line.netAmount.toString());
    const vatAmount = parseFloat(line.vatAmount.toString());
    const totalAmount = parseFloat(line.totalAmount.toString());
    const discountAmount = parseFloat(line.discountAmount.toString());

    return `
    <inv:InvoiceLine>
      <inv:ID>${escapeXml(line.sku)}</inv:ID>
      <inv:ItemName>${escapeXml(line.name)}</inv:ItemName>
      ${line.nameAr ? `<inv:ItemNameAr>${escapeXml(line.nameAr)}</inv:ItemNameAr>` : ""}
      <inv:Quantity unitCode="C62">${qty}</inv:Quantity>
      <inv:UnitPrice>${formatDec(unitPrice)}</inv:UnitPrice>
      <inv:TaxableAmount>${formatDec(netAmount)}</inv:TaxableAmount>
      <inv:TaxAmount>${formatDec(vatAmount)}</inv:TaxAmount>
      <inv:TaxPercentage>${(line.vatRate * 100).toFixed(0)}</inv:TaxPercentage>
      <inv:DiscountAmount>${formatDec(discountAmount)}</inv:DiscountAmount>
      <inv:LineTotalAmount>${formatDec(totalAmount)}</inv:LineTotalAmount>
    </inv:InvoiceLine>`;
  }).join("");

  const buyerSection = options.invoiceType === "standard" && (options.buyerName || options.buyerVatNumber) ? `
    <inv:Buyer>
      <inv:BuyerName>${escapeXml(options.buyerName || "")}</inv:BuyerName>
      ${options.buyerVatNumber ? `<inv:BuyerVatNumber>${escapeXml(options.buyerVatNumber)}</inv:BuyerVatNumber>` : ""}
      ${options.buyerAddress ? `<inv:BuyerAddress>${escapeXml(options.buyerAddress)}</inv:BuyerAddress>` : ""}
    </inv:Buyer>` : "";

  const signatureSection = options.signatureValue ? `
    <inv:Signature>
      <inv:SignatureValue>${escapeXml(options.signatureValue)}</inv:SignatureValue>
      <inv:SignatureAlgorithm>SHA256withRSA</inv:SignatureAlgorithm>
    </inv:Signature>` : "";

  return `<?xml version="1.0" encoding="UTF-8"?>
<inv:Invoice xmlns:inv="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
             xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
             xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"
             xmlns:ext="urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2">
  <cbc:UBLVersionID>2.1</cbc:UBLVersionID>
  <cbc:ProfileID>reporting:1.0</cbc:ProfileID>
  <cbc:ID>${escapeXml(invoice.invoiceNumber)}</cbc:ID>
  <cbc:UUID>${invoice.uuid}</cbc:UUID>
  <cbc:IssueDate>${issuedAt.toISOString().split("T")[0]}</cbc:IssueDate>
  <cbc:IssueTime>${issuedAt.toISOString().split("T")[1]?.substring(0, 8) || "00:00:00"}</cbc:IssueTime>
  <cbc:InvoiceTypeCode>${invoice.invoiceType === "simplified" ? "388" : "381"}</cbc:InvoiceTypeCode>
  <cbc:DocumentCurrencyCode>SAR</cbc:DocumentCurrencyCode>
  <cbc:TaxCurrencyCode>SAR</cbc:TaxCurrencyCode>
  <inv:Seller>
    <inv:SellerName>${escapeXml(options.sellerName)}</inv:SellerName>
    <inv:SellerAddress>${escapeXml(options.sellerAddress)}</inv:SellerAddress>
    <inv:SellerTIN>${escapeXml(options.sellerCrNumber)}</inv:SellerTIN>
    <inv:SellerVATNumber>${escapeXml(options.sellerVatNumber)}</inv:SellerVATNumber>
  </inv:Seller>${buyerSection}
  <inv:InvoiceLines>${lines}
  </inv:InvoiceLines>
  <inv:TaxTotal>
    <inv:TaxAmount currencyID="SAR">${formatDec(vatTotal)}</inv:TaxAmount>
    <inv:TaxSubtotal>
      <inv:TaxableAmount currencyID="SAR">${formatDec(subtotal)}</inv:TaxableAmount>
      <inv:TaxAmount currencyID="SAR">${formatDec(vatTotal)}</inv:TaxAmount>
      <inv:TaxCategory>${escapeXml(options.sellerVatNumber ? "S" : "Z")}</inv:TaxCategory>
      <inv:TaxPercentage>15</inv:TaxPercentage>
    </inv:TaxSubtotal>
  </inv:TaxTotal>
  <inv:LegalMonetaryTotal>
    <inv:LineExtensionAmount currencyID="SAR">${formatDec(subtotal)}</inv:LineExtensionAmount>
    <inv:DiscountTotalAmount currencyID="SAR">${formatDec(discountTotal)}</inv:DiscountTotalAmount>
    <inv:TaxExclusiveAmount currencyID="SAR">${formatDec(subtotal - discountTotal)}</inv:TaxExclusiveAmount>
    <inv:TaxInclusiveAmount currencyID="SAR">${formatDec(grandTotal)}</inv:TaxInclusiveAmount>
    <inv:PayableAmount currencyID="SAR">${formatDec(grandTotal)}</inv:PayableAmount>
  </inv:LegalMonetaryTotal>
  <inv:InvoiceHash>${escapeXml(options.invoiceHash)}</inv:InvoiceHash>${signatureSection}
</inv:Invoice>`;
}