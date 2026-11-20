/**
 * GoOnStay Staff Operations Service (Admin Portal)
 * 
 * Provides unified API clients for all staff operational departments:
 * 1. Staff Dashboard Overview:
 *    - GET /api/staff/dashboard/
 * 2. Reservation Department:
 *    - GET /api/staff/bookings/?q=...&status=...&page=...
 *    - GET /api/staff/bookings/{id}/
 * 3. Refunds & Claims Department:
 *    - GET  /api/staff/refunds/?status=...
 *    - GET  /api/staff/refunds/{id}/
 *    - POST /api/staff/refunds/{id}/process/
 *    - GET  /api/staff/refunds/history/
 * 4. Payouts & Escrow Department:
 *    - GET  /api/staff/payouts/?status=...
 *    - GET  /api/staff/payouts/{id}/
 *    - POST /api/staff/payouts/{id}/process/
 *    - GET  /api/staff/payouts/history/
 * 5. Customer Support Department:
 *    - GET   /api/staff/support/?status=...&priority=...
 *    - GET   /api/staff/support/{id}/
 *    - PATCH /api/staff/support/{id}/update/
 *    - POST  /api/staff/support/{id}/notes/
 * 6. Hotel Verification & Compliance Department:
 *    - GET  /api/staff/verifications/?status=...
 *    - GET  /api/staff/verifications/{id}/
 *    - POST /api/staff/verifications/{id}/approve/
 *    - POST /api/staff/verifications/{id}/reject/
 * 7. Staff Notifications:
 *    - GET  /api/staff/notifications/?unread_only=true
 *    - POST /api/staff/notifications/{id}/read/
 *    - POST /api/staff/notifications/read-all/
 */

import api from './api';

export const staffOperationsService = {
  // ==========================================
  // 1. Staff Dashboard Overview
  // ==========================================
  /**
   * Retrieve staff dashboard metrics across all departments
   * GET /api/staff/dashboard/
   */
  getStaffDashboard: async () => {
    const response = await api.get('/staff/dashboard/');
    return response.data;
  },

  // ==========================================
  // 2. Reservation Department (Bookings)
  // ==========================================
  /**
   * Get filtered staff bookings list
   * GET /api/staff/bookings/?q=...&status=...&page=...
   * @param {Object} params - { q, status, page, page_size }
   */
  getBookings: async (params = {}) => {
    const response = await api.get('/staff/bookings/', { params });
    return response.data;
  },

  /**
   * Get single booking detail
   * GET /api/staff/bookings/{id}/
   * @param {string|number} id
   */
  getBookingDetail: async (id) => {
    const response = await api.get(`/staff/bookings/${id}/`);
    return response.data;
  },

  // ==========================================
  // 3. Refunds & Claims Department
  // ==========================================
  /**
   * Get staff refund requests
   * GET /api/staff/refunds/?status=...
   * @param {Object} params - { status, page, page_size }
   */
  getRefunds: async (params = {}) => {
    const response = await api.get('/staff/refunds/', { params });
    return response.data;
  },

  /**
   * Get refund request details by ID
   * GET /api/staff/refunds/{id}/
   * @param {string|number} id
   */
  getRefundDetail: async (id) => {
    const response = await api.get(`/staff/refunds/${id}/`);
    return response.data;
  },

  /**
   * Process refund request
   * POST /api/staff/refunds/{id}/process/
   * @param {string|number} id
   * @param {Object} payload - { notes }
   */
  processRefund: async (id, { notes = '' } = {}) => {
    const response = await api.post(`/staff/refunds/${id}/process/`, { notes });
    return response.data;
  },

  /**
   * Get past processed refunds history
   * GET /api/staff/refunds/history/
   */
  getRefundHistory: async (params = {}) => {
    const response = await api.get('/staff/refunds/history/', { params });
    return response.data;
  },

  // ==========================================
  // 4. Payouts & Escrow Department
  // ==========================================
  /**
   * Get staff payouts list
   * GET /api/staff/payouts/?status=...
   * @param {Object} params - { status, page, page_size }
   */
  getPayouts: async (params = {}) => {
    const response = await api.get('/staff/payouts/', { params });
    return response.data;
  },

  /**
   * Get single payout request detail
   * GET /api/staff/payouts/{id}/
   * @param {string|number} id
   */
  getPayoutDetail: async (id) => {
    const response = await api.get(`/staff/payouts/${id}/`);
    return response.data;
  },

  /**
   * Process host settlement payout
   * POST /api/staff/payouts/{id}/process/
   * @param {string|number} id
   * @param {Object} payload - { notes, transaction_id }
   */
  processPayout: async (id, { notes = '', transaction_id = '' } = {}) => {
    const response = await api.post(`/staff/payouts/${id}/process/`, {
      notes,
      transaction_id,
    });
    return response.data;
  },

  /**
   * Get payout disbursement history
   * GET /api/staff/payouts/history/
   */
  getPayoutHistory: async (params = {}) => {
    const response = await api.get('/staff/payouts/history/', { params });
    return response.data;
  },

  // ==========================================
  // 5. Customer Support Department
  // ==========================================
  /**
   * Get support tickets list
   * GET /api/staff/support/?status=...&priority=...
   * @param {Object} params - { status, priority, page, page_size }
   */
  getSupportTickets: async (params = {}) => {
    const response = await api.get('/staff/support/', { params });
    return response.data;
  },

  /**
   * Get support ticket details
   * GET /api/staff/support/{id}/
   * @param {string|number} id
   */
  getSupportDetail: async (id) => {
    const response = await api.get(`/staff/support/${id}/`);
    return response.data;
  },

  /**
   * Update support ticket status and priority
   * PATCH /api/staff/support/{id}/update/
   * @param {string|number} id
   * @param {Object} payload - { status, priority }
   */
  updateSupportTicket: async (id, { status, priority } = {}) => {
    const response = await api.patch(`/staff/support/${id}/update/`, {
      status,
      priority,
    });
    return response.data;
  },

  /**
   * Add internal staff note to support ticket
   * POST /api/staff/support/{id}/notes/
   * @param {string|number} id
   * @param {Object} payload - { note }
   */
  addSupportNote: async (id, { note } = {}) => {
    const response = await api.post(`/staff/support/${id}/notes/`, { note });
    return response.data;
  },

  // ==========================================
  // 6. Hotel Verification & Compliance Department
  // ==========================================
  /**
   * Get pending or submitted hotel verification requests
   * GET /api/staff/verifications/?status=...
   * @param {Object} params - { status, page, page_size }
   */
  getVerifications: async (params = {}) => {
    const response = await api.get('/staff/verifications/', { params });
    return response.data;
  },

  /**
   * Get hotel verification details and uploaded documents
   * GET /api/staff/verifications/{id}/
   * @param {string|number} id
   */
  getVerificationDetail: async (id) => {
    const response = await api.get(`/staff/verifications/${id}/`);
    return response.data;
  },

  /**
   * Approve hotel compliance verification
   * POST /api/staff/verifications/{id}/approve/
   * @param {string|number} id
   * @param {Object} payload - { notes }
   */
  approveVerification: async (id, { notes = '' } = {}) => {
    const response = await api.post(`/staff/verifications/${id}/approve/`, { notes });
    return response.data;
  },

  /**
   * Reject hotel compliance verification
   * POST /api/staff/verifications/{id}/reject/
   * @param {string|number} id
   * @param {Object} payload - { reason }
   */
  rejectVerification: async (id, { reason = '' } = {}) => {
    const response = await api.post(`/staff/verifications/${id}/reject/`, { reason });
    return response.data;
  },

  // ==========================================
  // 7. Staff Notifications
  // ==========================================
  /**
   * Get staff notifications
   * GET /api/staff/notifications/?unread_only=true
   * @param {Object} params - { unread_only, page, page_size }
   */
  getNotifications: async (params = {}) => {
    const response = await api.get('/staff/notifications/', { params });
    return response.data;
  },

  /**
   * Mark individual notification as read
   * POST /api/staff/notifications/{id}/read/
   * @param {string|number} id
   */
  markNotificationRead: async (id) => {
    const response = await api.post(`/staff/notifications/${id}/read/`);
    return response.data;
  },

  /**
   * Mark all staff notifications as read
   * POST /api/staff/notifications/read-all/
   */
  markAllNotificationsRead: async () => {
    const response = await api.post('/staff/notifications/read-all/');
    return response.data;
  },
};

export default staffOperationsService;
