# Phone Number Manager

Aplikasi manajemen nomor telepon perusahaan dengan fitur bulk generation, assignment, dan pelacakan riwayat lengkap.

## Fitur Utama

- **Bulk Generation**: Generate 100 nomor sekaligus dengan pattern (XX) atau range manual
- **Assignment/Deassignment**: Kelola assignment nomor ke klien (PT)
- **Riwayat Lengkap**: Setiap aksi tercatat (aktivasi, assign, deassign, reassign)
- **Pencarian & Filter**: Cari berdasarkan nomor, prefix, atau nama klien
- **Bulk Operations**: Assign/deassign banyak nomor sekaligus
- **Edit**: Edit status dan klien single atau bulk

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Database**: Neon (PostgreSQL)
- **ORM**: Drizzle ORM
- **UI**: Shadcn UI dengan Stone Theme
- **Deployment**: Vercel ready

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Setup Database

1. Buat database di [Neon](https://neon.tech)
2. Dapatkan connection string dari dashboard
3. Buat file `.env.local`:

```bash
DATABASE_URL=your_neon_connection_string
```

4. Jalankan schema SQL di Neon SQL Editor:

```bash
# Copy isi schema.sql dan jalankan di Neon dashboard
```

### 3. Development

```bash
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000)

### 4. Build & Deploy

```bash
npm run build
```

Deploy ke Vercel:

1. Push ke GitHub
2. Import project di Vercel
3. Tambahkan environment variable `DATABASE_URL`
4. Deploy

## Database Setup & Reset

### Setup Database Baru (First Time)

```bash
npm run db:push
```

### Reset Database (Bersihkan Semua Data)

⚠️ **Peringatan**: Reset akan menghapus **SEMUA DATA** (nomor telepon, riwayat, dan user)!

```bash
# 1. Bersihkan database
node run-reset.js

# 2. Inisialisasi ulang
npm run db:push
```

## Penggunaan

### Generate Nomor

1. Klik "Generate Numbers"
2. Masukkan pattern prefix:
   - `03612812XX` → 0361281200 - 0361281299 (100 nomor)
   - `021256179XX` dengan range manual → 02125617900 - 02125617949
3. Klik "Generate"

### Assign Nomor

**Single:**

1. Klik tombol Check/X di baris nomor
2. Masukkan nama klien (PT)
3. Klik "Assign"

**Bulk:**

1. Pilih nomor dengan checkbox
2. Klik "Bulk Assign"
3. Masukkan nama klien
4. Klik "Assign"

### Deassign Nomor

1. Pilih nomor (single atau bulk)
2. Klik tombol X atau "Deassign All"
3. Nomor kembali ke status KOSONG
4. Riwayat tetap tersimpan

### Lihat Riwayat

Klik ikon History (jam) untuk melihat riwayat lengkap nomor:

- Aktivasi (tanggal masuk sistem)
- Assignment (ke klien mana saja)
- Deassignment (pengembalian)
- Reassignment (penugasan ulang)

## Struktur Database

### phone_numbers

- `id`: UUID
- `number`: String (unique)
- `current_status`: KOSONG | PAKAI
- `current_client`: String (nullable)
- `created_at`, `updated_at`: Timestamp

### usage_history

- `id`: UUID
- `phone_id`: FK ke phone_numbers
- `event_type`: ACTIVATION | ASSIGNED | DEASSIGNED | REASSIGNED
- `client_name`: String (nullable)
- `event_date`: Timestamp
- `notes`: String (nullable)

## API Endpoints

- `GET /api/phones` - List dengan filter & pagination
- `POST /api/phones` - Generate bulk numbers
- `GET /api/phones/[id]` - Get single with history
- `PUT /api/phones/[id]` - Update (assign/edit)
- `DELETE /api/phones/[id]` - Delete
- `POST /api/phones/bulk` - Bulk operations

## License

MIT
