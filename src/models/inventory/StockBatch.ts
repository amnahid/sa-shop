import mongoose, { Schema, Document } from 'mongoose';

export interface IStockBatch extends Document {
  tenantId: mongoose.Types.ObjectId;
  productId: mongoose.Types.ObjectId;
  branchId: mongoose.Types.ObjectId;
  batchNumber: string;
  expiryDate?: Date;
  quantity: mongoose.Types.Decimal128;
  costPrice?: mongoose.Types.Decimal128;
  supplierId?: mongoose.Types.ObjectId;
  receivedAt?: Date;
  createdAt: Date;
}

const stockBatchSchema = new Schema<IStockBatch>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
    },
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    branchId: {
      type: Schema.Types.ObjectId,
      ref: 'Branch',
      required: true,
    },
    batchNumber: {
      type: String,
      required: true,
      trim: true,
    },
    expiryDate: Date,
    quantity: {
      type: Schema.Types.Decimal128,
      required: true,
      default: 0,
    },
    costPrice: Schema.Types.Decimal128,
    supplierId: {
      type: Schema.Types.ObjectId,
      ref: 'Supplier',
    },
    receivedAt: Date,
  },
  {
    timestamps: true,
  }
);

stockBatchSchema.index({ tenantId: 1, productId: 1, branchId: 1, expiryDate: 1 });
stockBatchSchema.index({ tenantId: 1, batchNumber: 1 }, { unique: true, sparse: true });

export const StockBatch = (mongoose.models.StockBatch as mongoose.Model<IStockBatch>) ||
  mongoose.model<IStockBatch>('StockBatch', stockBatchSchema);