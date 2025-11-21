import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext.tsx';
import { Role } from '../types.ts';

interface SidebarProps {
  isOpen: boolean;
  toggleSidebar: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, toggleSidebar }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = [
    { name: 'Dashboard', path: '/', roles: [Role.ADMIN, Role.GURU_PIKET] },
    { name: 'Manajemen Siswa', path: '/students', roles: [Role.ADMIN, Role.GURU_PIKET] },
    { name: 'Pencatatan Pelanggaran', path: '/violations', roles: [Role.ADMIN, Role.GURU_PIKET] },
    { name: 'Manajemen Pengguna', path: '/users', roles: [Role.ADMIN] },
    { name: 'Laporan', path: '/reports', roles: [Role.ADMIN, Role.GURU_PIKET] },
  ];

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden"
          onClick={toggleSidebar}
        ></div>
      )}

      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-gradient-to-br from-indigo-800 to-blue-700 text-white shadow-xl z-30 transform ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0 transition-transform duration-300 ease-in-out`}
      >
        <div className="p-6 border-b border-indigo-600">
          <h1 className="text-2xl font-bold text-center">SPPS</h1>
          <p className="text-sm text-center text-indigo-200">{user?.role === Role.ADMIN ? 'Admin' : 'Guru Piket'}</p>
        </div>
        <nav className="mt-8">
          <ul>
            {navItems.map((item) =>
              user && item.roles.includes(user.role) ? (
                <li key={item.path} className="mb-2">
                  <Link
                    to={item.path}
                    onClick={toggleSidebar}
                    className="flex items-center px-6 py-3 text-lg font-medium hover:bg-indigo-700 hover:text-gray-100 rounded-lg mx-3 transition-colors duration-200"
                  >
                    {/* Placeholder icons */}
                    <span className="mr-3">
                      {item.name === 'Dashboard' && '🏠'}
                      {item.name === 'Manajemen Siswa' && '🧑‍🎓'}
                      {item.name === 'Pencatatan Pelanggaran' && '📝'}
                      {item.name === 'Manajemen Pengguna' && '👥'}
                      {item.name === 'Laporan' && '📊'}
                    </span>
                    {item.name}
                  </Link>
                </li>
              ) : null
            )}
            <li className="mt-8">
              <button
                onClick={handleLogout}
                className="flex items-center px-6 py-3 text-lg font-medium w-full text-left text-red-300 hover:bg-indigo-700 hover:text-red-100 rounded-lg mx-3 transition-colors duration-200"
              >
                <span className="mr-3">🚪</span> Logout
              </button>
            </li>
          </ul>
        </nav>
      </aside>
    </>
  );
};

export default Sidebar;