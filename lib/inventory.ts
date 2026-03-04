import {
  invalidateInventoryCache,
  isPhoneStatus,
  mapHistoryRow,
  mapPhoneRow,
  normalizeClientName,
  normalizePhoneNumber,
  readCache,
  requireDatabase,
  toJsonPayload,
  writeCache,
  type PhoneStatus,
} from '@/lib/db';

type ListOptions = {
  search: string;
  status: string;
  limit: number;
  offset: number;
  prefix: string;
  includeHistory: boolean;
};

type GenerateInput = {
  prefix?: string;
  range?: string;
  actorUserId: string;
};

type ImportInput = {
  rawText: string;
  actorUserId: string;
};

type ImportPreviewInput = {
  rawText: string;
};

type BulkAction = 'assign' | 'deassign' | 'reassign';

type BulkUpdateInput = {
  ids: string[];
  action: BulkAction;
  clientName?: string;
  notes?: string;
  returnDate?: string;
  actorUserId: string;
};

type UpdatePhoneInput = {
  phoneId: string;
  currentStatus?: string;
  currentClient?: string | null;
  action?: string | null;
  notes?: string;
  actorUserId: string;
};

type UpdateBlockActivationInput = {
  prefix: string;
  activationDate: string;
  actorUserId: string;
};

type UpdateHistoryDateInput = {
  phoneId: string;
  historyId: string;
  eventDate: string;
  actorUserId: string;
};

type Cacheable<T> = {
  data: T;
  total: number;
};

function sanitizeSearch(value: string) {
  return value.trim();
}

function sanitizeNote(value?: string | null) {
  const trimmed = value?.trim() ?? '';
  return trimmed ? trimmed.slice(0, 2_000) : null;
}

function jsonArrayToUuidSet(ids: string[]) {
  return JSON.stringify(ids);
}

async function writeAuditLog(
  action: string,
  entityType: string,
  entityId: string,
  actorUserId: string | null,
  payload: unknown
) {
  const sql = requireDatabase();

  await sql`
    INSERT INTO audit_logs (action, entity_type, entity_id, actor_user_id, payload)
    VALUES (
      ${action},
      ${entityType},
      ${entityId},
      ${actorUserId},
      CAST(${toJsonPayload(payload)} AS jsonb)
    )
  `;
}

export async function listPhoneInventory(options: ListOptions) {
  const sql = requireDatabase();
  const search = sanitizeSearch(options.search);
  const status = isPhoneStatus(options.status) ? options.status : null;
  const prefix = options.prefix.replace(/XX$/i, '');
  const pattern = `%${search}%`;

  const [countRow] = await sql`
    SELECT COUNT(*)::int AS count
    FROM phone_inventory pi
    WHERE (
      ${search === ''}
      OR pi.phone_number ILIKE ${pattern}
      OR COALESCE(pi.current_client_name, '') ILIKE ${pattern}
      OR EXISTS (
        SELECT 1
        FROM phone_events pe
        WHERE pe.phone_id = pi.id
          AND COALESCE(pe.client_name, '') ILIKE ${pattern}
      )
    )
    AND (${status === null} OR pi.status = ${status})
    AND (${prefix === ''} OR pi.block_key = ${prefix})
  `;

  const rows = await sql`
    SELECT
      pi.id,
      pi.phone_number,
      pi.status,
      pi.current_client_name,
      pi.created_at,
      pi.updated_at
    FROM phone_inventory pi
    WHERE (
      ${search === ''}
      OR pi.phone_number ILIKE ${pattern}
      OR COALESCE(pi.current_client_name, '') ILIKE ${pattern}
      OR EXISTS (
        SELECT 1
        FROM phone_events pe
        WHERE pe.phone_id = pi.id
          AND COALESCE(pe.client_name, '') ILIKE ${pattern}
      )
    )
    AND (${status === null} OR pi.status = ${status})
    AND (${prefix === ''} OR pi.block_key = ${prefix})
    ORDER BY pi.phone_number
    LIMIT ${options.limit}
    OFFSET ${options.offset}
  `;

  const phones = rows.map(mapPhoneRow);

  if (!options.includeHistory || phones.length === 0) {
    return {
      data: phones,
      total: Number(countRow?.count ?? 0),
      limit: options.limit,
      offset: options.offset,
    };
  }

  const historyRows = await sql`
    SELECT
      pe.id,
      pe.phone_id,
      pe.event_type,
      pe.client_name,
      pe.event_at,
      pe.note
    FROM phone_events pe
    WHERE pe.phone_id IN (
      SELECT jsonb_array_elements_text(CAST(${JSON.stringify(
        phones.map((phone) => phone.id)
      )} AS jsonb))::uuid
    )
    ORDER BY pe.phone_id, pe.event_at DESC
  `;

  const historyByPhoneId = new Map<
    string,
    ReturnType<typeof mapHistoryRow>[]
  >();

  for (const row of historyRows) {
    const mapped = mapHistoryRow(row);
    const current = historyByPhoneId.get(mapped.phoneId) ?? [];
    current.push(mapped);
    historyByPhoneId.set(mapped.phoneId, current);
  }

  return {
    data: phones.map((phone) => ({
      ...phone,
      history: historyByPhoneId.get(phone.id) ?? [],
    })),
    total: Number(countRow?.count ?? 0),
    limit: options.limit,
    offset: options.offset,
  };
}

export async function listBlocks() {
  const cached = readCache<Cacheable<any[]>>('blocks:summary');
  if (cached) {
    return cached;
  }

  const sql = requireDatabase();
  const rows = await sql`
    SELECT
      block_key,
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE status = 'PAKAI')::int AS used,
      MIN(activated_at) AS activation_date
    FROM phone_inventory
    GROUP BY block_key
    ORDER BY block_key
  `;

  const payload = {
    data: rows.map((row) => ({
      prefix: `${row.block_key}XX`,
      total: Number(row.total),
      used: Number(row.used),
      available: Number(row.total) - Number(row.used),
      activationDate: row.activation_date,
    })),
    total: rows.length,
  };

  return writeCache('blocks:summary', payload);
}

export async function listCustomers() {
  const cached = readCache<Cacheable<any[]>>('customers:summary');
  if (cached) {
    return cached;
  }

  const sql = requireDatabase();
  const rows = await sql`
    WITH names AS (
      SELECT DISTINCT current_client_name AS client_name
      FROM phone_inventory
      WHERE current_client_name IS NOT NULL AND current_client_name <> ''
      UNION
      SELECT DISTINCT client_name
      FROM phone_events
      WHERE client_name IS NOT NULL AND client_name <> ''
    ),
    current_counts AS (
      SELECT
        current_client_name AS client_name,
        COUNT(*)::int AS active_count
      FROM phone_inventory
      WHERE current_client_name IS NOT NULL AND current_client_name <> ''
      GROUP BY current_client_name
    ),
    history_counts AS (
      SELECT
        client_name,
        COUNT(DISTINCT phone_id)::int AS phone_count
      FROM phone_events
      WHERE client_name IS NOT NULL AND client_name <> ''
      GROUP BY client_name
    )
    SELECT
      n.client_name,
      GREATEST(COALESCE(h.phone_count, 0), COALESCE(c.active_count, 0))::int AS phone_count,
      COALESCE(c.active_count, 0)::int AS active_count,
      CASE
        WHEN COALESCE(c.active_count, 0) > 0 THEN 'active'
        ELSE 'inactive'
      END AS status
    FROM names n
    LEFT JOIN current_counts c ON c.client_name = n.client_name
    LEFT JOIN history_counts h ON h.client_name = n.client_name
    ORDER BY n.client_name
  `;

  const payload = {
    data: rows.map((row) => ({
      clientName: row.client_name,
      phoneCount: Number(row.phone_count),
      activeCount: Number(row.active_count),
      status: row.status,
    })),
    total: rows.length,
  };

  return writeCache('customers:summary', payload);
}

export async function listCustomerPhones(clientName: string) {
  const normalizedClientName = normalizeClientName(clientName);
  const cacheKey = `customer-phones:${normalizedClientName}`;
  const cached = readCache<Cacheable<any[]>>(cacheKey);
  if (cached) {
    return cached;
  }

  const sql = requireDatabase();
  const rows = await sql`
    WITH current_phones AS (
      SELECT
        pi.id,
        pi.phone_number,
        pi.status,
        pi.current_client_name,
        pi.created_at,
        pi.updated_at,
        TRUE AS is_active,
        NULL::timestamptz AS return_date
      FROM phone_inventory pi
      WHERE pi.current_client_name = ${normalizedClientName}
    ),
    historical_phones AS (
      SELECT DISTINCT ON (pe.phone_id)
        pi.id,
        pi.phone_number,
        'KOSONG'::phone_status AS status,
        NULL::text AS current_client_name,
        pi.created_at,
        pi.updated_at,
        FALSE AS is_active,
        pe.event_at AS return_date
      FROM phone_events pe
      INNER JOIN phone_inventory pi ON pi.id = pe.phone_id
      WHERE pe.client_name = ${normalizedClientName}
        AND pe.event_type = 'DEASSIGNED'
        AND COALESCE(pi.current_client_name, '') <> ${normalizedClientName}
      ORDER BY pe.phone_id, pe.event_at DESC
    )
    SELECT * FROM current_phones
    UNION ALL
    SELECT * FROM historical_phones
    ORDER BY phone_number
  `;

  const payload = {
    data: rows.map((row) => ({
      id: row.id,
      number: row.phone_number,
      currentStatus: row.status,
      currentClient: row.current_client_name,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      isActive: row.is_active,
      returnDate: row.return_date,
    })),
    total: rows.length,
  };

  return writeCache(cacheKey, payload);
}

export async function getPhoneById(id: string, includeHistory = true) {
  const sql = requireDatabase();
  const [phoneRow] = await sql`
    SELECT
      id,
      phone_number,
      status,
      current_client_name,
      created_at,
      updated_at
    FROM phone_inventory
    WHERE id = ${id}
    LIMIT 1
  `;

  if (!phoneRow) {
    return null;
  }

  const phone = mapPhoneRow(phoneRow);
  if (!includeHistory) {
    return phone;
  }

  const historyRows = await sql`
    SELECT
      id,
      phone_id,
      event_type,
      client_name,
      event_at,
      note
    FROM phone_events
    WHERE phone_id = ${id}
    ORDER BY event_at DESC
  `;

  return {
    ...phone,
    history: historyRows.map(mapHistoryRow),
  };
}

export async function getPhoneHistory(
  phoneId: string,
  limit: number,
  offset: number
) {
  const sql = requireDatabase();
  const rows = await sql`
    SELECT
      id,
      phone_id,
      event_type,
      client_name,
      event_at,
      note
    FROM phone_events
    WHERE phone_id = ${phoneId}
    ORDER BY event_at DESC
    LIMIT ${limit}
    OFFSET ${offset}
  `;

  const [countRow] = await sql`
    SELECT COUNT(*)::int AS count
    FROM phone_events
    WHERE phone_id = ${phoneId}
  `;

  return {
    data: rows.map(mapHistoryRow),
    total: Number(countRow?.count ?? 0),
    limit,
    offset,
  };
}

function parseRange(range: string) {
  const [startRaw, endRaw] = range.split('-').map((part) => part.trim());
  const start = normalizePhoneNumber(startRaw ?? '');
  const end = normalizePhoneNumber(endRaw ?? '');

  if (!start || !end || start.length !== end.length) {
    throw new Error(
      'Invalid range format. Use format like 02125617950 - 02125617999.'
    );
  }

  const startNumber = Number.parseInt(start, 10);
  const endNumber = Number.parseInt(end, 10);

  if (
    Number.isNaN(startNumber) ||
    Number.isNaN(endNumber) ||
    endNumber < startNumber
  ) {
    throw new Error('Invalid range values.');
  }

  const count = endNumber - startNumber + 1;
  if (count > 10_000) {
    throw new Error('Maximum range is 10,000 numbers per request.');
  }

  return {
    startNumber,
    endNumber,
    digitLength: start.length,
    count,
  };
}

function expandExplicitBlock(prefixPattern: string) {
  const match = prefixPattern.trim().match(/^([0-9]+)XX$/i);
  if (!match) {
    throw new Error(`Invalid block pattern: ${prefixPattern}`);
  }

  return Array.from({ length: 100 }, (_, index) => {
    const suffix = index.toString().padStart(2, '0');
    return `${match[1]}${suffix}`;
  });
}

function tokenizeImportText(rawText: string) {
  return rawText
    .split(/\r?\n|,|;/)
    .map((token) => token.trim())
    .filter(Boolean);
}

function parseImportedNumbers(rawText: string) {
  const tokens = tokenizeImportText(rawText);
  if (tokens.length === 0) {
    throw new Error('Import text is empty.');
  }

  const invalidEntries: string[] = [];
  const allNumbers: string[] = [];

  for (const token of tokens) {
    if (/\d+\s*-\s*\d+/.test(token)) {
      try {
        const parsedRange = parseRange(token);
        for (
          let value = parsedRange.startNumber;
          value <= parsedRange.endNumber;
          value += 1
        ) {
          allNumbers.push(
            value.toString().padStart(parsedRange.digitLength, '0')
          );
        }
      } catch {
        invalidEntries.push(token);
      }
      continue;
    }

    if (/^[0-9]+XX$/i.test(token)) {
      try {
        allNumbers.push(...expandExplicitBlock(token));
      } catch {
        invalidEntries.push(token);
      }
      continue;
    }

    const normalized = normalizePhoneNumber(token);
    if (normalized.length >= 3) {
      allNumbers.push(normalized);
      continue;
    }

    invalidEntries.push(token);
  }

  const deduplicatedNumbers = Array.from(new Set(allNumbers));
  if (deduplicatedNumbers.length === 0) {
    throw new Error('No valid phone numbers found in import text.');
  }

  if (deduplicatedNumbers.length > 10_000) {
    throw new Error('Import is limited to 10,000 unique numbers per request.');
  }

  return {
    numbers: deduplicatedNumbers.map((phoneNumber) => ({
      phoneNumber,
      blockKey: phoneNumber.slice(0, -2),
    })),
    invalidEntries,
    parsedCount: allNumbers.length,
    uniqueCount: deduplicatedNumbers.length,
  };
}

export async function generatePhones(input: GenerateInput) {
  const sql = requireDatabase();
  const note = input.range?.trim()
    ? 'Generated from manual range'
    : 'Generated from 100-number block';
  let result: any[] = [];
  let requestedCount = 0;

  if (input.range?.trim()) {
    const parsedRange = parseRange(input.range);
    requestedCount = parsedRange.count;

    result = await sql`
      WITH candidate_numbers AS (
        SELECT
          LPAD(series::text, ${parsedRange.digitLength}, '0') AS phone_number
        FROM generate_series(${parsedRange.startNumber}::bigint, ${parsedRange.endNumber}::bigint) AS series
      ),
      prepared AS (
        SELECT
          phone_number,
          LEFT(phone_number, LENGTH(phone_number) - 2) AS block_key
        FROM candidate_numbers
      ),
      inserted AS (
        INSERT INTO phone_inventory (phone_number, block_key, activated_at)
        SELECT
          prepared.phone_number,
          prepared.block_key,
          NOW()
        FROM prepared
        WHERE NOT EXISTS (
          SELECT 1
          FROM phone_inventory pi
          WHERE pi.phone_number = prepared.phone_number
        )
        RETURNING id, phone_number, activated_at
      ),
      history_insert AS (
        INSERT INTO phone_events (phone_id, event_type, event_at, actor_user_id, note)
        SELECT
          inserted.id,
          'ACTIVATION'::phone_event_type,
          inserted.activated_at,
          ${input.actorUserId},
          ${note}
        FROM inserted
      ),
      audit_insert AS (
        INSERT INTO audit_logs (action, entity_type, entity_id, actor_user_id, payload)
        VALUES (
          'inventory.generate',
          'phone_inventory',
          'range',
          ${input.actorUserId},
          CAST(${toJsonPayload({
            range: input.range,
            requestedCount,
          })} AS jsonb)
        )
      )
      SELECT COUNT(*)::int AS inserted_count
      FROM inserted
    `;
  } else {
    const prefix = normalizePhoneNumber(input.prefix ?? '');
    if (!prefix) {
      throw new Error('Prefix is required.');
    }

    requestedCount = 100;

    result = await sql`
      WITH candidate_numbers AS (
        SELECT
          ${prefix} || LPAD(series::text, 2, '0') AS phone_number
        FROM generate_series(0, 99) AS series
      ),
      inserted AS (
        INSERT INTO phone_inventory (phone_number, block_key, activated_at)
        SELECT
          candidate_numbers.phone_number,
          ${prefix},
          NOW()
        FROM candidate_numbers
        WHERE NOT EXISTS (
          SELECT 1
          FROM phone_inventory pi
          WHERE pi.phone_number = candidate_numbers.phone_number
        )
        RETURNING id, phone_number, activated_at
      ),
      history_insert AS (
        INSERT INTO phone_events (phone_id, event_type, event_at, actor_user_id, note)
        SELECT
          inserted.id,
          'ACTIVATION'::phone_event_type,
          inserted.activated_at,
          ${input.actorUserId},
          ${note}
        FROM inserted
      ),
      audit_insert AS (
        INSERT INTO audit_logs (action, entity_type, entity_id, actor_user_id, payload)
        VALUES (
          'inventory.generate',
          'phone_inventory',
          ${prefix},
          ${input.actorUserId},
          CAST(${toJsonPayload({
            prefix,
            requestedCount,
          })} AS jsonb)
        )
      )
      SELECT COUNT(*)::int AS inserted_count
      FROM inserted
    `;
  }

  const insertedCount = Number(result[0]?.inserted_count ?? 0);

  invalidateInventoryCache();

  return {
    insertedCount,
    requestedCount,
  };
}

export async function importPhones(input: ImportInput) {
  const sql = requireDatabase();
  const parsed = parseImportedNumbers(input.rawText);
  const payloadJson = JSON.stringify(parsed.numbers);

  const result = await sql`
    WITH source_rows AS (
      SELECT
        entry.phone_number,
        entry.block_key
      FROM jsonb_to_recordset(CAST(${payloadJson} AS jsonb)) AS entry(
        phone_number text,
        block_key text
      )
    ),
    inserted AS (
      INSERT INTO phone_inventory (phone_number, block_key, activated_at)
      SELECT
        source_rows.phone_number,
        source_rows.block_key,
        NOW()
      FROM source_rows
      WHERE NOT EXISTS (
        SELECT 1
        FROM phone_inventory pi
        WHERE pi.phone_number = source_rows.phone_number
      )
      RETURNING id, activated_at
    ),
    history_insert AS (
      INSERT INTO phone_events (phone_id, event_type, event_at, actor_user_id, note)
      SELECT
        inserted.id,
        'ACTIVATION'::phone_event_type,
        inserted.activated_at,
        ${input.actorUserId},
        'Imported in bulk'
      FROM inserted
    ),
    audit_insert AS (
      INSERT INTO audit_logs (action, entity_type, entity_id, actor_user_id, payload)
      VALUES (
        'inventory.import',
        'phone_inventory',
        'bulk-import',
        ${input.actorUserId},
        CAST(${toJsonPayload({
          uniqueCount: parsed.uniqueCount,
          invalidEntries: parsed.invalidEntries,
        })} AS jsonb)
      )
    )
    SELECT COUNT(*)::int AS inserted_count
    FROM inserted
  `;

  invalidateInventoryCache();

  return {
    insertedCount: Number(result[0]?.inserted_count ?? 0),
    uniqueCount: parsed.uniqueCount,
    invalidEntries: parsed.invalidEntries,
  };
}

export async function previewImportPhones(input: ImportPreviewInput) {
  const sql = requireDatabase();
  const parsed = parseImportedNumbers(input.rawText);
  const payloadJson = JSON.stringify(parsed.numbers);

  const rows = await sql`
    WITH source_rows AS (
      SELECT
        entry.phone_number,
        entry.block_key
      FROM jsonb_to_recordset(CAST(${payloadJson} AS jsonb)) AS entry(
        phone_number text,
        block_key text
      )
    ),
    existing_numbers AS (
      SELECT
        source_rows.phone_number
      FROM source_rows
      INNER JOIN phone_inventory pi ON pi.phone_number = source_rows.phone_number
    ),
    new_blocks AS (
      SELECT COUNT(DISTINCT source_rows.block_key)::int AS count
      FROM source_rows
      WHERE NOT EXISTS (
        SELECT 1
        FROM phone_inventory pi
        WHERE pi.phone_number = source_rows.phone_number
      )
    )
    SELECT
      (SELECT COUNT(*)::int FROM existing_numbers) AS existing_count,
      (SELECT count FROM new_blocks) AS new_block_count
  `;

  const summary = rows[0];
  const existingCount = Number(summary?.existing_count ?? 0);

  return {
    parsedCount: parsed.parsedCount,
    uniqueCount: parsed.uniqueCount,
    invalidEntries: parsed.invalidEntries,
    existingCount,
    readyCount: parsed.uniqueCount - existingCount,
    newBlockCount: Number(summary?.new_block_count ?? 0),
  };
}

export async function bulkUpdatePhones(input: BulkUpdateInput) {
  const sql = requireDatabase();
  const ids = Array.from(new Set(input.ids.filter(Boolean)));
  const normalizedClientName = normalizeClientName(input.clientName ?? '');
  const note = sanitizeNote(input.notes);

  if (ids.length === 0) {
    throw new Error('At least one phone id is required.');
  }

  if (
    (input.action === 'assign' || input.action === 'reassign') &&
    !normalizedClientName
  ) {
    throw new Error('Client name is required.');
  }

  const nextStatus: PhoneStatus =
    input.action === 'deassign' ? 'KOSONG' : 'PAKAI';
  const nextClientName =
    input.action === 'deassign' ? null : normalizedClientName;
  const actionSet = jsonArrayToUuidSet(ids);
  const shouldUseReturnDate =
    input.returnDate &&
    (input.action === 'deassign' || input.action === 'assign');
  const eventTimestamp = shouldUseReturnDate
    ? input.returnDate + ' 00:00:00'
    : '';
  // DEBUG: Log timestamp value
  console.log('[DEBUG] bulkUpdatePhones:', {
    action: input.action,
    returnDate: input.returnDate,
    shouldUseReturnDate,
    eventTimestamp,
  });

  const result = await sql`
    WITH selected AS (
      SELECT
        pi.id,
        pi.status,
        pi.current_client_name
      FROM phone_inventory pi
      WHERE pi.id IN (
        SELECT jsonb_array_elements_text(CAST(${actionSet} AS jsonb))::uuid
      )
    ),
    guard AS (
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE status = 'KOSONG')::int AS free_count,
        COUNT(*) FILTER (WHERE status = 'PAKAI')::int AS used_count
      FROM selected
    ),
    updated AS (
      UPDATE phone_inventory pi
      SET
        status = ${nextStatus}::phone_status,
        current_client_name = ${nextClientName},
        updated_at = NOW(),
        version = pi.version + 1
      FROM guard g
      WHERE pi.id IN (SELECT id FROM selected)
        AND (
          (${input.action === 'assign'} AND g.total = g.free_count)
          OR (${input.action === 'deassign'} AND g.total = g.used_count)
          OR (${input.action === 'reassign'} AND g.total = g.used_count)
        )
      RETURNING pi.id
    ),
    event_insert AS (
      INSERT INTO phone_events (
        phone_id,
        event_type,
        client_name,
        event_at,
        actor_user_id,
        note
      )
      SELECT
        s.id,
        CASE
          WHEN ${input.action} = 'assign' THEN 'ASSIGNED'::phone_event_type
          WHEN ${input.action} = 'deassign' THEN 'DEASSIGNED'::phone_event_type
          ELSE 'REASSIGNED'::phone_event_type
        END,
        CASE
          WHEN ${input.action} = 'deassign' THEN s.current_client_name
          ELSE ${nextClientName}
        END,
        COALESCE(
          TO_TIMESTAMP(NULLIF(${eventTimestamp}, ''), 'YYYY-MM-DD HH24:MI:SS'),
          NOW()
        ),
        ${input.actorUserId},
        ${note}
      FROM selected s
      WHERE EXISTS (
        SELECT 1
        FROM updated u
        WHERE u.id = s.id
      )
    ),
    audit_insert AS (
      INSERT INTO audit_logs (action, entity_type, entity_id, actor_user_id, payload)
      VALUES (
        ${`inventory.${input.action}`},
        'phone_inventory',
        'bulk',
        ${input.actorUserId},
        CAST(${toJsonPayload({
          ids,
          action: input.action,
          clientName: nextClientName,
          note,
          returnDate: input.returnDate,
        })} AS jsonb)
      )
    )
    SELECT
      (SELECT total FROM guard) AS requested_count,
      (SELECT COUNT(*)::int FROM updated) AS updated_count
  `;

  const summary = result[0];
  const requestedCount = Number(summary?.requested_count ?? 0);
  const updatedCount = Number(summary?.updated_count ?? 0);

  if (requestedCount !== ids.length) {
    throw new Error('Some selected phone numbers were not found.');
  }

  if (updatedCount !== requestedCount) {
    if (input.action === 'assign') {
      throw new Error('All selected numbers must be Free before assignment.');
    }
    if (input.action === 'deassign') {
      throw new Error(
        'All selected numbers must be In Use before deassignment.'
      );
    }
    throw new Error(
      'All selected numbers must already be assigned before reassignment.'
    );
  }

  invalidateInventoryCache();

  return {
    count: updatedCount,
  };
}

export async function updatePhoneState(input: UpdatePhoneInput) {
  const current = await getPhoneById(input.phoneId, false);
  if (!current) {
    return null;
  }

  const desiredClientName = normalizeClientName(input.currentClient ?? '');
  const nextClientName = desiredClientName || null;
  const derivedAction =
    input.action?.toLowerCase() ||
    (current.currentStatus === 'KOSONG' && nextClientName
      ? 'assign'
      : current.currentStatus === 'PAKAI' && !nextClientName
        ? 'deassign'
        : current.currentStatus === 'PAKAI' &&
            nextClientName &&
            current.currentClient !== nextClientName
          ? 'reassign'
          : null);

  if (
    derivedAction === 'assign' ||
    derivedAction === 'deassign' ||
    derivedAction === 'reassign'
  ) {
    await bulkUpdatePhones({
      ids: [input.phoneId],
      action: derivedAction,
      clientName: nextClientName ?? undefined,
      notes: input.notes,
      actorUserId: input.actorUserId,
    });

    return getPhoneById(input.phoneId, true);
  }

  if (
    input.currentStatus !== undefined &&
    !isPhoneStatus(input.currentStatus)
  ) {
    throw new Error('Invalid phone status.');
  }

  const nextStatus = nextClientName
    ? 'PAKAI'
    : ((input.currentStatus as PhoneStatus | undefined) ?? 'KOSONG');
  const note = sanitizeNote(input.notes) ?? 'Manual edit';
  const sql = requireDatabase();

  await sql`
    WITH updated AS (
      UPDATE phone_inventory
      SET
        status = ${nextStatus}::phone_status,
        current_client_name = ${nextClientName},
        updated_at = NOW(),
        version = version + 1
      WHERE id = ${input.phoneId}
      RETURNING id
    ),
    event_insert AS (
      INSERT INTO phone_events (phone_id, event_type, client_name, event_at, actor_user_id, note)
      SELECT
        ${input.phoneId},
        'EDITED'::phone_event_type,
        ${nextClientName},
        NOW(),
        ${input.actorUserId},
        ${note}
      WHERE EXISTS (SELECT 1 FROM updated)
    )
    INSERT INTO audit_logs (action, entity_type, entity_id, actor_user_id, payload)
    VALUES (
      'inventory.edit',
      'phone_inventory',
      ${input.phoneId},
      ${input.actorUserId},
      CAST(${toJsonPayload({
        nextStatus,
        nextClientName,
        note,
      })} AS jsonb)
    )
  `;

  invalidateInventoryCache();
  return getPhoneById(input.phoneId, true);
}

export async function deletePhonesByPrefix(
  prefix: string,
  actorUserId: string
) {
  const sql = requireDatabase();
  const blockKey = normalizePhoneNumber(prefix.replace(/XX$/i, ''));
  if (!blockKey) {
    throw new Error('Prefix is required.');
  }

  const result = await sql`
    WITH deleted AS (
      DELETE FROM phone_inventory
      WHERE block_key = ${blockKey}
      RETURNING id
    ),
    audit_insert AS (
      INSERT INTO audit_logs (action, entity_type, entity_id, actor_user_id, payload)
      VALUES (
        'inventory.delete-block',
        'phone_inventory',
        ${blockKey},
        ${actorUserId},
        CAST(${toJsonPayload({ prefix: blockKey })} AS jsonb)
      )
    )
    SELECT COUNT(*)::int AS deleted_count
    FROM deleted
  `;

  invalidateInventoryCache();

  return Number(result[0]?.deleted_count ?? 0);
}

export async function deletePhoneById(id: string, actorUserId: string) {
  const sql = requireDatabase();
  const result = await sql`
    WITH deleted AS (
      DELETE FROM phone_inventory
      WHERE id = ${id}
      RETURNING id
    ),
    audit_insert AS (
      INSERT INTO audit_logs (action, entity_type, entity_id, actor_user_id, payload)
      VALUES (
        'inventory.delete-phone',
        'phone_inventory',
        ${id},
        ${actorUserId},
        CAST(${toJsonPayload({ id })} AS jsonb)
      )
    )
    SELECT COUNT(*)::int AS deleted_count
    FROM deleted
  `;

  invalidateInventoryCache();
  return Number(result[0]?.deleted_count ?? 0);
}

export async function getBlockActivation(prefix: string) {
  const sql = requireDatabase();
  const blockKey = normalizePhoneNumber(prefix.replace(/XX$/i, ''));
  const [row] = await sql`
    SELECT MIN(activated_at) AS activation_date
    FROM phone_inventory
    WHERE block_key = ${blockKey}
  `;

  return row?.activation_date ?? null;
}

export async function updateBlockActivation(input: UpdateBlockActivationInput) {
  const sql = requireDatabase();
  const blockKey = normalizePhoneNumber(input.prefix.replace(/XX$/i, ''));
  const activationDate = new Date(input.activationDate);

  if (!blockKey || Number.isNaN(activationDate.getTime())) {
    throw new Error('Valid prefix and activation date are required.');
  }

  const result = await sql`
    WITH updated_inventory AS (
      UPDATE phone_inventory
      SET
        activated_at = ${activationDate.toISOString()},
        updated_at = NOW(),
        version = version + 1
      WHERE block_key = ${blockKey}
      RETURNING id
    ),
    updated_events AS (
      UPDATE phone_events
      SET
        event_at = ${activationDate.toISOString()},
        actor_user_id = ${input.actorUserId},
        note = 'Activation date updated'
      WHERE phone_id IN (SELECT id FROM updated_inventory)
        AND event_type = 'ACTIVATION'
      RETURNING phone_id
    ),
    inserted_events AS (
      INSERT INTO phone_events (
        phone_id,
        event_type,
        event_at,
        actor_user_id,
        note
      )
      SELECT
        ui.id,
        'ACTIVATION'::phone_event_type,
        ${activationDate.toISOString()},
        ${input.actorUserId},
        'Activation date updated'
      FROM updated_inventory ui
      WHERE NOT EXISTS (
        SELECT 1
        FROM updated_events ue
        WHERE ue.phone_id = ui.id
      )
    ),
    audit_insert AS (
      INSERT INTO audit_logs (action, entity_type, entity_id, actor_user_id, payload)
      VALUES (
        'inventory.update-activation',
        'phone_inventory',
        ${blockKey},
        ${input.actorUserId},
        CAST(${toJsonPayload({
          prefix: blockKey,
          activationDate: activationDate.toISOString(),
        })} AS jsonb)
      )
    )
    SELECT COUNT(*)::int AS updated_count
    FROM updated_inventory
  `;

  const updatedCount = Number(result[0]?.updated_count ?? 0);
  if (updatedCount === 0) {
    throw new Error('No phone numbers found for the selected block.');
  }

  invalidateInventoryCache();
  return updatedCount;
}

export async function updateHistoryEventDate(input: UpdateHistoryDateInput) {
  const sql = requireDatabase();
  const eventDate = new Date(input.eventDate);

  if (Number.isNaN(eventDate.getTime())) {
    throw new Error('Invalid event date.');
  }

  const rows = await sql`
    WITH updated AS (
      UPDATE phone_events
      SET event_at = ${eventDate.toISOString()}
      WHERE id = ${input.historyId}
        AND phone_id = ${input.phoneId}
      RETURNING id
    ),
    audit_insert AS (
      INSERT INTO audit_logs (action, entity_type, entity_id, actor_user_id, payload)
      VALUES (
        'inventory.update-history-date',
        'phone_event',
        ${input.historyId},
        ${input.actorUserId},
        CAST(${toJsonPayload({
          phoneId: input.phoneId,
          eventDate: eventDate.toISOString(),
        })} AS jsonb)
      )
    )
    SELECT COUNT(*)::int AS updated_count
    FROM updated
  `;

  if (Number(rows[0]?.updated_count ?? 0) === 0) {
    throw new Error('History entry not found.');
  }

  invalidateInventoryCache();
}

export async function listUsers() {
  const sql = requireDatabase();
  return sql`
    SELECT
      id,
      email,
      name,
      image,
      role::text AS role,
      status::text AS status,
      created_at
    FROM app_users
    ORDER BY
      CASE status
        WHEN 'approved' THEN 1
        ELSE 3
      END,
      created_at DESC
  `;
}

export async function listAuditLogs(limit = 100, offset = 0) {
  const sql = requireDatabase();
  const safeLimit = Math.min(Math.max(limit, 1), 500);
  const safeOffset = Math.max(offset, 0);

  const rows = await sql`
    SELECT
      al.id,
      al.action,
      al.entity_type,
      al.entity_id,
      al.payload,
      al.created_at,
      au.id AS actor_id,
      au.name AS actor_name,
      au.email AS actor_email
    FROM audit_logs al
    LEFT JOIN app_users au ON au.id = al.actor_user_id
    ORDER BY al.created_at DESC
    LIMIT ${safeLimit}
    OFFSET ${safeOffset}
  `;

  const [countRow] = await sql`
    SELECT COUNT(*)::int AS count
    FROM audit_logs
  `;

  return {
    logs: rows.map((row) => ({
      id: row.id,
      action: row.action,
      entityType: row.entity_type,
      entityId: row.entity_id,
      payload: row.payload ?? {},
      createdAt: row.created_at,
      actor: row.actor_id
        ? {
            id: row.actor_id,
            name: row.actor_name,
            email: row.actor_email,
          }
        : null,
    })),
    total: Number(countRow?.count ?? 0),
    limit: safeLimit,
    offset: safeOffset,
  };
}

export async function exportBackupSnapshot(actorUserId: string) {
  const sql = requireDatabase();

  const [users, inventory, events, audits] = await Promise.all([
    sql`
      SELECT
        id,
        email,
        name,
        image,
        role::text AS role,
        status::text AS status,
        last_login_at,
        created_at,
        updated_at
      FROM app_users
      ORDER BY created_at ASC
    `,
    sql`
      SELECT
        id,
        phone_number,
        block_key,
        status::text AS status,
        current_client_name,
        activated_at,
        version,
        created_at,
        updated_at
      FROM phone_inventory
      ORDER BY phone_number ASC
    `,
    sql`
      SELECT
        id,
        phone_id,
        event_type::text AS event_type,
        client_name,
        event_at,
        actor_user_id,
        note,
        metadata
      FROM phone_events
      ORDER BY event_at ASC
    `,
    sql`
      SELECT
        id,
        action,
        entity_type,
        entity_id,
        actor_user_id,
        payload,
        created_at
      FROM audit_logs
      ORDER BY created_at ASC
    `,
  ]);

  const snapshot = {
    exportedAt: new Date().toISOString(),
    users,
    inventory,
    events,
    auditLogs: audits,
  };

  await writeAuditLog(
    'system.backup-export',
    'system',
    'backup-snapshot',
    actorUserId,
    {
      users: users.length,
      inventory: inventory.length,
      events: events.length,
      auditLogs: audits.length,
      exportedAt: snapshot.exportedAt,
    }
  );

  return snapshot;
}

export async function getSystemOverview() {
  const sql = requireDatabase();
  const startedAt = Date.now();
  await sql`SELECT 1`;
  const latencyMs = Date.now() - startedAt;

  const [
    usersRow,
    inventoryRow,
    blocksRow,
    customersRow,
    eventsRow,
    auditsRow,
    lastAuditRow,
  ] = await Promise.all([
    sql`SELECT COUNT(*)::int AS count FROM app_users`,
    sql`SELECT COUNT(*)::int AS count FROM phone_inventory`,
    sql`SELECT COUNT(DISTINCT block_key)::int AS count FROM phone_inventory`,
    sql`
        SELECT COUNT(*)::int AS count
        FROM (
          SELECT DISTINCT current_client_name AS client_name
          FROM phone_inventory
          WHERE current_client_name IS NOT NULL AND current_client_name <> ''
        ) AS clients
      `,
    sql`SELECT COUNT(*)::int AS count FROM phone_events`,
    sql`SELECT COUNT(*)::int AS count FROM audit_logs`,
    sql`
        SELECT action, created_at
        FROM audit_logs
        ORDER BY created_at DESC
        LIMIT 1
      `,
  ]);

  return {
    status: 'ok',
    checkedAt: new Date().toISOString(),
    databaseLatencyMs: latencyMs,
    counts: {
      users: Number(usersRow[0]?.count ?? 0),
      inventory: Number(inventoryRow[0]?.count ?? 0),
      blocks: Number(blocksRow[0]?.count ?? 0),
      customers: Number(customersRow[0]?.count ?? 0),
      events: Number(eventsRow[0]?.count ?? 0),
      auditLogs: Number(auditsRow[0]?.count ?? 0),
    },
    lastAudit: lastAuditRow[0]
      ? {
          action: lastAuditRow[0].action,
          createdAt: lastAuditRow[0].created_at,
        }
      : null,
  };
}

export async function updateUserStatus(
  userId: string,
  status: 'approved' | 'rejected',
  actorUserId: string
) {
  const sql = requireDatabase();
  const rows = await sql`
    UPDATE app_users
    SET
      status = ${status}::app_user_status,
      updated_at = NOW()
    WHERE id = ${userId}
    RETURNING id
  `;

  if (!rows[0]) {
    throw new Error('User not found.');
  }

  await writeAuditLog('user.update-status', 'app_user', userId, actorUserId, {
    status,
  });
}

export async function updateUserRole(
  userId: string,
  role: 'admin' | 'user',
  actorUserId: string
) {
  const sql = requireDatabase();
  const rows = await sql`
    UPDATE app_users
    SET
      role = ${role}::app_role,
      updated_at = NOW()
    WHERE id = ${userId}
    RETURNING id
  `;

  if (!rows[0]) {
    throw new Error('User not found.');
  }

  await writeAuditLog('user.update-role', 'app_user', userId, actorUserId, {
    role,
  });
}
