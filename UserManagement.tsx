import React, { useState, useEffect, useCallback } from 'react';
import { User, Role } from '../types.ts';
import { authService } from '../services/authService.ts';
import { useAuth, useHasRole } from './AuthContext.tsx';

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<Omit<User, 'id' | 'password'>>({ username: '', role: Role.GURU_PIKET });
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false);

  const { user: currentUser } = useAuth();
  const canManageUsers = useHasRole([Role.ADMIN]);

  const fetchUsers = useCallback(async () => {
    if (canManageUsers) {
      setLoading(true);
      setError(null);
      try {
        const fetchedUsers = await authService.getAllUsers();
        setUsers(fetchedUsers);
      } catch (err: any) {
        setError(err.message || 'Gagal memuat data pengguna.');
        console.error("Error fetching users:", err);
      } finally {
        setLoading(false);
      }
    }
  }, [canManageUsers]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError(null);
  };

  const openAddModal = () => {
    setEditingUser(null);
    setFormData({ username: '', role: Role.GURU_PIKET });
    setPassword('');
    setConfirmPassword('');
    setError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (user: User) => {
    setEditingUser(user);
    setFormData({ username: user.username, role: user.role });
    setPassword('');
    setConfirmPassword('');
    setError(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingUser(null);
    setFormData({ username: '', role: Role.GURU_PIKET });
    setPassword('');
    setConfirmPassword('');
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!canManageUsers) {
      setError("Anda tidak memiliki izin untuk melakukan aksi ini.");
      return;
    }

    if (password !== confirmPassword) {
      setError('Password dan konfirmasi password tidak cocok.');
      return;
    }

    setFormLoading(true);
    setError(null);
    try {
      if (editingUser) {
        // Update user
        const updatedUser: User = {
          ...editingUser,
          username: formData.username, // Firebase Auth uses email as username
          role: formData.role,
        };
        // Only include password if provided and not empty
        if (password.trim() !== '') {
          updatedUser.password = password;
        }
        await authService.updateUser(updatedUser);
      } else {
        // Add new user
        if (!password) {
          setError('Password harus diisi untuk user baru.');
          return;
        }
        await authService.addUser({ ...formData, password });
      }
      await fetchUsers();
      closeModal();
    } catch (err: any) {
      setError(err.message || 'Gagal menyimpan data pengguna.');
      console.error("Error saving user:", err);
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!canManageUsers) {
      alert("Anda tidak memiliki izin untuk melakukan aksi ini.");
      return;
    }
    if (id === currentUser?.id) {
      alert('Anda tidak bisa menghapus akun Anda sendiri.');
      return;
    }
    if (window.confirm('Apakah Anda yakin ingin menghapus pengguna ini? (Ini hanya akan menghapus profil Firestore, bukan akun Firebase Auth)')) {
      setLoading(true); // Indicate loading for table while deleting
      setError(null);
      try {
        await authService.deleteUser(id);
        await fetchUsers();
      } catch (err: any) {
        setError(err.message || 'Gagal menghapus pengguna.');
        console.error("Error deleting user:", err);
      } finally {
        setLoading(false);
      }
    }
  };

  if (!canManageUsers) {
    return (
      <div className="p-6 text-center text-red-600">Anda tidak memiliki izin untuk mengakses halaman ini.</div>
    );
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-3xl font-bold text-gray-800 mb-6">Manajemen Pengguna</h2>

      <div className="flex justify-end mb-6">
        <button
          onClick={openAddModal}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md transition-colors duration-200"
        >
          Tambah Pengguna
        </button>
      </div>

      <div className="overflow-x-auto">
        {loading ? (
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
            <p className="ml-4 text-gray-600">Memuat pengguna...</p>
          </div>
        ) : (
          <table className="min-w-full bg-white border border-gray-200 rounded-lg">
            <thead>
              <tr className="bg-gray-100 text-left text-gray-600 uppercase text-sm leading-normal">
                <th className="py-3 px-6 border-b border-gray-200">Username (Email)</th> {/* Updated label */}
                <th className="py-3 px-6 border-b border-gray-200">Role</th>
                <th className="py-3 px-6 border-b border-gray-200 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="text-gray-700 text-sm font-light">
              {users.length === 0 && !loading ? (
                <tr>
                  <td colSpan={3} className="py-3 px-6 text-center text-gray-500">
                    Tidak ada pengguna ditemukan.
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="py-3 px-6 whitespace-nowrap">{user.username}</td>
                    <td className="py-3 px-6">{user.role === Role.ADMIN ? 'Admin' : 'Guru Piket'}</td>
                    <td className="py-3 px-6 text-center">
                      <div className="flex item-center justify-center space-x-2">
                        <button
                          onClick={() => openEditModal(user)}
                          className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-1 px-3 rounded-md transition-colors duration-200"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(user.id)}
                          className="bg-red-600 hover:bg-red-700 text-white font-bold py-1 px-3 rounded-md transition-colors duration-200"
                          disabled={user.id === currentUser?.id} // Prevent deleting own account
                        >
                          Hapus
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal for Add/Edit User */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6">
            <h3 className="text-2xl font-bold mb-4 text-gray-800">
              {editingUser ? 'Edit Pengguna' : 'Tambah Pengguna'}
            </h3>
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="username">
                  Username (Email)
                </label>
                <input
                  type="email" // Changed to type="email"
                  id="username"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  required
                  disabled={formLoading}
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="role">
                  Role
                </label>
                <select
                  id="role"
                  name="role"
                  value={formData.role}
                  onChange={handleInputChange}
                  className="shadow border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  required
                  disabled={formLoading}
                >
                  <option value={Role.GURU_PIKET}>Guru Piket</option>
                  <option value={Role.ADMIN}>Admin</option>
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="password">
                  Password {editingUser ? '(Kosongkan jika tidak ingin mengubah)' : ''}
                </label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(null); }}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  required={!editingUser}
                  disabled={formLoading}
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="confirmPassword">
                  Konfirmasi Password
                </label>
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); setError(null); }}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  required={!editingUser || !!password} // Required if new user or if password field is filled
                  disabled={formLoading}
                />
              </div>
              {error && <p className="text-red-500 text-xs italic mb-4">{error}</p>}
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="bg-gray-400 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-md transition-colors duration-200 disabled:opacity-50"
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

export default UserManagement;