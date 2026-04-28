import mongoose, { Document, Schema } from "mongoose";

export type MediaAssetStatus = "active" | "archived";

export interface IMediaAsset extends Document {
  tenantId: mongoose.Types.ObjectId;
  uploadedById?: mongoose.Types.ObjectId;
  name: string;
  fileName: string;
  url: string;
  mimeType: string;
  kind: "image" | "document" | "other";
  sizeBytes: number;
  tags: string[];
  altText?: string;
  status: MediaAssetStatus;
  createdAt: Date;
  updatedAt: Date;
}

const mediaAssetSchema = new Schema<IMediaAsset>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true,
    },
    uploadedById: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    fileName: {
      type: String,
      required: true,
      trim: true,
    },
    url: {
      type: String,
      required: true,
      trim: true,
    },
    mimeType: {
      type: String,
      required: true,
      trim: true,
      default: "application/octet-stream",
    },
    kind: {
      type: String,
      enum: ["image", "document", "other"],
      default: "other",
      index: true,
    },
    sizeBytes: {
      type: Number,
      default: 0,
      min: 0,
    },
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
    altText: String,
    status: {
      type: String,
      enum: ["active", "archived"],
      default: "active",
      index: true,
    },
  },
  { timestamps: true }
);

mediaAssetSchema.index({ tenantId: 1, status: 1, createdAt: -1 });
mediaAssetSchema.index({ tenantId: 1, fileName: 1 });

export const MediaAsset =
  (mongoose.models.MediaAsset as mongoose.Model<IMediaAsset>) ||
  mongoose.model<IMediaAsset>("MediaAsset", mediaAssetSchema);
