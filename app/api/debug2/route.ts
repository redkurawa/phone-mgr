import { NextRequest, NextResponse } from 'next/server';
import { db, usageHistory } from '@/lib/db';
import { sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    if (!db) {
      return NextResponse.json({ error: 'DB not configured' }, { status: 500 });
    }
    
    const phoneId = request.nextUrl.searchParams.get('phoneId');
    if (!phoneId) {
      return NextResponse.json({ error: 'phoneId required' }, { status: 400 });
    }

    const result = await db.execute(
      sql`SELECT id, event_date, event_type, phone_id FROM usage_history WHERE phone_id = ${phoneId} ORDER BY event_date DESC`
    );

    return NextResponse.json({ data: result.rows });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
