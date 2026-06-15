export type ZatcaInvoiceType = 'Standard' | 'Simplified';
export type ZatcaEnvironment = 'sandbox' | 'production';

export interface ZatcaSellerInfo {
  name: string;          // English
  nameAr: string;        // Arabic
  trn: string;           // 15-digit TRN
  buildingNumber: string;
  streetName: string;
  district: string;
  city: string;
  postalCode: string;
  countryCode: string;   // 'SA'
}

export interface ZatcaBuyerInfo {
  name: string;
  trn?: string;          // Required for Standard (B2B) invoices
  buildingNumber?: string;
  streetName?: string;
  district?: string;
  city?: string;
  postalCode?: string;
  countryCode?: string;  // Default to 'SA'
  otherId?: {
    id: string;
    type: 'CRN' | 'MOM' | 'MLSD' | 'SAGIA' | 'OTH';
  };
}

export interface ZatcaLineItem {
  name: string;
  quantity: number;
  unitPrice: number;     // Exclusive of VAT
  vatRate: number;       // e.g. 15
  vatAmount: number;
  totalAmount: number;   // Inclusive of VAT
}

export interface ZatcaInvoiceData {
  uuid: string;
  invoiceNumber?: string; // Sequential invoice ID (BT-1)
  invoiceType: ZatcaInvoiceType;
  issueDate: Date;
  supplyDate?: Date;      // Supply date (KSA-5)
  seller: ZatcaSellerInfo;
  buyer: ZatcaBuyerInfo;
  lineItems: ZatcaLineItem[];
  subtotal: number;      // Exclusive of VAT
  vatTotal: number;
  totalWithVat: number;
  discountAmount?: number;
  currency: string;      // 'SAR'
  pih: string;           // Previous Invoice Hash
  notes?: string;
}

export interface ZatcaApiCredentials {
  csid: string;
  csidSecret: string;
  environment: ZatcaEnvironment;
}

export interface ZatcaProcessResult {
  uuid: string;
  qrCode: string;         // base64 QR image
  xml: string;            // Signed UBL 2.1 XML
  xmlHash: string;        // SHA-256 base64
  status: 'Cleared' | 'Reported' | 'Pending' | 'Failed';
  zatcaResponse?: object;
  errorMessage?: string;
  clearedXml?: string;    // B2B cleared XML
  newPih: string;         // Updated PIH for next invoice
}

export const ZATCA_SANDBOX_BASE_URL = 'https://gw-fatoora.zatca.gov.sa/e-invoicing/developer-portal';
export const ZATCA_PRODUCTION_BASE_URL = 'https://gw-fatoora.zatca.gov.sa/e-invoicing/core';
export const ZATCA_VAT_RATE = 15;
export const ZATCA_INITIAL_PIH = 'NWZlY2ViNjZmZmM4NmYzOGQ5NTI3ODZjNmQ2OTZjOTljMmYxN2ZiNTVkMzRlYzYzMDMzNjE5YTM0ZGY4YjEwNw==';
