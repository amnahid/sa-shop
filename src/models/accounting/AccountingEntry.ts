import mongoose, { Document, Schema } from "mongoose";

export type AccountingEntryKind = "revenue" | "expense";
export type AccountingCounterpartyType = "none" | "customer" | "vendor";

export interface IAccountingEntry extends Document {
  tenantId: mongoose.Types.ObjectId;
  accountId: mongoose.Types.ObjectId;
  branchId?: mongoose.Types.ObjectId;
  kind: AccountingEntryKind;
  amount: number;
  entryDate: Date;
  referenceType?: "manual" | "invoice" | "purchase_order";
  referenceId?: string;
  counterpartyType: AccountingCounterpartyType;
  counterpartyName?: string;
  customerId?: mongoose.Types.ObjectId;
  supplierId?: mongoose.Types.ObjectId;
  notes?: string;
  status: "draft" | "posted";
  createdById: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const accountingEntrySchema = new Schema<IAccountingEntry>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true,
    },
    accountId: {
      type: Schema.Types.ObjectId,
      ref: "ChartOfAccount",
      required: true,
      index: true,
    },
    branchId: {
      type: Schema.Types.ObjectId,
      ref: "Branch",
    },
    kind: {
      type: String,
      enum: ["revenue", "expense"],
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      min: 0,
      required: true,
    },
    entryDate: {
      type: Date,
      default: Date.now,
      index: true,
    },
    referenceType: {
      type: String,
      enum: ["manual", "invoice", "purchase_order"],
      default: "manual",
    },
    referenceId: String,
    counterpartyType: {
      type: String,
      enum: ["none", "customer", "vendor"],
      default: "none",
    },
    counterpartyName: String,
    customerId: {
      type: Schema.Types.ObjectId,
      ref: "Customer",
    },
    supplierId: {
      type: Schema.Types.ObjectId,
      ref: "Supplier",
    },
    notes: String,
    status: {
      type: String,
      enum: ["draft", "posted"],
      default: "posted",
      index: true,
    },
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

accountingEntrySchema.index({ tenantId: 1, entryDate: -1 });
accountingEntrySchema.index({ tenantId: 1, kind: 1, entryDate: -1 });

export const AccountingEntry =
  (mongoose.models.AccountingEntry as mongoose.Model<IAccountingEntry>) ||
  mongoose.model<IAccountingEntry>("AccountingEntry", accountingEntrySchema);
