import { NextRequest, NextResponse } from 'next/server';
import { db, phoneNumbers, usageHistory } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// GET - Get single phone number with optional history (available to all authenticated users)
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

    const id = params.id;
    const searchParams = request.nextUrl.searchParams;
    const includeHistory = searchParams.get('includeHistory') !== 'false'; // Default to true for backward compatibility

    const number = await db
      .select()
      .from(phoneNumbers)
      .where(eq(phoneNumbers.id, id))
      .limit(1);

    if (number.length === 0) {
      return NextResponse.json(
        { error: 'Phone number not found' },
        { status: 404 }
      );
    }

    // Only fetch history if requested (lazy loading)
    let history: any[] = [];
    if (includeHistory) {
      history = await db
        .select()
        .from(usageHistory)
        .where(eq(usageHistory.phoneId, id))
        .orderBy(usageHistory.eventDate);
    }

    return NextResponse.json({
      ...number[0],
      history,
    });
  } catch (error) {
    console.error('Error fetching phone number:', error);
    return NextResponse.json(
      { error: 'Failed to fetch phone number' },
      { status: 500 }
    );
  }
}

// PUT - Update phone number (assign/deassign) - Admin only
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

    const id = params.id;
    const body = await request.json();
    const { currentStatus, currentClient, action, notes } = body;

    // Get current number data
    const existing = await db
      .select()
      .from(phoneNumbers)
      .where(eq(phoneNumbers.id, id))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json(
        { error: 'Phone number not found' },
        { status: 404 }
      );
    }

    const currentNumber = existing[0];
    const updateData: Partial<typeof phoneNumbers.$inferInsert> = {};

    if (currentStatus !== undefined) {
      updateData.currentStatus = currentStatus;
    }
    if (currentClient !== undefined) {
      updateData.currentClient = currentClient;
    }

    // Update the phone number
    if (Object.keys(updateData).length > 0) {
      await db
        .update(phoneNumbers)
        .set({ ...updateData, updatedAt: new Date() })
        .where(eq(phoneNumbers.id, id));
    }

    // Create history record if action is specified
    if (action) {
      // Map action to proper event type
      const eventTypeMap: Record<string, string> = {
        assign: 'ASSIGNED',
        deassign: 'DEASSIGNED',
        reassign: 'REASSIGNED',
        activation: 'ACTIVATION',
      };
      const eventType = eventTypeMap[action.toLowerCase()] || action;

      // For deassign, get the previous client name before updating
      let clientForHistory = currentClient;
      if (action.toLowerCase() === 'deassign' && !currentClient) {
        // Get the previous client from the existing phone record
        clientForHistory = currentNumber.currentClient;
      }

      await db.insert(usageHistory).values({
        id: uuidv4(),
        phoneId: id,
        eventType: eventType as any,
        clientName: clientForHistory,
        eventDate: new Date(),
        notes: notes || null,
      });
    }

    // Get updated number with history
    const updated = await db
      .select()
      .from(phoneNumbers)
      .where(eq(phoneNumbers.id, id))
      .limit(1);

    const history = await db
      .select()
      .from(usageHistory)
      .where(eq(usageHistory.phoneId, id))
      .orderBy(usageHistory.eventDate);

    return NextResponse.json({
      ...updated[0],
      history,
    });
  } catch (error) {
    console.error('Error updating phone number:', error);
    return NextResponse.json(
      { error: 'Failed to update phone number' },
      { status: 500 }
    );
  }
}

// DELETE - Delete phone number - Admin only
export async function DELETE(
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

    const id = params.id;

    await db.delete(phoneNumbers).where(eq(phoneNumbers.id, id));

    return NextResponse.json({
      success: true,
      message: 'Phone number deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting phone number:', error);
    return NextResponse.json(
      { error: 'Failed to delete phone number' },
      { status: 500 }
    );
  }
}
