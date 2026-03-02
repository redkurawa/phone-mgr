import { NextResponse } from 'next/server';
import { ensureAdminSession } from '@/lib/auth';
import { getSystemOverview } from '@/lib/inventory';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const auth = await ensureAdminSession();
  if (auth.response) {
    return auth.response;
  }

  try {
    const overview = await getSystemOverview();
    return NextResponse.json(overview, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error: any) {
    return NextResponse.json(
      { status: 'error', message: error.message ?? 'Failed to load system status' },
      { status: 500 }
    );
  }
}
