import mongoose, { Document, Schema } from "mongoose";

export type ProposalStatus = "draft" | "sent" | "accepted" | "rejected" | "converted";

export interface IProposalLine {
  productId: mongoose.Types.ObjectId;
  sku: string;
  name: string;
  quantity: number;
  unitPrice: mongoose.Types.Decimal128;
  vatRate: number;
  lineSubtotal: mongoose.Types.Decimal128;
  lineVatAmount: mongoose.Types.Decimal128;
  lineTotal: mongoose.Types.Decimal128;
}

const proposalLineSchema = new Schema<IProposalLine>(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    sku: { type: String, required: true },
    name: { type: String, required: true },
    quantity: { type: Number, required: true },
    unitPrice: { type: Schema.Types.Decimal128, required: true },
    vatRate: { type: Number, enum: [0, 0.15], required: true },
    lineSubtotal: { type: Schema.Types.Decimal128, required: true },
    lineVatAmount: { type: Schema.Types.Decimal128, required: true },
    lineTotal: { type: Schema.Types.Decimal128, required: true },
  },
  { _id: false }
);

export interface IProposal extends Document {
  tenantId: mongoose.Types.ObjectId;
  branchId: mongoose.Types.ObjectId;
  createdById: mongoose.Types.ObjectId;
  proposalNumber: string;
  title?: string;
  customerId?: mongoose.Types.ObjectId;
  customerName?: string;
  customerVatNumber?: string;
  status: ProposalStatus;
  issuedAt: Date;
  validUntil?: Date;
  notes?: string;
  currency: string;
  subtotal: mongoose.Types.Decimal128;
  vatTotal: mongoose.Types.Decimal128;
  grandTotal: mongoose.Types.Decimal128;
  convertedAt?: Date;
  convertedById?: mongoose.Types.ObjectId;
  lines: IProposalLine[];
  createdAt: Date;
  updatedAt: Date;
}

const proposalSchema = new Schema<IProposal>(
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
    proposalNumber: {
      type: String,
      required: true,
    },
    title: String,
    customerId: {
      type: Schema.Types.ObjectId,
      ref: "Customer",
    },
    customerName: String,
    customerVatNumber: String,
    status: {
      type: String,
      enum: ["draft", "sent", "accepted", "rejected", "converted"],
      default: "draft",
    },
    issuedAt: {
      type: Date,
      default: Date.now,
    },
    validUntil: Date,
    notes: String,
    currency: {
      type: String,
      default: "SAR",
    },
    subtotal: {
      type: Schema.Types.Decimal128,
      required: true,
    },
    vatTotal: {
      type: Schema.Types.Decimal128,
      required: true,
    },
    grandTotal: {
      type: Schema.Types.Decimal128,
      required: true,
    },
    convertedAt: Date,
    convertedById: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    lines: [proposalLineSchema],
  },
  { timestamps: true }
);

proposalSchema.index({ tenantId: 1, proposalNumber: 1 }, { unique: true });
proposalSchema.index({ tenantId: 1, status: 1, issuedAt: -1 });
proposalSchema.index({ tenantId: 1, branchId: 1, issuedAt: -1 });

export const Proposal = (mongoose.models.Proposal as mongoose.Model<IProposal>) ||
  mongoose.model<IProposal>("Proposal", proposalSchema);
