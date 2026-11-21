import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';
import staffAuthService from '../services/staffAuthService';
import { parseApiError } from '../utils/errorHandler';
import {
  isAdminUser,
  isStaffUser,
  getUserPermissions,
  hasPermission,
  getAllowedTabs,
  isTabAllowed,
  getDefaultTabForUser,
} from '../utils/permissionUtils';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const sessionActive = sessionStorage.getItem('session_active');
    if (!sessionActive) {
      localStorage.removeItem('user');
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      return null;
    }
    const savedUser = localStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [accessToken, setAccessToken] = useState(() => {
    const sessionActive = sessionStorage.getItem('session_active');
    if (!sessionActive) return null;
    return localStorage.getItem('accessToken') || null;
  });
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type, id: Date.now() });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  // 1. Initial Profile Verification on boot (supports both Admin /users/profile/ and Staff /api/staff/me/)
  useEffect(() => {
    let isMounted = true;
    const fetchProfile = async () => {
      if (accessToken) {
        try {
          // If stored user was already flagged as staff, check /api/staff/me/ first
          const savedUser = localStorage.getItem('user');
          const parsedSaved = savedUser ? JSON.parse(savedUser) : null;

          if (parsedSaved?.isStaff || parsedSaved?.role === 'STAFF') {
            try {
              const staffRes = await staffAuthService.getMe();
              if (isMounted && staffRes) {
                const rawProfile = staffRes.staff_profile || staffRes.user || staffRes.staff || staffRes;
                const normStaff = {
                  ...rawProfile,
                  isStaff: true,
                  role: rawProfile.role || 'STAFF',
                  department_name: rawProfile.department_name,
                  department_code: rawProfile.department_code,
                  departments: rawProfile.departments || (rawProfile.department_code ? [rawProfile.department_code] : []),
                  permissions: rawProfile.permissions || [],
                  must_change_password: !!(staffRes.must_change_password || rawProfile.must_change_password),
                };
                setUser(normStaff);
                localStorage.setItem('user', JSON.stringify(normStaff));
                setLoading(false);
                return;
              }
            } catch (staffErr) {
              console.warn('Staff /me/ fetch error, attempting fallback:', staffErr);
            }
          }

          // Try standard admin profile endpoint
          const res = await api.get('/users/profile/');
          if (isMounted) {
            setUser(res.data);
            localStorage.setItem('user', JSON.stringify(res.data));
          }
        } catch (err) {
          // Fallback check to /api/staff/me/ in case admin endpoint fails with 403
          try {
            const staffData = await staffAuthService.getMe();
            if (isMounted && staffData) {
              const normStaff = {
                ...staffData,
                isStaff: true,
                role: staffData.role || 'STAFF',
                departments: staffData.departments || staffData.department_list || [],
                permissions: staffData.permissions || [],
              };
              setUser(normStaff);
              localStorage.setItem('user', JSON.stringify(normStaff));
              setLoading(false);
              return;
            }
          } catch (staffFallbackErr) {
            console.warn('Backend server unreachable or session expired. Clearing credentials:', err, staffFallbackErr);
          }

          if (isMounted) {
            setUser(null);
            setAccessToken(null);
            localStorage.removeItem('user');
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            sessionStorage.clear();
          }
        }
      }
      if (isMounted) {
        setLoading(false);
      }
    };
    fetchProfile();
    return () => { isMounted = false; };
  }, [accessToken]);

  // 2. Listen for Server Disconnection events triggered by Axios interceptor
  useEffect(() => {
    const handleServerDisconnected = () => {
      setUser(null);
      setAccessToken(null);
      localStorage.removeItem('user');
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      sessionStorage.clear();
      showToast('Backend server disconnected. Please log in again once server is running.', 'warning');
    };

    window.addEventListener('auth:server-disconnected', handleServerDisconnected);
    return () => window.removeEventListener('auth:server-disconnected', handleServerDisconnected);
  }, []);

  /**
   * Unified Login:
   * Supports both Admin (/api/users/login/) and Staff (/api/staff/login/)
   * 1 common login form, automatically identifying account type.
   */
  const login = async (identifier, password) => {
    const cleanId = (identifier || '').trim();

    // 1. Attempt Admin Login first
    let adminErr = null;
    try {
      const res = await api.post('/users/login/', { username: cleanId, password });
      const { user: userData, access, refresh, message } = res.data;

      // Check if user has administrative clearance
      if (userData.is_staff || userData.is_superuser || ['ADMIN', 'SUPER_ADMIN'].includes(userData.role)) {
        setUser(userData);
        setAccessToken(access);
        localStorage.setItem('user', JSON.stringify(userData));
        localStorage.setItem('accessToken', access);
        localStorage.setItem('refreshToken', refresh);
        sessionStorage.setItem('session_active', 'true');

        showToast(message || 'Welcome to Admin Portal!');
        return { success: true, user: userData, role: userData.role, isStaff: false };
      }
    } catch (err) {
      adminErr = err;
    }

    // 2. If Admin login failed or returned non-admin role, seamlessly attempt Staff Login (/api/staff/login/)
    try {
      const staffRes = await staffAuthService.login({
        identifier: cleanId,
        username: cleanId,
        password,
      });

      const access = staffRes.access || staffRes.access_token || staffRes.token;
      const refresh = staffRes.refresh || staffRes.refresh_token;
      const rawProfile = staffRes.staff_profile || staffRes.user || staffRes.staff || staffRes.data || staffRes;

      const normalizedStaff = {
        ...rawProfile,
        isStaff: true,
        role: rawProfile.role || 'STAFF',
        employee_id: rawProfile.employee_id || rawProfile.employeeId,
        login_id: rawProfile.login_id || rawProfile.loginId || cleanId,
        department_name: rawProfile.department_name,
        department_code: rawProfile.department_code,
        departments: rawProfile.departments || (rawProfile.department_code ? [rawProfile.department_code] : []),
        permissions: rawProfile.permissions || [],
        must_change_password: !!(staffRes.must_change_password || rawProfile.must_change_password || staffRes.is_temporary_password),
      };

      setUser(normalizedStaff);
      setAccessToken(access);
      localStorage.setItem('user', JSON.stringify(normalizedStaff));
      if (access) localStorage.setItem('accessToken', access);
      if (refresh) localStorage.setItem('refreshToken', refresh);
      sessionStorage.setItem('session_active', 'true');

      showToast(staffRes.message || `Welcome, ${normalizedStaff.full_name || normalizedStaff.username || 'Staff'}!`);
      return { 
        success: true, 
        user: normalizedStaff, 
        role: 'STAFF', 
        isStaff: true,
        mustChangePassword: normalizedStaff.must_change_password
      };
    } catch (staffErr) {
      console.error('Unified login error:', { adminErr, staffErr });
      const parsed = parseApiError(
        staffErr?.response?.data ? staffErr : (adminErr?.response?.data ? adminErr : staffErr),
        'Authentication failed. Please verify your Login ID and password.'
      );
      showToast(parsed.message, 'error');
      return { success: false, error: parsed.message, fieldErrors: parsed.fieldErrors };
    }
  };

  /**
   * Unified Logout:
   * Cleans up local session and notifies backend via /api/staff/logout/ if staff
   */
  const logout = async () => {
    try {
      const refresh = localStorage.getItem('refreshToken');
      if (user?.isStaff && refresh) {
        await staffAuthService.logout(refresh);
      }
    } catch (e) {
      console.warn('Backend logout notification failed:', e);
    }
    setUser(null);
    setAccessToken(null);
    localStorage.removeItem('user');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    sessionStorage.clear();
    showToast('Logged out successfully.');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        loading,
        toast,
        showToast,
        login,
        logout,
        isAuthenticated: !!user,
        isAdmin: isAdminUser(user),
        isStaff: isStaffUser(user),
        hasPermission: (permKey) => hasPermission(user, permKey),
        allowedTabs: getAllowedTabs(user),
        isTabAllowed: (tabId) => isTabAllowed(user, tabId),
        defaultTab: getDefaultTabForUser(user),
        userPermissions: getUserPermissions(user),
        staffAuthService,
        changeStaffPassword: staffAuthService.changePassword,
        forgotStaffPassword: staffAuthService.forgotPassword,
        resetStaffPassword: staffAuthService.resetPassword,
        getStaffMe: staffAuthService.getMe,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
