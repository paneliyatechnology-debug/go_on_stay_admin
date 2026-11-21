/**
 * Admin Staff Management Service
 * 
 * Connected to GoOnStay Backend Staff Management APIs:
 * 1. POST  /api/users/login/
 * 2. POST  /api/staff/create/
 * 3. GET   /api/staff/?department=...&status=...&search=...
 * 4. GET   /api/staff/{id}/
 * 5. PATCH /api/staff/{id}/update/
 * 6. PATCH /api/staff/{id}/status/
 * 7. GET   /api/staff/departments/
 * 8. GET   /api/staff/{id}/permissions/
 * 9. PUT   /api/staff/{id}/permissions/update/
 * 10. POST /api/staff/{id}/reset-password/
 * 11. GET  /api/staff/activities/?employee_id=...&action=...
 */

import api from './api';

export const adminStaffService = {
  /**
   * 1. Admin Login
   * POST /api/users/login/
   */
  adminLogin: async ({ email, username, password }) => {
    const payload = {
      email: email || username,
      username: username || email,
      password,
    };
    const response = await api.post('/users/login/', payload);
    return response.data;
  },

  /**
   * 2. Create Staff Account
   * POST /api/staff/create/
   * @param {Object} staffData - { first_name, last_name, email, phone_number, department, designation, permissions }
   */
  createStaff: async (staffData) => {
    let rawDept = staffData.department || (staffData.departments && staffData.departments[0]) || 'RESERVATION';
    if (typeof rawDept === 'object' && rawDept !== null) {
      rawDept = rawDept.code || rawDept.id || 'RESERVATION';
    }

    let dept = rawDept;
    if (typeof dept === 'string') {
      const upper = dept.trim().toUpperCase();
      if (upper === 'REFUND' || upper === 'REFUNDS') dept = 'REFUNDS_AND_CLAIMS';
      else if (upper === 'PAYOUT' || upper === 'PAYOUTS') dept = 'PAYOUT_AND_ESCROW';
      else if (upper === 'SUPPORT') dept = 'CUSTOMER_SUPPORT';
      else if (upper === 'VERIFICATION') dept = 'HOTEL_VERIFICATION';
      else dept = upper;
    }

    const payload = {
      first_name: (staffData.first_name || '').trim(),
      last_name: (staffData.last_name || '').trim(),
      email: (staffData.email || '').trim(),
      phone_number: (staffData.phone_number || staffData.phone || '').trim(),
      department: dept,
      designation: (staffData.designation || 'Staff Officer').trim(),
      permissions: Array.isArray(staffData.permissions) ? staffData.permissions : ['VIEW_BOOKINGS'],
    };
    const response = await api.post('/staff/create/', payload);
    return response.data;
  },

  /**
   * 3. Get Staff List with Filters
   * GET /api/staff/?department=...&status=...&search=...
   * @param {Object} params - { department, status, search, page }
   */
  getStaffList: async (params = {}) => {
    const query = new URLSearchParams();
    if (params.department && params.department !== 'ALL') {
      let deptVal = params.department;
      if (deptVal === 'REFUND') deptVal = 'REFUNDS_AND_CLAIMS';
      if (deptVal === 'PAYOUT') deptVal = 'PAYOUT_AND_ESCROW';
      query.append('department', deptVal);
    }
    if (params.status && params.status !== 'ALL') {
      query.append('status', params.status);
    }
    if (params.search && params.search.trim()) {
      query.append('search', params.search.trim());
    }
    if (params.page) {
      query.append('page', params.page);
    }

    const queryString = query.toString();
    const url = queryString ? `/staff/?${queryString}` : '/staff/';
    const response = await api.get(url);
    return response.data;
  },

  /**
   * 4. Get Staff Detail
   * GET /api/staff/{id}/
   */
  getStaffDetail: async (staffId) => {
    const response = await api.get(`/staff/${staffId}/`);
    return response.data;
  },

  /**
   * 5. Update Staff Info
   * PATCH /api/staff/{id}/update/
   * @param {number|string} staffId
   * @param {Object} updateData - { designation, phone_number, first_name, last_name, email, etc. }
   */
  updateStaff: async (staffId, updateData) => {
    const payload = { ...updateData };
    if (payload.department) {
      let dept = payload.department;
      if (typeof dept === 'string') {
        const upper = dept.trim().toUpperCase();
        if (upper === 'REFUND' || upper === 'REFUNDS') dept = 'REFUNDS_AND_CLAIMS';
        else if (upper === 'PAYOUT' || upper === 'PAYOUTS') dept = 'PAYOUT_AND_ESCROW';
        else if (upper === 'SUPPORT') dept = 'CUSTOMER_SUPPORT';
        else if (upper === 'VERIFICATION') dept = 'HOTEL_VERIFICATION';
        else dept = upper;
      }
      payload.department = dept;
    }
    const response = await api.patch(`/staff/${staffId}/update/`, payload);
    return response.data;
  },

  /**
   * 6. Update Staff Account Status (Active, Inactive, Suspended)
   * PATCH /api/staff/{id}/status/
   * @param {number|string} staffId
   * @param {Object} statusData - { status: 'ACTIVE'|'INACTIVE'|'SUSPENDED', reason: string }
   */
  updateStaffStatus: async (staffId, { status, reason = '' }) => {
    const canonicalStatus = String(status || 'ACTIVE').trim().toUpperCase();
    const response = await api.patch(`/staff/${staffId}/status/`, {
      status: canonicalStatus,
      reason: reason || `Status updated to ${canonicalStatus} by admin`,
    });
    return response.data;
  },

  /**
   * 7. Get All Departments
   * GET /api/staff/departments/
   */
  getDepartments: async () => {
    const response = await api.get('/staff/departments/');
    return response.data;
  },

  /**
   * 8. Get Staff Permissions
   * GET /api/staff/{id}/permissions/
   */
  getStaffPermissions: async (staffId) => {
    const response = await api.get(`/staff/${staffId}/permissions/`);
    return response.data;
  },

  /**
   * 9. Update Staff Permissions
   * PUT /api/staff/{id}/permissions/update/
   * @param {number|string} staffId
   * @param {Array<string>} permissions - e.g. ["VIEW_BOOKINGS", "CREATE_BOOKINGS", "EDIT_BOOKINGS"]
   */
  updateStaffPermissions: async (staffId, permissions) => {
    const payload = Array.isArray(permissions) ? { permissions } : permissions;
    const response = await api.put(`/staff/${staffId}/permissions/update/`, payload);
    return response.data;
  },

  /**
   * 10. Admin Reset Staff Password
   * POST /api/staff/{id}/reset-password/
   */
  resetStaffPassword: async (staffId) => {
    const response = await api.post(`/staff/${staffId}/reset-password/`);
    return response.data;
  },

  /**
   * 11. Get Staff Activity Logs
   * GET /api/staff/activities/?employee_id=...&action=...
   * @param {Object} params - { employee_id, action, page }
   */
  getStaffActivities: async (params = {}) => {
    const query = new URLSearchParams();
    if (params.employee_id) query.append('employee_id', params.employee_id);
    if (params.action) query.append('action', params.action);
    if (params.page) query.append('page', params.page);

    const queryString = query.toString();
    const url = queryString ? `/staff/activities/?${queryString}` : '/staff/activities/';
    const response = await api.get(url);
    return response.data;
  },

  /**
   * 12. Permanently Delete Staff Member
   * Direct call to backend account deletion endpoint:
   * DELETE /api/users/{userId}/delete/
   * @param {number|string} staffId
   * @param {number|string} userId
   */
  deleteStaff: async (staffId, userId) => {
    const targetUserId = userId || staffId;
    try {
      const response = await api.delete(`/users/${targetUserId}/delete/`);
      return response.data;
    } catch (err) {
      if (err.response?.status === 404 && staffId) {
        const res2 = await api.delete(`/staff/${staffId}/`);
        return res2.data;
      }
      throw err;
    }
  },
};

export default adminStaffService;
