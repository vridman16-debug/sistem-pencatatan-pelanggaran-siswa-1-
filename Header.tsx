import React from 'react';

interface HeaderProps {
  toggleSidebar: () => void;
}

const Header: React.FC<HeaderProps> = ({ toggleSidebar }) => {
  return (
    <header className="fixed top-0 left-0 right-0 md:left-64 bg-white shadow-md p-4 flex items-center justify-between z-10 md:z-20">
      <button
        onClick={toggleSidebar}
        className="text-gray-600 md:hidden p-2 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M4 6h16M4 12h16m-7 6h7"
          ></path>
        </svg>
      </button>
      <h2 className="text-xl font-semibold text-gray-800 ml-4 md:ml-0">Sistem Pencatatan Pelanggaran Siswa</h2>
      {/* Could add user info or other elements here */}
      <div className="md:w-64"></div> {/* Placeholder to align title in center for larger screens */}
    </header>
  );
};

export default Header;
