import mongoose, { Document, Schema } from "mongoose";

export interface IEmailTemplate extends Document {
  tenantId: mongoose.Types.ObjectId;
  key: string;
  name: string;
  subject: string;
  htmlBody: string;
  textBody?: string;
  isActive: boolean;
  updatedById?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const emailTemplateSchema = new Schema<IEmailTemplate>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true,
    },
    key: {
      type: String,
      required: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
    },
    htmlBody: {
      type: String,
      required: true,
    },
    textBody: String,
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    updatedById: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

emailTemplateSchema.index({ tenantId: 1, key: 1 }, { unique: true });
emailTemplateSchema.index({ tenantId: 1, isActive: 1, updatedAt: -1 });

export const EmailTemplate =
  (mongoose.models.EmailTemplate as mongoose.Model<IEmailTemplate>) ||
  mongoose.model<IEmailTemplate>("EmailTemplate", emailTemplateSchema);
