import mongoose from 'mongoose';

export interface ISoftDelete {
  deletedAt: Date | null;
  deletedBy?: mongoose.Types.ObjectId;
}

export interface SoftDeletePluginOptions {
  deletedAt?: string;
}

export function softDeletePlugin(schema: mongoose.Schema<any>, options: SoftDeletePluginOptions = {}) {
  const fieldName = options.deletedAt || 'deletedAt';

  schema.add({
    [fieldName]: {
      type: Date,
      default: null,
    },
    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  });

  schema.methods.softDelete = async function (userId?: mongoose.Types.ObjectId) {
    (this as any)[fieldName] = new Date();
    if (userId) {
      (this as any).deletedBy = userId;
    }
    return this.save();
  };

  schema.methods.restore = async function () {
    (this as any)[fieldName] = null;
    (this as any).deletedBy = null;
    return this.save();
  };

  schema.statics.findActive = function (this: mongoose.Model<any>, ...args: any[]) {
    const query: Record<string, unknown> = {};
    query[fieldName] = null;
    return this.find(query, ...args);
  };

  schema.statics.findAll = function (this: mongoose.Model<any>, ...args: any[]) {
    return this.find(...args);
  };

  schema.statics.findWithDeleted = function (this: mongoose.Model<any>, ...args: any[]) {
    return this.find(...args);
  };

  schema.pre('countDocuments', function () {
    this.where(fieldName).equals(null);
  });

  schema.pre('find', function () {
    this.where(fieldName).equals(null);
  });

  schema.pre('findOne', function () {
    this.where(fieldName).equals(null);
  });

  schema.pre('findOneAndUpdate', function () {
    this.where(fieldName).equals(null);
  });
}