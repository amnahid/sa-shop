import mongoose, { Document, Schema } from "mongoose";

export type AccountType = "asset" | "liability" | "equity" | "revenue" | "expense";

export interface IChartOfAccount extends Document {
  tenantId: mongoose.Types.ObjectId;
  code: string;
  name: string;
  nameAr?: string;
  type: AccountType;
  description?: string;
  parentAccountId?: mongoose.Types.ObjectId;
  allowPosting: boolean;
  active: boolean;
  isSystem: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const chartOfAccountSchema = new Schema<IChartOfAccount>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true,
    },
    code: {
      type: String,
      required: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    nameAr: String,
    type: {
      type: String,
      enum: ["asset", "liability", "equity", "revenue", "expense"],
      required: true,
      index: true,
    },
    description: String,
    parentAccountId: {
      type: Schema.Types.ObjectId,
      ref: "ChartOfAccount",
    },
    allowPosting: {
      type: Boolean,
      default: true,
    },
    active: {
      type: Boolean,
      default: true,
      index: true,
    },
    isSystem: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

chartOfAccountSchema.index({ tenantId: 1, code: 1 }, { unique: true });
chartOfAccountSchema.index({ tenantId: 1, name: 1 });

export const ChartOfAccount =
  (mongoose.models.ChartOfAccount as mongoose.Model<IChartOfAccount>) ||
  mongoose.model<IChartOfAccount>("ChartOfAccount", chartOfAccountSchema);
