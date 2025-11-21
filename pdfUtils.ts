import { Student, Violation, ViolationType, SignatureNames } from '../types.ts';

// Declare jsPDF globally as it's loaded via CDN
declare const jspdf: any;
// autoTable is typically added as a plugin to jspdf, and called as doc.autoTable()
// No need to declare autoTable globally as a standalone function.

interface ReportData {
  no: number;
  studentName: string;
  className: string;
  totalIncidents: number;
  violationTypes: string; // Combined string of unique violation types
  notes: string;
}

export const pdfUtils = {
  generateViolationReport: (
    students: Student[],
    violations: Violation[],
    violationTypes: ViolationType[],
    signatureNames: SignatureNames,
    title: string = 'Laporan Pelanggaran Siswa',
    filtersApplied: string = '',
  ): void => {
    const { jsPDF } = jspdf;
    const doc = new jsPDF();

    // Group violations by student and type to count incidents
    const studentViolationSummary = new Map<string, { student: Student; totalIncidents: number; violationCounts: Map<string, number>; allNotes: string[] }>();

    violations.forEach(violation => {
      const student = students.find(s => s.id === violation.studentId);
      if (!student) return;

      if (!studentViolationSummary.has(student.id)) {
        studentViolationSummary.set(student.id, {
          student,
          totalIncidents: 0,
          violationCounts: new Map<string, number>(),
          allNotes: [],
        });
      }
      const summary = studentViolationSummary.get(student.id)!;

      violation.violationTypeIds.forEach(typeId => {
        const currentCount = summary.violationCounts.get(typeId) || 0;
        summary.violationCounts.set(typeId, currentCount + 1);
        summary.totalIncidents++;
      });
      if (violation.notes) {
        summary.allNotes.push(violation.notes);
      }
    });

    const reportRows: ReportData[] = Array.from(studentViolationSummary.values())
      .map((summary, index) => {
        const violationTypesList = Array.from(summary.violationCounts.keys())
          .map(typeId => {
            const type = violationTypes.find(vt => vt.id === typeId);
            return type ? `${type.name} (${summary.violationCounts.get(typeId)} kali)` : '';
          })
          .filter(Boolean)
          .join(', ');

        return {
          no: index + 1,
          studentName: summary.student.name,
          className: summary.student.className,
          totalIncidents: summary.totalIncidents,
          violationTypes: violationTypesList,
          notes: summary.allNotes.join('; '),
        };
      })
      .sort((a, b) => a.studentName.localeCompare(b.studentName)); // Sort by student name

    // Header
    doc.setFontSize(18);
    doc.text(title, doc.internal.pageSize.getWidth() / 2, 20, { align: 'center' });
    doc.setFontSize(10);
    doc.text(`Tanggal Cetak: ${new Date().toLocaleDateString('id-ID')}`, doc.internal.pageSize.getWidth() / 2, 28, { align: 'center' });
    if (filtersApplied) {
      doc.text(`Filter: ${filtersApplied}`, doc.internal.pageSize.getWidth() / 2, 35, { align: 'center' });
    }

    // Table
    (doc as any).autoTable({ // Use doc.autoTable() directly
      startY: 45,
      head: [['No', 'Nama Siswa', 'Kelas', 'Total Insiden', 'Jenis Pelanggaran', 'Catatan']],
      body: reportRows.map(row => [
        row.no,
        row.studentName,
        row.className,
        row.totalIncidents,
        row.violationTypes,
        row.notes,
      ]),
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2, overflow: 'linebreak' },
      headStyles: { fillColor: [200, 200, 200], textColor: [0, 0, 0], fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' }, // No
        1: { cellWidth: 30 }, // Nama Siswa
        2: { cellWidth: 15, halign: 'center' }, // Kelas
        3: { cellWidth: 20, halign: 'center' }, // Total Insiden
        4: { cellWidth: 60 }, // Jenis Pelanggaran
        5: { cellWidth: 50 }, // Catatan
      },
    });

    // Signatures
    const finalY = (doc as any).lastAutoTable.finalY + 20; // Get y position after the table
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFontSize(10);
    doc.text('Kepala Sekolah', pageWidth / 4, finalY);
    doc.text('Guru Piket', (pageWidth / 4) * 3, finalY);

    doc.setFontSize(10);
    doc.text('______________________', pageWidth / 4, finalY + 25);
    doc.text(signatureNames.kepalaSekolah || 'Nama Kepala Sekolah', pageWidth / 4, finalY + 30);
    doc.text('______________________', (pageWidth / 4) * 3, finalY + 25);
    doc.text(signatureNames.guruPiket || 'Nama Guru Piket', (pageWidth / 4) * 3, finalY + 30);

    doc.save('laporan-pelanggaran-siswa.pdf');
  },
};