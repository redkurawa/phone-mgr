import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';

// Health check / warmup endpoint
export async function GET(request: NextRequest) {
    try {
        if (!db) {
            return NextResponse.json(
                { status: 'error', message: 'Database not configured' },
                { status: 500 }
            );
        }

        // Simple query to warm up the connection
        await db.execute(sql`SELECT 1`);

        return NextResponse.json({
            status: 'ok',
            timestamp: new Date().toISOString()
        });
    } catch (error: any) {
        console.error('Health check error:', error);
        return NextResponse.json(
            { status: 'error', message: error.message },
            { status: 500 }
        );
    }
}
