/* ==========================================================================
   JurnalGuru Pro - View Master Data Materi Pembelajaran
   ========================================================================== */

import { Store } from '../store.js';

export const MateriView = {
  parsedImportData: [],

  render() {
    this.renderMateriTable();
    this.initClassFilter();
    this.initAddModal();
    this.initImportModal();
  },

  renderMateriTable(kelasFilter = '') {
    const tbody = document.getElementById('materi-tbody');
    if (!tbody) return;

    let list = Store.getMateri();
    if (kelasFilter) {
      list = list.filter(m => m.kelas === kelasFilter);
    }

    tbody.innerHTML = '';
    if (list.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 2rem;" class="text-muted">Belum ada data materi pembelajaran. Silakan tambah materi baru atau import dari Excel.</td></tr>';
      return;
    }

    list.forEach((m, idx) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${idx + 1}</td>
        <td><span class="badge" style="background:#CCFBF1; color:#0F766E; padding:2px 8px; border-radius:4px; font-weight:700;">Tingkat ${m.kelas}</span></td>
        <td><strong>${m.mataPelajaran}</strong></td>
        <td>${m.topik}</td>
        <td>
          <button class="btn-danger btn-delete-materi" data-id="${m.id}" title="Hapus"><i class="fas fa-trash"></i> Hapus</button>
        </td>
      `;
      tbody.appendChild(tr);
    });

    tbody.querySelectorAll('.btn-delete-materi').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        if (confirm('Hapus modul materi ini?')) {
          Store.deleteMateri(id);
          window.App.showToast('Materi berhasil dihapus.', 'success');
          this.renderMateriTable(kelasFilter);
        }
      });
    });
  },

  initClassFilter() {
    const select = document.getElementById('materi-filter-kelas');
    if (!select) return;

    select.addEventListener('change', () => {
      this.renderMateriTable(select.value);
    });
  },

  initAddModal() {
    const btnAdd = document.getElementById('btn-add-materi');
    const form = document.getElementById('form-add-materi');

    if (btnAdd) {
      btnAdd.addEventListener('click', () => window.App.openModal('modal-add-materi'));
    }

    if (form) {
      form.onsubmit = (e) => {
        e.preventDefault();
        const rawKelas = document.getElementById('modal-materi-kelas').value;
        const cleanKelas = String(rawKelas).trim().replace(/^kelas\s+/i, '').trim();

        const materiObj = {
          kelas: cleanKelas,
          mataPelajaran: document.getElementById('modal-materi-mapel').value.trim(),
          topik: document.getElementById('modal-materi-topik').value.trim()
        };

        Store.addMateri(materiObj);
        window.App.closeModal('modal-add-materi');
        window.App.showToast('Modul materi pembelajaran berhasil ditambahkan!', 'success');
        form.reset();
        this.renderMateriTable();
      };
    }
  },

  initImportModal() {
    const btnImport = document.getElementById('btn-import-materi-excel');
    const fileInput = document.getElementById('file-import-materi');
    const formImport = document.getElementById('form-import-materi');
    const previewBox = document.getElementById('materi-import-preview-box');
    const countBadge = document.getElementById('materi-import-count');
    const previewTbody = document.getElementById('materi-import-preview-tbody');
    const btnConfirm = document.getElementById('btn-confirm-import-materi');

    if (btnImport) {
      btnImport.addEventListener('click', () => {
        if (formImport) formImport.reset();
        this.parsedImportData = [];
        if (previewBox) previewBox.style.display = 'none';
        if (btnConfirm) btnConfirm.disabled = true;
        window.App.openModal('modal-import-materi');
      });
    }

    if (fileInput) {
      fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const data = new Uint8Array(event.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            
            // Parse sheet as 2D array
            const jsonRows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
            
            this.parsedImportData = [];
            
            jsonRows.forEach((row, idx) => {
              if (!row || row.length === 0) return;
              
              // Skip header row if contains 'tingkat' or 'kelas' or 'mata pelajaran'
              const firstCol = String(row[0] || '').toLowerCase();
              if (firstCol.includes('tingkat') || firstCol.includes('kelas') || firstCol.includes('mapel') || firstCol.includes('no')) {
                return;
              }

              let kelasVal = String(row[0] || '7').trim().replace(/^kelas\s+/i, '').trim();
              if (!['7', '8', '9'].includes(kelasVal)) {
                kelasVal = '7'; // fallback
              }

              const mapelVal = String(row[1] || '').trim();
              const topikVal = String(row[2] || row[1] || '').trim();

              if (mapelVal && topikVal) {
                this.parsedImportData.push({
                  kelas: kelasVal,
                  mataPelajaran: mapelVal,
                  topik: topikVal
                });
              }
            });

            if (previewTbody) {
              previewTbody.innerHTML = '';
              this.parsedImportData.forEach(item => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                  <td><span class="badge" style="background:#CCFBF1; color:#0F766E;">Kelas ${item.kelas}</span></td>
                  <td><strong>${item.mataPelajaran}</strong></td>
                  <td>${item.topik}</td>
                `;
                previewTbody.appendChild(tr);
              });
            }

            if (countBadge) countBadge.textContent = `${this.parsedImportData.length} Data`;
            if (previewBox) previewBox.style.display = 'block';
            if (btnConfirm) btnConfirm.disabled = (this.parsedImportData.length === 0);

          } catch (err) {
            window.App.showToast('Gagal membaca berkas Excel/CSV: ' + err.message, 'error');
          }
        };

        reader.readAsArrayBuffer(file);
      });
    }

    if (formImport) {
      formImport.onsubmit = (e) => {
        e.preventDefault();
        if (this.parsedImportData.length === 0) {
          window.App.showToast('Tidak ada data materi valid yang ditemukan dalam berkas Excel.', 'warning');
          return;
        }

        const existing = Store.getMateri();
        let addedCount = 0;

        this.parsedImportData.forEach(item => {
          item.id = 'M-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4);
          existing.push(item);
          addedCount++;
        });

        Store.saveMateri(existing);
        window.App.closeModal('modal-import-materi');
        window.App.showToast(`Berhasil mengimpor ${addedCount} modul materi pembelajaran!`, 'success');
        this.renderMateriTable();
      };
    }
  }
};
