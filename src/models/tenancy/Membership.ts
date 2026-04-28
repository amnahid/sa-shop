import mongoose, { Schema, Document } from 'mongoose';

export interface IMembership extends Document {
  userId: mongoose.Types.ObjectId;
  tenantId: mongoose.Types.ObjectId;
  role: 'owner' | 'manager' | 'cashier';
  branchIds: mongoose.Types.ObjectId[];
  invitedBy?: mongoose.Types.ObjectId;
  invitedAt?: Date;
  acceptedAt?: Date;
  status: 'invited' | 'active' | 'suspended';
  permissionOverrides?: Map<string, boolean>;
  createdAt: Date;
  updatedAt: Date;
}

const membershipSchema = new Schema<IMembership>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
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
    },
    invitedAt: Date,
    acceptedAt: Date,
    status: {
      type: String,
      enum: ['invited', 'active', 'suspended'],
      default: 'active',
    },
    permissionOverrides: {
      type: Map,
      of: Boolean,
    },
  },
  {
    timestamps: true,
  }
);

membershipSchema.index({ userId: 1, tenantId: 1 }, { unique: true });
membershipSchema.index({ tenantId: 1, role: 1 });

export const Membership = (mongoose.models.Membership as mongoose.Model<IMembership>) ||
  mongoose.model<IMembership>('Membership', membershipSchema);
