# Phone Number Manager

Aplikasi manajemen inventaris nomor telepon perusahaan dengan UI yang dipertahankan, tetapi seluruh logic backend dan data flow telah dibangun ulang agar lebih cepat, lebih stabil, dan lebih mudah diaudit.

## Ringkasan

Aplikasi ini dipakai untuk:

- mengelola inventaris nomor telepon dalam jumlah besar
- melakukan assign, deassign, reassign, dan edit massal
- mengimpor nomor dari teks, range, block pattern, atau file CSV/TXT
- melacak riwayat perubahan per nomor
- mengelola user dan role berbasis RBAC
- memantau audit trail, status sistem, dan membuat snapshot backup

## Arsitektur Saat Ini

- Framework: Next.js App Router
- Database: Neon PostgreSQL
- Data access: raw SQL terstruktur, tanpa logic ORM lama
- Authentication: NextAuth dengan Google login
- Authorization: RBAC admin dan user
- UI: komponen existing dipertahankan

## Fitur Utama

- Generate nomor berdasarkan block atau range
- Import massal sampai 10.000 nomor unik per request
- Preview import sebelum commit
- Search dan filter untuk nomor, prefix, dan client
- Assign, deassign, reassign, dan bulk edit
- **Assignment date picker (bisa backdate)**
- **Bulk deassign customers dengan pilihan tanggal pengembalian**
- History per nomor dengan timezone GMT+7 (tampilan tanggal saja)
- **Bulk edit assignment date**
- Audit trail admin
- Backup snapshot JSON
- System status untuk monitoring dasar
- Keyboard shortcuts untuk aksi umum
- **Management customer dengan view dedicated**
- **User approval workflow** (first user = admin, subsequent users = pending approval)

## Kebutuhan Environment

Gunakan file `.env` aktif di project. Nilai utama yang dibutuhkan:

- `DATABASE_URL`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET`

## Menjalankan Project

1. Install dependency.
2. Pastikan environment sudah terisi.
3. Siapkan database dengan menjalankan skema SQL yang ada.
4. Jalankan mode development.
5. Verifikasi build sebelum deploy.

## Reset Database

Reset akan menghapus seluruh data aplikasi saat ini, termasuk user, inventori, event, dan audit log. Setelah reset:

- login pertama akan menjadi admin
- user berikutnya akan otomatis approved

Gunakan script reset yang sudah tersedia di project.

## Alur Operasional

Untuk admin, alur utama yang tersedia sekarang adalah:

- generate nomor
- import nomor dan lihat preview sebelum masuk
- kelola blok, nomor, dan customer
- lakukan bulk action dari detail block
- cek audit trail
- cek system status
- unduh backup snapshot

## Catatan Penting

- logic lama berbasis ORM tidak lagi menjadi sumber utama perilaku aplikasi
- cache dipakai untuk ringkasan yang sering dibaca dan dibersihkan saat ada perubahan data
- semua operasi penting dicatat ke audit trail
- bulk operation dijaga tetap konsisten melalui validasi dan jalur service terpusat

## Verifikasi

Sebelum dipakai atau dideploy, pastikan build production berhasil dan login admin dapat mengakses dashboard, user management, audit trail, system status, serta backup snapshot.
