import { NextRequest, NextResponse } from 'next/server';
import { ensureAdminSession } from '@/lib/auth';
import { importPhones, previewImportPhones } from '@/lib/inventory';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const auth = await ensureAdminSession();
  if (auth.response) {
    return auth.response;
  }

  try {
    const body = await request.json();
    if (body.preview === true) {
      const preview = await previewImportPhones({
        rawText: body.rawText ?? '',
      });

      return NextResponse.json({
        success: true,
        preview,
      });
    }

    const result = await importPhones({
      rawText: body.rawText ?? '',
      actorUserId: auth.session!.user.id,
    });

    return NextResponse.json({
      success: true,
      count: result.insertedCount,
      uniqueCount: result.uniqueCount,
      invalidEntries: result.invalidEntries,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message ?? 'Failed to import phone numbers' },
      { status: 400 }
    );
  }
}

export async function GET() {
  const csv = ['input', '03612812XX', '02125617900 - 02125617949', '02150842750'].join('\n');

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="phone-import-sample.csv"',
      'Cache-Control': 'no-store',
    },
  });
}
