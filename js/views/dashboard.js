/* ==========================================================================
   JurnalGuru Pro - View Dashboard Analytics & Workload Progress
   ========================================================================== */

import { Store } from '../store.js';

export const DashboardView = {
  render() {
    this.updateWorkloadProgress();
    this.updateStatCards();
    this.renderKelasAttendance();
    this.renderSiswaAttentionList();
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

  // Helper to extract roll-call map from log entry
  getRollCallFromLog(log) {
    if (log.rollCallData && typeof log.rollCallData === 'object') {
      return log.rollCallData;
    }
    if (log.absensi && typeof log.absensi === 'object') {
      return log.absensi;
    }
    return null;
  },

  renderKelasAttendance() {
    const container = document.getElementById('dashboard-kelas-attendance-container');
    if (!container) return;

    const allSiswa = Store.getSiswa();
    const allLogs = Store.getLogs();
    const mengajarLogs = allLogs.filter(l => l.kategori === 'MENGAJAR');

    // Ambil daftar kelas unik dari siswa & log
    const setKelas = new Set(allSiswa.map(s => s.kelas).filter(Boolean));
    const kelasList = Array.from(setKelas).sort();

    if (kelasList.length === 0 || mengajarLogs.length === 0) {
      container.innerHTML = `
        <div style="text-align:center; padding: 1.5rem 1rem;" class="text-muted">
          <i class="fas fa-chart-pie" style="font-size:1.8rem; color:#CBD5E1; margin-bottom:0.4rem; display:block;"></i>
          Belum ada data presensi KBM yang tercatat.
        </div>
      `;
      return;
    }

    // Peta lookup siswa berdasarkan NISN dan ID
    const siswaByNisn = new Map();
    const siswaById = new Map();
    allSiswa.forEach(s => {
      if (s.nisn) siswaByNisn.set(String(s.nisn), s);
      if (s.id) siswaById.set(String(s.id), s);
    });

    const kelasData = {};
    kelasList.forEach(k => {
      kelasData[k] = { totalH: 0, totalS: 0, totalI: 0, totalA: 0, totalCount: 0 };
    });

    let totalRecorded = 0;

    mengajarLogs.forEach(log => {
      const rc = this.getRollCallFromLog(log);
      if (!rc) return;

      Object.entries(rc).forEach(([key, status]) => {
        const sObj = siswaByNisn.get(String(key)) || siswaById.get(String(key));
        if (sObj && kelasData[sObj.kelas]) {
          kelasData[sObj.kelas].totalCount++;
          totalRecorded++;
          if (status === 'H') kelasData[sObj.kelas].totalH++;
          else if (status === 'S') kelasData[sObj.kelas].totalS++;
          else if (status === 'I') kelasData[sObj.kelas].totalI++;
          else if (status === 'A') kelasData[sObj.kelas].totalA++;
        }
      });
    });

    if (totalRecorded === 0) {
      container.innerHTML = `
        <div style="text-align:center; padding: 1.5rem 1rem;" class="text-muted">
          <i class="fas fa-chart-pie" style="font-size:1.8rem; color:#CBD5E1; margin-bottom:0.4rem; display:block;"></i>
          Belum ada rincian presensi KBM yang tercatat.
        </div>
      `;
      return;
    }

    let html = '';
    kelasList.forEach(k => {
      const d = kelasData[k];
      if (d.totalCount === 0) return; // Lewati kelas tanpa log presensi

      const pct = Math.round((d.totalH / d.totalCount) * 100);
      let badgeBg = '#10B981'; // Green
      if (pct < 80) badgeBg = '#EF4444'; // Red
      else if (pct < 90) badgeBg = '#F59E0B'; // Amber

      html += `
        <div style="background: #F8FAFC; border: 1px solid #E2E8F0; padding: 0.85rem 1rem; border-radius: 12px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.4rem;">
            <span style="font-weight:700; color:#1E293B; font-size:0.92rem;"><i class="fas fa-users" style="color:#0F766E; margin-right:6px;"></i> Kelas ${k}</span>
            <span style="background:${badgeBg}; color:#fff; font-size:0.75rem; font-weight:800; padding:2px 8px; border-radius:10px;">${pct}% Hadir</span>
          </div>
          <div style="background:#E2E8F0; height:8px; border-radius:4px; overflow:hidden; margin-bottom:0.5rem;">
            <div style="background:${badgeBg}; width:${pct}%; height:100%; transition: width 0.4s ease;"></div>
          </div>
          <div style="display:flex; justify-content:space-between; font-size:0.75rem; color:#64748B;">
            <span><strong style="color:#059669;">H:</strong> ${d.totalH}</span>
            <span><strong style="color:#D97706;">S:</strong> ${d.totalS}</span>
            <span><strong style="color:#2563EB;">I:</strong> ${d.totalI}</span>
            <span><strong style="color:#DC2626;">A:</strong> ${d.totalA}</span>
            <span><strong>Total Presensi:</strong> ${d.totalCount}</span>
          </div>
        </div>
      `;
    });

    container.innerHTML = html || `
      <div style="text-align:center; padding: 1.5rem 1rem;" class="text-muted">
        <i class="fas fa-chart-pie" style="font-size:1.8rem; color:#CBD5E1; margin-bottom:0.4rem; display:block;"></i>
        Belum ada data presensi KBM yang tercatat.
      </div>
    `;
  },

  renderSiswaAttentionList() {
    const container = document.getElementById('dashboard-siswa-attention-container');
    if (!container) return;

    const allSiswa = Store.getSiswa();
    const allLogs = Store.getLogs();
    const mengajarLogs = allLogs.filter(l => l.kategori === 'MENGAJAR');

    if (allSiswa.length === 0 || mengajarLogs.length === 0) {
      container.innerHTML = `
        <div style="text-align:center; padding: 1.5rem 1rem;" class="text-muted">
          <i class="fas fa-user-check" style="font-size:1.8rem; color:#10B981; margin-bottom:0.4rem; display:block;"></i>
          Seluruh siswa terpantau hadir tertib.
        </div>
      `;
      return;
    }

    // Map rekap per siswa
    const statsMap = new Map();
    allSiswa.forEach(s => {
      statsMap.set(String(s.nisn || s.id), {
        siswa: s,
        h: 0,
        s: 0,
        i: 0,
        a: 0
      });
    });

    let totalRecorded = 0;

    mengajarLogs.forEach(log => {
      const rc = this.getRollCallFromLog(log);
      if (!rc) return;

      Object.entries(rc).forEach(([key, status]) => {
        let stat = statsMap.get(String(key));
        if (!stat) {
          for (const item of statsMap.values()) {
            if (String(item.siswa.nisn) === String(key) || String(item.siswa.id) === String(key)) {
              stat = item;
              break;
            }
          }
        }

        if (stat) {
          totalRecorded++;
          if (status === 'H') stat.h++;
          else if (status === 'S') stat.s++;
          else if (status === 'I') stat.i++;
          else if (status === 'A') stat.a++;
        }
      });
    });

    if (totalRecorded === 0) {
      container.innerHTML = `
        <div style="text-align:center; padding: 1.5rem 1rem;" class="text-muted">
          <i class="fas fa-user-check" style="font-size:1.8rem; color:#10B981; margin-bottom:0.4rem; display:block;"></i>
          Seluruh siswa terpantau hadir tertib.
        </div>
      `;
      return;
    }

    // Buat daftar siswa yang memiliki ketidakhadiran (S + I + A > 0)
    const listSiswaAbsen = [];
    for (const item of statsMap.values()) {
      const totalTidakTurun = item.s + item.i + item.a;
      const totalSesi = item.h + totalTidakTurun;
      const pctHadir = totalSesi > 0 ? Math.round((item.h / totalSesi) * 100) : 100;

      if (totalTidakTurun > 0) {
        listSiswaAbsen.push({
          siswa: item.siswa,
          h: item.h,
          s: item.s,
          i: item.i,
          a: item.a,
          totalTidakTurun,
          pctHadir
        });
      }
    }

    // Urutkan terbanyak tidak turun
    listSiswaAbsen.sort((a, b) => {
      if (b.totalTidakTurun !== a.totalTidakTurun) {
        return b.totalTidakTurun - a.totalTidakTurun;
      }
      return b.a - a.a;
    });

    const top5 = listSiswaAbsen.slice(0, 5);

    if (top5.length === 0) {
      container.innerHTML = `
        <div style="text-align:center; padding: 1.5rem 1rem;" class="text-muted">
          <i class="fas fa-check-circle" style="font-size:1.8rem; color:#10B981; margin-bottom:0.4rem; display:block;"></i>
          <span style="color:#059669; font-weight:700;">100% Kehadiran Siswa!</span><br>Tidak ada catatan ketidakhadiran siswa.
        </div>
      `;
      return;
    }

    let html = `<div style="display:flex; flex-direction:column; gap:0.75rem;">`;

    top5.forEach((item, idx) => {
      const s = item.siswa;
      const rankColor = idx === 0 ? '#DC2626' : (idx === 1 ? '#EA580C' : '#D97706');

      html += `
        <div style="background:#FFF5F5; border:1px solid #FCA5A5; padding:0.75rem 1rem; border-radius:12px; display:flex; align-items:center; justify-content:space-between; gap:10px;">
          <div style="display:flex; align-items:center; gap:10px;">
            <div style="width:28px; height:28px; background:${rankColor}; color:#fff; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:800; font-size:0.8rem; flex-shrink:0;">
              ${idx + 1}
            </div>
            <div>
              <h5 style="margin:0; font-size:0.9rem; color:#1F2937; font-weight:700;">${s.nama}</h5>
              <span style="font-size:0.75rem; color:#6B7280;">Kelas ${s.kelas || '-'} ${s.nisn ? '| NISN: ' + s.nisn : ''}</span>
            </div>
          </div>
          <div style="text-align:right;">
            <div style="color:#DC2626; font-weight:800; font-size:0.85rem;">${item.totalTidakTurun}x Tidak Hadir</div>
            <div style="font-size:0.72rem; color:#4B5563;">
              ${item.s > 0 ? `<span style="color:#D97706; font-weight:700;">${item.s}S</span> ` : ''}
              ${item.i > 0 ? `<span style="color:#2563EB; font-weight:700;">${item.i}I</span> ` : ''}
              ${item.a > 0 ? `<span style="color:#DC2626; font-weight:800;">${item.a}A</span> ` : ''}
              <span style="margin-left:4px; font-weight:600;">(${item.pctHadir}% Hadir)</span>
            </div>
          </div>
        </div>
      `;
    });

    html += `</div>`;
    container.innerHTML = html;
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
