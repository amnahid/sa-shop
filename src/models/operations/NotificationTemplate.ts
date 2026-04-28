import mongoose, { Document, Schema } from "mongoose";

export type NotificationChannel = "in_app" | "sms" | "whatsapp" | "push";

export interface INotificationTemplate extends Document {
  tenantId: mongoose.Types.ObjectId;
  key: string;
  name: string;
  channel: NotificationChannel;
  title: string;
  message: string;
  variables: string[];
  isActive: boolean;
  updatedById?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const notificationTemplateSchema = new Schema<INotificationTemplate>(
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
    channel: {
      type: String,
      enum: ["in_app", "sms", "whatsapp", "push"],
      default: "in_app",
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
    variables: [
      {
        type: String,
        trim: true,
      },
    ],
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

notificationTemplateSchema.index({ tenantId: 1, key: 1 }, { unique: true });
notificationTemplateSchema.index({ tenantId: 1, channel: 1, updatedAt: -1 });

export const NotificationTemplate =
  (mongoose.models.NotificationTemplate as mongoose.Model<INotificationTemplate>) ||
  mongoose.model<INotificationTemplate>("NotificationTemplate", notificationTemplateSchema);
