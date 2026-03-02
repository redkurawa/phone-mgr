import { NextRequest, NextResponse } from 'next/server';
import { ensureApprovedSession } from '@/lib/auth';
import { getBlockActivation } from '@/lib/inventory';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = await ensureApprovedSession();
  if (auth.response) {
    return auth.response;
  }

  try {
    const prefix = request.nextUrl.searchParams.get('prefix') ?? '';
    if (!prefix.trim()) {
      return NextResponse.json({ error: 'Prefix is required' }, { status: 400 });
    }

    return NextResponse.json(
      { activationDate: await getBlockActivation(prefix) },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message ?? 'Failed to fetch activation date' },
      { status: 500 }
    );
  }
}
