import mongoose, { Schema, Document } from 'mongoose';

export interface IAttendance extends Document {
  tenantId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  date: Date;
  checkIn?: Date;
  checkOut?: Date;
  status: 'present' | 'absent' | 'late' | 'on_leave';
  note?: string;
  createdAt: Date;
  updatedAt: Date;
}

const attendanceSchema = new Schema<IAttendance>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    checkIn: Date,
    checkOut: Date,
    status: {
      type: String,
      enum: ['present', 'absent', 'late', 'on_leave'],
      default: 'present',
    },
    note: String,
  },
  {
    timestamps: true,
  }
);

attendanceSchema.index({ tenantId: 1, userId: 1, date: 1 }, { unique: true });

export const Attendance = (mongoose.models.Attendance as mongoose.Model<IAttendance>) ||
  mongoose.model<IAttendance>('Attendance', attendanceSchema);
