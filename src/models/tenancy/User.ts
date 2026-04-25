import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  email: string;
  passwordHash?: string;
  emailVerifiedAt?: Date;
  name: string;
  phone?: string;
  avatarUrl?: string;
  defaultLanguage: 'ar' | 'en';
  mfaEnabled: boolean;
  mfaSecret?: string;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(password: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: String,
    emailVerifiedAt: Date,
    name: {
      type: String,
      required: true,
      trim: true,
    },
    phone: String,
    avatarUrl: String,
    defaultLanguage: {
      type: String,
      enum: ['ar', 'en'],
      default: 'en',
    },
    mfaEnabled: {
      type: Boolean,
      default: false,
    },
    mfaSecret: String,
    lastLoginAt: Date,
  },
  {
    timestamps: true,
  }
);

userSchema.methods.comparePassword = async function (password: string): Promise<boolean> {
  if (!this.passwordHash) return false;
  return bcrypt.compare(password, this.passwordHash);
};

userSchema.pre('save', async function () {
  if (this.isModified('passwordHash') && this.passwordHash) {
    const salt = await bcrypt.genSalt(12);
    this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
  }
});

export const User = (mongoose.models.User as mongoose.Model<IUser>) ||
  mongoose.model<IUser>('User', userSchema);