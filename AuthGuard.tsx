import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth, useHasRole } from './AuthContext.tsx';
import { Role } from '../types.ts';

interface AuthGuardProps {
  allowedRoles?: Role[];
}

const AuthGuard: React.FC<AuthGuardProps> = ({ allowedRoles }) => {
  const { user } = useAuth();
  const location = useLocation();
  const hasRequiredRole = useHasRole(allowedRoles || []);

  if (!user) {
    // Redirect to login if not authenticated
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !hasRequiredRole) {
    // Redirect to a forbidden page or root if not authorized
    return (
      <div className="flex items-center justify-center min-h-screen bg-red-100">
        <div className="text-center p-8 bg-white rounded-lg shadow-lg">
          <h2 className="text-2xl font-bold text-red-700 mb-4">Akses Ditolak</h2>
          <p className="text-gray-700">Anda tidak memiliki izin untuk mengakses halaman ini.</p>
          <Navigate to="/" replace />
        </div>
      </div>
    );
  }

  return <Outlet />;
};

export default AuthGuard;