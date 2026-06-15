import mongoose, { Schema, Document } from 'mongoose';

export interface IEmployeeProfile extends Document {
  tenantId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  employeeId: string;
  jobTitle: string;
  department?: string;
  joinDate: Date;
  baseSalary: string;
  housingAllowance: string;
  transportAllowance: string;
  otherAllowances: string;
  gosiNumber?: string;
  bankIban?: string;
  active: boolean;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const employeeProfileSchema = new Schema<IEmployeeProfile>(
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
    employeeId: {
      type: String,
      required: true,
    },
    jobTitle: {
      type: String,
      required: true,
    },
    department: String,
    joinDate: {
      type: Date,
      required: true,
    },
    baseSalary: {
      type: String, // Decimal128 stored as string
      default: '0',
    },
    housingAllowance: {
      type: String,
      default: '0',
    },
    transportAllowance: {
      type: String,
      default: '0',
    },
    otherAllowances: {
      type: String,
      default: '0',
    },
    gosiNumber: String,
    bankIban: String,
    active: {
      type: Boolean,
      default: true,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

employeeProfileSchema.index({ tenantId: 1, userId: 1 }, { unique: true });
employeeProfileSchema.index({ tenantId: 1, employeeId: 1 }, { unique: true });

export const EmployeeProfile = (mongoose.models.EmployeeProfile as mongoose.Model<IEmployeeProfile>) ||
  mongoose.model<IEmployeeProfile>('EmployeeProfile', employeeProfileSchema);
