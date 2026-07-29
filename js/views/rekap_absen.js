/* ==========================================================================
   JurnalGuru Pro - View Rekap Absen Siswa (Attendance Matrix)
   ========================================================================== */

import { Store } from '../store.js';
import { ExportService } from '../services/export.js';

export const RekapAbsenView = {
  render() {
    this.renderMatrixTable();
    this.initFilters();
    this.initExportButtons();
  },

  renderMatrixTable() {
    const tableEl = document.getElementById('rekap-absen-table');
    if (!tableEl) return;

    const kelasFilter = document.getElementById('ra-filter-kelas')?.value || '7A';
    const monthFilter = document.getElementById('ra-filter-bulan')?.value || new Date().toISOString().substring(0, 7);

    const siswaList = Store.getSiswa(kelasFilter);
    const logs = Store.getLogs().filter(l => l.kategori === 'MENGAJAR' && l.kelas && l.kelas.includes(kelasFilter));

    // Filter logs by month YYYY-MM
    const monthLogs = logs.filter(l => l.tanggal.startsWith(monthFilter));

    // Get unique dates in this month
    const datesInMonth = [...new Set(monthLogs.map(l => l.tanggal))].sort();

    // Build Table Header
    let headHtml = `
      <thead>
        <tr>
          <th>No</th>
          <th>NISN</th>
          <th>Nama Siswa</th>
          ${datesInMonth.map(d => `<th>${d.substring(8)}</th>`).join('')}
          <th style="background:#D1FAE5; color:#065F46;">H</th>
          <th style="background:#FEF3C7; color:#92400E;">S</th>
          <th style="background:#DBEAFE; color:#1E40AF;">I</th>
          <th style="background:#FEE2E2; color:#991B1B;">A</th>
        </tr>
      </thead>
    `;

    // Build Table Body
    let bodyHtml = '<tbody>';
    if (siswaList.length === 0) {
      bodyHtml += `<tr><td colspan="${4 + datesInMonth.length}" style="text-align:center; padding: 2rem;" class="text-muted">Tidak ada data siswa untuk Kelas ${kelasFilter}.</td></tr>`;
    } else {
      siswaList.forEach((s, idx) => {
        let cntH = 0, cntS = 0, cntI = 0, cntA = 0;
        let dateCellsHtml = '';

        datesInMonth.forEach(d => {
          const logAtDate = monthLogs.find(l => l.tanggal === d);
          let status = 'H'; // default Hadir
          if (logAtDate && logAtDate.rollCallData && logAtDate.rollCallData[s.nisn]) {
            status = logAtDate.rollCallData[s.nisn];
          }

          if (status === 'H') { cntH++; dateCellsHtml += `<td><span class="stat-pill h">H</span></td>`; }
          else if (status === 'S') { cntS++; dateCellsHtml += `<td><span class="stat-pill s">S</span></td>`; }
          else if (status === 'I') { cntI++; dateCellsHtml += `<td><span class="stat-pill i">I</span></td>`; }
          else if (status === 'A') { cntA++; dateCellsHtml += `<td><span class="stat-pill a">A</span></td>`; }
        });

        bodyHtml += `
          <tr>
            <td>${idx + 1}</td>
            <td><code>${s.nisn}</code></td>
            <td><strong>${s.nama}</strong></td>
            ${dateCellsHtml}
            <td><strong>${cntH}</strong></td>
            <td><strong style="color:#D97706;">${cntS}</strong></td>
            <td><strong style="color:#2563EB;">${cntI}</strong></td>
            <td><strong style="color:#DC2626;">${cntA}</strong></td>
          </tr>
        `;
      });
    }
    bodyHtml += '</tbody>';

    tableEl.innerHTML = headHtml + bodyHtml;
  },

  initFilters() {
    const kelasSelect = document.getElementById('ra-filter-kelas');
    if (kelasSelect) {
      kelasSelect.innerHTML = '';
      const allSiswa = Store.getSiswa();
      const uniqueKelas = [...new Set(allSiswa.map(s => s.kelas))].sort();
      uniqueKelas.forEach(k => {
        const opt = document.createElement('option');
        opt.value = k;
        opt.textContent = /^kelas/i.test(k) ? k : `Kelas ${k}`;
        kelasSelect.appendChild(opt);
      });
      kelasSelect.addEventListener('change', () => this.renderMatrixTable());
    }

    const monthInput = document.getElementById('ra-filter-bulan');
    if (monthInput) {
      monthInput.value = new Date().toISOString().substring(0, 7);
      monthInput.addEventListener('change', () => this.renderMatrixTable());
    }
  },

  initExportButtons() {
    const btnExcel = document.getElementById('btn-export-ra-excel');
    const btnPdf = document.getElementById('btn-export-ra-pdf');

    if (btnExcel) {
      btnExcel.onclick = () => {
        const kelasFilter = document.getElementById('ra-filter-kelas')?.value || '7A';
        const monthFilter = document.getElementById('ra-filter-bulan')?.value || new Date().toISOString().substring(0, 7);
        
        const siswaList = Store.getSiswa(kelasFilter);
        const logs = Store.getLogs().filter(l => l.kategori === 'MENGAJAR' && l.kelas && l.kelas.includes(kelasFilter));
        const monthLogs = logs.filter(l => l.tanggal.startsWith(monthFilter));
        const datesInMonth = [...new Set(monthLogs.map(l => l.tanggal))].sort();

        const exportData = siswaList.map((s, i) => {
          const rowData = {
            No: i + 1,
            NISN: s.nisn,
            Nama_Siswa: s.nama,
            Kelas: s.kelas,
            Jenis_Kelamin: s.jenisKelamin
          };

          let cntH = 0, cntS = 0, cntI = 0, cntA = 0;

          datesInMonth.forEach(d => {
            const logAtDate = monthLogs.find(l => l.tanggal === d);
            let status = 'H';
            if (logAtDate && logAtDate.rollCallData && logAtDate.rollCallData[s.nisn]) {
              status = logAtDate.rollCallData[s.nisn];
            }

            if (status === 'H') cntH++;
            else if (status === 'S') cntS++;
            else if (status === 'I') cntI++;
            else if (status === 'A') cntA++;

            rowData[`Tgl_${d.substring(8)}`] = status;
          });

          rowData['Total_H'] = cntH;
          rowData['Total_S'] = cntS;
          rowData['Total_I'] = cntI;
          rowData['Total_A'] = cntA;

          return rowData;
        });

        ExportService.exportToExcel(exportData, `Rekap_Absensi_Kelas_${kelasFilter}_${monthFilter}.xlsx`, 'Rekap Absensi');
        window.App.showToast('File Excel Rekap Absensi berhasil diunduh!', 'success');
      };
    }

    if (btnPdf) {
      btnPdf.onclick = () => this.printRekapAbsen();
    }
  },

  printRekapAbsen() {
    const settings = Store.getSettings();
    const kelasFilter = document.getElementById('ra-filter-kelas')?.value || '7A';
    const monthFilter = document.getElementById('ra-filter-bulan')?.value || new Date().toISOString().substring(0, 7);

    const siswaList = Store.getSiswa(kelasFilter);
    const logs = Store.getLogs().filter(l => l.kategori === 'MENGAJAR' && l.kelas && l.kelas.includes(kelasFilter));
    const monthLogs = logs.filter(l => l.tanggal.startsWith(monthFilter));
    const datesInMonth = [...new Set(monthLogs.map(l => l.tanggal))].sort();

    const today = new Date();
    const todayStr = `${today.getDate()}/${today.getMonth() + 1}/${today.getFullYear()}`;

    // Format Bulan & Tahun (misal: 2026-07 -> Juli 2026)
    const [year, month] = monthFilter.split('-');
    const dateObj = new Date(parseInt(year), parseInt(month) - 1, 1);
    const monthYearStr = dateObj.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });

    // Detect mata pelajaran
    const allMateri = Store.getMateri();
    const mapelSet = new Set(allMateri.map(m => m.mataPelajaran).filter(Boolean));
    const mapelLabel = mapelSet.size > 0 ? [...mapelSet].join(', ') : (settings.namaMapel || 'Informatika');

    // Build Table Header HTML
    const dateHeadersHtml = datesInMonth.map(d => `<th style="width:28px; text-align:center; padding:6px 2px;">${d.substring(8)}</th>`).join('');
    const headHtml = `
      <thead>
        <tr>
          <th style="width:35px; text-align:center; padding:8px 4px;">No</th>
          <th style="width:110px; padding:8px 6px;">NISN</th>
          <th style="padding:8px 6px;">Nama Siswa</th>
          ${dateHeadersHtml}
          <th style="width:32px; text-align:center; background-color:#047857 !important; color:#ffffff !important;">H</th>
          <th style="width:32px; text-align:center; background-color:#B45309 !important; color:#ffffff !important;">S</th>
          <th style="width:32px; text-align:center; background-color:#1D4ED8 !important; color:#ffffff !important;">I</th>
          <th style="width:32px; text-align:center; background-color:#B91C1C !important; color:#ffffff !important;">A</th>
        </tr>
      </thead>
    `;

    // Build Table Body HTML
    let bodyRowsHtml = '';
    if (siswaList.length === 0) {
      bodyRowsHtml = `<tr><td colspan="${4 + datesInMonth.length}" style="text-align:center; padding:16px; color:#6B7280;">Tidak ada data siswa untuk Kelas ${kelasFilter}.</td></tr>`;
    } else {
      siswaList.forEach((s, idx) => {
        let cntH = 0, cntS = 0, cntI = 0, cntA = 0;
        let dateCellsHtml = '';

        datesInMonth.forEach(d => {
          const logAtDate = monthLogs.find(l => l.tanggal === d);
          let status = 'H';
          if (logAtDate && logAtDate.rollCallData && logAtDate.rollCallData[s.nisn]) {
            status = logAtDate.rollCallData[s.nisn];
          }

          if (status === 'H') { cntH++; dateCellsHtml += `<td style="text-align:center; font-weight:700; color:#047857;">H</td>`; }
          else if (status === 'S') { cntS++; dateCellsHtml += `<td style="text-align:center; font-weight:700; color:#B45309; background:#FEF3C7;">S</td>`; }
          else if (status === 'I') { cntI++; dateCellsHtml += `<td style="text-align:center; font-weight:700; color:#1D4ED8; background:#DBEAFE;">I</td>`; }
          else if (status === 'A') { cntA++; dateCellsHtml += `<td style="text-align:center; font-weight:700; color:#B91C1C; background:#FEE2E2;">A</td>`; }
        });

        const rowBg = idx % 2 === 0 ? '#ffffff' : '#F8FAFC';
        bodyRowsHtml += `
          <tr style="background:${rowBg};">
            <td style="text-align:center; padding:6px 4px; font-weight:500;">${idx + 1}</td>
            <td style="padding:6px 6px; font-family:monospace;">${s.nisn}</td>
            <td style="padding:6px 6px; font-weight:600; color:#000000;">${s.nama}</td>
            ${dateCellsHtml}
            <td style="text-align:center; font-weight:700; color:#047857;">${cntH}</td>
            <td style="text-align:center; font-weight:700; color:#B45309;">${cntS}</td>
            <td style="text-align:center; font-weight:700; color:#1D4ED8;">${cntI}</td>
            <td style="text-align:center; font-weight:700; color:#B91C1C;">${cntA}</td>
          </tr>
        `;
      });
    }

    const html = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>Rekapitulasi Kehadiran Siswa - ${kelasFilter}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 0.85rem;
      color: #000000;
      background: #fff;
      padding: 25px;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .report-title {
      font-size: 1.4rem;
      font-weight: 800;
      color: #000000;
      margin-bottom: 14px;
      text-transform: uppercase;
      letter-spacing: -0.2px;
    }
    .meta-line {
      font-size: 0.9rem;
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
      font-size: 0.8rem;
      font-weight: 700;
      border: 1px solid #004D40;
      background-color: #00796B !important;
      color: #ffffff !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    tbody td {
      border: 1px solid #374151;
      font-size: 0.8rem;
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
  <h1 class="report-title">MATRIX REKAPITULASI KEHADIRAN SISWA</h1>

  <table class="meta-table" style="width:100%; border:none; margin-bottom:16px; border-collapse:collapse;">
    <tr>
      <td style="width:50%; vertical-align:top; border:none; padding:0 15px 0 0;">
        <div class="meta-line">Mata Pelajaran: ${mapelLabel}</div>
        ${settings.namaGuru ? `<div class="meta-line">Nama Guru: ${settings.namaGuru}</div>` : ''}
        ${settings.nipGuru ? `<div class="meta-line">NIP: ${settings.nipGuru}</div>` : ''}
        <div class="meta-line">Kelas: ${/^kelas/i.test(kelasFilter) ? kelasFilter : `Kelas ${kelasFilter}`}</div>
      </td>
      <td style="width:50%; vertical-align:top; border:none; padding:0 0 0 15px;">
        <div class="meta-line">Bulan / Periode: ${monthYearStr}</div>
        <div class="meta-line">Satuan Pendidikan: ${settings.sekolah || 'SMP NEGERI 13 Penajam Paser Utara'}</div>
        <div class="meta-line">Tanggal Unduh: ${todayStr}</div>
      </td>
    </tr>
  </table>

  <table>
    ${headHtml}
    <tbody>
      ${bodyRowsHtml}
    </tbody>
  </table>
</body>
</html>`;

    // Print iframe
    let iframe = document.getElementById('print-iframe-ra');
    if (!iframe) {
      iframe = document.createElement('iframe');
      iframe.id = 'print-iframe-ra';
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
