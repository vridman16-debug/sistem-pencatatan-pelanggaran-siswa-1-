import React, { useState, useEffect, useCallback } from 'react';
import { Student, Violation, ViolationType, Role } from '../types.ts';
import { studentService } from '../services/studentService.ts';
import { violationService } from '../services/violationService.ts';
import ViolationTypeManagement from './ViolationTypeManagement.tsx';
import { useHasRole } from './AuthContext.tsx';

const ViolationRecording: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [violationTypes, setViolationTypes] = useState<ViolationType[]>([]);
  const [violations, setViolations] = useState<Violation[]>([]);

  // New state for class filter
  const [selectedClassFilter, setSelectedClassFilter] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('');

  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedViolationTypeIds, setSelectedViolationTypeIds] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [editingViolation, setEditingViolation] = useState<Violation | null>(null);
  const [isViolationTypeModalOpen, setIsViolationTypeModalOpen] = useState(false);

  const [loading, setLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canManage = useHasRole([Role.ADMIN, Role.GURU_PIKET]);

  const fetchDependencies = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const fetchedStudents = await studentService.getAllStudents();
      const fetchedViolationTypes = await violationService.getAllViolationTypes();
      const fetchedViolations = await violationService.getAllViolations();

      setStudents(fetchedStudents);
      setViolationTypes(fetchedViolationTypes);
      setViolations(fetchedViolations);
    } catch (err: any) {
      setError(err.message || 'Gagal memuat data.');
      console.error("Error fetching dependencies:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDependencies();
  }, [fetchDependencies]);

  // Calculate unique classes
  const uniqueClasses = Array.from(new Set(students.map(s => s.className))).sort();

  // Filter students based on selected class
  const studentsFilteredByClass = selectedClassFilter
    ? students.filter(s => s.className === selectedClassFilter)
    : students;

  // Effect to handle studentId reset if class filter changes and current student is no longer in the list
  useEffect(() => {
    if (selectedStudentId && selectedClassFilter) {
      const studentInFilteredList = studentsFilteredByClass.some(s => s.id === selectedStudentId);
      if (!studentInFilteredList) {
        setSelectedStudentId(''); // Clear student if no longer in selected class
      }
    } else if (selectedStudentId && !selectedClassFilter && students.length > 0) {
      // If no class filter, ensure selectedStudentId is still valid against all students
      const studentInAllStudents = students.some(s => s.id === selectedStudentId);
      if (!studentInAllStudents) {
        setSelectedStudentId('');
      }
    }
  }, [selectedClassFilter, selectedStudentId, studentsFilteredByClass, students]);


  const resetForm = useCallback(() => {
    setSelectedClassFilter(''); // Reset class filter too
    setSelectedStudentId('');
    setSelectedDate(new Date().toISOString().split('T')[0]);
    setSelectedViolationTypeIds([]);
    setNotes('');
    setEditingViolation(null);
    setError(null); // Clear form errors
  }, []);

  const handleViolationTypeUpdate = async () => {
    // Re-fetch violation types after management modal closes/updates
    await fetchDependencies(); // Re-fetch all dependencies to ensure consistency
  };

  const handleCheckboxChange = (typeId: string) => {
    setSelectedViolationTypeIds((prev) =>
      prev.includes(typeId) ? prev.filter((id) => id !== typeId) : [...prev, typeId],
    );
    setError(null); // Clear form error on input change
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!canManage) {
      setError("Anda tidak memiliki izin untuk melakukan aksi ini.");
      return;
    }

    if (!selectedStudentId || selectedViolationTypeIds.length === 0) {
      setError('Pilih siswa dan setidaknya satu jenis pelanggaran.');
      return;
    }

    setFormLoading(true);
    setError(null);
    try {
      const newViolationData: Omit<Violation, 'id'> = {
        studentId: selectedStudentId,
        date: selectedDate,
        violationTypeIds: selectedViolationTypeIds,
        notes: notes.trim() === '' ? undefined : notes.trim(),
      };

      if (editingViolation) {
        await violationService.updateViolation({ ...newViolationData, id: editingViolation.id });
      } else {
        await violationService.addViolation(newViolationData);
      }
      await fetchDependencies(); // Re-fetch all data to update tables
      resetForm();
    } catch (err: any) {
      setError(err.message || 'Gagal menyimpan catatan pelanggaran.');
      console.error("Error saving violation:", err);
    } finally {
      setFormLoading(false);
    }
  };

  const handleEdit = (violation: Violation) => {
    setSelectedStudentId(violation.studentId);
    setSelectedDate(violation.date);
    setSelectedViolationTypeIds(violation.violationTypeIds);
    setNotes(violation.notes || '');
    setEditingViolation(violation);
    setError(null);

    // When editing, also set the class filter if the student belongs to a specific class
    const studentToEdit = students.find(s => s.id === violation.studentId);
    if (studentToEdit) {
      setSelectedClassFilter(studentToEdit.className);
    } else {
      setSelectedClassFilter('');
    }
  };

  const handleDelete = async (id: string) => {
    if (!canManage) {
      alert("Anda tidak memiliki izin untuk melakukan aksi ini.");
      return;
    }
    if (window.confirm('Apakah Anda yakin ingin menghapus catatan pelanggaran ini?')) {
      setLoading(true); // Indicate loading for table while deleting
      setError(null);
      try {
        await violationService.deleteViolation(id);
        await fetchDependencies(); // Re-fetch all data to update tables
        resetForm();
      } catch (err: any) {
        setError(err.message || 'Gagal menghapus catatan pelanggaran.');
        console.error("Error deleting violation:", err);
      } finally {
        setLoading(false);
      }
    }
  };

  const getStudentName = (studentId: string) => {
    return students.find((s) => s.id === studentId)?.name || 'N/A';
  };

  const getStudentClass = (studentId: string) => {
    return students.find((s) => s.id === studentId)?.className || 'N/A';
  }

  const getViolationTypeNames = (typeIds: string[]) => {
    return typeIds
      .map((id) => violationTypes.find((vt) => vt.id === id)?.name)
      .filter(Boolean)
      .join(', ');
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-3xl font-bold text-gray-800 mb-6">Pencatatan Pelanggaran Siswa</h2>

      {canManage && (
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 p-6 border border-gray-200 rounded-lg">
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="classFilter">
              Kelas
            </label>
            <select
              id="classFilter"
              value={selectedClassFilter}
              onChange={(e) => {
                setSelectedClassFilter(e.target.value);
                setSelectedStudentId(''); // Reset student selection when class changes
                setError(null);
              }}
              className="shadow border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              disabled={formLoading || loading}
            >
              <option value="">Semua Kelas</option>
              {uniqueClasses.map((className) => (
                <option key={className} value={className}>
                  {className}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="student">
              Siswa
            </label>
            <select
              id="student"
              value={selectedStudentId}
              onChange={(e) => {setSelectedStudentId(e.target.value); setError(null);}}
              className="shadow border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              required
              disabled={formLoading || loading}
            >
              <option value="">Pilih Siswa</option>
              {studentsFilteredByClass.sort((a,b) => a.name.localeCompare(b.name)).map((student) => (
                <option key={student.id} value={student.id}>
                  {student.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="date">
              Tanggal
            </label>
            <input
              type="date"
              id="date"
              value={selectedDate}
              onChange={(e) => {setSelectedDate(e.target.value); setError(null);}}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              required
              disabled={formLoading || loading}
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-gray-700 text-sm font-bold mb-2">Jenis Pelanggaran</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {violationTypes.length === 0 && !loading ? (
                <p className="text-gray-500 col-span-full">Tidak ada jenis pelanggaran yang tersedia. Tambahkan terlebih dahulu.</p>
              ) : (
                violationTypes.map((type) => (
                  <div key={type.id} className="flex items-center">
                    <input
                      type="checkbox"
                      id={`violation-${type.id}`}
                      checked={selectedViolationTypeIds.includes(type.id)}
                      onChange={() => handleCheckboxChange(type.id)}
                      className="mr-2 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      disabled={formLoading || loading}
                    />
                    <label htmlFor={`violation-${type.id}`} className="text-gray-700">
                      {type.name}
                    </label>
                  </div>
                ))
              )}
            </div>
            <button
              type="button"
              onClick={() => setIsViolationTypeModalOpen(true)}
              className="mt-4 bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-md text-sm transition-colors duration-200 disabled:opacity-50"
              disabled={formLoading || loading}
            >
              Tambah/Edit Jenis Pelanggaran
            </button>
          </div>

          <div className="md:col-span-2">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="notes">
              Catatan Pelanggaran (Opsional)
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => {setNotes(e.target.value); setError(null);}}
              rows={3}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              placeholder="Tambahkan catatan khusus tentang pelanggaran ini..."
              disabled={formLoading || loading}
            ></textarea>
          </div>

          {error && <p className="md:col-span-2 text-red-500 text-xs italic mb-4">{error}</p>}

          <div className="md:col-span-2 flex justify-end gap-3 mt-4">
            <button
              type="button"
              onClick={resetForm}
              className="bg-gray-400 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-md transition-colors duration-200 disabled:opacity-50"
              disabled={formLoading || loading}
            >
              Batal
            </button>
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md transition-colors duration-200 disabled:opacity-50"
              disabled={formLoading || loading}
            >
              {formLoading ? (editingViolation ? 'Mengupdate...' : 'Mencatat...') : (editingViolation ? 'Update Pelanggaran' : 'Catat Pelanggaran')}
            </button>
          </div>
        </form>
      )}

      {/* List of Recorded Violations */}
      <h3 className="text-2xl font-bold text-gray-800 mb-4 mt-10">Daftar Catatan Pelanggaran</h3>
      <div className="overflow-x-auto">
        {loading && !formLoading ? (
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
            <p className="ml-4 text-gray-600">Memuat catatan pelanggaran...</p>
          </div>
        ) : (
          <table className="min-w-full bg-white border border-gray-200 rounded-lg">
            <thead>
              <tr className="bg-gray-100 text-left text-gray-600 uppercase text-sm leading-normal">
                <th className="py-3 px-6 border-b border-gray-200">Tanggal</th>
                <th className="py-3 px-6 border-b border-gray-200">Siswa</th>
                <th className="py-3 px-6 border-b border-gray-200">Kelas</th> {/* Added Kelas column */}
                <th className="py-3 px-6 border-b border-gray-200">Jenis Pelanggaran</th>
                <th className="py-3 px-6 border-b border-gray-200">Catatan</th>
                {canManage && <th className="py-3 px-6 border-b border-gray-200 text-center">Aksi</th>}
              </tr>
            </thead>
            <tbody className="text-gray-700 text-sm font-light">
              {violations.length === 0 && !loading ? (
                <tr>
                  <td colSpan={canManage ? 6 : 5} className="py-3 px-6 text-center text-gray-500">
                    Tidak ada catatan pelanggaran ditemukan.
                  </td>
                </tr>
              ) : (
                violations
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  .map((violation) => {
                    const student = students.find(s => s.id === violation.studentId);
                    return (
                      <tr key={violation.id} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="py-3 px-6 whitespace-nowrap">{violation.date}</td>
                        <td className="py-3 px-6 whitespace-nowrap">{student?.name || 'N/A'}</td>
                        <td className="py-3 px-6 whitespace-nowrap">{student?.className || 'N/A'}</td> {/* Display class */}
                        <td className="py-3 px-6">{getViolationTypeNames(violation.violationTypeIds)}</td>
                        <td className="py-3 px-6">{violation.notes || '-'}</td>
                        {canManage && (
                          <td className="py-3 px-6 text-center">
                            <div className="flex item-center justify-center space-x-2">
                              <button
                                onClick={() => handleEdit(violation)}
                                className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-1 px-3 rounded-md transition-colors duration-200"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDelete(violation.id)}
                                className="bg-red-600 hover:bg-red-700 text-white font-bold py-1 px-3 rounded-md transition-colors duration-200"
                              >
                                Hapus
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal for Violation Type Management */}
      {isViolationTypeModalOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-6">
            <ViolationTypeManagement onViolationTypesUpdated={handleViolationTypeUpdate} />
            <div className="flex justify-end mt-6">
              <button
                type="button"
                onClick={() => setIsViolationTypeModalOpen(false)}
                className="bg-gray-400 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-md transition-colors duration-200"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ViolationRecording;