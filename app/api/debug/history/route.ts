import { NextRequest, NextResponse } from 'next/server';
import { db, usageHistory } from '@/lib/db';
import { sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    if (!db) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }
    
    const phoneId = request.nextUrl.searchParams.get('phoneId');
    
    if (!phoneId) {
      return NextResponse.json({ error: 'phoneId required' }, { status: 400 });
    }

    // Direct SQL query
    const result = await db.execute(
      sql`SELECT id, event_date, event_type FROM usage_history WHERE phone_id = ${phoneId} ORDER BY event_date DESC`
    );

    // Drizzle query
    const drizzleResult = await db
      .select()
      .from(usageHistory)
      .where(sql`${usageHistory.phoneId} = ${phoneId}`)
      .orderBy(usageHistory.eventDate);

    return NextResponse.json({
      direct: result.rows,
      drizzle: drizzleResult,
      phoneId
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
