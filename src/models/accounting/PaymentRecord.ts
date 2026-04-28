import mongoose, { Document, Schema } from "mongoose";

export type PaymentPartyType = "customer" | "vendor";
export type PaymentDirection = "in" | "out";

export interface IPaymentRecord extends Document {
  tenantId: mongoose.Types.ObjectId;
  partyType: PaymentPartyType;
  direction: PaymentDirection;
  customerId?: mongoose.Types.ObjectId;
  supplierId?: mongoose.Types.ObjectId;
  partyName: string;
  amount: number;
  paymentDate: Date;
  method:
    | "cash"
    | "mada"
    | "visa"
    | "mastercard"
    | "bank_transfer"
    | "stc_pay"
    | "other";
  referenceNumber?: string;
  status: "pending" | "completed";
  notes?: string;
  createdById: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const paymentRecordSchema = new Schema<IPaymentRecord>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true,
    },
    partyType: {
      type: String,
      enum: ["customer", "vendor"],
      required: true,
      index: true,
    },
    direction: {
      type: String,
      enum: ["in", "out"],
      required: true,
      index: true,
    },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: "Customer",
    },
    supplierId: {
      type: Schema.Types.ObjectId,
      ref: "Supplier",
    },
    partyName: {
      type: String,
      required: true,
      trim: true,
    },
    amount: {
      type: Number,
      min: 0,
      required: true,
    },
    paymentDate: {
      type: Date,
      default: Date.now,
      index: true,
    },
    method: {
      type: String,
      enum: ["cash", "mada", "visa", "mastercard", "bank_transfer", "stc_pay", "other"],
      default: "cash",
    },
    referenceNumber: String,
    status: {
      type: String,
      enum: ["pending", "completed"],
      default: "completed",
      index: true,
    },
    notes: String,
    createdById: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

paymentRecordSchema.index({ tenantId: 1, partyType: 1, paymentDate: -1 });
paymentRecordSchema.index({ tenantId: 1, direction: 1, paymentDate: -1 });

export const PaymentRecord =
  (mongoose.models.PaymentRecord as mongoose.Model<IPaymentRecord>) ||
  mongoose.model<IPaymentRecord>("PaymentRecord", paymentRecordSchema);
