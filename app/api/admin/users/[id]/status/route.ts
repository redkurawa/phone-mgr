import { NextResponse } from 'next/server';
import { ensureAdminSession } from '@/lib/auth';
import { updateUserStatus } from '@/lib/inventory';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const auth = await ensureAdminSession();
  if (auth.response) {
    return auth.response;
  }

  try {
    if (params.id === auth.session!.user.id) {
      return NextResponse.json(
        { error: 'Cannot change your own status' },
        { status: 400 }
      );
    }

    const body = await request.json();
    if (!['approved', 'rejected'].includes(body.status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    await updateUserStatus(params.id, body.status, auth.session!.user.id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message ?? 'Failed to update user status' },
      { status: 400 }
    );
  }
}
