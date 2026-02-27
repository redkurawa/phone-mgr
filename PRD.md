# Dokumen Persyaratan Produk (PRD): Aplikasi Manajemen Nomor Telepon

## 1. Pendahuluan
Aplikasi ini dirancang untuk mengelola inventaris nomor telepon perusahaan dalam skala besar (>5.000 nomor). Fokus utama adalah pada kemudahan penggunaan, efisiensi manajemen massal (bulk), pelacakan status yang akurat, dan **riwayat penggunaan yang komprehensif**.

## 2. Persyaratan Desain & UI
- **Estetika**: Profesional, modern, dan minimalis.
- **Tema**: Menggunakan **Shadcn UI dengan Stone Theme**.
- **Larangan**: Tidak menggunakan warna-warna mencolok; tetap elegan dan fungsional.

## 3. Fitur Utama

### 3.1. Manajemen Inventaris (Bulk Generation)
- **Blok Otomatis (100 nomor)**: Berdasarkan prefix dengan akhiran XX (misal: `03612812XX`).
- **Manual Range**: Rentang bebas (misal: `021256179XX` untuk `02125617900` - `02125617949`).
- **Integritas String**: Nomor telepon wajib disimpan sebagai **string** untuk menjaga angka nol di depan.

### 3.2. Riwayat & Pelacakan (History)
Setiap nomor telepon akan memiliki log riwayat yang tidak terhapus, mencakup:
- **Aktivasi**: Catatan saat nomor pertama kali masuk ke sistem.
- **Assignment**: Pencatatan ke "PT" (klien) mana nomor tersebut diberikan beserta tanggalnya.
- **De-assignment**: Pencatatan saat nomor dikembalikan, dengan tetap mempertahankan nama klien lama dalam riwayat.
- **Re-assignment**: Kemampuan untuk memberikan nomor yang sudah `FREE` ke klien baru, yang kemudian akan menambah entri baru di riwayat.
- **Persistensi Data**: Nama klien (PT) yang sudah tidak berlangganan tetap tersimpan dalam riwayat nomor tersebut sebagai bukti audit.

### 3.3. Pencarian & Filter
- **Pencarian**: Berdasarkan nomor, prefix, atau nama klien (mencari di status saat ini maupun riwayat).
- **Filter Status**: `KOSONG` atau `PAKAI`.

## 4. Arsitektur Teknis & Model Data
Database Neon (PostgreSQL) akan menggunakan skema relasional untuk mendukung riwayat:

### 4.1. Tabel `PhoneNumbers`
| Field | Tipe | Deskripsi |
|-------|------|-----------|
| `id` | UUID | Primary Key |
| `number` | String | Unik (misal: "021234567") |
| `current_status` | Enum | `KOSONG`, `PAKAI` |
| `current_client` | String | Nama klien saat ini (jika ada) |

### 4.2. Tabel `UsageHistory`
| Field | Tipe | Deskripsi |
|-------|------|-----------|
| `id` | UUID | Primary Key |
| `phone_id` | UUID | Foreign Key ke `PhoneNumbers` |
| `event_type` | Enum | `ACTIVATION`, `ASSIGNED`, `DEASSIGNED` |
| `client_name` | String | Nama PT terkait saat kejadian |
| `event_date` | DateTime | Tanggal kejadian |
| `notes` | String | Catatan tambahan |

## 5. Kemampuan Edit (Single & Bulk)
Admin dapat memperbarui tanggal-tanggal penting atau nama klien, baik untuk satu nomor maupun banyak nomor sekaligus melalui antarmuka yang efisien.
