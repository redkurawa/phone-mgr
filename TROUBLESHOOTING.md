# Troubleshooting

## Login berhasil tetapi tidak bisa masuk

Periksa hal berikut:

- konfigurasi Google OAuth benar
- `NEXTAUTH_URL` dan `NEXTAUTH_SECRET` terisi
- user pertama setelah reset memang login sebagai admin
- status user tidak sedang `rejected`

## Database tidak terbaca

Penyebab paling umum:

- `DATABASE_URL` belum diisi
- database belum menjalankan schema terbaru
- koneksi Neon tidak aktif atau credential salah

Jika perlu, lakukan reset database lalu login ulang.

## Data tidak muncul setelah import

Periksa urutannya:

- lakukan preview import terlebih dahulu
- pastikan jumlah `ready to import` lebih dari nol
- pastikan data tidak seluruhnya sudah ada di database
- cek audit trail untuk melihat apakah aksi import tercatat

## Hasil search terasa tidak sesuai

Search saat ini bekerja terhadap:

- nomor telepon
- client aktif saat ini
- client yang muncul di riwayat event

Jika hasil tampak kosong, cek apakah filter status sedang aktif dan mempersempit hasil.

## Bulk action gagal

Bulk action hanya akan berhasil bila status data konsisten dengan aksi:

- assign untuk nomor yang masih kosong
- deassign untuk nomor yang sedang dipakai
- reassign untuk nomor yang sedang dipakai

Jika status campuran, gunakan edit massal atau sesuaikan seleksi terlebih dahulu.

## Audit trail kosong

Audit trail baru akan terisi setelah ada aksi sistem seperti login, import, generate, update user, atau perubahan inventori. Jika database baru di-reset, kondisi kosong adalah normal.

## Backup tidak bisa diunduh

Periksa:

- user yang login adalah admin
- database bisa diakses
- endpoint admin tidak terblokir oleh sesi yang tidak valid

Jika halaman admin lain juga gagal dimuat, masalah biasanya ada pada sesi login atau koneksi database.

## Halaman admin tidak bisa diakses

Halaman admin hanya untuk role admin. Jika login berhasil tetapi tetap diarahkan keluar:

- pastikan role user adalah admin
- cek user management dengan akun admin pertama
- cek audit trail untuk memastikan perubahan role tercatat

## Setelah reset semua user hilang

Itu perilaku normal. Reset memang menghapus seluruh tabel aplikasi. Solusinya adalah login ulang. Akun pertama yang masuk setelah reset akan menjadi admin otomatis.
