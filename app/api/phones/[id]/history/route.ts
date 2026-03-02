import { NextRequest, NextResponse } from 'next/server';
import { ensureAdminSession, ensureApprovedSession } from '@/lib/auth';
import { parseInteger } from '@/lib/db';
import { getPhoneHistory, updateHistoryEventDate } from '@/lib/inventory';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await ensureApprovedSession();
  if (auth.response) {
    return auth.response;
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const payload = await getPhoneHistory(
      params.id,
      parseInteger(searchParams.get('limit'), 50, { min: 1, max: 500 }),
      parseInteger(searchParams.get('offset'), 0, { min: 0 })
    );

    return NextResponse.json(payload, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message ?? 'Failed to fetch history' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await ensureAdminSession();
  if (auth.response) {
    return auth.response;
  }

  try {
    const body = await request.json();
    if (!body.historyId || !body.eventDate) {
      return NextResponse.json(
        { error: 'History ID and event date are required' },
        { status: 400 }
      );
    }

    await updateHistoryEventDate({
      phoneId: params.id,
      historyId: body.historyId,
      eventDate: body.eventDate,
      actorUserId: auth.session!.user.id,
    });

    return NextResponse.json({
      success: true,
      message: 'History date updated successfully',
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message ?? 'Failed to update history date' },
      { status: 400 }
    );
  }
}
