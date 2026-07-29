/* ==========================================================================
   JurnalGuru Pro - View Dashboard Analytics & Workload Progress
   ========================================================================== */

import { Store } from '../store.js';

export const DashboardView = {
  render() {
    this.updateWorkloadProgress();
    this.updateStatCards();
    this.renderRecentLogs();
  },

  // Helper to get current week's Monday & Saturday date strings
  getCurrentWeekRange() {
    const today = new Date();
    const day = today.getDay(); // 0: Sun, 1: Mon, ...
    const diffToMon = today.getDate() - day + (day === 0 ? -6 : 1);
    
    const monday = new Date(today.setDate(diffToMon));
    const saturday = new Date(monday);
    saturday.setDate(monday.getDate() + 5);

    const formatYMD = (d) => d.toISOString().split('T')[0];
    return {
      startStr: formatYMD(monday),
      endStr: formatYMD(saturday),
      monday,
      saturday
    };
  },

  updateWorkloadProgress() {
    const range = this.getCurrentWeekRange();
    const workload = Store.getWeeklyWorkload(range.startStr, range.endStr);

    const fillBar = document.getElementById('workload-bar-fill');
    const displayTimeEl = document.getElementById('workload-display-time');
    const badgeEl = document.getElementById('workload-badge-status');
    const weekRangeTextEl = document.getElementById('workload-week-range');

    if (weekRangeTextEl) {
      weekRangeTextEl.textContent = `Periode: ${range.monday.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })} – ${range.saturday.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`;
    }

    if (fillBar) {
      fillBar.style.width = `${workload.percentage}%`;
    }

    if (displayTimeEl) {
      displayTimeEl.textContent = `${workload.displayTime} / 37,5 Jam (${workload.percentage}%)`;
    }

    if (badgeEl) {
      if (workload.isFulfilled) {
        badgeEl.className = 'workload-badge complete';
        badgeEl.innerHTML = '<i class="fas fa-check-circle"></i> BEBAN KERJA LENGKAP (37.5 JAM)';
      } else {
        badgeEl.className = 'workload-badge progress';
        badgeEl.innerHTML = `<i class="fas fa-spinner fa-spin"></i> DALAM PROSES (${workload.percentage}%)`;
      }
    }
  },

  updateStatCards() {
    const logs = Store.getLogs();
    const siswa = Store.getSiswa();
    const materi = Store.getMateri();

    const mengajarLogs = logs.filter(l => l.kategori === 'MENGAJAR');
    
    const cntMengajarEl = document.getElementById('stat-cnt-mengajar');
    const cntSiswaEl = document.getElementById('stat-cnt-siswa');
    const cntMateriEl = document.getElementById('stat-cnt-materi');
    const cntTotalLogEl = document.getElementById('stat-cnt-total-log');

    if (cntMengajarEl) cntMengajarEl.textContent = `${mengajarLogs.length} Sesi`;
    if (cntSiswaEl) cntSiswaEl.textContent = `${siswa.length} Siswa`;
    if (cntMateriEl) cntMateriEl.textContent = `${materi.length} Modul`;
    if (cntTotalLogEl) cntTotalLogEl.textContent = `${logs.length} Entri`;
  },

  renderRecentLogs() {
    const tbody = document.getElementById('recent-logs-tbody');
    if (!tbody) return;

    const logs = Store.getLogs().slice(0, 5); // 5 newest
    tbody.innerHTML = '';

    if (logs.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 1.5rem;" class="text-muted">Belum ada jurnal yang diinput. Gunakan form di Beranda untuk memasukkan data.</td></tr>';
      return;
    }

    logs.forEach((log, index) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${index + 1}</td>
        <td><strong>${window.App ? window.App.formatDateID(log.tanggal) : log.tanggal}</strong></td>
        <td><span class="badge" style="background:#F1F5F9; padding:3px 8px; border-radius:4px; font-weight:600;">${log.kategori}</span></td>
        <td>${log.materi || log.kegiatan || '-'}</td>
        <td><small class="text-muted">${log.hasil || '-'}</small></td>
      `;
      tbody.appendChild(tr);
    });
  }
};
