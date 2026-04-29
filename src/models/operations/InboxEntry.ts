import mongoose, { Document, Schema } from "mongoose";

export type InboxEntryStatus = "unread" | "read";

export interface IInboxEntry extends Document {
  tenantId: mongoose.Types.ObjectId;
  recipientUserId: mongoose.Types.ObjectId;
  templateKey?: string;
  type: string;
  title: string;
  message: string;
  linkUrl?: string;
  metadata?: Record<string, unknown>;
  status: InboxEntryStatus;
  readAt?: Date;
  createdById?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const inboxEntrySchema = new Schema<IInboxEntry>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true,
    },
    recipientUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    templateKey: {
      type: String,
      trim: true,
    },
    type: {
      type: String,
      required: true,
      trim: true,
      default: "system",
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
    },
    linkUrl: {
      type: String,
      trim: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
    status: {
      type: String,
      enum: ["unread", "read"],
      default: "unread",
      index: true,
    },
    readAt: {
      type: Date,
    },
    createdById: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

inboxEntrySchema.index({ tenantId: 1, recipientUserId: 1, status: 1, createdAt: -1 });
inboxEntrySchema.index({ tenantId: 1, createdAt: -1 });

export const InboxEntry =
  (mongoose.models.InboxEntry as mongoose.Model<IInboxEntry>) ||
  mongoose.model<IInboxEntry>("InboxEntry", inboxEntrySchema);

