import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [accessToken, setAccessToken] = useState(() => localStorage.getItem('accessToken') || null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type, id: Date.now() });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  useEffect(() => {
    const fetchProfile = async () => {
      if (accessToken) {
        try {
          const res = await api.get('/users/profile/');
          setUser(res.data);
          localStorage.setItem('user', JSON.stringify(res.data));
        } catch (err) {
          console.error('Failed to load user profile:', err);
        }
      }
      setLoading(false);
    };
    fetchProfile();
  }, [accessToken]);

  const login = async (username, password) => {
    try {
      const res = await api.post('/users/login/', { username, password });
      const { user: userData, access, refresh, message } = res.data;

      // Verify that user has administrative privileges
      if (!userData.is_staff && !userData.is_superuser && !['ADMIN', 'SUPER_ADMIN'].includes(userData.role)) {
        showToast('Access Denied: Only Administrator accounts can log in to Admin Portal.', 'error');
        return { success: false, error: 'Unauthorized role' };
      }

      setUser(userData);
      setAccessToken(access);
      localStorage.setItem('user', JSON.stringify(userData));
      localStorage.setItem('accessToken', access);
      localStorage.setItem('refreshToken', refresh);

      showToast(message || 'Welcome to Admin Portal!');
      return { success: true, user: userData };
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.response?.data?.detail || (err.response ? 'Invalid username or password.' : 'Cannot connect to backend server. Make sure Django backend is reachable.');
      showToast(errorMsg, 'error');
      return { success: false, error: errorMsg };
    }
  };

  const logout = () => {
    setUser(null);
    setAccessToken(null);
    localStorage.removeItem('user');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
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
        isAdmin: user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN' || user?.is_staff || user?.is_superuser,
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

