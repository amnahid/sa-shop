import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { SalaryPayment } from '@/models';
import { getAuthorizedSessionMembership } from '@/lib/utils/server-authorization';

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthorizedSessionMembership('hr:view');
    if ('error' in auth) {
      const status = auth.error === 'Unauthorized' ? 401 : 403;
      return NextResponse.json({ error: auth.error }, { status });
    }

    await connectDB();
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const employeeId = searchParams.get('employeeId') || '';
    const month = searchParams.get('month') ? parseInt(searchParams.get('month')!) : null;
    const year = searchParams.get('year') ? parseInt(searchParams.get('year')!) : null;
    const paymentType = searchParams.get('paymentType') || '';

    const query: Record<string, any> = {
      tenantId: auth.membership.tenantId,
      isDeleted: { $ne: true },
    };

    if (employeeId) query.employee = employeeId;
    if (month) query.month = month;
    if (year) query.year = year;
    if (paymentType) query.paymentType = paymentType;

    const now = new Date();
    const skip = (page - 1) * limit;

    const [payments, total, totalShownAgg, monthlyTotal] = await Promise.all([
      SalaryPayment.find(query).sort({ paymentDate: -1 }).skip(skip).limit(limit).lean(),
      SalaryPayment.countDocuments(query),
      SalaryPayment.aggregate([
        { $match: { ...query, status: 'Active' } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      SalaryPayment.aggregate([
        {
          $match: {
            tenantId: auth.membership.tenantId,
            month: now.getMonth() + 1,
            year: now.getFullYear(),
            status: 'Active',
            isDeleted: { $ne: true },
          },
        },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
    ]);

    return NextResponse.json({
      payments,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      totalThisMonth: monthlyTotal[0]?.total || 0,
      totalShown: totalShownAgg[0]?.total || 0,
    });
  } catch (error) {
    console.error('Get salary payments API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthorizedSessionMembership('hr:view');
    if ('error' in auth) {
      const status = auth.error === 'Unauthorized' ? 401 : 403;
      return NextResponse.json({ error: auth.error }, { status });
    }

    await connectDB();
    const body = await request.json();
    const {
      employee,
      employeeId,
      employeeName,
      amount,
      paymentDate,
      month,
      year,
      paymentType,
      notes,
    } = body;

    if (!employee || !employeeId || !employeeName || amount === undefined || !paymentDate || !month || !year) {
      return NextResponse.json({ error: 'Required fields missing' }, { status: 400 });
    }

    const payment = await SalaryPayment.create({
      tenantId: auth.membership.tenantId,
      employee,
      employeeId,
      employeeName,
      amount: parseFloat(amount),
      paymentDate: new Date(paymentDate),
      month: parseInt(month),
      year: parseInt(year),
      paymentType: paymentType || 'Monthly',
      status: 'Active',
      isDeleted: false,
      notes: notes || undefined,
      createdBy: auth.membership.userId,
    });

    return NextResponse.json({ payment }, { status: 201 });
  } catch (error) {
    console.error('Create salary payment API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
