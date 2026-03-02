import { NextResponse } from 'next/server';
import { ensureAdminSession } from '@/lib/auth';
import { updateUserRole } from '@/lib/inventory';

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
        { error: 'Cannot change your own role' },
        { status: 400 }
      );
    }

    const body = await request.json();
    if (!['admin', 'user'].includes(body.role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    await updateUserRole(params.id, body.role, auth.session!.user.id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message ?? 'Failed to update user role' },
      { status: 400 }
    );
  }
}
