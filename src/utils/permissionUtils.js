/**
 * GoOnStay Centralized Role & Permission Access Control Utility
 * 
 * Enforces dynamic, backend-governed Role-Based Access Control (RBAC) across:
 * - Admin Login & Session Identity
 * - Sidebar Navigation Menus
 * - Direct URL Subtab Access Guards
 * - Sensitive Action Buttons & Operations
 * - Dashboard KPI & Analytics Widgets
 */

export const DEPARTMENTS = {
  RESERVATION: 'RESERVATION',
  CUSTOMER_SUPPORT: 'CUSTOMER_SUPPORT',
  REFUND: 'REFUND',
  REFUNDS_AND_CLAIMS: 'REFUNDS_AND_CLAIMS',
  PAYOUT: 'PAYOUT',
  PAYOUT_AND_ESCROW: 'PAYOUT_AND_ESCROW',
  HOTEL_VERIFICATION: 'HOTEL_VERIFICATION',
};

// Department labels for clean UI display
export const DEPARTMENT_LABELS = {
  RESERVATION: 'Reservation Desk',
  CUSTOMER_SUPPORT: 'Customer Support',
  REFUND: 'Refunds & Claims',
  REFUNDS_AND_CLAIMS: 'Refunds & Claims',
  PAYOUT: 'Payouts & Escrow',
  PAYOUT_AND_ESCROW: 'Payouts & Escrow',
  HOTEL_VERIFICATION: 'Hotel Compliance',
};

// Default operational permissions granted by backend to each department
export const DEFAULT_DEPARTMENT_PERMISSIONS = {
  RESERVATION: [
    'can_view_bookings',
    'can_view_customer_contacts',
    'can_view_hotel_contacts'
  ],
  CUSTOMER_SUPPORT: [
    'can_view_bookings',
    'can_manage_tickets',
    'can_view_customer_contacts'
  ],
  REFUND: [
    'can_view_bookings',
    'can_process_refunds'
  ],
  REFUNDS_AND_CLAIMS: [
    'can_view_bookings',
    'can_process_refunds'
  ],
  PAYOUT: [
    'can_view_settlements',
    'can_process_payouts'
  ],
  PAYOUT_AND_ESCROW: [
    'can_view_settlements',
    'can_process_payouts'
  ],
  HOTEL_VERIFICATION: [
    'can_verify_hotels',
    'can_view_audit_logs'
  ],
};

// Canonical mapping for permissions coming in various formats (uppercase / snake_case)
export const PERMISSION_ALIASES = {
  // Bookings
  'view_bookings': 'can_view_bookings',
  'view_booking': 'can_view_bookings',
  'can_view_bookings': 'can_view_bookings',
  'bookings': 'can_view_bookings',
  'VIEW_BOOKINGS': 'can_view_bookings',
  'CAN_VIEW_BOOKINGS': 'can_view_bookings',

  // Customer contacts
  'view_customer_contacts': 'can_view_customer_contacts',
  'can_view_customer_contacts': 'can_view_customer_contacts',
  'customer_contacts': 'can_view_customer_contacts',
  'VIEW_CUSTOMER_CONTACTS': 'can_view_customer_contacts',
  'CAN_VIEW_CUSTOMER_CONTACTS': 'can_view_customer_contacts',

  // Hotel contacts
  'view_hotel_contacts': 'can_view_hotel_contacts',
  'can_view_hotel_contacts': 'can_view_hotel_contacts',
  'hotel_contacts': 'can_view_hotel_contacts',
  'VIEW_HOTEL_CONTACTS': 'can_view_hotel_contacts',
  'CAN_VIEW_HOTEL_CONTACTS': 'can_view_hotel_contacts',

  // Support tickets
  'manage_tickets': 'can_manage_tickets',
  'can_manage_tickets': 'can_manage_tickets',
  'support_tickets': 'can_manage_tickets',
  'MANAGE_TICKETS': 'can_manage_tickets',
  'CAN_MANAGE_TICKETS': 'can_manage_tickets',

  // Refunds
  'process_refunds': 'can_process_refunds',
  'can_process_refunds': 'can_process_refunds',
  'refunds': 'can_process_refunds',
  'PROCESS_REFUNDS': 'can_process_refunds',
  'CAN_PROCESS_REFUNDS': 'can_process_refunds',

  // Payouts & Escrow
  'process_payouts': 'can_process_payouts',
  'can_process_payouts': 'can_process_payouts',
  'payouts': 'can_process_payouts',
  'PROCESS_PAYOUTS': 'can_process_payouts',
  'CAN_PROCESS_PAYOUTS': 'can_process_payouts',

  // Hotel verification
  'verify_hotels': 'can_verify_hotels',
  'can_verify_hotels': 'can_verify_hotels',
  'hotel_verification': 'can_verify_hotels',
  'HOTEL_VERIFICATION': 'can_verify_hotels',
  'VERIFY_HOTELS': 'can_verify_hotels',
  'CAN_VERIFY_HOTELS': 'can_verify_hotels',
  'VIEW_HOTELS': 'can_verify_hotels',
  'view_hotels': 'can_verify_hotels',
  'VERIFY_HOTEL': 'can_verify_hotels',
  'verify_hotel': 'can_verify_hotels',
  'APPROVE_HOTEL': 'can_verify_hotels',
  'approve_hotel': 'can_verify_hotels',

  // Settlements
  'view_settlements': 'can_view_settlements',
  'can_view_settlements': 'can_view_settlements',
  'settlements': 'can_view_settlements',
  'VIEW_SETTLEMENTS': 'can_view_settlements',
  'CAN_VIEW_SETTLEMENTS': 'can_view_settlements',

  // Audit logs
  'view_audit_logs': 'can_view_audit_logs',
  'can_view_audit_logs': 'can_view_audit_logs',
  'audit_logs': 'can_view_audit_logs',
  'VIEW_AUDIT_LOGS': 'can_view_audit_logs',
  'CAN_VIEW_AUDIT_LOGS': 'can_view_audit_logs',
};

/**
 * Check if the user is a full Master / Super Admin
 */
export const isAdminUser = (user) => {
  if (!user) return false;
  return (
    user.is_superuser === true ||
    user.role === 'ADMIN' ||
    user.role === 'SUPER_ADMIN'
  );
};

/**
 * Check if the user is a restricted Staff Member
 */
export const isStaffUser = (user) => {
  if (!user) return false;
  if (isAdminUser(user)) return false;
  return (
    user.isStaff === true ||
    user.role === 'STAFF' ||
    Boolean(user.employee_id) ||
    Boolean(user.department_code) ||
    Boolean(user.department)
  );
};

/**
 * Extract canonical permissions set from authenticated user object
 */
export const getUserPermissions = (user) => {
  if (!user) return new Set();

  if (isAdminUser(user)) {
    // Admin has full clearance across all permissions
    return new Set([
      'can_view_bookings',
      'can_view_customer_contacts',
      'can_view_hotel_contacts',
      'can_manage_tickets',
      'can_process_refunds',
      'can_process_payouts',
      'can_verify_hotels',
      'can_view_settlements',
      'can_view_audit_logs',
      'can_manage_users',
      'can_manage_staff',
      'can_manage_coupons',
    ]);
  }

  const set = new Set();

  // 1. Parse user.permissions array or object
  if (Array.isArray(user.permissions)) {
    user.permissions.forEach((p) => {
      if (typeof p === 'string') {
        const canonical = PERMISSION_ALIASES[p] || p.toLowerCase();
        set.add(canonical);
      } else if (typeof p === 'object' && p !== null) {
        const code = p.code || p.name || p.permission_code;
        if (code) {
          const canonical = PERMISSION_ALIASES[code] || code.toLowerCase();
          set.add(canonical);
        }
      }
    });
  } else if (typeof user.permissions === 'object' && user.permissions !== null) {
    Object.entries(user.permissions).forEach(([key, val]) => {
      if (val) {
        const canonical = PERMISSION_ALIASES[key] || key.toLowerCase();
        set.add(canonical);
      }
    });
  }

  // 2. Add department default permissions
  const deptCode = (
    user.department_code ||
    user.department ||
    (Array.isArray(user.departments) && user.departments[0]) ||
    ''
  ).toUpperCase();

  if (deptCode && DEFAULT_DEPARTMENT_PERMISSIONS[deptCode]) {
    DEFAULT_DEPARTMENT_PERMISSIONS[deptCode].forEach((p) => set.add(p));
  }

  return set;
};

/**
 * Check if the user has a specific granular permission
 */
export const hasPermission = (user, permissionKey) => {
  if (!user) return false;
  if (isAdminUser(user)) return true;
  const canonical = PERMISSION_ALIASES[permissionKey] || permissionKey.toLowerCase();
  const perms = getUserPermissions(user);
  return perms.has(canonical);
};

/**
 * Get list of authorized tabs for the authenticated user
 */
export const getAllowedTabs = (user) => {
  if (!user) return [];

  // Master Admin has access to all tabs
  if (isAdminUser(user)) {
    return [
      'OVERVIEW',
      'HOTELS',
      'DELETED_HOTELS',
      'USERS',
      'STAFF',
      'BOOKINGS',
      'TICKETS',
      'SETTLEMENTS',
      'REFUNDS',
      'PAYMENTS',
      'COUPONS',
    ];
  }

  // Staff member: dynamically determine allowed tabs from permissions & department
  const perms = getUserPermissions(user);
  const dept = (
    user.department_code ||
    user.department ||
    (Array.isArray(user.departments) && user.departments[0]) ||
    ''
  ).toUpperCase();

  const allowed = [];

  // Bookings: Reservation, Support, Refund staff or has can_view_bookings
  if (
    perms.has('can_view_bookings') ||
    ['RESERVATION', 'CUSTOMER_SUPPORT', 'REFUND', 'REFUNDS_AND_CLAIMS'].includes(dept)
  ) {
    allowed.push('BOOKINGS');
  }

  // Support Tickets: Customer Support staff or has can_manage_tickets
  if (perms.has('can_manage_tickets') || dept === 'CUSTOMER_SUPPORT') {
    allowed.push('TICKETS');
  }

  // Hotels: Hotel verification staff or has can_verify_hotels
  if (perms.has('can_verify_hotels') || dept === 'HOTEL_VERIFICATION') {
    allowed.push('HOTELS');
    allowed.push('DELETED_HOTELS');
  }

  // Customer Refunds: Refund staff or has can_process_refunds
  if (
    perms.has('can_process_refunds') ||
    ['REFUND', 'REFUNDS_AND_CLAIMS'].includes(dept)
  ) {
    allowed.push('REFUNDS');
  }

  // Host Settlements & Payments: Payout staff or has can_view_settlements / can_process_payouts
  if (
    perms.has('can_view_settlements') ||
    perms.has('can_process_payouts') ||
    ['PAYOUT', 'PAYOUT_AND_ESCROW'].includes(dept)
  ) {
    allowed.push('SETTLEMENTS');
    allowed.push('PAYMENTS');
  }

  // USERS, STAFF, and COUPONS are strictly Master Admin clearance only.
  return allowed;
};

/**
 * Check if a specific tab is permitted for the authenticated user
 */
export const isTabAllowed = (user, tabId) => {
  if (!user) return false;
  if (isAdminUser(user)) return true;
  const allowed = getAllowedTabs(user);
  return allowed.includes(tabId);
};

/**
 * Get the initial / default landing tab for a user
 * Admin -> OVERVIEW
 * Staff -> Primary assigned department tab (e.g. BOOKINGS, TICKETS, etc.)
 */
export const getDefaultTabForUser = (user) => {
  if (!user) return 'OVERVIEW';
  if (isAdminUser(user)) return 'OVERVIEW';
  const allowed = getAllowedTabs(user);
  return allowed.length > 0 ? allowed[0] : null;
};

/**
 * Filter sidebar menu groups so only authorized navigation links are displayed
 */
export const getFilteredMenuGroups = (user, menuGroups = []) => {
  if (!user) return [];
  if (isAdminUser(user)) return menuGroups;

  const allowedTabs = getAllowedTabs(user);

  return menuGroups
    .map((group) => {
      const filteredItems = (group.items || []).filter((item) => allowedTabs.includes(item.id));
      return {
        ...group,
        items: filteredItems,
      };
    })
    .filter((group) => group.items && group.items.length > 0);
};
