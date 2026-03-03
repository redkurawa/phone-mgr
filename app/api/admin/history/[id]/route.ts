import { NextRequest, NextResponse } from 'next/server';
import { ensureAdminSession } from '@/lib/auth';
import { requireDatabase } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await ensureAdminSession();
  if (auth.response) {
    return auth.response;
  }

  try {
    const sql = requireDatabase();

    // Get history entry details before deleting for audit log
    const [historyEntry] = await sql`
      SELECT pe.id, pe.phone_id, pe.event_type, pe.client_name, pe.event_at, pe.note,
             pi.phone_number
      FROM phone_events pe
      JOIN phone_inventory pi ON pe.phone_id = pi.id
      WHERE pe.id = ${params.id}
    `;

    if (!historyEntry) {
      return NextResponse.json(
        { error: 'History entry not found' },
        { status: 404 }
      );
    }

    // Delete the history entry
    await sql`
      DELETE FROM phone_events
      WHERE id = ${params.id}
    `;

    // Insert audit log
    await sql`
      INSERT INTO audit_logs (action, entity_type, entity_id, actor_user_id, payload)
      VALUES (
        'history.delete',
        'phone_events',
        ${params.id},
        ${auth.session!.user.id},
        CAST(${JSON.stringify({
          id: historyEntry.id,
          phoneId: historyEntry.phone_id,
          phoneNumber: historyEntry.phone_number,
          eventType: historyEntry.event_type,
          clientName: historyEntry.client_name,
          eventAt: historyEntry.event_at,
          note: historyEntry.note,
        })} AS jsonb)
      )
    `;

    return NextResponse.json({
      success: true,
      message: 'History entry deleted successfully',
      deletedEntry: {
        id: historyEntry.id,
        eventType: historyEntry.event_type,
        phoneNumber: historyEntry.phone_number,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message ?? 'Failed to delete history entry' },
      { status: 500 }
    );
  }
}
