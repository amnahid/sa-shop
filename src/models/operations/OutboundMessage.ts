import mongoose, { Schema, Document, Model } from "mongoose";

export type OutboundChannel = "whatsapp" | "sms";
export type OutboundMessageStatus = "queued" | "sent" | "failed";
export type OutboundReferenceType = "invoice" | "proposal";

export interface IOutboundMessage extends Document {
  tenantId: mongoose.Types.ObjectId;
  channel: OutboundChannel;
  recipientPhone: string;
  recipientName?: string;
  templateKey?: string;
  messageBody: string;
  referenceType: OutboundReferenceType;
  referenceId: string;
  status: OutboundMessageStatus;
  errorMessage?: string;
  sentAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const OutboundMessageSchema = new Schema<IOutboundMessage>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true,
    },
    channel: {
      type: String,
      enum: ["whatsapp", "sms"],
      default: "whatsapp",
    },
    recipientPhone: {
      type: String,
      required: true,
      trim: true,
    },
    recipientName: {
      type: String,
      trim: true,
    },
    templateKey: {
      type: String,
      trim: true,
    },
    messageBody: {
      type: String,
      required: true,
    },
    referenceType: {
      type: String,
      enum: ["invoice", "proposal"],
      required: true,
    },
    referenceId: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["queued", "sent", "failed"],
      default: "queued",
      index: true,
    },
    errorMessage: {
      type: String,
    },
    sentAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

OutboundMessageSchema.index({ tenantId: 1, createdAt: -1 });
OutboundMessageSchema.index({ tenantId: 1, referenceType: 1, referenceId: 1 });
OutboundMessageSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

export const OutboundMessage =
  (mongoose.models.OutboundMessage as Model<IOutboundMessage>) ||
  mongoose.model<IOutboundMessage>("OutboundMessage", OutboundMessageSchema);
