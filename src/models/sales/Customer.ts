import mongoose, { Schema, Document } from 'mongoose';

export interface ICustomer extends Document {
  tenantId: mongoose.Types.ObjectId;
  name: string;
  nameAr?: string;
  phone?: string;
  email?: string;
  vatNumber?: string;
  addressLines?: string;
  city?: string;
  nationality?: string;
  birthDate?: Date;
  totalSpent: mongoose.Types.Decimal128;
  visitCount: number;
  lastVisitAt?: Date;
  pdplConsent?: {
    givenAt: Date;
    version: string;
    ipAddress: string;
  };
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const customerSchema = new Schema<ICustomer>(
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
    nameAr: String,
    phone: String,
    email: String,
    vatNumber: String,
    addressLines: String,
    city: String,
    nationality: String,
    birthDate: Date,
    totalSpent: {
      type: Schema.Types.Decimal128,
      default: 0,
    },
    visitCount: {
      type: Number,
      default: 0,
    },
    lastVisitAt: Date,
    pdplConsent: {
      givenAt: Date,
      version: String,
      ipAddress: String,
    },
    deletedAt: {
      type: Date,
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

customerSchema.index({ tenantId: 1, phone: 1 }, { unique: true, sparse: true });
customerSchema.index({ tenantId: 1, name: 1 });
customerSchema.index({ tenantId: 1, email: 1 }, { sparse: true });

export const Customer = (mongoose.models.Customer as mongoose.Model<ICustomer>) ||
  mongoose.model<ICustomer>('Customer', customerSchema);