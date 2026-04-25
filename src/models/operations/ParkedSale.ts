import mongoose, { Schema, Document } from 'mongoose';

export interface IParkedSaleLine {
  productId: mongoose.Types.ObjectId;
  sku: string;
  name: string;
  nameAr?: string;
  quantity: mongoose.Types.Decimal128;
  unitPrice: mongoose.Types.Decimal128;
  discountAmount: mongoose.Types.Decimal128;
  netAmount: mongoose.Types.Decimal128;
  vatRate: number;
  vatAmount: mongoose.Types.Decimal128;
  totalAmount: mongoose.Types.Decimal128;
}

export interface IParkedSale extends Document {
  tenantId: mongoose.Types.ObjectId;
  branchId: mongoose.Types.ObjectId;
  cashierId: mongoose.Types.ObjectId;
  customerId?: mongoose.Types.ObjectId;
  lines: IParkedSaleLine[];
  note?: string;
  createdAt: Date;
  expiresAt: Date;
}

const parkedSaleLineSchema = new Schema<IParkedSaleLine>(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    sku: { type: String, required: true },
    name: { type: String, required: true },
    nameAr: String,
    quantity: { type: Schema.Types.Decimal128, required: true },
    unitPrice: { type: Schema.Types.Decimal128, required: true },
    discountAmount: { type: Schema.Types.Decimal128, default: 0 },
    netAmount: { type: Schema.Types.Decimal128, required: true },
    vatRate: { type: Number, required: true },
    vatAmount: { type: Schema.Types.Decimal128, required: true },
    totalAmount: { type: Schema.Types.Decimal128, required: true },
  },
  { _id: false }
);

const parkedSaleSchema = new Schema<IParkedSale>(
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
    customerId: {
      type: Schema.Types.ObjectId,
      ref: 'Customer',
    },
    lines: [parkedSaleLineSchema],
    note: String,
    expiresAt: {
      type: Date,
      expires: 86400,
    },
  },
  {
    timestamps: true,
  }
);

parkedSaleSchema.index({ tenantId: 1, branchId: 1, cashierId: 1, createdAt: -1 });

export const ParkedSale = (mongoose.models.ParkedSale as mongoose.Model<IParkedSale>) ||
  mongoose.model<IParkedSale>('ParkedSale', parkedSaleSchema);