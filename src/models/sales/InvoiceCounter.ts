import mongoose, { Schema, Document } from 'mongoose';

export interface IInvoiceCounter extends Document {
  tenantId: mongoose.Types.ObjectId;
  branchId?: mongoose.Types.ObjectId;
  currentValue: number;
  previousInvoiceHash: string;
}

const invoiceCounterSchema = new Schema<IInvoiceCounter>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
    },
    branchId: {
      type: Schema.Types.ObjectId,
      ref: 'Branch',
    },
    currentValue: {
      type: Number,
      required: true,
      default: 0,
    },
    previousInvoiceHash: {
      type: String,
      default: 'NWZlY2ViNjZmZmM4NmYzOGQ5NTI3ODZjNmQ2OTZjOTljMmYxN2ZiNTVkMzRlYzYzMDMzNjE5YTM0ZGY4YjEwNw==', // ZATCA Initial PIH
    },
  },
  {
    timestamps: true,
  }
);

invoiceCounterSchema.index({ tenantId: 1, branchId: 1 }, { unique: true, partialFilterExpression: { branchId: { $exists: true } } });
invoiceCounterSchema.index({ tenantId: 1 }, { unique: true, partialFilterExpression: { branchId: { $exists: false } } });

export const InvoiceCounter = (mongoose.models.InvoiceCounter as mongoose.Model<IInvoiceCounter>) ||
  mongoose.model<IInvoiceCounter>('InvoiceCounter', invoiceCounterSchema);