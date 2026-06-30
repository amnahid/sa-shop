import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { SalaryPayment } from '@/models';
import { getAuthorizedSessionMembership } from '@/lib/utils/server-authorization';
import mongoose from 'mongoose';

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
      return NextResponse.json({ error: 'Invalid payment ID' }, { status: 400 });
    }

    const payment = await SalaryPayment.findOneAndUpdate(
      { _id: id, tenantId: auth.membership.tenantId },
      { status: 'Cancelled' },
      { new: true }
    );

    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    return NextResponse.json({ payment });
  } catch (error) {
    console.error('Cancel salary payment API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
