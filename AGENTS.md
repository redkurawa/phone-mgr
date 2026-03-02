# AGENTS.md

## Chat Rules
- Jangan tampilkan potongan code, patch, diff, stack trace, atau output command panjang di chat.
- Jangan tampilkan daftar file yang diubah, dibuat, dihapus, atau dipindah di chat.
- Semua perubahan dilakukan langsung di workspace.
- Chat hanya untuk status singkat, pertanyaan penting, dan hasil akhir singkat.
- Jawaban kerja default maksimal 1-3 kalimat kecuali diminta lebih detail.
- Jangan menyalin isi file ke chat kecuali user secara eksplisit meminta.

## Work Style
- Utamakan eksekusi langsung daripada menjelaskan rencana panjang.
- Jika perlu membaca banyak file, ringkas hasilnya tanpa menampilkan isi file di chat.
- Jika perlu edit banyak file, lakukan langsung dan laporkan hasil secara singkat.
- Jika ada error, ringkas inti masalah saja, tanpa dump log panjang.

## Reporting Format
- Saat mulai: status singkat tentang langkah yang sedang dikerjakan.
- Saat selesai: ringkasan singkat hasil dan langkah berikutnya bila ada.
- Jika butuh izin: tanyakan singkat dan jelas.

## Project Preference
- Pertahankan UI yang ada kecuali user meminta perubahan UI.
- Logic backend dan database boleh dirombak total jika diperlukan.
- Prioritaskan performa, reliability, RBAC, audit trail, dan validasi input.
- Gunakan environment dari file .env yang aktif di project.
