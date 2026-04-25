import mongoose, { Schema, Document } from 'mongoose';

export interface IProduct extends Document {
  tenantId: mongoose.Types.ObjectId;
  sku: string;
  barcode?: string;
  name: string;
  nameAr?: string;
  description?: string;
  descriptionAr?: string;
  categoryId?: mongoose.Types.ObjectId;
  unit: 'piece' | 'kg' | 'g' | 'l' | 'ml' | 'pack';
  sellingPrice: mongoose.Types.Decimal128;
  vatRate: number;
  vatInclusivePrice: boolean;
  costPrice?: mongoose.Types.Decimal128;
  imageUrls: string[];
  trackStock: boolean;
  lowStockThreshold: number;
  expiryTracking: boolean;
  active: boolean;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const productSchema = new Schema<IProduct>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
    },
    sku: {
      type: String,
      required: true,
      trim: true,
    },
    barcode: {
      type: String,
      sparse: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    nameAr: String,
    description: String,
    descriptionAr: String,
    categoryId: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
    },
    unit: {
      type: String,
      enum: ['piece', 'kg', 'g', 'l', 'ml', 'pack'],
      default: 'piece',
    },
    sellingPrice: {
      type: Schema.Types.Decimal128,
      required: true,
    },
    vatRate: {
      type: Number,
      enum: [0, 0.15, null],
      default: 0.15,
    },
    vatInclusivePrice: {
      type: Boolean,
      default: true,
    },
    costPrice: Schema.Types.Decimal128,
    imageUrls: [{
      type: String,
    }],
    trackStock: {
      type: Boolean,
      default: true,
    },
    lowStockThreshold: {
      type: Number,
      default: 10,
    },
    expiryTracking: {
      type: Boolean,
      default: false,
    },
    active: {
      type: Boolean,
      default: true,
      index: true,
    },
    deletedAt: {
      type: Date,
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

productSchema.index({ tenantId: 1, sku: 1 }, { unique: true, partialFilterExpression: { deletedAt: null } });
productSchema.index({ tenantId: 1, barcode: 1 }, { unique: true, sparse: true });
productSchema.index({ tenantId: 1, categoryId: 1, active: 1 });
productSchema.index({ tenantId: 1, name: 'text' });

export const Product = (mongoose.models.Product as mongoose.Model<IProduct>) ||
  mongoose.model<IProduct>('Product', productSchema);