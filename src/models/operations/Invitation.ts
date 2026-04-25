import mongoose, { Schema, Document } from 'mongoose';
import crypto from 'crypto';

export interface IInvitation extends Document {
  tenantId: mongoose.Types.ObjectId;
  email: string;
  role: 'owner' | 'manager' | 'cashier';
  branchIds: mongoose.Types.ObjectId[];
  invitedBy: mongoose.Types.ObjectId;
  token?: string;
  expiresAt: Date;
  acceptedAt?: Date;
  createdAt: Date;
}

const invitationSchema = new Schema<IInvitation>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    role: {
      type: String,
      enum: ['owner', 'manager', 'cashier'],
      required: true,
    },
    branchIds: [{
      type: Schema.Types.ObjectId,
      ref: 'Branch',
    }],
    invitedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    token: {
      type: String,
      unique: true,
      sparse: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      expires: 604800,
    },
    acceptedAt: Date,
  },
  {
    timestamps: true,
  }
);

invitationSchema.index({ tenantId: 1, email: 1 }, { partialFilterExpression: { acceptedAt: null } });

invitationSchema.methods.generateToken = function (): string {
  return crypto.randomBytes(32).toString('hex');
};

invitationSchema.methods.isExpired = function (): boolean {
  return this.expiresAt < new Date();
};

invitationSchema.methods.isValid = function (): boolean {
  return !this.isExpired() && !this.acceptedAt;
};

export const Invitation = (mongoose.models.Invitation as mongoose.Model<IInvitation>) ||
  mongoose.model<IInvitation>('Invitation', invitationSchema);