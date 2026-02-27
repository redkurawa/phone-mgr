# Troubleshooting Guide

## Issue: Tanggal History Salah di Vercel (2018 vs 2026)

### Symptoms
- Di localhost: `14 Agu 2018, 07:00`
- Di Vercel: `27 Feb 2026, 15:49`
- Database Neon menunjukkan tanggal yang benar (2018)

### Root Cause
Drizzle ORM caching di Vercel Edge Runtime menyebabkan response API mengembalikan data lama yang ter-cache.

### Steps to Diagnose

1. **Cek database langsung** - Pastikan data di database benar
   ```bash
   node --input-type=module -e "
   import { neon } from '@neondatabase/serverless';
   const sql = neon('DATABASE_URL');
   const result = await sql\`SELECT event_date FROM usage_history WHERE phone_id = 'UUID'\`;
   console.log(JSON.stringify(result, null, 2));
   "
   ```

2. **Cek API response langsung** - Buka di browser
   ```
   https://phone-db.vercel.app/api/phones/{phoneId}/history
   ```

3. **Bandingkan dengan debug endpoint** - Buat endpoint debug untuk comparison
   ```bash
   # Buat file app/api/debug/route.ts
   # Testedan endpoint yang sama - kalau hasilnya berbeda, berarti ada caching
   ```

### Solution

Ganti Drizzle ORM query dengan raw SQL untuk menghindari caching:

```typescript
// Sebelum (tercache)
const history = await db
  .select()
  .from(usageHistory)
  .where(eq(usageHistory.phoneId, phoneId))
  .orderBy(usageHistory.eventDate);

// Sesudah (raw SQL)
const historyResult = await db.execute(
  sql`SELECT id, phone_id, event_type, client_name, event_date, notes 
       FROM usage_history 
       WHERE phone_id = ${phoneId}
       ORDER BY event_date DESC`
);

const history = historyResult.rows.map((row: any) => ({
  id: row.id,
  phoneId: row.phone_id,
  eventType: row.event_type,
  clientName: row.client_name,
  eventDate: row.event_date,
  notes: row.notes,
}));
```

### Alternative Solutions

1. **Force Node.js runtime** (bukan Edge):
   ```typescript
   export const dynamic = 'force-dynamic';
   export const runtime = 'nodejs';
   ```

2. **Cache bust di frontend**:
   ```typescript
   fetch(`/api/phones/${phoneId}/history?_=${Date.now()}`, {
     cache: 'no-store',
   });
   ```

3. **Redeploy force** - Hapus cache Vercel dan redeploy

### Places That Might Have Same Issue

Semua endpoint yang pake Drizzle `.select().from()` berpotensi sama. Cek:
- `/api/phones/[id]/history` - ✅ Fixed
- `/api/phones/[id]/route.ts` - Perlu dicek
- `/api/phones/route.ts` - Perlu dicek
- `/api/phones/block/activation/route.ts` - Perlu dicek

### Prevention

- Selalu test di Vercel setelah deployment
- Monitor edge cases dengan tanggal historis
- Kalau ada mismatch antara DB dan API, cek Vercel logs
