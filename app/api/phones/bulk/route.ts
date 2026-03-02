import { NextRequest, NextResponse } from 'next/server';
import { ensureAdminSession } from '@/lib/auth';
import { bulkUpdatePhones } from '@/lib/inventory';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const auth = await ensureAdminSession();
  if (auth.response) {
    return auth.response;
  }

  try {
    const body = await request.json();
    const { ids, action, clientName, notes } = body ?? {};

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: 'Valid IDs array is required' },
        { status: 400 }
      );
    }

    if (!['assign', 'deassign', 'reassign'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action type' }, { status: 400 });
    }

    const result = await bulkUpdatePhones({
      ids,
      action,
      clientName,
      notes,
      actorUserId: auth.session!.user.id,
    });

    return NextResponse.json({
      success: true,
      count: result.count,
      message: `Updated ${result.count} phone numbers`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message ?? 'Failed to perform bulk operation' },
      { status: 400 }
    );
  }
}
