import mongoose, { Schema, Document } from 'mongoose';

export interface IStockLevel extends Document {
  tenantId: mongoose.Types.ObjectId;
  productId: mongoose.Types.ObjectId;
  branchId: mongoose.Types.ObjectId;
  quantity: mongoose.Types.Decimal128;
  reservedQuantity: mongoose.Types.Decimal128;
  updatedAt: Date;
}

const stockLevelSchema = new Schema<IStockLevel>(
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
    quantity: {
      type: Schema.Types.Decimal128,
      required: true,
      default: 0,
    },
    reservedQuantity: {
      type: Schema.Types.Decimal128,
      default: 0,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: false,
  }
);

stockLevelSchema.index({ tenantId: 1, productId: 1, branchId: 1 }, { unique: true });
stockLevelSchema.index({ tenantId: 1, branchId: 1, updatedAt: -1 });

export const StockLevel = (mongoose.models.StockLevel as mongoose.Model<IStockLevel>) ||
  mongoose.model<IStockLevel>('StockLevel', stockLevelSchema);