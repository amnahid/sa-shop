import mongoose, { Schema, Document } from 'mongoose';

export interface IPurchaseOrderLine extends Document {
  productId: mongoose.Types.ObjectId;
  sku: string;
  name: string;
  quantityOrdered: number;
  quantityReceived: number;
  unitCost: number;
  totalCost: number;
}

const purchaseOrderLineSchema = new Schema<IPurchaseOrderLine>(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    sku: { type: String, required: true },
    name: { type: String, required: true },
    quantityOrdered: { type: Number, required: true },
    quantityReceived: { type: Number, default: 0 },
    unitCost: { type: Number, required: true },
    totalCost: { type: Number, required: true },
  },
  { _id: false }
);

export interface IPurchaseOrder extends Document {
  tenantId: mongoose.Types.ObjectId;
  supplierId: mongoose.Types.ObjectId;
  branchId: mongoose.Types.ObjectId;
  createdById: mongoose.Types.ObjectId;
  poNumber: string;
  status: 'draft' | 'submitted' | 'partially_received' | 'received' | 'cancelled';
  notes?: string;
  expectedDate?: Date;
  issuedAt: Date;
  deliveredAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  lines: IPurchaseOrderLine[];
}

const purchaseOrderSchema = new Schema<IPurchaseOrder>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
    },
    supplierId: {
      type: Schema.Types.ObjectId,
      ref: 'Supplier',
      required: true,
    },
    branchId: {
      type: Schema.Types.ObjectId,
      ref: 'Branch',
      required: true,
    },
    createdById: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    poNumber: {
      type: String,
      required: true,
      unique: true,
    },
    status: {
      type: String,
      enum: ['draft', 'submitted', 'partially_received', 'received', 'cancelled'],
      default: 'draft',
    },
    notes: String,
    expectedDate: Date,
    issuedAt: Date,
    deliveredAt: Date,
    lines: [purchaseOrderLineSchema],
  },
  { timestamps: true }
);

purchaseOrderSchema.index({ tenantId: 1, status: 1, issuedAt: -1 });
purchaseOrderSchema.index({ tenantId: 1, supplierId: 1 });

export const PurchaseOrder = (mongoose.models.PurchaseOrder as mongoose.Model<IPurchaseOrder>) ||
  mongoose.model<IPurchaseOrder>('PurchaseOrder', purchaseOrderSchema);