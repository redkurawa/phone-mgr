import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

// GET - Fetch activation date for a specific block
export async function GET(request: NextRequest) {
    try {
        if (!db) {
            return NextResponse.json(
                { error: 'Database not configured' },
                { status: 500 }
            );
        }

        const searchParams = request.nextUrl.searchParams;
        const prefix = searchParams.get('prefix');

        if (!prefix) {
            return NextResponse.json(
                { error: 'Prefix is required' },
                { status: 400 }
            );
        }

        // Remove XX suffix
        const prefixBase = prefix.replace(/XX$/, '');

        // Simple query - get earliest activation date for this block
        const query = sql`
            SELECT MIN(h.event_date) as activation_date
            FROM phone_numbers p
            INNER JOIN usage_history h ON p.id = h.phone_id AND h.event_type = 'ACTIVATION'
            WHERE p.number LIKE ${prefixBase + '%'}
        `;

        const result = await db.execute(query);

        return NextResponse.json({
            activationDate: result.rows[0]?.activation_date || null,
        });
    } catch (error: any) {
        console.error('Error fetching block activation date:', error);
        return NextResponse.json(
            { error: 'Failed to fetch activation date' },
            { status: 500 }
        );
    }
}
