# JurnalGuru Pro - Aplikasi Data Jurnal Guru Terintegrasi
**SMP NEGERI 13 Penajam Paser Utara**

Aplikasi entri data harian guru terintegrasi untuk **Jurnal Mengajar (KBM & Absensi Siswa)** dan **Jurnal Beban Kerja Guru (37.5 Jam/Minggu)** sesuai Permendikbudristek tanpa *double entry*.

---

## Fitur Utama

1. **Beranda Quick Entry (Single Point of Entry)**:
   - **PAGI**: Presensi & pembiasaan pagi (Upacara, Literasi, Yasinan).
   - **MENGAJAR**: Dynamic Roll-Call siswa (H/S/I/A toggle pills) dengan konversi jam JP (1 JP = 40 Menit) & auto-summary siswa tidak hadir.
   - **TIDAK MENGAJAR**: Jurnal tugas tambahan & aparatur pegawai.
   - **ISTIRAHAT**: Preset jadwal istirahat harian & Jumat.
   - **JAM PULANG**: Kegiatan penutup hari & presensi pulang.

2. **Dashboard Analytics & Target Beban Kerja 37.5 Jam**:
   - Live visual *progress bar counter* untuk akumulasi jam kerja harian menuju target 37,5 jam/minggu.
   - Ringkasan statistik jumlah KBM, total siswa terdaftar, dan modul materi.

3. **Master Data & Impor Excel**:
   - Master Data Siswa per Kelas (7A, 7B, 8A, 8B, 9A, 9B).
   - Fitur Impor File Excel (`.xlsx` / `.csv`) data siswa dengan Modal Pratinjau & Validasi NISN Ganda.
   - Master Data Materi Pembelajaran per tingkat kelas 7, 8, dan 9.

4. **Rekapitulasi & Cetak Laporan PDF / Excel**:
   - **Rekap Jurnal Mengajar KBM** (Export `.xlsx` & PDF).
   - **Matrix Rekapitulasi Absensi Siswa** per bulan & kelas dengan visual color badges (Export `.xlsx` & PDF).
   - **Jurnal Mingguan 37.5 Jam** lengkap dengan Form Parameter Cetak (Tanggal, Nama Guru/NIP, Kepala Sekolah/NIP, Tempat Cetak, Tanggal Cetak, Orientasi Cetak Portrait/Landscape).

5. **Integrasi Google Sheets & Offline-First**:
   - Bekerja secara *Offline-First* di browser.
   - Terintegrasi 2-arah dengan **Google Sheets** menggunakan Google Apps Script API.

## Model Database Pribadi Per Guru & Cara Pergantian

Website ini cukup di-deploy **satu kali ke GitHub Pages** dan dapat digunakan oleh seluruh guru sekolah. Setiap guru mengonfigurasi **Google Sheets Database Pribadi milik mereka sendiri**.

### Cara Menghubungkan & Berganti Database Guru:
1. **Buka Website JurnalGuru Pro** di browser.
2. Jika database belum terhubung, klik tombol **Hubungkan Google Sheets** atau buka menu **Pengaturan**.
3. Masukkan **Nama Guru & NIP** Anda, serta **Web App URL Google Sheets pribadi Anda**.
4. **Jika guru lain hendak memakai di perangkat yang sama**: Klik tombol **`[ Ganti Database ]`** di bagian atas header atau tombol **`Putuskan Database & Ganti Guru`** pada Pengaturan. Sesi lama akan dibersihkan, dan guru baru dapat menghubungkan database Google Sheets miliknya sendiri!

---

## Cara Membuat Google Sheets Database Pribadi Guru

### Langkah 1: Buat Spreadsheet Baru
1. Buka [Google Sheets (sheets.new)](https://sheets.new).
2. Beri nama file Spreadsheet: `JurnalGuru_Pribadi_[NamaGuru]`.

### Langkah 2: Buat Google Apps Script
1. Di Google Sheets, klik menu **Extensions &gt; Apps Script**.
2. Hapus seluruh kode bawaan, lalu salin dan tempelkan kode berikut:

```javascript
function doGet(e) {
  var action = e.parameter.action;
  if (action === 'ping') {
    return ContentService.createTextOutput(JSON.stringify({ status: 'success', message: 'Google Apps Script Connected!' }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  return ContentService.createTextOutput(JSON.stringify({ status: 'active', app: 'JurnalGuru Pro API' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    
    var sheetLog = ss.getSheetByName("Log Jurnal") || ss.insertSheet("Log Jurnal");
    if (sheetLog.getLastRow() === 0) {
      sheetLog.appendRow(["ID", "Tanggal", "Kategori", "Jam/Durasi", "Kelas", "Materi/Kegiatan", "Catatan Absensi", "Hasil"]);
    }
    
    if (data.logs && data.logs.length > 0) {
      sheetLog.getRange(2, 1, sheetLog.getLastRow() > 1 ? sheetLog.getLastRow() - 1 : 1, 8).clearContent();
      data.logs.forEach(function(l) {
        sheetLog.appendRow([
          l.id, l.tanggal, l.kategori, l.waktu, l.kelas || '-', l.materi || l.kegiatan || '-', l.catatanAbsen || '-', l.hasil || '-'
        ]);
      });
    }

    return ContentService.createTextOutput(JSON.stringify({ status: 'success' })).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: error.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}
```

### Langkah 3: Deploy Web App
1. Klik tombol **Deploy &gt; New deployment** di pojok kanan atas Apps Script.
2. Pilih icon gear &gt; **Web app**.
3. Atur konfigurasi:
   - **Description**: `JurnalGuru API`
   - **Execute as**: `Me (email anda)`
   - **Who has access**: `Anyone`
4. Klik **Deploy** dan berikan izin akses (*Authorize Access*).
5. Salin **Web App URL** (format: `https://script.google.com/macros/s/.../exec`).

### Langkah 4: Hubungkan ke Aplikasi
1. Buka menu **Pengaturan &amp; Sheets Sync** di aplikasi JurnalGuru Pro.
2. Tempelkan URL pada kolom **Google Apps Script Web App URL**.
3. Klik **Uji Koneksi** dan **Simpan Pengaturan**. Status di header akan berubah menjadi `Google Sheets Connected` (Hijau)!

---

## Cara Deploy ke GitHub Pages (Gratis)

Aplikasi didesain murni berbasis client-side HTML, CSS, dan JavaScript tanpa Node.js server, sehingga **100% gratis dan sangat mudah di-deploy ke GitHub Pages**.

### Langkah-langkah:
1. **Push Proyek ke Repository GitHub**:
   ```bash
   git init
   git add .
   git commit -m "Initial commit JurnalGuru Pro"
   git branch -M main
   git remote add origin https://github.com/USERNAME/jurnalsmpn13.git
   git push -u origin main
   ```
2. **Aktifkan GitHub Pages**:
   - Buka repositori proyek Anda di GitHub.
   - Masuk ke tab **Settings &gt; Pages**.
   - Pada bagian **Build and deployment &gt; Branch**, pilih `main` dan folder `/ (root)`.
   - Klik **Save**.
3. **Aplikasi Siap Digunakan**:
   - GitHub Pages akan memberikan URL publik dalam 1-2 menit (contoh: `https://USERNAME.github.io/jurnalsmpn13/`).
   - Aplikasi siap diakses oleh guru-guru SMP NEGERI 13 Penajam Paser Utara melalui HP, Tablet, maupun Laptop!

---
*Dikembangkan secara khusus untuk SMP NEGERI 13 Penajam Paser Utara.*
