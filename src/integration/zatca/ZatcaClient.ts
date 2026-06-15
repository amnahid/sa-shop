import { EGS, EGSUnitInfo, ZATCAInvoice, ZATCAInvoiceTypes, ZATCAPaymentMethods } from 'zatca-xml-ts';
import { ITenantZatcaConfig } from '@/models/tenancy/TenantZatcaConfig';
import { 
  ZatcaInvoiceData, 
  ZatcaProcessResult, 
  ZATCA_INITIAL_PIH 
} from './types';

export class ZatcaClient {
  private egs: EGS;
  private config: ITenantZatcaConfig;

  constructor(config: ITenantZatcaConfig) {
    this.config = config;
    
    // ZATCA expects certain formats. 
    // EGS Serial Number (uuid) should be a unique identifier for this unit.
    const egsUnit: EGSUnitInfo = {
      uuid: config.egsUuid || '12345678-1234-4123-a123-1234567890ab', 
      custom_id: config.egsCustomId || config.trn, 
      model: config.egsModel || 'V1',
      CRN_number: config.crnNumber || '1010000000', 
      VAT_name: config.sellerName,
      VAT_number: config.trn,
      branch_name: 'Main', // Can be customized if needed
      branch_industry: 'Retail',
      location: {
        city: config.address.city,
        city_subdivision: config.address.district,
        street: config.address.streetName,
        building: config.address.buildingNumber,
        plot_identification: '1234',
        postal_zone: config.address.postalCode,
      },
      private_key: config.privateKey,
      csr: config.csr,
      compliance_certificate: config.certificate, 
      compliance_api_secret: config.complianceCsidSecret,
      production_certificate: config.productionCsid,
      production_api_secret: config.productionCsidSecret,
    };

    const env = config.environment === 'production' ? 'production' : 'simulation';
    this.egs = new EGS(egsUnit, env);
  }

  /**
   * Step 1 & 2: Generate Keys and CSR
   */
  async generateKeysAndCSR(solutionName: string = 'SAShop'): Promise<{ privateKey: string; csr: string }> {
    const isProduction = this.config.environment === 'production';
    await this.egs.generateNewKeysAndCSR(isProduction, solutionName);
    const info = this.egs.get();
    return {
      privateKey: info.private_key || '',
      csr: info.csr || '',
    };
  }

  /**
   * Step 3: Issue Compliance CSID
   */
  async issueComplianceCertificate(otp: string): Promise<string> {
    return await this.egs.issueComplianceCertificate(String(otp).trim());
  }

  /**
   * Step 4: Issue Production CSID
   */
  async issueProductionCertificate(complianceRequestId: string): Promise<string> {
    return await this.egs.issueProductionCertificate(complianceRequestId);
  }

  /**
   * Process (Sign & Submit) an invoice
   */
  async processInvoice(data: ZatcaInvoiceData): Promise<ZatcaProcessResult> {
    const isStandard = data.invoiceType === 'Standard';
    const invoiceType = ZATCAInvoiceTypes.INVOICE; 
    const invoiceCode = isStandard ? '0100000' : '0200000';

    const props: Record<string, unknown> = {
      egs_info: {
        ...this.egs.get(),
        customer_info: {
          buyer_name: data.buyer.name,
          vat_number: data.buyer.trn,
          street: data.buyer.streetName || 'Street',
          building: data.buyer.buildingNumber || '1234',
          city: data.buyer.city || 'Riyadh',
          city_subdivision: data.buyer.district || 'District',
          postal_zone: data.buyer.postalCode || '12345',
          CRN_number: data.buyer.otherId?.id || (isStandard && !data.buyer.trn ? '1010000001' : undefined),
        }
      },
      invoice_type: invoiceType,
      invoice_code: invoiceCode as "0100000" | "0200000",
      invoice_counter_number: 1, 
      invoice_serial_number: data.invoiceNumber || data.uuid.substring(0, 8),
      uuid: data.uuid,
      issue_date: data.issueDate.toISOString().split('T')[0],
      issue_time: data.issueDate.toISOString().split('T')[1].split('.')[0],
      actual_delivery_date: (data.supplyDate || data.issueDate).toISOString().split('T')[0],
      previous_invoice_hash: data.pih || ZATCA_INITIAL_PIH,
      payment_method: ZATCAPaymentMethods.CASH,
      line_items: data.lineItems.map((item, index) => ({
        id: String(index + 1),
        name: item.name,
        quantity: item.quantity,
        tax_exclusive_price: item.unitPrice,
        VAT_percent: (item.vatRate / 100) as 0.15 | 0.05,
      })),
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const invoice = new ZATCAInvoice({ props: props as any });

    // Sign the invoice
    const isProduction = !!this.config.productionCsid;
    const { signed_invoice_string, invoice_hash, qr } = this.egs.signInvoice(invoice, isProduction);

    let status: ZatcaProcessResult['status'] = 'Pending';
    let zatcaResponse: Record<string, unknown> | undefined;
    let clearedXml: string | undefined;

    try {
      if (isProduction) {
        if (isStandard) {
          zatcaResponse = await this.egs.clearanceInvoice(signed_invoice_string, invoice_hash);
          status = 'Cleared';
          if (zatcaResponse && typeof zatcaResponse === 'object' && 'clearedInvoice' in zatcaResponse) {
              clearedXml = Buffer.from(zatcaResponse.clearedInvoice as string, 'base64').toString('utf8');
          }
        } else {
          zatcaResponse = await this.egs.reportInvoice(signed_invoice_string, invoice_hash);
          status = 'Reported';
        }
      } else {
          // Simulation/Sandbox: typically just signed locally unless explicitly reporting
          status = 'Pending';
      }
    } catch (error) {
      status = 'Failed';
      console.error('ZATCA: Processing failed:', error);
      // We still return the signed XML even if reporting fails, for record keeping
    }

    return {
      uuid: data.uuid,
      qrCode: qr,
      xml: clearedXml || signed_invoice_string,
      xmlHash: invoice_hash,
      status,
      zatcaResponse,
      newPih: invoice_hash,
    };
  }
}
