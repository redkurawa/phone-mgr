# Google OAuth Setup Guide

## Tujuan

Panduan ini dipakai untuk mengaktifkan login Google pada aplikasi phone manager.

## Langkah Konseptual

1. Buat atau pilih project di Google Cloud Console.
2. Aktifkan layanan identitas Google yang dibutuhkan.
3. Konfigurasikan OAuth consent screen.
4. Buat OAuth client untuk web application.
5. Daftarkan origin dan callback URL aplikasi.
6. Salin credential ke file environment project.

## Data Environment yang Dibutuhkan

Isi nilai berikut pada environment project:

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET`

## Callback yang Harus Terdaftar

Untuk development lokal, callback login harus mengarah ke endpoint callback autentikasi aplikasi pada host lokal yang dipakai project ini.

Untuk production, tambahkan callback domain production yang sesuai.

## Perilaku Login Saat Ini

- semua user wajib login untuk mengakses aplikasi
- user baru akan otomatis approved
- user pertama setelah reset database akan menjadi admin
- admin tetap bisa mengubah role atau memblokir user dari area admin

## Jika Login Gagal

Periksa:

- client ID dan client secret benar
- domain dan callback sudah cocok
- `NEXTAUTH_URL` sesuai URL aplikasi yang aktif
- `NEXTAUTH_SECRET` terisi
- browser tidak memblokir redirect login
