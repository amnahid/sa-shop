import mongoose, { Schema, Document, Model } from "mongoose";

export interface IWhatsAppConfig extends Document {
  tenantId: mongoose.Types.ObjectId;
  phoneNumberId: string;
  businessAccountId: string;
  accessToken: string;
  fromPhoneNumber: string;
  isActive: boolean;
  updatedBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const WhatsAppConfigSchema = new Schema<IWhatsAppConfig>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      unique: true,
      index: true,
    },
    phoneNumberId: {
      type: String,
      required: true,
      trim: true,
    },
    businessAccountId: {
      type: String,
      required: true,
      trim: true,
    },
    accessToken: {
      type: String,
      required: true,
    },
    fromPhoneNumber: {
      type: String,
      required: true,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: false,
      index: true,
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

export const WhatsAppConfig =
  (mongoose.models.WhatsAppConfig as Model<IWhatsAppConfig>) ||
  mongoose.model<IWhatsAppConfig>("WhatsAppConfig", WhatsAppConfigSchema);
