import React, { useState, useEffect, useCallback } from 'react';
import { ViolationType, Role } from '../types.ts';
import { violationService } from '../services/violationService.ts';
import { useHasRole } from './AuthContext.tsx';

interface ViolationTypeManagementProps {
  onViolationTypesUpdated?: () => void;
}

const ViolationTypeManagement: React.FC<ViolationTypeManagementProps> = ({ onViolationTypesUpdated }) => {
  const [violationTypes, setViolationTypes] = useState<ViolationType[]>([]);
  const [newTypeName, setNewTypeName] = useState('');
  const [editingType, setEditingType] = useState<ViolationType | null>(null);
  const [loading, setLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canManage = useHasRole([Role.ADMIN]);

  const fetchViolationTypes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const fetchedTypes = await violationService.getAllViolationTypes();
      setViolationTypes(fetchedTypes);
    } catch (err: any) {
      setError(err.message || 'Gagal memuat jenis pelanggaran.');
      console.error("Error fetching violation types:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchViolationTypes();
  }, [fetchViolationTypes]);

  const handleAddType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManage) {
      setError("Anda tidak memiliki izin untuk melakukan aksi ini.");
      return;
    }
    if (!newTypeName.trim()) {
      setError("Nama jenis pelanggaran tidak boleh kosong.");
      return;
    }

    setFormLoading(true);
    setError(null);
    try {
      if (editingType) {
        await violationService.updateViolationType({ ...editingType, name: newTypeName.trim() });
        setEditingType(null);
      } else {
        await violationService.addViolationType(newTypeName.trim());
      }
      setNewTypeName('');
      await fetchViolationTypes(); // Ensure data is refetched after update/add
      onViolationTypesUpdated?.();
    } catch (err: any) {
      setError(err.message || 'Gagal menyimpan jenis pelanggaran.');
      console.error("Error saving violation type:", err);
    } finally {
      setFormLoading(false);
    }
  };

  const handleEditClick = (type: ViolationType) => {
    setEditingType(type);
    setNewTypeName(type.name);
    setError(null); // Clear error when opening edit form
  };

  const handleDeleteType = async (id: string) => {
    if (!canManage) {
      alert("Anda tidak memiliki izin untuk melakukan aksi ini.");
      return;
    }
    if (window.confirm('Apakah Anda yakin ingin menghapus jenis pelanggaran ini? Ini mungkin memengaruhi catatan pelanggaran yang sudah ada.')) {
      setLoading(true); // Indicate loading for table while deleting
      setError(null);
      try {
        await violationService.deleteViolationType(id);
        await fetchViolationTypes(); // Ensure data is refetched after delete
        onViolationTypesUpdated?.();
      } catch (err: any) {
        setError(err.message || 'Gagal menghapus jenis pelanggaran.');
        console.error("Error deleting violation type:", err);
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h3 className="text-2xl font-bold text-gray-800 mb-4">Manajemen Jenis Pelanggaran</h3>

      {canManage && (
        <form onSubmit={handleAddType} className="mb-6 flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            placeholder={editingType ? 'Edit nama jenis pelanggaran' : 'Nama jenis pelanggaran baru'}
            value={newTypeName}
            onChange={(e) => {setNewTypeName(e.target.value); setError(null);}}
            className="flex-grow p-2 border border-gray-300 rounded-md"
            required
            disabled={formLoading}
          />
          <button
            type="submit"
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-md transition-colors duration-200 disabled:opacity-50"
            disabled={formLoading}
          >
            {formLoading ? (editingType ? 'Mengupdate...' : 'Menambah...') : (editingType ? 'Update' : 'Tambah')}
          </button>
          {editingType && (
            <button
              type="button"
              onClick={() => { setEditingType(null); setNewTypeName(''); setError(null); }}
              className="bg-gray-400 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-md transition-colors duration-200 disabled:opacity-50"
              disabled={formLoading}
            >
              Batal
            </button>
          )}
        </form>
      )}
      {error && <p className="text-red-500 text-xs italic mb-4">{error}</p>}

      <div className="overflow-x-auto">
        {loading ? (
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
            <p className="ml-4 text-gray-600">Memuat jenis pelanggaran...</p>
          </div>
        ) : (
          <table className="min-w-full bg-white border border-gray-200 rounded-lg">
            <thead>
              <tr className="bg-gray-100 text-left text-gray-600 uppercase text-sm leading-normal">
                <th className="py-3 px-6 border-b border-gray-200">Jenis Pelanggaran</th>
                {canManage && <th className="py-3 px-6 border-b border-gray-200 text-center">Aksi</th>}
              </tr>
            </thead>
            <tbody className="text-gray-700 text-sm font-light">
              {violationTypes.length === 0 && !loading ? (
                <tr>
                  <td colSpan={canManage ? 2 : 1} className="py-3 px-6 text-center text-gray-500">
                    Tidak ada jenis pelanggaran ditemukan.
                  </td>
                </tr>
              ) : (
                violationTypes.map((type) => (
                  <tr key={type.id} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="py-3 px-6">{type.name}</td>
                    {canManage && (
                      <td className="py-3 px-6 text-center">
                        <div className="flex item-center justify-center space-x-2">
                          <button
                            onClick={() => handleEditClick(type)}
                            className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-1 px-3 rounded-md transition-colors duration-200"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteType(type.id)}
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
    </div>
  );
};

export default ViolationTypeManagement;