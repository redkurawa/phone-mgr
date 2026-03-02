import { NextRequest, NextResponse } from 'next/server';
import { ensureAdminSession, ensureApprovedSession } from '@/lib/auth';
import { deletePhoneById, getPhoneById, updatePhoneState } from '@/lib/inventory';

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
    const includeHistory = request.nextUrl.searchParams.get('includeHistory') !== 'false';
    const phone = await getPhoneById(params.id, includeHistory);

    if (!phone) {
      return NextResponse.json(
        { error: 'Phone number not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(phone, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message ?? 'Failed to fetch phone number' },
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
    const phone = await updatePhoneState({
      phoneId: params.id,
      currentStatus: body.currentStatus,
      currentClient: body.currentClient,
      action: body.action,
      notes: body.notes,
      actorUserId: auth.session!.user.id,
    });

    if (!phone) {
      return NextResponse.json(
        { error: 'Phone number not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(phone, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message ?? 'Failed to update phone number' },
      { status: 400 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await ensureAdminSession();
  if (auth.response) {
    return auth.response;
  }

  try {
    const deletedCount = await deletePhoneById(params.id, auth.session!.user.id);
    if (deletedCount === 0) {
      return NextResponse.json(
        { error: 'Phone number not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Phone number deleted successfully',
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message ?? 'Failed to delete phone number' },
      { status: 400 }
    );
  }
}
