import { NextRequest, NextResponse } from 'next/server';
import { ensureAdminSession } from '@/lib/auth';
import { parseInteger } from '@/lib/db';
import { listAuditLogs } from '@/lib/inventory';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = await ensureAdminSession();
  if (auth.response) {
    return auth.response;
  }

  const { searchParams } = new URL(request.url);
  const limit = parseInteger(searchParams.get('limit'), 100);
  const offset = parseInteger(searchParams.get('offset'), 0);

  const result = await listAuditLogs(limit, offset);

  return NextResponse.json(result);
}
