import React, { useState, useEffect, useCallback } from 'react';
import { Student, Role } from '../types.ts';
import { studentService } from '../services/studentService.ts';
import { excelUtils } from '../utils/excelUtils.ts';
import { useHasRole } from './AuthContext.tsx';

const StudentManagement: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [formData, setFormData] = useState<Omit<Student, 'id'>>({ name: '', className: '', gender: 'Laki-laki' });
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canManage = useHasRole([Role.ADMIN, Role.GURU_PIKET]);

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const fetchedStudents = await studentService.getAllStudents();
      setStudents(fetchedStudents);
    } catch (err: any) {
      setError(err.message || 'Gagal memuat data siswa.');
      console.error("Error fetching students:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError(null); // Clear form error on input change
  };

  const openAddModal = () => {
    setEditingStudent(null);
    setFormData({ name: '', className: '', gender: 'Laki-laki' });
    setError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (student: Student) => {
    setEditingStudent(student);
    setFormData({ name: student.name, className: student.className, gender: student.gender });
    setError(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingStudent(null);
    setFormData({ name: '', className: '', gender: 'Laki-laki' });
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManage) {
      setError("Anda tidak memiliki izin untuk melakukan aksi ini.");
      return;
    }
    setFormLoading(true);
    setError(null);
    try {
      if (editingStudent) {
        await studentService.updateStudent({ ...formData, id: editingStudent.id });
      } else {
        await studentService.addStudent(formData);
      }
      fetchStudents();
      closeModal();
    } catch (err: any) {
      setError(err.message || 'Gagal menyimpan data siswa.');
      console.error("Error saving student:", err);
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!canManage) {
      alert("Anda tidak memiliki izin untuk melakukan aksi ini.");
      return;
    }
    if (window.confirm('Apakah Anda yakin ingin menghapus siswa ini?')) {
      setLoading(true); // Indicate loading for table while deleting
      setError(null);
      try {
        await studentService.deleteStudent(id);
        fetchStudents();
      } catch (err: any) {
        setError(err.message || 'Gagal menghapus siswa.');
        console.error("Error deleting student:", err);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files && e.target.files[0];
    if (file) {
      setUploadMessage('Memproses file...');
      setLoading(true); // Indicate loading for table while processing
      setError(null);
      try {
        const parsedStudents = await excelUtils.parseStudentExcel(file);
        if (parsedStudents.length > 0) {
          const added = await studentService.addStudentsFromExcel(parsedStudents);
          setUploadMessage(`${added.length} siswa berhasil ditambahkan.`);
          fetchStudents(); // Refresh student list
        } else {
          setUploadMessage('Tidak ada siswa baru yang ditemukan atau ditambahkan.');
        }
      } catch (err: any) {
        setError(err.message || `Error: Gagal mengimpor file Excel.`);
        setUploadMessage(null); // Clear success/processing message on error
        console.error("Error importing Excel:", err);
      } finally {
        setLoading(false);
      }
    } else {
      setUploadMessage(null); // Clear message if no file selected
    }
    // Clear the input value to allow selecting the same file again if needed
    e.target.value = '';
  };

  const filteredStudents = students.filter(student =>
    student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.className.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-3xl font-bold text-gray-800 mb-6">Manajemen Siswa</h2>

      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <input
          type="text"
          placeholder="Cari siswa..."
          className="p-2 border border-gray-300 rounded-md flex-grow md:max-w-xs"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <div className="flex gap-4 w-full md:w-auto">
          {canManage && (
            <button
              onClick={openAddModal}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md transition-colors duration-200 w-full md:w-auto"
            >
              Tambah Siswa
            </button>
          )}
          {canManage && (
            <div className="relative inline-block w-full md:w-auto">
              <input
                type="file"
                accept=".xlsx, .xls"
                onChange={handleFileChange}
                className="hidden"
                id="excel-upload"
                disabled={loading} // Disable during processing
              />
              <label
                htmlFor="excel-upload"
                className={`bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md cursor-pointer transition-colors duration-200 block text-center w-full md:w-auto ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {loading && uploadMessage ? 'Memproses...' : 'Import Data Excel'}
              </label>
            </div>
          )}
        </div>
      </div>
      {uploadMessage && (
        <p className={`mb-4 text-sm ${uploadMessage.startsWith('Error') || error ? 'text-red-600' : 'text-green-600'}`}>
          {error || uploadMessage}
        </p>
      )}
      {error && !uploadMessage && (
        <p className="mb-4 text-sm text-red-600">{error}</p>
      )}

      <div className="overflow-x-auto">
        {loading && !uploadMessage ? (
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
            <p className="ml-4 text-gray-600">Memuat siswa...</p>
          </div>
        ) : (
          <table className="min-w-full bg-white border border-gray-200 rounded-lg">
            <thead>
              <tr className="bg-gray-100 text-left text-gray-600 uppercase text-sm leading-normal">
                <th className="py-3 px-6 border-b border-gray-200">Nama Siswa</th>
                <th className="py-3 px-6 border-b border-gray-200">Kelas</th>
                <th className="py-3 px-6 border-b border-gray-200">Jenis Kelamin</th>
                {canManage && <th className="py-3 px-6 border-b border-gray-200 text-center">Aksi</th>}
              </tr>
            </thead>
            <tbody className="text-gray-700 text-sm font-light">
              {filteredStudents.length === 0 && !loading ? (
                <tr>
                  <td colSpan={canManage ? 4 : 3} className="py-3 px-6 text-center text-gray-500">
                    Tidak ada data siswa ditemukan.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student) => (
                  <tr key={student.id} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="py-3 px-6 whitespace-nowrap">{student.name}</td>
                    <td className="py-3 px-6">{student.className}</td>
                    <td className="py-3 px-6">{student.gender}</td>
                    {canManage && (
                      <td className="py-3 px-6 text-center">
                        <div className="flex item-center justify-center space-x-2">
                          <button
                            onClick={() => openEditModal(student)}
                            className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-1 px-3 rounded-md transition-colors duration-200"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(student.id)}
                            className="bg-red-600 hover:bg-red-700 text-white font-bold py-1 px-3 rounded-md transition-colors duration-200"
                          >
                            Hapus
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal for Add/Edit Student */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6">
            <h3 className="text-2xl font-bold mb-4 text-gray-800">
              {editingStudent ? 'Edit Siswa' : 'Tambah Siswa'}
            </h3>
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="name">
                  Nama Siswa
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="className">
                  Kelas
                </label>
                <input
                  type="text"
                  id="className"
                  name="className"
                  value={formData.className}
                  onChange={handleInputChange}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="gender">
                  Jenis Kelamin
                </label>
                <select
                  id="gender"
                  name="gender"
                  value={formData.gender}
                  onChange={handleInputChange}
                  className="shadow border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  required
                >
                  <option value="Laki-laki">Laki-laki</option>
                  <option value="Perempuan">Perempuan</option>
                </select>
              </div>
              {error && <p className="text-red-500 text-xs italic mb-4">{error}</p>}
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="bg-gray-400 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-md transition-colors duration-200"
                  disabled={formLoading}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md transition-colors duration-200 disabled:opacity-50"
                  disabled={formLoading}
                >
                  {formLoading ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentManagement;