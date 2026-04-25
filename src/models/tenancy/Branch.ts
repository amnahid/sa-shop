import mongoose, { Schema, Document } from 'mongoose';

export interface IBranch extends Document {
  tenantId: mongoose.Types.ObjectId;
  name: string;
  nameAr: string;
  address?: string;
  addressAr?: string;
  city?: string;
  region?: string;
  phone?: string;
  vatBranchCode?: string;
  isHeadOffice: boolean;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const branchSchema = new Schema<IBranch>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    nameAr: {
      type: String,
      required: true,
      trim: true,
    },
    address: String,
    addressAr: String,
    city: String,
    region: String,
    phone: String,
    vatBranchCode: String,
    isHeadOffice: {
      type: Boolean,
      default: false,
    },
    active: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

branchSchema.index({ tenantId: 1, name: 1 });
branchSchema.index({ tenantId: 1, isHeadOffice: 1 });

export const Branch = (mongoose.models.Branch as mongoose.Model<IBranch>) ||
  mongoose.model<IBranch>('Branch', branchSchema);