/* ==========================================================================
   JurnalGuru Pro - View Jurnal Mengajar (Laporan KBM)
   ========================================================================== */

import { Store } from '../store.js';
import { ExportService } from '../services/export.js';

export const JurnalMengajarView = {
  render() {
    this.renderJurnalTable();
    this.initFilters();
    this.initExportButtons();
  },

  renderJurnalTable() {
    const tbody = document.getElementById('jurnal-mengajar-tbody');
    if (!tbody) return;

    const tglStart = document.getElementById('jm-filter-tgl-start')?.value;
    const tglEnd = document.getElementById('jm-filter-tgl-end')?.value;
    const kelasFilter = document.getElementById('jm-filter-kelas')?.value;

    let logs = Store.getLogs().filter(l => l.kategori === 'MENGAJAR');

    if (tglStart) logs = logs.filter(l => l.tanggal >= tglStart);
    if (tglEnd) logs = logs.filter(l => l.tanggal <= tglEnd);
    if (kelasFilter) logs = logs.filter(l => l.kelas && l.kelas.includes(kelasFilter));

    tbody.innerHTML = '';
    if (logs.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding: 2rem;" class="text-muted">Tidak ditemukan log Jurnal Mengajar sesuai filter.</td></tr>';
      return;
    }

    logs.forEach((l, idx) => {
      const tr = document.createElement('tr');
      const rawMateri = (l.materi || '-').includes(' - ') ? l.materi.split(' - ').slice(1).join(' - ') : (l.materi || '-');
      const cleanMateri = rawMateri.replace(/[\[\]]/g, '');
      const cleanHasil = (l.hasil || '-').replace(/[\[\]]/g, '');

      tr.innerHTML = `
        <td>${idx + 1}</td>
        <td><strong>${window.App ? window.App.formatDateID(l.tanggal) : l.tanggal}</strong></td>
        <td>${l.waktu}</td>
        <td><span class="badge" style="background:#DBEAFE; color:#1E40AF; padding:2px 8px; border-radius:4px; font-weight:700;">${l.kelas || '-'}</span></td>
        <td>${cleanMateri}</td>
        <td><small>${l.catatanAbsen || 'Nihil (Hadir Semua)'}</small></td>
        <td><small class="text-muted">${cleanHasil}</small></td>
        <td>
          <button class="btn-danger btn-delete-log" data-id="${l.id}" title="Hapus Log"><i class="fas fa-trash"></i></button>
        </td>
      `;
      tbody.appendChild(tr);
    });

    tbody.querySelectorAll('.btn-delete-log').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        if (confirm('Hapus entri jurnal mengajar ini?')) {
          Store.deleteLog(id);
          window.App.showToast('Entri log berhasil dihapus.', 'success');
          this.renderJurnalTable();
        }
      });
    });
  },

  initFilters() {
    ['jm-filter-tgl-start', 'jm-filter-tgl-end', 'jm-filter-kelas'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('change', () => this.renderJurnalTable());
    });
  },

  initExportButtons() {
    const btnExcel = document.getElementById('btn-export-jm-excel');
    const btnPdf = document.getElementById('btn-export-jm-pdf');

    if (btnExcel) {
      btnExcel.onclick = () => {
        const logs = Store.getLogs().filter(l => l.kategori === 'MENGAJAR');
        const exportData = logs.map((l, i) => ({
          No: i + 1,
          Tanggal: window.App ? window.App.formatDateID(l.tanggal) : l.tanggal,
          Waktu_JP: l.waktu,
          Durasi_Menit: l.durasiMenit,
          Kelas: l.kelas,
          Materi: ((l.materi || '').includes(' - ') ? l.materi.split(' - ').slice(1).join(' - ') : l.materi).replace(/[\[\]]/g, ''),
          Catatan_Absensi: (l.catatanAbsen || '').replace(/[\[\]]/g, ''),
          Hasil_Uraian: (l.hasil || '').replace(/[\[\]]/g, '')
        }));
        ExportService.exportToExcel(exportData, 'Jurnal_Mengajar_SMPN13.xlsx', 'Jurnal Mengajar');
        window.App.showToast('File Excel Jurnal Mengajar berhasil diunduh!', 'success');
      };
    }

    if (btnPdf) {
      btnPdf.onclick = () => this.printJurnalMengajar();
    }
  },

  printJurnalMengajar() {
    const settings = Store.getSettings();
    const tglStart = document.getElementById('jm-filter-tgl-start')?.value;
    const tglEnd = document.getElementById('jm-filter-tgl-end')?.value;
    const kelasFilter = document.getElementById('jm-filter-kelas')?.value;

    let logs = Store.getLogs().filter(l => l.kategori === 'MENGAJAR');
    if (tglStart) logs = logs.filter(l => l.tanggal >= tglStart);
    if (tglEnd) logs = logs.filter(l => l.tanggal <= tglEnd);
    if (kelasFilter) logs = logs.filter(l => l.kelas && l.kelas.includes(kelasFilter));

    // Sort by date ascending
    logs = [...logs].sort((a, b) => a.tanggal.localeCompare(b.tanggal));

    const today = new Date();
    const todayStr = `${today.getDate()}/${today.getMonth() + 1}/${today.getFullYear()}`;

    // Detect mata pelajaran from materi data
    const allMateri = Store.getMateri();
    const mapelSet = new Set(allMateri.map(m => m.mataPelajaran).filter(Boolean));
    const mapelLabel = mapelSet.size > 0 ? [...mapelSet].join(', ') : (settings.namaMapel || 'Informatika');

    const formatDateShort = (dateStr) => {
      if (!dateStr) return '-';
      const [y, m, d] = dateStr.split('-').map(Number);
      const date = new Date(y, m - 1, d);
      return date.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
    };

    const formatJamPelajaran = (waktuStr, durasiMenit) => {
      const m = parseInt(durasiMenit || 0);
      const jp = Math.round(m / 40); // 1 JP = 40 menit
      const waktuClean = (waktuStr || '').replace(/\s+/g, '');
      return `${waktuClean}${jp > 0 ? ` (${jp}JP)` : ''}`;
    };

    const tableRows = logs.map((l, idx) => {
      const rawMateri = (l.materi || '-').includes(' - ') ? l.materi.split(' - ').slice(1).join(' - ') : (l.materi || '-');
      const cleanMateri = rawMateri.replace(/[\[\]]/g, '');
      const catatanAbsen = (l.catatanAbsen || '').replace(/[\[\]]/g, '').replace(/Semua Hadir \(Nihil\)/i, '-').trim() || '-';
      const rowBg = idx % 2 === 0 ? '#ffffff' : '#F8FAFC';
      return `
        <tr style="background:${rowBg};">
          <td style="text-align:center; padding:9px 8px; border:1px solid #374151; font-size:0.85rem; color:#000000; font-weight:500;">${idx + 1}</td>
          <td style="padding:9px 8px; border:1px solid #374151; font-size:0.85rem; color:#000000; white-space:nowrap;">${formatDateShort(l.tanggal)}</td>
          <td style="padding:9px 8px; border:1px solid #374151; font-size:0.85rem; color:#000000; white-space:nowrap; font-weight:600;">${l.kelas || '-'}</td>
          <td style="padding:9px 8px; border:1px solid #374151; font-size:0.85rem; color:#000000; white-space:nowrap;">${formatJamPelajaran(l.waktu, l.durasiMenit)}</td>
          <td style="padding:9px 8px; border:1px solid #374151; font-size:0.85rem; color:#000000; white-space:nowrap;">${l.durasiMenit || 0} Menit</td>
          <td style="padding:9px 8px; border:1px solid #374151; font-size:0.85rem; color:#000000; line-height:1.4;">${cleanMateri}</td>
          <td style="padding:9px 8px; border:1px solid #374151; font-size:0.85rem; color:#000000; line-height:1.4;">${catatanAbsen}</td>
        </tr>`;
    }).join('');

    const html = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>Laporan Jurnal Mengajar</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 0.88rem;
      color: #000000;
      background: #fff;
      padding: 25px;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .report-title {
      font-size: 1.5rem;
      font-weight: 800;
      color: #000000;
      margin-bottom: 14px;
      text-transform: uppercase;
      letter-spacing: -0.2px;
    }
    .meta-line {
      font-size: 0.92rem;
      color: #000000;
      margin-bottom: 5px;
      line-height: 1.4;
      font-weight: 500;
    }
    .meta-container {
      margin-bottom: 20px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
      border: 1.5px solid #000000;
    }
    thead tr {
      background-color: #00796B !important;
      color: #ffffff !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    thead th {
      padding: 10px 8px;
      font-size: 0.85rem;
      font-weight: 700;
      text-align: left;
      border: 1px solid #004D40;
      background-color: #00796B !important;
      color: #ffffff !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    thead th:first-child {
      text-align: center;
    }
    tbody td {
      border: 1px solid #374151;
    }
    @media print {
      body {
        padding: 10px;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      thead tr, thead th {
        background-color: #00796B !important;
        color: #ffffff !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      @page { size: A4 landscape; margin: 1cm; }
    }
  </style>
</head>
<body>
  <h1 class="report-title">LAPORAN JURNAL MENGAJAR</h1>

  <table style="width:100%; border:none; margin-bottom:16px; border-collapse:collapse;">
    <tr>
      <td style="width:50%; vertical-align:top; border:none; padding:0 15px 0 0;">
        <div class="meta-line">Mata Pelajaran: ${mapelLabel}</div>
        ${settings.namaGuru ? `<div class="meta-line">Nama Guru: ${settings.namaGuru}</div>` : ''}
        ${settings.nipGuru ? `<div class="meta-line">NIP: ${settings.nipGuru}</div>` : ''}
      </td>
      <td style="width:50%; vertical-align:top; border:none; padding:0 0 0 15px;">
        <div class="meta-line">Satuan Pendidikan: ${settings.sekolah || '-'}</div>
        <div class="meta-line">Tanggal Unduh: ${todayStr}</div>
      </td>
    </tr>
  </table>

  <table>
    <thead>
      <tr>
        <th style="width: 40px; text-align: center;">No</th>
        <th style="width: 130px;">Tanggal</th>
        <th style="width: 70px;">Kelas</th>
        <th style="width: 150px;">Jam Pelajaran</th>
        <th style="width: 100px;">Durasi</th>
        <th>Materi Ajar</th>
        <th style="width: 220px;">Absensi Siswa (Tidak Hadir)</th>
      </tr>
    </thead>
    <tbody>
      ${tableRows || `<tr><td colspan="7" style="text-align:center; padding:20px; color:#000000; border:1px solid #374151;">Tidak ada data jurnal mengajar.</td></tr>`}
    </tbody>
  </table>
</body>
</html>`;

    // Gunakan iframe tersembunyi agar langsung memicu popup print tanpa membuka tab baru di browser
    let iframe = document.getElementById('print-iframe-jm');
    if (!iframe) {
      iframe = document.createElement('iframe');
      iframe.id = 'print-iframe-jm';
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      document.body.appendChild(iframe);
    }

    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(html);
    doc.close();

    setTimeout(() => {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    }, 250);
  }
};
