import connectDB from '../lib/mongodb';

void connectDB().catch((err) => {
  console.error('MongoDB initial connection failed:', err);
});

export { Tenant } from './tenancy/Tenant';
export { Organization } from './tenancy/Organization';
export { User } from './tenancy/User';
export { Membership } from './tenancy/Membership';
export { Branch } from './tenancy/Branch';

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
export {
  NotificationTemplate,
  type INotificationTemplate,
  type NotificationChannel,
} from "./operations/NotificationTemplate";

export { AuditLog, logAudit, type IAuditLog } from './plugins/auditLog';
export { softDeletePlugin, type ISoftDelete } from './plugins/softDelete';
