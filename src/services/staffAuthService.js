/**
 * Staff Authentication & Profile Service
 * 
 * Connected to GoOnStay Backend Staff API Endpoints:
 * 1. POST /api/staff/login/
 * 2. GET  /api/staff/me/
 * 3. POST /api/staff/change-password/
 * 4. POST /api/staff/forgot-password/
 * 5. POST /api/staff/reset-password/
 * 6. POST /api/staff/logout/
 */

import api from './api';

export const staffAuthService = {
  /**
   * 1. Staff Login
   * POST /api/staff/login/
   * @param {Object} credentials - { identifier, username, password }
   */
  login: async ({ identifier, username, password }) => {
    const loginIdentifier = identifier || username;
    const payload = {
      identifier: loginIdentifier,
      username: loginIdentifier,
      login_id: loginIdentifier,
      password,
    };
    const response = await api.post('/staff/login/', payload);
    return response.data;
  },

  /**
   * 2. Staff Me / Current Profile
   * GET /api/staff/me/
   * Requires Bearer access token (automatically attached by api interceptor)
   */
  getMe: async () => {
    const response = await api.get('/staff/me/');
    return response.data;
  },

  /**
   * 3. Change Staff Password
   * POST /api/staff/change-password/
   * @param {Object} payload - { old_password, new_password, confirm_password }
   */
  changePassword: async ({ old_password, new_password, confirm_password }) => {
    const payload = {
      old_password,
      new_password,
      confirm_password,
      password_confirm: confirm_password,
    };
    const response = await api.post('/staff/change-password/', payload);
    return response.data;
  },

  /**
   * 4. Forgot Staff Password
   * POST /api/staff/forgot-password/
   * @param {string|Object} identifier - Staff Login ID or registered email
   */
  forgotPassword: async (identifier) => {
    const payload = typeof identifier === 'object' ? identifier : { identifier };
    const response = await api.post('/staff/forgot-password/', payload);
    return response.data;
  },

  /**
   * 5. Reset Staff Password
   * POST /api/staff/reset-password/
   * @param {Object} payload - { token, new_password, confirm_password }
   */
  resetPassword: async ({ token, new_password, confirm_password }) => {
    const payload = {
      token,
      new_password,
      confirm_password,
      password_confirm: confirm_password,
    };
    const response = await api.post('/staff/reset-password/', payload);
    return response.data;
  },

  /**
   * 6. Staff Logout
   * POST /api/staff/logout/
   * @param {string} refreshToken - JWT Refresh token string
   */
  logout: async (refreshToken) => {
    try {
      const token = refreshToken || localStorage.getItem('refreshToken');
      if (token) {
        const response = await api.post('/staff/logout/', { refresh: token });
        return response.data;
      }
    } catch (err) {
      console.warn('Staff backend logout notice:', err);
    }
    return { success: true };
  },
};

export default staffAuthService;
