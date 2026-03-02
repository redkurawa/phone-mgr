import { NextRequest, NextResponse } from 'next/server';
import { ensureAdminSession } from '@/lib/auth';
import { updateBlockActivation } from '@/lib/inventory';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function PUT(request: NextRequest) {
  const auth = await ensureAdminSession();
  if (auth.response) {
    return auth.response;
  }

  try {
    const body = await request.json();
    const updatedCount = await updateBlockActivation({
      prefix: body.prefix,
      activationDate: body.activationDate,
      actorUserId: auth.session!.user.id,
    });

    return NextResponse.json({
      success: true,
      count: updatedCount,
      message: `Updated ${updatedCount} phone numbers`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message ?? 'Failed to update activation date' },
      { status: 400 }
    );
  }
}
