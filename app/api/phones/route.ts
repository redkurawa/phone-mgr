import { NextRequest, NextResponse } from 'next/server';
import { ensureAdminSession, ensureApprovedSession } from '@/lib/auth';
import { parseInteger } from '@/lib/db';
import {
  deletePhonesByPrefix,
  generatePhones,
  listBlocks,
  listCustomerPhones,
  listCustomers,
  listPhoneInventory,
} from '@/lib/inventory';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = await ensureApprovedSession();
  if (auth.response) {
    return auth.response;
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const mode = searchParams.get('mode') ?? 'list';

    if (mode === 'blocks') {
      return NextResponse.json(await listBlocks(), {
        headers: { 'Cache-Control': 'no-store' },
      });
    }

    if (mode === 'customers') {
      return NextResponse.json(await listCustomers(), {
        headers: { 'Cache-Control': 'no-store' },
      });
    }

    if (mode === 'customer-phones') {
      const clientName = searchParams.get('client') ?? '';
      if (!clientName.trim()) {
        return NextResponse.json(
          { error: 'Client name is required' },
          { status: 400 }
        );
      }

      return NextResponse.json(await listCustomerPhones(clientName), {
        headers: { 'Cache-Control': 'no-store' },
      });
    }

    const payload = await listPhoneInventory({
      search: searchParams.get('search') ?? '',
      status: searchParams.get('status') ?? '',
      limit: parseInteger(searchParams.get('limit'), 50, { min: 1, max: 500 }),
      offset: parseInteger(searchParams.get('offset'), 0, { min: 0 }),
      prefix: searchParams.get('prefix') ?? '',
      includeHistory: searchParams.get('includeHistory') === 'true',
    });

    return NextResponse.json(payload, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error: any) {
    console.error('listPhoneInventory error:', error);
    return NextResponse.json(
      { error: error.message ?? 'Failed to fetch phone data' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = await ensureAdminSession();
  if (auth.response) {
    return auth.response;
  }

  try {
    const body = await request.json();
    const result = await generatePhones({
      prefix: body.prefix,
      range: body.range,
      actorUserId: auth.session!.user.id,
    });

    if (result.insertedCount === 0) {
      return NextResponse.json(
        {
          error: 'No new phone numbers were created. All values already exist.',
        },
        { status: 409 }
      );
    }

    return NextResponse.json({
      success: true,
      count: result.insertedCount,
      requestedCount: result.requestedCount,
      message: `Generated ${result.insertedCount} phone numbers`,
    });
  } catch (error: any) {
    console.error('generatePhones error:', error);
    return NextResponse.json(
      { error: error.message ?? 'Failed to create phone numbers' },
      { status: 400 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await ensureAdminSession();
  if (auth.response) {
    return auth.response;
  }

  try {
    const prefix = request.nextUrl.searchParams.get('prefix') ?? '';
    const deletedCount = await deletePhonesByPrefix(
      prefix,
      auth.session!.user.id
    );

    return NextResponse.json({
      success: true,
      count: deletedCount,
      message: `Deleted ${deletedCount} phone numbers`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message ?? 'Failed to delete phone numbers' },
      { status: 400 }
    );
  }
}
