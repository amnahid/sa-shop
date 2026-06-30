import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ICustomDocument {
  title: string;
  url: string;
}

export interface IEmployeeDocument extends Document {
  tenantId: mongoose.Types.ObjectId;
  employeeId: string;
  name: string;
  phone: string;
  email?: string;
  passportNumber?: string;
  iqamaNumber?: string;
  designation: string;
  department: string;
  baseSalary: number;
  commissionRate?: number;
  joiningDate: Date;
  isActive: boolean;
  photo?: string;
  documents: ICustomDocument[];
  createdBy: mongoose.Types.ObjectId;
}

const EmployeeSchema = new Schema<IEmployeeDocument>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    employeeId: { type: String },
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, trim: true },
    passportNumber: { type: String, trim: true },
    iqamaNumber: { type: String, trim: true },
    designation: { type: String, required: true, trim: true },
    department: { type: String, required: true, trim: true },
    baseSalary: { type: Number, required: true, min: 0 },
    commissionRate: { type: Number, min: 0, max: 100 },
    joiningDate: { type: Date, required: true },
    isActive: { type: Boolean, default: true },
    photo: { type: String },
    documents: [
      {
        title: { type: String, required: true },
        url: { type: String, required: true },
      }
    ],
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

EmployeeSchema.index({ tenantId: 1, isActive: 1 });
EmployeeSchema.index({ tenantId: 1, department: 1 });
EmployeeSchema.index({ tenantId: 1, name: 1 });
EmployeeSchema.index({ tenantId: 1, employeeId: 1 }, { unique: true });

EmployeeSchema.pre('save', async function (this: IEmployeeDocument) {
  if (!this.isNew || this.employeeId) return;
  const count = await mongoose.model('Employee').countDocuments({ tenantId: this.tenantId });
  this.employeeId = `EMP-${String(count + 1).padStart(4, '0')}`;
});

const Employee: Model<IEmployeeDocument> =
  mongoose.models.Employee || mongoose.model<IEmployeeDocument>('Employee', EmployeeSchema);

export default Employee;
export { Employee };
