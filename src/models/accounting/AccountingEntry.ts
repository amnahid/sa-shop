import mongoose, { Document, Schema } from "mongoose";

export type AccountingEntryKind = "revenue" | "expense";
export type AccountingCounterpartyType = "none" | "customer" | "vendor";
export type AccountingEntryStatus = "draft" | "posted" | "void";

const ACCOUNTING_ENTRY_TRANSITIONS: Record<AccountingEntryStatus, AccountingEntryStatus[]> = {
  draft: ["posted", "void"],
  posted: ["void"],
  void: [],
};

const POSTED_MUTABLE_FIELDS = new Set([
  "status",
  "voidedAt",
  "voidedById",
  "voidReason",
  "updatedAt",
]);

export function canTransitionAccountingEntryStatus(
  from: AccountingEntryStatus,
  to: AccountingEntryStatus
) {
  if (from === to) return true;
  return ACCOUNTING_ENTRY_TRANSITIONS[from].includes(to);
}

export function canMutateAccountingEntry(
  currentStatus: AccountingEntryStatus,
  nextStatus: AccountingEntryStatus,
  modifiedFields: string[]
) {
  if (!canTransitionAccountingEntryStatus(currentStatus, nextStatus)) {
    return false;
  }

  if (currentStatus === "posted") {
    if (nextStatus !== "void") {
      return false;
    }
    return modifiedFields.every((field) => POSTED_MUTABLE_FIELDS.has(field));
  }

  if (currentStatus === "void") {
    return modifiedFields.length === 0;
  }

  return true;
}

function getUpdatedFields(update: Record<string, unknown>) {
  const directFields = Object.keys(update).filter((key) => !key.startsWith("$"));
  const setFields =
    update.$set && typeof update.$set === "object"
      ? Object.keys(update.$set as Record<string, unknown>)
      : [];
  return Array.from(new Set([...directFields, ...setFields]));
}

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
  status: AccountingEntryStatus;
  voidedAt?: Date;
  voidedById?: mongoose.Types.ObjectId;
  voidReason?: string;
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
      enum: ["draft", "posted", "void"],
      default: "draft",
      index: true,
    },
    voidedAt: Date,
    voidedById: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    voidReason: {
      type: String,
      maxlength: 250,
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

accountingEntrySchema.pre("save", async function () {
  if (this.isNew) {
    return;
  }

  const existing = await AccountingEntry.findById(this._id).select({ status: 1 }).lean();
  if (!existing) {
    return;
  }

  const nextStatus = this.status as AccountingEntryStatus;
  const modifiedFields = this.modifiedPaths();
  if (!canMutateAccountingEntry(existing.status as AccountingEntryStatus, nextStatus, modifiedFields)) {
    throw new Error("Posted accounting entries are immutable; only void transition is allowed");
  }
});

async function enforceQueryMutationRules(this: mongoose.Query<unknown, IAccountingEntry>) {
  const update = this.getUpdate();
  if (!update || typeof update !== "object") {
    return;
  }

  const existing = await this.model.findOne(this.getQuery()).select({ status: 1 }).lean();
  if (!existing) {
    return;
  }

  const updateObj = update as Record<string, unknown>;
  const setData = updateObj.$set && typeof updateObj.$set === "object" ? (updateObj.$set as Record<string, unknown>) : {};
  const rawNextStatus = setData.status ?? updateObj.status;
  const nextStatus = (rawNextStatus || existing.status) as AccountingEntryStatus;
  const modifiedFields = getUpdatedFields(updateObj);

  if (!canMutateAccountingEntry(existing.status as AccountingEntryStatus, nextStatus, modifiedFields)) {
    throw new Error("Posted accounting entries are immutable; only void transition is allowed");
  }
}

accountingEntrySchema.pre("findOneAndUpdate", enforceQueryMutationRules);
accountingEntrySchema.pre("updateOne", enforceQueryMutationRules);

export const AccountingEntry =
  (mongoose.models.AccountingEntry as mongoose.Model<IAccountingEntry>) ||
  mongoose.model<IAccountingEntry>("AccountingEntry", accountingEntrySchema);
