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
    const { ids, action, clientName, notes, returnDate } = body ?? {};

    // DEBUG: Log input data
    console.log('[DEBUG] Bulk API Input:', {
      ids: ids?.length,
      action,
      clientName,
      returnDate,
      notes: notes?.substring(0, 50),
    });

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: 'Valid IDs array is required' },
        { status: 400 }
      );
    }

    if (!['assign', 'deassign', 'reassign'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action type' },
        { status: 400 }
      );
    }

    const result = await bulkUpdatePhones({
      ids,
      action,
      clientName,
      notes,
      returnDate,
      actorUserId: auth.session!.user.id,
    });

    return NextResponse.json({
      success: true,
      count: result.count,
      message: `Updated ${result.count} phone numbers`,
    });
  } catch (error: any) {
    // DEBUG: Log detailed error
    console.error('[DEBUG] Bulk API Error:', {
      message: error.message,
      stack: error.stack,
      detail: error.detail,
      code: error.code,
    });
    return NextResponse.json(
      { error: error.message ?? 'Failed to perform bulk operation' },
      { status: 400 }
    );
  }
}
