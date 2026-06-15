import mongoose, { Schema, Document } from 'mongoose';

export interface IPayroll extends Document {
  tenantId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  month: number; // 1-12
  year: number;
  baseSalary: string;
  allowances: string;
  deductions: string;
  netSalary: string;
  status: 'draft' | 'paid' | 'void';
  paidAt?: Date;
  reference?: string; // Mudad/Bank reference
  createdAt: Date;
  updatedAt: Date;
}

const payrollSchema = new Schema<IPayroll>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    month: {
      type: Number,
      required: true,
      min: 1,
      max: 12,
    },
    year: {
      type: Number,
      required: true,
    },
    baseSalary: {
      type: String,
      required: true,
    },
    allowances: {
      type: String,
      default: '0',
    },
    deductions: {
      type: String,
      default: '0',
    },
    netSalary: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['draft', 'paid', 'void'],
      default: 'draft',
    },
    paidAt: Date,
    reference: String,
  },
  {
    timestamps: true,
  }
);

payrollSchema.index({ tenantId: 1, userId: 1, month: 1, year: 1 }, { unique: true });

export const Payroll = (mongoose.models.Payroll as mongoose.Model<IPayroll>) ||
  mongoose.model<IPayroll>('Payroll', payrollSchema);
