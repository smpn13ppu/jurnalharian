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

  // Pull All Data from Google Sheets and Smart Merge (Anti-Duplicate)
  async pullDataFromSheet(options = { logs: true, siswa: true, materi: true, pengaturan: true }) {
    const settings = Store.getSettings();
    if (!settings.appsScriptUrl) {
      throw new Error('Google Apps Script Web App URL belum dikonfigurasi di Pengaturan!');
    }

    let remoteData = null;

    try {
      // Try GET request first
      const getUrl = settings.appsScriptUrl + (settings.appsScriptUrl.includes('?') ? '&' : '?') + 'action=fetch_all';
      const res = await fetch(getUrl);
      if (res.ok) {
        remoteData = await res.json();
      }
    } catch (e) {
      console.warn('GET fetch failed, trying POST fetch_all:', e);
    }

    if (!remoteData || remoteData.status !== 'success') {
      // Fallback: POST request for fetch_all
      try {
        const response = await fetch(settings.appsScriptUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify({ action: 'fetch_all' })
        });
        if (response.ok) {
          remoteData = await response.json();
        }
      } catch (err) {
        throw new Error('Gagal menarik data dari Google Sheets. Pastikan Web App disetel Access: Anyone & Deploy Ulang jika perlu.');
      }
    }

    if (!remoteData || remoteData.status !== 'success') {
      throw new Error('Gagal membaca data dari Google Sheets: ' + (remoteData ? remoteData.message : 'Respon tidak valid'));
    }

    let addedLogsCount = 0;
    let addedSiswaCount = 0;
    let addedMateriCount = 0;
    let updatedSettingsCount = 0;

    // 1. Smart Merge Logs
    if (options.logs && Array.isArray(remoteData.logs) && remoteData.logs.length > 0) {
      const currentLogs = Store.getLogs();
      const existingMap = new Map();
      currentLogs.forEach(l => {
        if (l.id) existingMap.set(String(l.id).trim(), true);
        if (l.tanggal && l.waktu && l.kelas) {
          const signature = `${l.tanggal}_${l.waktu}_${l.kelas}`.toLowerCase().trim();
          existingMap.set(signature, true);
        }
      });

      const newLogsToInsert = [];
      remoteData.logs.forEach(rl => {
        const idKey = String(rl.id || '').trim();
        const signatureKey = `${rl.tanggal}_${rl.waktu}_${rl.kelas}`.toLowerCase().trim();

        if (!existingMap.has(idKey) && !existingMap.has(signatureKey)) {
          newLogsToInsert.push(rl);
          addedLogsCount++;
        }
      });

      if (newLogsToInsert.length > 0) {
        const mergedLogs = [...currentLogs, ...newLogsToInsert];
        Store.saveLogs(mergedLogs);
      }
    }

    // 2. Smart Merge Siswa
    if (options.siswa && Array.isArray(remoteData.siswa) && remoteData.siswa.length > 0) {
      const currentSiswa = Store.getSiswa();
      const existingNisnMap = new Map();
      const existingNamaMap = new Map();
      currentSiswa.forEach(s => {
        if (s.nisn) existingNisnMap.set(String(s.nisn).trim(), true);
        if (s.nama && s.kelas) {
          existingNamaMap.set(`${s.nama}_${s.kelas}`.toLowerCase().trim(), true);
        }
      });

      const newSiswaToInsert = [];
      remoteData.siswa.forEach(rs => {
        const nisnKey = String(rs.nisn || '').trim();
        const namaKey = `${rs.nama}_${rs.kelas}`.toLowerCase().trim();

        if ((nisnKey && !existingNisnMap.has(nisnKey)) || (!nisnKey && !existingNamaMap.has(namaKey))) {
          newSiswaToInsert.push(rs);
          addedSiswaCount++;
        }
      });

      if (newSiswaToInsert.length > 0) {
        const mergedSiswa = [...currentSiswa, ...newSiswaToInsert];
        Store.saveSiswa(mergedSiswa);
      }
    }

    // 3. Smart Merge Materi
    if (options.materi && Array.isArray(remoteData.materi) && remoteData.materi.length > 0) {
      const currentMateri = Store.getMateri();
      const existingMateriMap = new Map();
      currentMateri.forEach(m => {
        const key = `${m.mataPelajaran}_${m.topik}_${m.kelas || m.tingkat}`.toLowerCase().trim();
        existingMateriMap.set(key, true);
        if (m.id) existingMateriMap.set(String(m.id).trim(), true);
      });

      const newMateriToInsert = [];
      remoteData.materi.forEach(rm => {
        const matKey = `${rm.mataPelajaran}_${rm.topik}_${rm.kelas || rm.tingkat}`.toLowerCase().trim();
        const matId = String(rm.id || '').trim();

        if (!existingMateriMap.has(matKey) && (!matId || !existingMateriMap.has(matId))) {
          newMateriToInsert.push(rm);
          addedMateriCount++;
        }
      });

      if (newMateriToInsert.length > 0) {
        const mergedMateri = [...currentMateri, ...newMateriToInsert];
        Store.saveMateri(mergedMateri);
      }
    }

    // 4. Smart Merge Pengaturan
    if (options.pengaturan && remoteData.pengaturan && Object.keys(remoteData.pengaturan).length > 0) {
      const currSettings = Store.getSettings();
      const updated = {
        ...currSettings,
        sekolah: remoteData.pengaturan.sekolah || currSettings.sekolah,
        namaGuru: remoteData.pengaturan.namaGuru || currSettings.namaGuru,
        nipGuru: remoteData.pengaturan.nipGuru || currSettings.nipGuru,
        namaKepsek: remoteData.pengaturan.namaKepsek || currSettings.namaKepsek,
        nipKepsek: remoteData.pengaturan.nipKepsek || currSettings.nipKepsek,
        tempatCetak: remoteData.pengaturan.tempatCetak || currSettings.tempatCetak
      };
      Store.saveSettings(updated);
      updatedSettingsCount++;
    }

    return {
      status: 'success',
      addedLogsCount,
      addedSiswaCount,
      addedMateriCount,
      updatedSettingsCount,
      message: `Tarik Data Sukses! Berhasil menambahkan ${addedLogsCount} Jurnal baru, ${addedSiswaCount} Siswa baru, dan ${addedMateriCount} Modul baru.`
    };
  },

  // Generate Multi-User Google Apps Script Template Code for user (Anti-Duplicate / Upsert + Pull Data)
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
  if (action === 'fetch_all') {
    return handleFetchAllData();
  }
  return ContentService.createTextOutput(JSON.stringify({ status: 'active', app: 'JurnalGuru Pro Multi-Teacher API' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function handleFetchAllData() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var result = {
    status: 'success',
    logs: [],
    siswa: [],
    materi: [],
    pengaturan: {}
  };
  
  // 1. Read Master Log Jurnal
  var sheetLog = ss.getSheetByName("Master Log Jurnal");
  if (sheetLog && sheetLog.getLastRow() > 1) {
    var logValues = sheetLog.getRange(2, 1, sheetLog.getLastRow() - 1, 12).getValues();
    logValues.forEach(function(row) {
      if (row[0]) {
        result.logs.push({
          id: String(row[0]).trim(),
          createdAt: row[1] ? String(row[1]) : new Date().toISOString(),
          namaGuru: row[2] || '',
          nipGuru: row[3] || '',
          tanggal: row[4] ? String(row[4]).split('T')[0] : '',
          kategori: row[5] || 'MENGAJAR',
          waktu: row[6] || '',
          durasiMenit: parseInt(row[7] || 0, 10),
          kelas: row[8] || '',
          materi: row[9] || '',
          catatanAbsen: row[10] || '',
          hasil: row[11] || ''
        });
      }
    });
  }

  // 2. Read Master Data Siswa
  var sheetSiswa = ss.getSheetByName("Master Data Siswa");
  if (sheetSiswa && sheetSiswa.getLastRow() > 1) {
    var siswaValues = sheetSiswa.getRange(2, 1, sheetSiswa.getLastRow() - 1, 5).getValues();
    siswaValues.forEach(function(row, idx) {
      if (row[0] || row[1]) {
        result.siswa.push({
          id: 'SISWA-' + (row[0] ? String(row[0]).trim() : (idx + 1)),
          nisn: String(row[0] || '').trim(),
          nama: row[1] || '',
          kelas: row[2] || '',
          jenisKelamin: row[3] || 'L',
          agama: row[4] || 'Islam'
        });
      }
    });
  }

  // 3. Read Master Modul Materi
  var sheetMateri = ss.getSheetByName("Master Modul Materi");
  if (sheetMateri && sheetMateri.getLastRow() > 1) {
    var materiValues = sheetMateri.getRange(2, 1, sheetMateri.getLastRow() - 1, 4).getValues();
    materiValues.forEach(function(row, idx) {
      if (row[0] || row[3]) {
        result.materi.push({
          id: String(row[0] || ('MAT-' + (idx + 1))).trim(),
          kelas: row[1] || '',
          tingkat: row[1] || '',
          mataPelajaran: row[2] || '',
          topik: row[3] || ''
        });
      }
    });
  }

  // 4. Read Master Data Pengaturan
  var sheetPengaturan = ss.getSheetByName("Master Data Pengaturan");
  if (sheetPengaturan && sheetPengaturan.getLastRow() > 1) {
    var pValues = sheetPengaturan.getRange(2, 1, sheetPengaturan.getLastRow() - 1, 3).getValues();
    pValues.forEach(function(row) {
      var key = String(row[1] || '').trim();
      var val = row[2];
      if (key === 'Nama Sekolah') result.pengaturan.sekolah = val;
      else if (key === 'Nama Guru') result.pengaturan.namaGuru = val;
      else if (key === 'NIP Guru') result.pengaturan.nipGuru = val;
      else if (key === 'Nama Kepala Sekolah') result.pengaturan.namaKepsek = val;
      else if (key === 'NIP Kepala Sekolah') result.pengaturan.nipKepsek = val;
      else if (key === 'Tempat Cetak Laporan') result.pengaturan.tempatCetak = val;
    });
  }

  return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    if (data.action === 'fetch_all') {
      return handleFetchAllData();
    }
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
