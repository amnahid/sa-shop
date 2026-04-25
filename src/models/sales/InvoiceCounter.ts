import mongoose, { Schema, Document } from 'mongoose';

export interface IInvoiceCounter extends Document {
  tenantId: mongoose.Types.ObjectId;
  branchId?: mongoose.Types.ObjectId;
  currentValue: number;
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
  },
  {
    timestamps: true,
  }
);

invoiceCounterSchema.index({ tenantId: 1, branchId: 1 }, { unique: true, partialFilterExpression: { branchId: { $exists: true } } });
invoiceCounterSchema.index({ tenantId: 1 }, { unique: true, partialFilterExpression: { branchId: { $exists: false } } });

export const InvoiceCounter = (mongoose.models.InvoiceCounter as mongoose.Model<IInvoiceCounter>) ||
  mongoose.model<IInvoiceCounter>('InvoiceCounter', invoiceCounterSchema);