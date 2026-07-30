/* ==========================================================================
   JurnalGuru Pro - View Jurnal Mingguan (Integrasi 37.5 Jam Beban Kerja & Print Setup)
   ========================================================================== */

import { Store } from '../store.js';
import { ExportService } from '../services/export.js';

function formatKategoriDisplay(kategori) {
  if (!kategori) return '-';
  const kat = String(kategori).toUpperCase().trim();
  if (kat === 'PAGI') return 'Rutinitas Pagi';
  if (kat === 'MENGAJAR') return 'MENGAJAR';
  if (kat === 'ISTIRAHAT') return 'ISTIRAHAT';
  return 'Kegiatan Mandiri';
}

function toLocalYMD(date) {
  if (!date || isNaN(date.getTime())) return new Date().toISOString().split('T')[0];
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getWeekRange() {
  const today = new Date();
  const day = today.getDay();
  const diffToMon = today.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(today.getFullYear(), today.getMonth(), diffToMon);
  const saturday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 5);
  return {
    mondayStr: toLocalYMD(monday),
    saturdayStr: toLocalYMD(saturday)
  };
}

function formatDateLongID(dateStr) {
  if (!dateStr) return '-';
  try {
    let d;
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      const [y, m, day] = dateStr.split('-').map(Number);
      d = new Date(y, m - 1, day);
    } else {
      d = new Date(dateStr);
    }
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch (e) {
    return dateStr;
  }
}

export const JurnalMingguanView = {
  render() {
    try {
      this.initPrintSetupForm();
      this.renderWeeklyReport();
    } catch (err) {
      console.error('Error rendering JurnalMingguanView:', err);
    }
  },

  initPrintSetupForm() {
    const settings = Store.getSettings();

    // Fill form inputs from settings defaults
    const tglStartInput = document.getElementById('jm-print-tgl-start');
    const tglEndInput = document.getElementById('jm-print-tgl-end');
    const guruInput = document.getElementById('jm-print-nama-guru');
    const nipGuruInput = document.getElementById('jm-print-nip-guru');
    const kepsekInput = document.getElementById('jm-print-nama-kepsek');
    const nipKepsekInput = document.getElementById('jm-print-nip-kepsek');
    const tempatInput = document.getElementById('jm-print-tempat');
    const tglCetakInput = document.getElementById('jm-print-tgl-cetak');
    const orientasiInput = document.getElementById('jm-print-orientasi');

    if (guruInput) guruInput.value = settings.namaGuru;
    if (nipGuruInput) nipGuruInput.value = settings.nipGuru;
    if (kepsekInput) kepsekInput.value = settings.namaKepsek;
    if (nipKepsekInput) nipKepsekInput.value = settings.nipKepsek;
    if (tempatInput) tempatInput.value = settings.tempatCetak || 'Penajam';
    if (tglCetakInput) tglCetakInput.value = toLocalYMD(new Date());
    if (orientasiInput) orientasiInput.value = settings.orientasiCetak || 'portrait';

    // Default Date Range: Current Week (Monday to Saturday) - always set on render
    const { mondayStr, saturdayStr } = getWeekRange();

    if (tglStartInput) tglStartInput.value = mondayStr;
    if (tglEndInput) tglEndInput.value = saturdayStr;

    // Trigger render & orientation update on input changes
    const inputs = [tglStartInput, tglEndInput, guruInput, nipGuruInput, kepsekInput, nipKepsekInput, tempatInput, tglCetakInput, orientasiInput];
    inputs.forEach(input => {
      if (input) input.addEventListener('change', () => this.renderWeeklyReport());
    });

    const btnSavePrint = document.getElementById('btn-save-print-setup');
    if (btnSavePrint) {
      btnSavePrint.onclick = () => {
        const currentSettings = Store.getSettings();
        const updated = {
          ...currentSettings,
          namaGuru: guruInput.value.trim(),
          nipGuru: nipGuruInput.value.trim(),
          namaKepsek: kepsekInput.value.trim(),
          nipKepsek: nipKepsekInput.value.trim(),
          tempatCetak: tempatInput.value.trim(),
          orientasiCetak: orientasiInput ? orientasiInput.value : 'portrait'
        };
        Store.saveSettings(updated);
        window.App.showToast('Pengaturan cetak laporan berhasil disimpan!', 'success');
        this.renderWeeklyReport();
      };
    }

    const btnPrint = document.getElementById('btn-print-jurnal-mingguan');
    if (btnPrint) btnPrint.onclick = () => this.printJurnalMingguan();

    const btnExcel = document.getElementById('btn-export-jm-mingguan-excel');
    if (btnExcel) {
      btnExcel.onclick = () => {
        const startDateStr = tglStartInput.value || mondayStr;
        const endDateStr = tglEndInput.value || saturdayStr;
        const workload = Store.getWeeklyWorkload(startDateStr, endDateStr);
        const exportData = workload.filteredLogs.map((l, i) => ({
          No: i + 1,
          Tanggal: window.App ? window.App.formatDateID(l.tanggal) : l.tanggal,
          Waktu: l.waktu,
          Kegiatan: formatKategoriDisplay(l.kategori),
          Uraian_Kegiatan: ((l.materi || l.kegiatan || '-').includes(' - ') ? (l.materi || l.kegiatan).split(' - ').slice(1).join(' - ') : (l.materi || l.kegiatan || '-')).replace(/[\[\]]/g, ''),
          Durasi_Menit: l.durasiMenit,
          Hasil_Output: (l.hasil || '-').replace(/[\[\]]/g, '')
        }));
        ExportService.exportToExcel(exportData, `Jurnal_Mingguan_37.5_Jam_${startDateStr}_sd_${endDateStr}.xlsx`, 'Jurnal Mingguan');
        window.App.showToast('File Excel Jurnal Mingguan 37.5 Jam berhasil diunduh!', 'success');
      };
    }
  },

  printJurnalMingguan() {
    const { mondayStr, saturdayStr } = getWeekRange();
    const startDateStr = document.getElementById('jm-print-tgl-start')?.value || mondayStr;
    const endDateStr = document.getElementById('jm-print-tgl-end')?.value || saturdayStr;

    const guruName = document.getElementById('jm-print-nama-guru')?.value || Store.getSettings().namaGuru || '-';
    const nipGuru = document.getElementById('jm-print-nip-guru')?.value || Store.getSettings().nipGuru || '-';
    const kepsekName = document.getElementById('jm-print-nama-kepsek')?.value || Store.getSettings().namaKepsek || '-';
    const nipKepsek = document.getElementById('jm-print-nip-kepsek')?.value || Store.getSettings().nipKepsek || '-';
    const tempatCetak = document.getElementById('jm-print-tempat')?.value || Store.getSettings().tempatCetak || 'Penajam';
    const tglCetak = document.getElementById('jm-print-tgl-cetak')?.value || new Date().toISOString().split('T')[0];
    const orientasi = document.getElementById('jm-print-orientasi')?.value || Store.getSettings().orientasiCetak || 'portrait';

    const workload = Store.getWeeklyWorkload(startDateStr, endDateStr);
    const settings = Store.getSettings();

    let tableRowsHtml = '';
    if (workload.filteredLogs.length === 0) {
      tableRowsHtml = `<tr><td colspan="7" style="text-align:center; padding: 1.5rem; border:1px solid #000;">Tidak ada log jurnal pada periode ${startDateStr} s/d ${endDateStr}.</td></tr>`;
    } else {
      workload.filteredLogs.forEach((l, idx) => {
        const durasiJamText = `${Math.floor(l.durasiMenit / 60)}j ${l.durasiMenit % 60}m`;
        const rawKegiatan = (l.materi || l.kegiatan || '-').includes(' - ') ? (l.materi || l.kegiatan).split(' - ').slice(1).join(' - ') : (l.materi || l.kegiatan || '-');
        const cleanKegiatan = rawKegiatan.replace(/[\[\]]/g, '');
        const cleanHasil = (l.hasil || '-').replace(/[\[\]]/g, '');
        const displayKegiatan = formatKategoriDisplay(l.kategori);

        tableRowsHtml += `
          <tr>
            <td style="text-align:center; border:1px solid #000; padding:6px;">${idx + 1}</td>
            <td style="border:1px solid #000; padding:6px;"><strong>${window.App ? window.App.formatDateID(l.tanggal) : l.tanggal}</strong></td>
            <td style="text-align:center; border:1px solid #000; padding:6px;">${l.waktu}</td>
            <td style="border:1px solid #000; padding:6px;">${displayKegiatan}</td>
            <td style="border:1px solid #000; padding:6px;">${cleanKegiatan}</td>
            <td style="text-align:center; border:1px solid #000; padding:6px; font-weight:bold;">${durasiJamText}</td>
            <td style="border:1px solid #000; padding:6px;">${cleanHasil}</td>
          </tr>
        `;
      });
    }

    const printHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Laporan Jurnal Mingguan 37.5 Jam</title>
        <style>
          @page {
            size: A4 ${orientasi};
            margin: 1.2cm 1cm 1.2cm 1cm;
          }
          body {
            font-family: 'Times New Roman', Times, serif, Arial, sans-serif;
            font-size: 11pt;
            color: #000;
            margin: 0;
            padding: 0;
            background: #fff;
          }
          .report-title {
            text-align: center;
            font-size: 14pt;
            font-weight: bold;
            margin-bottom: 4px;
            text-transform: uppercase;
          }
          .report-subtitle {
            text-align: center;
            font-size: 12pt;
            font-weight: bold;
            margin-bottom: 4px;
          }
          .report-period {
            text-align: center;
            font-size: 10pt;
            margin-bottom: 15px;
          }
          table.report-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
            font-size: 10pt;
          }
          table.report-table th {
            background-color: #00796B !important;
            color: #ffffff !important;
            border: 1px solid #000000 !important;
            padding: 8px 6px;
            text-align: center;
            font-weight: bold;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          table.report-table td {
            border: 1px solid #000000 !important;
            padding: 6px;
            vertical-align: top;
          }
          .summary-box {
            margin-top: 15px;
            border: 1px solid #000;
            padding: 8px 12px;
            font-weight: bold;
            font-size: 10.5pt;
          }
          .signature-table {
            width: 100%;
            border: none;
            margin-top: 30px;
            page-break-inside: avoid;
          }
          .signature-table td {
            border: none !important;
            padding: 0;
            text-align: center;
            vertical-align: top;
          }
        </style>
      </head>
      <body>
        <div class="report-title">LAPORAN JURNAL MINGGUAN BEBAN KERJA GURU (37,5 JAM/MINGGU)</div>
        <div class="report-subtitle">${settings.sekolah || '-'}</div>
        <div class="report-period">Periode: ${window.App ? window.App.formatDateID(startDateStr) : startDateStr} s/d ${window.App ? window.App.formatDateID(endDateStr) : endDateStr} | Total Akumulasi: <strong>${workload.displayTime}</strong></div>

        <table class="report-table">
          <thead>
            <tr>
              <th style="width: 35px;">No</th>
              <th style="width: 95px;">Tanggal</th>
              <th style="width: 100px;">Jam / Waktu</th>
              <th style="width: 110px;">Kegiatan</th>
              <th>Materi / Uraian Tugas</th>
              <th style="width: 85px;">Durasi</th>
              <th>Hasil / Deskripsi</th>
            </tr>
          </thead>
          <tbody>
            ${tableRowsHtml}
          </tbody>
        </table>

        <div class="summary-box">
          Total Durasi Beban Kerja Efektif: ${workload.displayTime}
        </div>

        <table class="signature-table">
          <tr>
            <td style="width: 50%;">
              <p>Mengetahui,</p>
              <p><strong>Kepala Sekolah</strong></p>
              <div style="height: 60px;"></div>
              <p><strong><u>${kepsekName}</u></strong></p>
              <p>NIP. ${nipKepsek}</p>
            </td>
            <td style="width: 50%;">
              <p>${tempatCetak}, ${formatDateLongID(tglCetak)}</p>
              <p><strong>Guru Mata Pelajaran</strong></p>
              <div style="height: 60px;"></div>
              <p><strong><u>${guruName}</u></strong></p>
              <p>NIP. ${nipGuru}</p>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    // Hidden iframe print execution
    let iframe = document.getElementById('print-hidden-iframe');
    if (!iframe) {
      iframe = document.createElement('iframe');
      iframe.id = 'print-hidden-iframe';
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
    doc.write(printHtml);
    doc.close();

    setTimeout(() => {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    }, 400);
  },

  applyPrintOrientation(orientasi = 'portrait') {
    let styleEl = document.getElementById('dynamic-print-orientation-style');
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 'dynamic-print-orientation-style';
      document.head.appendChild(styleEl);
    }
    const isLandscape = orientasi === 'landscape';
    const marginRule = isLandscape ? '1cm 1.2cm 1cm 1.2cm' : '1.2cm 1cm 1.2cm 1cm';
    styleEl.innerHTML = `@media print { @page { size: A4 ${orientasi}; margin: ${marginRule}; } }`;
  },

  renderWeeklyReport() {
    const { mondayStr, saturdayStr } = getWeekRange();
    const startDateStr = document.getElementById('jm-print-tgl-start')?.value || mondayStr;
    const endDateStr = document.getElementById('jm-print-tgl-end')?.value || saturdayStr;

    const guruName = document.getElementById('jm-print-nama-guru')?.value || Store.getSettings().namaGuru;
    const nipGuru = document.getElementById('jm-print-nip-guru')?.value || Store.getSettings().nipGuru;
    const kepsekName = document.getElementById('jm-print-nama-kepsek')?.value || Store.getSettings().namaKepsek;
    const nipKepsek = document.getElementById('jm-print-nip-kepsek')?.value || Store.getSettings().nipKepsek;
    const tempatCetak = document.getElementById('jm-print-tempat')?.value || 'Penajam';
    const tglCetak = document.getElementById('jm-print-tgl-cetak')?.value || new Date().toISOString().split('T')[0];
    const orientasiCetak = document.getElementById('jm-print-orientasi')?.value || Store.getSettings().orientasiCetak || 'portrait';

    this.applyPrintOrientation(orientasiCetak);

    const workload = Store.getWeeklyWorkload(startDateStr, endDateStr);
    const tbody = document.getElementById('jurnal-mingguan-tbody');
    const footerContainer = document.getElementById('jurnal-mingguan-footer');

    if (tbody) {
      tbody.innerHTML = '';
      if (workload.filteredLogs.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 2rem;" class="text-muted">Tidak ada log jurnal pada periode ${startDateStr} s/d ${endDateStr}.</td></tr>`;
      } else {
        workload.filteredLogs.forEach((l, idx) => {
          const tr = document.createElement('tr');
          const durasiJamText = `${Math.floor(l.durasiMenit / 60)}j ${l.durasiMenit % 60}m`;
          const rawKegiatan = (l.materi || l.kegiatan || '-').includes(' - ') ? (l.materi || l.kegiatan).split(' - ').slice(1).join(' - ') : (l.materi || l.kegiatan || '-');
          const cleanKegiatan = rawKegiatan.replace(/[\[\]]/g, '');
          const cleanHasil = (l.hasil || '-').replace(/[\[\]]/g, '');
          const displayKegiatan = formatKategoriDisplay(l.kategori);

          tr.innerHTML = `
            <td>${idx + 1}</td>
            <td><strong>${window.App ? window.App.formatDateID(l.tanggal) : l.tanggal}</strong></td>
            <td>${l.waktu}</td>
            <td><span class="badge" style="background:#F1F5F9; padding:2px 8px; font-weight:700;">${displayKegiatan}</span></td>
            <td>${cleanKegiatan}</td>
            <td style="white-space: nowrap; text-align: center;"><strong>${durasiJamText}</strong></td>
            <td><small>${cleanHasil}</small></td>
          `;
          tbody.appendChild(tr);
        });
      }
    }

    // Render Official Print Header & Signatures
    const printHeaderEl = document.getElementById('official-print-header-view');
    if (printHeaderEl) {
      printHeaderEl.innerHTML = `
        <h3>LAPORAN JURNAL MINGGUAN BEBAN KERJA GURU (37,5 JAM/MINGGU)</h3>
        <h4>${Store.getSettings().sekolah}</h4>
        <p style="font-size:0.9rem; margin-top:4px;">Periode: ${window.App ? window.App.formatDateID(startDateStr) : startDateStr} s/d ${window.App ? window.App.formatDateID(endDateStr) : endDateStr} | Akumulasi Beban Kerja: <strong>${workload.displayTime}</strong></p>
      `;
    }

    if (footerContainer) {
      const isComplete = workload.isFulfilled;
      const statusBadge = isComplete
        ? `<span style="background:#DCFCE7; color:#15803D; padding:4px 12px; border-radius:12px; font-weight:800;">[ LENGKAP / MEMENUHI BEBAN KERJA 37.5 JAM ]</span>`
        : `<span class="status-badge-pending-print" style="background:#FEF3C7; color:#B45309; padding:4px 12px; border-radius:12px; font-weight:800;">[ DALAM PROSES AKUMULASI (${workload.percentage}%) ]</span>`;

      footerContainer.innerHTML = `
        <div class="print-summary-box" style="margin-top: 1.5rem; padding: 1rem; background:#F8FAFC; border:1px solid #E2E8F0; border-radius:8px;">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <div>
              <strong>Total Durasi Beban Kerja Efektif:</strong> ${workload.displayTime}
            </div>
            <div>
              ${statusBadge}
            </div>
          </div>
        </div>

        <div class="official-print-footer" style="margin-top: 2.5rem; display: flex; justify-content: space-between; page-break-inside: avoid;">
          <div style="text-align: center; min-width: 240px;">
            <p>Mengetahui,</p>
            <p><strong>Kepala Sekolah</strong></p>
            <div style="height: 60px;"></div>
            <p><strong><u>${kepsekName}</u></strong></p>
            <p>NIP. ${nipKepsek}</p>
          </div>
          <div style="text-align: center; min-width: 240px;">
            <p>${tempatCetak}, ${formatDateLongID(tglCetak)}</p>
            <p><strong>Guru Mata Pelajaran</strong></p>
            <div style="height: 60px;"></div>
            <p><strong><u>${guruName}</u></strong></p>
            <p>NIP. ${nipGuru}</p>
          </div>
        </div>
      `;
    }
  }
};
