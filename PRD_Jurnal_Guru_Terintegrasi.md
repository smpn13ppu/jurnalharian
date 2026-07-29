# Product Requirement Document (PRD)
## Aplikasi Jurnal Guru Terintegrasi: Beban Kerja & Jurnal Mengajar

---

| Parameter | Detail |
| :--- | :--- |
| **Nama Produk** | **JurnalGuru Pro** (Aplikasi Data Jurnal Guru Terintegrasi) |
| **Versi Document** | 1.0.0 |
| **Target User** | Guru SMP Negeri 13 Penajam Paser Utara / Pendidik Professional |
| **Target Satuan Pendidikan** | SMP NEGERI 13 Penajam Paser Utara |
| **Standar Beban Kerja** | Permendikbudristek 37,5 Jam Kerja Efektif / Minggu |
| **Status Dokumen** | Final Spec / Ready for Engineering & Design |

---

## 1. Visi Produk & Ringkasan Eksekutif

### 1.1 Visi Produk
Menciptakan satu ekosistem entri data harian guru yang seamless, di mana pelaporan **Jurnal Mengajar** (KBM & Absensi) dan **Jurnal Beban Kerja Guru (37.5 Jam/Minggu)** terintegrasi secara otomatis tanpa *double entry*. Aplikasi didesain dengan visual **elegan, profesional, intuitif**, dan dibekali mikro-interaksi serta animasi halus untuk memberikan pengalaman pengguna kelas atas (*top-tier UX*).

### 1.2 Masalah Utama yang Diselesaikan
1. **Redundansi Input Data**: Guru sering kali harus mengisi jurnal mengajar harian di buku KBM, lalu memindahkan lagi data tersebut ke jurnal beban kerja aparatur/pegawai (E-Kinerja / Jurnal Mingguan).
2. **Perhitungan Beban Kerja Manual**: Menghitung akumulasi jam kerja menuju target 37,5 jam/minggu rawan kesalahan hitung dan memakan waktu.
3. **Pencatatan Absensi Tidak Terstruktur**: Data siswa yang sakit, izin, atau alpha terserak dan sulit direkap secara riil bulanan/semesteran.
4. **Format Cetak Laporan Kaku**: Kebutuhan cetak dokumen administratif untuk dinas/kepala sekolah membutuhkan kustomisasi parameter cetak (tanda tangan, NIP, orientasi cetak).

---

## 2. Arsitektur Data & Integrasi

Aplikasi ini menggunakan pendekatan **Single Point of Entry, Multi-Report Output**. Setiap entri di halaman depan (Beranda) secara otomatis mengklasifikasikan jenis aktivitas dan menghubungkannya dengan akumulasi Beban Kerja Guru serta Log KBM Siswa.

```
+-----------------------------------------------------------------------+
|                      HALAMAN BERANDA (QUICK ENTRY)                    |
+---------+---------------+-------------------+------------+------------+
          |               |                   |            |
          v               v                   v            v
     [1. PAGI]       [2. MENGAJAR]     [3. TD K MENGAJAR] [4. ISTIRAHAT] & [5. PULANG]
          |               |                   |            |
          +-------+-------+---------+---------+------------+
                  |                 |
                  v                 v
     +-----------------------+  +-----------------------+
     | LOG BEBAN KERJA GURU  |  | LOG JURNAL MENGAJAR   |
     | (Target: 37.5 Jam/Wk) |  | & ABSENSI SISWA       |
     +-----------+-----------+  +-----------+-----------+
                 |                          |
                 +------------+-------------+
                              |
                              v
     +--------------------------------------------------+
     |           REKAP & LAPORAN AUTOMATION             |
     |  - Dashboard Informasi                           |
     |  - Rekap Absensi Siswa (Excel / PDF)             |
     |  - Jurnal Mengajar (Excel / PDF)                 |
     |  - Jurnal Mingguan 37.5 Jam (Excel / PDF)        |
     +--------------------------------------------------+
```

---

## 3. Spesifikasi Fitur Detail & Modul Pengguna

### 3.1 Halaman Utama / Beranda (Form Pengisian Jurnal Interaktif)

Beranda dirancang sebagai *landing page* interaktif dengan form entri langsung. Terbagi dalam 5 Tab / Kartu Akses Cepat (*Quick Actions*):

#### 1. PAGI 🌅
* **Tanggal**: Default hari ini (`YYYY-MM-DD`), *read-only* atau *datepicker* terbatas.
* **Waktu/Jam**: *Dropdown picker* jam dengan interval per 5 menit (contoh: 06:30, 06:35, 06:40, dst).
* **Opsi Kegiatan**: *Dropdown* dinamis yang ditarik dari Pengaturan Kegiatan Pagi (misal: *Upacara Bendera, Pembiasaan Literasi/Numerasi, Senam Pagi, Briefing Guru*).
* **Hasil / Description Auto-Gen**: Menghasilkan uraian standar secara otomatis.

#### 2. MENGAJAR 📚
* **Tanggal**: Default hari ini.
* **Pilih Kelas**: *Dropdown* Filter Kelas (Tingkatan 7, 8, dan 9).
* **Daftar Siswa Dynamic Roll-Call**:
  * Saat kelas dipilih, otomatis menampilkan daftar nama siswa dari database kelas tersebut.
  * Setiap nama siswa memiliki radio button / toggle pill status kehadiran:
    * `H` (Hadir) - Default tercentang
    * `S` (Sakit)
    * `I` (Izin)
    * `A` (Alpha)
* **Jam Mengajar**: Seleksi JP / Rentang Jam (misal: Jam ke-1 s/d ke-3, durasi otomatis dihitung dengan konversi 1 JP = 40 Menit).
* **Pilih Materi**: *Dropdown* dinamis ditarik dari Database Pengaturan Materi sesuai tingkatan kelas yang dipilih.
* **Catatan (Opsional)**: Area teks opsional untuk menuliskan kejadian khusus KBM. Sistem otomatis merangkum siswa non-hadir ke dalam ringkasan catatan (contoh auto-summary: *"KBM berjalan lancar. Catatan Siswa: Budi (Izin), Siti (Sakit)"*).

#### 3. TIDAK MENGAJAR 📋
* **Tanggal**: Default hari ini.
* **Uraian Kegiatan**: Input Teks / Multiline TextArea (contoh: *Mengoreksi Lembar Kerja Siswa, Menyusun Modul Ajar, Rapat MGMP*).
* **Jam Mulai & Jam Selesai**: *Dropdown list* otomatis berkisar dari jam **06:00 s.d. 16:00** dengan **interval selisih 5 menit** (06:00, 06:05, 06:10, ... 16:00).
* **Hasil / Keterangan**:
  * Default Text Auto-Filled: `"Terlaksana dengan baik melakukan [sebutkan kegiatannya]"`
  * Editable (User dapat mengubah atau menambahi teks sesuai kebutuhan).

#### 4. ISTIRAHAT ☕
* **Auto Waktu**: Terisi otomatis sesuai konfigurasi di *Pengaturan Kegiatan Istirahat* (memiliki logika khusus untuk Hari Senin-Kamis vs Hari Jumat).
* **Kegiatan**: Teks manual / deskripsi singkat istirahat.
* **Hasil Auto-Gen**: `"Jeda aktivitas KBM dan melakukan [sebutkan kegiatannya]"`

#### 5. JAM PULANG 🏠
* **Opsi Kegiatan**: *Dropdown* pilihan kegiatan akhir hari dari *Pengaturan*.
* **Auto Waktu**: Terisi otomatis berdasarkan sistem jadwal jam pulang (diatur di Pengaturan, mendukung aturan khusus hari Jumat).
* **Hasil Auto-Gen**: `"Terlaksana dengan baik melakukan [sebutkan kegiatannya]"`

---

### 3.2 Floating Burger Menu (Sisi Kiri) & Halaman Navigasi

Terdapat tombol Floating Action Button (FAB) / Floating Burger Menu di sebelah kiri layar yang fleksibel dan dapat dibuka dari halaman manapun. Menu terdiri dari:

#### A. Dashboard Informasi (Tampil di Beranda & Menu Dedicated)
Metrik & Kartu Analytics Utama:
1. **Progress Beban Kerja Mingguan**: Progress bar visual pencapaian jam kerja harian/mingguan (misal: **28,5 / 37,5 Jam** dengan indikator persentase & *status badge* warna).
2. **Total Jurnal Mengajar**: Count akumulasi jam KBM yang telah dilaksanakan.
3. **Statistik Data Siswa**: Total siswa terdaftar per tingkatan (Kelas 7, 8, 9).
4. **Ringkasan Materi**: Jumlah modul/materi yang sudah dipetakan.
5. **Quick Overview Kehadiran Siswa**: Chart ringkasan tingkat kehadiran siswa minggu berjalan.

#### B. Pengaturan Kegiatan (Master Schedule Configuration)
Modul untuk mengonfigurasi otomatisasi jadwal harian guru:
1. **Kegiatan Pagi**:
   * Pengaturan rutinitas pagi per hari (contoh: Senin jam 07:00 Upacara, Selasa-Kamis jam 07:00 Pembiasaan, Jumat jam 07:00 Yasinan/Ibadah Pagi).
2. **Istirahat**:
   * Konfigurasi waktu istirahat 1 & istirahat 2.
   * Preset khusus Hari Jumat (penyesuaian jam Salat Jumat & istirahat).
   * Template Hasil Otomatis: `Jeda aktivitas KBM dan melakukan [sebutkan kegiatannya]`.
3. **Sebelum Pulang / Jam Pulang**:
   * Konfigurasi jadwal pulang standar (Senin-Kamis: 14:30 / 15:30, Jumat: 11:30 / 14:00).
   * Template Hasil Otomatis: `Terlaksana dengan baik melakukan [sebutkan kegiatannya]`.

#### C. Materi (Master Data Modul Pembelajaran)
* Pengelolaan kurikulum dan materi KBM untuk **Tingkatan Kelas 7, Kelas 8, dan Kelas 9**.
* *Feature*:
  * Tambah, edit, hapus Bab & Topik Pembelajaran.
  * Upload bulk materi via file spreadsheet / template.
  * Tagging Alokasi JP per topik.

#### D. Data Siswa (Master Data & Import Excel)
* Import data siswa berbasis Excel (`.xlsx` / `.csv`).
* **Struktur Skema Data**:
  * `NISN` (Unique Identifier / Primary Key)
  * `Nama Lengkap`
  * `Kelas` (misal: 7A, 7B, 8A, 9C, dsb.)
  * `Jenis Kelamin` (L / P)
  * `Agama`
* **Fitur**: Modal preview sebelum import, validation check NISN ganda, CRUD interaktif.

#### E. Jurnal Mengajar (Laporan KBM)
* **Tabel Data**:
  1. No
  2. Tanggal
  3. Jam / Waktu
  4. Durasi (Otomatis terkonversi: 40 Menit = 1 JP)
  5. Kelas
  6. Materi
  7. Catatan Kehadiran Siswa (Format otomatis memfilter siswa yang Sakit, Izin, Alpha saja. Contoh: `Budi (Izin), Siti (Sakit)`).
* **Aksi**:
  * Filter rentang tanggal & filter kelas.
  * Export File Excel (`.xlsx`).
  * Cetak Laporan PDF.

#### F. Rekap Absen (Matrix Kehadiran Siswa)
* **Tabel Matrix**:
  * Kolom: No | NISN | Nama Siswa | [Tanggal 1..N] | Total H | Total S | Total I | Total A
* **Visual Indikator**: Color badge untuk S (Kuning), I (Biru), A (Merah).
* **Aksi**:
  * Filter Per Kelas & Filter Bulan/Semester.
  * Export File Excel (`.xlsx`).
  * Cetak Laporan PDF.

#### G. Jurnal Mingguan (Integrasi Beban Kerja 37.5 Jam)
Menu rekapitulasi utama untuk keperluan administrasi pegawai dan laporan dinas.

##### 1. Parameter Form Pengaturan Cetak (Print Setup):
Sebelum mencetak, pengguna dapat menyesuaikan variabel berikut:
* **Tanggal Mulai**: [ Datepicker ]
* **Tanggal Akhir**: [ Datepicker ]
* **Nama Guru**: Textfield (Editable, default dari profil)
* **NIP Guru**: Textfield
* **Nama Kepala Sekolah**: Textfield
* **NIP Kepala Sekolah**: Textfield
* **Satuan Pendidikan**: `SMP NEGERI 13 Penajam Paser Utara` (Default locked/editable)
* **Tempat Cetak**: Textfield (Contoh: *Penajam*)
* **Tanggal Cetak**: Datepicker (Default hari pencetakan)
* **Rotasi Cetak**: Radio Button [`Horizontal (Landscape)` | `Vertikal (Portrait)`]

##### 2. Struktur Tabel Jurnal Mingguan:
* **Kolom Tabel**:
  1. No
  2. Hari & Tanggal
  3. Jam (Rentang Waktu)
  4. Kategori Kegiatan (Pagi, Mengajar, Tidak Mengajar, Istirahat, Sebelum Pulang)
  5. Uraian Detail Kegiatan
  6. Durasi Jam
  7. Hasil / Output Kegiatan
* **Summary Footer (Rekapan Per Minggu)**:
  * **Total Beban Kerja (Contoh: 02 Februari 2026 - 07 Februari 2026)**:
  * Display Format: `9 Jam 0 Menit` (Per hari) -> Kumulatif Mingguan: `37 Jam 30 Menit`.
  * Status Pemenuhan: `[LENGKAP / MEMENUHI BEBAN KERJA 37.5 JAM]` (Indikator Hijau).

---

## 4. Spesifikasi UI/UX, Animasi, & Desain Sistem

Untuk memastikan aplikasi **TIDAK berkesan seperti template AI generic**, desain harus menerapkan standar visual premium sebagai berikut:

### 4.1 Palette Warna & Typography
* **Primary Tone**: Deep Slate Navy (`#1E293B`) & Emerald Academic (`#0F766E`)
* **Accent Tone**: Amber Gold (`#D97706`) untuk penanda istirahat/peringatan & Royal Blue (`#2563EB`) untuk kegiatan mengajar.
* **Surface Background**: Soft Warm Porcelain (`#F8FAFC` / `#F1F5F9`), bukan putih polos mati.
* **Typography**: Font Sans-Serif Modern yang sangat legible: *Inter* atau *Plus Jakarta Sans*.

### 4.2 Layout & Component Style
* **Glassmorphism Subtle**: Sentuhan *backdrop-blur* pada header, modal, dan floating menu burger.
* **Card Elevation**: Layering bertingkat menggunakan *soft drop shadow* (`box-shadow: 0 4px 20px -2px rgba(0,0,0,0.05)`).
* **Borders**: Micro-borders desaturated (`#E2E8F0`).

### 4.3 Spesifikasi Animasi & Micro-Interactions
1. **Burger Menu Motion**: Smooth Spring Physics Animation saat menu drawer meluncur dari sisi kiri.
2. **Tab Switching Animation**: Smooth Horizontal Slide & Fade-in transition (`300ms ease-in-out`) saat berpindah dari Pagi -> Mengajar -> Tidak Mengajar.
3. **Roll-Call Interactive Pills**: Saat mengubah status siswa (H -> S/I/A), terdapat *bounce micro-animation* dan warna pill berubah secara konsisten dengan suara umpan balik visual yang responsif.
4. **Progress Bar Fill**: Animasi *counter duration* saat bar beban kerja 37.5 jam terisi dari 0% ke target jam harian/mingguan.
5. **Form Auto-Fill Feedback**: Flash subtle bernuansa hijau lembut saat deskripsi/waktu terisi otomatis oleh sistem.

---

## 5. Kebutuhan Non-Fungsional (NFR) & Ketentuan Teknis

| Kategori | Spesifikasi |
| :--- | :--- |
| **Penyimpanan Local / Cloud** | Mendukung mode Offline-First (PWA / LocalStorage / IndexedDB) dengan auto-sync saat terhubung ke server. |
| **Keamanan Data** | Validasi input ketat, sanitasi file Excel untuk mencegah Script Injection. |
| **Responsivitas Layout** | Fully responsive untuk Tablet, Laptop/PC, dan layar Smartphone (Mobile-friendly roll-call siswa). |
| **Format Export** | PDF generated via HTML-to-PDF rendering engine (WeasyPrint / PDFMaker) dengan margin presisi; Excel generated via SheetJS / openpyxl dengan format tabel rapi & cell auto-fit. |

---

## 6. Contoh Output Laporan & Rekapitulasi Data

### 6.1 Format Output Catatan Ringkasan Jurnal Mengajar
> **Contoh Catatan Otomatis pada Jurnal Mengajar**:  
> *"KBM Mata Pelajaran IPA Kelas 8A berjalan kondusif. Materi: Sistem Pencernaan Manusia. Siswa Tidak Hadir: Ahmad Rofi (Sakit), Siska Putri (Izin)."*

### 6.2 Format Ringkasan Rekap Mingguan
> **Status Beban Kerja Guru**:  
> Periode: **02 Februari 2026 – 07 Februari 2026**  
> Total Jam Akumulasi: **37 Jam 30 Menit** / **37,5 Jam**  
> Status: **TERFULFILL (100%)**

---

## 7. Roadmap Implementasi Pengembangan

1. **Fase 1: Core Engine & Data Model** (Setup Database Siswa, Materi, & Configuration Settings).
2. **Fase 2: Beranda Quick-Entry Forms** (Implementasi Form Pagi, Mengajar Roll-Call, Tidak Mengajar, Istirahat, Jam Pulang).
3. **Fase 3: Floating Menu & Dashboard Analytics** (Statistik Beban Kerja, Multi-Tab Floating Drawer).
4. **Fase 4: Export Engine & Custom Print Setup** (Generasi PDF Landscape/Portrait & Export Excel Jurnal Mingguan & Absensi).
5. **Fase 5: UI/UX Polishing & Motion Animation** (Penerapan Micro-interactions, Glassmorphism, & Visual Audit).

---
*Dokumen PRD ini disusun secara komprehensif sebagai acuan pengembangan aplikasi **JurnalGuru Pro** bagi SMP NEGERI 13 Penajam Paser Utara.*
