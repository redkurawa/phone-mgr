import { NextRequest, NextResponse } from 'next/server';
import {
  db,
  phoneNumbers,
  usageHistory,
  statusEnum,
  eventTypeEnum,
} from '@/lib/db';
import { eq, like, or, sql, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// GET - List all phone numbers with optional filters (available to all authenticated users)
export async function GET(request: NextRequest) {
  try {
    if (!db) {
      console.error(
        'Database connection is null. Check DATABASE_URL in .env file.'
      );
      return NextResponse.json(
        {
          error:
            'Database not configured. Set DATABASE_URL environment variable.',
        },
        { status: 500 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const includeHistory = searchParams.get('includeHistory') === 'true';
    const mode = searchParams.get('mode') || 'list'; // 'list', 'blocks', or 'customers'
    const prefix = searchParams.get('prefix') || '';

    // If mode is 'blocks', return unique prefixes
    if (mode === 'blocks') {
      try {
        // Get counts and activation dates in one query
        const blocksQuery = sql`
          SELECT 
            SUBSTR(p.number, 1, LENGTH(p.number) - 2) as prefix,
            COUNT(*) as total,
            COUNT(CASE WHEN p.current_status = 'PAKAI' THEN 1 END) as used,
            MIN(h.event_date) as activation_date
          FROM phone_numbers p
          LEFT JOIN usage_history h ON p.id = h.phone_id AND h.event_type = 'ACTIVATION'
          GROUP BY SUBSTR(p.number, 1, LENGTH(p.number) - 2)
          ORDER BY prefix
        `;

        const result = await db.execute(blocksQuery);

        const blocks = result.rows.map((row: any) => ({
          prefix: row.prefix + 'XX',
          total: Number(row.total),
          used: Number(row.used),
          available: Number(row.total) - Number(row.used),
          activationDate: row.activation_date,
        }));

        return NextResponse.json({
          data: blocks,
          total: blocks.length,
        });
      } catch (error) {
        console.error('Error fetching blocks:', error);
        return NextResponse.json(
          { error: 'Failed to fetch blocks' },
          { status: 500 }
        );
      }
    }

    // If mode is 'customers', return all unique customers with their phone numbers
    if (mode === 'customers') {
      try {
        // Get all phones with client name (both current and historical)
        // First, get current clients from phone_numbers
        const currentClientsQuery = sql`
          SELECT 
            p.current_client as client_name,
            COUNT(*) as phone_count,
            COUNT(CASE WHEN p.current_status = 'PAKAI' THEN 1 END) as active_count
          FROM phone_numbers p
          WHERE p.current_client IS NOT NULL AND p.current_client != ''
          GROUP BY p.current_client
          ORDER BY p.current_client
        `;

        const currentResult = await db.execute(currentClientsQuery);

        // Get historical clients (clients who had phones but don't have any currently)
        const historicalClientsQuery = sql`
          SELECT 
            h.client_name,
            COUNT(*) as phone_count,
            0 as active_count
          FROM usage_history h
          WHERE h.client_name IS NOT NULL AND h.client_name != ''
            AND h.client_name NOT IN (
              SELECT DISTINCT COALESCE(p.current_client, '')
              FROM phone_numbers p
              WHERE p.current_client IS NOT NULL AND p.current_client != ''
            )
          GROUP BY h.client_name
          ORDER BY h.client_name
        `;

        const historicalResult = await db.execute(historicalClientsQuery);

        // Combine current and historical clients
        const allClients = new Map();

        // Add current clients
        currentResult.rows.forEach((row: any) => {
          allClients.set(row.client_name, {
            clientName: row.client_name,
            phoneCount: Number(row.phone_count),
            activeCount: Number(row.active_count),
            status: 'active',
          });
        });

        // Add historical clients
        historicalResult.rows.forEach((row: any) => {
          if (!allClients.has(row.client_name)) {
            allClients.set(row.client_name, {
              clientName: row.client_name,
              phoneCount: Number(row.phone_count),
              activeCount: 0,
              status: 'inactive',
            });
          }
        });

        const customers = Array.from(allClients.values());

        return NextResponse.json({
          data: customers,
          total: customers.length,
        });
      } catch (error) {
        console.error('Error fetching customers:', error);
        return NextResponse.json(
          { error: 'Failed to fetch customers' },
          { status: 500 }
        );
      }
    }

    // If mode is 'customer-phones', return all phone numbers for a specific customer
    if (mode === 'customer-phones') {
      try {
        const clientName = searchParams.get('client');
        if (!clientName) {
          return NextResponse.json(
            { error: 'Client name is required' },
            { status: 400 }
          );
        }

        // Get currently assigned phones for this client
        const currentPhonesQuery = sql`
          SELECT 
            p.id,
            p.number,
            p.current_status,
            p.current_client,
            p.created_at,
            p.updated_at
          FROM phone_numbers p
          WHERE p.current_client = ${clientName}
          ORDER BY p.number
        `;

        const currentPhonesResult = await db.execute(currentPhonesQuery);

        // Get historical phones for this client (from usage_history)
        const historicalPhonesQuery = sql`
          SELECT 
            h.phone_id,
            h.event_date,
            h.event_type,
            h.client_name,
            h.notes,
            p.number
          FROM usage_history h
          LEFT JOIN phone_numbers p ON h.phone_id = p.id
          WHERE h.client_name = ${clientName}
            AND h.event_type IN ('DEASSIGNED', 'REASSIGNED')
          ORDER BY h.event_date DESC
        `;

        const historicalPhonesResult = await db.execute(historicalPhonesQuery);

        // Combine current and historical phones
        const phones: any[] = [];
        const seenPhones = new Set();

        // Add current phones first
        currentPhonesResult.rows.forEach((row: any) => {
          seenPhones.add(row.id);
          phones.push({
            id: row.id,
            number: row.number,
            currentStatus: row.current_status,
            currentClient: row.current_client,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            isActive: true,
            returnDate: null,
          });
        });

        // Add historical phones (only those not currently assigned)
        historicalPhonesResult.rows.forEach((row: any) => {
          if (!seenPhones.has(row.phone_id)) {
            seenPhones.add(row.phone_id);
            phones.push({
              id: row.phone_id,
              number: row.number || 'Unknown',
              currentStatus: 'KOSONG',
              currentClient: null,
              isActive: false,
              returnDate: row.event_date,
            });
          }
        });

        return NextResponse.json(
          {
            data: phones,
            total: phones.length,
          },
          {
            headers: {
              'Cache-Control':
                'no-store, no-cache, must-revalidate, proxy-revalidate',
              Pragma: 'no-cache',
              Expires: '0',
            },
          }
        );
      } catch (error) {
        console.error('Error fetching customer phones:', error);
        return NextResponse.json(
          { error: 'Failed to fetch customer phones' },
          { status: 500 }
        );
      }
    }

    // If prefix is provided (e.g., 03612812), filter numbers in that block
    // This is used for detail view
    let query: any = db.select().from(phoneNumbers);

    // Build conditions
    const conditions = [];

    if (search) {
      const trimmedSearch = search.trim();
      if (trimmedSearch) {
        conditions.push(
          or(
            sql`${phoneNumbers.number} ILIKE ${`%${trimmedSearch}%`}`,
            sql`${phoneNumbers.currentClient} ILIKE ${`%${trimmedSearch}%`}`
          )
        );
      }
    }

    if (status && status !== 'ALL') {
      conditions.push(
        eq(phoneNumbers.currentStatus, status as 'KOSONG' | 'PAKAI')
      );
    }

    // If prefix is provided, filter numbers in that block (e.g., 03612812 -> 0361281200-0361281299)
    if (prefix) {
      // Remove XX suffix if present and use as prefix filter
      const prefixBase = prefix.replace(/XX$/, '');
      if (prefixBase) {
        conditions.push(like(phoneNumbers.number, `${prefixBase}%`));
      }
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    // Get total count
    let countQuery: any = db
      .select({ count: sql<number>`count(*)`.as('count') })
      .from(phoneNumbers);
    if (conditions.length > 0) {
      countQuery = countQuery.where(and(...conditions));
    }
    const countResult = await countQuery;
    const total = Number(countResult[0].count);

    // Apply pagination and ordering
    query = query.orderBy(phoneNumbers.number).limit(limit).offset(offset);

    const numbers = await query;

    // Only fetch history if explicitly requested (lazy loading)
    // This removes the N+1 query problem for normal list operations
    let numbersWithHistory = numbers;
    if (includeHistory && numbers.length > 0) {
      // Fetch all history for the returned phone IDs in a single query
      const phoneIds = numbers.map(
        (num: typeof phoneNumbers.$inferSelect) => num.id
      );
      const historyRecords = await db
        .select()
        .from(usageHistory)
        .where(sql`${usageHistory.phoneId} IN ${phoneIds}`)
        .orderBy(usageHistory.phoneId, usageHistory.eventDate);

      // Group history by phone ID
      const historyByPhoneId = new Map<string, typeof historyRecords>();
      historyRecords.forEach((record: typeof usageHistory.$inferSelect) => {
        const existing = historyByPhoneId.get(record.phoneId) || [];
        existing.push(record);
        historyByPhoneId.set(record.phoneId, existing);
      });

      // Attach history to each phone number
      numbersWithHistory = numbers.map(
        (num: typeof phoneNumbers.$inferSelect) => ({
          ...num,
          history: historyByPhoneId.get(num.id) || [],
        })
      );
    }

    return NextResponse.json({
      data: numbersWithHistory,
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Error fetching phone numbers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch phone numbers' },
      { status: 500 }
    );
  }
}

// POST - Create new phone numbers (bulk generation) - Admin only
export async function POST(request: NextRequest) {
  try {
    // Check if user is admin
    const session = await getServerSession(authOptions);
    if (!session?.user?.email || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!db) {
      console.error(
        'Database connection is null. Check DATABASE_URL in .env file.'
      );
      return NextResponse.json(
        {
          error:
            'Database not configured. Set DATABASE_URL environment variable.',
        },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { prefix, range } = body;

    // Check if using range mode
    const isRangeMode = range && range.trim().length > 0;

    // Prefix is required for block mode, optional for range mode
    if (!prefix && !isRangeMode) {
      return NextResponse.json(
        { error: 'Prefix is required' },
        { status: 400 }
      );
    }

    const generatedNumbers: (typeof phoneNumbers.$inferInsert)[] = [];
    const historyRecords: (typeof usageHistory.$inferInsert)[] = [];

    if (range) {
      // Manual range mode (e.g., 02125617950 - 02125617999)
      const [startStr, endStr] = range.split('-').map((s: string) => s.trim());

      // Extract full phone numbers (all digits)
      const startNum = startStr.replace(/\D/g, '');
      const endNum = endStr.replace(/\D/g, '');

      // Validate that we have valid numbers
      if (!startNum || !endNum || startNum.length !== endNum.length) {
        return NextResponse.json(
          {
            error:
              'Invalid range format. Use format: 02125617950 - 02125617999',
          },
          { status: 400 }
        );
      }

      const start = parseInt(startNum);
      const end = parseInt(endNum);
      const digitLength = startNum.length; // Preserve the original digit length

      if (isNaN(start) || isNaN(end) || end < start) {
        return NextResponse.json(
          {
            error:
              'Invalid range. End number must be greater than or equal to start.',
          },
          { status: 400 }
        );
      }

      const count = end - start + 1;
      if (count > 10000) {
        return NextResponse.json(
          { error: 'Maximum range is 10,000 numbers per request.' },
          { status: 400 }
        );
      }

      for (let i = start; i <= end; i++) {
        const fullNumber = i.toString().padStart(digitLength, '0'); // Preserve leading zeros
        const id = uuidv4();

        generatedNumbers.push({
          id,
          number: fullNumber,
          currentStatus: 'KOSONG',
          currentClient: null,
        });

        historyRecords.push({
          id: uuidv4(),
          phoneId: id,
          eventType: 'ACTIVATION',
          clientName: null,
          eventDate: new Date(),
          notes: 'Bulk generation - manual range',
        });
      }
    } else {
      // Block mode (100 numbers with XX suffix)
      const basePrefix = prefix.replace(/XX/g, '');

      for (let i = 0; i < 100; i++) {
        const suffix = i.toString().padStart(2, '0');
        const fullNumber = basePrefix + suffix;
        const id = uuidv4();

        generatedNumbers.push({
          id,
          number: fullNumber,
          currentStatus: 'KOSONG',
          currentClient: null,
        });

        historyRecords.push({
          id: uuidv4(),
          phoneId: id,
          eventType: 'ACTIVATION',
          clientName: null,
          eventDate: new Date(),
          notes: 'Bulk generation - 100 block',
        });
      }
    }

    // Insert phone numbers
    if (generatedNumbers.length > 0) {
      await (db as any).insert(phoneNumbers).values(generatedNumbers);
      await (db as any).insert(usageHistory).values(historyRecords);
    }

    return NextResponse.json({
      success: true,
      count: generatedNumbers.length,
      message: `Successfully generated ${generatedNumbers.length} phone numbers`,
    });
  } catch (error: any) {
    console.error('Error creating phone numbers:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to create phone numbers', details: errorMessage },
      { status: 500 }
    );
  }
}

// DELETE - Delete phone numbers by prefix
export async function DELETE(request: NextRequest) {
  try {
    if (!db) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const prefix = searchParams.get('prefix');

    if (!prefix) {
      return NextResponse.json(
        { error: 'Prefix is required' },
        { status: 400 }
      );
    }

    const prefixBase = prefix.replace(/XX$/, '');

    if (!prefixBase) {
      return NextResponse.json({ error: 'Invalid prefix' }, { status: 400 });
    }

    // Delete phones matching the prefix using raw SQL
    const deleteQuery = sql`DELETE FROM phone_numbers WHERE number LIKE ${prefixBase + '%'}`;
    await db.execute(deleteQuery);

    return NextResponse.json({
      success: true,
      message: `Deleted phone numbers with prefix ${prefix}`,
    });
  } catch (error: any) {
    console.error('Error deleting phone numbers:', error);
    return NextResponse.json(
      { error: 'Failed to delete phone numbers' },
      { status: 500 }
    );
  }
}
