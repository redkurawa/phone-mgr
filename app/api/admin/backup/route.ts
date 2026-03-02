import { NextResponse } from 'next/server';
import { ensureAdminSession } from '@/lib/auth';
import { exportBackupSnapshot } from '@/lib/inventory';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const auth = await ensureAdminSession();
  if (auth.response) {
    return auth.response;
  }

  const snapshot = await exportBackupSnapshot(auth.session!.user.id);
  const timestamp = snapshot.exportedAt.replace(/[:.]/g, '-');

  return new NextResponse(JSON.stringify(snapshot, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="phone-manager-backup-${timestamp}.json"`,
      'Cache-Control': 'no-store',
    },
  });
}
