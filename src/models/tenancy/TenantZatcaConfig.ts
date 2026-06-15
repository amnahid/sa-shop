import mongoose, { Schema, Document, Model } from 'mongoose';

export type ZatcaEnvironment = 'sandbox' | 'production';

export interface IZatcaAddress {
  buildingNumber: string;
  streetName: string;
  district: string;
  city: string;
  postalCode: string;
  countryCode: string; // Always 'SA'
}

export interface ITenantZatcaConfig extends Document {
  tenantId: mongoose.Types.ObjectId;
  sellerName: string;        // English
  sellerNameAr: string;      // Arabic
  trn: string;               // 15-digit Tax Registration Number
  address: IZatcaAddress;
  environment: ZatcaEnvironment;
  complianceCsid?: string;
  complianceCsidSecret?: string;
  productionCsid?: string;
  productionCsidSecret?: string;
  privateKey?: string;       // ECDSA private key (should be encrypted in a real production environment)
  publicKey?: string;        // ECDSA public key
  csr?: string;              // Certificate Signing Request
  certificate?: string;      // X.509 certificate (base64)
  egsUuid?: string;          // Unique identifier for the EGS unit
  egsCustomId?: string;      // Custom ID for the EGS unit
  egsModel?: string;         // Model of the EGS unit
  crnNumber?: string;        // Commercial Registration Number (10 digits)
  isActive: boolean;
  updatedBy: mongoose.Types.ObjectId;
}

const ZatcaAddressSchema = new Schema<IZatcaAddress>(
  {
    buildingNumber: { type: String, required: true, trim: true },
    streetName: { type: String, required: true, trim: true },
    district: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    postalCode: { type: String, required: true, trim: true },
    countryCode: { type: String, default: 'SA' },
  },
  { _id: false }
);

const TenantZatcaConfigSchema = new Schema<ITenantZatcaConfig>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, unique: true, index: true },
    sellerName: { type: String, required: true, trim: true },
    sellerNameAr: { type: String, required: true, trim: true },
    trn: {
      type: String, required: true, trim: true,
      minlength: 15, maxlength: 15,
      validate: { validator: (v: string) => /^\d{15}$/.test(v), message: 'TRN must be exactly 15 digits' },
    },
    address: { type: ZatcaAddressSchema, required: true },
    environment: { type: String, enum: ['sandbox', 'production'], default: 'sandbox' },
    complianceCsid: { type: String },
    complianceCsidSecret: { type: String },
    productionCsid: { type: String },
    productionCsidSecret: { type: String },
    privateKey: { type: String },
    publicKey: { type: String },
    certificate: { type: String },
    egsUuid: { type: String },
    egsCustomId: { type: String },
    egsModel: { type: String },
    crnNumber: { type: String },
    isActive: { type: Boolean, default: true, index: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

export const TenantZatcaConfig = (mongoose.models.TenantZatcaConfig as Model<ITenantZatcaConfig>) ||
  mongoose.model<ITenantZatcaConfig>('TenantZatcaConfig', TenantZatcaConfigSchema);
