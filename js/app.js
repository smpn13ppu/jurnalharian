/* ==========================================================================
   JurnalGuru Pro - Main Application Controller & Router
   ========================================================================== */

import { Store } from './store.js';
import { BerandaView } from './views/beranda.js';
import { DashboardView } from './views/dashboard.js';
import { SiswaView } from './views/siswa.js';
import { MateriView } from './views/materi.js';
import { JurnalMengajarView } from './views/jurnal_mengajar.js';
import { RekapAbsenView } from './views/rekap_absen.js';
import { JurnalMingguanView } from './views/jurnal_mingguan.js';
import { PengaturanView } from './views/pengaturan.js';

window.App = {
  currentView: 'beranda',

  // Format Tanggal Indonesia (dd/mm/yyyy)
  formatDateID(dateStr) {
    if (!dateStr) return '-';
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      const [year, month, day] = dateStr.split('-');
      return `${day}/${month}/${year}`;
    }
    try {
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) {
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return `${day}/${month}/${year}`;
      }
    } catch (e) {}
    return dateStr;
  },

  init() {
    console.log('Initializing JurnalGuru Pro (SMPN 13 PPU)...');
    Store.init();

    this.initDrawerNav();
    this.initHeader();
    this.initModalListeners();

    // Render Apps Script Code Snippet on startup
    try { PengaturanView.renderAppsScriptCodeSnippet(); } catch (e) {}

    // Render default view
    this.switchView('beranda');

    // Update Google Sheets Connection Badge
    this.updateHeaderStatus();

    // Auto-prompt sync modal if opened on a new device/browser (disconnected state)
    if (!Store.isConnectedToSheets()) {
      setTimeout(() => {
        this.openModal('modal-sheets-sync-guide');
        this.showToast('Perangkat/Browser Baru Terdeteksi: Wajib menghubungkan URL Google Sheets sebelum input data.', 'warning');
      }, 600);
    }
  },

  // Switch View Router
  switchView(viewId) {
    this.currentView = viewId;

    // Always close drawer first when switching views
    this.closeDrawer();

    // Update Menu Items Active Class
    document.querySelectorAll('.menu-item').forEach(btn => {
      btn.classList.remove('active');
      if (btn.getAttribute('data-view') === viewId) {
        btn.classList.add('active');
      }
    });

    // Toggle View Sections
    document.querySelectorAll('.view-section').forEach(sec => {
      sec.classList.remove('active');
    });

    const targetSection = document.getElementById(`view-${viewId}`);
    if (targetSection) {
      targetSection.classList.add('active');
    }

    // Trigger View Render Logic safely
    try {
      switch (viewId) {
        case 'beranda':
          BerandaView.render();
          break;
        case 'dashboard':
          DashboardView.render();
          break;
        case 'siswa':
          SiswaView.render();
          break;
        case 'materi':
          MateriView.render();
          break;
        case 'jurnal-mengajar':
          JurnalMengajarView.render();
          break;
        case 'rekap-absen':
          RekapAbsenView.render();
          break;
        case 'jurnal-mingguan':
          JurnalMingguanView.render();
          break;
        case 'pengaturan':
          PengaturanView.render();
          break;
        default:
          BerandaView.render();
      }
    } catch (err) {
      console.error('Error rendering view:', viewId, err);
    }
  },

  refreshDashboard() {
    DashboardView.render();
  },

  // Drawer Sidebar Controls
  initDrawerNav() {
    const burgerBtn = document.getElementById('burger-menu-btn');
    const closeBtn = document.getElementById('drawer-close-btn');
    const overlay = document.getElementById('drawer-overlay');

    if (burgerBtn) burgerBtn.onclick = () => this.openDrawer();
    if (closeBtn) closeBtn.onclick = () => this.closeDrawer();
    if (overlay) {
      overlay.onclick = (e) => {
        if (e.target === overlay) this.closeDrawer();
      };
    }

    // Menu Item click handler
    document.querySelectorAll('.menu-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const targetView = item.getAttribute('data-view');
        if (targetView) this.switchView(targetView);
      });
    });
  },

  openDrawer() {
    const overlay = document.getElementById('drawer-overlay');
    if (overlay) overlay.classList.add('open');
  },

  closeDrawer() {
    const overlay = document.getElementById('drawer-overlay');
    if (overlay) overlay.classList.remove('open');
  },

  // Header System Info
  initHeader() {
    const datePill = document.getElementById('header-date-pill');
    if (datePill) {
      const todayStr = new Date().toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
      datePill.innerHTML = `<i class="far fa-calendar-alt"></i> ${todayStr}`;
    }

    const switchBtn = document.getElementById('btn-header-switch-db');
    if (switchBtn) {
      switchBtn.onclick = () => {
        if (confirm('Apakah Anda yakin ingin memutuskan database saat ini?\n\nSemua sesi log lokal di perangkat ini akan dibersihkan agar guru lain dapat memasukkan link database Google Sheets pribadinya.')) {
          Store.disconnectDatabase();
          this.showToast('Database berhasil diputuskan. Silakan masukkan link database pribadi guru baru.', 'info');
          this.updateHeaderStatus();
          this.refreshDashboard();
          this.openModal('modal-sheets-sync-guide');
        }
      };
    }
  },

  updateHeaderStatus() {
    const badge = document.getElementById('header-sheets-badge');
    const switchBtn = document.getElementById('btn-header-switch-db');
    if (!badge) return;

    if (Store.isConnectedToSheets()) {
      badge.className = 'sheets-status-badge connected';
      badge.innerHTML = '<span class="status-dot"></span> <span>Database Active</span>';
      if (switchBtn) switchBtn.style.display = 'inline-flex';
    } else {
      badge.className = 'sheets-status-badge offline';
      badge.innerHTML = '<span class="status-dot"></span> <span>Database Disconnected</span>';
      if (switchBtn) switchBtn.style.display = 'none';
    }

    badge.onclick = () => this.openModal('modal-sheets-sync-guide');
  },

  // Global Toast System
  showToast(message, type = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    let iconClass = 'fa-info-circle';
    if (type === 'success') iconClass = 'fa-check-circle';
    if (type === 'error') iconClass = 'fa-exclamation-circle';
    if (type === 'warning') iconClass = 'fa-exclamation-triangle';

    toast.innerHTML = `<i class="fas ${iconClass}"></i> <span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  },

  // Modal Manager
  initModalListeners() {
    document.querySelectorAll('.modal-close-btn, .btn-close-modal').forEach(btn => {
      btn.addEventListener('click', () => {
        const modal = btn.closest('.modal-overlay');
        if (modal) modal.classList.remove('open');
      });
    });

    document.querySelectorAll('.modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.classList.remove('open');
      });
    });
  },

  openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      if (modalId === 'modal-sheets-sync-guide') {
        try { PengaturanView.renderAppsScriptCodeSnippet(); } catch (e) {}
      }
      modal.classList.add('open');
    }
  },

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('open');
  }
};

// Auto start application on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  window.App.init();
});
