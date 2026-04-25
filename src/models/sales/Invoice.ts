import mongoose, { Schema, Document } from 'mongoose';

export interface IInvoiceLine {
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
  batchId?: mongoose.Types.ObjectId;
}

const invoiceLineSchema = new Schema<IInvoiceLine>(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    sku: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    nameAr: String,
    quantity: {
      type: Schema.Types.Decimal128,
      required: true,
    },
    unitPrice: {
      type: Schema.Types.Decimal128,
      required: true,
    },
    discountAmount: {
      type: Schema.Types.Decimal128,
      default: 0,
    },
    netAmount: {
      type: Schema.Types.Decimal128,
      required: true,
    },
    vatRate: {
      type: Number,
      enum: [0, 0.15],
      required: true,
    },
    vatAmount: {
      type: Schema.Types.Decimal128,
      required: true,
    },
    totalAmount: {
      type: Schema.Types.Decimal128,
      required: true,
    },
    batchId: {
      type: Schema.Types.ObjectId,
      ref: 'StockBatch',
    },
  },
  { _id: false }
);

export interface IInvoicePayment {
  method: 'cash' | 'mada' | 'visa' | 'mastercard' | 'amex' | 'stc_pay' | 'apple_pay' | 'tabby' | 'tamara' | 'bank_transfer' | 'store_credit';
  amount: mongoose.Types.Decimal128;
  referenceNumber?: string;
  receivedAt: Date;
}

const paymentSchema = new Schema<IInvoicePayment>(
  {
    method: {
      type: String,
      enum: ['cash', 'mada', 'visa', 'mastercard', 'amex', 'stc_pay', 'apple_pay', 'tabby', 'tamara', 'bank_transfer', 'store_credit'],
      required: true,
    },
    amount: {
      type: Schema.Types.Decimal128,
      required: true,
    },
    referenceNumber: String,
    receivedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

export interface IInvoice extends Document {
  tenantId: mongoose.Types.ObjectId;
  branchId: mongoose.Types.ObjectId;
  cashierId: mongoose.Types.ObjectId;
  invoiceNumber: string;
  invoiceType: 'simplified' | 'standard';
  status: 'draft' | 'completed' | 'voided' | 'refunded';
  uuid: string;
  issuedAt: Date;
  previousHash: string;
  invoiceHash: string;
  qrCode?: string;
  xmlPayload?: string;
  customerId?: mongoose.Types.ObjectId;
  customerVatNumber?: string;
  customerName?: string;
  customerAddress?: string;
  subtotal: mongoose.Types.Decimal128;
  discountTotal: mongoose.Types.Decimal128;
  vatTotal: mongoose.Types.Decimal128;
  grandTotal: mongoose.Types.Decimal128;
  payments: IInvoicePayment[];
  refundedInvoiceId?: mongoose.Types.ObjectId;
  voidedAt?: Date;
  voidedBy?: mongoose.Types.ObjectId;
  voidReason?: string;
  idempotencyKey?: string;
  lines: IInvoiceLine[];
  createdAt: Date;
  updatedAt: Date;
}

const invoiceSchema = new Schema<IInvoice>(
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
    invoiceNumber: {
      type: String,
      required: true,
    },
    invoiceType: {
      type: String,
      enum: ['simplified', 'standard'],
      default: 'simplified',
    },
    status: {
      type: String,
      enum: ['draft', 'completed', 'voided', 'refunded'],
      default: 'completed',
    },
    uuid: {
      type: String,
      required: true,
    },
    issuedAt: {
      type: Date,
      default: Date.now,
    },
    previousHash: String,
    invoiceHash: String,
    qrCode: String,
    xmlPayload: String,
    customerId: {
      type: Schema.Types.ObjectId,
      ref: 'Customer',
    },
    customerVatNumber: String,
    customerName: String,
    customerAddress: String,
    subtotal: {
      type: Schema.Types.Decimal128,
      required: true,
    },
    discountTotal: {
      type: Schema.Types.Decimal128,
      default: 0,
    },
    vatTotal: {
      type: Schema.Types.Decimal128,
      required: true,
    },
    grandTotal: {
      type: Schema.Types.Decimal128,
      required: true,
    },
    payments: [paymentSchema],
    refundedInvoiceId: {
      type: Schema.Types.ObjectId,
      ref: 'Invoice',
    },
    voidedAt: Date,
    voidedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    voidReason: String,
    idempotencyKey: String,
    lines: [invoiceLineSchema],
  },
  {
    timestamps: true,
  }
);

invoiceSchema.index({ tenantId: 1, invoiceNumber: 1 }, { unique: true });
invoiceSchema.index({ tenantId: 1, branchId: 1, issuedAt: -1 });
invoiceSchema.index({ tenantId: 1, status: 1, issuedAt: -1 });
invoiceSchema.index({ tenantId: 1, cashierId: 1, issuedAt: -1 });
invoiceSchema.index({ uuid: 1 }, { unique: true, sparse: true });

export const Invoice = (mongoose.models.Invoice as mongoose.Model<IInvoice>) ||
  mongoose.model<IInvoice>('Invoice', invoiceSchema);