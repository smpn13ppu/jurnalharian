/* ==========================================================================
   JurnalGuru Pro - Data Store & LocalStorage Manager
   ========================================================================== */

const STORAGE_KEYS = {
  SETTINGS: 'jurnalguru_settings',
  SISWA: 'jurnalguru_siswa',
  MATERI: 'jurnalguru_materi',
  LOGS: 'jurnalguru_logs',
  GOOGLE_SYNC: 'jurnalguru_sheets_sync'
};

// Seed Data Defaults for SMPN 13 Penajam Paser Utara (Tanpa Data Dummy)
const DEFAULT_PAGI_CONFIG = {
  Senin: { jamMulai: '07:00', jamSelesai: '07:45', variasi: ['Upacara bendera hari senin'] },
  Selasa: { jamMulai: '07:00', jamSelesai: '07:45', variasi: ['Keagamaan sholat duha dan senam anak indonesia hebat'] },
  Rabu: { jamMulai: '07:00', jamSelesai: '07:45', variasi: ['Literasi/ Membaca buku umum'] },
  Kamis: { jamMulai: '07:00', jamSelesai: '07:45', variasi: ['Keagamaan sholat duha dan senam anak indonesia hebat'] },
  Jumat: { jamMulai: '07:00', jamSelesai: '07:55', variasi: ['Senam', 'Apel Pramuka', 'Sarapan Sehat', 'Jalan santai', 'Krida/Jumat Bersih'] }
};

const SEED_SETTINGS = {
  sekolah: '',
  namaGuru: '',
  nipGuru: '',
  namaKepsek: '',
  nipKepsek: '',
  tempatCetak: 'Penajam',
  pagiConfig: DEFAULT_PAGI_CONFIG,
  jadwalPagi: [
    { hari: 'Senin', kegiatan: 'Upacara bendera hari senin', jam: '07:00' },
    { hari: 'Selasa', kegiatan: 'Keagamaan sholat duha dan senam anak indonesia hebat', jam: '07:00' },
    { hari: 'Rabu', kegiatan: 'Literasi/ Membaca buku umum', jam: '07:00' },
    { hari: 'Kamis', kegiatan: 'Keagamaan sholat duha dan senam anak indonesia hebat', jam: '07:00' },
    { hari: 'Jumat', kegiatan: 'Senam', jam: '07:00' }
  ],
  jadwalIstirahat: {
    seninKamis: { istirahat1: '10:00 - 10:20', istirahat2: '12:20 - 13:00' },
    jumat: { istirahat1: '09:40 - 10:00', istirahat2: '11:40 - 13:00' }
  },
  jadwalPulang: {
    seninKamis: '15:30',
    jumat: '14:00'
  },
  googleSheetUrl: '',
  appsScriptUrl: ''
};

const SEED_MATERI = [];
const SEED_SISWA = [];

export const Store = {
  // Init Store & Clear Dummy
  init() {
    if (!localStorage.getItem('jurnalguru_dummy_purged')) {
      localStorage.setItem(STORAGE_KEYS.SISWA, JSON.stringify([]));
      localStorage.setItem(STORAGE_KEYS.MATERI, JSON.stringify([]));
      localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify([]));
      localStorage.setItem('jurnalguru_dummy_purged', 'true');
    }

    if (!localStorage.getItem(STORAGE_KEYS.SETTINGS)) {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(SEED_SETTINGS));
    } else {
      // Force update pagiConfig to latest default if not custom saved
      try {
        const savedSettings = JSON.parse(localStorage.getItem(STORAGE_KEYS.SETTINGS) || '{}');
        savedSettings.pagiConfig = DEFAULT_PAGI_CONFIG;
        localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(savedSettings));
      } catch (e) {}
    }
    if (!localStorage.getItem(STORAGE_KEYS.MATERI)) {
      localStorage.setItem(STORAGE_KEYS.MATERI, JSON.stringify([]));
    }
    if (!localStorage.getItem(STORAGE_KEYS.SISWA)) {
      localStorage.setItem(STORAGE_KEYS.SISWA, JSON.stringify([]));
    }
    if (!localStorage.getItem(STORAGE_KEYS.LOGS)) {
      localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify([]));
    }
  },

  // Settings CRUD
  getSettings() {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.SETTINGS)) || SEED_SETTINGS;
  },
  saveSettings(settings) {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  },

  // Siswa CRUD
  getSiswa(kelasFilter = '') {
    const list = JSON.parse(localStorage.getItem(STORAGE_KEYS.SISWA)) || [];
    // Sanitize & normalize class names (remove duplicate 'KELAS ' prefix)
    list.forEach(s => {
      if (s.kelas) {
        s.kelas = String(s.kelas).trim().replace(/^kelas\s+/i, '').trim();
      }
    });
    if (!kelasFilter) return list;
    const cleanFilter = String(kelasFilter).trim().replace(/^kelas\s+/i, '').trim();
    return list.filter(s => s.kelas.toLowerCase() === cleanFilter.toLowerCase() || s.kelas === kelasFilter);
  },
  saveSiswa(siswaArray) {
    if (Array.isArray(siswaArray)) {
      siswaArray.forEach(s => {
        if (s.kelas) {
          s.kelas = String(s.kelas).trim().replace(/^kelas\s+/i, '').trim();
        }
      });
    }
    localStorage.setItem(STORAGE_KEYS.SISWA, JSON.stringify(siswaArray));
  },
  addSiswa(siswa) {
    const list = this.getSiswa();
    // Check duplicate NISN
    if (list.some(s => s.nisn === siswa.nisn)) {
      throw new Error(`NISN ${siswa.nisn} sudah terdaftar dalam database!`);
    }
    list.push(siswa);
    this.saveSiswa(list);
  },
  deleteSiswa(nisn) {
    const list = this.getSiswa().filter(s => s.nisn !== nisn);
    this.saveSiswa(list);
  },

  // Materi CRUD
  getMateri(kelasFilter = '') {
    const list = JSON.parse(localStorage.getItem(STORAGE_KEYS.MATERI)) || [];
    if (!kelasFilter) return list;
    return list.filter(m => m.kelas === kelasFilter);
  },
  saveMateri(materiArray) {
    localStorage.setItem(STORAGE_KEYS.MATERI, JSON.stringify(materiArray));
  },
  addMateri(materi) {
    const list = this.getMateri();
    materi.id = 'M-' + Date.now();
    list.push(materi);
    this.saveMateri(list);
  },
  deleteMateri(id) {
    const list = this.getMateri().filter(m => m.id !== id);
    this.saveMateri(list);
  },

  // Logs (Jurnal & Beban Kerja) CRUD
  getLogs() {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.LOGS)) || [];
  },
  saveLogs(logsArray) {
    localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(logsArray));
  },
  addLog(logEntry) {
    const settings = this.getSettings();
    const logs = this.getLogs();
    logEntry.id = 'LOG-' + Date.now();
    logEntry.createdAt = new Date().toISOString();
    logEntry.namaGuru = settings.namaGuru || 'Guru SMPN 13 PPU';
    logEntry.nipGuru = settings.nipGuru || '-';
    logs.unshift(logEntry); // add to top
    this.saveLogs(logs);
    return logEntry;
  },
  deleteLog(id) {
    const logs = this.getLogs().filter(l => l.id !== id);
    this.saveLogs(logs);
  },

  isConnectedToSheets() {
    const settings = this.getSettings();
    return Boolean(settings.appsScriptUrl && settings.appsScriptUrl.trim().length > 10);
  },

  disconnectDatabase() {
    const settings = this.getSettings();
    settings.appsScriptUrl = '';
    this.saveSettings(settings);
    // Kosongkan sesi log lokal agar tidak tampil di perangkat saat berganti database guru
    this.saveLogs([]);
  },

  // Compute Weekly Workload (37.5 Hours Target)
  getWeeklyWorkload(startDateStr, endDateStr) {
    const logs = this.getLogs();

    const filteredLogs = logs.filter(l => {
      if (!l.tanggal) return false;
      let ok = true;
      if (startDateStr) ok = ok && (l.tanggal >= startDateStr);
      if (endDateStr) ok = ok && (l.tanggal <= endDateStr);
      return ok;
    });

    let totalMinutes = 0;
    filteredLogs.forEach(l => {
      totalMinutes += parseInt(l.durasiMenit || 0, 10);
    });

    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;

    const targetMinutes = 37.5 * 60; // 2250 minutes
    const percentage = Math.min(100, Math.round((totalMinutes / targetMinutes) * 100));

    return {
      totalMinutes,
      displayTime: `${hours} Jam ${mins} Menit`,
      percentage,
      isFulfilled: totalMinutes >= targetMinutes,
      logsCount: filteredLogs.length,
      filteredLogs
    };
  }
};
