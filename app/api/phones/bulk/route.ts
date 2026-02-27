import { NextRequest, NextResponse } from 'next/server';
import { db, phoneNumbers, usageHistory } from '@/lib/db';
import { eq, inArray } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// POST - Bulk operations (assign, deassign, update) - Admin only
export async function POST(request: NextRequest) {
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
    const { ids, action, clientName, notes } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: 'Valid IDs array is required' },
        { status: 400 }
      );
    }

    const updateData: Partial<typeof phoneNumbers.$inferInsert> = {
      updatedAt: new Date(),
    };

    let eventType: 'ASSIGNED' | 'DEASSIGNED' | 'REASSIGNED';
    let status: 'KOSONG' | 'PAKAI';
    let client: string | null;

    if (action === 'assign') {
      if (!clientName) {
        return NextResponse.json(
          { error: 'Client name is required for assignment' },
          { status: 400 }
        );
      }
      status = 'PAKAI';
      client = clientName;
      eventType = 'ASSIGNED';
    } else if (action === 'deassign') {
      status = 'KOSONG';
      client = null;
      eventType = 'DEASSIGNED';
    } else if (action === 'reassign') {
      if (!clientName) {
        return NextResponse.json(
          { error: 'Client name is required for reassignment' },
          { status: 400 }
        );
      }
      status = 'PAKAI';
      client = clientName;
      eventType = 'REASSIGNED';
    } else {
      return NextResponse.json(
        { error: 'Invalid action type' },
        { status: 400 }
      );
    }

    updateData.currentStatus = status;
    updateData.currentClient = client;

    // Update phone numbers
    await db
      .update(phoneNumbers)
      .set(updateData)
      .where(inArray(phoneNumbers.id, ids));

    // Create history records
    const historyRecords = ids.map((id: string) => ({
      id: uuidv4(),
      phoneId: id,
      eventType,
      clientName: action === 'deassign' ? null : clientName,
      eventDate: new Date(),
      notes: notes || null,
    }));

    await db.insert(usageHistory).values(historyRecords);

    return NextResponse.json({
      success: true,
      count: ids.length,
      message: `Successfully ${action}ed ${ids.length} phone numbers`,
    });
  } catch (error) {
    console.error('Error performing bulk operation:', error);
    return NextResponse.json(
      { error: 'Failed to perform bulk operation' },
      { status: 500 }
    );
  }
}
