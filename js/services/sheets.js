/* ==========================================================================
   JurnalGuru Pro - Google Sheets Sync Integration Service
   ========================================================================== */

import { Store } from '../store.js';

export const SheetsService = {
  // Test Connection to Google Apps Script Endpoint
  async testConnection(apiUrl) {
    if (!apiUrl) throw new Error('URL Google Apps Script belum diisi!');

    const cleanUrl = apiUrl.trim();
    if (!cleanUrl.startsWith('https://script.google.com/')) {
      throw new Error('URL harus diawali dengan https://script.google.com/macros/s/...');
    }

    try {
      // Send a test ping payload using no-cors mode to bypass Google Apps Script redirect restriction
      await fetch(cleanUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({ action: 'ping', timestamp: new Date().toISOString() })
      });
      return true;
    } catch (err) {
      throw new Error('Gagal terhubung ke Google Apps Script: ' + err.message);
    }
  },

  // Push Single Log Entry to Google Sheets in Real-Time
  async pushSingleLogToSheet(logEntry) {
    const settings = Store.getSettings();
    if (!settings.appsScriptUrl) {
      throw new Error('Database Google Sheets Belum Terhubung! Guru wajib menghubungkan URL Google Sheets di Pengaturan.');
    }

    const payload = {
      action: 'add_log',
      timestamp: new Date().toISOString(),
      sekolah: settings.sekolah,
      namaGuru: settings.namaGuru,
      nipGuru: settings.nipGuru,
      log: logEntry
    };

    await fetch(settings.appsScriptUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify(payload)
    });

    return { status: 'success', message: 'Entri jurnal berhasil disimpan & terkirim ke Google Sheets!' };
  },

  // Push Local Data Logs & Master Data to Google Sheets
  async pushLogsToSheet() {
    const settings = Store.getSettings();
    if (!settings.appsScriptUrl) {
      throw new Error('Google Apps Script Web App URL belum dikonfigurasi di Pengaturan!');
    }

    const logs = Store.getLogs();
    const siswa = Store.getSiswa();
    const materi = Store.getMateri();

    const payload = {
      action: 'sync_all',
      timestamp: new Date().toISOString(),
      sekolah: settings.sekolah,
      namaGuru: settings.namaGuru,
      nipGuru: settings.nipGuru,
      logs: logs,
      siswa: siswa,
      materi: materi,
      pengaturan: settings
    };

    await fetch(settings.appsScriptUrl, {
      method: 'POST',
      mode: 'no-cors', // Apps Script standard POST mode
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify(payload)
    });

    return { status: 'success', message: 'Seluruh data (Jurnal, Siswa, Materi, & Pengaturan) berhasil disinkronisasikan ke Google Sheets!' };
  },

  // Generate Multi-User Google Apps Script Template Code for user (Anti-Duplicate / Upsert)
  getAppsScriptTemplateCode() {
    return `/**
 * Google Apps Script Multi-Guru Backend - JurnalGuru Pro (SMPN 13 PPU)
 * Tempelkan kode ini di Google Apps Script (Extensions -> Apps Script pada Spreadsheet Sekolah).
 * Lalu klik Deploy -> New Deployment -> Web App -> Access: Anyone.
 */

function doGet(e) {
  var action = e ? e.parameter.action : '';
  if (action === 'ping') {
    return ContentService.createTextOutput(JSON.stringify({ status: 'success', message: 'Google Apps Script Connected Multi-User!' }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  return ContentService.createTextOutput(JSON.stringify({ status: 'active', app: 'JurnalGuru Pro Multi-Teacher API' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // Helper: Map Existing Key to Row Index (1-based) to Prevent Duplicate Entries
    function getKeyRowMap(sheet, colIndex) {
      var map = {};
      var lastRow = sheet.getLastRow();
      if (lastRow < 1) return map;
      var values = sheet.getRange(1, colIndex, lastRow, 1).getValues();
      for (var i = 0; i < values.length; i++) {
        var val = String(values[i][0]).trim();
        if (val) {
          map[val] = i + 1;
        }
      }
      return map;
    }
    
    // Sheet 1: Master Log Jurnal
    var sheetLog = ss.getSheetByName("Master Log Jurnal") || ss.insertSheet("Master Log Jurnal");
    if (sheetLog.getLastRow() === 0) {
      sheetLog.appendRow(["ID Entri", "Waktu Input", "Nama Guru", "NIP Guru", "Tanggal KBM", "Kategori", "Jam/Durasi", "Durasi (Menit)", "Kelas", "Materi/Kegiatan", "Catatan Absensi", "Hasil/Uraian"]);
      sheetLog.getRange(1, 1, 1, 12).setFontWeight("bold").setBackground("#0F766E").setFontColor("#FFFFFF");
    }
    
    // Sheet 2: Master Data Siswa
    var sheetSiswa = ss.getSheetByName("Master Data Siswa") || ss.insertSheet("Master Data Siswa");
    if (sheetSiswa.getLastRow() === 0) {
      sheetSiswa.appendRow(["NISN", "Nama Lengkap Siswa", "Kelas", "Jenis Kelamin", "Agama"]);
      sheetSiswa.getRange(1, 1, 1, 5).setFontWeight("bold").setBackground("#059669").setFontColor("#FFFFFF");
    }

    // Sheet 3: Master Modul Materi
    var sheetMateri = ss.getSheetByName("Master Modul Materi") || ss.insertSheet("Master Modul Materi");
    if (sheetMateri.getLastRow() === 0) {
      sheetMateri.appendRow(["ID Modul", "Tingkat Kelas", "Mata Pelajaran", "Topik Pembelajaran"]);
      sheetMateri.getRange(1, 1, 1, 4).setFontWeight("bold").setBackground("#D97706").setFontColor("#FFFFFF");
    }

    // Sheet 4: Master Data Pengaturan
    var sheetPengaturan = ss.getSheetByName("Master Data Pengaturan") || ss.insertSheet("Master Data Pengaturan");
    if (sheetPengaturan.getLastRow() === 0) {
      sheetPengaturan.appendRow(["Kategori Pengaturan", "Key / Parameter", "Nilai / Konfigurasi"]);
      sheetPengaturan.getRange(1, 1, 1, 3).setFontWeight("bold").setBackground("#3B82F6").setFontColor("#FFFFFF");
    }

    // --- ACTION 1: ADD / UPDATE SINGLE LOG ENTRY (ANTI-DUPLICATE) ---
    if (data.action === 'add_log' && data.log) {
      var l = data.log;
      var logId = String(l.id || ('LOG-' + Date.now())).trim();
      var logMap = getKeyRowMap(sheetLog, 1);
      
      var rowValues = [
        logId,
        data.timestamp || new Date().toISOString(),
        data.namaGuru || l.namaGuru || '-',
        data.nipGuru || l.nipGuru || '-',
        l.tanggal,
        l.kategori,
        l.waktu,
        l.durasiMenit || 0,
        l.kelas || '-',
        l.materi || l.kegiatan || '-',
        l.catatanAbsen || '-',
        l.hasil || '-'
      ];

      if (logMap[logId]) {
        sheetLog.getRange(logMap[logId], 1, 1, 12).setValues([rowValues]);
      } else {
        sheetLog.appendRow(rowValues);
      }
    }
    
    // --- ACTION 2: SYNC ALL DATA (ANTI-DUPLICATE UPSERT FOR LOGS, SISWA, MATERI, PENGATURAN) ---
    if (data.action === 'sync_all') {
      // 1. Sync Master Log Jurnal
      if (data.logs && data.logs.length > 0) {
        var logMap = getKeyRowMap(sheetLog, 1);
        data.logs.forEach(function(l) {
          var logId = String(l.id || ('LOG-' + Date.now())).trim();
          var rowValues = [
            logId,
            data.timestamp || new Date().toISOString(),
            data.namaGuru || l.namaGuru || '-',
            data.nipGuru || l.nipGuru || '-',
            l.tanggal,
            l.kategori,
            l.waktu,
            l.durasiMenit || 0,
            l.kelas || '-',
            l.materi || l.kegiatan || '-',
            l.catatanAbsen || '-',
            l.hasil || '-'
          ];
          if (logMap[logId]) {
            sheetLog.getRange(logMap[logId], 1, 1, 12).setValues([rowValues]);
          } else {
            sheetLog.appendRow(rowValues);
            logMap[logId] = sheetLog.getLastRow();
          }
        });
      }

      // 2. Sync Master Data Siswa
      if (data.siswa && data.siswa.length > 0) {
        var siswaMap = getKeyRowMap(sheetSiswa, 1);
        data.siswa.forEach(function(s) {
          var nisn = String(s.nisn || '').trim();
          if (!nisn) return;
          var rowValues = [
            nisn,
            s.nama || '-',
            s.kelas || '-',
            s.jenisKelamin || s.jk || '-',
            s.agama || 'Islam'
          ];
          if (siswaMap[nisn]) {
            sheetSiswa.getRange(siswaMap[nisn], 1, 1, 5).setValues([rowValues]);
          } else {
            sheetSiswa.appendRow(rowValues);
            siswaMap[nisn] = sheetSiswa.getLastRow();
          }
        });
      }

      // 3. Sync Master Modul Materi
      if (data.materi && data.materi.length > 0) {
        var materiMap = getKeyRowMap(sheetMateri, 1);
        data.materi.forEach(function(m) {
          var matId = String(m.id || (m.mataPelajaran + '_' + m.topik)).trim();
          var rowValues = [
            matId,
            m.kelas || m.tingkat || '-',
            m.mataPelajaran || '-',
            m.topik || '-'
          ];
          if (materiMap[matId]) {
            sheetMateri.getRange(materiMap[matId], 1, 1, 4).setValues([rowValues]);
          } else {
            sheetMateri.appendRow(rowValues);
            materiMap[matId] = sheetMateri.getLastRow();
          }
        });
      }

      // 4. Sync Master Data Pengaturan
      if (data.pengaturan) {
        var p = data.pengaturan;
        var pengMap = getKeyRowMap(sheetPengaturan, 2);
        
        var settingsRows = [
          ["Profil Sekolah", "Nama Sekolah", p.sekolah || '-'],
          ["Profil Guru", "Nama Guru", p.namaGuru || '-'],
          ["Profil Guru", "NIP Guru", p.nipGuru || '-'],
          ["Profil Kepala Sekolah", "Nama Kepala Sekolah", p.namaKepsek || '-'],
          ["Profil Kepala Sekolah", "NIP Kepala Sekolah", p.nipKepsek || '-'],
          ["Cetak", "Tempat Cetak Laporan", p.tempatCetak || '-'],
          ["Konfigurasi Rutin", "Kegiatan Pagi (JSON)", JSON.stringify(p.pagiConfig || p.jadwalPagi || {})],
          ["Konfigurasi Rutin", "Jam Istirahat (JSON)", JSON.stringify(p.jadwalIstirahat || {})],
          ["Konfigurasi Rutin", "Jam Pulang (JSON)", JSON.stringify(p.jadwalPulang || {})]
        ];

        settingsRows.forEach(function(r) {
          var key = r[1];
          if (pengMap[key]) {
            sheetPengaturan.getRange(pengMap[key], 1, 1, 3).setValues([r]);
          } else {
            sheetPengaturan.appendRow(r);
            pengMap[key] = sheetPengaturan.getLastRow();
          }
        });
      }
    }

    return ContentService.createTextOutput(JSON.stringify({ status: 'success', message: 'Sync completed without duplicates' })).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: error.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}`;
  }
};
