import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { Employee } from '@/models';
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
    const limit = parseInt(searchParams.get('limit') || '15');
    const search = searchParams.get('search') || '';
    const department = searchParams.get('department') || '';
    const activeOnly = searchParams.get('active') === 'true';

    const query: Record<string, any> = {
      tenantId: auth.membership.tenantId,
    };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { employeeId: { $regex: search, $options: 'i' } },
      ];
    }

    if (department) {
      query.department = department;
    }

    if (activeOnly) {
      query.isActive = true;
    }

    const skip = (page - 1) * limit;
    const [employees, total, salaryStats] = await Promise.all([
      Employee.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Employee.countDocuments(query),
      Employee.aggregate([
        { $match: { tenantId: auth.membership.tenantId, isActive: true } },
        { $group: { _id: null, total: { $sum: '$baseSalary' } } },
      ]),
    ]);

    return NextResponse.json({
      employees,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      totalMonthlySalary: salaryStats[0]?.total || 0,
    });
  } catch (error) {
    console.error('Get employees API error:', error);
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
      name,
      phone,
      email,
      passportNumber,
      iqamaNumber,
      designation,
      department,
      baseSalary,
      commissionRate,
      joiningDate,
      photo,
      documents,
    } = body;

    if (!name || !phone || !designation || !department || baseSalary === undefined || !joiningDate) {
      return NextResponse.json({ error: 'Required fields missing' }, { status: 400 });
    }

    const employee = await Employee.create({
      tenantId: auth.membership.tenantId,
      name,
      phone,
      email: email || undefined,
      passportNumber: passportNumber || undefined,
      iqamaNumber: iqamaNumber || undefined,
      designation,
      department,
      baseSalary: parseFloat(baseSalary),
      commissionRate: commissionRate ? parseFloat(commissionRate) : undefined,
      joiningDate: new Date(joiningDate),
      isActive: true,
      photo: photo || undefined,
      documents: documents || [],
      createdBy: auth.membership.userId,
    });

    return NextResponse.json({ employee }, { status: 201 });
  } catch (error) {
    console.error('Create employee API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
