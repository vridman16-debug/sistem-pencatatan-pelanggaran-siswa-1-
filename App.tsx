import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './components/AuthContext.tsx';
import AuthGuard from './components/AuthGuard.tsx';
import LoginForm from './components/LoginForm.tsx';
import Sidebar from './components/Sidebar.tsx';
import Header from './components/Header.tsx';
import StudentManagement from './components/StudentManagement.tsx';
import ViolationRecording from './components/ViolationRecording.tsx';
import UserManagement from './components/UserManagement.tsx';
import ReportGenerator from './components/ReportGenerator.tsx';
import { Role } from './types.ts';
import { studentService } from './services/studentService.ts';
import { violationService } from './services/violationService.ts';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [totalStudents, setTotalStudents] = useState(0);
  const [studentsWithViolations, setStudentsWithViolations] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      setError(null);
      try {
        const allStudents = await studentService.getAllStudents();
        const allViolations = await violationService.getAllViolations();

        const uniqueStudentsWithViolations = new Set(allViolations.map(v => v.studentId));

        setTotalStudents(allStudents.length);
        setStudentsWithViolations(uniqueStudentsWithViolations.size);
      } catch (err: any) {
        setError(err.message || "Gagal memuat data dashboard.");
        console.error("Error fetching dashboard data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const percentage = totalStudents > 0 ? (studentsWithViolations / totalStudents) * 100 : 0;
  const gradientPercentage = `${percentage}%`;

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-3xl font-bold text-gray-800 mb-4">Dashboard</h2>
      <p className="text-gray-700">Selamat datang, {user?.username} ({user?.role === Role.ADMIN ? 'Admin' : 'Guru Piket'})!</p>
      <p className="mt-2 text-gray-600 mb-8">Gunakan menu di samping untuk navigasi.</p>

      <div className="border-t pt-8 mt-8 border-gray-200 text-center">
        <h3 className="text-2xl font-semibold text-gray-800 mb-6">Statistik Pelanggaran Siswa</h3>
        {loading ? (
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            <p className="ml-4 text-gray-600">Memuat statistik...</p>
          </div>
        ) : error ? (
          <p className="text-red-600 text-lg">{error}</p>
        ) : (
          <>
            {totalStudents === 0 && studentsWithViolations === 0 ? (
              <p className="text-gray-600 text-lg">Tidak ada data siswa atau pelanggaran untuk ditampilkan.</p>
            ) : (
              <div className="flex flex-col items-center justify-center">
                <div
                  className="relative w-48 h-48 rounded-full flex items-center justify-center text-3xl font-bold text-blue-700"
                  style={{
                    background: `conic-gradient(#2563EB ${gradientPercentage}, #DBEAFE ${gradientPercentage})`, /* blue-600 and blue-100 */
                    boxShadow: 'inset 0 0 0 10px #ffffff', /* inner border */
                  }}
                  role="progressbar"
                  aria-valuenow={percentage}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`Persentase siswa dengan pelanggaran: ${percentage.toFixed(1)}%`}
                >
                  <div className="absolute w-40 h-40 bg-white rounded-full flex items-center justify-center">
                    {percentage.toFixed(1)}%
                  </div>
                </div>
                <p className="mt-4 text-xl font-medium text-gray-700">Siswa dengan Pelanggaran</p>
                <p className="text-gray-500 text-sm mt-1">({studentsWithViolations} dari {totalStudents} siswa)</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

const AppContent: React.FC = () => {
  const { user } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <div className="flex min-h-screen bg-gray-100">
      {user && <Sidebar isOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />}
      <div className={`flex-1 flex flex-col transition-all duration-300 ${user ? 'md:ml-64' : 'ml-0'}`}>
        {user && <Header toggleSidebar={toggleSidebar} />}
        <main className={`flex-1 p-6 ${user ? 'mt-16 md:mt-20' : 'mt-0'}`}>
          <Routes>
            <Route path="/login" element={<LoginForm />} />

            {/* Authenticated routes */}
            <Route element={<AuthGuard />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/students" element={<StudentManagement />} />
              <Route path="/violations" element={<ViolationRecording />} />
              <Route path="/reports" element={<ReportGenerator />} />
            </Route>

            {/* Admin-only routes */}
            <Route element={<AuthGuard allowedRoles={[Role.ADMIN]} />}>
              <Route path="/users" element={<UserManagement />} />
            </Route>

            {/* Fallback for unknown paths */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <HashRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </HashRouter>
  );
};

export default App;