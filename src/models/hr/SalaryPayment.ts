import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ISalaryPaymentDocument extends Document {
  tenantId: mongoose.Types.ObjectId;
  paymentId: string;
  employee: mongoose.Types.ObjectId;
  employeeId: string;
  employeeName: string;
  amount: number;
  paymentDate: Date;
  month: number;
  year: number;
  paymentType: 'Monthly' | 'Bonus' | 'Advance' | 'Deduction';
  status: 'Active' | 'Cancelled';
  isDeleted: boolean;
  notes?: string;
  createdBy: mongoose.Types.ObjectId;
}

const SalaryPaymentSchema = new Schema<ISalaryPaymentDocument>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    paymentId: { type: String },
    employee: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
    employeeId: { type: String, required: true },
    employeeName: { type: String, required: true },
    amount: { type: Number, required: true, min: 0 },
    paymentDate: { type: Date, required: true },
    month: { type: Number, required: true, min: 1, max: 12 },
    year: { type: Number, required: true },
    paymentType: {
      type: String,
      enum: ['Monthly', 'Bonus', 'Advance', 'Deduction'],
      default: 'Monthly',
    },
    status: { type: String, enum: ['Active', 'Cancelled'], default: 'Active' },
    isDeleted: { type: Boolean, default: false },
    notes: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

SalaryPaymentSchema.index({ tenantId: 1, employee: 1 });
SalaryPaymentSchema.index({ tenantId: 1, status: 1 });
SalaryPaymentSchema.index({ tenantId: 1, month: 1, year: 1 });
SalaryPaymentSchema.index({ tenantId: 1, paymentDate: -1 });
SalaryPaymentSchema.index({ tenantId: 1, paymentId: 1 }, { unique: true });

SalaryPaymentSchema.pre('save', async function (this: ISalaryPaymentDocument) {
  if (!this.isNew || this.paymentId) return;
  const count = await mongoose.model('SalaryPayment').countDocuments({ tenantId: this.tenantId });
  this.paymentId = `SAL-${String(count + 1).padStart(4, '0')}`;
});

const SalaryPayment: Model<ISalaryPaymentDocument> =
  mongoose.models.SalaryPayment || mongoose.model<ISalaryPaymentDocument>('SalaryPayment', SalaryPaymentSchema);

export default SalaryPayment;
export { SalaryPayment };
