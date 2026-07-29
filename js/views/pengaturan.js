/* ==========================================================================
   JurnalGuru Pro - View Pengaturan & Google Sheets Sync Guide
   ========================================================================== */

import { Store } from '../store.js';
import { SheetsService } from '../services/sheets.js';

export const PengaturanView = {
  render() {
    this.initSubTabs();
    this.initSettingsForm();
    this.initKegiatanForm();
    this.initBackupRestoreReset();
    this.initGoogleSheetsSyncModal();
    this.renderAppsScriptCodeSnippet();
  },

  initSubTabs() {
    const setView = document.getElementById('view-pengaturan');
    if (!setView) return;

    const tabs = setView.querySelectorAll('.set-tab-btn');
    const panes = setView.querySelectorAll('.tab-pane');

    tabs.forEach(tab => {
      tab.addEventListener('click', (e) => {
        tabs.forEach(t => t.classList.remove('active'));
        panes.forEach(p => p.classList.remove('active'));

        tab.classList.add('active');
        const targetId = tab.getAttribute('data-set-tab');
        const targetPane = document.getElementById(targetId);
        if (targetPane) targetPane.classList.add('active');
      });
    });
  },

  initSettingsForm() {
    const form = document.getElementById('form-pengaturan-umum');
    if (!form) return;

    const settings = Store.getSettings();

    document.getElementById('set-sekolah').value = settings.sekolah || 'SMP NEGERI 13 Penajam Paser Utara';
    document.getElementById('set-nama-guru').value = settings.namaGuru || '';
    document.getElementById('set-nip-guru').value = settings.nipGuru || '';
    document.getElementById('set-nama-kepsek').value = settings.namaKepsek || '';
    document.getElementById('set-nip-kepsek').value = settings.nipKepsek || '';
    document.getElementById('set-tempat-cetak').value = settings.tempatCetak || 'Penajam';
    document.getElementById('set-script-url').value = settings.appsScriptUrl || '';

    form.onsubmit = (e) => {
      e.preventDefault();
      const updated = {
        ...settings,
        sekolah: document.getElementById('set-sekolah').value.trim(),
        namaGuru: document.getElementById('set-nama-guru').value.trim(),
        nipGuru: document.getElementById('set-nip-guru').value.trim(),
        namaKepsek: document.getElementById('set-nama-kepsek').value.trim(),
        nipKepsek: document.getElementById('set-nip-kepsek').value.trim(),
        tempatCetak: document.getElementById('set-tempat-cetak').value.trim(),
        appsScriptUrl: document.getElementById('set-script-url').value.trim()
      };
      Store.saveSettings(updated);
      window.App.showToast('Pengaturan Profil & Database berhasil disimpan!', 'success');
      window.App.updateHeaderStatus();
    };
  },

  initKegiatanForm() {
    this.initKegiatanPagiSubModule();
    this.initIstirahatSubModule();
    this.initPulangSubModule();
  },

  // Utility to generate 5-minute interval time options (06:00 to 16:00)
  generateTimeOptions(selectEl, selectedValue = '07:00') {
    if (!selectEl) return;
    selectEl.innerHTML = '';
    for (let h = 6; h <= 16; h++) {
      for (let m = 0; m < 60; m += 5) {
        if (h === 16 && m > 0) break;
        const hh = String(h).padStart(2, '0');
        const mm = String(m).padStart(2, '0');
        const timeStr = `${hh}:${mm}`;
        const option = document.createElement('option');
        option.value = timeStr;
        option.textContent = timeStr;
        if (timeStr === selectedValue) option.selected = true;
        selectEl.appendChild(option);
      }
    }
  },

  // --- SUB-MODULE 1: KEGIATAN PAGI ---
  initKegiatanPagiSubModule() {
    let activeDay = 'Senin';
    const settings = Store.getSettings();

    // Ensure default pagiConfig
    settings.pagiConfig = settings.pagiConfig || {
      Senin: { jamMulai: '07:00', jamSelesai: '07:45', variasi: ['Upacara bendera hari senin'] },
      Selasa: { jamMulai: '07:00', jamSelesai: '07:45', variasi: ['Keagamaan sholat duha dan senam anak indonesia hebat'] },
      Rabu: { jamMulai: '07:00', jamSelesai: '07:45', variasi: ['Literasi/ Membaca buku umum'] },
      Kamis: { jamMulai: '07:00', jamSelesai: '07:45', variasi: ['Keagamaan sholat duha dan senam anak indonesia hebat'] },
      Jumat: { jamMulai: '07:00', jamSelesai: '07:55', variasi: ['Senam', 'Apel Pramuka', 'Sarapan Sehat', 'Jalan santai', 'Krida/Jumat Bersih'] }
    };

    const dayPills = document.querySelectorAll('#pagi-day-pills .pill-btn');
    const titleEl = document.getElementById('pagi-config-title');
    const dayLabelBtn = document.getElementById('pagi-btn-day-label');
    const jamMulaiInput = document.getElementById('set-pagi-jam-mulai');
    const jamSelesaiInput = document.getElementById('set-pagi-jam-selesai');
    const tagInput = document.getElementById('set-pagi-tag-input');
    const tagsContainer = document.getElementById('pagi-tags-container');
    const btnAddTag = document.getElementById('btn-add-pagi-tag');
    const btnClearTags = document.getElementById('btn-clear-pagi-tags');
    const btnSave = document.getElementById('btn-save-pagi-config');

    const renderDayConfig = () => {
      const cfg = settings.pagiConfig[activeDay] || { jamMulai: '07:00', jamSelesai: '07:45', variasi: [] };
      if (titleEl) titleEl.textContent = `KONFIGURASI HARI ${activeDay.toUpperCase()}`;
      if (dayLabelBtn) dayLabelBtn.textContent = activeDay.toUpperCase();
      this.generateTimeOptions(jamMulaiInput, cfg.jamMulai || '07:00');
      this.generateTimeOptions(jamSelesaiInput, cfg.jamSelesai || '07:45');

      renderTags();
    };

    const renderTags = () => {
      if (!tagsContainer) return;
      tagsContainer.innerHTML = '';
      const cfg = settings.pagiConfig[activeDay] || { variasi: [] };
      
      cfg.variasi.forEach((tag, idx) => {
        const chip = document.createElement('span');
        chip.className = 'tag-chip';
        chip.innerHTML = `${tag} <i class="fas fa-times btn-remove-tag" data-idx="${idx}"></i>`;
        tagsContainer.appendChild(chip);
      });

      tagsContainer.querySelectorAll('.btn-remove-tag').forEach(btn => {
        btn.onclick = () => {
          const idx = parseInt(btn.getAttribute('data-idx'), 10);
          settings.pagiConfig[activeDay].variasi.splice(idx, 1);
          renderTags();
        };
      });
    };

    const addTag = () => {
      if (!tagInput || !tagInput.value.trim()) return;
      const val = tagInput.value.trim();
      settings.pagiConfig[activeDay].variasi.push(val);
      tagInput.value = '';
      renderTags();
    };

    dayPills.forEach(pill => {
      pill.onclick = () => {
        dayPills.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        activeDay = pill.getAttribute('data-pagi-day');
        renderDayConfig();
      };
    });

    if (btnAddTag) btnAddTag.onclick = addTag;
    if (tagInput) {
      tagInput.onkeypress = (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          addTag();
        }
      };
    }

    if (btnClearTags) {
      btnClearTags.onclick = () => {
        settings.pagiConfig[activeDay].variasi = [];
        renderTags();
      };
    }

    if (btnSave) {
      btnSave.onclick = () => {
        settings.pagiConfig[activeDay].jamMulai = jamMulaiInput.value;
        settings.pagiConfig[activeDay].jamSelesai = jamSelesaiInput.value;

        // Also update legacy jadwalPagi array for backwards compatibility
        settings.jadwalPagi = Object.keys(settings.pagiConfig).map(day => ({
          hari: day,
          kegiatan: settings.pagiConfig[day].variasi[0] || 'Kegiatan Pembiasaan Pagi',
          jam: settings.pagiConfig[day].jamMulai
        }));

        Store.saveSettings(settings);
        window.App.showToast(`Konfigurasi Kegiatan Pagi Hari ${activeDay} berhasil disimpan!`, 'success');
      };
    }

    renderDayConfig();
  },

  // --- SUB-MODULE 2: ISTIRAHAT ---
  initIstirahatSubModule() {
    let activeMode = 'biasa'; // 'biasa' | 'jumat'
    const settings = Store.getSettings();

    // Default istConfig
    settings.istConfig = settings.istConfig || {
      biasa: [
        { id: 1, nama: 'Istirahat 1', jamMulai: '09:45', jamSelesai: '10:05', variasi: ['Istirahat KBM'] },
        { id: 2, nama: 'Istirahat 2', jamMulai: '12:20', jamSelesai: '13:00', variasi: ['Istirahat KBM'] }
      ],
      jumat: [
        { id: 1, nama: 'Istirahat 1', jamMulai: '09:40', jamSelesai: '10:00', variasi: ['Istirahat Pagi'] },
        { id: 2, nama: 'Istirahat 2 / Salat Jumat', jamMulai: '11:40', jamSelesai: '13:00', variasi: ['Salat Jumat Bersama & Istirahat'] }
      ]
    };

    const modePills = document.querySelectorAll('#ist-mode-pills .pill-btn');
    const titleEl = document.getElementById('ist-config-title');
    const tbody = document.getElementById('ist-table-tbody');
    const btnAddSlot = document.getElementById('btn-add-ist-slot');

    const renderIstTable = () => {
      if (titleEl) titleEl.textContent = `TAMBAH JAM ISTIRAHAT (HARI ${activeMode === 'biasa' ? 'BIASA' : 'JUMAT'})`;
      if (!tbody) return;

      tbody.innerHTML = '';
      const list = settings.istConfig[activeMode] || [];

      if (list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 1.5rem;" class="text-muted">Belum ada slot jam istirahat untuk ${activeMode === 'biasa' ? 'Hari Biasa' : 'Hari Jumat'}.</td></tr>`;
        return;
      }

      list.forEach((item, idx) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td><strong>${idx + 1}</strong></td>
          <td><strong>${item.nama}</strong></td>
          <td><code>${item.jamMulai} s/d ${item.jamSelesai}</code></td>
          <td>
            <div class="tag-input-wrapper" style="margin-bottom:6px;">
              <input type="text" class="form-control input-ist-tag" data-idx="${idx}" placeholder="Tambah variasi..." style="font-size:0.8rem; padding:4px 8px;">
              <button type="button" class="btn-secondary btn-add-ist-tag" data-idx="${idx}" style="padding:4px 10px; font-size:0.8rem;"><i class="fas fa-plus"></i></button>
            </div>
            <div class="tag-chips-container" style="min-height:24px; margin-top:2px;">
              ${item.variasi.map((t, tidx) => `<span class="tag-chip">${t} <i class="fas fa-times btn-remove-ist-tag" data-idx="${idx}" data-tidx="${tidx}"></i></span>`).join('')}
            </div>
          </td>
          <td>
            <button type="button" class="btn-secondary btn-edit-ist-slot" data-idx="${idx}" title="Edit Nama & Waktu" style="padding:4px 8px; font-size:0.85rem; margin-right:4px;"><i class="fas fa-edit"></i></button>
            <button type="button" class="btn-danger btn-delete-ist-slot" data-idx="${idx}" title="Hapus Slot" style="padding:4px 8px; font-size:0.8rem;"><i class="fas fa-trash"></i></button>
          </td>
        `;
        tbody.appendChild(tr);
      });

      // Attach handlers inside table
      tbody.querySelectorAll('.btn-edit-ist-slot').forEach(btn => {
        btn.onclick = () => {
          const idx = parseInt(btn.getAttribute('data-idx'), 10);
          const item = settings.istConfig[activeMode][idx];
          if (item) {
            document.getElementById('edit-ist-idx').value = idx;
            document.getElementById('edit-ist-nama').value = item.nama;
            this.generateTimeOptions(document.getElementById('edit-ist-jam-mulai'), item.jamMulai);
            this.generateTimeOptions(document.getElementById('edit-ist-jam-selesai'), item.jamSelesai);
            window.App.openModal('modal-edit-ist-slot');
          }
        };
      });

      tbody.querySelectorAll('.btn-add-ist-tag').forEach(btn => {
        btn.onclick = () => {
          const idx = parseInt(btn.getAttribute('data-idx'), 10);
          const input = tbody.querySelector(`.input-ist-tag[data-idx="${idx}"]`);
          if (input && input.value.trim()) {
            settings.istConfig[activeMode][idx].variasi.push(input.value.trim());
            input.value = '';
            Store.saveSettings(settings);
            renderIstTable();
          }
        };
      });

      tbody.querySelectorAll('.input-ist-tag').forEach(input => {
        input.onkeypress = (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            const idx = parseInt(input.getAttribute('data-idx'), 10);
            if (input.value.trim()) {
              settings.istConfig[activeMode][idx].variasi.push(input.value.trim());
              input.value = '';
              Store.saveSettings(settings);
              renderIstTable();
            }
          }
        };
      });

      tbody.querySelectorAll('.btn-remove-ist-tag').forEach(btn => {
        btn.onclick = () => {
          const idx = parseInt(btn.getAttribute('data-idx'), 10);
          const tidx = parseInt(btn.getAttribute('data-tidx'), 10);
          settings.istConfig[activeMode][idx].variasi.splice(tidx, 1);
          Store.saveSettings(settings);
          renderIstTable();
        };
      });

      tbody.querySelectorAll('.btn-delete-ist-slot').forEach(btn => {
        btn.onclick = () => {
          const idx = parseInt(btn.getAttribute('data-idx'), 10);
          if (confirm(`Hapus slot ${settings.istConfig[activeMode][idx].nama}?`)) {
            settings.istConfig[activeMode].splice(idx, 1);
            Store.saveSettings(settings);
            renderIstTable();
          }
        };
      });
    };

    // Modal submit handler for Editing Istirahat Slot
    const formEditIst = document.getElementById('form-edit-ist-slot');
    if (formEditIst) {
      formEditIst.onsubmit = (e) => {
        e.preventDefault();
        const idx = parseInt(document.getElementById('edit-ist-idx').value, 10);
        const newNama = document.getElementById('edit-ist-nama').value.trim();
        const newMulai = document.getElementById('edit-ist-jam-mulai').value;
        const newSelesai = document.getElementById('edit-ist-jam-selesai').value;

        if (settings.istConfig[activeMode] && settings.istConfig[activeMode][idx]) {
          settings.istConfig[activeMode][idx].nama = newNama;
          settings.istConfig[activeMode][idx].jamMulai = newMulai;
          settings.istConfig[activeMode][idx].jamSelesai = newSelesai;
          Store.saveSettings(settings);
          window.App.showToast(`Slot "${newNama}" berhasil diperbarui!`, 'success');
          window.App.closeModal('modal-edit-ist-slot');
          renderIstTable();
        }
      };
    }

    modePills.forEach(pill => {
      pill.onclick = () => {
        modePills.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        activeMode = pill.getAttribute('data-ist-mode');
        renderIstTable();
      };
    });

    if (btnAddSlot) {
      btnAddSlot.onclick = () => {
        const nameInput = document.getElementById('set-ist-name-input');
        const startInput = document.getElementById('set-ist-start-input');
        const endInput = document.getElementById('set-ist-end-input');

        if (!nameInput || !nameInput.value.trim()) {
          window.App.showToast('Masukkan nama istirahat terlebih dahulu!', 'error');
          return;
        }

        const newSlot = {
          id: Date.now(),
          nama: nameInput.value.trim(),
          jamMulai: startInput.value || '09:45',
          jamSelesai: endInput.value || '10:15',
          variasi: ['Waktu Istirahat Siswa & Guru']
        };

        settings.istConfig[activeMode].push(newSlot);

        // Also update legacy jadwalIstirahat
        if (activeMode === 'biasa') {
          settings.jadwalIstirahat.seninKamis.istirahat1 = `${newSlot.jamMulai} - ${newSlot.jamSelesai}`;
        } else {
          settings.jadwalIstirahat.jumat.istirahat2 = `${newSlot.jamMulai} - ${newSlot.jamSelesai}`;
        }

        Store.saveSettings(settings);
        nameInput.value = '';
        window.App.showToast(`Slot ${newSlot.nama} berhasil ditambahkan!`, 'success');
        renderIstTable();
      };
    }

    this.generateTimeOptions(document.getElementById('set-ist-start-input'), '09:45');
    this.generateTimeOptions(document.getElementById('set-ist-end-input'), '10:15');

    renderIstTable();
  },

  // --- SUB-MODULE 3: SEBELUM PULANG ---
  initPulangSubModule() {
    let activeMode = 'biasa'; // 'biasa' | 'jumat'
    const settings = Store.getSettings();

    // Default pulangConfig
    settings.pulangConfig = settings.pulangConfig || {
      biasa: { jamMulai: '15:00', jamSelesai: '15:30', variasi: ['Operasi semut & Kebersihan kelas', 'Refleksi Harian & Doa Bersama'] },
      jumat: { jamMulai: '13:30', jamSelesai: '14:00', variasi: ['Pembersihan area sekolah', 'Doa Bersama Akhir Pekan'] }
    };

    const modePills = document.querySelectorAll('#plg-mode-pills .pill-btn');
    const titleEl = document.getElementById('plg-config-title');
    const modeLabelBtn = document.getElementById('plg-btn-mode-label');
    const jamMulaiInput = document.getElementById('set-plg-jam-mulai');
    const jamSelesaiInput = document.getElementById('set-plg-jam-selesai');
    const tagInput = document.getElementById('set-plg-tag-input');
    const tagsContainer = document.getElementById('plg-tags-container');
    const btnAddTag = document.getElementById('btn-add-plg-tag');
    const btnClearTags = document.getElementById('btn-clear-plg-tags');
    const btnSave = document.getElementById('btn-save-plg-config');

    const renderPulangConfig = () => {
      const cfg = settings.pulangConfig[activeMode] || { jamMulai: '15:00', jamSelesai: '15:30', variasi: [] };
      const modeText = activeMode === 'biasa' ? 'HARI BIASA' : 'HARI JUMAT';
      if (titleEl) titleEl.textContent = `KONFIGURASI PULANG (${modeText})`;
      if (modeLabelBtn) modeLabelBtn.textContent = modeText;
      this.generateTimeOptions(jamMulaiInput, cfg.jamMulai || (activeMode === 'biasa' ? '15:00' : '13:30'));
      this.generateTimeOptions(jamSelesaiInput, cfg.jamSelesai || (activeMode === 'biasa' ? '15:30' : '14:00'));

      renderTags();
    };

    const renderTags = () => {
      if (!tagsContainer) return;
      tagsContainer.innerHTML = '';
      const cfg = settings.pulangConfig[activeMode] || { variasi: [] };

      cfg.variasi.forEach((tag, idx) => {
        const chip = document.createElement('span');
        chip.className = 'tag-chip';
        chip.innerHTML = `${tag} <i class="fas fa-times btn-remove-plg-tag" data-idx="${idx}"></i>`;
        tagsContainer.appendChild(chip);
      });

      tagsContainer.querySelectorAll('.btn-remove-plg-tag').forEach(btn => {
        btn.onclick = () => {
          const idx = parseInt(btn.getAttribute('data-idx'), 10);
          settings.pulangConfig[activeMode].variasi.splice(idx, 1);
          renderTags();
        };
      });
    };

    const addTag = () => {
      if (!tagInput || !tagInput.value.trim()) return;
      const val = tagInput.value.trim();
      settings.pulangConfig[activeMode].variasi.push(val);
      tagInput.value = '';
      renderTags();
    };

    modePills.forEach(pill => {
      pill.onclick = () => {
        modePills.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        activeMode = pill.getAttribute('data-plg-mode');
        renderPulangConfig();
      };
    });

    if (btnAddTag) btnAddTag.onclick = addTag;
    if (tagInput) {
      tagInput.onkeypress = (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          addTag();
        }
      };
    }

    if (btnClearTags) {
      btnClearTags.onclick = () => {
        settings.pulangConfig[activeMode].variasi = [];
        renderTags();
      };
    }

    if (btnSave) {
      btnSave.onclick = () => {
        settings.pulangConfig[activeMode].jamMulai = jamMulaiInput.value;
        settings.pulangConfig[activeMode].jamSelesai = jamSelesaiInput.value;

        // Also update legacy jadwalPulang
        if (activeMode === 'biasa') {
          settings.jadwalPulang.seninKamis = jamSelesaiInput.value;
        } else {
          settings.jadwalPulang.jumat = jamSelesaiInput.value;
        }

        Store.saveSettings(settings);
        window.App.showToast(`Konfigurasi Pulang (${activeMode === 'biasa' ? 'Hari Biasa' : 'Hari Jumat'}) berhasil disimpan!`, 'success');
      };
    }

    renderPulangConfig();
  },

  initGoogleSheetsSyncModal() {
    const btnSyncModal = document.getElementById('btn-open-sync-modal');
    const btnTestConn = document.getElementById('btn-test-sheets-conn');
    const btnPushNow = document.getElementById('btn-push-sheets-now');

    if (btnSyncModal) {
      btnSyncModal.addEventListener('click', () => window.App.openModal('modal-sheets-sync-guide'));
    }

    if (btnTestConn) {
      btnTestConn.onclick = async () => {
        const url = document.getElementById('set-script-url')?.value.trim();
        if (!url) {
          window.App.showToast('Masukkan URL Google Apps Script Web App terlebih dahulu!', 'error');
          return;
        }

        try {
          btnTestConn.disabled = true;
          btnTestConn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menguji...';
          await SheetsService.testConnection(url);
          window.App.showToast('Koneksi ke Google Sheets berhasil dihubungkan!', 'success');
          
          // Save valid URL to settings
          const s = Store.getSettings();
          s.appsScriptUrl = url;
          Store.saveSettings(s);
          window.App.updateHeaderStatus();
        } catch (err) {
          window.App.showToast(err.message, 'error');
        } finally {
          btnTestConn.disabled = false;
          btnTestConn.innerHTML = '<i class="fas fa-plug"></i> Uji Koneksi';
        }
      };
    }

    if (btnPushNow) {
      btnPushNow.onclick = async () => {
        try {
          btnPushNow.disabled = true;
          btnPushNow.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Memindahkan Data...';
          const res = await SheetsService.pushLogsToSheet();
          window.App.showToast(res.message || 'Seluruh data Jurnal, Siswa, Materi, & Pengaturan berhasil disinkronkan ke Google Sheets!', 'success');
        } catch (err) {
          window.App.showToast(err.message, 'error');
        } finally {
          btnPushNow.disabled = false;
          btnPushNow.innerHTML = '<i class="fas fa-sync"></i> Sinkronkan Sekarang';
        }
      };
    }

    const btnDisconnect = document.getElementById('btn-disconnect-sheets');
    if (btnDisconnect) {
      btnDisconnect.onclick = () => {
        if (confirm('Apakah Anda yakin ingin memutuskan database saat ini?\n\nSemua log lokal di perangkat ini akan dibersihkan agar guru lain dapat menghubungkan database pribadinya.')) {
          Store.disconnectDatabase();
          document.getElementById('set-script-url').value = '';
          window.App.showToast('Database pribadi berhasil diputuskan.', 'info');
          window.App.updateHeaderStatus();
          window.App.refreshDashboard();
        }
      };
    }
  },

  renderAppsScriptCodeSnippet() {
    const codeEl = document.getElementById('apps-script-code-snippet');
    const btnCopy = document.getElementById('btn-copy-script-code');

    if (codeEl) {
      const codeText = SheetsService.getAppsScriptTemplateCode();
      codeEl.textContent = codeText;

      if (btnCopy) {
        btnCopy.onclick = () => {
          navigator.clipboard.writeText(codeText);
          window.App.showToast('Kode Google Apps Script berhasil disalin!', 'success');
        };
      }
    }
  },

  // --- SUB-TAB 3: BACKUP, RESTORE & RESET DATA HANDLERS ---
  initBackupRestoreReset() {
    const btnExport = document.getElementById('btn-export-json-backup');
    const fileRestore = document.getElementById('file-restore-json');
    const btnRestore = document.getElementById('btn-import-json-restore');
    const btnResetAll = document.getElementById('btn-reset-all-data');

    // 1. BACKUP HANDLER
    if (btnExport) {
      btnExport.addEventListener('click', () => {
        const chkLogs = document.getElementById('chk-backup-logs')?.checked;
        const chkSiswa = document.getElementById('chk-backup-siswa')?.checked;
        const chkMateri = document.getElementById('chk-backup-materi')?.checked;
        const chkSettings = document.getElementById('chk-backup-settings')?.checked;

        if (!chkLogs && !chkSiswa && !chkMateri && !chkSettings) {
          window.App.showToast('Pilih setidaknya satu item data untuk di-backup!', 'warning');
          return;
        }

        const backupPayload = {
          version: '1.0',
          appName: 'JurnalGuru Pro',
          exportedAt: new Date().toISOString(),
          data: {}
        };

        if (chkLogs) backupPayload.data.logs = Store.getLogs();
        if (chkSiswa) backupPayload.data.siswa = Store.getSiswa();
        if (chkMateri) backupPayload.data.materi = Store.getMateri();
        if (chkSettings) backupPayload.data.settings = Store.getSettings();

        const todayStr = new Date().toISOString().split('T')[0];
        const filename = `Backup_JurnalGuru_SMPN13_${todayStr}.json`;
        const jsonStr = JSON.stringify(backupPayload, null, 2);

        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);

        window.App.showToast('Berkas backup data berhasil diunduh!', 'success');
      });
    }

    // 2. RESTORE HANDLER
    let restoreFilePayload = null;

    if (fileRestore) {
      fileRestore.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) {
          if (btnRestore) btnRestore.disabled = true;
          restoreFilePayload = null;
          return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const parsed = JSON.parse(event.target.result);
            if (!parsed || !parsed.data) {
              throw new Error('Struktur berkas backup JSON tidak valid.');
            }
            restoreFilePayload = parsed;
            if (btnRestore) btnRestore.disabled = false;
            window.App.showToast('Berkas backup siap dipulihkan!', 'info');
          } catch (err) {
            if (btnRestore) btnRestore.disabled = true;
            restoreFilePayload = null;
            window.App.showToast('Gagal membaca berkas JSON: ' + err.message, 'error');
          }
        };
        reader.readAsText(file);
      });
    }

    if (btnRestore) {
      btnRestore.addEventListener('click', () => {
        if (!restoreFilePayload || !restoreFilePayload.data) {
          window.App.showToast('Pilih berkas backup JSON yang valid terlebih dahulu!', 'warning');
          return;
        }

        const d = restoreFilePayload.data;
        const logCount = Array.isArray(d.logs) ? d.logs.length : 0;
        const siswaCount = Array.isArray(d.siswa) ? d.siswa.length : 0;
        const materiCount = Array.isArray(d.materi) ? d.materi.length : 0;
        const hasSettings = Boolean(d.settings);

        const confirmMsg = `Konfirmasi Pemulihan Data:\n`
          + `- Jurnal Harian: ${logCount} data\n`
          + `- Data Siswa: ${siswaCount} data\n`
          + `- Modul Materi: ${materiCount} data\n`
          + `- Pengaturan & Profil: ${hasSettings ? 'Ya' : 'Tidak'}\n\n`
          + `Apakah Anda yakin ingin memulihkan berkas backup ini ke aplikasi?`;

        if (confirm(confirmMsg)) {
          if (Array.isArray(d.logs)) Store.saveLogs(d.logs);
          if (Array.isArray(d.siswa)) Store.saveSiswa(d.siswa);
          if (Array.isArray(d.materi)) Store.saveMateri(d.materi);
          if (d.settings) Store.saveSettings(d.settings);

          window.App.showToast('Data berhasil dipulihkan secara menyeluruh!', 'success');
          if (fileRestore) fileRestore.value = '';
          btnRestore.disabled = true;
          restoreFilePayload = null;
          
          setTimeout(() => {
            window.location.reload();
          }, 1000);
        }
      });
    }

    // 3. RESET ALL DATA HANDLER (POPUP MODAL)
    if (btnResetAll) {
      btnResetAll.onclick = (e) => {
        e.preventDefault();
        const inputVal = document.getElementById('input-confirm-reset-text');
        if (inputVal) inputVal.value = '';
        window.App.openModal('modal-reset-data');
      };

      const modalReset = document.getElementById('modal-reset-data');
      if (modalReset) {
        modalReset.querySelectorAll('.modal-close-btn, .btn-close-modal').forEach(btn => {
          btn.onclick = () => window.App.closeModal('modal-reset-data');
        });
      }

      const formConfirmReset = document.getElementById('form-confirm-reset-data');
      if (formConfirmReset) {
        formConfirmReset.onsubmit = (e) => {
          e.preventDefault();
          const inputVal = document.getElementById('input-confirm-reset-text')?.value || '';
          const cleanText = inputVal.trim().toUpperCase();

          if (cleanText === 'RESET') {
            window.App.closeModal('modal-reset-data');

            // Clear all localStorage keys
            localStorage.removeItem('jurnalguru_settings');
            localStorage.removeItem('jurnalguru_siswa');
            localStorage.removeItem('jurnalguru_materi');
            localStorage.removeItem('jurnalguru_logs');
            localStorage.removeItem('jurnalguru_sheets_sync');
            localStorage.removeItem('jurnalguru_dummy_purged');

            // Re-initialize default Store data
            Store.init();

            window.App.showToast('Seluruh data berhasil di-reset ke kondisi awal pabrik!', 'success');
            setTimeout(() => {
              window.location.reload();
            }, 600);
          } else {
            window.App.showToast('Reset dibatalkan. Kata konfirmasi tidak sesuai (ketik RESET).', 'warning');
          }
        };
      }
    }
  }
};
