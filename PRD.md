# PRD Ringkas: Phone Number Manager

## Tujuan

Menyediakan aplikasi manajemen nomor telepon perusahaan yang cepat, dapat diaudit, aman, dan nyaman dipakai untuk operasi skala besar tanpa mengubah UI utama yang sudah dipilih.

## Sasaran Utama

- menjaga UI tetap familiar
- mengganti seluruh logic lama dengan fondasi baru
- mendukung operasi massal yang aman
- menjaga integritas riwayat penggunaan
- menyediakan kontrol admin, audit, backup, dan monitoring dasar

## Fitur Inti

- inventaris nomor berbasis block dan range
- assign, deassign, reassign
- bulk edit
- import massal dengan preview
- pencarian dan filter
- history per nomor
- user management
- audit trail
- backup snapshot
- system status

## Peran Pengguna

Admin memiliki akses penuh ke operasi inventori, import, bulk action, user management, audit, backup, dan monitoring. User biasa hanya mengakses area yang diizinkan oleh RBAC.

## Model Data Konseptual

Entitas utama:

- user
- phone inventory
- phone event
- audit log

Relasi utama:

- satu user dapat menghasilkan banyak audit log
- satu nomor dapat memiliki banyak event
- audit log mencatat aksi sistem lintas entitas

## Alur Utama

1. user login melalui Google
2. sesi diverifikasi dan role ditentukan
3. admin atau user masuk ke dashboard
4. data inventori diambil sesuai mode tampilan
5. setiap aksi penting melewati validasi, update database, invalidasi cache, lalu pencatatan audit

## Kebutuhan Non-Fungsional

### Performance

- waktu muat halaman cepat
- pencarian responsif
- siap menangani data besar
- import massal efisien

### Security

- autentikasi wajib
- RBAC aktif
- sanitasi input
- audit trail aktif

### Reliability

- bulk operation konsisten
- error handling jelas
- backup tersedia

### Scalability

- indexing untuk query penting
- cache untuk summary yang sering dibaca
- arsitektur logic terpisah dari UI
