import { Student } from '../types.ts';

// Declare XLSX globally as it's loaded via CDN
declare const XLSX: any;

export const excelUtils = {
  parseStudentExcel: (file: File): Promise<Omit<Student, 'id'>[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const json = XLSX.utils.sheet_to_json(worksheet);

          const students: Omit<Student, 'id'>[] = json.map((row: any) => ({
            name: String(row['Nama Siswa'] || ''),
            className: String(row['Kelas'] || ''),
            gender: (String(row['Jenis Kelamin'] || '').toLowerCase() === 'perempuan' ? 'Perempuan' : 'Laki-laki') as 'Laki-laki' | 'Perempuan',
          }));

          // Filter out rows with empty names or classes
          const validStudents = students.filter(s => s.name && s.className);

          resolve(validStudents);
        } catch (error) {
          reject(new Error(`Failed to parse Excel file: ${error instanceof Error ? error.message : String(error)}`));
        }
      };

      reader.onerror = (error) => {
        reject(new Error(`File reading error: ${error.target?.error?.message || 'Unknown error'}`));
      };

      reader.readAsArrayBuffer(file);
    });
  },
};