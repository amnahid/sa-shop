import mongoose, { Schema, Document } from 'mongoose';

export interface IStockMovement extends Document {
  tenantId: mongoose.Types.ObjectId;
  productId: mongoose.Types.ObjectId;
  branchId: mongoose.Types.ObjectId;
  batchId?: mongoose.Types.ObjectId;
  type: 'sale' | 'refund' | 'purchase' | 'adjustment' | 'transfer_out' | 'transfer_in' | 'waste' | 'expired';
  quantityDelta: mongoose.Types.Decimal128;
  quantityAfter: mongoose.Types.Decimal128;
  refCollection?: string;
  refId?: mongoose.Types.ObjectId;
  reason?: string;
  userId: mongoose.Types.ObjectId;
  createdAt: Date;
}

const stockMovementSchema = new Schema<IStockMovement>(
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
    batchId: {
      type: Schema.Types.ObjectId,
      ref: 'StockBatch',
    },
    type: {
      type: String,
      enum: ['sale', 'refund', 'purchase', 'adjustment', 'transfer_out', 'transfer_in', 'waste', 'expired'],
      required: true,
    },
    quantityDelta: {
      type: Schema.Types.Decimal128,
      required: true,
    },
    quantityAfter: {
      type: Schema.Types.Decimal128,
      required: true,
    },
    refCollection: String,
    refId: Schema.Types.ObjectId,
    reason: String,
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

stockMovementSchema.index({ tenantId: 1, productId: 1, createdAt: -1 });
stockMovementSchema.index({ tenantId: 1, branchId: 1, createdAt: -1 });
stockMovementSchema.index({ tenantId: 1, type: 1, createdAt: -1 });

export const StockMovement = (mongoose.models.StockMovement as mongoose.Model<IStockMovement>) ||
  mongoose.model<IStockMovement>('StockMovement', stockMovementSchema);