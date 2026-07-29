/* ==========================================================================
   JurnalGuru Pro - View Beranda Quick Entry Forms
   ========================================================================== */

import { Store } from '../store.js';
import { SheetsService } from '../services/sheets.js';

// --- Saving Loader Helpers ---
function showSavingLoader(submitBtn) {
  const overlay = document.getElementById('saving-overlay');
  if (overlay) { overlay.style.display = 'flex'; overlay.setAttribute('aria-hidden', 'false'); }
  if (submitBtn) { submitBtn.disabled = true; submitBtn._originalHTML = submitBtn.innerHTML; submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menyimpan...'; }
}

function hideSavingLoader(submitBtn) {
  const overlay = document.getElementById('saving-overlay');
  if (overlay) { overlay.style.display = 'none'; overlay.setAttribute('aria-hidden', 'true'); }
  if (submitBtn) { submitBtn.disabled = false; if (submitBtn._originalHTML) { submitBtn.innerHTML = submitBtn._originalHTML; } }
}

export const BerandaView = {
  activeRollCall: {}, // { nisn: 'H' | 'S' | 'I' | 'A' }

  render() {
    this.updateConnectionGuardBanner();
    this.updateHeaderWorkloadSummary();
    this.setTodayDates();
    this.initQuickTabs();
    this.initPagiTab();
    this.initMengajarTab();
    this.initTidakMengajarTab();
    this.initIstirahatTab();
    this.initPulangTab();
    this.initPreviewTable();
    this.initEditModal();
    this.renderTodayPreviewTable();
  },

  updateHeaderWorkloadSummary() {
    const today = new Date();
    const day = today.getDay();
    const diffToMon = today.getDate() - day + (day === 0 ? -6 : 1);
    
    const monday = new Date(today.setDate(diffToMon));
    const saturday = new Date(monday);
    saturday.setDate(monday.getDate() + 5);

    const formatYMD = (d) => d.toISOString().split('T')[0];
    const startStr = formatYMD(monday);
    const endStr = formatYMD(saturday);

    const workload = Store.getWeeklyWorkload(startStr, endStr);
    const textEl = document.getElementById('beranda-jam-terisi-text');
    if (textEl) {
      textEl.textContent = `${workload.displayTime} / 37,5 Jam (${workload.percentage}%)`;
    }
  },

  // --- PREVIEW JURNAL HARIAN DI BERANDA ---
  initPreviewTable() {
    const datePicker = document.getElementById('beranda-preview-date');
    const btnBatchDelete = document.getElementById('btn-delete-selected-beranda-logs');
    const chkSelectAll = document.getElementById('chk-select-all-beranda-logs');
    if (!datePicker) return;

    // Set default date filter to TODAY
    const todayStr = new Date().toISOString().split('T')[0];
    datePicker.value = todayStr;

    datePicker.addEventListener('change', () => {
      this.renderTodayPreviewTable();
    });

    if (chkSelectAll) {
      chkSelectAll.addEventListener('change', (e) => {
        const isChecked = e.target.checked;
        const rowChks = document.querySelectorAll('.chk-select-beranda-log');
        rowChks.forEach(chk => chk.checked = isChecked);
        this.updateBatchDeleteButtonState();
      });
    }

    if (btnBatchDelete) {
      btnBatchDelete.onclick = () => {
        const checkedChks = document.querySelectorAll('.chk-select-beranda-log:checked');
        const count = checkedChks.length;
        if (count === 0) return;

        if (confirm(`Apakah Anda yakin ingin menghapus ${count} entri jurnal yang ditandai?`)) {
          checkedChks.forEach(chk => {
            const id = chk.getAttribute('data-id');
            if (id) Store.deleteLog(id);
          });

          window.App.showToast(`${count} entri jurnal berhasil dihapus.`, 'success');
          window.App.refreshDashboard();
          this.updateHeaderWorkloadSummary();
          this.renderTodayPreviewTable();
        }
      };
    }
  },

  updateBatchDeleteButtonState() {
    const btnBatchDelete = document.getElementById('btn-delete-selected-beranda-logs');
    const cntText = document.getElementById('cnt-selected-beranda-logs');
    const chkSelectAll = document.getElementById('chk-select-all-beranda-logs');
    
    const allChks = document.querySelectorAll('.chk-select-beranda-log');
    const checkedChks = document.querySelectorAll('.chk-select-beranda-log:checked');
    const count = checkedChks.length;

    if (cntText) cntText.textContent = count;

    if (btnBatchDelete) {
      if (count > 0) {
        btnBatchDelete.style.display = 'inline-flex';
        btnBatchDelete.disabled = false;
      } else {
        btnBatchDelete.style.display = 'none';
        btnBatchDelete.disabled = true;
      }
    }

    if (chkSelectAll) {
      chkSelectAll.checked = (allChks.length > 0 && count === allChks.length);
    }
  },

  initEditModal() {
    const formEdit = document.getElementById('form-edit-jurnal-beranda');
    if (!formEdit) return;

    formEdit.onsubmit = (e) => {
      e.preventDefault();
      
      const id = document.getElementById('edit-jurnal-id').value;
      const tanggal = document.getElementById('edit-jurnal-tanggal').value;
      const jamMulai = document.getElementById('edit-jurnal-jam-mulai').value;
      const jamSelesai = document.getElementById('edit-jurnal-jam-selesai').value;
      const kegiatan = document.getElementById('edit-jurnal-kegiatan').value;
      const hasil = document.getElementById('edit-jurnal-hasil').value;

      const logs = Store.getLogs();
      const logIndex = logs.findIndex(l => l.id === id);
      if (logIndex > -1) {
        const log = logs[logIndex];
        log.tanggal = tanggal;
        log.waktu = `${jamMulai} - ${jamSelesai}`;
        
        // Calculate new durasi
        const [sh, sm] = jamMulai.split(':').map(Number);
        const [eh, em] = jamSelesai.split(':').map(Number);
        let durasi = (eh * 60 + em) - (sh * 60 + sm);
        if (durasi <= 0) durasi = log.durasiMenit; // fallback
        log.durasiMenit = durasi;

        if (log.kategori === 'MENGAJAR') {
          log.materi = kegiatan;
        } else {
          log.kegiatan = kegiatan;
        }
        log.hasil = hasil;

        Store.saveLogs(logs);
        window.App.showToast('Entri Jurnal berhasil diperbarui!', 'success');
        window.App.closeModal('modal-edit-jurnal-beranda');
        window.App.refreshDashboard();
        this.updateHeaderWorkloadSummary();
        this.renderTodayPreviewTable();
      }
    };
  },

  renderTodayPreviewTable() {
    const datePicker = document.getElementById('beranda-preview-date');
    const tbody = document.getElementById('beranda-preview-tbody');
    const chkSelectAll = document.getElementById('chk-select-all-beranda-logs');
    if (!tbody) return;

    if (chkSelectAll) chkSelectAll.checked = false;

    const selectedDateStr = datePicker ? datePicker.value : new Date().toISOString().split('T')[0];
    const logs = Store.getLogs();
    const dayLogs = logs.filter(l => l.tanggal === selectedDateStr);

    tbody.innerHTML = '';
    this.updateBatchDeleteButtonState();

    if (dayLogs.length === 0) {
      const formattedDate = window.App ? window.App.formatDateID(selectedDateStr) : selectedDateStr;
      tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding: 2rem;" class="text-muted">Belum ada jurnal yang diinput untuk tanggal <strong>${formattedDate}</strong>. Gunakan form di atas untuk menambah entri.</td></tr>`;
      return;
    }

    dayLogs.forEach((l, idx) => {
      const tr = document.createElement('tr');
      const formattedDate = window.App ? window.App.formatDateID(l.tanggal) : l.tanggal;
      const rawActivity = l.materi || l.kegiatan || '-';
      const activityText = rawActivity.includes(' - ') ? rawActivity.split(' - ').slice(1).join(' - ') : rawActivity;
      const resultText = l.hasil ? `<br><small class="text-muted">${l.hasil}</small>` : '';
      const durasiText = `${l.durasiMenit || 0} Menit`;

      let badgeBg = '#F1F5F9';
      let badgeColor = '#334155';
      let displayKategori = l.kategori;
      if (l.kategori === 'PAGI') { badgeBg = '#CCFBF1'; badgeColor = '#0F766E'; displayKategori = 'Rutinitas Pagi'; }
      else if (l.kategori === 'MENGAJAR') { badgeBg = '#DBEAFE'; badgeColor = '#1E40AF'; displayKategori = 'MENGAJAR'; }
      else if (l.kategori === 'ISTIRAHAT') { badgeBg = '#FEF3C7'; badgeColor = '#92400E'; displayKategori = 'ISTIRAHAT'; }
      else { badgeBg = '#E0E7FF'; badgeColor = '#3730A3'; displayKategori = 'Kegiatan Mandiri'; }

      tr.innerHTML = `
        <td style="text-align:center;">
          <input type="checkbox" class="chk-select-beranda-log" data-id="${l.id}">
        </td>
        <td>${idx + 1}</td>
        <td><strong>${formattedDate}</strong></td>
        <td><code>${l.waktu}</code></td>
        <td><span class="badge" style="background:${badgeBg}; color:${badgeColor}; font-weight:700;">${displayKategori}</span></td>
        <td><strong>${activityText}</strong>${resultText}</td>
        <td><strong>${durasiText}</strong></td>
        <td style="text-align:center;">
          <button type="button" class="btn-secondary btn-edit-beranda-log" data-id="${l.id}" title="Edit Entri" style="padding:4px 8px; font-size:0.8rem; margin-right:4px; margin-bottom: 2px;"><i class="fas fa-edit"></i></button>
          <button type="button" class="btn-danger btn-delete-beranda-log" data-id="${l.id}" title="Hapus Entri" style="padding:4px 8px; font-size:0.8rem; margin-bottom: 2px;"><i class="fas fa-trash"></i></button>
        </td>
      `;
      tbody.appendChild(tr);
    });

    tbody.querySelectorAll('.chk-select-beranda-log').forEach(chk => {
      chk.addEventListener('change', () => {
        this.updateBatchDeleteButtonState();
      });
    });

    tbody.querySelectorAll('.btn-edit-beranda-log').forEach(btn => {
      btn.onclick = () => {
        const id = btn.getAttribute('data-id');
        const log = Store.getLogs().find(l => l.id === id);
        if (log) {
          document.getElementById('edit-jurnal-id').value = log.id;
          document.getElementById('edit-jurnal-tanggal').value = log.tanggal;
          
          let sh = '07:00', eh = '08:00';
          if (log.waktu && log.waktu.includes('-')) {
             const parts = log.waktu.split('-');
             sh = parts[0].trim();
             eh = parts[1].trim();
          }
          this.generateTimeOptions(document.getElementById('edit-jurnal-jam-mulai'), sh);
          this.generateTimeOptions(document.getElementById('edit-jurnal-jam-selesai'), eh);
          
          document.getElementById('edit-jurnal-kegiatan').value = log.materi || log.kegiatan || '';
          document.getElementById('edit-jurnal-hasil').value = log.hasil || '';

          window.App.openModal('modal-edit-jurnal-beranda');
        }
      };
    });

    tbody.querySelectorAll('.btn-delete-beranda-log').forEach(btn => {
      btn.onclick = () => {
        const id = btn.getAttribute('data-id');
        if (confirm('Hapus entri jurnal ini?')) {
          Store.deleteLog(id);
          window.App.showToast('Entri log berhasil dihapus.', 'success');
          window.App.refreshDashboard();
          this.updateHeaderWorkloadSummary();
          this.renderTodayPreviewTable();
        }
      };
    });
  },

  setTodayDates() {
    const todayStr = new Date().toISOString().split('T')[0];
    ['pagi-tanggal', 'mengajar-tanggal', 'tm-tanggal', 'ist-tanggal', 'plg-tanggal'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = todayStr;
    });
  },

  checkConnectionGuard() {
    if (!Store.isConnectedToSheets()) {
      window.App.showToast('Silakan hubungkan link Google Sheets Anda terlebih dahulu agar jurnal dapat tersimpan!', 'warning');
      window.App.openModal('modal-sheets-sync-guide');
      return false;
    }
    return true;
  },

  updateConnectionGuardBanner() {
    const banner = document.getElementById('connection-guard-banner');
    if (!banner) return;
    if (!Store.isConnectedToSheets()) {
      banner.style.display = 'flex';
    } else {
      banner.style.display = 'none';
    }
  },

  // Tab Switcher inside Beranda (Tampilan Awal Langsung Menampilkan Kegiatan Pagi)
  initQuickTabs() {
    const berandaView = document.getElementById('view-beranda');
    if (!berandaView) return;

    const tabs = berandaView.querySelectorAll('.quick-tab-btn');
    const panes = berandaView.querySelectorAll('.tab-pane');

    tabs.forEach(tab => {
      tab.addEventListener('click', (e) => {
        tabs.forEach(t => t.classList.remove('active'));
        panes.forEach(p => p.classList.remove('active'));

        tab.classList.add('active');
        const targetId = tab.getAttribute('data-tab');
        const pane = document.getElementById(targetId);
        if (pane) pane.classList.add('active');
      });
    });

    // Paksa tab 1. PAGI menjadi aktif secara bawaan saat halaman diawal dibuka
    const pagiBtn = berandaView.querySelector('[data-tab="tab-pagi"]');
    const pagiPane = document.getElementById('tab-pagi');
    if (pagiBtn && pagiPane) {
      tabs.forEach(t => t.classList.remove('active'));
      panes.forEach(p => p.classList.remove('active'));
      pagiBtn.classList.add('active');
      pagiPane.classList.add('active');
    }
  },

  // Utility to generate 5-minute interval time options (06:00 to 16:00)
  generateTimeOptions(selectEl, selectedValue = '07:00') {
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

  // --- TAB 1: PAGI ---
  initPagiTab() {
    const form = document.getElementById('form-pagi');
    if (!form) return;

    const tglInput = document.getElementById('pagi-tanggal');
    const startSelect = document.getElementById('pagi-waktu-mulai');
    const endSelect = document.getElementById('pagi-waktu-selesai');
    const kegiatanSelect = document.getElementById('pagi-kegiatan');
    const hasilInput = document.getElementById('pagi-hasil');

    if (startSelect) this.generateTimeOptions(startSelect, '07:00');
    if (endSelect) this.generateTimeOptions(endSelect, '07:45');

    const updatePagiOptionsForSelectedDate = () => {
      const dateVal = tglInput.value ? new Date(tglInput.value) : new Date();
      const dayIndex = dateVal.getDay(); // 0: Sun, 1: Mon, ...
      const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
      const currentDay = dayNames[dayIndex] || 'Senin';

      const settings = Store.getSettings();
      const pagiConfig = settings.pagiConfig || {
        Senin: { jamMulai: '07:00', jamSelesai: '07:45', variasi: ['Upacara bendera hari senin'] },
        Selasa: { jamMulai: '07:00', jamSelesai: '07:45', variasi: ['Keagamaan sholat duha dan senam anak indonesia hebat'] },
        Rabu: { jamMulai: '07:00', jamSelesai: '07:45', variasi: ['Literasi/ Membaca buku umum'] },
        Kamis: { jamMulai: '07:00', jamSelesai: '07:45', variasi: ['Keagamaan sholat duha dan senam anak indonesia hebat'] },
        Jumat: { jamMulai: '07:00', jamSelesai: '07:55', variasi: ['Senam', 'Apel Pramuka', 'Sarapan Sehat', 'Jalan santai', 'Krida/Jumat Bersih'] }
      };

      const dayConfig = pagiConfig[currentDay] || {
        jamMulai: '07:00',
        jamSelesai: '07:45',
        variasi: [`Kegiatan Pembiasaan Pagi ${currentDay}`]
      };

      if (dayConfig.jamMulai && startSelect) {
        startSelect.value = dayConfig.jamMulai;
      }
      if (dayConfig.jamSelesai && endSelect) {
        endSelect.value = dayConfig.jamSelesai;
      }

      kegiatanSelect.innerHTML = '';
      const variasiList = (dayConfig.variasi && dayConfig.variasi.length > 0)
        ? dayConfig.variasi
        : [`Kegiatan Rutin Hari ${currentDay}`];

      variasiList.forEach(v => {
        const opt = document.createElement('option');
        opt.value = v;
        opt.textContent = `${currentDay}: ${v}`;
        kegiatanSelect.appendChild(opt);
      });

      updateHasilPagi();
    };

    const updateHasilPagi = () => {
      const selectedKegiatan = kegiatanSelect.value || 'Kegiatan Pembiasaan Pagi';
      hasilInput.value = `Terlaksana dengan baik kegiatan pembiasaan pagi ${selectedKegiatan}.`;
      hasilInput.classList.add('autofill-flash');
      setTimeout(() => hasilInput.classList.remove('autofill-flash'), 800);
    };

    if (tglInput) tglInput.addEventListener('change', updatePagiOptionsForSelectedDate);
    kegiatanSelect.addEventListener('change', updateHasilPagi);

    updatePagiOptionsForSelectedDate();

    form.onsubmit = async (e) => {
      e.preventDefault();
      if (!this.checkConnectionGuard()) return;

      const submitBtn = form.querySelector('[type="submit"]');
      showSavingLoader(submitBtn);
      try {
        const startVal = startSelect.value;
        const endVal = endSelect.value;
        const [sh, sm] = startVal.split(':').map(Number);
        const [eh, em] = endVal.split(':').map(Number);
        let durasiMenit = (eh * 60 + em) - (sh * 60 + sm);
        if (durasiMenit <= 0) durasiMenit = 40;

        const log = {
          tanggal: tglInput.value,
          waktu: `${startVal} - ${endVal}`,
          durasiMenit: durasiMenit,
          kategori: 'PAGI',
          kegiatan: kegiatanSelect.value,
          hasil: hasilInput.value
        };
        const addedLog = Store.addLog(log);
        try {
          await SheetsService.pushSingleLogToSheet(addedLog);
          window.App.showToast('Jurnal Pagi berhasil disimpan & terkirim ke Google Sheets!', 'success');
        } catch (err) {
          window.App.showToast('Tersimpan secara lokal. Gagal kirim ke Sheets: ' + err.message, 'warning');
        }
        window.App.refreshDashboard();
        this.updateHeaderWorkloadSummary();
        this.renderTodayPreviewTable();
      } finally {
        hideSavingLoader(submitBtn);
      }
    };
  },

  // --- TAB 2: MENGAJAR (Roll Call & KBM) ---
  initMengajarTab() {
    const form = document.getElementById('form-mengajar');
    if (!form) return;

    const kelasHidden = document.getElementById('mengajar-kelas'); // hidden input
    const kelasChipsContainer = document.getElementById('mengajar-kelas-chips');
    const materiSelect = document.getElementById('mengajar-materi');
    const startSelect = document.getElementById('mengajar-jam-mulai');
    const endSelect = document.getElementById('mengajar-jam-selesai');
    const catatanTextarea = document.getElementById('mengajar-catatan');

    // Populate 5-minute interval time pickers
    if (startSelect) this.generateTimeOptions(startSelect, '07:30');
    if (endSelect) this.generateTimeOptions(endSelect, '09:00');

    let selectedKelasSet = new Set(); // multi-select state

    const updateHiddenAndMateri = () => {
      const selected = [...selectedKelasSet];
      kelasHidden.value = selected.join(', ');

      // Load materi based on first selected class tier
      materiSelect.innerHTML = '<option value="">-- Pilih Materi Pembelajaran --</option>';
      if (selected.length > 0) {
        const classTier = selected[0].replace(/^kelas\s*/i, '').charAt(0);
        const materiList = Store.getMateri(classTier);
        materiList.forEach(m => {
          const opt = document.createElement('option');
          opt.value = m.topik;
          opt.textContent = `[${m.mataPelajaran}] ${m.topik}`;
          materiSelect.appendChild(opt);
        });
      } else {
        materiSelect.innerHTML = '<option value="">-- Pilih Kelas Terlebih Dahulu --</option>';
      }

      // Merge roll-call for all selected classes
      const allSiswa = Store.getSiswa();
      const relevantSiswa = selected.length > 0
        ? allSiswa.filter(s => selected.some(k => s.kelas.toLowerCase() === k.toLowerCase() || `Kelas ${s.kelas}`.toLowerCase() === k.toLowerCase()))
        : [];
      this.renderRollCallGridFromList(relevantSiswa, selected.join(', '));
    };

    // Render kelas chips
    const renderKelasChips = () => {
      if (!kelasChipsContainer) return;
      const allSiswa = Store.getSiswa();
      const uniqueKelas = [...new Set(allSiswa.map(s => s.kelas))].sort();

      if (uniqueKelas.length === 0) {
        kelasChipsContainer.innerHTML = '<p class="text-muted" style="font-size:0.82rem;">Belum ada data siswa. Tambahkan di Master Data Siswa.</p>';
        return;
      }

      kelasChipsContainer.innerHTML = '';
      uniqueKelas.forEach(k => {
        const displayName = /^kelas/i.test(k) ? k : `Kelas ${k}`;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'kelas-chip-btn';
        btn.dataset.kelas = displayName;
        btn.innerHTML = `<i class="fas fa-check chip-check"></i> ${displayName}`;
        btn.addEventListener('click', () => {
          if (selectedKelasSet.has(displayName)) {
            selectedKelasSet.delete(displayName);
            btn.classList.remove('selected');
          } else {
            selectedKelasSet.add(displayName);
            btn.classList.add('selected');
          }
          updateHiddenAndMateri();
        });
        kelasChipsContainer.appendChild(btn);
      });
    };
    renderKelasChips();

    form.onsubmit = async (e) => {
      e.preventDefault();
      if (!this.checkConnectionGuard()) return;

      const selectedKelas = [...selectedKelasSet];
      if (selectedKelas.length === 0) {
        window.App.showToast('Silakan pilih kelas terlebih dahulu!', 'error');
        return;
      }

      const submitBtn = form.querySelector('[type="submit"]');
      showSavingLoader(submitBtn);
      try {
        const startVal = startSelect.value;
        const endVal = endSelect.value;
        const [sh, sm] = startVal.split(':').map(Number);
        const [eh, em] = endVal.split(':').map(Number);
        let durasiMenit = (eh * 60 + em) - (sh * 60 + sm);
        if (durasiMenit <= 0) durasiMenit = 80;

        // Generate Auto Attendance Summary
        const absentList = [];
        Object.entries(this.activeRollCall).forEach(([nisn, status]) => {
          if (status !== 'H') {
            const s = Store.getSiswa().find(x => x.nisn === nisn);
            if (s) absentList.push(`${s.nama} (${status})`);
          }
        });

        const autoSummary = absentList.length > 0
          ? `KBM berjalan kondusif. Catatan Siswa Tidak Hadir: ${absentList.join(', ')}.`
          : 'KBM berjalan lancar dan tertib, seluruh siswa hadir lengkap (100%).';

        const kelasLabel = selectedKelas.join(', ');
        const log = {
          tanggal: document.getElementById('mengajar-tanggal').value,
          waktu: `${startVal} - ${endVal}`,
          durasiMenit: durasiMenit,
          kategori: 'MENGAJAR',
          kelas: kelasLabel,
          materi: materiSelect.value || 'Materi KBM Harian',
          catatanAbsen: absentList.join(', ') || 'Semua Hadir (Nihil)',
          hasil: (catatanTextarea.value ? catatanTextarea.value + ' | ' : '') + autoSummary,
          rollCallData: { ...this.activeRollCall }
        };

        const addedLog = Store.addLog(log);
        try {
          await SheetsService.pushSingleLogToSheet(addedLog);
          window.App.showToast(`Jurnal Mengajar (${kelasLabel}) berhasil disimpan & terkirim!`, 'success');
        } catch (err) {
          window.App.showToast('Tersimpan secara lokal. Gagal kirim ke Sheets: ' + err.message, 'warning');
        }
        window.App.refreshDashboard();
        this.updateHeaderWorkloadSummary();
        this.renderTodayPreviewTable();

        // Reset selection
        selectedKelasSet.clear();
        kelasChipsContainer.querySelectorAll('.kelas-chip-btn').forEach(b => b.classList.remove('selected'));
        kelasHidden.value = '';
        materiSelect.innerHTML = '<option value="">-- Pilih Kelas Terlebih Dahulu --</option>';
        this.renderRollCallGrid('');
      } finally {
        hideSavingLoader(submitBtn);
      }
    };
  },

  // Render Roll-Call from explicit siswa list (multi-class)
  renderRollCallGridFromList(siswaList, kelasLabel) {
    const gridEl = document.getElementById('roll-call-grid');
    if (!gridEl) return;

    gridEl.innerHTML = '';
    this.activeRollCall = {};

    if (!siswaList || siswaList.length === 0) {
      gridEl.innerHTML = `<p class="text-muted" style="grid-column: 1/-1; text-align: center; padding: 2rem;">${kelasLabel ? `Belum ada data siswa untuk ${kelasLabel}.` : 'Pilih kelas di atas untuk menampilkan daftar siswa.'}</p>`;
      this.updateRollCallStats();
      return;
    }

    siswaList.forEach(s => {
      this.activeRollCall[s.nisn] = 'H';
      const card = document.createElement('div');
      card.className = 'student-card';
      card.innerHTML = `
        <div class="student-info">
          <span class="student-name">${s.nama}</span>
          <span class="student-nisn">NISN: ${s.nisn} — ${s.kelas} (${s.jenisKelamin})</span>
        </div>
        <div class="status-toggle-group" data-nisn="${s.nisn}">
          <button type="button" class="status-pill-btn active" data-status="H" title="Hadir">H</button>
          <button type="button" class="status-pill-btn" data-status="S" title="Sakit">S</button>
          <button type="button" class="status-pill-btn" data-status="I" title="Izin">I</button>
          <button type="button" class="status-pill-btn" data-status="A" title="Alpha">A</button>
        </div>
      `;
      const pills = card.querySelectorAll('.status-pill-btn');
      pills.forEach(pill => {
        pill.addEventListener('click', () => {
          pills.forEach(p => p.classList.remove('active'));
          pill.classList.add('active');
          this.activeRollCall[s.nisn] = pill.getAttribute('data-status');
          this.updateRollCallStats();
        });
      });
      gridEl.appendChild(card);
    });
    this.updateRollCallStats();
  },

  // Render Interactive Roll-Call Grid
  renderRollCallGrid(kelas) {
    const gridEl = document.getElementById('roll-call-grid');
    if (!gridEl) return;

    gridEl.innerHTML = '';
    this.activeRollCall = {};

    if (!kelas) {
      gridEl.innerHTML = '<p class="text-muted" style="grid-column: 1/-1; text-align: center; padding: 2rem;">Pilih kelas di atas untuk menampilkan daftar siswa.</p>';
      this.updateRollCallStats();
      return;
    }

    const siswaList = Store.getSiswa(kelas);
    if (siswaList.length === 0) {
      gridEl.innerHTML = `<p class="text-muted" style="grid-column: 1/-1; text-align: center; padding: 2rem;">Belum ada data siswa untuk Kelas ${kelas}.</p>`;
      this.updateRollCallStats();
      return;
    }

    siswaList.forEach(s => {
      this.activeRollCall[s.nisn] = 'H'; // Default Hadir

      const card = document.createElement('div');
      card.className = 'student-card';
      card.innerHTML = `
        <div class="student-info">
          <span class="student-name">${s.nama}</span>
          <span class="student-nisn">NISN: ${s.nisn} (${s.jenisKelamin})</span>
        </div>
        <div class="status-toggle-group" data-nisn="${s.nisn}">
          <button type="button" class="status-pill-btn active" data-status="H" title="Hadir">H</button>
          <button type="button" class="status-pill-btn" data-status="S" title="Sakit">S</button>
          <button type="button" class="status-pill-btn" data-status="I" title="Izin">I</button>
          <button type="button" class="status-pill-btn" data-status="A" title="Alpha">A</button>
        </div>
      `;

      // Status Pill Click Handler
      const pills = card.querySelectorAll('.status-pill-btn');
      pills.forEach(pill => {
        pill.addEventListener('click', () => {
          pills.forEach(p => p.classList.remove('active'));
          pill.classList.add('active');
          const newStatus = pill.getAttribute('data-status');
          this.activeRollCall[s.nisn] = newStatus;
          this.updateRollCallStats();
        });
      });

      gridEl.appendChild(card);
    });

    this.updateRollCallStats();
  },

  updateRollCallStats() {
    let h = 0, s = 0, i = 0, a = 0;
    Object.values(this.activeRollCall).forEach(st => {
      if (st === 'H') h++;
      else if (st === 'S') s++;
      else if (st === 'I') i++;
      else if (st === 'A') a++;
    });

    document.getElementById('stat-cnt-h').textContent = `H: ${h}`;
    document.getElementById('stat-cnt-s').textContent = `S: ${s}`;
    document.getElementById('stat-cnt-i').textContent = `I: ${i}`;
    document.getElementById('stat-cnt-a').textContent = `A: ${a}`;
  },

  // --- TAB 3: TIDAK MENGAJAR ---
  initTidakMengajarTab() {
    const form = document.getElementById('form-tidak-mengajar');
    if (!form) return;

    const startSelect = document.getElementById('tm-jam-mulai');
    const endSelect = document.getElementById('tm-jam-selesai');
    const uraianInput = document.getElementById('tm-uraian');
    const hasilInput = document.getElementById('tm-hasil');

    this.generateTimeOptions(startSelect, '08:00');
    this.generateTimeOptions(endSelect, '09:30');

    const updateHasilTM = () => {
      const txt = uraianInput.value || 'kegiatan tugas tambahan';
      hasilInput.value = `Terlaksana dengan baik melakukan ${txt}.`;
    };

    uraianInput.addEventListener('input', updateHasilTM);
    updateHasilTM();

    form.onsubmit = async (e) => {
      e.preventDefault();
      if (!this.checkConnectionGuard()) return;

      const submitBtn = form.querySelector('[type="submit"]');
      showSavingLoader(submitBtn);
      try {
        const [sh, sm] = startSelect.value.split(':').map(Number);
        const [eh, em] = endSelect.value.split(':').map(Number);
        let durasiMinutes = (eh * 60 + em) - (sh * 60 + sm);
        if (durasiMinutes <= 0) durasiMinutes = 60;

        const log = {
          tanggal: document.getElementById('tm-tanggal').value,
          waktu: `${startSelect.value} - ${endSelect.value}`,
          durasiMenit: durasiMinutes,
          kategori: 'TIDAK MENGAJAR',
          kegiatan: uraianInput.value,
          hasil: hasilInput.value
        };
        const addedLog = Store.addLog(log);
        try {
          await SheetsService.pushSingleLogToSheet(addedLog);
          window.App.showToast('Jurnal Tugas Tambahan berhasil disimpan & terkirim ke Google Sheets!', 'success');
        } catch (err) {
          window.App.showToast('Tersimpan secara lokal. Gagal kirim ke Sheets: ' + err.message, 'warning');
        }
        window.App.refreshDashboard();
        this.updateHeaderWorkloadSummary();
        this.renderTodayPreviewTable();
      } finally {
        hideSavingLoader(submitBtn);
      }
    };
  },

  // --- TAB 4: ISTIRAHAT ---
  initIstirahatTab() {
    const form = document.getElementById('form-istirahat');
    if (!form) return;

    const tglInput = document.getElementById('ist-tanggal');
    const slotSelect = document.getElementById('ist-select-slot');
    const waktuInput = document.getElementById('ist-waktu');
    const kegiatanSelect = document.getElementById('ist-kegiatan-select');
    const hasilInput = document.getElementById('ist-hasil');

    let currentSlots = [];

    const updateIstirahatSlotsForSelectedDate = () => {
      const dateVal = tglInput.value ? new Date(tglInput.value) : new Date();
      const day = dateVal.getDay(); // 5 = Friday
      const settings = Store.getSettings();

      const istConfig = settings.istConfig || {
        biasa: [
          { id: 1, nama: 'Istirahat 1', jamMulai: '09:45', jamSelesai: '10:05', variasi: ['Istirahat KBM'] },
          { id: 2, nama: 'Istirahat 2', jamMulai: '12:20', jamSelesai: '13:00', variasi: ['Istirahat KBM'] }
        ],
        jumat: [
          { id: 1, nama: 'Istirahat 1', jamMulai: '09:40', jamSelesai: '10:00', variasi: ['Istirahat Pagi'] },
          { id: 2, nama: 'Istirahat 2 / Salat Jumat', jamMulai: '11:40', jamSelesai: '13:00', variasi: ['Salat Jumat Bersama & Istirahat'] }
        ]
      };

      currentSlots = (day === 5 ? istConfig.jumat : istConfig.biasa) || [];
      if (currentSlots.length === 0) {
        currentSlots = [{ id: 1, nama: 'Istirahat 1', jamMulai: '09:45', jamSelesai: '10:05', variasi: ['Istirahat KBM'] }];
      }

      if (slotSelect) {
        slotSelect.innerHTML = '';
        currentSlots.forEach((s, idx) => {
          const opt = document.createElement('option');
          opt.value = idx;
          opt.textContent = `${s.nama} (${s.jamMulai} s/d ${s.jamSelesai})`;
          slotSelect.appendChild(opt);
        });
      }

      onSlotChange();
    };

    const onSlotChange = () => {
      const idx = parseInt(slotSelect?.value || '0', 10);
      const selectedSlot = currentSlots[idx] || currentSlots[0];
      
      if (selectedSlot) {
        if (waktuInput) waktuInput.value = `${selectedSlot.jamMulai} - ${selectedSlot.jamSelesai}`;
        
        if (kegiatanSelect) {
          kegiatanSelect.innerHTML = '';
          const variasiList = (selectedSlot.variasi && selectedSlot.variasi.length > 0)
            ? selectedSlot.variasi
            : ['Istirahat KBM'];
          
          variasiList.forEach(v => {
            const opt = document.createElement('option');
            opt.value = v;
            opt.textContent = v;
            kegiatanSelect.appendChild(opt);
          });
        }
      }

      updateHasilIstirahat();
    };

    const updateHasilIstirahat = () => {
      const selectedKegiatan = kegiatanSelect?.value || 'Istirahat KBM';
      if (hasilInput) {
        hasilInput.value = `Jeda aktivitas KBM dan melakukan ${selectedKegiatan}.`;
      }
    };

    if (tglInput) tglInput.addEventListener('change', updateIstirahatSlotsForSelectedDate);
    if (slotSelect) slotSelect.addEventListener('change', onSlotChange);
    if (kegiatanSelect) kegiatanSelect.addEventListener('change', updateHasilIstirahat);

    updateIstirahatSlotsForSelectedDate();

    form.onsubmit = async (e) => {
      e.preventDefault();
      if (!this.checkConnectionGuard()) return;

      const submitBtn = form.querySelector('[type="submit"]');
      showSavingLoader(submitBtn);
      try {
        const waktuText = waktuInput ? waktuInput.value : '09:45 - 10:05';
        const [startVal, endVal] = waktuText.split(' - ');
        const [sh, sm] = (startVal || '09:45').split(':').map(Number);
        const [eh, em] = (endVal || '10:05').split(':').map(Number);
        let durasiMenit = (eh * 60 + em) - (sh * 60 + sm);
        if (durasiMenit <= 0) durasiMenit = 20;

        const log = {
          tanggal: tglInput.value,
          waktu: waktuText,
          durasiMenit: durasiMenit,
          kategori: 'ISTIRAHAT',
          kegiatan: kegiatanSelect ? kegiatanSelect.value : 'Istirahat KBM',
          hasil: hasilInput ? hasilInput.value : 'Istirahat KBM'
        };
        const addedLog = Store.addLog(log);
        try {
          await SheetsService.pushSingleLogToSheet(addedLog);
          window.App.showToast('Jurnal Istirahat berhasil disimpan & terkirim ke Google Sheets!', 'success');
        } catch (err) {
          window.App.showToast('Tersimpan secara lokal. Gagal kirim ke Sheets: ' + err.message, 'warning');
        }
        window.App.refreshDashboard();
        this.updateHeaderWorkloadSummary();
        this.renderTodayPreviewTable();
      } finally {
        hideSavingLoader(submitBtn);
      }
    };
  },

  // --- TAB 5: JAM PULANG ---
  initPulangTab() {
    const form = document.getElementById('form-pulang');
    if (!form) return;

    const tglInput = document.getElementById('plg-tanggal');
    const startSelect = document.getElementById('plg-waktu-mulai');
    const endSelect = document.getElementById('plg-waktu-selesai');
    const opsiSelect = document.getElementById('plg-opsi');
    const hasilInput = document.getElementById('plg-hasil');

    if (startSelect) this.generateTimeOptions(startSelect, '15:00');
    if (endSelect) this.generateTimeOptions(endSelect, '15:30');

    const updatePulangOptionsForSelectedDate = () => {
      const dateVal = tglInput.value ? new Date(tglInput.value) : new Date();
      const day = dateVal.getDay(); // 5 = Friday
      const settings = Store.getSettings();

      const pulangConfig = settings.pulangConfig || {
        biasa: { jamMulai: '15:00', jamSelesai: '15:30', variasi: ['Operasi semut & Kebersihan kelas', 'Refleksi Harian & Doa Bersama'] },
        jumat: { jamMulai: '13:30', jamSelesai: '14:00', variasi: ['Pembersihan area sekolah', 'Doa Bersama Akhir Pekan'] }
      };

      const modeConfig = day === 5 ? pulangConfig.jumat : pulangConfig.biasa;

      if (modeConfig.jamMulai && startSelect) {
        startSelect.value = modeConfig.jamMulai;
      }
      if (modeConfig.jamSelesai && endSelect) {
        endSelect.value = modeConfig.jamSelesai;
      }

      if (opsiSelect) {
        opsiSelect.innerHTML = '';
        const variasiList = (modeConfig.variasi && modeConfig.variasi.length > 0)
          ? modeConfig.variasi
          : ['Persiapan Pulang & Doa Bersama'];

        variasiList.forEach(v => {
          const opt = document.createElement('option');
          opt.value = v;
          opt.textContent = v;
          opsiSelect.appendChild(opt);
        });
      }

      updateHasilPulang();
    };

    const updateHasilPulang = () => {
      const selectedOpsi = opsiSelect?.value || 'Refleksi & Doa Bersama';
      if (hasilInput) {
        hasilInput.value = `Terlaksana dengan baik kegiatan ${selectedOpsi} sebelum jam pulang sekolah.`;
      }
    };

    if (tglInput) tglInput.addEventListener('change', updatePulangOptionsForSelectedDate);
    if (opsiSelect) opsiSelect.addEventListener('change', updateHasilPulang);

    updatePulangOptionsForSelectedDate();

    form.onsubmit = async (e) => {
      e.preventDefault();
      if (!this.checkConnectionGuard()) return;

      const submitBtn = form.querySelector('[type="submit"]');
      showSavingLoader(submitBtn);
      try {
        const startVal = startSelect ? startSelect.value : '15:00';
        const endVal = endSelect ? endSelect.value : '15:30';
        const [sh, sm] = startVal.split(':').map(Number);
        const [eh, em] = endVal.split(':').map(Number);
        let durasiMenit = (eh * 60 + em) - (sh * 60 + sm);
        if (durasiMenit <= 0) durasiMenit = 30;

        const log = {
          tanggal: tglInput.value,
          waktu: `${startVal} - ${endVal}`,
          durasiMenit: durasiMenit,
          kategori: 'JAM PULANG',
          kegiatan: opsiSelect ? opsiSelect.value : 'Kegiatan Sebelum Pulang',
          hasil: hasilInput ? hasilInput.value : 'Persiapan Pulang'
        };
        const addedLog = Store.addLog(log);
        try {
          await SheetsService.pushSingleLogToSheet(addedLog);
          window.App.showToast('Jurnal Jam Pulang berhasil disimpan & terkirim ke Google Sheets!', 'success');
        } catch (err) {
          window.App.showToast('Tersimpan secara lokal. Gagal kirim ke Sheets: ' + err.message, 'warning');
        }
        window.App.refreshDashboard();
        this.updateHeaderWorkloadSummary();
        this.renderTodayPreviewTable();
      } finally {
        hideSavingLoader(submitBtn);
      }
    };
  }
};
