import mongoose, { Document, Schema } from "mongoose";

export interface IAccountingPeriodClose extends Document {
  tenantId: mongoose.Types.ObjectId;
  periodKey: string;
  periodStart: Date;
  periodEnd: Date;
  closedAt: Date;
  closedById: mongoose.Types.ObjectId;
  notes?: string;
}

const accountingPeriodCloseSchema = new Schema<IAccountingPeriodClose>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true,
    },
    periodKey: {
      type: String,
      required: true,
      trim: true,
      match: /^\d{4}-\d{2}$/,
    },
    periodStart: {
      type: Date,
      required: true,
      index: true,
    },
    periodEnd: {
      type: Date,
      required: true,
      index: true,
    },
    closedAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
    closedById: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    notes: {
      type: String,
      maxlength: 500,
    },
  },
  { timestamps: true }
);

accountingPeriodCloseSchema.index({ tenantId: 1, periodKey: 1 }, { unique: true });
accountingPeriodCloseSchema.index({ tenantId: 1, periodStart: 1, periodEnd: 1 });

export const AccountingPeriodClose =
  (mongoose.models.AccountingPeriodClose as mongoose.Model<IAccountingPeriodClose>) ||
  mongoose.model<IAccountingPeriodClose>("AccountingPeriodClose", accountingPeriodCloseSchema);
