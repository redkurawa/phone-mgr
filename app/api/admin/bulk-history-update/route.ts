import { NextRequest, NextResponse } from 'next/server';
import { ensureAdminSession } from '@/lib/auth';
import { requireDatabase, toJsonPayload } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const auth = await ensureAdminSession();
  if (auth.response) {
    return auth.response;
  }

  try {
    const body = await request.json();
    const { phoneIds, clientName, newDate } = body;

    if (
      !Array.isArray(phoneIds) ||
      phoneIds.length === 0 ||
      !newDate ||
      !clientName
    ) {
      return NextResponse.json(
        { error: 'Phone IDs, client name, and new date are required' },
        { status: 400 }
      );
    }

    const sql = requireDatabase();
    const eventDate = new Date(newDate);

    if (Number.isNaN(eventDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format' },
        { status: 400 }
      );
    }

    // Get the most recent ASSIGN/REASSIGN events for these phones with this client
    const affectedRows = await sql`
      WITH target_events AS (
        SELECT DISTINCT ON (pe.phone_id) pe.id, pe.phone_id
        FROM phone_events pe
        WHERE pe.phone_id = ANY(${phoneIds}::uuid[])
          AND pe.client_name = ${clientName}
          AND pe.event_type IN ('ASSIGNED', 'REASSIGNED')
        ORDER BY pe.phone_id, pe.event_at DESC
      ),
      updated AS (
        UPDATE phone_events pe
        SET event_at = ${eventDate.toISOString()}
        FROM target_events te
        WHERE pe.id = te.id
        RETURNING pe.id
      ),
      audit_insert AS (
        INSERT INTO audit_logs (action, entity_type, entity_id, actor_user_id, payload)
        VALUES (
          'history.bulk-update',
          'phone_events',
          'bulk',
          ${auth.session!.user.id},
          CAST(${toJsonPayload({
            phoneCount: phoneIds.length,
            clientName,
            newDate: eventDate.toISOString(),
          })} AS jsonb)
        )
      )
      SELECT COUNT(*)::int AS updated_count
      FROM updated
    `;

    const updatedCount = Number(affectedRows[0]?.updated_count ?? 0);

    return NextResponse.json({
      success: true,
      updatedCount,
      message: `Updated ${updatedCount} history entries`,
    });
  } catch (error: any) {
    console.error('Bulk history update error:', error);
    return NextResponse.json(
      { error: error.message ?? 'Failed to update history dates' },
      { status: 500 }
    );
  }
}
