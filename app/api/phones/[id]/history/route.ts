import { NextRequest, NextResponse } from 'next/server';
import { db, usageHistory } from '@/lib/db';
import { eq, sql } from 'drizzle-orm';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// GET - Get history for a specific phone number (available to all authenticated users)
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    if (!db) {
      return NextResponse.json(
        {
          error:
            'Database not configured. Set DATABASE_URL environment variable.',
        },
        { status: 500 }
      );
    }

    const phoneId = params.id;
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    console.log('Fetching history for phone:', phoneId);

    // Use raw SQL to avoid drizzle caching issues
    const limitNum = parseInt(limit.toString());
    const offsetNum = parseInt(offset.toString());
    const historyResult = await db.execute(
      sql`SELECT id, phone_id, event_type, client_name, event_date, notes 
           FROM usage_history 
           WHERE phone_id = ${phoneId}
           ORDER BY event_date DESC 
           LIMIT ${limitNum} OFFSET ${offsetNum}`
    );
    
    const history = historyResult.rows.map((row: any) => ({
      id: row.id,
      phoneId: row.phone_id,
      eventType: row.event_type,
      clientName: row.client_name,
      eventDate: row.event_date,
      notes: row.notes,
    }));

    // Get total count
    const countResult = await db.execute(
      sql`SELECT COUNT(*) as count FROM usage_history WHERE phone_id = ${phoneId}`
    );
    const total = parseInt((countResult.rows[0] as any)?.count || '0');

    console.log('History fetched:', history.length, 'entries');

    return NextResponse.json(
      {
        data: history,
        total,
        limit,
        offset,
      },
      {
        headers: {
          'Cache-Control':
            'no-store, no-cache, must-revalidate, proxy-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        },
      }
    );
  } catch (error) {
    console.error('Error fetching history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch history' },
      { status: 500 }
    );
  }
}

// PUT - Update a history entry date - Admin only
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check if user is admin
    const session = await getServerSession(authOptions);
    if (!session?.user?.email || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!db) {
      return NextResponse.json(
        {
          error:
            'Database not configured. Set DATABASE_URL environment variable.',
        },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { historyId, eventDate } = body;

    console.log('Updating history:', { historyId, eventDate });

    if (!historyId || !eventDate) {
      return NextResponse.json(
        { error: 'History ID and event date are required' },
        { status: 400 }
      );
    }

    // Update the history entry
    const updatedHistory = await db
      .update(usageHistory)
      .set({ eventDate: new Date(eventDate) })
      .where(eq(usageHistory.id, historyId as any))
      .returning();

    console.log('Updated history result:', updatedHistory);

    if (!updatedHistory.length) {
      return NextResponse.json(
        { error: 'History entry not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      data: updatedHistory[0],
      message: 'History date updated successfully',
    });
  } catch (error) {
    console.error('Error updating history:', error);
    return NextResponse.json(
      { error: 'Failed to update history date' },
      { status: 500 }
    );
  }
}
