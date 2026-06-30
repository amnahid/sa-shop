import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { Employee } from '@/models';
import { getAuthorizedSessionMembership } from '@/lib/utils/server-authorization';

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthorizedSessionMembership('hr:view');
    if ('error' in auth) {
      const status = auth.error === 'Unauthorized' ? 401 : 403;
      return NextResponse.json({ error: auth.error }, { status });
    }

    await connectDB();
    const body = await request.json();
    const { action, ids } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'No IDs provided' }, { status: 400 });
    }

    if (action === 'delete') {
      const result = await Employee.deleteMany({
        _id: { $in: ids },
        tenantId: auth.membership.tenantId,
      });

      return NextResponse.json({
        message: `Successfully deleted ${result.deletedCount} employees`,
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Bulk employee API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
