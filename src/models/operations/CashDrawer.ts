import mongoose, { Schema, Document } from 'mongoose';

export interface ICashDrawer extends Document {
  tenantId: mongoose.Types.ObjectId;
  branchId: mongoose.Types.ObjectId;
  cashierId: mongoose.Types.ObjectId;
  openedAt: Date;
  openingBalance: mongoose.Types.Decimal128;
  closedAt?: Date;
  closingBalance?: mongoose.Types.Decimal128;
  expectedBalance?: mongoose.Types.Decimal128;
  variance?: mongoose.Types.Decimal128;
  note?: string;
  status: 'open' | 'closed';
}

const cashDrawerSchema = new Schema<ICashDrawer>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
    },
    branchId: {
      type: Schema.Types.ObjectId,
      ref: 'Branch',
      required: true,
    },
    cashierId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    openedAt: {
      type: Date,
      default: Date.now,
    },
    openingBalance: {
      type: Schema.Types.Decimal128,
      required: true,
    },
    closedAt: Date,
    closingBalance: Schema.Types.Decimal128,
    expectedBalance: Schema.Types.Decimal128,
    variance: Schema.Types.Decimal128,
    note: String,
    status: {
      type: String,
      enum: ['open', 'closed'],
      default: 'open',
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

cashDrawerSchema.index({ tenantId: 1, branchId: 1, status: 1 }, { partialFilterExpression: { status: 'open' } });

export const CashDrawer = (mongoose.models.CashDrawer as mongoose.Model<ICashDrawer>) ||
  mongoose.model<ICashDrawer>('CashDrawer', cashDrawerSchema);