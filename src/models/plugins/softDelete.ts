/* eslint-disable @typescript-eslint/no-explicit-any */
import mongoose from 'mongoose';

export interface ISoftDelete {
  deletedAt: Date | null;
  deletedBy?: mongoose.Types.ObjectId;
}

export interface SoftDeletePluginOptions {
  deletedAt?: string;
}

export function softDeletePlugin(schema: mongoose.Schema, options: SoftDeletePluginOptions = {}) {
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
    (this as Record<string, unknown>)[fieldName] = new Date();
    if (userId) {
      (this as Record<string, unknown>).deletedBy = userId;
    }
    return this.save();
  };

  schema.methods.restore = async function () {
    (this as Record<string, unknown>)[fieldName] = null;
    (this as Record<string, unknown>).deletedBy = null;
    return this.save();
  };

  schema.statics.findActive = function (this: mongoose.Model<any>, ...args: any[]) {
    const query: Record<string, any> = {};
    query[fieldName] = null;
    return (this.find as any)(query, ...args);
  };

  schema.statics.findAll = function (this: mongoose.Model<any>, ...args: any[]) {
    return (this.find as any)(...args);
  };

  schema.statics.findWithDeleted = function (this: mongoose.Model<any>, ...args: any[]) {
    return (this.find as any)(...args);
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