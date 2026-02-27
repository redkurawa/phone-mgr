import { NextRequest, NextResponse } from 'next/server';
import { db, phoneNumbers, usageHistory } from '@/lib/db';
import { sql } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// PUT - Update/set activation date for all numbers in a block - Admin only
export async function PUT(request: NextRequest) {
  try {
    // Check if user is admin
    const session = await getServerSession(authOptions);
    if (!session?.user?.email || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!db) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { prefix, activationDate } = body;

    if (!prefix || !activationDate) {
      return NextResponse.json(
        { error: 'Prefix and activation date are required' },
        { status: 400 }
      );
    }

    // Get all phone IDs in this prefix
    const phonesInBlock = await db.execute(
      sql`SELECT id FROM phone_numbers WHERE number LIKE ${prefix + '%'}`
    );

    const phoneIds = phonesInBlock.rows.map((row: any) => row.id);

    if (phoneIds.length === 0) {
      return NextResponse.json(
        { error: 'No phones found in this block' },
        { status: 404 }
      );
    }

    const newDate = new Date(activationDate);

    // Check if activation records exist for these phones
    const existingActivations = await db.execute(
      sql`SELECT id, phone_id FROM usage_history 
                WHERE phone_id IN ${sql`${phoneIds}`} 
                AND event_type = 'ACTIVATION'`
    );

    if (existingActivations.rows.length > 0) {
      // Update existing activation records
      await db.execute(
        sql`UPDATE usage_history 
                    SET event_date = ${newDate}
                    WHERE phone_id IN ${sql`${phoneIds}`}
                    AND event_type = 'ACTIVATION'`
      );
    } else {
      // No activation records exist - create them for all phones
      for (const phoneId of phoneIds) {
        await db.insert(usageHistory).values({
          id: uuidv4(),
          phoneId: phoneId,
          eventType: 'ACTIVATION',
          eventDate: newDate,
          clientName: null,
          notes: 'Activation date set via block edit',
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Activation date ${existingActivations.rows.length > 0 ? 'updated' : 'set'} for ${phoneIds.length} phone numbers`,
    });
  } catch (error: any) {
    console.error('Error updating activation date:', error);
    return NextResponse.json(
      { error: 'Failed to update activation date', details: error.message },
      { status: 500 }
    );
  }
}
