import mongoose, { Schema, Document } from 'mongoose';

export interface IOrganization extends Document {
  name: string;
  ownerUserId: mongoose.Types.ObjectId;
  createdAt: Date;
}

const organizationSchema = new Schema<IOrganization>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    ownerUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

export const Organization = (mongoose.models.Organization as mongoose.Model<IOrganization>) ||
  mongoose.model<IOrganization>('Organization', organizationSchema);