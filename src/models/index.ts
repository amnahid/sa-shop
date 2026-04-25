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

export { Supplier } from './suppliers/Supplier';
export { PurchaseOrder } from './suppliers/PurchaseOrder';

export { ParkedSale } from './operations/ParkedSale';
export { CashDrawer } from './operations/CashDrawer';
export { IdempotencyRecord } from './operations/IdempotencyRecord';
export { Invitation } from './operations/Invitation';
export { PasswordResetToken } from './operations/PasswordResetToken';

export { AuditLog, logAudit, type IAuditLog } from './plugins/auditLog';
export { softDeletePlugin, type ISoftDelete } from './plugins/softDelete';