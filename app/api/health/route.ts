import { NextResponse } from 'next/server';
import { requireDatabase } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const sql = requireDatabase();
    await sql`SELECT 1`;

    return NextResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json(
      { status: 'error', message: error.message ?? 'Database unavailable' },
      { status: 500 }
    );
  }
}
