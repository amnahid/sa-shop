import mongoose, { Schema, Document } from 'mongoose';

export interface IIdempotencyRecord extends Document {
  key: string;
  tenantId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  responseBody: Record<string, unknown>;
  createdAt: Date;
}

const idempotencyRecordSchema = new Schema<IIdempotencyRecord>(
  {
    key: {
      type: String,
      required: true,
      unique: true,
    },
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    responseBody: {
      type: Schema.Types.Mixed,
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      expires: 86400,
    },
  },
  {
    timestamps: false,
  }
);

idempotencyRecordSchema.index({ tenantId: 1, key: 1 }, { unique: true });

export const IdempotencyRecord = (mongoose.models.IdempotencyRecord as mongoose.Model<IIdempotencyRecord>) ||
  mongoose.model<IIdempotencyRecord>('IdempotencyRecord', idempotencyRecordSchema);