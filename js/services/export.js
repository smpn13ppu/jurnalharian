/* ==========================================================================
   JurnalGuru Pro - Export & File Import Service (Excel & PDF)
   ========================================================================== */

export const ExportService = {
  // Export array of objects to Excel .xlsx file
  exportToExcel(data, fileName = 'Laporan_Jurnal.xlsx', sheetName = 'Data') {
    if (typeof XLSX === 'undefined') {
      alert('Library SheetJS belum dimuat. Pastikan koneksi internet aktif.');
      return;
    }
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    XLSX.writeFile(workbook, fileName);
  },

  // Parse uploaded Excel / CSV file to JSON array
  async readExcelFile(file) {
    if (typeof XLSX === 'undefined') {
      throw new Error('Library SheetJS belum dimuat.');
    }
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const json = XLSX.utils.sheet_to_json(worksheet);
          resolve(json);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = (error) => reject(error);
      reader.readAsArrayBuffer(file);
    });
  },

  // Trigger Browser Native Print (optimized via @media print)
  printReport() {
    window.print();
  }
};
