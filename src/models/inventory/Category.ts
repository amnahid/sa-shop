import mongoose, { Schema, Document } from 'mongoose';

export interface ICategory extends Document {
  tenantId: mongoose.Types.ObjectId;
  name: string;
  nameAr: string;
  parentId?: mongoose.Types.ObjectId;
  imageUrl?: string;
  sortOrder: number;
  active: boolean;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const categorySchema = new Schema<ICategory>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    nameAr: {
      type: String,
      required: true,
      trim: true,
    },
    parentId: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
    },
    imageUrl: String,
    sortOrder: {
      type: Number,
      default: 0,
    },
    active: {
      type: Boolean,
      default: true,
      index: true,
    },
    deletedAt: {
      type: Date,
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

categorySchema.index({ tenantId: 1, parentId: 1, sortOrder: 1 });
categorySchema.index({ tenantId: 1, name: 1 });

export const Category = (mongoose.models.Category as mongoose.Model<ICategory>) ||
  mongoose.model<ICategory>('Category', categorySchema);