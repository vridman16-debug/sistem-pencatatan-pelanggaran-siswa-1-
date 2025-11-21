import React, { useState, useEffect, useCallback } from 'react';
import { studentService } from '../services/studentService.ts';
import { violationService } from '../services/violationService.ts';
import { pdfUtils } from '../utils/pdfUtils.ts';
import { Student, Violation, ViolationType, SignatureNames, Role } from '../types.ts';
import { localStorageUtil } from '../services/localStorageUtil.ts';
import { LOCAL_STORAGE_KEYS } from '../constants.ts';
import { useHasRole } from './AuthContext.tsx';

const ReportGenerator: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [violations, setViolations] = useState<Violation[]>([]);
  const [violationTypes, setViolationTypes] = useState<ViolationType[]>([]);
  const [guruPiketName, setGuruPiketName] = useState('');
  const [kepalaSekolahName, setKepalaSekolahName] = useState('');
  const [selectedStudentFilter, setSelectedStudentFilter] = useState('');
  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const canGenerateReport = useHasRole([Role.ADMIN, Role.GURU_PIKET]);

  const fetchReportData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const fetchedStudents = await studentService.getAllStudents();
      const fetchedViolations = await violationService.getAllViolations();
      const fetchedViolationTypes = await violationService.getAllViolationTypes();

      setStudents(fetchedStudents);
      setViolations(fetchedViolations);
      setViolationTypes(fetchedViolationTypes);

      const savedSignatures = localStorageUtil.load<SignatureNames>(
        LOCAL_STORAGE_KEYS.SIGNATURE_NAMES,
        { guruPiket: '', kepalaSekolah: '' },
      );
      setGuruPiketName(savedSignatures.guruPiket);
      setKepalaSekolahName(savedSignatures.kepalaSekolah);
    } catch (err: any) {
      setError(err.message || 'Gagal memuat data laporan.');
      console.error("Error fetching report data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);

  const handleSignatureSave = () => {
    localStorageUtil.save(LOCAL_STORAGE_KEYS.SIGNATURE_NAMES, { guruPiket: guruPiketName, kepalaSekolah: kepalaSekolahName });
    alert('Nama tanda tangan berhasil disimpan!');
  };

  const handleGeneratePdf = () => {
    if (!students.length || !violations.length || !violationTypes.length) {
      alert("Tidak ada data yang cukup untuk membuat laporan. Pastikan ada siswa dan catatan pelanggaran.");
      return;
    }

    const filteredViolations = violations.filter(violation => {
      const violationDate = new Date(violation.date);
      const start = startDateFilter ? new Date(startDateFilter) : null;
      const end = endDateFilter ? new Date(endDateFilter) : null;

      const studentMatch = selectedStudentFilter ? violation.studentId === selectedStudentFilter : true;
      const dateMatch = (!start || violationDate >= start) && (!end || violationDate <= end);

      return studentMatch && dateMatch;
    });

    if (filteredViolations.length === 0) {
      alert("Tidak ada catatan pelanggaran yang sesuai dengan filter yang dipilih.");
      return;
    }

    const filtersApplied: string[] = [];
    if (selectedStudentFilter) {
      const student = students.find(s => s.id === selectedStudentFilter);
      if (student) filtersApplied.push(`Siswa: ${student.name}`);
    }
    if (startDateFilter) {
      filtersApplied.push(`Dari: ${new Date(startDateFilter).toLocaleDateString('id-ID')}`);
    }
    if (endDateFilter) {
      filtersApplied.push(`Sampai: ${new Date(endDateFilter).toLocaleDateString('id-ID')}`);
    }

    pdfUtils.generateViolationReport(
      students,
      filteredViolations,
      violationTypes,
      { guruPiket: guruPiketName, kepalaSekolah: kepalaSekolahName },
      'Laporan Pelanggaran Siswa',
      filtersApplied.join(', ')
    );
  };

  if (!canGenerateReport) {
    return (
      <div className="p-6 text-center text-red-600">Anda tidak memiliki izin untuk mengakses halaman ini.</div>
    );
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-3xl font-bold text-gray-800 mb-6">Laporan Pelanggaran Siswa</h2>

      {error && (
        <p className="mb-4 text-sm text-red-600">{error}</p>
      )}

      {loading ? (
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          <p className="ml-4 text-gray-600">Memuat data laporan...</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 p-6 border border-gray-200 rounded-lg">
            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="studentFilter">
                Filter Siswa
              </label>
              <select
                id="studentFilter"
                value={selectedStudentFilter}
                onChange={(e) => setSelectedStudentFilter(e.target.value)}
                className="shadow border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              >
                <option value="">Semua Siswa</option>
                {students.sort((a,b) => a.name.localeCompare(b.name)).map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.name} ({student.className})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="startDateFilter">
                Dari Tanggal
              </label>
              <input
                type="date"
                id="startDateFilter"
                value={startDateFilter}
                onChange={(e) => setStartDateFilter(e.target.value)}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              />
            </div>
            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="endDateFilter">
                Sampai Tanggal
              </label>
              <input
                type="date"
                id="endDateFilter"
                value={endDateFilter}
                onChange={(e) => setEndDateFilter(e.target.value)}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              />
            </div>
          </div>

          <div className="mb-8 p-6 border border-gray-200 rounded-lg">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Pengaturan Tanda Tangan</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="kepalaSekolahName">
                  Nama Kepala Sekolah
                </label>
                <input
                  type="text"
                  id="kepalaSekolahName"
                  value={kepalaSekolahName}
                  onChange={(e) => setKepalaSekolahName(e.target.value)}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                />
              </div>
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="guruPiketName">
                  Nama Guru Piket
                </label>
                <input
                  type="text"
                  id="guruPiketName"
                  value={guruPiketName}
                  onChange={(e) => setGuruPiketName(e.target.value)}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <button
                onClick={handleSignatureSave}
                className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-md transition-colors duration-200"
              >
                Simpan Tanda Tangan
              </button>
            </div>
          </div>

          <div className="flex justify-center">
            <button
              onClick={handleGeneratePdf}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg shadow-lg text-lg transition-colors duration-200"
            >
              Cetak Laporan PDF
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default ReportGenerator;