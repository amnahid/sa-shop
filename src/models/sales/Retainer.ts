import mongoose, { Document, Schema } from "mongoose";

export type RetainerStatus = "active" | "closed";

export interface IRetainerConsumption {
  invoiceId: mongoose.Types.ObjectId;
  invoiceNumber: string;
  amount: mongoose.Types.Decimal128;
  consumedAt: Date;
  consumedById: mongoose.Types.ObjectId;
}

const retainerConsumptionSchema = new Schema<IRetainerConsumption>(
  {
    invoiceId: {
      type: Schema.Types.ObjectId,
      ref: "Invoice",
      required: true,
    },
    invoiceNumber: {
      type: String,
      required: true,
    },
    amount: {
      type: Schema.Types.Decimal128,
      required: true,
    },
    consumedAt: {
      type: Date,
      default: Date.now,
    },
    consumedById: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { _id: false }
);

export interface IRetainer extends Document {
  tenantId: mongoose.Types.ObjectId;
  branchId: mongoose.Types.ObjectId;
  createdById: mongoose.Types.ObjectId;
  customerId: mongoose.Types.ObjectId;
  proposalId?: mongoose.Types.ObjectId;
  retainerNumber: string;
  title?: string;
  notes?: string;
  status: RetainerStatus;
  currency: string;
  totalAmount: mongoose.Types.Decimal128;
  consumedAmount: mongoose.Types.Decimal128;
  closedAt?: Date;
  closedById?: mongoose.Types.ObjectId;
  consumptions: IRetainerConsumption[];
  createdAt: Date;
  updatedAt: Date;
}

const retainerSchema = new Schema<IRetainer>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true,
    },
    branchId: {
      type: Schema.Types.ObjectId,
      ref: "Branch",
      required: true,
    },
    createdById: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },
    proposalId: {
      type: Schema.Types.ObjectId,
      ref: "Proposal",
    },
    retainerNumber: {
      type: String,
      required: true,
    },
    title: String,
    notes: String,
    status: {
      type: String,
      enum: ["active", "closed"],
      default: "active",
    },
    currency: {
      type: String,
      default: "SAR",
    },
    totalAmount: {
      type: Schema.Types.Decimal128,
      required: true,
    },
    consumedAmount: {
      type: Schema.Types.Decimal128,
      default: () => mongoose.Types.Decimal128.fromString("0"),
    },
    closedAt: Date,
    closedById: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    consumptions: [retainerConsumptionSchema],
  },
  { timestamps: true }
);

retainerSchema.index({ tenantId: 1, retainerNumber: 1 }, { unique: true });
retainerSchema.index({ tenantId: 1, status: 1, createdAt: -1 });
retainerSchema.index({ tenantId: 1, customerId: 1, createdAt: -1 });

export const Retainer = (mongoose.models.Retainer as mongoose.Model<IRetainer>) ||
  mongoose.model<IRetainer>("Retainer", retainerSchema);
