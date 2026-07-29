/* ==========================================================================
   JurnalGuru Pro - View Master Data Siswa & Import Excel
   ========================================================================== */

import { Store } from '../store.js';
import { ExportService } from '../services/export.js';

export const SiswaView = {
  render() {
    this.renderSiswaTable();
    this.initClassFilter();
    this.initSearchInput();
    this.initAddModal();
    this.initImportExcel();
  },

  renderSiswaTable(kelasFilter = '', searchQuery = '') {
    const tbody = document.getElementById('siswa-tbody');
    if (!tbody) return;

    let list = Store.getSiswa();
    if (kelasFilter) {
      list = list.filter(s => s.kelas === kelasFilter);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(s => s.nama.toLowerCase().includes(q) || s.nisn.includes(q));
    }

    tbody.innerHTML = '';
    if (list.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 2rem;" class="text-muted">Tidak ada data siswa. Silakan tambah data atau import dari Excel.</td></tr>';
      return;
    }

    list.forEach((s, idx) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${idx + 1}</td>
        <td><code>${s.nisn}</code></td>
        <td><strong>${s.nama}</strong></td>
        <td><span class="badge" style="background:#E2E8F0; padding:2px 8px; border-radius:4px; font-weight:700;">${/^kelas/i.test(s.kelas) ? s.kelas : 'Kelas ' + s.kelas}</span></td>
        <td>${s.jenisKelamin === 'L' ? 'Laki-laki' : 'Perempuan'}</td>
        <td>
          <button class="btn-danger btn-delete-siswa" data-nisn="${s.nisn}" title="Hapus"><i class="fas fa-trash"></i> Hapus</button>
        </td>
      `;
      tbody.appendChild(tr);
    });

    // Attach delete handlers
    tbody.querySelectorAll('.btn-delete-siswa').forEach(btn => {
      btn.addEventListener('click', () => {
        const nisn = btn.getAttribute('data-nisn');
        if (confirm(`Apakah Anda yakin ingin menghapus siswa dengan NISN ${nisn}?`)) {
          Store.deleteSiswa(nisn);
          window.App.showToast('Data siswa berhasil dihapus.', 'success');
          this.renderSiswaTable(kelasFilter, searchQuery);
        }
      });
    });
  },

  initClassFilter() {
    const select = document.getElementById('siswa-filter-kelas');
    if (!select) return;

    select.innerHTML = '<option value="">Semua Kelas</option>';
    const allSiswa = Store.getSiswa();
    const uniqueKelas = [...new Set(allSiswa.map(s => s.kelas))].sort();
    uniqueKelas.forEach(k => {
      const opt = document.createElement('option');
      opt.value = k;
      opt.textContent = /^kelas/i.test(k) ? k : `Kelas ${k}`;
      select.appendChild(opt);
    });

    select.addEventListener('change', () => {
      const q = document.getElementById('siswa-search-input')?.value || '';
      this.renderSiswaTable(select.value, q);
    });
  },

  initSearchInput() {
    const input = document.getElementById('siswa-search-input');
    if (!input) return;

    input.addEventListener('input', () => {
      const k = document.getElementById('siswa-filter-kelas')?.value || '';
      this.renderSiswaTable(k, input.value);
    });
  },

  initAddModal() {
    const btnAdd = document.getElementById('btn-add-siswa');
    const modal = document.getElementById('modal-add-siswa');
    const form = document.getElementById('form-add-siswa');

    if (btnAdd && modal) {
      btnAdd.addEventListener('click', () => window.App.openModal('modal-add-siswa'));
    }

    if (form) {
      form.onsubmit = (e) => {
        e.preventDefault();
        const siswaObj = {
          nisn: document.getElementById('modal-nisn').value.trim(),
          nama: document.getElementById('modal-nama').value.trim(),
          kelas: document.getElementById('modal-kelas').value.trim(),
          jenisKelamin: document.getElementById('modal-jk').value,
          agama: document.getElementById('modal-agama').value
        };

        try {
          Store.addSiswa(siswaObj);
          window.App.closeModal('modal-add-siswa');
          window.App.showToast(`Siswa ${siswaObj.nama} berhasil ditambahkan!`, 'success');
          form.reset();
          this.renderSiswaTable();
          this.initClassFilter();
        } catch (err) {
          window.App.showToast(err.message, 'error');
        }
      };
    }
  },

  initImportExcel() {
    const fileInput = document.getElementById('excel-file-input');
    const btnTrigger = document.getElementById('btn-import-excel');

    if (btnTrigger && fileInput) {
      btnTrigger.addEventListener('click', () => fileInput.click());

      fileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
          const rawData = await ExportService.readExcelFile(file);
          if (!rawData || rawData.length === 0) {
            window.App.showToast('File Excel kosong atau format tidak sesuai!', 'error');
            return;
          }

          // Show Preview Modal
          this.showExcelPreviewModal(rawData);
        } catch (err) {
          window.App.showToast('Gagal membaca file Excel: ' + err.message, 'error');
        } finally {
          fileInput.value = '';
        }
      });
    }
  },

  showExcelPreviewModal(rawData) {
    const modalBody = document.getElementById('modal-excel-preview-body');
    const modal = document.getElementById('modal-excel-preview');

    if (!modalBody || !modal) return;

    // Map Excel columns to Siswa Schema (nisn, nama, kelas, jenisKelamin, agama)
    const previewList = rawData.map(row => ({
      nisn: String(row.NISN || row.nisn || row['No NISN'] || '').trim(),
      nama: String(row['Nama Lengkap'] || row.Nama || row.nama || '').trim(),
      kelas: String(row.Kelas || row.kelas || '').trim().replace(/^kelas\s+/i, '').trim(),
      jenisKelamin: String(row['Jenis Kelamin'] || row.JK || row.jk || 'L').trim().toUpperCase().charAt(0),
      agama: String(row.Agama || row.agama || 'Islam').trim()
    })).filter(s => s.nisn && s.nama);

    let html = `
      <p style="margin-bottom:1rem;">Ditemukan <strong>${previewList.length} data siswa</strong> dari file Excel. Mohon periksa pratinjau data berikut:</p>
      <div style="max-height: 300px; overflow-y: auto; border: 1px solid #E2E8F0; border-radius: 8px;">
        <table class="data-table">
          <thead>
            <tr><th>#</th><th>NISN</th><th>Nama Siswa</th><th>Kelas</th><th>JK</th></tr>
          </thead>
          <tbody>
    `;

    previewList.forEach((s, i) => {
      html += `<tr><td>${i+1}</td><td>${s.nisn}</td><td>${s.nama}</td><td>${s.kelas}</td><td>${s.jenisKelamin}</td></tr>`;
    });

    html += '</tbody></table></div>';
    modalBody.innerHTML = html;

    window.App.openModal('modal-excel-preview');

    const btnConfirm = document.getElementById('btn-confirm-import');
    if (btnConfirm) {
      btnConfirm.onclick = () => {
        let addedCount = 0;
        let duplicateCount = 0;
        const currentList = Store.getSiswa();

        previewList.forEach(s => {
          if (currentList.some(x => x.nisn === s.nisn)) {
            duplicateCount++;
          } else {
            currentList.push(s);
            addedCount++;
          }
        });

        Store.saveSiswa(currentList);
        window.App.closeModal('modal-excel-preview');
        window.App.showToast(`Berhasil mengimpor ${addedCount} data siswa! (${duplicateCount} NISN ganda dilewati)`, 'success');
        this.renderSiswaTable();
        this.initClassFilter();
      };
    }
  }
};
