# Tentang SIPLING

## Apa Itu SIPLING?

**SIPLING** (Sistem Pelaporan Lingkungan) adalah aplikasi berbasis web yang dirancang untuk memungkinkan warga masyarakat melaporkan masalah lingkungan seperti jalan rusak, sampah, dan jalanan berlubang secara mudah dan cepat.

---

## Fitur Utama

### 1. Sistem Autentikasi
- **Registrasi & Login** - Warga dan admin dapat membuat akun dan masuk ke sistem
- **Verifikasi Email** - Setiap pendaftar wajib verifikasi email sebelum可以使用 akun
- **Role-based Access** - Dua role: Admin (pengelola) dan Warga (pelapor)

### 2. Dashboard Warga
- **Buat Laporan** - Warga dapat membuat laporan baru dengan:
  - Upload foto masalah
  - Lokasi GPS otomatis
  - Pilihan kategori (Jalan Rusak, Sampah, Jalan Berlubang, Lainnya)
  - Deskripsi masalah
- **Riwayat Laporan** - Warga dapat melihat semua laporan yang pernah dibuat beserta statusnya

### 3. Dashboard Admin
- **Kelola Laporan** - Admin dapat melihat semua laporan dari warga dan mengubah status (pending/resolved)
- **Kelola Kategori** - Admin dapat menambah, mengedit, atau menghapus kategori laporan
- **Kelola User** - Admin dapat mengelola data pengguna sistem
- **Export Data** - Admin dapat mengekspor laporan ke format CSV
- **Log Aktivitas** - Admin dapat melihat riwayat aktivitas semua user

### 4. Fitur Lainnya
- **Dark Mode** - Mendukung tema gelap dan terang
- **Responsive Design** - Tampilan optimal di desktop dan mobile
- **Lightbox Gambar** - Preview foto laporan dengan zoom dan navigasi
- **Activity Logging** - Semua aksi user tercatat untuk audit

---

## Manfaat

### Bagi Warga
- **Mudah Melaporkan** - Cukup beberapa klik untuk kirim laporan
- **Pantau Status** - Warga bisa pantau status laporan mereka
- **GPS Otomatis** - Lokasi langsung terdeteksi tanpa input manual
- **Transparan** - Warga tahu perkembangan laporan mereka

### Bagi Pemerintah Daerah / Admin
- **Data Terpusat** - Semua laporan terkumpul dalam satu sistem
- **Mudah Dikelola** - Interface admin yang intuitif
- **Export Laporan** - Data bisa diekspor untuk analisis lebih lanjut
- **Audit Trail** - Semua aktivitas admin tercatat

### Bagi Lingkungan
- **Perbaikan Lebih Cepat** - Laporan yang jelas加快了 penanganannya
- **Prioritas Jelas** - Kategori membantuurutkan masalah berdasarkan jenis
- **Transparansi** - Masyarakat bisa pantau progress perbaikan

---

## Kegunaan

| Kegunaan | Detail |
|----------|--------|
| **Pelaporan Jalan Rusak** | Warga foto jalan rusak + kirim lokasi GPS |
| **Pelaporan Sampah** | Laporkan area sampah yang butuh pembersihan |
| **Pelaporan Jalan Berlubang** | Tandai lubang berbahaya untuk diperbaiki |
| **Manajemen Data** | Adminkelola semua laporan dan user |
| **Export Laporan** | Ekspor data untuk laporan resmi |

---

## Teknologi

- **Frontend**: Next.js 14+, React, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **Deployment**: Vercel

---

## Lisensi

MIT License
