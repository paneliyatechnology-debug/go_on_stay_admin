import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, allowedRoles = ['ADMIN', 'SUPER_ADMIN'] }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-red-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-medium text-slate-400">Verifying Admin Access...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const hasAccess = 
    user.is_superuser || 
    user.is_staff || 
    (allowedRoles && allowedRoles.includes(user.role));

  if (!hasAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-900 p-6">
        <div className="bg-white p-8 rounded-2xl max-w-md text-center border border-slate-200 shadow-xl space-y-4">
          <div className="w-14 h-14 bg-red-50 border border-red-200 text-red-600 rounded-2xl flex items-center justify-center mx-auto text-2xl font-black">
            !
          </div>
          <h2 className="text-2xl font-black text-slate-900">Admin Privileges Required</h2>
          <p className="text-slate-600 text-xs leading-relaxed">
            Your account ({user.username || user.email}) has role <code className="bg-slate-100 px-1 py-0.5 rounded font-mono font-bold text-red-600">{user.role}</code> which does not have Master Admin clearance.
          </p>
          <div className="pt-2">
            <button
              onClick={() => {
                localStorage.clear();
                window.location.href = '/login';
              }}
              className="w-full py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition-colors"
            >
              Sign In with Admin Account
            </button>
          </div>
        </div>
      </div>
    );
  }

  return children;
};

export default ProtectedRoute;

