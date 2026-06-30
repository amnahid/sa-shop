import connectDB from '../lib/mongodb';

void connectDB().catch((err) => {
  console.error('MongoDB initial connection failed:', err);
});

export { Tenant } from './tenancy/Tenant';
export { Organization } from './tenancy/Organization';
export { User } from './tenancy/User';
export { Membership } from './tenancy/Membership';
export { Branch } from './tenancy/Branch';
export { TenantZatcaConfig } from './tenancy/TenantZatcaConfig';

export { Category } from './inventory/Category';
export { Product } from './inventory/Product';
export { StockLevel } from './inventory/StockLevel';
export { StockBatch } from './inventory/StockBatch';
export { StockMovement } from './inventory/StockMovement';

export { Invoice, type IInvoiceLine, type IInvoicePayment, type IInvoice } from './sales/Invoice';
export { InvoiceCounter } from './sales/InvoiceCounter';
export { Customer } from './sales/Customer';
export { Proposal, type IProposal, type ProposalStatus } from './sales/Proposal';
export { Retainer, type IRetainer, type RetainerStatus } from "./sales/Retainer";

export { Supplier } from './suppliers/Supplier';
export { PurchaseOrder } from './suppliers/PurchaseOrder';

export { EmployeeProfile } from './hr/EmployeeProfile';
export { Employee } from './hr/Employee';
export { SalaryPayment } from './hr/SalaryPayment';
export { Attendance } from './hr/Attendance';
export { Payroll } from './hr/Payroll';

export { ChartOfAccount } from './accounting/ChartOfAccount';
export { AccountingEntry } from './accounting/AccountingEntry';
export { PaymentRecord } from './accounting/PaymentRecord';
export { AccountingPeriodClose } from "./accounting/AccountingPeriodClose";

export { ParkedSale } from './operations/ParkedSale';
export { CashDrawer } from './operations/CashDrawer';
export { IdempotencyRecord } from './operations/IdempotencyRecord';
export { Invitation } from './operations/Invitation';
export { PasswordResetToken } from './operations/PasswordResetToken';
export { MediaAsset, type IMediaAsset, type MediaAssetStatus } from "./operations/MediaAsset";
export { EmailTemplate, type IEmailTemplate } from "./operations/EmailTemplate";
export { InboxEntry, type IInboxEntry, type InboxEntryStatus } from "./operations/InboxEntry";
export {
  NotificationTemplate,
  type INotificationTemplate,
  type NotificationChannel,
} from "./operations/NotificationTemplate";
export {
  WhatsAppConfig,
  type IWhatsAppConfig,
} from "./operations/WhatsAppConfig";
export {
  OutboundMessage,
  type IOutboundMessage,
  type OutboundChannel,
  type OutboundMessageStatus,
  type OutboundReferenceType,
} from "./operations/OutboundMessage";

export { AuditLog, logAudit, type IAuditLog } from './plugins/auditLog';
export { softDeletePlugin, type ISoftDelete } from './plugins/softDelete';
