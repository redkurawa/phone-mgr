import { NextRequest, NextResponse } from 'next/server';
import { ensureAdminSession } from '@/lib/auth';
import { requireDatabase, normalizePhoneNumber } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const auth = await ensureAdminSession();
  if (auth.response) {
    return auth.response;
  }

  try {
    const body = await request.json();
    const phoneNumber = normalizePhoneNumber(body.phoneNumber || '');

    if (!phoneNumber) {
      return NextResponse.json(
        { error: 'Phone number is required' },
        { status: 400 }
      );
    }

    const sql = requireDatabase();

    // Cari phone ID dan pastikan status PAKAI
    const [phone] = await sql`
      SELECT id, status, current_client_name, phone_number
      FROM phone_inventory
      WHERE phone_number = ${phoneNumber}
    `;

    if (!phone) {
      return NextResponse.json(
        { error: 'Phone number not found' },
        { status: 404 }
      );
    }

    if (phone.status !== 'PAKAI') {
      return NextResponse.json(
        { error: 'Phone number is not assigned to any client' },
        { status: 400 }
      );
    }

    // Silent deassign: update inventory dan HAPUS semua history
    await sql`
      UPDATE phone_inventory
      SET 
        status = 'KOSONG',
        current_client_name = NULL,
        updated_at = NOW(),
        version = version + 1
      WHERE id = ${phone.id}
    `;

    // HAPUS semua history/events untuk nomor ini (seolah-olah belum pernah dipakai)
    const deletedHistory = await sql`
      DELETE FROM phone_events
      WHERE phone_id = ${phone.id}
      RETURNING id
    `;

    // Insert audit log saja (tanpa history)
    await sql`
      INSERT INTO audit_logs (action, entity_type, entity_id, actor_user_id, payload)
      VALUES (
        'inventory.silent-deassign',
        'phone_inventory',
        ${phone.id},
        ${auth.session!.user.id},
        CAST(${JSON.stringify({
          id: phone.id,
          phoneNumber: phone.phone_number,
          previousClient: phone.current_client_name,
          reason: body.reason || 'Manual silent deassign',
          deletedHistoryCount: deletedHistory.length,
        })} AS jsonb)
      )
    `;

    return NextResponse.json({
      success: true,
      message: `Phone number ${phone.phone_number} has been silently deassigned`,
      phoneNumber: phone.phone_number,
      previousClient: phone.current_client_name,
      deletedHistoryCount: deletedHistory.length,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message ?? 'Failed to deassign phone number' },
      { status: 500 }
    );
  }
}
