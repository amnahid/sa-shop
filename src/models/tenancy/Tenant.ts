import mongoose, { Schema, Document } from 'mongoose';

export interface ITenant extends Document {
  organizationId?: mongoose.Types.ObjectId;
  name: string;
  nameAr: string;
  vatNumber?: string;
  crNumber?: string;
  address?: string;
  addressAr?: string;
  phone?: string;
  email?: string;
  logoUrl?: string;
  baseCurrency: string;
  timezone: string;
  defaultLanguage: 'ar' | 'en';
  vatRegistered: boolean;
  zatcaPhase: 1 | 2;
  zatcaCsid?: string;
  zatcaSolutionId?: string;
  zatcaCertificateId?: string;
  plan: 'starter' | 'growth' | 'pro' | 'enterprise';
  planExpiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const tenantSchema = new Schema<ITenant>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
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
    vatNumber: {
      type: String,
      unique: true,
      sparse: true,
      match: [/^3\d{13}3$/, 'Invalid VAT number format'],
    },
    crNumber: {
      type: String,
      sparse: true,
    },
    address: String,
    addressAr: String,
    phone: String,
    email: String,
    logoUrl: String,
    baseCurrency: {
      type: String,
      default: 'SAR',
    },
    timezone: {
      type: String,
      default: 'Asia/Riyadh',
    },
    defaultLanguage: {
      type: String,
      enum: ['ar', 'en'],
      default: 'en',
    },
    vatRegistered: {
      type: Boolean,
      default: false,
    },
    zatcaPhase: {
      type: Number,
      enum: [1, 2],
      default: 1,
    },
    zatcaCsid: String,
    zatcaSolutionId: String,
    zatcaCertificateId: String,
    plan: {
      type: String,
      enum: ['starter', 'growth', 'pro', 'enterprise'],
      default: 'starter',
    },
    planExpiresAt: Date,
  },
  {
    timestamps: true,
  }
);

tenantSchema.index({ createdAt: -1 });

export const Tenant = (mongoose.models.Tenant as mongoose.Model<ITenant>) || 
  mongoose.model<ITenant>('Tenant', tenantSchema);