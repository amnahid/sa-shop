import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { Employee, SalaryPayment } from '@/models';
import { getAuthorizedSessionMembership } from '@/lib/utils/server-authorization';
import mongoose from 'mongoose';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthorizedSessionMembership('hr:view');
    if ('error' in auth) {
      const status = auth.error === 'Unauthorized' ? 401 : 403;
      return NextResponse.json({ error: auth.error }, { status });
    }

    await connectDB();
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid employee ID' }, { status: 400 });
    }

    const employee = await Employee.findOne({ _id: id, tenantId: auth.membership.tenantId }).lean();
    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    const payments = await SalaryPayment.find({
      tenantId: auth.membership.tenantId,
      employee: id,
      isDeleted: false,
    })
      .sort({ paymentDate: -1 })
      .lean();

    return NextResponse.json({
      employee,
      payments,
    });
  } catch (error) {
    console.error('Get employee detail API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthorizedSessionMembership('hr:view');
    if ('error' in auth) {
      const status = auth.error === 'Unauthorized' ? 401 : 403;
      return NextResponse.json({ error: auth.error }, { status });
    }

    await connectDB();
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid employee ID' }, { status: 400 });
    }

    const body = await request.json();
    const {
      name,
      phone,
      email,
      passportNumber,
      iqamaNumber,
      iqamaExpiryDate,
      designation,
      department,
      baseSalary,
      commissionRate,
      joiningDate,
      isActive,
      photo,
      documents,
    } = body;

    const employee = await Employee.findOneAndUpdate(
      { _id: id, tenantId: auth.membership.tenantId },
      {
        name,
        phone,
        email: email || undefined,
        passportNumber: passportNumber || undefined,
        iqamaNumber: iqamaNumber || undefined,
        iqamaExpiryDate: iqamaExpiryDate ? new Date(iqamaExpiryDate) : undefined,
        designation,
        department,
        baseSalary: parseFloat(baseSalary),
        commissionRate: commissionRate ? parseFloat(commissionRate) : undefined,
        joiningDate: new Date(joiningDate),
        isActive: isActive !== false,
        photo: photo || undefined,
        documents: documents || [],
      },
      { new: true }
    );

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    return NextResponse.json({ employee });
  } catch (error) {
    console.error('Update employee API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthorizedSessionMembership('hr:view');
    if ('error' in auth) {
      const status = auth.error === 'Unauthorized' ? 401 : 403;
      return NextResponse.json({ error: auth.error }, { status });
    }

    await connectDB();
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid employee ID' }, { status: 400 });
    }

    const employee = await Employee.findOneAndDelete({
      _id: id,
      tenantId: auth.membership.tenantId,
    });

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Employee deleted successfully' });
  } catch (error) {
    console.error('Delete employee API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
