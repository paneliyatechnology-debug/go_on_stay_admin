import React, { useState, useEffect } from 'react';
import {
  Users, UserPlus, Shield, ShieldCheck, KeyRound, Copy, Check, Eye, EyeOff,
  Edit2, Trash2, RotateCcw, AlertCircle, CheckCircle2, XCircle, Search, Filter,
  Phone, Mail, Calendar, Clock, Lock, Unlock, Activity, ExternalLink, HelpCircle,
  Building2, MessageSquare, Landmark, RefreshCw, X, Sliders, ChevronRight, UserCheck, UserX, Ban
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { formatDisplayDate } from '../utils/dateUtils';
import { parseApiError } from '../utils/errorHandler';
import FieldError from './FieldError';
import adminStaffService from '../services/adminStaffService';
import staffOperationsService from '../services/staffOperationsService';
import Pagination from './Pagination';

// Department Definitions (mapped to exact backend department codes)
const DEPARTMENTS = [
  { id: 'RESERVATION', label: 'Reservation', badge: 'bg-blue-50 text-blue-700 border-blue-200', icon: Calendar, desc: 'Guest booking management and telephone calling coordination.' },
  { id: 'CUSTOMER_SUPPORT', label: 'Customer Support', badge: 'bg-purple-50 text-purple-700 border-purple-200', icon: MessageSquare, desc: 'Guest complaints resolution, ticket notes, and support messaging.' },
  { id: 'REFUNDS_AND_CLAIMS', label: 'Refunds & Claims', badge: 'bg-rose-50 text-rose-700 border-rose-200', icon: RotateCcw, desc: 'Execution of Razorpay cancellation refunds for guests.' },
  { id: 'PAYOUT_AND_ESCROW', label: 'Payouts & Escrow', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: Landmark, desc: 'Host settlement disbursements following 7-day holding periods.' },
  { id: 'HOTEL_VERIFICATION', label: 'Hotel Verification', badge: 'bg-amber-50 text-amber-700 border-amber-200', icon: Building2, desc: 'Compliance document audit, property approvals and rejections.' },
];

// Granular Action Permissions
const ACTION_PERMISSIONS = [
  { key: 'can_view_bookings', label: 'View Reservations & Stays', desc: 'Browse guest bookings, dates, and amounts', category: 'General' },
  { key: 'can_view_customer_contacts', label: 'Access Customer Contact Details', desc: 'View customer phone & email for manual mobile calls', category: 'General' },
  { key: 'can_view_hotel_contacts', label: 'Access Hotel Owner Contacts', desc: 'View hotel owner phone, name, and address', category: 'General' },
  { key: 'can_manage_tickets', label: 'Manage Support Tickets & Inquiries', desc: 'Inspect customer complaints and update ticket statuses', category: 'Support' },
  { key: 'can_process_refunds', label: 'Process Customer Refunds', desc: 'Disburse monetary refunds via Razorpay engine (High Authority)', category: 'Financial', sensitive: true },
  { key: 'can_process_payouts', label: 'Execute Hotel Payouts', desc: 'Disburse mature escrow funds to hotel bank accounts (High Authority)', category: 'Financial', sensitive: true },
  { key: 'can_verify_hotels', label: 'Verify & Approve Hotel Properties', desc: 'Review compliance documents and grant approval decisions', category: 'Compliance' },
  { key: 'can_view_settlements', label: 'View Escrow Holdings & Ledger', desc: 'Monitor 7-day holding periods and settlement balances', category: 'Financial' },
  { key: 'can_view_audit_logs', label: 'View Operational Activity Logs', desc: 'Inspect administrative actions and timestamped audit logs', category: 'Security' },
];

const DEFAULT_DEPT_PERMISSIONS = {
  RESERVATION: {
    can_view_bookings: true,
    can_view_customer_contacts: true,
    can_view_hotel_contacts: true,
  },
  CUSTOMER_SUPPORT: {
    can_view_bookings: true,
    can_manage_tickets: true,
  },
  REFUNDS_AND_CLAIMS: {
    can_view_bookings: true,
    can_process_refunds: true,
  },
  REFUND: {
    can_view_bookings: true,
    can_process_refunds: true,
  },
  PAYOUT_AND_ESCROW: {
    can_view_settlements: true,
    can_process_payouts: true,
  },
  PAYOUT: {
    can_view_settlements: true,
    can_process_payouts: true,
  },
  HOTEL_VERIFICATION: {
    can_verify_hotels: true,
    can_view_audit_logs: true,
  },
};

// Initial Phase 1 Showcase Staff Roster (stored with LocalStorage persistence)
const INITIAL_PREVIEW_STAFF = [
  {
    id: 1,
    employee_id: 'GOS-EMP-001',
    login_id: 'amit.reservation001',
    first_name: 'Amit',
    last_name: 'Patel',
    email: 'amit.patel@goonstay.com',
    phone: '+91 98765 43210',
    department: 'RESERVATION',
    designation: 'Senior Reservation Executive',
    role_title: 'Reservation Staff',
    status: 'ACTIVE',
    permissions: { can_view_bookings: true, can_view_customer_contacts: true, can_view_hotel_contacts: true },
    created_at: '2026-10-15T09:30:00Z',
    last_login: '2026-11-20T11:15:00Z'
  },
  {
    id: 2,
    employee_id: 'GOS-EMP-002',
    login_id: 'priya.support002',
    first_name: 'Priya',
    last_name: 'Sharma',
    email: 'priya.sharma@goonstay.com',
    phone: '+91 98222 11334',
    department: 'CUSTOMER_SUPPORT',
    designation: 'Customer Care Lead',
    role_title: 'Support Specialist',
    status: 'ACTIVE',
    permissions: { can_view_bookings: true, can_manage_tickets: true },
    created_at: '2026-10-18T14:20:00Z',
    last_login: '2026-11-20T10:45:00Z'
  },
  {
    id: 3,
    employee_id: 'GOS-EMP-003',
    login_id: 'rajesh.refund003',
    first_name: 'Rajesh',
    last_name: 'Verma',
    email: 'rajesh.verma@goonstay.com',
    phone: '+91 97111 88990',
    department: 'REFUND',
    designation: 'Refund & Claims Officer',
    role_title: 'Refund Executive',
    status: 'ACTIVE',
    permissions: { can_view_bookings: true, can_process_refunds: true },
    created_at: '2026-10-22T16:00:00Z',
    last_login: '2026-11-19T17:30:00Z'
  },
  {
    id: 4,
    employee_id: 'GOS-EMP-004',
    login_id: 'sneha.payout004',
    first_name: 'Sneha',
    last_name: 'Kulkarni',
    email: 'sneha.k@goonstay.com',
    phone: '+91 98444 55667',
    department: 'PAYOUT',
    designation: 'Escrow Settlement Officer',
    role_title: 'Payout Staff',
    status: 'INACTIVE',
    permissions: { can_view_settlements: true, can_process_payouts: true },
    created_at: '2026-11-01T11:00:00Z',
    last_login: '2026-11-12T09:10:00Z'
  },
  {
    id: 5,
    employee_id: 'GOS-EMP-005',
    login_id: 'vikram.verify005',
    first_name: 'Vikram',
    last_name: 'Singh',
    email: 'vikram.singh@goonstay.com',
    phone: '+91 99888 77665',
    department: 'HOTEL_VERIFICATION',
    designation: 'Property Compliance Auditor',
    role_title: 'Verification Officer',
    status: 'SUSPENDED',
    permissions: { can_verify_hotels: true, can_view_audit_logs: true },
    created_at: '2026-11-05T13:45:00Z',
    last_login: '2026-11-16T15:00:00Z'
  }
];

const AdminStaffManagement = () => {
  const { showToast } = useAuth();

  // Real Backend Data State
  const [staffList, setStaffList] = useState(INITIAL_PREVIEW_STAFF);
  const [loading, setLoading] = useState(false);
  const [backendConnected, setBackendConnected] = useState(false);
  const [departmentsList, setDepartmentsList] = useState([]);
  const [staffActivities, setStaffActivities] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [dashboardMetrics, setDashboardMetrics] = useState(null);
  const [allStaffList, setAllStaffList] = useState([]);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Modals State
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showPasswordResetModal, setShowPasswordResetModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [staffToDelete, setStaffToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Add Staff Form State
  const [newStaffForm, setNewStaffForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    department: 'RESERVATION',
    designation: 'Senior Reservation Officer',
    role_title: 'Reservation Staff',
    status: 'ACTIVE',
    permissions: { ...DEFAULT_DEPT_PERMISSIONS.RESERVATION }
  });

  // Edit Staff Form State
  const [editForm, setEditForm] = useState(null);

  // Credential Preview after creation
  const [createdCredentialPreview, setCreatedCredentialPreview] = useState(null);
  const [copiedField, setCopiedField] = useState(null);

  // Load Real Staff from Backend API: GET /api/staff/?department=...&status=...&search=...
  const loadStaff = async () => {
    setLoading(true);
    try {
      const res = await adminStaffService.getStaffList({
        department: departmentFilter,
        status: statusFilter,
        search: searchQuery,
        page: currentPage,
      });

      const rawResults = res.results || res.data || (Array.isArray(res) ? res : []);
      if (rawResults && (rawResults.length > 0 || res.count !== undefined)) {
        setBackendConnected(true);
        setTotalCount(res.count || rawResults.length);

        const mappedStaff = rawResults.map((s) => {
          let permsObj = {};
          if (Array.isArray(s.permissions)) {
            s.permissions.forEach(p => {
              const code = p.code || p;
              if (code === 'VIEW_BOOKINGS') permsObj.can_view_bookings = true;
              else if (code === 'MANAGE_TICKETS') permsObj.can_manage_tickets = true;
              else if (code === 'PROCESS_REFUNDS') permsObj.can_process_refunds = true;
              else if (code === 'PROCESS_PAYOUTS') permsObj.can_process_payouts = true;
              else if (['VERIFY_HOTELS', 'VIEW_HOTELS', 'VERIFY_HOTEL', 'APPROVE_HOTEL'].includes(code)) permsObj.can_verify_hotels = true;
              else permsObj[code.toLowerCase()] = true;
            });
          } else if (typeof s.permissions === 'object' && s.permissions !== null) {
            permsObj = s.permissions;
          }

          let deptCode = s.department_code || s.department || 'RESERVATION';
          if (deptCode === 'REFUND' || deptCode === 'REFUNDS') deptCode = 'REFUNDS_AND_CLAIMS';
          if (deptCode === 'PAYOUT' || deptCode === 'PAYOUTS') deptCode = 'PAYOUT_AND_ESCROW';
          if (deptCode === 'SUPPORT') deptCode = 'CUSTOMER_SUPPORT';
          if (deptCode === 'VERIFICATION') deptCode = 'HOTEL_VERIFICATION';

          return {
            id: s.id,
            user_id: s.user_id,
            employee_id: s.employee_id || `GOS-EMP-${String(s.id).padStart(3, '0')}`,
            login_id: s.login_id || s.username,
            first_name: s.first_name || '',
            last_name: s.last_name || '',
            email: s.email || '',
            phone: s.phone_number || s.phone || '',
            department: deptCode,
            department_code: s.department_code || deptCode,
            department_name: s.department_name || s.department || 'Reservation',
            designation: s.designation || 'Staff Officer',
            role_title: s.designation || 'Staff Member',
            status: (s.status || 'ACTIVE').toUpperCase(),
            permissions: permsObj,
            must_change_password: s.must_change_password,
            created_at: s.created_at,
            last_login: s.last_login || null,
          };
        });

        setStaffList(mappedStaff);
        if (departmentFilter === 'ALL' && statusFilter === 'ALL' && !searchQuery) {
          setAllStaffList(mappedStaff);
        }
      }
    } catch (err) {
      console.warn('Backend staff load notice (using current roster):', err);
    } finally {
      setLoading(false);
    }
  };

  // Load Real Departments from Backend API: GET /api/staff/departments/
  const loadDepartments = async () => {
    try {
      const res = await adminStaffService.getDepartments();
      const depts = res.results || res || [];
      if (depts.length > 0) {
        setDepartmentsList(depts);
      }
    } catch (e) {
      console.warn('Could not load departments from API:', e);
    }
  };

  // Load Real Staff Department Operational Metrics: GET /api/staff/dashboard/
  const loadDashboardMetrics = async () => {
    try {
      const res = await staffOperationsService.getStaffDashboard();
      const metrics = res.metrics || res.dashboard?.metrics || res.data?.metrics;
      if (metrics) {
        setDashboardMetrics(metrics);
      }
    } catch (e) {
      console.warn('Could not load staff dashboard metrics:', e);
    }
  };

  useEffect(() => {
    loadStaff();
    loadDepartments();
    loadDashboardMetrics();
  }, [departmentFilter, statusFilter, searchQuery, currentPage]);

  // Live Department Staff Count Resolver
  const getDepartmentStaffCount = (deptId) => {
    // 1. Direct from backend departments API response (/api/staff/departments/)
    const deptInfo = departmentsList.find(d => 
      d.code === deptId || 
      (deptId === 'REFUND' && (d.code === 'REFUNDS_AND_CLAIMS' || d.code === 'REFUND')) ||
      (deptId === 'PAYOUT' && (d.code === 'PAYOUT_AND_ESCROW' || d.code === 'PAYOUT'))
    );
    if (deptInfo && typeof deptInfo.employee_count === 'number') {
      return deptInfo.employee_count;
    }

    // 2. Fallback to allStaffList or current staffList
    const source = allStaffList.length > 0 ? allStaffList : staffList;
    return source.filter(s => {
      const sDept = (s.department_code || s.department || '').toUpperCase();
      if (deptId === 'REFUND') return sDept === 'REFUND' || sDept === 'REFUNDS_AND_CLAIMS';
      if (deptId === 'PAYOUT') return sDept === 'PAYOUT' || sDept === 'PAYOUT_AND_ESCROW';
      return sDept === deptId;
    }).length;
  };

  // Summary Metrics (always uses full platform roster, unaffected by active filters)
  const totalStaffFromDepts = departmentsList.reduce((acc, d) => acc + (d.employee_count || 0), 0);
  const rosterSource = allStaffList.length > 0 ? allStaffList : staffList;
  const totalStaff = totalStaffFromDepts || totalCount || rosterSource.length;
  const activeStaff = rosterSource.filter(s => s.status === 'ACTIVE').length;
  const inactiveStaff = rosterSource.filter(s => s.status === 'INACTIVE').length;
  const suspendedStaff = rosterSource.filter(s => s.status === 'SUSPENDED').length;

  // Filtered Roster (fallback for client-side when not paginated by backend)
  const filteredStaff = staffList.filter((s) => {
    const q = searchQuery.toLowerCase().trim();
    const fullName = `${s.first_name} ${s.last_name}`.toLowerCase();
    const matchesSearch =
      !q ||
      fullName.includes(q) ||
      (s.employee_id || '').toLowerCase().includes(q) ||
      (s.login_id || '').toLowerCase().includes(q) ||
      (s.email || '').toLowerCase().includes(q) ||
      (s.phone || '').toLowerCase().includes(q) ||
      (s.designation || '').toLowerCase().includes(q);

    const matchesDept = departmentFilter === 'ALL' || 
      s.department === departmentFilter || 
      s.department_code === departmentFilter ||
      (departmentFilter === 'REFUND' && (s.department === 'REFUNDS_AND_CLAIMS' || s.department_code === 'REFUNDS_AND_CLAIMS')) ||
      (departmentFilter === 'PAYOUT' && (s.department === 'PAYOUT_AND_ESCROW' || s.department_code === 'PAYOUT_AND_ESCROW'));
    const matchesStatus = statusFilter === 'ALL' || s.status === statusFilter;

    return matchesSearch && matchesDept && matchesStatus;
  });

  const paginatedStaff = backendConnected ? staffList : filteredStaff.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Department Selection Auto-Fill in Add Form
  const handleDepartmentChange = (deptId, isEdit = false) => {
    const defaultPerms = DEFAULT_DEPT_PERMISSIONS[deptId] || {};
    let defaultDesignation = 'Staff Specialist';
    let defaultRole = 'Staff';

    if (deptId === 'RESERVATION') {
      defaultDesignation = 'Senior Reservation Officer';
      defaultRole = 'Reservation Staff';
    } else if (deptId === 'CUSTOMER_SUPPORT') {
      defaultDesignation = 'Customer Support Representative';
      defaultRole = 'Support Specialist';
    } else if (deptId === 'REFUND' || deptId === 'REFUNDS_AND_CLAIMS') {
      defaultDesignation = 'Refund & Claims Specialist';
      defaultRole = 'Refund Officer';
    } else if (deptId === 'PAYOUT' || deptId === 'PAYOUT_AND_ESCROW') {
      defaultDesignation = 'Escrow Settlement Officer';
      defaultRole = 'Payout Staff';
    } else if (deptId === 'HOTEL_VERIFICATION') {
      defaultDesignation = 'Property Verification Auditor';
      defaultRole = 'Verification Staff';
    }

    if (isEdit) {
      setEditForm(prev => ({
        ...prev,
        department: deptId,
        designation: defaultDesignation,
        role_title: defaultRole,
        permissions: { ...defaultPerms }
      }));
    } else {
      setNewStaffForm(prev => ({
        ...prev,
        department: deptId,
        designation: defaultDesignation,
        role_title: defaultRole,
        permissions: { ...defaultPerms }
      }));
    }
  };

  // Permission Toggle
  const togglePermission = (permKey, isEdit = false) => {
    if (isEdit) {
      setEditForm(prev => ({
        ...prev,
        permissions: {
          ...prev.permissions,
          [permKey]: !prev.permissions?.[permKey]
        }
      }));
    } else {
      setNewStaffForm(prev => ({
        ...prev,
        permissions: {
          ...prev.permissions,
          [permKey]: !prev.permissions?.[permKey]
        }
      }));
    }
  };

  // Helper to map UI permissions keys to Backend codes
  const mapUiPermissionsToBackendCodes = (permissionsObj = {}) => {
    const codes = [];
    if (permissionsObj.can_view_bookings) codes.push('VIEW_BOOKINGS');
    if (permissionsObj.can_manage_tickets) codes.push('MANAGE_TICKETS');
    if (permissionsObj.can_process_refunds) codes.push('PROCESS_REFUNDS');
    if (permissionsObj.can_process_payouts) codes.push('PROCESS_PAYOUTS');
    if (permissionsObj.can_verify_hotels) codes.push('VIEW_HOTELS', 'VERIFY_HOTEL', 'APPROVE_HOTEL');
    if (permissionsObj.can_view_customer_contacts) codes.push('VIEW_CUSTOMER_CONTACTS');
    if (permissionsObj.can_view_hotel_contacts) codes.push('VIEW_HOTEL_CONTACTS');
    if (permissionsObj.can_view_settlements) codes.push('VIEW_SETTLEMENTS');
    if (permissionsObj.can_view_audit_logs) codes.push('VIEW_AUDIT_LOGS');
    return codes.length > 0 ? codes : ['VIEW_BOOKINGS'];
  };

  // 1. Add Staff Submit Handler (POST /api/staff/create/)
  const handleCreateStaff = async (e) => {
    e.preventDefault();
    if (!newStaffForm.first_name.trim() || !newStaffForm.email.trim() || !newStaffForm.phone.trim()) {
      showToast?.('Please fill out all required personal information fields.', 'error');
      return;
    }

    setActionLoading(true);
    const permissionsArray = mapUiPermissionsToBackendCodes(newStaffForm.permissions);

    try {
      const res = await adminStaffService.createStaff({
        first_name: newStaffForm.first_name.trim(),
        last_name: newStaffForm.last_name.trim(),
        email: newStaffForm.email.trim(),
        phone_number: newStaffForm.phone.trim(),
        department: newStaffForm.department,
        designation: newStaffForm.designation.trim() || 'Staff Officer',
        permissions: permissionsArray,
      });

      const creds = res.credentials || res.data?.credentials || {};
      const emp = res.employee || res.data?.employee || res.data || res;

      setCreatedCredentialPreview({
        name: `${newStaffForm.first_name} ${newStaffForm.last_name}`.trim(),
        employee_id: creds.employee_id || emp.employee_id || 'GOS-EMP-NEW',
        login_id: creds.login_id || emp.login_id || emp.username,
        temp_password: creds.temporary_password || res.temporary_password || 'Temporary password created',
        department: newStaffForm.department,
        designation: newStaffForm.designation,
        notice: creds.notice || 'This temporary password is displayed ONLY ONCE. Please securely communicate it to the employee.',
      });

      showToast?.('Staff account created in database successfully!', 'success');
      setShowAddModal(false);

      // Reset Form
      setNewStaffForm({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        department: 'RESERVATION',
        designation: 'Senior Reservation Officer',
        role_title: 'Reservation Staff',
        status: 'ACTIVE',
        permissions: { ...DEFAULT_DEPT_PERMISSIONS.RESERVATION }
      });

      loadStaff();
    } catch (err) {
      console.error('Create staff API error:', err);
      const parsed = parseApiError(err, 'Failed to create staff account on backend.');
      showToast?.(parsed.message, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // 2. Edit Staff Submit Handler (PATCH /api/staff/{id}/update/ & PUT /api/staff/{id}/permissions/update/ & PATCH /api/staff/{id}/status/)
  const handleUpdateStaff = async (e) => {
    e.preventDefault();
    if (!editForm) return;

    setActionLoading(true);
    try {
      // Step A: Update info
      await adminStaffService.updateStaff(editForm.id, {
        department: editForm.department,
        designation: editForm.designation,
        phone_number: editForm.phone,
        first_name: editForm.first_name,
        last_name: editForm.last_name,
      });

      // Step B: Update account status (ACTIVE, INACTIVE, SUSPENDED)
      if (editForm.status) {
        const canonicalStatus = String(editForm.status).trim().toUpperCase();
        await adminStaffService.updateStaffStatus(editForm.id, {
          status: canonicalStatus,
          reason: `Account status updated to ${canonicalStatus} by administrator in staff editor`,
        });
      }

      // Step C: Update permissions
      const permsArray = mapUiPermissionsToBackendCodes(editForm.permissions);
      try {
        await adminStaffService.updateStaffPermissions(editForm.id, permsArray);
      } catch (pe) {
        console.warn('Permissions update notice:', pe);
      }

      showToast?.('Staff details and account status updated successfully in database!', 'success');
      setShowEditModal(false);
      await loadStaff();
    } catch (err) {
      console.error('Update staff error:', err);
      const parsed = parseApiError(err, 'Failed to update staff details on backend.');
      showToast?.(parsed.message, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // 3. Status Toggle Handler (PATCH /api/staff/{id}/status/)
  const handleToggleStatus = async (staffId, nextStatus) => {
    const canonical = String(nextStatus || 'ACTIVE').trim().toUpperCase();
    try {
      await adminStaffService.updateStaffStatus(staffId, {
        status: canonical,
        reason: `Status updated to ${canonical} by administrator`,
      });
      showToast?.(`Account status changed to ${canonical} in database.`, 'success');
      await loadStaff();
    } catch (err) {
      console.error('Status toggle API error:', err);
      const parsed = parseApiError(err, 'Failed to update account status on backend.');
      showToast?.(parsed.message, 'error');
    }
  };

  // 4. Admin Reset Staff Password (POST /api/staff/{id}/reset-password/)
  const handleResetPassword = async (staffId) => {
    setActionLoading(true);
    try {
      const res = await adminStaffService.resetStaffPassword(staffId);
      showToast?.(res.message || 'Temporary password generated and sent to staff registered email.', 'success');
      setShowPasswordResetModal(false);
      loadStaff();
    } catch (err) {
      console.error('Reset staff password API error:', err);
      const parsed = parseApiError(err, 'Failed to reset staff password.');
      showToast?.(parsed.message, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // 5. Open Full Profile & Fetch Activities (GET /api/staff/{id}/ & GET /api/staff/activities/?employee_id=...)
  const handleOpenProfile = async (staff) => {
    setSelectedStaff(staff);
    setShowProfileModal(true);
    setStaffActivities([]);

    try {
      const detail = await adminStaffService.getStaffDetail(staff.id);
      if (detail) {
        setSelectedStaff(prev => ({ ...prev, ...detail }));
      }
    } catch (e) {
      console.warn('Profile detail fetch notice:', e);
    }

    try {
      const actRes = await adminStaffService.getStaffActivities({
        employee_id: staff.employee_id,
      });
      const acts = actRes.results || actRes.data || (Array.isArray(actRes) ? actRes : []);
      setStaffActivities(acts);
    } catch (e) {
      console.warn('Activities fetch notice:', e);
    }
  };

  // 6. Permanently Delete Staff Member
  const handleDeleteStaff = async () => {
    if (!staffToDelete) return;
    setDeleting(true);
    try {
      await adminStaffService.deleteStaff(staffToDelete.id, staffToDelete.user_id);
      showToast?.(`Staff member '${staffToDelete.first_name} ${staffToDelete.last_name}' (@${staffToDelete.login_id}) permanently deleted.`, 'success');

      // Immediate local state update
      setStaffList(prev => prev.filter(s => s.id !== staffToDelete.id));
      setAllStaffList(prev => prev.filter(s => s.id !== staffToDelete.id));
      setShowDeleteModal(false);
      setShowProfileModal(false);
      setStaffToDelete(null);

      // Refresh backend datasets
      loadStaff();
      loadDepartments();
      loadDashboardMetrics();
    } catch (err) {
      console.error('Delete staff API error:', err);
      const parsed = parseApiError(err, 'Failed to permanently delete staff member.');
      showToast?.(parsed.message, 'error');
    } finally {
      setDeleting(false);
    }
  };

  // Copy to clipboard helper
  const handleCopy = (text, fieldName) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    showToast?.(`Copied ${fieldName} to clipboard!`, 'success');
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">

      {/* ADMIN STAFF MANAGEMENT HEADER BANNER */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-900/60 rounded-2xl p-4 sm:p-5 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-amber-400/20 text-amber-400 border border-amber-400/30 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-6 h-6 text-amber-400" />
          </div>
          <h2 className="text-base sm:text-lg font-black text-white tracking-wide">
            Admin Staff Management
          </h2>
        </div>

        <div className="flex items-center gap-2 self-stretch md:self-auto justify-end">
          <button
            type="button"
            onClick={loadStaff}
            disabled={loading}
            className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 border border-white/15 text-xs font-bold transition-all inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            title="Refresh Staff Roster from Backend API"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#AA7C11] hover:brightness-110 text-slate-950 font-black text-xs transition-all shadow-md inline-flex items-center gap-2 cursor-pointer"
          >
            <UserPlus className="w-4 h-4" /> Add New Staff
          </button>
        </div>
      </div>

      {/* SUMMARY METRIC CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-600 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Staff Roster</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900">{totalStaff}</div>
          <p className="text-[11px] text-slate-500 font-semibold mt-1">Across 5 platform departments</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-600 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">Active Staff</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-700">{activeStaff}</div>
          <p className="text-[11px] text-emerald-600 font-semibold mt-1">Authorized for department logins</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-600 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Inactive Staff</span>
            <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center font-bold">
              <UserX className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-700">{inactiveStaff}</div>
          <p className="text-[11px] text-slate-500 font-semibold mt-1">Temporary off-duty accounts</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-600 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-600">Suspended Staff</span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
              <Ban className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-rose-600">{suspendedStaff}</div>
          <p className="text-[11px] text-rose-600 font-semibold mt-1">Access revoked by Administrator</p>
        </div>
      </div>

      {/* DEPARTMENT-WISE STAFF DISTRIBUTION SUMMARY */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">Department Distribution Summary</h3>
            <p className="text-xs text-slate-500 font-medium">Click on any department card to instantly filter the staff table.</p>
          </div>
          {departmentFilter !== 'ALL' && (
            <button
              onClick={() => setDepartmentFilter('ALL')}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" /> Clear Department Filter
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {DEPARTMENTS.map((dept) => {
            const Icon = dept.icon;
            const count = getDepartmentStaffCount(dept.id);
            const percent = totalStaff > 0 ? Math.round((count / totalStaff) * 100) : 0;
            const isSelected = departmentFilter === dept.id;

            return (
              <div
                key={dept.id}
                onClick={() => setDepartmentFilter(isSelected ? 'ALL' : dept.id)}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer select-none ${
                  isSelected
                    ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-amber-400/50'
                    : 'bg-slate-50 hover:bg-slate-100/80 border-slate-200 text-slate-800'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isSelected ? 'bg-white/15 text-amber-400' : 'bg-white text-slate-700 border border-slate-200 shadow-xs'}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className={`text-xs font-black ${isSelected ? 'text-amber-400' : 'text-slate-900'}`}>{count} Staff</span>
                </div>
                <div className={`font-black text-xs truncate ${isSelected ? 'text-white' : 'text-slate-900'}`}>{dept.label}</div>
                <div className="w-full bg-slate-200/60 rounded-full h-1.5 mt-2.5 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${isSelected ? 'bg-amber-400' : 'bg-slate-700'}`}
                    style={{ width: `${percent}%` }}
                  ></div>
                </div>
                <span className={`text-[10px] font-bold mt-1.5 block ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>{percent}% of team</span>
                {dashboardMetrics && (
                  <div className={`mt-2 pt-1.5 border-t text-[10px] font-bold truncate flex items-center gap-1 ${
                    isSelected ? 'border-white/10 text-amber-300' : 'border-slate-200 text-slate-700'
                  }`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
                    <span>
                      {dept.id === 'RESERVATION' && `${dashboardMetrics.reservation?.total_bookings || 0} Bookings`}
                      {dept.id === 'CUSTOMER_SUPPORT' && `${dashboardMetrics.customer_support?.open_tickets || 0} Open Tickets`}
                      {dept.id === 'REFUND' && `${dashboardMetrics.refund?.pending_refunds || 0} Pending Refunds`}
                      {dept.id === 'PAYOUT' && `${dashboardMetrics.payout?.completed_payouts || 0} Disbursed`}
                      {dept.id === 'HOTEL_VERIFICATION' && `${dashboardMetrics.hotel_verification?.pending_verifications || 0} Audits Due`}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* SEARCH & FILTERS BAR */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search */}
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Employee ID, Name, Login ID, Email..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:border-amber-500 focus:bg-white transition-all select-text"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Dropdowns */}
        <div className="flex items-center gap-2 self-stretch md:self-auto flex-wrap">
          {/* Department Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-700 outline-none cursor-pointer"
            >
              <option value="ALL">All Departments</option>
              {DEPARTMENTS.map(d => (
                <option key={d.id} value={d.id}>{d.label}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5">
            <span className="text-[11px] font-bold text-slate-500">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-700 outline-none cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active Only</option>
              <option value="INACTIVE">Inactive Only</option>
              <option value="SUSPENDED">Suspended Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* STAFF LIST TABLE */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-slate-100 text-slate-700 font-black uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="p-4">Employee ID</th>
                <th className="p-4">Staff Member</th>
                <th className="p-4">Login ID</th>
                <th className="p-4">Department</th>
                <th className="p-4">Designation</th>
                <th className="p-4">Contact Info</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-semibold">
              {filteredStaff.length === 0 ? (
                <tr>
                  <td colSpan="8" className="p-12 text-center text-slate-400">
                    <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm font-bold text-slate-600">No staff accounts found.</p>
                    <p className="text-xs text-slate-400 mt-1">Try adjusting your search query or department filter.</p>
                  </td>
                </tr>
              ) : (
                paginatedStaff.map((staff) => {
                  const deptObj = DEPARTMENTS.find(d => d.id === staff.department) || DEPARTMENTS[0];
                  return (
                    <tr key={staff.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-4">
                        <span className="font-mono font-black text-slate-900 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md text-[11px]">
                          {staff.employee_id}
                        </span>
                      </td>

                      <td className="p-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-slate-900 text-amber-400 font-black flex items-center justify-center text-xs shrink-0 shadow-xs">
                            {staff.first_name?.[0]}{staff.last_name?.[0]}
                          </div>
                          <div>
                            <div className="font-extrabold text-slate-900 text-sm">{staff.first_name} {staff.last_name}</div>
                            <span className="text-[10px] text-slate-500 font-medium">{staff.role_title}</span>
                          </div>
                        </div>
                      </td>

                      <td className="p-4">
                        <span className="font-mono text-slate-800 text-xs font-bold bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded select-all">
                          {staff.login_id}
                        </span>
                      </td>

                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider border inline-flex items-center gap-1 ${deptObj.badge}`}>
                          {deptObj.label}
                        </span>
                      </td>

                      <td className="p-4">
                        <div className="font-bold text-slate-800 text-xs">{staff.designation}</div>
                      </td>

                      <td className="p-4 text-xs font-medium text-slate-600">
                        <div className="flex items-center gap-1 font-mono text-[11px] text-slate-800">
                          <Phone className="w-3 h-3 text-slate-400" /> {staff.phone}
                        </div>
                        <div className="flex items-center gap-1 text-[11px] text-slate-500 truncate max-w-[180px]">
                          <Mail className="w-3 h-3 text-slate-400" /> {staff.email}
                        </div>
                      </td>

                      <td className="p-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border inline-flex items-center gap-1 ${
                          staff.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                          staff.status === 'SUSPENDED' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                          'bg-slate-100 text-slate-600 border-slate-200'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${staff.status === 'ACTIVE' ? 'bg-emerald-500 animate-pulse' : staff.status === 'SUSPENDED' ? 'bg-rose-500' : 'bg-slate-400'}`}></span>
                          {staff.status}
                        </span>
                      </td>

                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* View Profile & Live Activity */}
                          <button
                            type="button"
                            onClick={() => handleOpenProfile(staff)}
                            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold transition-all cursor-pointer"
                            title="View Full Profile & Permissions"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* Edit Details */}
                          <button
                            type="button"
                            onClick={() => {
                              setEditForm({ ...staff });
                              setShowEditModal(true);
                            }}
                            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-blue-600 font-bold transition-all cursor-pointer"
                            title="Edit Staff Member"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Admin Reset Password */}
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedStaff(staff);
                              setShowPasswordResetModal(true);
                            }}
                            className="p-1.5 rounded-lg border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold transition-all cursor-pointer"
                            title="Reset Staff Password (POST /api/staff/{id}/reset-password/)"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                          </button>

                          {/* Permanently Delete Staff */}
                          <button
                            type="button"
                            onClick={() => {
                              setStaffToDelete(staff);
                              setShowDeleteModal(true);
                            }}
                            className="p-1.5 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold transition-all cursor-pointer"
                            title="Permanently Delete Staff Member"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Quick Status Dropdown */}
                          <select
                            value={staff.status}
                            onChange={(e) => handleToggleStatus(staff.id, e.target.value)}
                            className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border outline-none cursor-pointer transition-all ${
                              staff.status === 'ACTIVE'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
                                : staff.status === 'SUSPENDED'
                                ? 'bg-rose-50 text-rose-700 border-rose-300 hover:bg-rose-100'
                                : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
                            }`}
                            title="Update Account Status"
                          >
                            <option value="ACTIVE">Active</option>
                            <option value="INACTIVE">Inactive</option>
                            <option value="SUSPENDED">Suspended</option>
                          </select>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Pagination */}
        <div className="p-4 border-t border-slate-100">
          <Pagination
            currentPage={currentPage}
            totalItems={filteredStaff.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            color="gold"
            theme="luxury"
          />
        </div>
      </div>

      {/* MODAL 1: ADD NEW STAFF (STEP 5) */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-5 my-8 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-slate-900 text-amber-400 flex items-center justify-center">
                  <UserPlus className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Provision New Staff Account</h3>
                  <span className="text-[11px] text-slate-500 font-medium">Phase 1 UI Form • Auto-credentials previewed below</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateStaff} className="space-y-4 overflow-y-auto pr-1">
              {/* Section 1: Personal Details */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                <span className="text-xs font-black uppercase tracking-wider text-slate-800 block">1. Personal Information</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">First Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Ramesh"
                      value={newStaffForm.first_name}
                      onChange={(e) => setNewStaffForm({ ...newStaffForm, first_name: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:border-amber-500 outline-none select-text"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Last Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Patel"
                      value={newStaffForm.last_name}
                      onChange={(e) => setNewStaffForm({ ...newStaffForm, last_name: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:border-amber-500 outline-none select-text"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Official Email Address *</label>
                    <input
                      type="email"
                      required
                      placeholder="ramesh@goonstay.com"
                      value={newStaffForm.email}
                      onChange={(e) => setNewStaffForm({ ...newStaffForm, email: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:border-amber-500 outline-none select-text"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Mobile Contact Number *</label>
                    <input
                      type="tel"
                      required
                      placeholder="+91 98765 00000"
                      value={newStaffForm.phone}
                      onChange={(e) => setNewStaffForm({ ...newStaffForm, phone: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:border-amber-500 outline-none select-text"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Department & Designation */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                <span className="text-xs font-black uppercase tracking-wider text-slate-800 block">2. Department & Employment Role</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Assigned Department *</label>
                    <select
                      value={newStaffForm.department}
                      onChange={(e) => handleDepartmentChange(e.target.value, false)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:border-amber-500 outline-none cursor-pointer"
                    >
                      {DEPARTMENTS.map(d => (
                        <option key={d.id} value={d.id}>{d.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Account Status</label>
                    <select
                      value={newStaffForm.status}
                      onChange={(e) => setNewStaffForm({ ...newStaffForm, status: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:border-amber-500 outline-none cursor-pointer"
                    >
                      <option value="ACTIVE">Active</option>
                      <option value="INACTIVE">Inactive</option>
                      <option value="SUSPENDED">Suspended</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Designation Title</label>
                    <input
                      type="text"
                      value={newStaffForm.designation}
                      onChange={(e) => setNewStaffForm({ ...newStaffForm, designation: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:border-amber-500 outline-none select-text"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Internal Role</label>
                    <input
                      type="text"
                      value={newStaffForm.role_title}
                      onChange={(e) => setNewStaffForm({ ...newStaffForm, role_title: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:border-amber-500 outline-none select-text"
                    />
                  </div>
                </div>

                {/* Auto-Generation Notice Callout */}
                <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl text-[11px] text-amber-900 font-medium">
                  ⚡ <strong>Auto-Credential Notice:</strong> In Phase 1, unique <code>Employee ID</code> and <code>Login ID</code> will be previewed. In Phase 2, backend triggers will generate cryptographic credentials automatically.
                </div>
              </div>

              {/* Section 3: Granular Action Permissions (STEP 7) */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-800">3. Action Permissions Matrix</span>
                  <span className="text-[10px] text-slate-500 font-bold">Individually selectable</span>
                </div>

                <div className="space-y-2">
                  {ACTION_PERMISSIONS.map((perm) => {
                    const isChecked = !!newStaffForm.permissions?.[perm.key];
                    return (
                      <label
                        key={perm.key}
                        className={`flex items-start gap-3 p-2.5 rounded-xl border transition-all cursor-pointer ${
                          isChecked ? 'bg-amber-50/60 border-amber-300 text-slate-900' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100/50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => togglePermission(perm.key, false)}
                          className="mt-1 w-4 h-4 text-amber-600 rounded cursor-pointer"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900">{perm.label}</span>
                            {perm.sensitive && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase bg-rose-100 text-rose-700 border border-rose-200">
                                High Authority
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-500 mt-0.5">{perm.desc}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-400 font-black text-xs cursor-pointer shadow-md inline-flex items-center gap-2"
                >
                  <UserPlus className="w-4 h-4" /> Create Staff Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: STAFF PROFILE INSPECT (STEP 6) */}
      {showProfileModal && selectedStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-5 my-8 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-amber-500" />
                <h3 className="text-base font-black text-slate-900">Staff Account Profile</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowProfileModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 overflow-y-auto pr-1">
              {/* Profile Card Header */}
              <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-4 text-white flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-amber-400 text-slate-950 font-black text-xl flex items-center justify-center shadow-md shrink-0">
                  {selectedStaff.first_name?.[0]}{selectedStaff.last_name?.[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="text-lg font-black text-white truncate">{selectedStaff.first_name} {selectedStaff.last_name}</h4>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                      {selectedStaff.status}
                    </span>
                  </div>
                  <p className="text-xs text-amber-400 font-semibold">{selectedStaff.designation} • {selectedStaff.department}</p>
                  <p className="text-[11px] text-slate-400 font-mono mt-0.5">ID: {selectedStaff.employee_id}</p>
                </div>
              </div>

              {/* Personal & Account Information */}
              <div className="grid grid-cols-2 gap-3 bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Login ID / Username</span>
                  <span className="font-mono font-bold text-slate-900">{selectedStaff.login_id}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Contact Phone</span>
                  <span className="font-mono font-bold text-slate-900">{selectedStaff.phone}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Email Address</span>
                  <span className="text-slate-900 font-medium truncate block">{selectedStaff.email}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Assigned Role</span>
                  <span className="text-slate-900 font-bold">{selectedStaff.role_title}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Created On</span>
                  <span className="text-slate-700">{formatDisplayDate(selectedStaff.created_at)}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Last Activity / Login</span>
                  <span className="text-slate-700">{selectedStaff.last_login ? formatDisplayDate(selectedStaff.last_login) : 'Never'}</span>
                </div>
              </div>

              {/* Assigned Permissions Inspection */}
              <div className="space-y-2 bg-slate-50 border border-slate-200 rounded-2xl p-4">
                <span className="text-xs font-black uppercase tracking-wider text-slate-800 block">Granted Action Permissions</span>
                <div className="space-y-1.5">
                  {ACTION_PERMISSIONS.map((perm) => {
                    const isGranted = !!selectedStaff.permissions?.[perm.key];
                    return (
                      <div
                        key={perm.key}
                        className={`p-2 rounded-xl border flex items-center justify-between text-xs ${
                          isGranted ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900' : 'bg-slate-100/50 border-slate-200 text-slate-400'
                        }`}
                      >
                        <span className="font-bold">{perm.label}</span>
                        {isGranted ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-emerald-600 text-white inline-flex items-center gap-1">
                            <Check className="w-3 h-3" /> Granted
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-200 text-slate-500">
                            No Access
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Activity Audit Trail (GET /api/staff/activities/?employee_id=...) */}
              <div className="space-y-2 bg-slate-50 border border-slate-200 rounded-2xl p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-blue-600" /> Operational Activity Trail
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {staffActivities.length} logs
                  </span>
                </div>
                {staffActivities.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No recent activity logs recorded for this employee.</p>
                ) : (
                  <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                    {staffActivities.map((act) => (
                      <div key={act.id} className="p-2.5 rounded-xl bg-white border border-slate-200 text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900 px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 text-[10px] font-mono">
                            {act.action}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {formatDisplayDate(act.timestamp)}
                          </span>
                        </div>
                        <p className="text-slate-700 font-medium">{act.description}</p>
                        {act.ip_address && (
                          <span className="text-[10px] text-slate-400 font-mono block">IP: {act.ip_address}</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100 shrink-0">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowProfileModal(false);
                    setEditForm({ ...selectedStaff });
                    setShowEditModal(true);
                  }}
                  className="px-4 py-2 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 font-bold text-xs hover:bg-blue-100 cursor-pointer inline-flex items-center gap-1.5"
                >
                  <Edit2 className="w-3.5 h-3.5" /> Edit Member
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStaffToDelete(selectedStaff);
                    setShowDeleteModal(true);
                  }}
                  className="px-4 py-2 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 font-bold text-xs hover:bg-rose-100 cursor-pointer inline-flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete Member
                </button>
              </div>

              <button
                type="button"
                onClick={() => setShowProfileModal(false)}
                className="px-5 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2.5: RESET STAFF PASSWORD CONFIRMATION (POST /api/staff/{id}/reset-password/) */}
      {showPasswordResetModal && selectedStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto border border-amber-200">
                <KeyRound className="w-6 h-6" />
              </div>
              <h3 className="text-base font-black text-slate-900">Reset Staff Password</h3>
              <p className="text-xs text-slate-500">
                Generate a new temporary password for <strong>{selectedStaff.first_name} {selectedStaff.last_name}</strong> ({selectedStaff.employee_id})?
              </p>
              <p className="text-[10px] text-slate-400 font-mono bg-slate-50 p-2 rounded-xl border border-slate-200">
                Endpoint: POST /api/staff/{selectedStaff.id}/reset-password/
              </p>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowPasswordResetModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => handleResetPassword(selectedStaff.id)}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {actionLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
                <span>Confirm Reset</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: EDIT STAFF DETAILS */}
      {showEditModal && editForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 my-8 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
              <div className="flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-black text-slate-900">Edit Staff: {editForm.employee_id}</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateStaff} className="space-y-4 overflow-y-auto pr-1">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">First Name</label>
                  <input
                    type="text"
                    required
                    value={editForm.first_name}
                    onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:border-blue-500 outline-none select-text"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Last Name</label>
                  <input
                    type="text"
                    value={editForm.last_name}
                    onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:border-blue-500 outline-none select-text"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    required
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:border-blue-500 outline-none select-text"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Mobile</label>
                  <input
                    type="tel"
                    required
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:border-blue-500 outline-none select-text"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Department</label>
                  <select
                    value={editForm.department}
                    onChange={(e) => handleDepartmentChange(e.target.value, true)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:border-blue-500 outline-none cursor-pointer"
                  >
                    {DEPARTMENTS.map(d => (
                      <option key={d.id} value={d.id}>{d.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Account Status</label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:border-blue-500 outline-none cursor-pointer"
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                    <option value="SUSPENDED">Suspended</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Designation</label>
                  <input
                    type="text"
                    value={editForm.designation}
                    onChange={(e) => setEditForm({ ...editForm, designation: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:border-blue-500 outline-none select-text"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Role Title</label>
                  <input
                    type="text"
                    value={editForm.role_title}
                    onChange={(e) => setEditForm({ ...editForm, role_title: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:border-blue-500 outline-none select-text"
                  />
                </div>
              </div>

              {/* Edit Permissions Checklist */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
                <span className="text-xs font-black uppercase tracking-wider text-slate-800 block">Permissions Configuration</span>
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {ACTION_PERMISSIONS.map((perm) => {
                    const isChecked = !!editForm.permissions?.[perm.key];
                    return (
                      <label key={perm.key} className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-100 text-xs cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => togglePermission(perm.key, true)}
                          className="w-4 h-4 rounded text-blue-600 cursor-pointer"
                        />
                        <span className="font-semibold text-slate-800">{perm.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs cursor-pointer shadow-md inline-flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" /> Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: CREDENTIAL ONBOARDING CONFIRMATION DIALOG */}
      {createdCredentialPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border-2 border-amber-400 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="text-center space-y-1.5">
              <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto text-amber-600 border border-amber-200 shadow-xs">
                <KeyRound className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-black text-slate-900">Staff Account Created!</h3>
              <p className="text-xs text-slate-500 font-medium">
                Initial login credentials for <strong>{createdCredentialPreview.name}</strong>.
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3 font-mono text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-sans text-[11px] font-bold">Employee ID:</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-slate-900">{createdCredentialPreview.employee_id}</span>
                  <button onClick={() => handleCopy(createdCredentialPreview.employee_id, 'Employee ID')} className="p-1 hover:bg-slate-200 rounded cursor-pointer">
                    <Copy className="w-3.5 h-3.5 text-slate-500" />
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-sans text-[11px] font-bold">Login ID:</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-blue-700">{createdCredentialPreview.login_id}</span>
                  <button onClick={() => handleCopy(createdCredentialPreview.login_id, 'Login ID')} className="p-1 hover:bg-slate-200 rounded cursor-pointer">
                    <Copy className="w-3.5 h-3.5 text-slate-500" />
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-slate-200">
                <span className="text-slate-500 font-sans text-[11px] font-bold">Temp Password:</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">{createdCredentialPreview.temp_password}</span>
                  <button onClick={() => handleCopy(createdCredentialPreview.temp_password, 'Temporary Password')} className="p-1 hover:bg-slate-200 rounded cursor-pointer">
                    <Copy className="w-3.5 h-3.5 text-slate-500" />
                  </button>
                </div>
              </div>
            </div>

            <div className="p-3 bg-amber-50/80 rounded-xl text-[11px] text-amber-900 border border-amber-200 font-medium">
              💡 <em>In Phase 2, these credentials will be securely dispatched via registered email and validated directly against the backend auth database.</em>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={() => setCreatedCredentialPreview(null)}
                className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-400 font-black text-xs cursor-pointer shadow-md"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: PERMANENT DELETE STAFF CONFIRMATION */}
      {showDeleteModal && staffToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in zoom-in-95 duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="w-11 h-11 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">Permanently Delete Staff Member?</h3>
                <p className="text-xs text-rose-600 font-bold">This administrative action cannot be undone.</p>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-bold">Staff Name:</span>
                <span className="font-black text-slate-900">{staffToDelete.first_name} {staffToDelete.last_name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-bold">Employee ID:</span>
                <span className="font-mono font-bold text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200">{staffToDelete.employee_id}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-bold">Login ID:</span>
                <span className="font-mono font-bold text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200">@{staffToDelete.login_id}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-bold">Department:</span>
                <span className="font-bold text-slate-900">{staffToDelete.department_name || staffToDelete.department}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-bold">Designation:</span>
                <span className="font-medium text-slate-700">{staffToDelete.designation}</span>
              </div>
            </div>

            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3.5 text-xs text-rose-950 font-medium leading-relaxed">
              ⚠️ <strong>Warning:</strong> Deleting this staff member will permanently delete their account credentials, revoke all department access rights, and remove their record from the database.
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                disabled={deleting}
                onClick={() => {
                  setShowDeleteModal(false);
                  setStaffToDelete(null);
                }}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50 cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleDeleteStaff}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs transition-all shadow-md inline-flex items-center gap-2 cursor-pointer disabled:opacity-50 shadow-rose-600/20 hover:scale-[1.02] active:scale-[0.98]"
              >
                {deleting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Deleting from Database...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" /> Confirm Permanent Delete
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminStaffManagement;
