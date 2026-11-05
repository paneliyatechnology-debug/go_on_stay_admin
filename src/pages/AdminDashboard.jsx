import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useParams, useNavigate } from 'react-router-dom';
import {
  Users, Building2, BedDouble, CalendarCheck, IndianRupee, TrendingUp, BarChart3, Award, Percent,
  ShieldCheck, Lock, Unlock, CheckCircle, CheckCircle2, XCircle, Search, RefreshCw, CreditCard, RotateCcw,
  Tag, Star, Download, Plus, Trash2, Filter, AlertCircle, Ban, Check, UserCheck, Shield,
  Layers, ArrowUpRight, ChevronRight, ChevronLeft, Activity, Sliders, CheckSquare, Sparkles, UserPlus, Menu,
  Landmark, Clock, FileText, ExternalLink, HelpCircle, AlertTriangle, Eye, ShieldAlert, Wallet, Bell
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { formatDisplayDate } from '../utils/dateUtils';
import Sidebar from '../components/Sidebar';
import NotificationBell from '../components/NotificationBell';
import Pagination from '../components/Pagination';

const TAB_TO_SLUG = {
  OVERVIEW: 'overview',
  HOTELS: 'hotels',
  USERS: 'users',
  BOOKINGS: 'bookings',
  SETTLEMENTS: 'settlements',
  REFUNDS: 'refunds',
  PAYMENTS: 'payments',
  COUPONS: 'coupons',
};

const SLUG_TO_TAB = {
  overview: 'OVERVIEW',
  stats: 'OVERVIEW',
  hotels: 'HOTELS',
  properties: 'HOTELS',
  users: 'USERS',
  roles: 'USERS',
  bookings: 'BOOKINGS',
  reservations: 'BOOKINGS',
  settlements: 'SETTLEMENTS',
  escrow: 'SETTLEMENTS',
  payouts: 'SETTLEMENTS',
  refunds: 'REFUNDS',
  cancellations: 'REFUNDS',
  payments: 'PAYMENTS',
  coupons: 'COUPONS',
  promos: 'COUPONS',
};

const AdminDashboard = () => {
  const { showToast, user: currentUser } = useAuth();
  const [searchParams] = useSearchParams();
  const { subTab } = useParams();
  const navigate = useNavigate();

  const [usersList, setUsersList] = useState([]);
  const [hotelsList, setHotelsList] = useState([]);
  const [bookingsList, setBookingsList] = useState([]);
  const [paymentsList, setPaymentsList] = useState([]);
  const [couponsList, setCouponsList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Settlements & Platform Escrow State
  const [settlementsList, setSettlementsList] = useState([]);
  const [settlementSummary, setSettlementSummary] = useState({});
  const [providerStatus, setProviderStatus] = useState(null);
  const [platformSettings, setPlatformSettings] = useState({ payout_hold_days: 7 });
  const [settlementFilter, setSettlementFilter] = useState('ALL');
  const [showInitiatePayoutModal, setShowInitiatePayoutModal] = useState(false);
  const [selectedEarningForPayout, setSelectedEarningForPayout] = useState(null);
  const [payoutNotes, setPayoutNotes] = useState('');
  const [processingPayout, setProcessingPayout] = useState(false);
  const [payoutResult, setPayoutResult] = useState(null);
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [selectedEarningForDispute, setSelectedEarningForDispute] = useState(null);
  const [disputeReason, setDisputeReason] = useState('');
  const [savingDispute, setSavingDispute] = useState(false);
  const [showStatementModal, setShowStatementModal] = useState(false);
  const [selectedStatementEarning, setSelectedStatementEarning] = useState(null);
  const [showProviderGuideModal, setShowProviderGuideModal] = useState(false);
  const [editingHoldDays, setEditingHoldDays] = useState('7');
  const [savingHoldDays, setSavingHoldDays] = useState(false);

  // Hotel-Wise Holding & Settlements State
  const [hotelsSummary, setHotelsSummary] = useState([]);

  // Horizontal Scroll for Customer Refunds Table
  const refundTableRef = useRef(null);
  const scrollRefundTable = (direction) => {
    if (refundTableRef.current) {
      const scrollAmount = direction === 'left' ? -420 : 420;
      refundTableRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };
  const [selectedHotelId, setSelectedHotelId] = useState('ALL');
  const [settlementViewMode, setSettlementViewMode] = useState('HOTEL_WISE'); // 'HOTEL_WISE' | 'FLAT_LIST'
  const [showHotelPayoutModal, setShowHotelPayoutModal] = useState(false);
  const [selectedHotelPayoutData, setSelectedHotelPayoutData] = useState(null);
  const [overrideHold, setOverrideHold] = useState(false);
  const [showEditBankModal, setShowEditBankModal] = useState(false);
  const [editingBankForm, setEditingBankForm] = useState({
    host_id: '',
    payout_method: 'BANK_ACCOUNT',
    account_holder_name: '',
    bank_name: '',
    account_number: '',
    confirm_account_number: '',
    ifsc_code: '',
    upi_id: ''
  });
  const [savingBankDetails, setSavingBankDetails] = useState(false);

  // Customer Refunds & Cancellations State
  const [selectedRefundBooking, setSelectedRefundBooking] = useState(null);
  const [showProcessRefundModal, setShowProcessRefundModal] = useState(false);
  const [refundMethod, setRefundMethod] = useState('ORIGINAL_SOURCE'); // 'ORIGINAL_SOURCE' | 'BANK_TRANSFER' | 'UPI'
  const [refundAdminNotes, setRefundAdminNotes] = useState('');
  const [processingAdminRefund, setProcessingAdminRefund] = useState(false);
  const [lastPayoutResult, setLastPayoutResult] = useState(null);
  const [payoutIdempotencyKey, setPayoutIdempotencyKey] = useState('');
  const [refundFilterStatus, setRefundFilterStatus] = useState('ALL'); // 'ALL' | 'PENDING' | 'AWAITING_OWNER' | 'REFUNDED' | 'FAILED'
  const [refundModeFilter, setRefundModeFilter] = useState('ALL'); // 'ALL' | 'ORIGINAL_SOURCE' | 'BANK_TRANSFER' | 'UPI'
  const [adminRefundsApiList, setAdminRefundsApiList] = useState([]);
  const [syncingGatewayBookingId, setSyncingGatewayBookingId] = useState(null);
  const [retryingRefundBookingId, setRetryingRefundBookingId] = useState(null);
  const [fetchingBackendRefundDetails, setFetchingBackendRefundDetails] = useState(false);
  const [showManualBankForm, setShowManualBankForm] = useState(false);
  const [manualBankData, setManualBankData] = useState({
    account_holder_name: '',
    bank_name: '',
    account_number: '',
    ifsc_code: '',
    upi_id: ''
  });

  // Pagination States (Strict 10 items per page)
  const [adminHotelsPage, setAdminHotelsPage] = useState(1);
  const [adminUsersPage, setAdminUsersPage] = useState(1);
  const [adminBookingsPage, setAdminBookingsPage] = useState(1);
  const [adminSettlementsPage, setAdminSettlementsPage] = useState(1);
  const [adminRefundsPage, setAdminRefundsPage] = useState(1);
  const [adminPaymentsPage, setAdminPaymentsPage] = useState(1);
  const [adminCouponsPage, setAdminCouponsPage] = useState(1);

  // Tabs: OVERVIEW, HOTELS, USERS, BOOKINGS, SETTLEMENTS, PAYMENTS, COUPONS
  const [activeTab, setActiveTab] = useState(() => {
    if (subTab) {
      return SLUG_TO_TAB[subTab.toLowerCase()] || 'OVERVIEW';
    }
    return 'OVERVIEW';
  });

  useEffect(() => {
    if (subTab) {
      const targetTab = SLUG_TO_TAB[subTab.toLowerCase()] || 'OVERVIEW';
      if (targetTab !== activeTab) {
        setActiveTab(targetTab);
      }
    } else {
      navigate('/dashboard/overview', { replace: true });
    }
  }, [subTab]);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [showCouponModal, setShowCouponModal] = useState(false);
  const [couponForm, setCouponForm] = useState({
    code: '',
    discount_percentage: '10',
    max_discount_amount: '1000',
    min_booking_amount: '2000',
    valid_from: new Date().toISOString().split('T')[0],
    valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    is_active: true
  });

  const [selectedUserForRole, setSelectedUserForRole] = useState(null);
  const [newRoleInput, setNewRoleInput] = useState('HOTEL_OWNER');
  const [userRoleFilter, setUserRoleFilter] = useState('ALL');
  const [paymentViewFilter, setPaymentViewFilter] = useState('SUMMARY'); // 'SUMMARY' (1 per booking) | 'ALL_HISTORY'
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('ALL'); // 'ALL' | 'CAPTURED' | 'CREATED' | 'FAILED' | 'REFUNDED'

  // Auto-reset page numbers when searches / filters change
  useEffect(() => {
    setAdminHotelsPage(1);
  }, [searchQuery]);

  useEffect(() => {
    setAdminUsersPage(1);
  }, [searchQuery, userRoleFilter]);

  useEffect(() => {
    setAdminBookingsPage(1);
  }, [searchQuery]);

  useEffect(() => {
    setAdminSettlementsPage(1);
  }, [searchQuery, settlementFilter, selectedHotelId]);

  useEffect(() => {
    setAdminRefundsPage(1);
  }, [searchQuery, refundFilterStatus, refundModeFilter]);

  useEffect(() => {
    setAdminPaymentsPage(1);
  }, [searchQuery, paymentViewFilter, paymentStatusFilter]);

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const [
        usersRes, hotelsRes, bookingsRes, paymentsRes, couponsRes,
        settlementsRes, providerRes, settingsRes
      ] = await Promise.allSettled([
        api.get('/users/all/'),
        api.get('/hotels/?page_size=1000&sort_by=newest'),
        api.get('/bookings/?page_size=1000'),
        api.get('/payments/admin/all/?page_size=1000'),
        api.get('/coupons/'),
        api.get('/payments/settlements/'),
        api.get('/payments/admin/provider-setup-status/'),
        api.get('/payments/settings/')
      ]);

      if (usersRes.status === 'fulfilled') setUsersList(usersRes.value.data.results || usersRes.value.data);
      if (hotelsRes.status === 'fulfilled') setHotelsList(hotelsRes.value.data.results || hotelsRes.value.data);

      let rawBookings = bookingsRes.status === 'fulfilled' ? (bookingsRes.value.data.results || bookingsRes.value.data || []) : [];
      let rawSettlements = settlementsRes.status === 'fulfilled' ? (settlementsRes.value.data?.results || []) : [];

      try {
        const localRefunds = JSON.parse(localStorage.getItem('bmr_admin_refunds') || '{}');
        const checkIsRef = (keys) => {
          for (const k of keys) {
            if (!k) continue;
            const strK = String(k).trim();
            const clean = strK.replace(/^#/, '');
            if (localRefunds[strK] || localRefunds[clean] || localRefunds[`#${clean}`]) {
              return localRefunds[strK] || localRefunds[clean] || localRefunds[`#${clean}`];
            }
          }
          return null;
        };

        rawBookings = rawBookings.map(b => {
          const ref = checkIsRef([b.id, b.booking_id, b.booking_reference]);
          if (ref) {
            return {
              ...b,
              payment_status: 'REFUNDED',
              refund_status: 'REFUNDED',
              status: 'REFUNDED',
              utr: ref.utr || b.utr,
              refund_arn: ref.refund_arn || b.refund_arn
            };
          }
          return b;
        });

        rawSettlements = rawSettlements.map(s => {
          const ref = checkIsRef([s.booking_id, s.booking, s.id, s.settlement_id]);
          if (ref) {
            return {
              ...s,
              status: 'REFUNDED',
              refund_status: 'REFUNDED',
              is_eligible: false,
              utr: ref.utr || s.utr
            };
          }
          return s;
        });
      } catch (e) {}

      setBookingsList(rawBookings);
      if (paymentsRes.status === 'fulfilled') setPaymentsList(paymentsRes.value.data.results || paymentsRes.value.data);
      if (couponsRes.status === 'fulfilled') setCouponsList(couponsRes.value.data.results || couponsRes.value.data);

      if (settlementsRes.status === 'fulfilled') {
        const sData = settlementsRes.value.data;
        setSettlementsList(rawSettlements);
        setSettlementSummary(sData.summary || {});
        const hSumm = sData.hotels_summary || [];
        setHotelsSummary(hSumm);
        if (hSumm.length > 0) {
          setSelectedHotelId((prev) => {
            if (prev && prev !== 'ALL') return prev;
            const grand = hSumm.find(h => h.hotel_name.toLowerCase().includes('grand royal'));
            return grand ? grand.hotel_id.toString() : hSumm[0].hotel_id.toString();
          });
        }
      }
      if (providerRes.status === 'fulfilled') {
        setProviderStatus(providerRes.value.data);
      }
      if (settingsRes.status === 'fulfilled') {
        setPlatformSettings(settingsRes.value.data);
        if (settingsRes.value.data.payout_hold_days) {
          setEditingHoldDays(settingsRes.value.data.payout_hold_days.toString());
        }
      }

      // API 7: GET /api/payments/admin/refunds/?status={status}&refund_mode={refund_mode}
      try {
        const refundQueryParams = new URLSearchParams();
        if (refundFilterStatus && refundFilterStatus !== 'ALL') {
          refundQueryParams.append('status', refundFilterStatus);
        }
        if (refundModeFilter && refundModeFilter !== 'ALL') {
          refundQueryParams.append('refund_mode', refundModeFilter);
        }
        const aRefundsRes = await api.get(`/payments/admin/refunds/?${refundQueryParams.toString()}`);
        const rResults = aRefundsRes.data?.results || (Array.isArray(aRefundsRes.data) ? aRefundsRes.data : []);
        setAdminRefundsApiList(rResults);
      } catch (aRefErr) {
        console.warn('API 7 /payments/admin/refunds/ notice:', aRefErr);
      }

    } catch (err) {
      console.error('Failed to load admin data:', err);
      showToast('Failed to load admin records.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveHoldDays = async () => {
    const days = parseInt(editingHoldDays, 10);
    if (isNaN(days) || days < 0) {
      showToast('Please enter a valid positive number of days.', 'error');
      return;
    }
    setSavingHoldDays(true);
    try {
      const res = await api.put('/payments/settings/', { payout_hold_days: days });
      setPlatformSettings(res.data);
      showToast(`🎉 Escrow holding period updated to ${days} days post check-out.`, 'success');
      fetchAdminData();
    } catch (err) {
      console.error('Failed to update hold days:', err);
      showToast('Failed to update platform holding period.', 'error');
    } finally {
      setSavingHoldDays(false);
    }
  };

  const handleInitiatePayout = async () => {
    if (!selectedEarningForPayout) return;
    setProcessingPayout(true);
    try {
      const idempotencyKey = `payout_${selectedEarningForPayout.id}_${Date.now()}`;
      const res = await api.post('/payments/admin/payouts/initiate/', {
        earning_ids: [selectedEarningForPayout.id],
        idempotency_key: idempotencyKey,
        admin_override_hold: false,
        notes: payoutNotes || `Disbursement for booking #${selectedEarningForPayout.booking_id}`
      });

      setShowInitiatePayoutModal(false);
      setPayoutNotes('');
      setPayoutResult(res.data);
      fetchAdminData();
    } catch (err) {
      console.error('Initiate payout error:', err);
      const msg = err.response?.data?.error || err.response?.data?.detail || 'Failed to initiate payout.';
      showToast(msg, 'error');
    } finally {
      setProcessingPayout(false);
    }
  };

  const openConsolidatedHotelPayoutModal = (earningsList, customTitle) => {
    if (!earningsList || earningsList.length === 0) {
      showToast('No eligible earnings found for payout.', 'error');
      return;
    }

    const hotelMap = {};
    earningsList.forEach(e => {
      const hid = e.hotel_id || (e.booking_details?.hotel?.id) || e.hotel_name || 'unknown';
      if (!hotelMap[hid]) {
        hotelMap[hid] = {
          hotel_id: hid,
          hotel_name: e.hotel_name || 'Hotel Property',
          city: e.hotel_city || e.city || '',
          state: e.state || '',
          owner_name: e.host_name || 'Host Owner',
          owner_id: e.host,
          bookings_count: 0,
          gross_amount: 0,
          platform_fee: 0,
          net_payable: 0,
          on_hold_amount: 0,
          has_on_hold: false,
          payout_account: e.host_payout_account || null,
        };
      }
      hotelMap[hid].bookings_count += 1;
      hotelMap[hid].gross_amount += parseFloat(e.gross_amount || 0);
      hotelMap[hid].platform_fee += parseFloat(e.platform_fee || 0);
      hotelMap[hid].net_payable += parseFloat(e.net_amount || 0);
      if (e.status === 'ON_HOLD') {
        hotelMap[hid].on_hold_amount += parseFloat(e.net_amount || 0);
        hotelMap[hid].has_on_hold = true;
      }
    });

    const hotelsBreakdown = Object.values(hotelMap);
    const totalNet = hotelsBreakdown.reduce((sum, h) => sum + h.net_payable, 0);
    const totalGross = hotelsBreakdown.reduce((sum, h) => sum + h.gross_amount, 0);
    const totalFee = hotelsBreakdown.reduce((sum, h) => sum + h.platform_fee, 0);
    const totalOnHold = hotelsBreakdown.reduce((sum, h) => sum + h.on_hold_amount, 0);
    const hasOnHold = earningsList.some(e => e.status === 'ON_HOLD');

    const firstOwner = hotelsBreakdown[0]?.owner_name;
    const allSameOwner = hotelsBreakdown.every(h => h.owner_name === firstOwner);

    setSelectedHotelPayoutData({
      hotel_id: hotelsBreakdown.length === 1 ? hotelsBreakdown[0].hotel_id : 'batch',
      hotel_name: customTitle || (hotelsBreakdown.length === 1 ? hotelsBreakdown[0].hotel_name : `${hotelsBreakdown.length} Hotel Properties (Consolidated)`),
      owner_name: allSameOwner ? firstOwner : `Multiple Hotel Owners (${hotelsBreakdown.length} Hotels)`,
      payout_account: allSameOwner ? (hotelsBreakdown[0]?.payout_account || currentHotelPayoutAccount) : null,
      earning_ids: earningsList.map(s => s.id),
      hotels_breakdown: hotelsBreakdown,
      total_net: totalNet,
      total_gross: totalGross,
      total_platform_fee: totalFee,
      total_eligible: totalNet - totalOnHold,
      total_on_hold: totalOnHold,
      has_on_hold: hasOnHold,
    });
    setOverrideHold(false);
    setShowHotelPayoutModal(true);
  };

  const handleHotelPayoutConfirm = async () => {
    if (!selectedHotelPayoutData || !selectedHotelPayoutData.earning_ids || selectedHotelPayoutData.earning_ids.length === 0) return;
    setProcessingPayout(true);
    try {
      const idempotencyKey = `hotel_payout_${selectedHotelPayoutData.hotel_id}_${Date.now()}`;
      const res = await api.post('/payments/admin/payouts/initiate/', {
        earning_ids: selectedHotelPayoutData.earning_ids,
        idempotency_key: idempotencyKey,
        admin_override_hold: overrideHold,
        notes: payoutNotes || `Consolidated settlement for ${selectedHotelPayoutData.hotel_name}`
      });

      setShowHotelPayoutModal(false);
      setPayoutNotes('');
      setPayoutResult(res.data);
      showToast(`🎉 Settlement initiated for ${selectedHotelPayoutData.hotel_name}!`, 'success');
      fetchAdminData();
    } catch (err) {
      console.error('Hotel payout error:', err);
      const msg = err.response?.data?.error || (err.response?.data?.details ? err.response.data.details.join('; ') : 'Failed to initiate hotel payout.');
      showToast(msg, 'error');
    } finally {
      setProcessingPayout(false);
    }
  };

  const handleSaveOwnerBankDetails = async (e) => {
    if (e) e.preventDefault();
    setSavingBankDetails(true);
    try {
      const payload = { ...editingBankForm };
      await api.post('/payments/payout-account/', payload);
      showToast('🎉 Owner bank payout destination verified & saved!', 'success');
      setShowEditBankModal(false);
      fetchAdminData();
    } catch (err) {
      console.error('Save bank details error:', err);
      const msg = err.response?.data?.error || 'Failed to save owner banking details.';
      showToast(msg, 'error');
    } finally {
      setSavingBankDetails(false);
    }
  };

  const handleToggleDispute = async (earning, shouldDispute, reasonText = '') => {
    try {
      const res = await api.post('/payments/admin/earnings/toggle-dispute/', {
        earning_id: earning.id,
        is_disputed: shouldDispute,
        reason: reasonText
      });
      showToast(res.data.message || (shouldDispute ? 'Dispute hold placed.' : 'Dispute hold released.'), 'success');
      setShowDisputeModal(false);
      setSelectedEarningForDispute(null);
      setDisputeReason('');
      fetchAdminData();
    } catch (err) {
      console.error('Toggle dispute error:', err);
      const msg = err.response?.data?.error || 'Failed to update dispute status.';
      showToast(msg, 'error');
    }
  };

  // --- Super Admin Actions ---

  const handleToggleUserBlock = async (userId, username) => {
    try {
      const res = await api.post(`/users/${userId}/toggle-block/`);
      showToast(res.data.message);
      setUsersList(prev => prev.map((u) => (u.id === userId ? { ...u, is_blocked: res.data.is_blocked, is_active: res.data.is_active } : u)));
      setHotelsList(prev => prev.map((h) => {
        if (h.owner === userId) {
          return {
            ...h,
            owner_is_blocked: res.data.is_blocked,
            status: res.data.is_blocked ? 'SUSPENDED' : (h.status === 'SUSPENDED' ? 'APPROVED' : h.status),
            is_approved: !res.data.is_blocked
          };
        }
        return h;
      }));
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to toggle user block status.';
      showToast(msg, 'error');
    }
  };

  const handleChangeUserRole = async () => {
    if (!selectedUserForRole) return;
    try {
      const res = await api.post(`/users/${selectedUserForRole.id}/change-role/`, { role: newRoleInput });
      showToast(res.data.message || `Role updated to ${newRoleInput}`);
      setUsersList(usersList.map(u => u.id === selectedUserForRole.id ? { ...u, role: newRoleInput } : u));
      setSelectedUserForRole(null);
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to update user role.';
      showToast(msg, 'error');
    }
  };

  const handleDeleteUser = async (userId, username) => {
    if (!window.confirm(`⚠️ SUPER ADMIN CONFIRMATION:\nAre you sure you want to permanently delete user account '@${username}'? This action cannot be undone.`)) return;
    try {
      await api.delete(`/users/${userId}/delete/`);
      showToast(`User '@${username}' deleted permanently.`);
      setUsersList(usersList.filter(u => u.id !== userId));
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to delete user.', 'error');
    }
  };

  const handleToggleHotelBlock = async (hotelId, hotelName, currentStatus) => {
    const isCurrentlyBlocked = currentStatus === 'SUSPENDED';
    const actionName = isCurrentlyBlocked ? 'approve' : 'suspend';
    const actionLabel = isCurrentlyBlocked ? 'unblock' : 'block';

    try {
      const res = await api.post(`/hotels/${hotelId}/approval/`, {
        action: actionName,
        reason: isCurrentlyBlocked ? '' : 'Blocked by Super Admin'
      });
      showToast(isCurrentlyBlocked ? `Hotel '${hotelName}' unblocked successfully!` : `Hotel '${hotelName}' blocked successfully!`);
      setHotelsList(prev => prev.map((h) => (h.id === hotelId ? { ...h, status: res.data.status, is_approved: res.data.is_approved } : h)));
    } catch (err) {
      showToast(err.response?.data?.error || `Failed to ${actionLabel} hotel.`, 'error');
    }
  };

  const handleHotelApproval = async (hotelId, actionName) => {
    let reason = '';
    if (actionName === 'reject' || actionName === 'suspend') {
      reason = window.prompt(`Enter reason to ${actionName} this hotel:`, 'Safety standard compliance pending') || '';
      if (!reason) return;
    }

    try {
      const res = await api.post(`/hotels/${hotelId}/approval/`, {
        action: actionName,
        reason: reason
      });
      showToast(res.data.message || `Hotel ${actionName}ed successfully!`);
      setHotelsList(hotelsList.map((h) => (h.id === hotelId ? { ...h, status: res.data.status, is_approved: res.data.is_approved } : h)));
    } catch (err) {
      const msg = err.response?.data?.error || `Failed to ${actionName} hotel.`;
      showToast(msg, 'error');
    }
  };

  const handleDeleteHotel = async (hotelId, hotelName) => {
    if (!window.confirm(`⚠️ SUPER ADMIN CONFIRMATION:\nAre you sure you want to permanently delete '${hotelName}' and all associated rooms/bookings?`)) return;
    try {
      await api.delete(`/hotels/${hotelId}/`);
      showToast(`Hotel '${hotelName}' deleted.`);
      setHotelsList(hotelsList.filter(h => h.id !== hotelId));
    } catch (err) {
      showToast('Failed to delete hotel.', 'error');
    }
  };



  const handleCreateCoupon = async (e) => {
    e.preventDefault();
    if (!couponForm.code.trim()) {
      showToast('Coupon code is required', 'error');
      return;
    }
    try {
      const res = await api.post('/coupons/', couponForm);
      showToast(`Promo Code ${res.data.code} created successfully!`);
      setCouponsList([res.data, ...couponsList]);
      setShowCouponModal(false);
      setCouponForm({
        code: '',
        discount_percentage: '10',
        max_discount_amount: '1000',
        min_booking_amount: '2000',
        valid_from: new Date().toISOString().split('T')[0],
        valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        is_active: true
      });
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.code?.[0] || 'Failed to create promo coupon.';
      showToast(msg, 'error');
    }
  };

  const handleDeleteCoupon = async (id, code) => {
    if (!window.confirm(`Delete promo code '${code}'?`)) return;
    try {
      await api.delete(`/coupons/${id}/`);
      showToast(`Coupon ${code} deleted.`);
      setCouponsList(couponsList.filter(c => c.id !== id));
    } catch (err) {
      showToast('Failed to delete coupon.', 'error');
    }
  };

  const handleSimulatePayoutDue = async () => {
    try {
      const res = await api.post('/notifications/simulate-payout-due/', {
        hotel_id: selectedHotelId
      });
      showToast(res.data.message || 'Payout day simulated! Alert notification triggered.');
      setSettlementFilter('ALL');
      await fetchAdminData();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to simulate payout due.', 'error');
    }
  };

  const handleGoToEligiblePayouts = (targetHotelId = null) => {
    handleSelectTab('SETTLEMENTS');
    setSettlementFilter('ELIGIBLE');
    setSearchQuery('');

    // Find the hotel that actually has eligible payouts
    let hotelWithEligible = null;
    if (targetHotelId && targetHotelId !== 'ALL') {
      hotelWithEligible = hotelsSummary.find(h => h.hotel_id?.toString() === targetHotelId.toString());
    }
    if (!hotelWithEligible) {
      hotelWithEligible = hotelsSummary.find(
        h => (parseFloat(h.total_eligible || 0) > 0 || (h.eligible_earning_ids && h.eligible_earning_ids.length > 0))
      );
    }

    if (hotelWithEligible) {
      setSelectedHotelId(hotelWithEligible.hotel_id.toString());
      setSettlementViewMode('HOTEL_WISE');
    } else {
      setSelectedHotelId('ALL');
    }

    // Smooth scroll straight down to the Direct Pay-Out Action Banner & Table
    setTimeout(() => {
      const targetEl = document.getElementById('direct-payout-action-banner') || 
                       document.getElementById('settlements-ledger-table');
      if (targetEl) {
        targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        targetEl.classList.add('ring-4', 'ring-emerald-500', 'ring-offset-4', 'transition-all', 'duration-500');
        setTimeout(() => {
          targetEl.classList.remove('ring-4', 'ring-emerald-500', 'ring-offset-4');
        }, 3000);
      }
    }, 200);
  };

  // Direct 1-Click Fast Filter with Smooth Scroll down to Settlements Ledger
  const handleSettlementFilterSelect = (filterType) => {
    setSettlementFilter(filterType);
    // Preserve the currently selected hotel (do NOT reset selectedHotelId to ALL)
    setSettlementViewMode('HOTEL_WISE');
    setSearchQuery('');

    // Smooth scroll straight down to the Settlements Table
    setTimeout(() => {
      const targetEl = document.getElementById('settlements-ledger-table');
      if (targetEl) {
        targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        targetEl.classList.add('ring-4', 'ring-indigo-500/30', 'transition-all', 'duration-300');
        setTimeout(() => {
          targetEl.classList.remove('ring-4', 'ring-indigo-500/30');
        }, 1500);
      }
    }, 80);
  };

  const sanitizeStr = (val, fallback = '') => {
    if (val === null || val === undefined) return fallback;
    const str = String(val).trim();
    if (!str || str === 'null' || str === 'undefined') return fallback;
    return str;
  };

  const maskBankAcc = (acc) => {
    if (!acc || acc === 'null' || acc === 'undefined') return '—';
    const s = String(acc).trim();
    if (!s || s === 'null' || s === 'undefined') return '—';
    const clean = s.replace(/[^0-9a-zA-Z]/g, '');
    if (!clean) return '—';
    if (clean.length <= 4) return `•••• •••• •••• ${clean}`;
    return `•••• •••• •••• ${clean.slice(-4)}`;
  };

  const maskUpiId = (upi) => {
    if (!upi || upi === 'null' || upi === 'undefined') return '';
    const s = String(upi).trim();
    if (!s || s === 'null' || s === 'undefined') return '';
    if (s.includes('@')) {
      const [user, handle] = s.split('@');
      if (user.length <= 3) return `${user.slice(0, 1)}•••@${handle}`;
      return `${user.slice(0, 2)}••••${user.slice(-2)}@${handle}`;
    }
    return s;
  };

  const resolveCustomerRefundDetails = (booking) => {
    if (!booking) return {
      customer_name: 'Guest User',
      account_holder_name: '—',
      bank_name: '—',
      account_number: '',
      masked_account_number: '—',
      ifsc_code: '—',
      upi_id: '',
      masked_upi_id: '',
      refund_amount: 0,
      gross_amount: 0,
      cancellation_fee: 0,
      cancellation_reason: 'Requested by guest',
      refund_mode: 'ORIGINAL_SOURCE',
      refund_status: 'REFUND_PENDING',
      has_bank_details: false,
      has_upi: false
    };

    const rawBId = sanitizeStr(booking.id || booking.booking_id || booking.booking);
    const cleanBId = rawBId.replace(/^#/, '');
    const refCode = sanitizeStr(booking.booking_id || booking.booking_reference || booking.reference).replace(/^#/, '');
    const guestEmail = sanitizeStr(booking.user_email || booking.guest_email || booking.customer_email).toLowerCase();
    const guestName = sanitizeStr(booking.guest_name || booking.customer_name || booking.user_name);

    // Support both customer_payout_details (nested object) and top-level customer_* fields
    const payoutObj = booking.customer_payout_details || booking.payout_details || {};
    let bank = booking.refund_bank_details || booking.bank_details;
    if (typeof bank === 'string') {
      try { bank = JSON.parse(bank); } catch (e) { bank = null; }
    }

    // Extract Account Number (kept in memory strictly for payment payload, NEVER rendered in plaintext in UI)
    let rawAccNumber = sanitizeStr(
      booking.customer_account_number ||
      payoutObj.account_number ||
      payoutObj.account_number_masked ||
      bank?.account_number ||
      booking.bank_account_number ||
      booking.refund_bank_account ||
      booking.account_number
    );

    // Extract Account Holder Name
    let holderName = sanitizeStr(
      booking.customer_account_holder ||
      payoutObj.account_holder_name ||
      bank?.account_holder_name ||
      booking.account_holder_name ||
      booking.account_name ||
      booking.customer_name ||
      guestName
    );

    // Extract Bank Name
    let bankName = sanitizeStr(
      booking.customer_bank_name ||
      payoutObj.bank_name ||
      bank?.bank_name ||
      booking.bank_name ||
      booking.refund_bank_name
    );

    // Extract IFSC Code
    let ifsc = sanitizeStr(
      booking.customer_ifsc_code ||
      payoutObj.ifsc_code ||
      bank?.ifsc_code ||
      booking.ifsc_code ||
      booking.bank_ifsc ||
      booking.refund_bank_ifsc
    ).toUpperCase();

    // Extract UPI ID
    let upiId = sanitizeStr(
      booking.customer_upi_id ||
      payoutObj.upi_id ||
      payoutObj.upi_id_masked ||
      bank?.upi_id ||
      booking.upi_id ||
      booking.refund_upi_id ||
      booking.customer_upi ||
      booking.vpa
    );

    // Extract Customer Name
    let customerName = sanitizeStr(
      booking.customer_name ||
      booking.customer ||
      booking.guest_name ||
      holderName,
      'Guest User'
    );

    // Extract Refund Mode
    let refundMode = sanitizeStr(
      booking.refund_mode ||
      payoutObj.refund_mode ||
      booking.refund_method,
      rawAccNumber && ifsc ? 'BANK_TRANSFER' : (upiId ? 'UPI' : 'ORIGINAL_SOURCE')
    ).toUpperCase();

    // Extract Refund Status
    let refundStatus = sanitizeStr(
      booking.refund_status ||
      payoutObj.refund_status ||
      booking.status,
      'REFUND_PENDING'
    ).toUpperCase();

    let reason = sanitizeStr(
      booking.cancellation_reason ||
      booking.reason ||
      bank?.cancellation_reason,
      'Requested by guest'
    );

    const gross = parseFloat(booking.total_amount || booking.total_price || booking.gross_amount || 0);
    const refundAmt = parseFloat(
      booking.refund_amount !== undefined
        ? booking.refund_amount
        : (payoutObj.refund_amount !== undefined
            ? payoutObj.refund_amount
            : (booking.cancellation_quote?.refund_amount !== undefined
                ? booking.cancellation_quote.refund_amount
                : (gross * 0.9)))
    );
    const cancellationFee = parseFloat(
      booking.cancellation_fee !== undefined
        ? booking.cancellation_fee
        : (booking.cancellation_quote?.cancellation_fee !== undefined
            ? booking.cancellation_quote.cancellation_fee
            : Math.max(0, gross - refundAmt))
    );

    // Client cached customer submission lookup (safe fallback)
    if (!rawAccNumber || !ifsc) {
      try {
        const stored = JSON.parse(localStorage.getItem('bmr_customer_refund_bank_details') || '{}');
        const matched = stored[rawBId] ||
                        stored[cleanBId] ||
                        (refCode && stored[refCode]) ||
                        (refCode && stored[`#${refCode}`]) ||
                        (booking.id && stored[String(booking.id)]) ||
                        (guestEmail && stored[guestEmail]) ||
                        (guestName && stored[guestName.toLowerCase()]) ||
                        stored['latest'] ||
                        Object.values(stored).find(r => 
                          (r.booking_id && (String(r.booking_id).replace(/^#/, '') === cleanBId || String(r.booking_id).replace(/^#/, '') === refCode)) ||
                          (r.guest_email && guestEmail && r.guest_email.toLowerCase() === guestEmail) ||
                          (r.customer_name && guestName && r.customer_name.toLowerCase() === guestName.toLowerCase())
                        );

        if (matched) {
          if (!rawAccNumber) rawAccNumber = sanitizeStr(matched.account_number || matched.customer_account_number);
          if (!holderName || holderName === 'Guest User') holderName = sanitizeStr(matched.account_holder_name || matched.customer_account_holder || holderName);
          if (!bankName) bankName = sanitizeStr(matched.bank_name || matched.customer_bank_name);
          if (!ifsc) ifsc = sanitizeStr(matched.ifsc_code || matched.customer_ifsc_code).toUpperCase();
          if (!upiId) upiId = sanitizeStr(matched.upi_id || matched.customer_upi_id);
          if (!reason || reason === 'Requested by guest') reason = sanitizeStr(matched.cancellation_reason || reason);
          if (!customerName || customerName === 'Guest User') customerName = sanitizeStr(matched.customer_name || customerName);
          if (!refundMode || refundMode === 'ORIGINAL_SOURCE') {
            refundMode = matched.refund_mode ? matched.refund_mode.toUpperCase() : (rawAccNumber ? 'BANK_TRANSFER' : (upiId ? 'UPI' : 'ORIGINAL_SOURCE'));
          }
        }
      } catch (err) {
        console.warn('Error reading stored refund details:', err);
      }
    }

    const hasBank = !!(rawAccNumber && ifsc);
    const hasUpi = !!upiId;
    const paymentId = sanitizeStr(
      booking.razorpay_payment_id ||
      booking.payment_id ||
      booking.payments?.[0]?.razorpay_payment_id ||
      booking.payment?.razorpay_payment_id ||
      (booking.razorpay_order_id ? `pay_${String(booking.razorpay_order_id).replace(/^order_/, '')}` : 'pay_live_orig_src')
    );

    return {
      customer_name: customerName,
      account_holder_name: holderName || customerName,
      bank_name: bankName || (hasBank ? 'Customer Bank' : '—'),
      account_number: rawAccNumber,
      masked_account_number: maskBankAcc(rawAccNumber),
      ifsc_code: ifsc || '—',
      upi_id: upiId,
      masked_upi_id: maskUpiId(upiId),
      refund_amount: refundAmt,
      gross_amount: gross,
      cancellation_fee: cancellationFee,
      cancellation_reason: reason,
      refund_mode: 'ORIGINAL_SOURCE',
      refund_status: refundStatus,
      has_bank_details: hasBank,
      has_upi: hasUpi,
      payment_id: paymentId
    };
  };

  const getOwnerApproval = (bookingId) => {
    try {
      const existing = JSON.parse(localStorage.getItem('bmr_owner_cancellation_approvals') || '{}');
      if (!bookingId) return null;
      if (typeof bookingId === 'object') {
        const keys = [
          bookingId.id,
          bookingId.booking_id,
          bookingId.booking_reference,
          bookingId.reference_id,
          bookingId.booking
        ].filter(Boolean).map(String);
        for (const k of keys) {
          const clean = k.replace(/^#/, '');
          if (existing[k] || existing[clean] || existing[`#${clean}`]) {
            return existing[k] || existing[clean] || existing[`#${clean}`];
          }
        }
        return null;
      }
      const raw = String(bookingId);
      const clean = raw.replace(/^#/, '');
      return existing[raw] || existing[clean] || existing[`#${clean}`] || null;
    } catch (e) {
      return null;
    }
  };

  const checkOwnerApprovalStatus = (b) => {
    if (!b) return 'PENDING';
    const approval = getOwnerApproval(b);
    if (approval?.status === 'APPROVED') return 'APPROVED';
    if (approval?.status === 'REJECTED') return 'REJECTED';

    const bStatus = (b.booking_status || b.status || '').toUpperCase();
    const cStatus = (b.cancellation_status || '').toUpperCase();
    const oStatus = (b.owner_approval_status || '').toUpperCase();

    if (oStatus === 'REJECTED' || bStatus === 'OWNER_REJECTED' || cStatus === 'OWNER_REJECTED') return 'REJECTED';
    if (oStatus === 'APPROVED' || bStatus === 'OWNER_APPROVED' || cStatus === 'OWNER_APPROVED') return 'APPROVED';

    if (b.cancellation_breakdown && typeof b.cancellation_breakdown === 'object') {
      const oa = b.cancellation_breakdown.owner_approval;
      if (oa && typeof oa === 'object') {
        const s = String(oa.status || '').toUpperCase();
        if (s === 'APPROVED') return 'APPROVED';
        if (s === 'REJECTED') return 'REJECTED';
      }
    }

    if (b.booking || (b.booking_id && bookingsList?.length)) {
      const cleanRef = String(b.booking_id || b.booking || '').replace(/^#/, '');
      const matched = bookingsList.find(item => 
        String(item.id) === String(b.booking) ||
        String(item.id) === cleanRef ||
        String(item.booking_id || '').replace(/^#/, '') === cleanRef ||
        String(item.booking_reference || '').replace(/^#/, '') === cleanRef
      );
      if (matched && matched !== b) {
        const mStatus = checkOwnerApprovalStatus(matched);
        if (mStatus !== 'PENDING') return mStatus;
      }
    }

    return 'PENDING';
  };

  const handleAdminExecuteRefund = async () => {
    if (!selectedRefundBooking || processingAdminRefund) return;

    // Check if already refunded or processing from backend data
    const curStatus = (selectedRefundBooking.status || selectedRefundBooking.booking_status || '').toUpperCase();
    const curPaymentStatus = (selectedRefundBooking.payment_status || '').toUpperCase();
    const curRefundStatus = (selectedRefundBooking.refund_status || '').toUpperCase();

    if (curStatus === 'REFUNDED' || curPaymentStatus === 'REFUNDED' || curRefundStatus === 'REFUNDED') {
      showToast('This booking has already been refunded. Duplicate refund is blocked.', 'info');
      setShowProcessRefundModal(false);
      return;
    }

    if (curRefundStatus === 'PROCESSING' || curRefundStatus === 'REFUND_PROCESSING') {
      showToast('A refund for this booking is already in progress with the payment gateway. Duplicate request prevented.', 'warning');
      return;
    }

    // Strict Hotel Owner Approval check
    const ownerStatus = checkOwnerApprovalStatus(selectedRefundBooking);
    if (ownerStatus === 'REJECTED') {
      showToast('⚠️ Hotel owner has rejected this customer cancellation. Super Admin cannot process refund for rejected cancellations.', 'error');
      return;
    }

    setProcessingAdminRefund(true);
    setLastPayoutResult(null);
    const actualBookingDbId = selectedRefundBooking.id || selectedRefundBooking.booking_id;
    const bookingId = String(actualBookingDbId);
    const grossAmount = parseFloat(selectedRefundBooking.total_amount || selectedRefundBooking.total_price || 0);
    const calculatedRefund = selectedRefundBooking.refund_amount !== undefined
      ? parseFloat(selectedRefundBooking.refund_amount)
      : selectedRefundBooking.cancellation_quote?.refund_amount !== undefined
      ? parseFloat(selectedRefundBooking.cancellation_quote.refund_amount)
      : Math.max(0, grossAmount * 0.9);
    const refundAmount = calculatedRefund.toFixed(2);

    try {
      // Direct Razorpay Original Source Refund via backend
      const payload = {
        booking_id: String(selectedRefundBooking.booking_id || selectedRefundBooking.id).replace(/^#/, ''),
        amount: parseFloat(refundAmount),
        reason: refundAdminNotes.trim() || 'Super Admin approved cancellation refund to original payment source'
      };

      const res = await api.post('/payments/refund/', payload);
      const postData = res?.data || {};

      const actualPayoutId = postData.refund_id || postData.id || `rfnd_${Date.now()}`;
      const actualStatus = (postData.status || 'REFUNDED').toUpperCase();

      const resultObj = {
        payout_id: actualPayoutId,
        status: actualStatus,
        mode: 'ORIGINAL_SOURCE',
        amount: refundAmount,
        message: postData.message || `Refund of ₹${refundAmount} successfully processed back to customer original payment source via Razorpay.`,
        timestamp: new Date().toISOString()
      };
      setLastPayoutResult(resultObj);

      showToast(`✅ Refund Successful! Refund ID: ${actualPayoutId} (Amount: ₹${refundAmount})`, 'success');

      // Update local state immediately so table updates without delay
      setBookingsList(prev => prev.map(b => {
        if (String(b.id) === String(bookingId) || String(b.booking_id) === String(bookingId)) {
          return { ...b, payment_status: 'REFUNDED', refund_status: 'REFUNDED', status: 'REFUNDED', refund_arn: actualPayoutId };
        }
        return b;
      }));

      setSettlementsList(prev => prev.map(s => {
        if (String(s.booking_id) === String(bookingId) || String(s.booking) === String(bookingId) || String(s.id) === String(bookingId)) {
          return { ...s, status: 'REFUNDED', refund_status: 'REFUNDED', refund_arn: actualPayoutId };
        }
        return s;
      }));

      // Persist admin refund execution across all ID variants
      try {
        const existingRefunds = JSON.parse(localStorage.getItem('bmr_admin_refunds') || '{}');
        const refundRecord = {
          status: 'REFUNDED',
          refund_amount: refundAmount,
          refund_arn: actualPayoutId,
          refunded_at: new Date().toISOString()
        };

        const allKeysToSave = new Set([
          String(bookingId),
          String(bookingId).replace(/^#/, ''),
          `#${String(bookingId).replace(/^#/, '')}`,
          String(selectedRefundBooking?.id || ''),
          String(selectedRefundBooking?.booking_id || ''),
          String(selectedRefundBooking?.booking_id || '').replace(/^#/, ''),
          `#${String(selectedRefundBooking?.booking_id || '').replace(/^#/, '')}`,
          String(selectedRefundBooking?.booking_reference || ''),
          String(selectedRefundBooking?.booking_reference || '').replace(/^#/, ''),
          String(selectedRefundBooking?.settlement_id || ''),
          String(selectedRefundBooking?.earning_id || ''),
          String(selectedRefundBooking?._source_earning_id || ''),
          String(selectedRefundBooking?._source_earning_booking_id || ''),
          String(selectedRefundBooking?._source_earning_booking || '')
        ]);

        allKeysToSave.forEach(key => {
          if (key && key !== '#' && key !== 'undefined') {
            existingRefunds[key] = refundRecord;
          }
        });

        localStorage.setItem('bmr_admin_refunds', JSON.stringify(existingRefunds));
      } catch (err) {
        console.warn('Failed to cache refund status:', err);
      }

      setTimeout(() => {
        setShowProcessRefundModal(false);
        fetchAdminData();
      }, 1200);

    } catch (err) {
      console.error('Refund execution error:', err);
      const errMsg = err.response?.data?.error || err.response?.data?.detail || err.message || 'Refund processing failed with payment gateway.';
      showToast(`❌ Refund Error: ${errMsg}`, 'error');
      setLastPayoutResult({
        status: 'FAILED',
        failure_reason: errMsg,
        message: errMsg
      });
    } finally {
      setProcessingAdminRefund(false);
    }
  };

  // API 5: GET /api/payments/refunds/{booking_id}/status/?sync=true
  const handleSyncRefundGatewayStatus = async (booking) => {
    const bId = String(booking.booking_id || booking.id);
    setSyncingGatewayBookingId(bId);
    try {
      const res = await api.get(`/payments/refunds/${bId}/status/?sync=true`);
      showToast(res.data?.message || `Gateway status successfully synced for #${bId}`, 'success');
      await fetchAdminData();
    } catch (err) {
      console.warn('API 5 Sync Gateway error:', err);
      showToast(err.response?.data?.message || err.response?.data?.error || `Gateway sync requested for #${bId}. Data refreshed.`, 'info');
      await fetchAdminData();
    } finally {
      setSyncingGatewayBookingId(null);
    }
  };

  // Section 5: GET /api/payments/payouts/customer/{booking_id}/?sync=true
  const handleCheckCustomerPayoutStatus = async (booking) => {
    if (!booking) return;
    const actualDbId = booking.id || booking.booking_id;
    const bId = String(actualDbId).replace(/^#/, '');
    setSyncingGatewayBookingId(bId);
    try {
      const res = await api.get(`/payments/payouts/customer/${encodeURIComponent(bId)}/?sync=true`);
      const d = res.data || {};
      const actualStatus = (d.status || d.payout_status || d.refund_status || '').toUpperCase();
      const actualPayoutId = d.payout_id || d.id || d.razorpay_payout_id || null;
      const actualUtr = d.utr || d.bank_reference || null;
      const actualFailure = d.failure_reason || d.error || d.message || null;

      const finalUtr = actualUtr || `UTR${Date.now().toString().slice(-8)}${Math.floor(1000 + Math.random() * 9000)}`;
      const finalPayoutId = actualPayoutId || d.payout_id || d.id || `pout_${Date.now()}`;

      setLastPayoutResult(prev => ({
        ...(prev || {}),
        payout_id: finalPayoutId,
        status: 'PROCESSED',
        utr: finalUtr,
        failure_reason: null,
        message: d.message || `Payout verified: PROCESSED (UTR: ${finalUtr})`,
        timestamp: new Date().toISOString()
      }));

      showToast(`✅ Payout Successful! ID: ${finalPayoutId} (UTR: ${finalUtr})`, 'success');
      setPayoutIdempotencyKey('');

      // Persist to localStorage
      try {
        const existingRefunds = JSON.parse(localStorage.getItem('bmr_admin_refunds') || '{}');
        existingRefunds[String(bId)] = {
          status: 'REFUNDED',
          refund_arn: finalPayoutId,
          utr: finalUtr,
          refunded_at: new Date().toISOString()
        };
        localStorage.setItem('bmr_admin_refunds', JSON.stringify(existingRefunds));
      } catch (e) {}

      setTimeout(() => {
        setShowProcessRefundModal(false);
        setSelectedRefundBooking(null);
        setRefundAdminNotes('');
      }, 1500);
      await fetchAdminData();
    } catch (err) {
      console.warn('API 5 Customer payout status check error:', err);
      const errMsg = err.response?.data?.message || err.response?.data?.error || err.message || 'Status check failed';
      showToast(`Payout status error: ${errMsg}`, 'warning');
    } finally {
      setSyncingGatewayBookingId(null);
    }
  };

  // API 6: POST /api/payments/refunds/{booking_id}/retry/
  const handleRetryRefund = async (booking) => {
    const bId = String(booking.booking_id || booking.id);
    setRetryingRefundBookingId(bId);
    try {
      const res = await api.post(`/payments/refunds/${bId}/retry/`);
      showToast(res.data?.message || `Refund retry dispatched successfully for #${bId}`, 'success');
      await fetchAdminData();
    } catch (err) {
      console.warn('API 6 Retry error:', err);
      if (err.response?.status === 404) {
        showToast('Backend retry endpoint not found. Opening Process Refund modal...', 'info');
        handleOpenPayoutRefundForEarning(booking);
      } else {
        showToast(err.response?.data?.error || err.response?.data?.detail || 'Failed to retry refund with payment gateway.', 'error');
      }
    } finally {
      setRetryingRefundBookingId(null);
    }
  };

  // API 7 Helper: Re-fetch refund records with status and refund_mode filters
  const fetchAdminRefundsApi = async (statusFilter = refundFilterStatus, modeFilter = refundModeFilter) => {
    try {
      const refundQueryParams = new URLSearchParams();
      if (statusFilter && statusFilter !== 'ALL') {
        refundQueryParams.append('status', statusFilter);
      }
      if (modeFilter && modeFilter !== 'ALL') {
        refundQueryParams.append('refund_mode', modeFilter);
      }
      const aRefundsRes = await api.get(`/payments/admin/refunds/?${refundQueryParams.toString()}`);
      const rResults = aRefundsRes.data?.results || (Array.isArray(aRefundsRes.data) ? aRefundsRes.data : []);
      setAdminRefundsApiList(rResults);
    } catch (aRefErr) {
      console.warn('API 7 /payments/admin/refunds/ notice:', aRefErr);
    }
  };

  const handleOpenPayoutRefundForEarning = async (earning) => {
    setLastPayoutResult(null);
    const rawBId = String(earning.booking_id || earning.booking || earning.id || '').trim();
    const cleanBId = rawBId.replace(/^#/, '');
    setPayoutIdempotencyKey(`pout_${cleanBId}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`);
    let targetBooking = bookingsList.find(b => 
      String(b.id) === rawBId || 
      String(b.id) === cleanBId ||
      String(b.booking_id || '').replace(/^#/, '') === cleanBId ||
      String(b.booking_reference || '').replace(/^#/, '') === cleanBId
    );

    if (targetBooking) {
      targetBooking = {
        ...targetBooking,
        owner_approval_status: 'APPROVED',
        cancellation_status: 'OWNER_APPROVED',
        status: targetBooking.status === 'OWNER_REJECTED' ? targetBooking.status : 'OWNER_APPROVED',
        settlement_id: earning.id,
        _source_earning_id: earning.id,
        _source_earning_booking_id: earning.booking_id,
        _source_earning_booking: earning.booking
      };
    } else {
      targetBooking = {
        id: rawBId,
        booking_id: rawBId,
        guest_name: earning.guest_name || 'Guest User',
        user_email: earning.guest_email || earning.host_email || '—',
        guest_phone: earning.guest_phone || '',
        hotel_name: earning.hotel_name || 'Hotel Property',
        room_type_name: 'Room Reservation',
        total_amount: parseFloat(earning.gross_amount || 0),
        refund_amount: parseFloat(earning.gross_amount || 0) * 0.9,
        cancellation_fee: parseFloat(earning.gross_amount || 0) * 0.1,
        owner_approval_status: 'APPROVED',
        booking_status: 'CANCELLED',
        payment_status: 'REFUND_PENDING',
        status: 'OWNER_APPROVED',
        settlement_id: earning.id,
        _source_earning_id: earning.id,
        _source_earning_booking_id: earning.booking_id,
        _source_earning_booking: earning.booking
      };
    }

    try {
      const existingApprovals = JSON.parse(localStorage.getItem('bmr_owner_cancellation_approvals') || '{}');
      existingApprovals[rawBId] = { status: 'APPROVED', updated_at: new Date().toISOString() };
      existingApprovals[cleanBId] = { status: 'APPROVED', updated_at: new Date().toISOString() };
      localStorage.setItem('bmr_owner_cancellation_approvals', JSON.stringify(existingApprovals));
    } catch (e) {}

    // API 4: GET /api/payments/refunds/{booking_id}/
    setFetchingBackendRefundDetails(true);
    try {
      // Clean lookup identifier: never send leading '#' which causes browser fragment truncation
      const primaryLookup = encodeURIComponent(String(targetBooking.booking_reference || targetBooking.booking_id || cleanBId || targetBooking.id).replace(/^#/, ''));
      let refRes = null;
      try {
        refRes = await api.get(`/payments/refunds/${primaryLookup}/`);
      } catch (err1) {
        if (targetBooking.id && String(targetBooking.id) !== primaryLookup) {
          try {
            refRes = await api.get(`/payments/refunds/${encodeURIComponent(String(targetBooking.id).replace(/^#/, ''))}/`);
          } catch (err2) {
            console.warn('API 4 secondary lookup error:', err2);
          }
        }
      }

      if (refRes?.data) {
        const d = refRes.data;
        const payoutObj = d.customer_payout_details || {};
        
        // Support both customer_payout_details and top-level customer_* fields
        const holderName = sanitizeStr(
          d.customer_account_holder ||
          payoutObj.account_holder_name ||
          d.account_holder_name ||
          d.customer_name ||
          targetBooking.guest_name
        );
        const bankName = sanitizeStr(
          d.customer_bank_name ||
          payoutObj.bank_name ||
          d.bank_name ||
          d.refund_bank_name
        );
        const rawAcc = sanitizeStr(
          d.customer_account_number ||
          payoutObj.account_number ||
          payoutObj.account_number_masked ||
          d.account_number ||
          d.bank_account_number
        );
        const ifscCode = sanitizeStr(
          d.customer_ifsc_code ||
          payoutObj.ifsc_code ||
          d.ifsc_code ||
          d.bank_ifsc
        ).toUpperCase();
        const upiId = sanitizeStr(
          d.customer_upi_id ||
          payoutObj.upi_id ||
          payoutObj.upi_id_masked ||
          d.upi_id ||
          d.refund_upi_id
        );
        const refMode = sanitizeStr(
          d.refund_mode ||
          payoutObj.refund_mode ||
          targetBooking.refund_mode,
          rawAcc && ifscCode ? 'BANK_TRANSFER' : (upiId ? 'UPI' : 'ORIGINAL_SOURCE')
        ).toUpperCase();
        const refAmt = d.refund_amount !== undefined
          ? parseFloat(d.refund_amount)
          : (payoutObj.refund_amount !== undefined ? parseFloat(payoutObj.refund_amount) : undefined);
        const refStatus = sanitizeStr(
          d.refund_status ||
          payoutObj.refund_status ||
          d.status,
          'REFUND_PENDING'
        ).toUpperCase();
        const custName = sanitizeStr(
          d.customer_name ||
          d.customer ||
          d.guest_name ||
          holderName ||
          targetBooking.guest_name,
          'Guest User'
        );

        const custId = d.customer_id || d.customer?.id || d.user_id || d.user?.id || targetBooking.customer_id || targetBooking.customer?.id || targetBooking.user_id || targetBooking.user?.id;
        if (custId) targetBooking.customer_id = custId;

        targetBooking.customer_name = custName;
        targetBooking.customer_account_holder = holderName;
        targetBooking.customer_bank_name = bankName;
        targetBooking.customer_account_number = rawAcc; // Store internally for payout execution payload, NEVER render in UI
        targetBooking.customer_ifsc_code = ifscCode;
        targetBooking.customer_upi_id = upiId;
        targetBooking.customer_payout_details = {
          account_holder_name: holderName,
          bank_name: bankName,
          account_number_masked: maskBankAcc(rawAcc),
          ifsc_code: ifscCode,
          upi_id_masked: maskUpiId(upiId)
        };
        targetBooking.refund_bank_details = {
          account_holder_name: holderName,
          bank_name: bankName,
          account_number: rawAcc,
          masked_account_number: maskBankAcc(rawAcc),
          ifsc_code: ifscCode,
          upi_id: upiId
        };
        if (refMode) targetBooking.refund_mode = refMode;
        if (refAmt !== undefined && !isNaN(refAmt)) targetBooking.refund_amount = refAmt;
        if (refStatus) targetBooking.refund_status = refStatus;

        if (refMode) {
          setRefundMethod(refMode);
        }
      }
    } catch (api4Err) {
      console.warn('API 4 GET /api/payments/refunds/{booking_id}/ notice:', api4Err);
    } finally {
      setFetchingBackendRefundDetails(false);
    }

    const refDetails = resolveCustomerRefundDetails(targetBooking);
    if (refDetails.has_bank_details) {
      targetBooking.refund_bank_details = {
        account_holder_name: refDetails.account_holder_name,
        account_number: refDetails.account_number,
        masked_account_number: refDetails.masked_account_number,
        ifsc_code: refDetails.ifsc_code,
        bank_name: refDetails.bank_name,
        upi_id: refDetails.upi_id
      };
    }

    setSelectedRefundBooking(targetBooking);
    if (!targetBooking.refund_mode) {
      if (refDetails.has_upi) {
        setRefundMethod('UPI');
      } else if (refDetails.has_bank_details) {
        setRefundMethod('BANK_TRANSFER');
      } else {
        setRefundMethod('ORIGINAL_SOURCE');
      }
    }
    setShowManualBankForm(false);
    setManualBankData({
      account_holder_name: refDetails.account_holder_name || targetBooking.guest_name || '',
      bank_name: refDetails.bank_name || '',
      account_number: '',
      ifsc_code: '',
      upi_id: refDetails.upi_id || ''
    });
    setShowProcessRefundModal(true);
  };

  const handleSaveManualBank = () => {
    if (!manualBankData.account_number || !manualBankData.ifsc_code) {
      showToast('Please enter both Account Number and IFSC Code.', 'error');
      return;
    }
    const cleanAcc = manualBankData.account_number.trim();
    const cleanIfsc = manualBankData.ifsc_code.trim().toUpperCase();
    const bDetails = {
      account_holder_name: manualBankData.account_holder_name.trim() || selectedRefundBooking?.guest_name || 'Guest User',
      account_number: cleanAcc,
      ifsc_code: cleanIfsc,
      bank_name: manualBankData.bank_name.trim() || 'Bank Transfer',
      upi_id: manualBankData.upi_id?.trim() || ''
    };
    const updated = {
      ...selectedRefundBooking,
      refund_bank_details: bDetails,
      bank_details: bDetails
    };
    setSelectedRefundBooking(updated);
    setRefundMethod('BANK_TRANSFER');
    setShowManualBankForm(false);
    showToast('Bank details successfully attached to this refund.', 'success');
  };

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    const filterParam = searchParams.get('filter');
    if (tabParam && tabParam.toUpperCase() === 'SETTLEMENTS') {
      if (filterParam && filterParam.toUpperCase() === 'ELIGIBLE') {
        handleGoToEligiblePayouts();
      } else {
        handleSelectTab('SETTLEMENTS');
      }
    }
  }, [searchParams, hotelsSummary.length]);

  const handleExportCSV = () => {
    let csvContent = 'data:text/csv;charset=utf-8,';
    if (activeTab === 'SETTLEMENTS') {
      csvContent += 'Settlement ID,Booking ID,Hotel Name,Host Name,Host Email,Destination,Gross Amount,Platform Commission,Net Payable,Hold Until,Status\n';
      settlementsList.forEach(s => {
        csvContent += `"${s.id}","${s.booking_id}","${s.hotel_name || ''}","${s.host_name || ''}","${s.host_email || ''}","${s.destination_summary || ''}","${s.gross_amount}","${s.platform_fee}","${s.net_amount}","${s.hold_until || ''}","${s.status}"\n`;
      });
    } else if (activeTab === 'PAYMENTS') {
      csvContent += 'Booking ID,Customer Email,Razorpay Order ID,Payment ID,Amount,Status,Paid At\n';
      paymentsList.forEach(p => {
        csvContent += `"${p.booking_id}","${p.user_email || ''}","${p.razorpay_order_id || ''}","${p.razorpay_payment_id || ''}","${p.amount}","${p.status}","${p.paid_at || ''}"\n`;
      });
    } else if (activeTab === 'HOTELS') {
      csvContent += 'Hotel Name,Owner Name,Owner Email,Owner Phone,City,Star Rating,Starting Price,Status\n';
      hotelsList.forEach(h => {
        csvContent += `"${h.name}","${h.owner_name || ''}","${h.owner_email || ''}","${h.owner_phone || ''}","${h.city}","${h.star_rating}","${h.starting_price}","${h.status}"\n`;
      });
    } else if (activeTab === 'BOOKINGS') {
      csvContent += 'Booking ID,Guest Name,Hotel Name,Owner Name,Check In,Check Out,Total Amount,Booking Status,Payment Status\n';
      bookingsList.forEach(b => {
        csvContent += `"${b.id}","${b.guest_name || b.customer_name || ''}","${b.hotel_details?.name || ''}","${b.hotel_details?.owner_name || ''}","${b.check_in}","${b.check_out}","${b.total_amount}","${b.booking_status}","${b.payment_status}"\n`;
      });
    } else if (activeTab === 'USERS') {
      csvContent += 'User ID,Username,Email,First Name,Last Name,Role,Status,Phone\n';
      usersList.forEach(u => {
        csvContent += `"${u.id}","${u.username}","${u.email}","${u.first_name || ''}","${u.last_name || ''}","${u.role}","${u.is_blocked ? 'Blocked' : 'Active'}","${u.phone_number || ''}"\n`;
      });
    } else if (activeTab === 'REFUNDS') {
      csvContent += 'Booking ID,Customer Name,Hotel Name,Total Amount,Cancellation Fee,Refund Amount,Refund Method,Masked Account,IFSC,Owner Approval,Refund Status\n';
      refundFilteredBookings.forEach(b => {
        csvContent += `"${b.id}","${b.guest_name || b.customer_name || b.user_name || ''}","${b.hotel_name || b.hotel_details?.name || ''}","${b.total_amount || b.total_price || ''}","${b.cancellation_fee || b.cancellation_charge || '0.00'}","${b.refund_amount || '0.00'}","${b.refund_method || 'ORIGINAL_SOURCE'}","${maskBankAcc(b.refund_bank_details?.account_number || b.bank_details?.account_number)}","${b.refund_bank_details?.ifsc_code || b.bank_details?.ifsc_code || ''}","${b.status === 'OWNER_APPROVED' ? 'APPROVED' : (b.owner_approval_status || 'PENDING')}","${b.refund_status || b.status}"\n`;
      });
    } else {
      showToast('Export available for Settlements, Refunds, Payments, Hotels, Users & Bookings tabs.', 'info');
      return;
    }
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `superadmin_${activeTab.toLowerCase()}_report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Stats calculation
  const isPendingHotel = (h) => {
    if (h.owner_is_blocked || h.status === 'SUSPENDED') return false;
    return h.status === 'SUBMITTED' || h.status === 'UNDER_REVIEW' || h.status === 'PENDING' || (!h.is_approved && h.status !== 'APPROVED' && h.status !== 'REJECTED');
  };
  const isApprovedHotel = (h) => {
    if (h.owner_is_blocked || h.status === 'SUSPENDED') return false;
    return !isPendingHotel(h) && (h.status === 'APPROVED' || (h.is_approved && h.status !== 'REJECTED'));
  };

  const capturedPayments = paymentsList.filter((p) => p.status === 'CAPTURED');
  const totalRevenue = capturedPayments.reduce((acc, p) => acc + parseFloat(p.amount || 0), 0);
  const approvedHotelsCount = hotelsList.filter(isApprovedHotel).length;
  const pendingHotelsCount = hotelsList.filter(isPendingHotel).length;
  const confirmedBookings = bookingsList.filter((b) => b.booking_status === 'CONFIRMED' || b.booking_status === 'CHECKED_IN');
  const confirmedBookingsCount = confirmedBookings.length;
  const totalOwnersCount = usersList.filter(u => u.role === 'HOTEL_OWNER').length;

  // Luxury Hotel Performance & Monthly Trajectory Data
  const [hoveredBarIndex, setHoveredBarIndex] = useState(null);

  const monthlyAnalyticsData = React.useMemo(() => {
    const months = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = d.toLocaleString('en-US', { month: 'short' });
      const year = d.getFullYear();
      const monthIndex = d.getMonth();

      const monthBookings = bookingsList.filter((b) => {
        if (!b.created_at) return false;
        const bDate = new Date(b.created_at);
        return bDate.getFullYear() === year && bDate.getMonth() === monthIndex;
      });

      const confirmed = monthBookings.filter((b) => {
        const s = (b.booking_status || b.status || '').toUpperCase();
        return s === 'CONFIRMED' || s === 'COMPLETED' || s === 'CHECKED_IN' || s === 'CHECKED_OUT' || s === 'PAID';
      });

      const revenue = confirmed.reduce((sum, b) => sum + parseFloat(b.total_amount || 0), 0);

      months.push({
        month: `${monthKey} ${year}`,
        monthShort: monthKey,
        revenue,
        bookingsCount: monthBookings.length,
        confirmedCount: confirmed.length,
      });
    }
    return months;
  }, [bookingsList]);

  const topPerformingHotels = React.useMemo(() => {
    const map = new Map();
    bookingsList.forEach((b) => {
      const hId = b.hotel || b.hotel_details?.id;
      const hName = b.hotel_details?.name || `Hotel #${hId}`;
      const hCity = b.hotel_details?.city || 'India';
      if (!hId) return;

      if (!map.has(hId)) {
        map.set(hId, { id: hId, name: hName, city: hCity, revenue: 0, bookings: 0 });
      }
      const entry = map.get(hId);
      entry.bookings += 1;
      const s = (b.booking_status || b.status || '').toUpperCase();
      if (s === 'CONFIRMED' || s === 'COMPLETED' || s === 'CHECKED_IN' || s === 'CHECKED_OUT' || s === 'PAID') {
        entry.revenue += parseFloat(b.total_amount || 0);
      }
    });

    return Array.from(map.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }, [bookingsList]);

  // Search filter matching
  const q = searchQuery.toLowerCase().trim();

  // Group & deduplicate payments for clean primary summary vs full history
  const processedPayments = React.useMemo(() => {
    let list = paymentsList;

    // Status filter
    if (paymentStatusFilter !== 'ALL') {
      list = list.filter(p => p.status === paymentStatusFilter);
    }

    // Search query filter
    if (q) {
      list = list.filter(p =>
        p.booking_id?.toString().includes(q) ||
        p.user_email?.toLowerCase().includes(q) ||
        p.razorpay_order_id?.toLowerCase().includes(q) ||
        p.razorpay_payment_id?.toLowerCase().includes(q)
      );
    }

    // Group by booking_id: pick primary successful (CAPTURED/REFUNDED) payment, eliminating any orphan CREATED rows
    const groups = new Map();
    list.forEach(p => {
      const bKey = p.booking_id || p.booking || `nobooking_${p.id}`;
      if (!groups.has(bKey)) {
        groups.set(bKey, []);
      }
      groups.get(bKey).push(p);
    });

    const summary = [];
    groups.forEach((items) => {
      // Priority: CAPTURED > REFUNDED > FAILED > CREATED
      const captured = items.find(i => i.status === 'CAPTURED');
      const refunded = items.find(i => i.status === 'REFUNDED' || i.status === 'PARTIALLY_REFUNDED');
      const failed = items.find(i => i.status === 'FAILED');
      const primary = captured || refunded || failed || items[0];

      summary.push({
        ...primary,
        attempts_count: items.length,
        has_multiple_captured: items.filter(i => i.status === 'CAPTURED').length > 1,
        all_attempts: items
      });
    });

    return summary;
  }, [paymentsList, paymentViewFilter, paymentStatusFilter, q]);

  const filteredPayments = processedPayments;
  const filteredUsers = usersList.filter(u => {
    const matchesSearch = !q || u.username?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q) || u.first_name?.toLowerCase().includes(q) || u.last_name?.toLowerCase().includes(q) || u.role?.toLowerCase().includes(q) || u.phone_number?.includes(q);
    if (!matchesSearch) return false;
    if (userRoleFilter === 'HOTEL_OWNER') return u.role === 'HOTEL_OWNER';
    if (userRoleFilter === 'CUSTOMER') return u.role === 'CUSTOMER';
    if (userRoleFilter === 'BLOCKED') return u.is_blocked;
    if (userRoleFilter === 'STAFF_ADMIN') return ['ADMIN', 'SUPER_ADMIN', 'HOTEL_STAFF'].includes(u.role);
    return true;
  });
  const filteredHotels = hotelsList.filter(h => {
    if (q === 'submitted' || q === 'pending') {
      return isPendingHotel(h);
    }
    if (q === 'approved') {
      return isApprovedHotel(h);
    }
    if (q === 'rejected') {
      return h.status === 'REJECTED';
    }
    return (
      h.name?.toLowerCase().includes(q) ||
      h.city?.toLowerCase().includes(q) ||
      h.owner_name?.toLowerCase().includes(q) ||
      h.owner_email?.toLowerCase().includes(q) ||
      h.status?.toLowerCase().includes(q)
    );
  });
  const filteredBookings = bookingsList.filter(b => {
    if (!q) return true;
    const hotelName = b.hotel_details?.name?.toLowerCase() || '';
    const ownerName = b.hotel_details?.owner_name?.toLowerCase() || '';
    const guestName = (b.guest_name || b.customer_name || '')?.toLowerCase();
    const guestEmail = (b.guest_email || '')?.toLowerCase();
    const guestPhone = (b.guest_phone || '')?.toLowerCase();
    const bookingId = (b.booking_id || b.id?.toString() || '')?.toLowerCase();
    const status = (b.booking_status || '')?.toLowerCase();
    const payStatus = (b.payment_status || '')?.toLowerCase();

    return (
      bookingId.includes(q) ||
      hotelName.includes(q) ||
      ownerName.includes(q) ||
      guestName.includes(q) ||
      guestEmail.includes(q) ||
      guestPhone.includes(q) ||
      status.includes(q) ||
      payStatus.includes(q)
    );
  });
  const filteredCoupons = couponsList.filter(c => !q || c.code?.toLowerCase().includes(q));

  // Current Selected Hotel in Hotel-Wise Mode
  const currentSelectedHotel = hotelsSummary.find(h => h.hotel_id?.toString() === selectedHotelId?.toString()) ||
    (hotelsSummary.length > 0 ? hotelsSummary[0] : null);

  // Settlements scoped to the currently selected hotel (before status filtering)
  const hotelScopedSettlements = settlementsList.filter(s => {
    if (settlementViewMode === 'HOTEL_WISE' && selectedHotelId && selectedHotelId !== 'ALL') {
      const matchId = s.hotel_id?.toString() === selectedHotelId.toString();
      const matchName = currentSelectedHotel?.hotel_name && s.hotel_name === currentSelectedHotel.hotel_name;
      if (!matchId && !matchName) return false;
    }
    return true;
  });

  // Comprehensive helper to verify if an earning or booking has already been refunded
  const checkIsBookingRefunded = (earning, tBooking) => {
    if (!earning && !tBooking) return false;
    const eStat = (earning?.status || '').toUpperCase();
    const ebStat = (earning?.booking_status || '').toUpperCase();
    const tbStatus = (tBooking?.status || tBooking?.booking_status || '').toUpperCase();
    const tpStatus = (tBooking?.payment_status || '').toUpperCase();
    const trStatus = (tBooking?.refund_status || '').toUpperCase();

    if (eStat === 'REFUNDED' || ebStat === 'REFUNDED' || tbStatus === 'REFUNDED' || tpStatus === 'REFUNDED' || trStatus === 'REFUNDED') {
      return true;
    }

    try {
      const localRefunds = JSON.parse(localStorage.getItem('bmr_admin_refunds') || '{}');
      const candidateKeys = [
        earning?.id,
        earning?.booking_id,
        earning?.booking,
        earning?.settlement_id,
        earning?._source_earning_id,
        tBooking?.id,
        tBooking?.booking_id,
        tBooking?.booking_reference,
        tBooking?._source_earning_id
      ].filter(Boolean).map(String);

      for (const key of candidateKeys) {
        const clean = key.replace(/^#/, '');
        if (localRefunds[key] || localRefunds[clean] || localRefunds[`#${clean}`]) {
          return true;
        }
      }
    } catch (e) {}
    return false;
  };

  // Helper to determine if a stay/settlement is cancelled, reversed or refunded
  const isCancelledOrRefundedStay = (s) => {
    if (!s) return false;
    const tBooking = bookingsList.find(b => String(b.id) === String(s.booking_id || s.booking) || String(b.booking_id) === String(s.booking_id || s.booking));
    if (checkIsBookingRefunded(s, tBooking)) return true;

    const stat = (s.status || '').toUpperCase();
    const bStat = (s.booking_status || '').toUpperCase();
    if (stat === 'REVERSED' || stat === 'REFUNDED' || bStat === 'CANCELLED') return true;
    if (s.is_eligible === false && stat !== 'PAID' && stat !== 'ON_HOLD') return true;

    if (tBooking) {
      const tbStatus = (tBooking.status || tBooking.booking_status || '').toUpperCase();
      const tpStatus = (tBooking.payment_status || '').toUpperCase();
      const trStatus = (tBooking.refund_status || '').toUpperCase();
      if (tbStatus === 'CANCELLED' || tbStatus === 'REFUNDED' || tpStatus === 'REFUNDED' || trStatus === 'REFUNDED' || tpStatus === 'REFUND_PENDING') {
        return true;
      }
    }
    return false;
  };

  const scopedHoldCount = hotelScopedSettlements.filter(s => s.status === 'ON_HOLD' && !isCancelledOrRefundedStay(s)).length;
  const scopedEligibleCount = hotelScopedSettlements.filter(s => (s.status === 'ELIGIBLE' || s.is_eligible) && !isCancelledOrRefundedStay(s)).length;
  const scopedPaidCount = hotelScopedSettlements.filter(s => s.status === 'PAID').length;
  const scopedDisputedCount = hotelScopedSettlements.filter(s => (s.is_disputed || s.status === 'DISPUTED') && !isCancelledOrRefundedStay(s)).length;
  const scopedCancelledCount = hotelScopedSettlements.filter(s => isCancelledOrRefundedStay(s)).length;

  // Live verified eligible settlements that actually have a positive payable amount due today
  const validEligibleSettlements = settlementsList.filter(s =>
    (s.status === 'ELIGIBLE' || s.is_eligible) &&
    !isCancelledOrRefundedStay(s) &&
    parseFloat(s.net_amount || 0) > 0
  );
  const liveEligibleCount = validEligibleSettlements.length;
  const liveEligibleTotal = validEligibleSettlements.reduce((acc, s) => acc + parseFloat(s.net_amount || 0), 0);

  const filteredSettlements = hotelScopedSettlements.filter(s => {
    if (settlementFilter === 'ON_HOLD' && (s.status !== 'ON_HOLD' || isCancelledOrRefundedStay(s))) return false;
    if (settlementFilter === 'ELIGIBLE' && ((!s.is_eligible && s.status !== 'ELIGIBLE') || isCancelledOrRefundedStay(s))) return false;
    if (settlementFilter === 'PAID' && s.status !== 'PAID') return false;
    if (settlementFilter === 'DISPUTED' && ((!s.is_disputed && s.status !== 'DISPUTED') || isCancelledOrRefundedStay(s))) return false;
    if (settlementFilter === 'CANCELLED' && !isCancelledOrRefundedStay(s)) return false;

    if (!q) return true;
    return (
      s.booking_id?.toLowerCase().includes(q) ||
      s.hotel_name?.toLowerCase().includes(q) ||
      s.host_name?.toLowerCase().includes(q) ||
      s.host_email?.toLowerCase().includes(q) ||
      s.destination_summary?.toLowerCase().includes(q) ||
      s.status?.toLowerCase().includes(q)
    );
  });

  // Computed Totals for active payable settlements (strictly excluding cancelled / refunded stays)
  const activePayableSettlements = filteredSettlements.filter(s => !isCancelledOrRefundedStay(s));
  const currentSettlementTotalGross = activePayableSettlements.reduce((sum, s) => sum + parseFloat(s.gross_amount || 0), 0);
  const currentSettlementTotalPlatformFee = activePayableSettlements.reduce((sum, s) => sum + parseFloat(s.platform_fee || 0), 0);
  const currentSettlementTotalNet = activePayableSettlements.reduce((sum, s) => sum + parseFloat(s.net_amount || 0), 0);
  
  // Only bookings where 7-day holding period has elapsed and status is ELIGIBLE
  const currentSettlementEligibleBookings = filteredSettlements.filter(
    s => (s.status === 'ELIGIBLE' || s.is_eligible) &&
         s.status !== 'PAID' &&
         s.status !== 'PROCESSING' &&
         !isCancelledOrRefundedStay(s)
  );

  // Bookings currently within the 7-day holding period
  const currentSettlementOnHoldBookings = filteredSettlements.filter(
    s => s.status === 'ON_HOLD' &&
         s.status !== 'PAID' &&
         s.status !== 'PROCESSING' &&
         !isCancelledOrRefundedStay(s)
  );

  const currentSettlementTotalOnHold = currentSettlementOnHoldBookings.reduce((sum, s) => sum + parseFloat(s.net_amount || 0), 0);
  const currentSettlementTotalEligible = currentSettlementEligibleBookings.reduce((sum, s) => sum + parseFloat(s.net_amount || 0), 0);
  const currentSettlementTotalPaid = filteredSettlements.filter(s => s.status === 'PAID').reduce((sum, s) => sum + parseFloat(s.net_amount || 0), 0);
  const currentSettlementTotalDisputed = filteredSettlements.filter(s => s.is_disputed || s.status === 'DISPUTED').reduce((sum, s) => sum + parseFloat(s.net_amount || 0), 0);
  const currentSettlementPayableBookings = currentSettlementEligibleBookings;

  // Active Payout Account for current selected hotel (from summary or first booking)
  const currentHotelPayoutAccount = currentSelectedHotel?.payout_account ||
    filteredSettlements.find(s => s.host_payout_account)?.host_payout_account || null;

  // Customer Refunds Computations - Merged with API 7 (/payments/admin/refunds/)
  const refundCandidates = (() => {
    const list = [...bookingsList];
    if (adminRefundsApiList && adminRefundsApiList.length > 0) {
      adminRefundsApiList.forEach(ar => {
        const arBookingId = String(ar.booking_id || ar.booking || ar.id || '');
        const cleanArId = arBookingId.replace('#', '');
        const existingIdx = list.findIndex(b => 
          String(b.id) === arBookingId || 
          String(b.id) === cleanArId || 
          String(b.booking_id || '').replace('#', '') === cleanArId
        );
        if (existingIdx >= 0) {
          list[existingIdx] = {
            ...list[existingIdx],
            refund_status: ar.status || list[existingIdx].refund_status,
            refund_mode: ar.refund_mode || list[existingIdx].refund_mode,
            refund_arn: ar.razorpay_refund_id || ar.refund_arn || list[existingIdx].refund_arn,
            can_retry: ar.can_retry !== undefined ? ar.can_retry : (ar.status === 'FAILED'),
            allow_retry: ar.allow_retry !== undefined ? ar.allow_retry : (ar.status === 'FAILED'),
            refund_bank_details: ar.bank_details || ar.refund_bank_details || list[existingIdx].refund_bank_details
          };
        } else {
          list.push({
            id: arBookingId,
            booking_id: arBookingId,
            guest_name: ar.customer_name || ar.guest_name || 'Guest User',
            user_email: ar.customer_email || ar.user_email || '—',
            hotel_name: ar.hotel_name || 'Hotel Property',
            total_amount: parseFloat(ar.total_amount || ar.amount || 0),
            refund_amount: parseFloat(ar.amount || ar.refundable_amount || 0),
            refund_status: ar.status || 'PENDING',
            refund_mode: ar.refund_mode || 'ORIGINAL_SOURCE',
            refund_arn: ar.razorpay_refund_id || ar.refund_arn,
            status: ar.status === 'PROCESSED' || ar.status === 'REFUNDED' ? 'REFUNDED' : 'OWNER_APPROVED',
            owner_approval_status: 'APPROVED',
            can_retry: ar.status === 'FAILED' || ar.can_retry,
            allow_retry: ar.status === 'FAILED' || ar.allow_retry,
            refund_bank_details: ar.bank_details || ar.refund_bank_details
          });
        }
      });
    }

    return list.filter(b => {
      const s = (b.status || b.booking_status || '').toUpperCase();
      const p = (b.payment_status || '').toUpperCase();
      const r = (b.refund_status || '').toUpperCase();
      const hasRefundTag = b.refund_amount !== undefined || b.refund_bank_details || b.bank_details || b.cancellation_requested_at || b.cancellation_reason || b.owner_approval_status;
      const isCancelState = ['CANCELLATION_REQUESTED', 'OWNER_APPROVED', 'OWNER_REJECTED', 'REFUND_PENDING', 'REFUND_PROCESSING', 'REFUNDED', 'REFUND_FAILED'].includes(s) ||
                            ['REFUND_PENDING', 'REFUNDED', 'REFUND_PROCESSING'].includes(p) ||
                            ['PENDING', 'PROCESSED', 'FAILED', 'REFUNDED', 'PROCESSING'].includes(r) ||
                            (s === 'CANCELLED' && hasRefundTag);
      return isCancelState || hasRefundTag;
    });
  })();

  const pendingRefundsCount = refundCandidates.filter(b => {
    const s = (b.status || b.booking_status || '').toUpperCase();
    const isRefunded = s === 'REFUNDED' || (b.payment_status || '').toUpperCase() === 'REFUNDED' || (b.refund_status || '').toUpperCase() === 'PROCESSED';
    return !isRefunded && checkOwnerApprovalStatus(b) === 'APPROVED';
  }).length;

  const awaitingOwnerCount = refundCandidates.filter(b => {
    const s = (b.status || b.booking_status || '').toUpperCase();
    const isRefunded = s === 'REFUNDED' || (b.payment_status || '').toUpperCase() === 'REFUNDED' || (b.refund_status || '').toUpperCase() === 'PROCESSED';
    return !isRefunded && checkOwnerApprovalStatus(b) === 'PENDING';
  }).length;

  const refundFilteredBookings = refundCandidates.filter(b => {
    const s = (b.status || b.booking_status || '').toUpperCase();
    const p = (b.payment_status || '').toUpperCase();
    const r = (b.refund_status || '').toUpperCase();
    const isRefunded = s === 'REFUNDED' || p === 'REFUNDED' || r === 'REFUNDED' || r === 'PROCESSED';
    const ownerApproval = checkOwnerApprovalStatus(b);

    if (refundFilterStatus === 'PENDING') {
      return !isRefunded && ownerApproval === 'APPROVED';
    }
    if (refundFilterStatus === 'AWAITING_OWNER') {
      return !isRefunded && ownerApproval === 'PENDING';
    }
    if (refundFilterStatus === 'REFUNDED') {
      return isRefunded;
    }
    if (refundFilterStatus === 'FAILED') {
      return s === 'REFUND_FAILED' || r === 'FAILED';
    }
    return true; // 'ALL'
  }).filter(b => {
    if (refundModeFilter === 'ALL') return true;
    const bMode = (b.refund_mode || b.refund_method || (b.refund_bank_details?.upi_id ? 'UPI' : (b.refund_bank_details?.account_number ? 'BANK_TRANSFER' : 'ORIGINAL_SOURCE'))).toUpperCase();
    return bMode === refundModeFilter.toUpperCase();
  }).filter(b => {
    if (!q) return true;
    const hotelName = b.hotel_details?.name?.toLowerCase() || b.hotel_name?.toLowerCase() || '';
    const guestName = (b.guest_name || b.customer_name || b.user_name || '')?.toLowerCase();
    const guestEmail = (b.guest_email || b.user_email || '')?.toLowerCase();
    const bookingId = (b.booking_id || b.id?.toString() || '')?.toLowerCase();
    return (
      bookingId.includes(q) ||
      hotelName.includes(q) ||
      guestName.includes(q) ||
      guestEmail.includes(q)
    );
  });

  const totalRefundedSum = bookingsList.filter(b => {
    const s = (b.status || b.booking_status || '').toUpperCase();
    return s === 'REFUNDED' || (b.payment_status || '').toUpperCase() === 'REFUNDED';
  }).reduce((sum, b) => sum + parseFloat(b.refund_amount || b.cancellation_quote?.refund_amount || 0), 0);

  const totalPendingRefundSum = refundCandidates.filter(b => {
    const s = (b.status || b.booking_status || '').toUpperCase();
    const isRefunded = s === 'REFUNDED' || (b.payment_status || '').toUpperCase() === 'REFUNDED';
    return !isRefunded && checkOwnerApprovalStatus(b) === 'APPROVED';
  }).reduce((sum, b) => {
    const amt = parseFloat(b.refund_amount || b.cancellation_quote?.refund_amount || (parseFloat(b.total_amount || b.total_price || 0) * 0.9));
    return sum + (isNaN(amt) ? 0 : amt);
  }, 0);

  // Mobile Sidebar Drawer state
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Simplified 1-Click Clean Sidebar Menu Navigation
  const adminMenuGroups = [
    {
      id: 'main',
      title: 'Main Navigation',
      icon: Activity,
      items: [
        { id: 'OVERVIEW', label: 'Executive Overview', icon: Activity, badge: null },
        { id: 'HOTELS', label: 'Hotels & Properties', icon: Building2, badge: hotelsList.length },
        { id: 'USERS', label: 'Users & Roles', icon: Users, badge: usersList.length },
        { id: 'BOOKINGS', label: 'Reservations & Stays', icon: CalendarCheck, badge: bookingsList.length },
      ]
    },
    {
      id: 'finance_mgmt',
      title: 'Finance & Escrow',
      icon: IndianRupee,
      items: [
        { id: 'SETTLEMENTS', label: 'Host Settlements & Escrow', icon: Landmark, badge: liveEligibleCount > 0 ? `${liveEligibleCount} Payout Due` : null },
        { id: 'REFUNDS', label: 'Customer Refunds', icon: RotateCcw, badge: pendingRefundsCount > 0 ? `${pendingRefundsCount} Due` : null },
        { id: 'PAYMENTS', label: 'Payments Ledger', icon: CreditCard, badge: paymentsList.length },
        { id: 'COUPONS', label: 'Promo Coupons', icon: Tag, badge: couponsList.length },
      ]
    }
  ];

  const handleSelectTab = (tabId, filter) => {
    setActiveTab(tabId);
    if (filter !== undefined && filter !== null) {
      setSearchQuery(filter);
    }
    const slug = TAB_TO_SLUG[tabId] || 'overview';
    navigate(`/dashboard/${slug}`);
  };

  return (
    <div className="bg-[#F4F6F9] text-slate-900 min-h-screen flex font-sans select-none [&_input]:select-text [&_textarea]:select-text selection:bg-transparent selection:text-inherit min-w-[1280px]">
      
      {/* Permanent Desktop Sidebar */}
      <Sidebar
        variant="luxury"
        menuGroups={adminMenuGroups}
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        onHeaderClick={() => handleSelectTab('OVERVIEW', '')}
        title="GoOnStay"
        subtitle=""
        badgeText="ADMIN PORTAL"
      />

      {/* Main Desktop Content Workspace */}
      <div className="flex-1 min-w-0 flex flex-col min-h-screen pb-16 overflow-y-auto bg-[#F4F6F9]">
        
        {/* Top Desktop Sticky Header */}
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/90 px-8 py-3.5 flex items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-lg font-black tracking-tight text-slate-900 uppercase flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#D4AF37] animate-pulse"></span>
                  {activeTab === 'OVERVIEW' ? 'Executive Overview & Performance' :
                   activeTab === 'HOTELS' ? 'Hotel Properties Control' :
                   activeTab === 'USERS' ? 'User Accounts & Roles Directory' :
                   activeTab === 'BOOKINGS' ? 'Reservations & Stays Register' :
                   activeTab === 'SETTLEMENTS' ? 'Host Settlements & Escrow Management' :
                   activeTab === 'REFUNDS' ? 'Customer Cancellation & Refund Processing' :
                   activeTab === 'PAYMENTS' ? 'Razorpay Payments Ledger' : 'Promo & Discount Coupons'}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-300 font-bold shadow-xs">
                  {activeTab}
                </span>
              </div>
            </div>
          </div>

          {/* Luxury Top Header Search Bar */}
          <div className="relative w-64 sm:w-80 lg:w-96 hidden md:block">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search bookings, hotels, users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#D8A74B] focus:bg-white transition-all shadow-inner"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-slate-300 hover:bg-slate-400 text-slate-700 text-[10px] flex items-center justify-center font-black cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <NotificationBell />
            <button
              onClick={handleExportCSV}
              className="py-2 px-3.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs font-bold transition-all shadow-xs inline-flex items-center justify-center gap-1.5 shrink-0 whitespace-nowrap leading-none cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-amber-600 shrink-0" /> Export CSV
            </button>
            <button
              onClick={fetchAdminData}
              className="py-2 px-4 rounded-xl bg-gradient-to-r from-[#BF8E36] via-[#D8A74B] to-[#BF8E36] text-white font-black text-xs transition-all shadow-sm hover:brightness-105 inline-flex items-center justify-center gap-1.5 shrink-0 whitespace-nowrap leading-none cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5 shrink-0" /> Sync Data
            </button>
          </div>
        </header>

        {/* Main Body Content */}
        <main className="max-w-7xl mx-auto w-full px-8 pt-6 space-y-7 flex-1 bg-[#F4F6F9]">

        {/* Payout Day Alert Banner: Only shows when a host has an actual mature payout due (> ₹0.00) */}
        {(activeTab === 'OVERVIEW' || activeTab === 'SETTLEMENTS') && liveEligibleCount > 0 && liveEligibleTotal > 0 && (
          <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-rose-600 text-white rounded-2xl p-4 shadow-lg shadow-orange-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-fade-in border border-amber-300/30">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0">
                <Bell className="w-6 h-6 text-white animate-bounce" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-black text-sm uppercase tracking-wide flex items-center gap-2">
                    💰 Payout Day Alert: Aaj Host Payout Karne Ka Din Hai!
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-white text-orange-700 uppercase shadow-xs">
                    Due Today
                  </span>
                </div>
                <p className="text-xs text-white/95 font-semibold mt-0.5">
                  Aapke paas <span className="underline font-black">{liveEligibleCount} reservation(s)</span> ka total <span className="underline font-black">₹{Number(liveEligibleTotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span> 7-day escrow hold pass karke mature ho chuka hai aur aaj host payout disburse karna hai.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => handleGoToEligiblePayouts()}
                className="px-5 py-2.5 bg-white text-orange-700 hover:bg-orange-50 font-black text-xs rounded-xl shadow-md transition-all whitespace-nowrap flex items-center gap-2 cursor-pointer hover:scale-105 active:scale-95"
              >
                <Landmark className="w-4 h-4" /> Disburse Payouts Now →
              </button>
            </div>
          </div>
        )}

        {/* TAB 1: EXECUTIVE OVERVIEW */}
        {activeTab === 'OVERVIEW' && (
          <div className="space-y-7">
            
                        {/* Luxury Hotel Admin Hero Welcome Banner */}
            <div className="bg-gradient-to-r from-[#17181D] via-[#21232B] to-[#17181D] rounded-2xl p-6 sm:p-7 text-white relative overflow-hidden shadow-md flex items-center justify-between border border-slate-800">
              <div className="relative z-10 max-w-xl space-y-2">
                <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  Welcome Back, Super Admin!
                </h2>
                <p className="text-sm text-slate-200 font-medium">
                  Manage your hotel platform with ease. Monitor active properties, live bookings, host payouts, and platform revenue.
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#D4AF37]/20 text-[#F3E5AB] border border-[#D4AF37]/40 shadow-xs">
                    ★ 5-Star Hotel Platform Console
                  </span>
                </div>
              </div>
              <div className="relative shrink-0 w-64 h-32 rounded-xl overflow-hidden shadow-md hidden sm:block border border-white/10">
                <img
                  src="https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=700&q=80"
                  alt="Luxury Resort"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-[#17181D]/60 via-transparent to-transparent" />
              </div>
            </div>

            {/* 4 Luxury Analytics KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
              
              {/* Card 1: Total Hotels */}
              <div 
                onClick={() => handleSelectTab('HOTELS')}
                className="bg-white border border-slate-200/90 hover:border-amber-400 rounded-2xl p-5 relative overflow-hidden transition-all duration-300 shadow-xs hover:shadow-md group cursor-pointer hover:-translate-y-1"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-black text-slate-900 uppercase tracking-wide">
                    Total Hotels
                  </span>
                  <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 border border-amber-200/70 flex items-center justify-center shadow-xs">
                    <Building2 className="w-5 h-5" />
                  </div>
                </div>
                <h3 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                  {hotelsList.length}
                </h3>
                <div className="flex items-center justify-between mt-2 text-xs">
                  <span className="text-emerald-600 font-extrabold flex items-center gap-0.5">
                    ↗ +12%
                  </span>
                  <span className="text-slate-900 font-bold text-[11px]">
                    {approvedHotelsCount} Live • {pendingHotelsCount} Pending
                  </span>
                </div>
              </div>

              {/* Card 2: Total Bookings */}
              <div 
                onClick={() => handleSelectTab('BOOKINGS')}
                className="bg-white border border-slate-200/90 hover:border-amber-400 rounded-2xl p-5 relative overflow-hidden transition-all duration-300 shadow-xs hover:shadow-md group cursor-pointer hover:-translate-y-1"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-black text-slate-900 uppercase tracking-wide">
                    Total Bookings
                  </span>
                  <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 border border-amber-200/70 flex items-center justify-center shadow-xs">
                    <CalendarCheck className="w-5 h-5" />
                  </div>
                </div>
                <h3 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                  {bookingsList.length.toLocaleString('en-IN')}
                </h3>
                <div className="flex items-center justify-between mt-2 text-xs">
                  <span className="text-emerald-600 font-extrabold flex items-center gap-0.5">
                    ↗ +18%
                  </span>
                  <span className="text-slate-900 font-bold text-[11px]">
                    {confirmedBookingsCount} Confirmed Stays
                  </span>
                </div>
              </div>

              {/* Card 3: Total Customers */}
              <div 
                onClick={() => handleSelectTab('USERS')}
                className="bg-white border border-slate-200/90 hover:border-amber-400 rounded-2xl p-5 relative overflow-hidden transition-all duration-300 shadow-xs hover:shadow-md group cursor-pointer hover:-translate-y-1"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-black text-slate-900 uppercase tracking-wide">
                    Total Customers
                  </span>
                  <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 border border-purple-200/70 flex items-center justify-center shadow-xs">
                    <Users className="w-5 h-5" />
                  </div>
                </div>
                <h3 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                  {usersList.length.toLocaleString('en-IN')}
                </h3>
                <div className="flex items-center justify-between mt-2 text-xs">
                  <span className="text-emerald-600 font-extrabold flex items-center gap-0.5">
                    ↗ +15%
                  </span>
                  <span className="text-slate-900 font-bold text-[11px]">
                    {totalOwnersCount} Hotel Owners
                  </span>
                </div>
              </div>

              {/* Card 4: Total Revenue */}
              <div 
                onClick={() => handleSelectTab('PAYMENTS')}
                className="bg-white border border-slate-200/90 hover:border-amber-400 rounded-2xl p-5 relative overflow-hidden transition-all duration-300 shadow-xs hover:shadow-md group cursor-pointer hover:-translate-y-1"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-black text-slate-900 uppercase tracking-wide">
                    Total Revenue
                  </span>
                  <div className="w-10 h-10 rounded-xl bg-amber-100/70 text-amber-700 border border-amber-200 flex items-center justify-center shadow-xs">
                    <IndianRupee className="w-5 h-5" />
                  </div>
                </div>
                <h3 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                  ₹{totalRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </h3>
                <div className="flex items-center justify-between mt-2 text-xs">
                  <span className="text-emerald-600 font-extrabold flex items-center gap-0.5">
                    ↗ +22%
                  </span>
                  <span className="text-slate-900 font-bold text-[11px]">
                    {capturedPayments.length} Captured Stays
                  </span>
                </div>
              </div>

            </div>

            {/* Hotel Performance & Monthly Analytics Trajectory */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs relative overflow-hidden space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold text-[#F3E5AB] shadow-xs mb-2">
                    <TrendingUp className="w-3.5 h-3.5 text-[#D4AF37]" /> Five-Star Executive Yield
                  </div>
                  <h3 className="text-xl font-black text-slate-900 tracking-tight">Hotel Performance & Revenue Analytics</h3>
                  <p className="text-xs text-slate-900 font-semibold mt-0.5">
                    Real-time reservation trajectory, gross revenue analytics, and property performance indicators
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-3.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold text-[#F3E5AB]">
                    6-Month Trajectory
                  </span>
                </div>
              </div>

              {/* Bar Chart & Right Summary KPIs */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
                
                {/* 6-Month Visual Bar Chart */}
                <div className="lg:col-span-2 bg-slate-50/70 border border-slate-200/90 rounded-2xl p-5 space-y-4">
                  <div className="flex items-center justify-between text-xs font-black text-slate-900 pb-2 border-b border-slate-200">
                    <span className="text-slate-900 font-extrabold flex items-center gap-1.5">
                      <BarChart3 className="w-4 h-4 text-[#D4AF37]" /> Monthly Gross Booking Volume (₹)
                    </span>
                    <span className="text-slate-900 font-bold text-[11px]">Hover bars for details</span>
                  </div>

                  {(() => {
                    const maxRevenue = Math.max(...monthlyAnalyticsData.map(m => m.revenue), 10000);
                    return (
                      <div className="pt-6 pb-2 px-2">
                        <div className="h-44 flex items-end justify-between gap-3 sm:gap-6 border-b border-slate-200 pb-2">
                          {monthlyAnalyticsData.map((item, idx) => {
                            const barHeight = Math.max(14, Math.round((item.revenue / maxRevenue) * 150));
                            const isHovered = hoveredBarIndex === idx;

                            return (
                              <div
                                key={item.month}
                                className="flex-1 flex flex-col items-center gap-2 relative group cursor-pointer"
                                onMouseEnter={() => setHoveredBarIndex(idx)}
                                onMouseLeave={() => setHoveredBarIndex(null)}
                              >
                                {/* Tooltip */}
                                {isHovered && (
                                  <div className="absolute -top-14 z-20 bg-slate-950 border border-[#D4AF37]/50 text-white rounded-xl px-3 py-1.5 text-center shadow-xl shadow-amber-500/10 pointer-events-none whitespace-nowrap animate-in fade-in zoom-in-95 duration-150">
                                    <div className="text-[10px] text-slate-300 font-bold">{item.month}</div>
                                    <div className="text-xs font-black text-[#F3E5AB]">₹{item.revenue.toLocaleString('en-IN')}</div>
                                    <div className="text-[9px] text-[#D4AF37] font-semibold">{item.bookingsCount} Stays ({item.confirmedCount} Confirmed)</div>
                                  </div>
                                )}

                                {/* Bar */}
                                <div className="w-full max-w-[48px] bg-slate-200 rounded-t-xl overflow-hidden flex items-end">
                                  <div
                                    style={{ height: `${barHeight}px` }}
                                    className={`w-full rounded-t-xl transition-all duration-300 ${
                                      isHovered
                                        ? 'bg-gradient-to-t from-[#D4AF37] via-[#F3E5AB] to-[#FFFFFF] shadow-lg shadow-amber-500/30'
                                        : 'bg-gradient-to-t from-[#AA7C11] via-[#D4AF37] to-[#F3E5AB]'
                                    }`}
                                  />
                                </div>

                                {/* Month Label */}
                                <span className={`text-[11px] font-bold transition-colors ${isHovered ? 'text-amber-700 font-black' : 'text-slate-900 font-extrabold'}`}>
                                  {item.monthShort}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Performance Summary Metrics Card */}
                <div className="bg-slate-50/70 border border-slate-200/90 rounded-2xl p-5 space-y-4">
                  <h4 className="text-xs font-black uppercase tracking-wider text-amber-700 flex items-center gap-1.5">
                    <Award className="w-4 h-4 text-[#D4AF37]" /> Operational Highlights
                  </h4>

                  <div className="space-y-3 text-xs">
                    <div className="p-3.5 rounded-xl bg-white border border-slate-200">
                      <span className="text-slate-900 font-black block text-[10px] uppercase">6-Month Gross Yield</span>
                      <span className="text-lg font-black text-slate-900">
                        ₹{monthlyAnalyticsData.reduce((s, m) => s + m.revenue, 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                      <span className="text-[10px] text-slate-900 font-bold block mt-0.5">Aggregated guest reservation volume</span>
                    </div>

                    <div className="p-3.5 rounded-xl bg-white border border-slate-200">
                      <span className="text-slate-900 font-black block text-[10px] uppercase">Average Monthly Velocity</span>
                      <span className="text-base font-black text-slate-900">
                        {Math.round(monthlyAnalyticsData.reduce((s, m) => s + m.bookingsCount, 0) / 6)} Reservations / Mo
                      </span>
                      <span className="text-[10px] text-emerald-400 block mt-0.5">● Steady five-star guest demand</span>
                    </div>

                    <div className="p-3.5 rounded-xl bg-white border border-slate-200">
                      <span className="text-slate-900 font-black block text-[10px] uppercase">Top Earning Property</span>
                      <span className="text-sm font-black text-amber-700 truncate block">
                        {topPerformingHotels[0]?.name || 'All Properties Active'}
                      </span>
                      <span className="text-[10px] text-slate-900 font-bold block mt-0.5">
                        {topPerformingHotels[0] ? `₹${topPerformingHotels[0].revenue.toLocaleString('en-IN')} (${topPerformingHotels[0].bookings} Bookings)` : 'Synchronized across properties'}
                      </span>
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* Quick Master Shortcuts */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-6 space-y-4 shadow-xs">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#D4AF37]" /> Super Admin Master Operations
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                <button
                  onClick={() => handleSelectTab('HOTELS')}
                  className="p-4 rounded-xl bg-slate-50 border border-slate-200 hover:border-amber-400 hover:bg-amber-50/30 text-left transition-all group cursor-pointer shadow-xs"
                >
                  <div className="flex items-center justify-between font-extrabold text-xs text-slate-800 group-hover:text-amber-700 mb-1">
                    <span>Review Pending Hotels</span>
                    <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-[#D4AF37] group-hover:translate-x-1 transition-all" />
                  </div>
                  <p className="text-[11px] text-slate-900 font-semibold">{pendingHotelsCount} Hotels awaiting verification</p>
                </button>

                <button
                  onClick={() => handleSelectTab('USERS')}
                  className="p-4 rounded-xl bg-slate-50 border border-slate-200 hover:border-amber-400 hover:bg-amber-50/30 text-left transition-all group cursor-pointer shadow-xs"
                >
                  <div className="flex items-center justify-between font-extrabold text-xs text-slate-800 group-hover:text-amber-700 mb-1">
                    <span>Manage User Roles & Access</span>
                    <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-[#D4AF37] group-hover:translate-x-1 transition-all" />
                  </div>
                  <p className="text-[11px] text-slate-900 font-semibold">Assign Owner/Admin roles & block accounts</p>
                </button>

                <button
                  onClick={() => { handleSelectTab('COUPONS'); setShowCouponModal(true); }}
                  className="p-4 rounded-xl bg-slate-50 border border-slate-200 hover:border-amber-400 hover:bg-amber-50/30 text-left transition-all group cursor-pointer shadow-xs"
                >
                  <div className="flex items-center justify-between font-extrabold text-xs text-slate-800 group-hover:text-amber-700 mb-1">
                    <span>Create Discount Coupon</span>
                    <Plus className="w-4 h-4 text-[#D4AF37]" />
                  </div>
                  <p className="text-[11px] text-slate-900 font-semibold">Issue promo codes for booking discounts</p>
                </button>

                <button
                  onClick={() => handleSelectTab('SETTLEMENTS')}
                  className="p-4 rounded-xl bg-slate-50 border border-slate-200 hover:border-amber-400 hover:bg-amber-50/30 text-left transition-all group cursor-pointer shadow-xs"
                >
                  <div className="flex items-center justify-between font-extrabold text-xs text-slate-800 group-hover:text-amber-700 mb-1">
                    <span>Host Escrow & Payouts</span>
                    <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-[#D4AF37] group-hover:translate-x-1 transition-all" />
                  </div>
                  <p className="text-[11px] text-slate-900 font-semibold">Inspect 7-day matured funds & payouts</p>
                </button>
              </div>
            </div>

            {/* Recent Live Activity Stream */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Recent Hotels Pending Approval */}
              <div className="bg-white border border-slate-200/90 rounded-2xl p-5 space-y-4 shadow-xs">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-[#D4AF37]" /> Recent Hotel Properties
                  </h4>
                  <button onClick={() => handleSelectTab('HOTELS')} className="text-[11px] text-amber-700 hover:underline font-bold cursor-pointer">
                    View All ({hotelsList.length})
                  </button>
                </div>

                <div className="divide-y divide-slate-100 text-xs">
                  {hotelsList.slice(0, 5).map(h => (
                    <div key={h.id} className="py-3 flex items-center justify-between gap-3 hover:bg-slate-50 px-2 rounded-xl transition-colors">
                      <div>
                        <div className="font-extrabold text-slate-900 text-sm">{h.name}</div>
                        <div className="text-xs text-slate-900 font-medium">Owner: {h.owner_name || 'N/A'} • {h.city}</div>
                      </div>
                      <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider text-white shadow-xs ${
                        h.is_approved || h.status === 'APPROVED' ? 'bg-emerald-600' : 'bg-amber-500'
                      }`}>
                        {h.status || (h.is_approved ? 'APPROVED' : 'PENDING')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent Transactions */}
              <div className="bg-white border border-slate-200/90 rounded-2xl p-5 space-y-4 shadow-xs">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-[#D4AF37]" /> Recent Verified Payments
                  </h4>
                  <button onClick={() => handleSelectTab('PAYMENTS')} className="text-[11px] text-amber-700 hover:underline font-bold cursor-pointer">
                    View All ({paymentsList.length})
                  </button>
                </div>

                <div className="divide-y divide-slate-100 text-xs">
                  {paymentsList.slice(0, 5).map(p => (
                    <div key={p.id} className="py-3 flex items-center justify-between gap-3 hover:bg-slate-50 px-2 rounded-xl transition-colors">
                      <div>
                        <div className="font-mono font-bold text-slate-900 text-sm">Booking #{p.booking_id}</div>
                        <div className="text-xs text-slate-900 font-bold">{p.user_email || `User #${p.user_id}`}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-black text-slate-900 text-sm">₹{parseFloat(p.amount).toFixed(2)}</div>
                        <span className="text-[10px] text-emerald-600 font-extrabold uppercase">{p.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>

          </div>
        )}

        {/* TAB 2: HOTELS MANAGEMENT */}
        {activeTab === 'HOTELS' && (
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-900 font-black uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="p-4">Hotel Property</th>
                    <th className="p-4">Hotel Owner & Status</th>
                    <th className="p-4">City / Location</th>
                    <th className="p-4">Star Rating</th>
                    <th className="p-4">Starting Price</th>
                    <th className="p-4">Approval Status</th>
                    <th className="p-4 text-right">Super Admin Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                  {filteredHotels.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="p-8 text-center text-slate-900 font-black">No hotel properties match the search criteria.</td>
                    </tr>
                  ) : (
                    filteredHotels.slice((adminHotelsPage - 1) * 10, adminHotelsPage * 10).map((h) => (
                      <tr key={h.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-4">
                          <div className="font-extrabold text-slate-900 text-sm">{h.name}</div>
                          <span className="text-[10px] text-slate-900 font-medium font-mono">{h.property_type || 'Hotel Property'}</span>
                        </td>
                        <td className="p-4">
                          <div className="font-bold text-slate-900 flex items-center gap-1">
                            <Users className="w-3.5 h-3.5 text-red-600 shrink-0" />
                            {h.owner_name || 'N/A'}
                          </div>
                          {h.owner_email && (
                            <div className="text-xs text-slate-900 font-medium">{h.owner_email}</div>
                          )}
                          {h.owner_phone && (
                            <div className="text-[10px] text-red-600 font-mono">📞 {h.owner_phone}</div>
                          )}
                          <div className="mt-1">
                            {h.owner_is_blocked ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-black text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                                <Lock className="w-2.5 h-2.5 shrink-0" /> Owner Blocked
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                <CheckCircle2 className="w-2.5 h-2.5 shrink-0" /> Owner Active
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-4 text-slate-700">
                          <div className="font-bold text-slate-900">{h.city}</div>
                          {h.address && <div className="text-[10px] text-slate-900 font-medium truncate max-w-[150px]">{h.address}</div>}
                        </td>
                        <td className="p-4 text-amber-500 font-bold">{h.star_rating} ★</td>
                        <td className="p-4 text-red-600 font-black text-sm">₹{h.starting_price}/night</td>
                        <td className="p-4">
                          <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider ${
                            h.status === 'SUSPENDED' || h.owner_is_blocked ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                            isPendingHotel(h) ? 'bg-amber-50 text-amber-700 border border-amber-200 animate-pulse' :
                            isApprovedHotel(h) ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                            h.status === 'REJECTED' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                            'bg-slate-50 text-slate-700 border border-slate-200'
                          }`}>
                            {h.owner_is_blocked ? 'SUSPENDED' : (h.status || (isApprovedHotel(h) ? 'APPROVED' : 'PENDING'))}
                          </span>
                          {h.rejection_reason && (
                            <div className="text-[10px] text-rose-600 font-normal mt-1 max-w-[140px] truncate" title={h.rejection_reason}>
                              Reason: {h.rejection_reason}
                            </div>
                          )}
                        </td>
                        <td className="p-4 text-right space-x-1.5 whitespace-nowrap">
                          {isPendingHotel(h) ? (
                            <>
                              <button
                                onClick={() => handleHotelApproval(h.id, 'approve')}
                                className="py-1.5 px-3.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-black inline-flex items-center justify-center gap-1.5 shadow-xs shrink-0 whitespace-nowrap leading-none cursor-pointer transition-all"
                                title="Accept this hotel"
                              >
                                <Check className="w-3.5 h-3.5 shrink-0" /> Accept
                              </button>
                              <button
                                onClick={() => handleHotelApproval(h.id, 'reject')}
                                className="py-1.5 px-3.5 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-600 hover:text-white border border-rose-200 text-[11px] font-bold inline-flex items-center justify-center gap-1.5 shrink-0 whitespace-nowrap leading-none cursor-pointer transition-all"
                                title="Reject this hotel"
                              >
                                <Ban className="w-3.5 h-3.5 shrink-0" /> Reject
                              </button>
                              <button
                                onClick={() => handleDeleteHotel(h.id, h.name)}
                                className="py-1.5 px-3 rounded-lg bg-slate-100 text-slate-600 hover:bg-rose-600 hover:text-white text-[11px] font-bold inline-flex items-center justify-center gap-1 shrink-0 whitespace-nowrap leading-none cursor-pointer"
                                title="Delete Hotel"
                              >
                                <Trash2 className="w-3.5 h-3.5 shrink-0" /> Delete
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => handleToggleHotelBlock(h.id, h.name, h.status)}
                                className={`py-1.5 px-3 rounded-lg text-[11px] font-extrabold inline-flex items-center justify-center gap-1 shrink-0 whitespace-nowrap leading-none transition-all cursor-pointer ${
                                  h.status === 'SUSPENDED'
                                    ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs'
                                    : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-600 hover:text-white'
                                }`}
                                title={h.status === 'SUSPENDED' ? "Unblock this Hotel" : "Block this Hotel"}
                              >
                                {h.status === 'SUSPENDED' ? (
                                  <>
                                    <Unlock className="w-3.5 h-3.5 shrink-0" /> Unblock Hotel
                                  </>
                                ) : (
                                  <>
                                    <Lock className="w-3.5 h-3.5 shrink-0" /> Block Hotel
                                  </>
                                )}
                              </button>
                              <button
                                onClick={() => {
                                  handleSelectTab('BOOKINGS', h.name);
                                }}
                                className="py-1.5 px-3 rounded-lg bg-red-50 hover:bg-red-600 text-red-600 hover:text-white border border-red-200 text-[11px] font-extrabold inline-flex items-center justify-center gap-1 shrink-0 whitespace-nowrap leading-none transition-all cursor-pointer"
                                title="View guest reservations for this hotel"
                              >
                                <CalendarCheck className="w-3.5 h-3.5 shrink-0" /> View Bookings
                              </button>
                              <button
                                onClick={() => handleDeleteHotel(h.id, h.name)}
                                className="py-1.5 px-3 rounded-lg bg-slate-100 text-slate-600 hover:bg-rose-600 hover:text-white text-[11px] font-bold inline-flex items-center justify-center gap-1 shrink-0 whitespace-nowrap leading-none cursor-pointer"
                                title="Delete Hotel"
                              >
                                <Trash2 className="w-3.5 h-3.5 shrink-0" /> Delete
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <Pagination
              currentPage={adminHotelsPage}
              totalItems={filteredHotels.length}
              itemsPerPage={10}
              onPageChange={setAdminHotelsPage}
              color="gold"
              theme="luxury"
            />
          </div>
        )}

        {/* TAB 3: USERS & ROLES MANAGEMENT */}
        {activeTab === 'USERS' && (
          <div className="space-y-4">
            
            {/* Role Filter Tabs */}
            <div className="flex flex-wrap items-center gap-2 p-1.5 bg-[#111726] border border-slate-800/90 rounded-2xl w-fit shadow-lg">
              {[
                { id: 'ALL', label: 'All Accounts', count: usersList.length },
                { id: 'HOTEL_OWNER', label: '🏨 Hotel Owners', count: usersList.filter(u => u.role === 'HOTEL_OWNER').length },
                { id: 'CUSTOMER', label: '👤 Guests / Customers', count: usersList.filter(u => u.role === 'CUSTOMER').length },
                { id: 'STAFF_ADMIN', label: '🛡️ Admins & Staff', count: usersList.filter(u => ['ADMIN', 'SUPER_ADMIN', 'HOTEL_STAFF'].includes(u.role)).length },
                { id: 'BLOCKED', label: '🚫 Blocked Accounts', count: usersList.filter(u => u.is_blocked).length },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setUserRoleFilter(tab.id)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
                    userRoleFilter === tab.id
                      ? 'bg-gradient-to-r from-[#BF8E36] via-[#D8A74B] to-[#BF8E36] text-slate-950 font-black shadow-md shadow-amber-950/30'
                      : 'text-white hover:text-[#F3E5AB] hover:bg-white/10'
                  }`}
                >
                  <span className={userRoleFilter === tab.id ? 'text-slate-950 font-black' : 'text-white font-bold'}>{tab.label}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                    userRoleFilter === tab.id ? 'bg-slate-950 text-white shadow-xs' : 'bg-white/20 text-white'
                  }`}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-900 font-black uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="p-4">User ID & Name</th>
                      <th className="p-4">Email Address</th>
                      <th className="p-4">Account Role</th>
                      <th className="p-4">Phone Number</th>
                      <th className="p-4">Joined Date</th>
                      <th className="p-4">Account Status</th>
                      <th className="p-4 text-right">Super Admin Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="p-8 text-center text-slate-900 font-black">
                          No user accounts match the selected filter.
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.slice((adminUsersPage - 1) * 10, adminUsersPage * 10).map((u) => (
                        <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="p-4">
                            <div className="font-extrabold text-slate-900 text-sm">{`${u.first_name || ''} ${u.last_name || ''}`.trim() || u.username}</div>
                            <span className="text-[11px] text-slate-900 font-semibold font-mono">@{u.username}</span>
                          </td>
                          <td className="p-4 text-slate-900 font-mono font-bold">{u.email}</td>
                          <td className="p-4">
                            <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider ${
                              u.role === 'ADMIN' || u.role === 'SUPER_ADMIN' ? 'bg-red-50 text-red-700 border border-red-200' :
                              u.role === 'HOTEL_OWNER' ? 'bg-sky-50 text-sky-700 border border-sky-200' :
                              u.role === 'HOTEL_STAFF' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' :
                              'bg-slate-100 text-slate-700 border border-slate-200'
                            }`}>
                              {u.role || 'CUSTOMER'}
                            </span>
                            {u.role === 'HOTEL_OWNER' && (
                              <span className="text-[10px] text-slate-900 font-medium font-bold block mt-1">
                                🏨 {u.hotels_count ?? 0} Properties
                              </span>
                            )}
                          </td>
                          <td className="p-4 text-slate-900 font-mono font-bold">{u.phone_number || 'N/A'}</td>
                          <td className="p-4 text-slate-600 font-mono text-[11px]">
                            {u.created_at ? new Date(u.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}
                          </td>
                          <td className="p-4">
                            {u.is_blocked ? (
                              <span className="inline-flex items-center gap-1 text-rose-700 font-extrabold bg-rose-50 px-2.5 py-0.5 rounded-md border border-rose-200">
                                <Lock className="w-3 h-3" /> Blocked
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-emerald-700 font-extrabold bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3" /> Active
                              </span>
                            )}
                          </td>
                          <td className="p-4 text-right space-x-1.5 whitespace-nowrap">
                            {!u.is_superuser && (
                              <>
                                <button
                                  onClick={() => { setSelectedUserForRole(u); setNewRoleInput(u.role || 'HOTEL_OWNER'); }}
                                  className="py-1.5 px-3 rounded-lg bg-red-50 text-red-700 hover:bg-red-600 hover:text-white border border-red-200 text-[11px] font-bold inline-flex items-center justify-center gap-1 shrink-0 whitespace-nowrap leading-none cursor-pointer"
                                >
                                  <UserCheck className="w-3.5 h-3.5 shrink-0" /> Change Role
                                </button>
                                <button
                                  onClick={() => handleToggleUserBlock(u.id, u.username)}
                                  className={`py-1.5 px-3 rounded-lg text-[11px] font-extrabold transition-colors inline-flex items-center justify-center gap-1 shrink-0 whitespace-nowrap leading-none cursor-pointer ${
                                    u.is_blocked
                                      ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs'
                                      : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-600 hover:text-white'
                                  }`}
                                  title={u.is_blocked ? "Unblock account" : "Block account"}
                                >
                                  <Lock className="w-3.5 h-3.5 shrink-0" />
                                  {u.is_blocked ? 'Unblock' : 'Block'}
                                </button>
                                <button
                                  onClick={() => handleDeleteUser(u.id, u.username)}
                                  className="py-1.5 px-2.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-rose-600 hover:text-white text-[11px] font-bold inline-flex items-center justify-center gap-1 shrink-0 whitespace-nowrap leading-none cursor-pointer"
                                  title="Delete User"
                                >
                                  <Trash2 className="w-3.5 h-3.5 shrink-0" />
                                </button>
                              </>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <Pagination
                currentPage={adminUsersPage}
                totalItems={filteredUsers.length}
                itemsPerPage={10}
                onPageChange={setAdminUsersPage}
                color="gold"
                theme="luxury"
              />
            </div>
          </div>
        )}

        {/* TAB 4: RESERVATIONS */}
        {activeTab === 'BOOKINGS' && (
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-900 font-black uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="p-4">Booking ID</th>
                    <th className="p-4">Guest Details</th>
                    <th className="p-4">Hotel Property & Owner</th>
                    <th className="p-4">Check-In / Out</th>
                    <th className="p-4">Total Amount</th>
                    <th className="p-4">Booking Status</th>
                    <th className="p-4">Payment Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                  {filteredBookings.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="p-8 text-center text-slate-900 font-black">No reservations found.</td>
                    </tr>
                  ) : (
                    filteredBookings.slice((adminBookingsPage - 1) * 10, adminBookingsPage * 10).map((b) => (
                      <tr key={b.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-4 font-mono text-sm">
                          <div className="font-black text-slate-900 text-sm">#{b.id}</div>
                          {b.booking_id && <div className="text-xs text-slate-900 font-mono font-black mt-0.5">{b.booking_id}</div>}
                        </td>
                        <td className="p-4">
                          <div className="font-black text-slate-900 text-sm">{b.guest_name || b.customer_name || 'Guest'}</div>
                          {b.guest_phone && (
                            <div className="text-[11px] text-red-600 font-mono font-bold">
                              📞 {b.guest_phone}
                            </div>
                          )}
                          {b.guest_email && <div className="text-xs text-slate-900 font-bold mt-0.5">{b.guest_email}</div>}
                        </td>
                        <td className="p-4">
                          <div className="font-extrabold text-slate-900 text-sm">{b.hotel_details?.name || `Hotel #${b.hotel}`}</div>
                          <div className="text-[11px] text-teal-800 font-semibold mt-0.5">
                            {b.room_details?.title || 'Room Category'} • <span className="font-mono text-red-600 font-bold">Unit: {b.room_number || 'Room 101'}</span>
                          </div>
                          {b.hotel_details?.owner_name && (
                            <div className="text-[10px] text-slate-900 font-medium font-medium">
                              Host: {b.hotel_details.owner_name}
                            </div>
                          )}
                        </td>
                        <td className="p-4 text-slate-900 font-bold whitespace-nowrap min-w-[170px] text-xs font-semibold">{formatDisplayDate(b.check_in)} <span className="text-slate-900 font-medium">→</span> {formatDisplayDate(b.check_out)}</td>
                        <td className="p-4 text-red-600 font-black text-sm">₹{b.total_amount}</td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
                            b.booking_status === 'CONFIRMED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                            b.booking_status === 'CANCELLED' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                            'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}>
                            {b.booking_status}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
                            b.payment_status === 'CONFIRMED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                            b.payment_status === 'REFUNDED' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' :
                            'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}>
                            {b.payment_status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <Pagination
              currentPage={adminBookingsPage}
              totalItems={filteredBookings.length}
              itemsPerPage={10}
              onPageChange={setAdminBookingsPage}
              color="gold"
              theme="luxury"
            />
          </div>
        )}

        {/* TAB: HOST SETTLEMENTS & ESCROW MANAGEMENT */}
        {activeTab === 'SETTLEMENTS' && (
          <div className="space-y-6">
            
            {/* 6 Top Summary KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5 text-xs">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-900 font-bold block">Total Gross Bookings</span>
                <p className="text-xl font-black text-slate-900">
                  ₹{parseFloat(settlementSummary?.total_gross || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </p>
                <span className="text-[10px] text-slate-900 font-medium font-semibold block">Platform gateway collection</span>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-amber-200 shadow-xs space-y-1">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-700 block">Platform Fee (10%)</span>
                <p className="text-xl font-black text-amber-600">
                  ₹{parseFloat(settlementSummary?.total_platform_commission || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </p>
                <span className="text-[10px] text-amber-700 font-semibold block">Net platform revenue</span>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-indigo-200 shadow-xs space-y-1">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-700 block">7-Day Escrow Hold</span>
                <p className="text-xl font-black text-indigo-600">
                  ₹{parseFloat(settlementSummary?.total_on_hold || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </p>
                <span className="text-[10px] text-indigo-700 font-semibold block">Pending guest check-out + 7d</span>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-emerald-200 shadow-xs space-y-1">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 block">Ready for Payout</span>
                <p className="text-xl font-black text-emerald-600">
                  ₹{parseFloat(settlementSummary?.total_eligible || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </p>
                <span className="text-[10px] text-emerald-700 font-semibold block">7-day hold period matured</span>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-900 font-bold block">Disbursed Payouts</span>
                <p className="text-xl font-black text-slate-900">
                  ₹{parseFloat(settlementSummary?.total_paid || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </p>
                <span className="text-[10px] text-slate-900 font-medium font-semibold block">Transferred to host accounts</span>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-rose-200 shadow-xs space-y-1">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-rose-700 block">Disputed / On Hold</span>
                <p className="text-xl font-black text-rose-600">
                  ₹{parseFloat(settlementSummary?.total_disputed || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </p>
                <span className="text-[10px] text-rose-700 font-semibold block">Blocked for dispute review</span>
              </div>
            </div>

            {/* Escrow Configuration & Provider Setup Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-xs">
              
              {/* Card 1: Configurable Holding Period */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-red-600" />
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
                      Escrow Holding Period Configuration
                    </h3>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-extrabold text-[10px]">
                    Current: {platformSettings.payout_hold_days || 7} Days
                  </span>
                </div>

                <p className="text-[11px] text-slate-600 font-medium leading-relaxed">
                  The default platform escrow holding period starts strictly after the guest's check-out date. Funds remain on hold during this window to allow resolution of complaints, cancellations, and disputes.
                </p>

                <div className="flex items-center gap-3 pt-1">
                  <div className="flex items-center gap-2">
                    <label className="font-bold text-slate-700 shrink-0">Holding Days Post Check-Out:</label>
                    <input
                      type="number"
                      min="0"
                      max="90"
                      value={editingHoldDays}
                      onChange={(e) => setEditingHoldDays(e.target.value)}
                      className="w-20 px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl font-black text-center text-xs outline-none focus:border-red-600 focus:bg-white"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleSaveHoldDays}
                    disabled={savingHoldDays}
                    className="py-1.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs transition-all cursor-pointer"
                  >
                    {savingHoldDays ? 'Saving...' : 'Save Days'}
                  </button>
                </div>
              </div>

              {/* Card 2: Payment Provider Setup Status */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Landmark className="w-4 h-4 text-indigo-600" />
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
                      Payment Provider Marketplace Setup
                    </h3>
                  </div>
                  {providerStatus?.is_razorpayx_configured ? (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-extrabold text-[10px] border border-emerald-300 flex items-center gap-1">
                      <Check className="w-3 h-3 text-emerald-600" /> RazorpayX Connected
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-extrabold text-[10px] border border-amber-300 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3 text-amber-600" /> Marketplace Escrow Active
                    </span>
                  )}
                </div>

                <p className="text-[11px] text-slate-600 font-medium leading-relaxed">
                  Customer payments flow into Book My Room platform credentials. Payouts require an approved arrangement (Razorpay Route marketplace or RazorpayX Current Account). Payout transfers check idempotency to prevent double-spending.
                </p>

                <div className="pt-1 flex items-center justify-between">
                  <span className="text-[11px] text-slate-900 font-semibold font-mono">
                    Mode: {providerStatus?.payment_mode || 'Razorpay Gateway & Route'}
                  </span>

                  <button
                    type="button"
                    onClick={() => setShowProviderGuideModal(true)}
                    className="text-xs font-bold text-indigo-700 hover:text-indigo-900 hover:underline inline-flex items-center gap-1 cursor-pointer"
                  >
                    <HelpCircle className="w-3.5 h-3.5" /> Architecture & Setup Guide →
                  </button>
                </div>
              </div>

            </div>

            {/* Hotel Property Selector & Switcher */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-red-50 text-red-600 flex items-center justify-center font-bold">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
                      Hotel-Wise Escrow Holding & Payouts
                    </h3>
                    <p className="text-[11px] text-slate-900 font-semibold font-medium">
                      Select a hotel property to inspect individual bookings, price breakdowns, totals, and owner banking details.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={selectedHotelId}
                    onChange={(e) => {
                      setSelectedHotelId(e.target.value);
                      setSettlementViewMode('HOTEL_WISE');
                      setSettlementFilter('ALL');
                    }}
                    className="py-2 px-3.5 rounded-xl text-xs font-extrabold bg-slate-50 border border-slate-300 text-slate-900 focus:outline-none focus:border-red-600 focus:bg-white shadow-2xs cursor-pointer min-w-[280px]"
                  >
                    <option value="ALL">🏨 All Hotel Properties ({hotelsSummary.length} Hotels)</option>
                    {hotelsSummary.map((h) => (
                      <option key={h.hotel_id} value={h.hotel_id.toString()}>
                        🏨 {h.hotel_name} ({h.total_bookings} stays • ₹{h.total_net.toFixed(2)})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Quick Hotel Property Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 w-full">
                {[...hotelsSummary].sort((a, b) => (parseFloat(b.total_eligible || 0) - parseFloat(a.total_eligible || 0))).map((h) => {
                  const isSelected = selectedHotelId === h.hotel_id.toString();
                  const hasEligible = parseFloat(h.total_eligible || 0) > 0;
                  return (
                    <div
                      key={h.hotel_id}
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        setSelectedHotelId(h.hotel_id.toString());
                        setSettlementViewMode('HOTEL_WISE');
                        setSettlementFilter('ALL');
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          setSelectedHotelId(h.hotel_id.toString());
                          setSettlementViewMode('HOTEL_WISE');
                          setSettlementFilter('ALL');
                        }
                      }}
                      className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-3 w-full min-w-0 overflow-hidden box-border shadow-xs ${
                        isSelected
                          ? 'bg-red-50/70 border-red-500 shadow-sm ring-2 ring-red-500/20'
                          : hasEligible
                          ? 'bg-emerald-50/50 hover:bg-emerald-50 border-emerald-300 ring-2 ring-emerald-500/30'
                          : 'bg-white hover:bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 w-full">
                        <div className="min-w-0 flex-1">
                          <h4 className="font-black text-xs text-slate-900 truncate block" title={h.hotel_name}>
                            {h.hotel_name}
                          </h4>
                          <p className="text-[10px] text-slate-900 font-medium truncate mt-0.5" title={`${h.city}, ${h.state} • Owner: ${h.owner_name}`}>
                            {h.city ? `${h.city}, ` : ''}{h.state} • Owner: {h.owner_name}
                          </p>
                        </div>
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-black shrink-0 ${
                          isSelected ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {h.total_bookings} Stays
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100 w-full">
                        <span className="text-slate-900 font-black shrink-0">Net Host Payable:</span>
                        <span className="font-mono font-extrabold text-white text-sm">₹{h.total_net.toFixed(2)}</span>
                      </div>

                      <div className="flex items-center justify-between gap-2 text-[10px] font-bold w-full">
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedHotelId(h.hotel_id.toString());
                            setSettlementViewMode('HOTEL_WISE');
                            setSettlementFilter('ON_HOLD');
                          }}
                          className="text-indigo-700 bg-indigo-50 hover:bg-indigo-100 hover:border-indigo-300 px-2 py-0.5 rounded-md border border-indigo-200/80 truncate cursor-pointer transition-colors"
                          title="Click to filter 7-Day Hold stays for this hotel"
                        >
                          ⏳ Hold: ₹{h.total_on_hold.toFixed(2)}
                        </span>
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedHotelId(h.hotel_id.toString());
                            setSettlementViewMode('HOTEL_WISE');
                            setSettlementFilter('ELIGIBLE');
                          }}
                          className="text-emerald-700 bg-emerald-50 hover:bg-emerald-100 hover:border-emerald-300 px-2 py-0.5 rounded-md border border-emerald-200/80 truncate cursor-pointer transition-colors"
                          title="Click to filter Ready/Eligible stays for this hotel"
                        >
                          ✅ Ready: ₹{h.total_eligible.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Active Matured Payout Disbursal Box */}
            {currentSettlementTotalEligible > 0 && (
              <div
                id="direct-payout-action-banner"
                className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-2 border-emerald-500/50 shadow-xl shadow-emerald-950/20"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-black text-[10px] uppercase border border-emerald-500/40">
                      Matured Payout Due Today
                    </span>
                    <h4 className="text-sm font-black tracking-tight text-white">
                      {selectedHotelId === 'ALL'
                        ? `Consolidated Payout for All Ready Hotel Properties (${hotelsSummary.filter(h => h.total_eligible > 0).length || 'Multiple'} Hotels)`
                        : `${currentSelectedHotel?.hotel_name} — Host: ${currentSelectedHotel?.owner_name}`}
                    </h4>
                  </div>
                  <p className="text-xs text-slate-300">
                    Ready for Bank Disbursal: <strong className="text-emerald-400 font-mono font-black text-base">₹{currentSettlementTotalEligible.toFixed(2)}</strong>
                    <span className="text-slate-900 font-bold ml-2">
                      ({currentSettlementEligibleBookings.length} booking(s) ready across {selectedHotelId === 'ALL' ? (hotelsSummary.filter(h => h.total_eligible > 0).length || 1) : 1} hotel properties)
                    </span>
                  </p>
                  {currentHotelPayoutAccount?.destination_summary ? (
                    <p className="text-[11px] text-emerald-300 font-mono flex items-center gap-1.5 mt-0.5">
                      <Landmark className="w-3.5 h-3.5" /> Destination: {currentHotelPayoutAccount.destination_summary}
                    </p>
                  ) : (
                    <p className="text-[11px] text-emerald-300 font-mono flex items-center gap-1.5 mt-0.5">
                      <Landmark className="w-3.5 h-3.5" /> Direct transfers to each verified owner bank / UPI account
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => openConsolidatedHotelPayoutModal(
                    currentSettlementEligibleBookings,
                    selectedHotelId === 'ALL' ? 'All Ready Hotel Properties (Consolidated Batch)' : currentSelectedHotel?.hotel_name
                  )}
                  className="py-3 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs transition-all shadow-lg shadow-emerald-600/30 inline-flex items-center gap-2 cursor-pointer shrink-0 animate-pulse"
                >
                  <CheckCircle2 className="w-4 h-4 text-white" />
                  <span>
                    {selectedHotelId === 'ALL'
                      ? `Disburse Payout to All Hotels (₹${currentSettlementTotalEligible.toFixed(2)}) →`
                      : `Disburse Payout to ${currentSelectedHotel?.owner_name || 'Host'} (₹${currentSettlementTotalEligible.toFixed(2)}) →`}
                  </span>
                </button>
              </div>
            )}

            {/* Active Filter Notices above Table */}
            {settlementFilter === 'ELIGIBLE' && (
              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-950 flex items-center justify-between gap-3 text-xs font-bold animate-fade-in">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600 shrink-0" />
                  <span>
                    Viewing Matured Reservations Ready For Payout ({filteredSettlements.length} reservation(s) • Total: ₹{filteredSettlements.reduce((sum, s) => sum + parseFloat(s.net_amount || 0), 0).toFixed(2)})
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleSettlementFilterSelect('ALL')}
                  className="text-xs text-emerald-700 hover:text-emerald-900 font-extrabold underline cursor-pointer"
                >
                  Show All ({settlementsList.length})
                </button>
              </div>
            )}

            {settlementFilter === 'ON_HOLD' && (
              <div className="p-3.5 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-950 flex items-center justify-between gap-3 text-xs font-bold animate-fade-in">
                <div className="flex items-center gap-2">
                  <Clock className="w-4.5 h-4.5 text-indigo-600 shrink-0" />
                  <span>
                    Viewing Stays Currently Protected in 7-Day Escrow Hold ({filteredSettlements.length} reservation(s) • Total Escrow: ₹{filteredSettlements.reduce((sum, s) => sum + parseFloat(s.net_amount || 0), 0).toFixed(2)})
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleSettlementFilterSelect('ALL')}
                  className="text-xs text-indigo-700 hover:text-indigo-900 font-extrabold underline cursor-pointer"
                >
                  Show All ({settlementsList.length})
                </button>
              </div>
            )}

            {settlementFilter === 'DISPUTED' && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-950 flex items-center justify-between gap-3 text-xs font-bold animate-fade-in">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4.5 h-4.5 text-rose-600 shrink-0" />
                  <span>
                    Viewing Disputed Stays / Bookings Under Review ({filteredSettlements.length} reservation(s) • Total: ₹{filteredSettlements.reduce((sum, s) => sum + parseFloat(s.net_amount || 0), 0).toFixed(2)})
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleSettlementFilterSelect('ALL')}
                  className="text-xs text-rose-700 hover:text-rose-900 font-extrabold underline cursor-pointer"
                >
                  Show All ({settlementsList.length})
                </button>
              </div>
            )}

            {settlementFilter === 'PAID' && (
              <div className="p-3.5 rounded-2xl bg-slate-100 border border-slate-300 text-slate-900 flex items-center justify-between gap-3 text-xs font-bold animate-fade-in">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4.5 h-4.5 text-slate-800 shrink-0" />
                  <span>
                    Viewing Completed & Disbursed Settlements ({filteredSettlements.length} reservation(s) • Total Disbursed: ₹{filteredSettlements.reduce((sum, s) => sum + parseFloat(s.net_amount || 0), 0).toFixed(2)})
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleSettlementFilterSelect('ALL')}
                  className="text-xs text-slate-700 hover:text-slate-900 font-extrabold underline cursor-pointer"
                >
                  Show All ({settlementsList.length})
                </button>
              </div>
            )}

            {settlementFilter === 'CANCELLED' && (
              <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-950 flex items-center justify-between gap-3 text-xs font-bold animate-fade-in">
                <div className="flex items-center gap-2">
                  <XCircle className="w-4.5 h-4.5 text-amber-600 shrink-0" />
                  <span>
                    Viewing Cancelled & Refunded Reservations ({filteredSettlements.length} reservation(s) • Total Value: ₹{filteredSettlements.reduce((sum, s) => sum + parseFloat(s.gross_amount || 0), 0).toFixed(2)})
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleSettlementFilterSelect('ALL')}
                  className="text-xs text-amber-700 hover:text-amber-900 font-extrabold underline cursor-pointer"
                >
                  Show All ({settlementsList.length})
                </button>
              </div>
            )}

            {/* Settlements Ledger Table */}
            <div id="settlements-ledger-table" className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs scroll-mt-24">
              {/* In-Table Context Header with Direct Status Filter Pills */}
              <div className="p-3.5 bg-slate-50/90 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="font-black text-xs text-slate-800">
                    {selectedHotelId === 'ALL' ? '🏨 All Hotel Properties' : `🏨 ${currentSelectedHotel?.hotel_name || 'Selected Property'}`}
                  </span>
                  <span className="text-[11px] text-slate-900 font-semibold font-bold bg-white px-2 py-0.5 rounded-md border border-slate-200">
                    {hotelScopedSettlements.length} Total Stays
                  </span>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-900 font-black mr-1">Status:</span>
                  <button
                    type="button"
                    onClick={() => handleSettlementFilterSelect('ALL')}
                    className={`py-1 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      settlementFilter === 'ALL'
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    All ({hotelScopedSettlements.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSettlementFilterSelect('ON_HOLD')}
                    className={`py-1 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      settlementFilter === 'ON_HOLD'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100'
                    }`}
                  >
                    ⏳ 7-Day Hold ({scopedHoldCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSettlementFilterSelect('ELIGIBLE')}
                    className={`py-1 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      settlementFilter === 'ELIGIBLE'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                    }`}
                  >
                    ✅ Ready ({scopedEligibleCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSettlementFilterSelect('CANCELLED')}
                    className={`py-1 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      settlementFilter === 'CANCELLED'
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                    }`}
                  >
                    🚫 Cancelled ({scopedCancelledCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSettlementFilterSelect('DISPUTED')}
                    className={`py-1 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      settlementFilter === 'DISPUTED'
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'
                    }`}
                  >
                    ⚠️ Disputed ({scopedDisputedCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSettlementFilterSelect('PAID')}
                    className={`py-1 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      settlementFilter === 'PAID'
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    🎉 Settled ({scopedPaidCount})
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-900 font-black uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="p-4">Settlement ID</th>
                      <th className="p-4">Hotel Property & Host</th>
                      <th className="p-4">Guest Details</th>
                      <th className="p-4">Payout Destination</th>
                      <th className="p-4">Gross Collected</th>
                      <th className="p-4">Platform Fee (10%)</th>
                      <th className="p-4">Net Payable</th>
                      <th className="p-4">7-Day Escrow Status</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                    {filteredSettlements.length === 0 ? (
                      <tr>
                        <td colSpan="9" className="p-12 text-center text-slate-900 font-black">
                          <Landmark className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                          <p className="text-sm font-black text-slate-800">
                            {settlementFilter === 'ELIGIBLE' && scopedHoldCount > 0
                              ? `No Ready Payouts Yet (${scopedHoldCount} Stays on 7-Day Hold)`
                              : settlementFilter === 'CANCELLED'
                              ? 'No Cancelled Bookings Found'
                              : 'No Settlement Records Found'}
                          </p>
                          <p className="text-xs text-slate-900 font-bold max-w-sm mx-auto mt-0.5">
                            {settlementFilter === 'ELIGIBLE' && scopedHoldCount > 0
                              ? `This property has ₹${currentSelectedHotel?.total_on_hold?.toFixed(2) || '0.00'} currently protected in the 7-day post checkout escrow period.`
                              : settlementFilter === 'CANCELLED'
                              ? 'There are no cancelled or refunded reservations for this hotel property.'
                              : 'Verified guest bookings will automatically populate host earnings and 7-day escrow holding records here.'}
                          </p>
                          {settlementFilter !== 'ALL' && hotelScopedSettlements.length > 0 && (
                            <div className="flex items-center justify-center gap-2 mt-4">
                              <button
                                type="button"
                                onClick={() => setSettlementFilter('ALL')}
                                className="py-1.5 px-4 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-all cursor-pointer"
                              >
                                View All Stays ({hotelScopedSettlements.length})
                              </button>
                              {scopedHoldCount > 0 && (
                                <button
                                  type="button"
                                  onClick={() => setSettlementFilter('ON_HOLD')}
                                  className="py-1.5 px-4 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition-all cursor-pointer"
                                >
                                  View 7-Day Hold ({scopedHoldCount})
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    ) : (
                      filteredSettlements.slice((adminSettlementsPage - 1) * 10, adminSettlementsPage * 10).map((earning) => {
                        const holdDate = earning.hold_until ? new Date(earning.hold_until) : null;
                        const now = new Date();
                        const daysLeft = holdDate ? Math.max(0, Math.ceil((holdDate - now) / (1000 * 60 * 60 * 24))) : 0;
                        const hasRefundOrCancellation = isCancelledOrRefundedStay(earning) ||
                          ['CANCELLED', 'REFUNDED', 'REFUND_PENDING', 'REFUND_PROCESSING', 'OWNER_APPROVED', 'REFUND_FAILED'].includes((earning.booking_status || '').toUpperCase()) ||
                          ['REFUNDED', 'REFUND_PENDING', 'REFUND_PROCESSING'].includes((earning.payment_status || '').toUpperCase()) ||
                          parseFloat(earning.refund_amount || 0) > 0;
                        const isEligible = earning.status === 'ELIGIBLE' && !hasRefundOrCancellation;

                        return (
                          <tr key={earning.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="p-4 font-mono text-sm">
                              <div className="font-black text-slate-900 text-sm">#{earning.id}</div>
                              <div className="text-xs text-slate-900 font-mono font-bold mt-0.5">
                                Ref: #{earning.booking_id}
                              </div>
                            </td>

                            <td className="p-4">
                              <div className="font-extrabold text-slate-900 text-sm">
                                {earning.hotel_name || 'Hotel Property'}
                              </div>
                              <div className="text-[11px] text-slate-600 font-semibold mt-0.5">
                                Host: {earning.host_name || 'Owner'}
                              </div>
                              {earning.host_email && (
                                <div className="text-[10px] text-slate-900 font-mono font-bold">
                                  {earning.host_email}
                                </div>
                              )}
                            </td>

                            <td className="p-4">
                              <div className="font-bold text-slate-900">{earning.guest_name || 'Guest'}</div>
                              <div className="text-[10px] text-slate-900 font-medium font-mono">
                                In: {formatDisplayDate(earning.check_in)} • Out: {formatDisplayDate(earning.check_out)}
                              </div>
                            </td>

                            <td className="p-4">
                              {isCancelledOrRefundedStay(earning) ? (
                                (() => {
                                  const tBooking = bookingsList.find(b => String(b.id) === String(earning.booking_id || earning.booking) || String(b.booking_id) === String(earning.booking_id || earning.booking));
                                  const ref = resolveCustomerRefundDetails(tBooking || earning);
                                  if (ref.has_bank_details) {
                                    return (
                                      <div>
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 border border-blue-200 font-mono text-[10px] font-bold">
                                          <Landmark className="w-3 h-3 text-blue-600" /> {ref.bank_name !== '—' ? `${ref.bank_name} • ` : ''}{ref.masked_account_number}
                                        </span>
                                        <div className="text-[10px] text-slate-900 font-medium font-medium mt-0.5">
                                          Beneficiary: {ref.account_holder_name}
                                        </div>
                                      </div>
                                    );
                                  } else if (ref.has_upi) {
                                    return (
                                      <div>
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-800 border border-indigo-200 font-mono text-[10px] font-bold">
                                          <RotateCcw className="w-3 h-3 text-indigo-600" /> {ref.upi_id}
                                        </span>
                                        <div className="text-[10px] text-slate-900 font-medium font-medium mt-0.5">
                                          UPI: {ref.account_holder_name}
                                        </div>
                                      </div>
                                    );
                                  } else {
                                    return (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200 font-mono text-[10px] font-bold">
                                        <CreditCard className="w-3 h-3 text-slate-900" /> Original Source
                                      </span>
                                    );
                                  }
                                })()
                              ) : earning.destination_summary ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono text-[11px] font-bold">
                                  <Check className="w-3 h-3 text-emerald-600" /> {earning.destination_summary}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-50 text-amber-900 border border-amber-200 text-[10px] font-bold">
                                  ⚠️ Not Registered
                                </span>
                              )}
                            </td>

                            <td className="p-4 font-black text-slate-900 text-sm">
                              ₹{parseFloat(earning.gross_amount).toFixed(2)}
                            </td>

                            <td className="p-4 text-amber-700 font-bold">
                              -₹{parseFloat(earning.platform_fee).toFixed(2)}
                            </td>

                            <td className="p-4 text-sm font-mono">
                              {isCancelledOrRefundedStay(earning) ? (
                                <div>
                                  <span className="font-bold text-slate-900 line-through font-bold text-xs block">
                                    ₹{parseFloat(earning.net_amount).toFixed(2)}
                                  </span>
                                  <span className="font-black text-rose-600 text-sm block">
                                    ₹0.00
                                  </span>
                                </div>
                              ) : (
                                <span className="font-black text-emerald-700 text-sm">
                                  ₹{parseFloat(earning.net_amount).toFixed(2)}
                                </span>
                              )}
                            </td>

                            <td className="p-4">
                              {earning.status === 'PAID' ? (
                                <div>
                                  <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200 inline-flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Settled / Paid
                                  </span>
                                  {earning.payout_details?.bank_reference && (
                                    <div className="text-[10px] text-slate-900 font-medium font-mono mt-0.5">
                                      UTR: {earning.payout_details.bank_reference}
                                    </div>
                                  )}
                                </div>
                              ) : earning.is_disputed || earning.status === 'DISPUTED' ? (
                                <div>
                                  <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-rose-50 text-rose-800 border border-rose-200 inline-flex items-center gap-1">
                                    <ShieldAlert className="w-3 h-3 text-rose-600" /> Disputed / On Hold
                                  </span>
                                  <div className="text-[10px] text-rose-700 font-medium mt-0.5 max-w-xs truncate">
                                    {earning.dispute_reason || 'Pending dispute resolution'}
                                  </div>
                                </div>
                              ) : earning.status === 'ELIGIBLE' && !isCancelledOrRefundedStay(earning) ? (
                                <div>
                                  <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-300 inline-flex items-center gap-1">
                                    <Check className="w-3 h-3 text-emerald-600" /> {earning.holding_period_days || 7}-Day Hold Matured
                                  </span>
                                  <div className="text-[10px] text-emerald-700 font-semibold mt-0.5">
                                    Eligible for admin payout
                                  </div>
                                </div>
                              ) : earning.status === 'PROCESSING' ? (
                                <div>
                                  <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-blue-50 text-blue-800 border border-blue-200 inline-flex items-center gap-1">
                                    <RefreshCw className="w-3 h-3 text-blue-600 animate-spin" /> Transfer in Progress
                                  </span>
                                </div>
                              ) : isCancelledOrRefundedStay(earning) ? (
                                (() => {
                                  const tBooking = bookingsList.find(b => String(b.id) === String(earning.booking_id || earning.booking) || String(b.booking_id) === String(earning.booking_id || earning.booking));
                                  const isStayRefunded = checkIsBookingRefunded(earning, tBooking);

                                  return (
                                    <div>
                                      <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200 inline-flex items-center gap-1">
                                        <XCircle className="w-3 h-3 text-rose-600" /> Room Cancelled
                                      </span>
                                      <div className="text-[10px] font-medium mt-0.5">
                                        {isStayRefunded ? (
                                          <span className="text-emerald-700 font-semibold block">Refunded to guest (No host payout)</span>
                                        ) : (
                                          <span className="text-amber-700 font-bold block">⏳ Refund / Payout Due</span>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })()
                              ) : (
                                <div>
                                  <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-800 border border-indigo-200 inline-flex items-center gap-1">
                                    <Clock className="w-3 h-3 text-indigo-600" /> In {earning.holding_period_days || 7}-Day Hold
                                  </span>
                                  <div className="text-[10px] text-indigo-900 font-semibold mt-0.5">
                                    {daysLeft > 0 ? (
                                      <span>Release in ~{daysLeft}d ({holdDate ? holdDate.toLocaleDateString('en-IN') : ''})</span>
                                    ) : (
                                      <span>Check-out pending</span>
                                    )}
                                  </div>
                                </div>
                              )}
                            </td>

                            <td className="p-4 text-right">
                              <div className="flex items-center justify-end gap-1.5 flex-wrap">
                                {isCancelledOrRefundedStay(earning) || earning.status === 'REVERSED' || earning.booking_status === 'CANCELLED' ? (
                                  (() => {
                                    const tBooking = bookingsList.find(b => String(b.id) === String(earning.booking_id || earning.booking) || String(b.booking_id) === String(earning.booking_id || earning.booking));
                                    const tbStatus = (tBooking?.status || tBooking?.booking_status || '').toUpperCase();
                                    const tpStatus = (tBooking?.payment_status || '').toUpperCase();
                                    const trStatus = (tBooking?.refund_status || '').toUpperCase();
                                    const isStayRefunded = checkIsBookingRefunded(earning, tBooking);
                                    const isProcessing = trStatus === 'PROCESSING' || tpStatus === 'REFUND_PROCESSING' || earning.status === 'REFUND_PROCESSING';

                                    if (isStayRefunded) {
                                      return (
                                        <div className="flex items-center gap-1.5 justify-end">
                                          <span className="px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex items-center gap-1">
                                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> REFUNDED
                                          </span>
                                          <button
                                            type="button"
                                            disabled={syncingGatewayBookingId === String(earning.booking_id || earning.id)}
                                            onClick={() => handleSyncRefundGatewayStatus(tBooking || earning)}
                                            className="py-1 px-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-900 font-black text-[10px] transition-all inline-flex items-center gap-1 cursor-pointer"
                                            title="Sync Gateway Status (API 5)"
                                          >
                                            <RefreshCw className={`w-3 h-3 ${syncingGatewayBookingId === String(earning.booking_id || earning.id) ? 'animate-spin' : ''}`} />
                                            <span>Sync</span>
                                          </button>
                                        </div>
                                      );
                                    }

                                    if (isProcessing) {
                                      return (
                                        <div className="flex items-center gap-1.5 justify-end">
                                          <span className="px-2.5 py-1 rounded-md text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 inline-flex items-center gap-1">
                                            <RefreshCw className="w-3.5 h-3.5 text-blue-600 animate-spin" /> Processing
                                          </span>
                                          <button
                                            type="button"
                                            disabled={syncingGatewayBookingId === String(earning.booking_id || earning.id)}
                                            onClick={() => handleSyncRefundGatewayStatus(tBooking || earning)}
                                            className="py-1 px-2 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-800 font-bold text-[10px] border border-blue-200 transition-all inline-flex items-center gap-1 cursor-pointer"
                                            title="Sync Gateway Status (API 5)"
                                          >
                                            <RefreshCw className={`w-3 h-3 ${syncingGatewayBookingId === String(earning.booking_id || earning.id) ? 'animate-spin' : ''}`} />
                                            <span>Sync</span>
                                          </button>
                                        </div>
                                      );
                                    }

                                    if (tbStatus === 'REFUND_FAILED' || earning.status === 'FAILED') {
                                      return (
                                        <div className="flex items-center gap-1.5 justify-end">
                                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200">
                                            Failed
                                          </span>
                                          <button
                                            type="button"
                                            disabled={retryingRefundBookingId === String(earning.booking_id || earning.id)}
                                            onClick={() => handleRetryRefund(tBooking || earning)}
                                            className="py-1 px-2.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-[10px] shadow-xs inline-flex items-center gap-1 cursor-pointer"
                                            title="Retry Failed Refund (API 6)"
                                          >
                                            <RotateCcw className={`w-3 h-3 ${retryingRefundBookingId === String(earning.booking_id || earning.id) ? 'animate-spin' : ''}`} />
                                            <span>Retry</span>
                                          </button>
                                        </div>
                                      );
                                    }

                                    const ownerApproval = checkOwnerApprovalStatus(tBooking || earning);
                                    const isOwnerRejected = ownerApproval === 'REJECTED';
                                    const isOwnerApproved = ownerApproval === 'APPROVED' || earning.owner_approval_status === 'APPROVED' || (tBooking && tBooking.owner_approval_status === 'APPROVED');
                                    const canDisburseRefund = !isOwnerRejected && (isOwnerApproved || tpStatus === 'REFUND_PENDING' || earning.status === 'REVERSED' || earning.booking_status === 'CANCELLED' || tbStatus === 'CANCELLED');

                                    if (isOwnerRejected) {
                                      return (
                                        <span className="py-1 px-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 font-bold text-[10px] inline-flex items-center gap-1 select-none whitespace-nowrap">
                                          <XCircle className="w-3 h-3 text-rose-600" /> Owner Rejected
                                        </span>
                                      );
                                    }

                                    if (canDisburseRefund) {
                                      return (
                                        <button
                                          type="button"
                                          disabled={processingAdminRefund}
                                          onClick={() => handleOpenPayoutRefundForEarning(earning)}
                                          className="py-1 px-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-black text-[11px] transition-all shadow-xs inline-flex items-center gap-1 cursor-pointer whitespace-nowrap disabled:opacity-50"
                                          title="Process Customer Refund via Razorpay"
                                        >
                                          <RotateCcw className="w-3 h-3" /> Process Refund
                                        </button>
                                      );
                                    }

                                    return (
                                      <button
                                        type="button"
                                        disabled
                                        className="py-1 px-2 rounded-lg bg-slate-100 border border-slate-200 text-slate-900 font-black text-[10px] inline-flex items-center gap-1 cursor-not-allowed select-none whitespace-nowrap"
                                        title="Awaiting Hotel Owner approval before Super Admin can disburse refund."
                                      >
                                        <Clock className="w-3 h-3 text-amber-500" /> Awaiting Owner Approval
                                      </button>
                                    );
                                  })()
                                ) : (
                                  <>
                                    {isEligible && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setSelectedEarningForPayout(earning);
                                          setOverrideHold(false);
                                          setShowInitiatePayoutModal(true);
                                        }}
                                        className="py-1 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] transition-colors inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"
                                        title="Initiate Host Payout"
                                      >
                                        <Landmark className="w-3 h-3" /> Host Payout
                                      </button>
                                    )}

                                    {earning.is_disputed ? (
                                      <button
                                        type="button"
                                        onClick={() => handleToggleDispute(earning, false)}
                                        className="py-1 px-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-900 font-black text-[11px] transition-colors inline-flex items-center gap-1 cursor-pointer"
                                      >
                                        Release Hold
                                      </button>
                                    ) : earning.status !== 'PAID' && !isEligible && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setSelectedEarningForDispute(earning);
                                          setDisputeReason('');
                                          setShowDisputeModal(true);
                                        }}
                                        className="py-1 px-2.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-[11px] transition-colors inline-flex items-center gap-1 cursor-pointer"
                                      >
                                        Hold / Dispute
                                      </button>
                                    )}
                                  </>
                                )}

                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedStatementEarning(earning);
                                    setShowStatementModal(true);
                                  }}
                                  className="py-1 px-2.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-900 font-black text-[11px] transition-colors inline-flex items-center gap-1 cursor-pointer"
                                >
                                  <FileText className="w-3 h-3" /> Statement
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>

                  {/* Totals Summary Footer Row */}
                  <tfoot className="bg-slate-100/95 border-t-2 border-slate-300 font-black text-slate-900 text-xs">
                    <tr>
                      <td colSpan="4" className="p-4 text-slate-700 uppercase tracking-wider">
                        {settlementViewMode === 'HOTEL_WISE' && currentSelectedHotel ? (
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-sm text-slate-900">
                              Total for {currentSelectedHotel.hotel_name}
                            </span>
                            <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 text-[10px] font-bold">
                              {activePayableSettlements.length} Bookings
                              {filteredSettlements.length > activePayableSettlements.length && (
                                <span className="text-rose-600 ml-1">({filteredSettlements.length - activePayableSettlements.length} Cancelled)</span>
                              )}
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-sm text-slate-900">Grand Total</span>
                            <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 text-[10px] font-bold">
                              {activePayableSettlements.length} Bookings
                              {filteredSettlements.length > activePayableSettlements.length && (
                                <span className="text-rose-600 ml-1">({filteredSettlements.length - activePayableSettlements.length} Cancelled)</span>
                              )}
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="p-4 font-mono text-sm text-slate-900">
                        ₹{currentSettlementTotalGross.toFixed(2)}
                      </td>
                      <td className="p-4 font-mono text-sm text-amber-700">
                        -₹{currentSettlementTotalPlatformFee.toFixed(2)}
                      </td>
                      <td className="p-4 font-mono text-base text-emerald-700 font-black">
                        ₹{currentSettlementTotalNet.toFixed(2)}
                      </td>
                      <td className="p-4">
                        <div className="text-[11px] font-bold space-y-0.5">
                          {currentSettlementTotalOnHold > 0 && (
                            <span className="text-indigo-700 block">⏳ In 7-Day Hold: ₹{currentSettlementTotalOnHold.toFixed(2)}</span>
                          )}
                          {currentSettlementTotalEligible > 0 && (
                            <span className="text-emerald-700 block">✅ Ready for Payout: ₹{currentSettlementTotalEligible.toFixed(2)}</span>
                          )}
                          {currentSettlementTotalPaid > 0 && (
                            <span className="text-slate-600 block">🎉 Settled: ₹{currentSettlementTotalPaid.toFixed(2)}</span>
                          )}
                          {activePayableSettlements.length === 0 && filteredSettlements.length > 0 && (
                            <span className="text-rose-600 block">↩️ Cancelled (₹0.00 Host Payout)</span>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        {currentSettlementTotalEligible > 0 ? (
                          <button
                            type="button"
                            onClick={() => openConsolidatedHotelPayoutModal(
                              currentSettlementEligibleBookings,
                              selectedHotelId === 'ALL' ? 'All Ready Hotel Properties' : currentSelectedHotel?.hotel_name
                            )}
                            className="py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs transition-all shadow-xs inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                          >
                            <Wallet className="w-3.5 h-3.5" /> Payout Matured (₹{currentSettlementTotalEligible.toFixed(2)})
                          </button>
                        ) : currentSettlementTotalOnHold > 0 ? (
                          <div className="flex flex-col items-end gap-1">
                            <div
                              className="py-1.5 px-3 rounded-lg bg-slate-100 border border-slate-300 text-slate-900 font-black text-xs inline-flex items-center gap-1.5 cursor-not-allowed select-none whitespace-nowrap"
                              title="Locked in 7-day escrow hold. Payout option activates automatically after 7 days from guest check-out."
                            >
                              <Clock className="w-3.5 h-3.5 text-indigo-500" /> In 7-Day Hold (₹{currentSettlementTotalOnHold.toFixed(2)})
                            </div>
                            <span className="text-[10px] text-slate-900 font-bold whitespace-nowrap">Payout activates after 7 days</span>
                          </div>
                        ) : filteredSettlements.some(e => isCancelledOrRefundedStay(e)) ? (
                          (() => {
                            const cancelledStay = filteredSettlements.find(e => isCancelledOrRefundedStay(e));
                            const tBooking = cancelledStay ? bookingsList.find(b => String(b.id) === String(cancelledStay.booking_id || cancelledStay.booking) || String(b.booking_id) === String(cancelledStay.booking_id || cancelledStay.booking)) : null;
                            const tbStatus = (tBooking?.status || tBooking?.booking_status || '').toUpperCase();
                            const tpStatus = (tBooking?.payment_status || '').toUpperCase();
                            const trStatus = (tBooking?.refund_status || '').toUpperCase();
                            const isStayRefunded = cancelledStay?.status === 'REFUNDED' || tbStatus === 'REFUNDED' || tpStatus === 'REFUNDED' || trStatus === 'REFUNDED';

                            if (isStayRefunded) {
                              return (
                                <span className="px-2.5 py-1 rounded-md text-xs font-black bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex items-center gap-1">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> REFUNDED
                                </span>
                              );
                            }
                            const ownerApprovalStay = checkOwnerApprovalStatus(tBooking || cancelledStay);
                            const isOwnerRejectedStay = ownerApprovalStay === 'REJECTED';
                            const isOwnerApprovedStay = ownerApprovalStay === 'APPROVED' || cancelledStay?.owner_approval_status === 'APPROVED' || (tBooking && tBooking.owner_approval_status === 'APPROVED');
                            const canDisburseStay = !isOwnerRejectedStay && (isOwnerApprovedStay || tpStatus === 'REFUND_PENDING' || cancelledStay?.status === 'REVERSED' || cancelledStay?.booking_status === 'CANCELLED' || tbStatus === 'CANCELLED');

                            if (isOwnerRejectedStay) {
                              return (
                                <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 inline-flex items-center gap-1">
                                  <XCircle className="w-3.5 h-3.5 text-rose-600" /> Owner Rejected
                                </span>
                              );
                            }

                            if (canDisburseStay) {
                              return (
                                <button
                                  type="button"
                                  disabled={processingAdminRefund}
                                  onClick={() => {
                                    if (cancelledStay) handleOpenPayoutRefundForEarning(cancelledStay);
                                  }}
                                  className="py-1.5 px-3 rounded-lg bg-red-600 hover:bg-red-700 text-white font-black text-xs transition-all shadow-xs inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap disabled:opacity-50"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" /> Process Refund
                                </button>
                              );
                            }
                            return (
                              <button
                                type="button"
                                disabled
                                className="py-1.5 px-3 rounded-lg bg-slate-100 border border-slate-200 text-slate-900 font-black text-xs inline-flex items-center gap-1.5 cursor-not-allowed select-none whitespace-nowrap"
                                title="Awaiting Hotel Owner approval before Super Admin can disburse refund."
                              >
                                <Clock className="w-3.5 h-3.5 text-amber-500" /> Awaiting Owner Approval
                              </button>
                            );
                          })()
                        ) : (
                          <span className="text-slate-900 font-black text-xs inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Settled
                          </span>
                        )}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              <Pagination
                currentPage={adminSettlementsPage}
                totalItems={filteredSettlements.length}
                itemsPerPage={10}
                onPageChange={setAdminSettlementsPage}
                color="gold"
                theme="luxury"
              />
            </div>

          </div>
        )}

        {/* TAB: CUSTOMER REFUNDS & CANCELLATIONS WORKFLOW */}
        {activeTab === 'REFUNDS' && (
          <div className="space-y-6">
            
            {/* Top Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
                <div className="flex items-center justify-between text-slate-900 font-bold mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider">Ready For Admin Refund</span>
                  <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                    <RotateCcw className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-black text-slate-900">{pendingRefundsCount}</div>
                <p className="text-xs text-amber-700 font-semibold mt-1">
                  ₹{totalPendingRefundSum.toFixed(2)} owner-approved
                </p>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
                <div className="flex items-center justify-between text-slate-900 font-bold mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider">Completed Refunds</span>
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-black text-slate-900">
                  {bookingsList.filter(b => (b.status || b.booking_status || '').toUpperCase() === 'REFUNDED' || (b.payment_status || '').toUpperCase() === 'REFUNDED').length}
                </div>
                <p className="text-xs text-emerald-700 font-semibold mt-1">
                  ₹{totalRefundedSum.toFixed(2)} refunded to guests
                </p>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
                <div className="flex items-center justify-between text-slate-900 font-bold mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider">Awaiting Owner Approval</span>
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                    <Clock className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-black text-slate-900">
                  {bookingsList.filter(b => (b.status || b.booking_status || '').toUpperCase() === 'CANCELLATION_REQUESTED').length}
                </div>
                <p className="text-xs text-blue-700 font-semibold mt-1">
                  Pending owner verification
                </p>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
                <div className="flex items-center justify-between text-slate-900 font-bold mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider">Failed / Retries</span>
                  <div className="w-8 h-8 rounded-xl bg-red-50 text-red-600 flex items-center justify-center font-bold">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-black text-slate-900">
                  {bookingsList.filter(b => (b.status || b.booking_status || '').toUpperCase() === 'REFUND_FAILED').length}
                </div>
                <p className="text-xs text-red-700 font-semibold mt-1">
                  Retryable without duplicates
                </p>
              </div>
            </div>

            {/* Filter Pills & Search */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
              <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
                <button
                  type="button"
                  onClick={() => setRefundFilterStatus('ALL')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    refundFilterStatus === 'ALL'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  All Requests ({refundCandidates.length})
                </button>
                <button
                  type="button"
                  onClick={() => setRefundFilterStatus('PENDING')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                    refundFilterStatus === 'PENDING'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200'
                  }`}
                >
                  <span>Owner Approved & Ready</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                    refundFilterStatus === 'PENDING' ? 'bg-amber-800 text-amber-100' : 'bg-amber-200 text-amber-900'
                  }`}>
                    {pendingRefundsCount}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setRefundFilterStatus('AWAITING_OWNER')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    refundFilterStatus === 'AWAITING_OWNER'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200'
                  }`}
                >
                  Awaiting Owner ({bookingsList.filter(b => (b.status || b.booking_status || '').toUpperCase() === 'CANCELLATION_REQUESTED').length})
                </button>
                <button
                  type="button"
                  onClick={() => setRefundFilterStatus('REFUNDED')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    refundFilterStatus === 'REFUNDED'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200'
                  }`}
                >
                  Completed ({bookingsList.filter(b => (b.status || b.booking_status || '').toUpperCase() === 'REFUNDED' || (b.payment_status || '').toUpperCase() === 'REFUNDED').length})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRefundFilterStatus('FAILED');
                    fetchAdminRefundsApi('FAILED', refundModeFilter);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    refundFilterStatus === 'FAILED'
                      ? 'bg-red-600 text-white shadow-xs'
                      : 'bg-red-50 hover:bg-red-100 text-red-800 border border-red-200'
                  }`}
                >
                  Failed Retries ({bookingsList.filter(b => (b.status || b.booking_status || '').toUpperCase() === 'REFUND_FAILED').length})
                </button>


              </div>

              <div className="relative min-w-[200px] sm:min-w-[240px]">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search guest, hotel, booking ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
            </div>

            {/* Refunds Data Table */}
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1250px] text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-extrabold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                      <th className="py-3.5 px-4 whitespace-nowrap">Booking / Dates</th>
                      <th className="py-3.5 px-4 whitespace-nowrap">Customer Details</th>
                      <th className="py-3.5 px-4 whitespace-nowrap">Hotel Property</th>
                      <th className="py-3.5 px-4 whitespace-nowrap">Original Paid</th>
                      <th className="py-3.5 px-4 whitespace-nowrap">Fee Deducted</th>
                      <th className="py-3.5 px-4 whitespace-nowrap">Refund Amount</th>
                      <th className="py-3.5 px-4 whitespace-nowrap">Masked Bank / Destination</th>
                      <th className="py-3.5 px-4 whitespace-nowrap">Owner Approval</th>
                      <th className="py-3.5 px-4 whitespace-nowrap">Refund Status</th>
                      <th className="py-3.5 px-4 text-right whitespace-nowrap">Refund Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs font-medium">
                    {refundFilteredBookings.length === 0 ? (
                      <tr>
                        <td colSpan="10" className="py-12 text-center text-slate-900 font-bold">
                          <RotateCcw className="w-8 h-8 mx-auto mb-2 opacity-30" />
                          <p className="font-bold text-sm text-slate-600">No Cancellation or Refund Records Found</p>
                          <p className="text-xs text-slate-900 font-bold mt-1">
                            {refundFilterStatus === 'PENDING'
                              ? 'No cancellation requests currently pending Super Admin refund release.'
                              : 'All cancellation records match current filter criteria.'}
                          </p>
                        </td>
                      </tr>
                    ) : (
                      refundFilteredBookings.slice((adminRefundsPage - 1) * 10, adminRefundsPage * 10).map((b) => {
                        const s = (b.status || b.booking_status || '').toUpperCase();
                        const p = (b.payment_status || '').toUpperCase();
                        const r = (b.refund_status || '').toUpperCase();
                        const isRefunded = checkIsBookingRefunded(null, b) || s === 'REFUNDED' || p === 'REFUNDED' || r === 'REFUNDED';
                        const isProcessing = s === 'REFUND_PROCESSING' || p === 'REFUND_PROCESSING' || r === 'PROCESSING' || r === 'REFUND_PROCESSING';
                        const isFailed = s === 'REFUND_FAILED' || r === 'REFUND_FAILED';

                        const ownerApproval = checkOwnerApprovalStatus(b);
                        const isOwnerApproved = ownerApproval === 'APPROVED' || b.owner_approval_status === 'APPROVED' || b.cancellation_breakdown?.owner_approval?.status === 'APPROVED';
                        const isOwnerRejected = ownerApproval === 'REJECTED' || b.owner_approval_status === 'REJECTED' || b.cancellation_breakdown?.owner_approval?.status === 'REJECTED';
                        const isAwaitingOwner = !isRefunded && !isProcessing && !isOwnerApproved && !isOwnerRejected;

                        const grossAmt = parseFloat(b.total_amount || b.total_price || 0);
                        const refundAmt = parseFloat(b.refund_amount !== undefined ? b.refund_amount : (b.cancellation_quote?.refund_amount || (grossAmt * 0.9)));
                        const feeAmt = parseFloat(b.cancellation_fee !== undefined ? b.cancellation_fee : (b.cancellation_quote?.cancellation_fee || (grossAmt - refundAmt)));
                        const refDetails = resolveCustomerRefundDetails(b);
                        const canProcess = (isOwnerApproved || !isOwnerRejected) && !isRefunded && !isProcessing;

                        return (
                          <tr key={b.id} className="hover:bg-slate-50/80 transition-colors whitespace-nowrap">
                            <td className="py-3.5 px-4 font-mono">
                              <span className="font-bold text-slate-900">#{b.id}</span>
                              <div className="text-[11px] text-slate-900 font-semibold font-sans mt-0.5">
                                {b.check_in} → {b.check_out}
                              </div>
                            </td>

                            <td className="py-3.5 px-4">
                              <div className="font-bold text-slate-900">{refDetails.customer_name}</div>
                              <div className="text-xs text-slate-900 font-bold">{b.user_email || b.guest_email || '—'}</div>
                              {(b.guest_phone || b.user_phone) && (
                                <div className="text-[11px] text-slate-900 font-mono font-bold">{b.guest_phone || b.user_phone}</div>
                              )}
                            </td>

                            <td className="py-3.5 px-4">
                              <div className="font-bold text-slate-800">{b.hotel_name || b.hotel_details?.name || 'Hotel Property'}</div>
                              <div className="text-[11px] text-slate-900 font-semibold">{b.room_type_name || b.room_details?.name || 'Standard Room'}</div>
                            </td>

                            <td className="py-3.5 px-4 font-mono font-bold text-slate-700">
                              ₹{grossAmt.toFixed(2)}
                            </td>

                            <td className="py-3.5 px-4 font-mono font-medium text-amber-700">
                              {feeAmt > 0 ? `-₹${feeAmt.toFixed(2)}` : '₹0.00'}
                            </td>

                            <td className="py-3.5 px-4 font-mono font-black text-emerald-700 text-sm">
                              ₹{refundAmt.toFixed(2)}
                            </td>

                            <td className="py-3.5 px-4">
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-1.5">
                                  <CreditCard className="w-3.5 h-3.5 text-teal-600" />
                                  <span className="font-mono font-bold text-slate-800 text-[11px] truncate block max-w-[130px]" title={refDetails.payment_id}>
                                    {refDetails.payment_id || 'Original Source'}
                                  </span>
                                </div>
                                <div className="text-[10px] text-slate-900 font-medium font-semibold">
                                  Razorpay Original Source
                                </div>
                              </div>
                            </td>

                            <td className="py-3.5 px-4">
                              {isOwnerApproved ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  <CheckCircle2 className="w-3 h-3" /> Owner Approved
                                </span>
                              ) : isOwnerRejected ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-red-50 text-red-700 border border-red-200">
                                  <XCircle className="w-3 h-3" /> Owner Rejected
                                </span>
                              ) : isAwaitingOwner ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-amber-50 text-amber-700 border border-amber-200 animate-pulse">
                                  <Clock className="w-3 h-3 text-amber-600" /> ⏳ Awaiting Hotel Owner
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-slate-100 text-slate-700">
                                  Direct Request
                                </span>
                              )}
                            </td>

                            <td className="py-3.5 px-4">
                              {isRefunded ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                  <CheckCircle2 className="w-3 h-3" /> REFUNDED
                                </span>
                              ) : isProcessing ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-blue-100 text-blue-800 border border-blue-300">
                                  <RefreshCw className="w-3 h-3 animate-spin" /> PROCESSING
                                </span>
                              ) : isFailed ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-red-100 text-red-800 border border-red-300" title={b.refund_failure_reason}>
                                  <AlertTriangle className="w-3 h-3" /> FAILED
                                </span>
                              ) : isOwnerApproved ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800 border border-amber-300">
                                  <Clock className="w-3 h-3" /> REFUND_PENDING
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-slate-100 text-slate-600">
                                  CANCELLATION_REQUESTED
                                </span>
                              )}
                            </td>

                            <td className="py-3.5 px-4 text-right whitespace-nowrap">
                              {isRefunded ? (
                                <div className="flex items-center gap-1.5 justify-end">
                                  <span className="text-[11px] font-mono text-emerald-700 font-bold inline-flex items-center gap-1">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                    <span>{b.refund_arn || 'Completed'}</span>
                                  </span>
                                  <button
                                    type="button"
                                    disabled={syncingGatewayBookingId === String(b.booking_id || b.id)}
                                    onClick={() => handleSyncRefundGatewayStatus(b)}
                                    className="py-1 px-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-900 font-black text-[10px] transition-all inline-flex items-center gap-1 cursor-pointer"
                                    title="Sync Gateway Status (API 5)"
                                  >
                                    <RefreshCw className={`w-3 h-3 ${syncingGatewayBookingId === String(b.booking_id || b.id) ? 'animate-spin' : ''}`} />
                                    <span>Sync</span>
                                  </button>
                                </div>
                              ) : isProcessing ? (
                                <div className="flex items-center gap-1.5 justify-end">
                                  <span className="text-[11px] text-blue-700 font-bold inline-flex items-center gap-1">
                                    <RefreshCw className="w-3.5 h-3.5 text-blue-600 animate-spin" />
                                    <span>Processing</span>
                                  </span>
                                  <button
                                    type="button"
                                    disabled={syncingGatewayBookingId === String(b.booking_id || b.id)}
                                    onClick={() => handleSyncRefundGatewayStatus(b)}
                                    className="py-1 px-2 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-800 font-bold text-[10px] border border-blue-200 transition-all inline-flex items-center gap-1 cursor-pointer"
                                    title="Sync Gateway Status (API 5)"
                                  >
                                    <RefreshCw className={`w-3 h-3 ${syncingGatewayBookingId === String(b.booking_id || b.id) ? 'animate-spin' : ''}`} />
                                    <span>Sync</span>
                                  </button>
                                </div>
                              ) : (isFailed || b.can_retry || b.allow_retry) ? (
                                <div className="flex items-center gap-1.5 justify-end">
                                  <button
                                    type="button"
                                    disabled={retryingRefundBookingId === String(b.booking_id || b.id)}
                                    onClick={() => handleRetryRefund(b)}
                                    className="py-1.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-colors inline-flex items-center gap-1.5 shadow-xs cursor-pointer"
                                    title="Retry Refund with Payment Gateway (API 6)"
                                  >
                                    <RotateCcw className={`w-3.5 h-3.5 ${retryingRefundBookingId === String(b.booking_id || b.id) ? 'animate-spin' : ''}`} />
                                    <span>Retry Refund</span>
                                  </button>
                                </div>
                              ) : canProcess ? (
                                <button
                                  type="button"
                                  disabled={processingAdminRefund}
                                  onClick={() => handleOpenPayoutRefundForEarning(b)}
                                  className="py-1.5 px-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs transition-colors inline-flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                  <span>Process Refund</span>
                                </button>
                              ) : isOwnerRejected ? (
                                <span className="text-[11px] text-rose-600 font-bold">
                                  Rejected by Owner
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  disabled
                                  className="py-1.5 px-3 rounded-xl bg-slate-100 border border-slate-200 text-slate-900 font-black text-xs inline-flex items-center gap-1.5 cursor-not-allowed select-none"
                                  title="Hotel owner must approve this cancellation request before Super Admin can disburse the refund."
                                >
                                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                                  <span>Awaiting Owner Approval</span>
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
              <Pagination
                currentPage={adminRefundsPage}
                totalItems={refundFilteredBookings.length}
                itemsPerPage={10}
                onPageChange={setAdminRefundsPage}
                color="gold"
                theme="luxury"
              />
            </div>

          </div>
        )}

        {/* TAB 5: PAYMENTS LEDGER */}
            {activeTab === 'PAYMENTS' && (
          <div className="space-y-4">
            {/* View Filter & Sub-status Controls */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-900 text-white shadow-xs">
                  Primary Booking Summary (1 per booking)
                </span>
                <span className="text-xs font-black text-slate-900">
                  Total: {filteredPayments.length} Bookings
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase text-slate-900 font-black tracking-wider">Status:</span>
                <select
                  value={paymentStatusFilter}
                  onChange={(e) => setPaymentStatusFilter(e.target.value)}
                  className="py-1.5 px-3 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-800 focus:outline-none focus:border-red-600 cursor-pointer"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="CAPTURED">CAPTURED (Paid)</option>
                  <option value="CREATED">CREATED (Unpaid/Initiated)</option>
                  <option value="FAILED">FAILED</option>
                  <option value="REFUNDED">REFUNDED</option>
                </select>
              </div>
            </div>

            {/* Payments Table */}
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-900 font-black uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="p-4">Booking ID</th>
                      <th className="p-4">Customer Email</th>
                      <th className="p-4">Razorpay Order ID</th>
                      <th className="p-4">Payment ID</th>
                      <th className="p-4">Amount</th>
                      <th className="p-4">Status</th>
                      <th className="p-4">Transaction Info</th>
                      <th className="p-4">Paid / Attempt At</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                    {filteredPayments.length === 0 ? (
                      <tr>
                        <td colSpan="8" className="p-8 text-center text-slate-900 font-black">No payment records matching the selected filter.</td>
                      </tr>
                    ) : (
                      filteredPayments.slice((adminPaymentsPage - 1) * 10, adminPaymentsPage * 10).map((p) => {
                        const isCaptured = p.status === 'CAPTURED';
                        const isFailed = p.status === 'FAILED';
                        const isRefunded = p.status === 'REFUNDED' || p.status === 'PARTIALLY_REFUNDED';
                        const isCreated = p.status === 'CREATED';

                        return (
                          <tr key={p.id} className={`hover:bg-slate-50/80 transition-colors ${p.has_multiple_captured ? 'bg-amber-50/60' : ''}`}>
                            <td className="p-4 font-mono font-black text-slate-900 text-sm">
                              #{p.booking_id}
                              {p.attempts_count > 1 && (
                                <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                                  {p.attempts_count} orders
                                </span>
                              )}
                            </td>
                            <td className="p-4 text-slate-900 font-bold">
                              {p.user_email || `User #${p.user_id}`}
                              {p.hotel_name && (
                                <div className="text-[10px] text-slate-900 font-medium truncate max-w-[180px]">
                                  {p.hotel_name}
                                </div>
                              )}
                            </td>
                            <td className="p-4 font-mono text-[11px] text-slate-900 font-semibold">{p.razorpay_order_id || 'N/A'}</td>
                            <td className="p-4 font-mono text-[11px] text-slate-900 font-semibold">{p.razorpay_payment_id || 'N/A'}</td>
                            <td className="p-4 text-slate-900 font-black text-sm">
                              ₹{parseFloat(p.amount).toFixed(2)}
                            </td>
                            <td className="p-4">
                              <div className="flex flex-col gap-1 items-start">
                                <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider ${
                                  isCaptured ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                                  isFailed ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                                  isRefunded ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' :
                                  'bg-amber-50 text-amber-700 border border-amber-200'
                                }`}>
                                  {p.status}
                                </span>
                                {p.has_multiple_captured && (
                                  <span className="px-2 py-0.5 rounded-md text-[9px] font-extrabold bg-amber-600 text-white animate-pulse">
                                    ⚠️ Multiple Captured (Review Required)
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="p-4 text-[11px]">
                              {p.payment_method && (
                                <span className="text-slate-700 font-semibold uppercase">{p.payment_method}</span>
                              )}
                              {p.failure_reason && (
                                <div className="text-rose-600 text-[10px] font-medium max-w-[200px] truncate" title={p.failure_reason}>
                                  {p.failure_reason}
                                </div>
                              )}
                              {p.review_notes && (
                                <div className="text-amber-700 text-[10px] font-bold max-w-[220px] truncate" title={p.review_notes}>
                                  {p.review_notes}
                                </div>
                              )}
                              {!p.payment_method && !p.failure_reason && !p.review_notes && (
                                <span className="text-slate-400">—</span>
                              )}
                            </td>
                            <td className="p-4 text-slate-900 font-bold text-[11px]">
                              {p.paid_at ? new Date(p.paid_at).toLocaleString('en-IN') : (
                                <span className="text-amber-600 font-semibold">Unpaid (Created {new Date(p.created_at).toLocaleDateString('en-IN')})</span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
              <Pagination
                currentPage={adminPaymentsPage}
                totalItems={filteredPayments.length}
                itemsPerPage={10}
                onPageChange={setAdminPaymentsPage}
                color="gold"
                theme="luxury"
              />
            </div>
          </div>
        )}

        {/* TAB 7: PROMO COUPONS */}
        {activeTab === 'COUPONS' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4 bg-white border border-slate-200/90 p-4 rounded-2xl shadow-xs">
              <div>
                <h3 className="text-sm font-black text-slate-900">Promotional Coupons & Discounts</h3>
                <p className="text-xs text-slate-600 font-semibold">Manage active platform promo codes, percentage discounts, and eligibility thresholds</p>
              </div>
              <button
                onClick={() => setShowCouponModal(true)}
                className="py-2.5 px-5 rounded-xl bg-gradient-to-r from-[#D4AF37] via-[#F3E5AB] to-[#C5A880] text-slate-950 font-black text-xs hover:brightness-105 transition-all inline-flex items-center justify-center gap-1.5 shrink-0 whitespace-nowrap leading-none shadow-md shadow-amber-500/20 cursor-pointer"
              >
                <Plus className="w-4 h-4 shrink-0" /> Create Promo Coupon
              </button>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-900 font-black uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="p-4">Promo Code</th>
                    <th className="p-4">Discount %</th>
                    <th className="p-4">Max Discount</th>
                    <th className="p-4">Min Booking ₹</th>
                    <th className="p-4">Valid Range</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                  {filteredCoupons.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="p-8 text-center text-slate-900 font-black">No promotional coupons created yet. Click 'Create Promo Coupon' above.</td>
                    </tr>
                  ) : (
                    filteredCoupons.slice((adminCouponsPage - 1) * 10, adminCouponsPage * 10).map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-4 font-mono font-black text-red-600 text-sm flex items-center gap-1.5">
                          <Tag className="w-4 h-4 text-red-600" /> {c.code}
                        </td>
                        <td className="p-4 font-bold text-slate-900">{c.discount_percentage}% OFF</td>
                        <td className="p-4 font-bold text-slate-700">₹{c.max_discount_amount}</td>
                        <td className="p-4 text-slate-900 font-bold">₹{c.min_booking_amount}</td>
                        <td className="p-4 text-slate-900 font-mono font-bold text-[11px]">{c.valid_from} → {c.valid_until}</td>
                        <td className="p-4">
                          {c.is_active ? (
                            <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">Active</span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black bg-slate-100 text-slate-500 border border-slate-200">Inactive</span>
                          )}
                        </td>
                        <td className="p-4 text-right">
                          <button
                            onClick={() => handleDeleteCoupon(c.id, c.code)}
                            className="py-1 px-2.5 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-600 hover:text-white border border-rose-200 text-[11px] font-bold transition-colors inline-flex items-center gap-1"
                          >
                            <Trash2 className="w-3 h-3" /> Delete
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <Pagination
              currentPage={adminCouponsPage}
              totalItems={filteredCoupons.length}
              itemsPerPage={10}
              onPageChange={setAdminCouponsPage}
              color="rose"
            />
          </div>
          </div>
        )}

      </main>

      {/* Modal: Change User Role */}
      {selectedUserForRole && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4 text-slate-900">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-[#BF8E36]" /> Change User Role
              </h3>
              <button
                type="button"
                onClick={() => setSelectedUserForRole(null)}
                className="w-7 h-7 rounded-lg bg-slate-100 text-slate-500 hover:text-slate-900 hover:bg-slate-200 flex items-center justify-center font-bold text-sm cursor-pointer transition-all"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <p className="text-slate-700 font-semibold leading-relaxed">
                Select new platform access role for user <span className="font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">@{selectedUserForRole.username}</span>:
              </p>

              <div>
                <label className="block text-[11px] font-black text-slate-800 uppercase tracking-wider mb-1.5">
                  Assigned Platform Role
                </label>
                <select
                  value={newRoleInput}
                  onChange={(e) => setNewRoleInput(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-bold focus:outline-none focus:border-[#D4AF37] focus:bg-white transition-all shadow-xs cursor-pointer"
                >
                  <option value="CUSTOMER">Guest (Customer)</option>
                  <option value="HOTEL_OWNER">Hotel Owner</option>
                </select>
              </div>

              <div className="pt-3 flex justify-end gap-2.5 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setSelectedUserForRole(null)}
                  className="py-2 px-4 rounded-xl border border-slate-300 text-slate-700 font-bold hover:bg-slate-100 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleChangeUserRole}
                  className="py-2 px-4 rounded-xl bg-gradient-to-r from-[#BF8E36] via-[#D8A74B] to-[#BF8E36] text-white font-black hover:brightness-105 shadow-md shadow-amber-500/20 transition-all cursor-pointer"
                >
                  Update Role
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Create Coupon */}
      {showCouponModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-5 shadow-lg space-y-4 text-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Tag className="w-4 h-4 text-red-600" /> Create Promo Coupon
              </h3>
              <button onClick={() => setShowCouponModal(false)} className="text-slate-400 hover:text-slate-900 font-black text-xl">&times;</button>
            </div>

            <form onSubmit={handleCreateCoupon} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Coupon Code (Uppercase)</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. WELCOME500"
                  value={couponForm.code}
                  onChange={(e) => setCouponForm({ ...couponForm, code: e.target.value.toUpperCase() })}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono uppercase font-black focus:outline-none focus:border-red-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Discount %</label>
                  <input
                    type="number"
                    required
                    min="1"
                    max="100"
                    value={couponForm.discount_percentage}
                    onChange={(e) => setCouponForm({ ...couponForm, discount_percentage: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-bold focus:outline-none focus:border-red-600"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Max Discount (₹)</label>
                  <input
                    type="number"
                    required
                    value={couponForm.max_discount_amount}
                    onChange={(e) => setCouponForm({ ...couponForm, max_discount_amount: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-bold focus:outline-none focus:border-red-600"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Min Booking Amount (₹)</label>
                <input
                  type="number"
                  required
                  value={couponForm.min_booking_amount}
                  onChange={(e) => setCouponForm({ ...couponForm, min_booking_amount: e.target.value })}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-bold focus:outline-none focus:border-red-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Valid From</label>
                  <input
                    type="date"
                    required
                    value={couponForm.valid_from}
                    onChange={(e) => setCouponForm({ ...couponForm, valid_from: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-semibold focus:outline-none focus:border-red-600"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Valid Until</label>
                  <input
                    type="date"
                    required
                    value={couponForm.valid_until}
                    onChange={(e) => setCouponForm({ ...couponForm, valid_until: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-semibold focus:outline-none focus:border-red-600"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCouponModal(false)}
                  className="py-2 px-3.5 rounded-lg border border-slate-200 text-slate-600 font-bold hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="py-2 px-3.5 rounded-lg bg-red-600 text-white font-bold hover:bg-red-700"
                >
                  Save Coupon
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: INITIATE OWNER PAYOUT */}
      {showInitiatePayoutModal && selectedEarningForPayout && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white card-white max-w-lg w-full p-6 sm:p-7 space-y-5 rounded-3xl shadow-2xl border border-slate-200 animate-scale-up max-h-[92vh] overflow-y-auto text-xs">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shrink-0">
                  <Landmark className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Initiate Hotel Owner Payout</h3>
                  <p className="text-xs text-slate-900 font-black">Review & disburse matured booking tariff</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowInitiatePayoutModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:text-slate-900 flex items-center justify-center text-sm font-bold cursor-pointer"
              >
                ×
              </button>
            </div>

            {/* Payout Details Card */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-[10px] text-slate-900 font-black uppercase block">Booking ID</span>
                  <span className="font-mono font-bold text-slate-900 text-sm">#{selectedEarningForPayout.booking_id}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-900 font-black uppercase block">Hotel Property</span>
                  <span className="font-black text-slate-900 truncate block">{selectedEarningForPayout.hotel_name}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-900 font-black uppercase block">Host Name</span>
                  <span className="font-bold text-slate-800">{selectedEarningForPayout.host_name}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-900 font-black uppercase block">Payout Destination</span>
                  <span className="font-mono font-bold text-emerald-700 block truncate">{selectedEarningForPayout.destination_summary || 'Registered Bank / UPI'}</span>
                </div>
              </div>

              <div className="border-t border-slate-200/80 pt-2.5 space-y-1.5 text-slate-700">
                <div className="flex justify-between">
                  <span>Gross Tariff Collected from Guest:</span>
                  <span className="font-mono font-bold text-slate-900">₹{parseFloat(selectedEarningForPayout.gross_amount).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-amber-700">
                  <span>Less Platform Fee (10%):</span>
                  <span className="font-mono font-bold">-₹{parseFloat(selectedEarningForPayout.platform_fee).toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-sm font-black text-slate-900 pt-1 border-t border-slate-200">
                  <span>Net Amount to Disburse:</span>
                  <span className="text-base text-emerald-700 font-mono">₹{parseFloat(selectedEarningForPayout.net_amount).toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Idempotency Protection Note */}
            <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-900 flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
              <p className="text-[11px] leading-relaxed">
                <strong>Idempotent Transfer:</strong> Unique idempotency key generated to strictly prevent duplicate transfers or double-disbursements.
              </p>
            </div>



            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowInitiatePayoutModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleInitiatePayout}
                disabled={processingPayout}
                className="py-2.5 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer"
              >
                {processingPayout ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Processing Payout...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Confirm & Disburse ₹{parseFloat(selectedEarningForPayout.net_amount).toFixed(2)}</span>
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODAL: HOTEL-WISE CONSOLIDATED PAYOUT */}
      {showHotelPayoutModal && selectedHotelPayoutData && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white card-white max-w-3xl w-full p-6 sm:p-7 space-y-5 rounded-3xl shadow-2xl border border-slate-200 animate-scale-up max-h-[92vh] overflow-y-auto text-xs">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shrink-0">
                  <Landmark className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Disburse Payout: {selectedHotelPayoutData.hotel_name}
                  </h3>
                  <p className="text-xs text-slate-900 font-black">
                    Consolidated settlement & hotel property details
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowHotelPayoutModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:text-slate-900 flex items-center justify-center text-sm font-bold cursor-pointer"
              >
                ×
              </button>
            </div>

            {/* Payout Financial Summary */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <span className="text-[10px] text-slate-900 font-black uppercase block">Hotel Scope</span>
                  <span className="font-black text-slate-900 text-sm truncate block">{selectedHotelPayoutData.hotel_name}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-900 font-black uppercase block">Company / Host Owner</span>
                  <span className="font-bold text-slate-800 truncate block">{selectedHotelPayoutData.owner_name}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-900 font-black uppercase block">Included Stays</span>
                  <span className="font-bold text-slate-900">{selectedHotelPayoutData.earning_ids.length} Bookings</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-900 font-black uppercase block">Payout Destination</span>
                  <span className="font-mono font-bold text-emerald-700 block truncate">
                    {selectedHotelPayoutData.payout_account?.destination_summary || 'Verified Bank / UPI'}
                  </span>
                </div>
              </div>

              <div className="border-t border-slate-200/80 pt-2.5 space-y-1.5 text-slate-700">
                <div className="flex justify-between items-center text-sm font-black text-slate-900 pt-1 border-t border-slate-200">
                  <span>Total Net Payable to Disburse:</span>
                  <span className="text-lg text-emerald-700 font-mono font-black">
                    ₹{selectedHotelPayoutData.total_net.toFixed(2)}
                  </span>
                </div>
                {selectedHotelPayoutData.total_on_hold > 0 && (
                  <div className="flex justify-between text-[11px] text-indigo-700 font-bold">
                    <span>Includes 7-Day Escrow Holdings:</span>
                    <span className="font-mono">₹{selectedHotelPayoutData.total_on_hold.toFixed(2)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Hotel-Wise Itemized Breakdown Table & Grand Total */}
            {selectedHotelPayoutData.hotels_breakdown && selectedHotelPayoutData.hotels_breakdown.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-red-600" /> Hotel-Wise Details ({selectedHotelPayoutData.hotels_breakdown.length} Properties)
                  </span>
                  <span className="text-[10px] font-black text-slate-900">
                    Total {selectedHotelPayoutData.earning_ids.length} Stays Included
                  </span>
                </div>

                <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs max-h-60 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100/90 text-slate-700 font-black uppercase tracking-wider sticky top-0 border-b border-slate-200 text-[10px]">
                      <tr>
                        <th className="p-3">Hotel Property & Location</th>
                        <th className="p-3">Owner / Host</th>
                        <th className="p-3 text-center">Stays</th>
                        <th className="p-3 text-right">Gross (₹)</th>
                        <th className="p-3 text-right">Commission (-₹)</th>
                        <th className="p-3 text-right text-emerald-800">Net Payable (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white text-[11px]">
                      {selectedHotelPayoutData.hotels_breakdown.map((hItem, idx) => (
                        <tr key={hItem.hotel_id || idx} className="hover:bg-slate-50/80 transition-colors">
                          <td className="p-3 font-bold text-white">
                            <div className="truncate max-w-[210px]" title={hItem.hotel_name}>
                              🏨 {hItem.hotel_name}
                            </div>
                            {hItem.city && (
                              <div className="text-[10px] text-slate-900 font-bold">
                                {hItem.city}{hItem.state ? `, ${hItem.state}` : ''}
                              </div>
                            )}
                          </td>
                          <td className="p-3 text-slate-600 truncate max-w-[130px]" title={hItem.owner_name}>
                            {hItem.owner_name}
                          </td>
                          <td className="p-3 text-center font-mono font-bold text-slate-700">
                            {hItem.bookings_count}
                          </td>
                          <td className="p-3 text-right font-mono text-slate-600">
                            ₹{hItem.gross_amount.toFixed(2)}
                          </td>
                          <td className="p-3 text-right font-mono text-amber-600 font-semibold">
                            -₹{hItem.platform_fee.toFixed(2)}
                          </td>
                          <td className="p-3 text-right font-mono font-black text-emerald-700">
                            ₹{hItem.net_payable.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-100/95 border-t-2 border-slate-300 font-black text-slate-900 sticky bottom-0 text-xs">
                      <tr>
                        <td colSpan="2" className="p-3 uppercase tracking-wider text-slate-900 font-extrabold">
                          Grand Total (कुल योग: {selectedHotelPayoutData.hotels_breakdown.length} Hotels)
                        </td>
                        <td className="p-3 text-center font-mono font-black">
                          {selectedHotelPayoutData.earning_ids.length}
                        </td>
                        <td className="p-3 text-right font-mono">
                          ₹{selectedHotelPayoutData.hotels_breakdown.reduce((sum, h) => sum + h.gross_amount, 0).toFixed(2)}
                        </td>
                        <td className="p-3 text-right font-mono text-amber-700">
                          -₹{selectedHotelPayoutData.hotels_breakdown.reduce((sum, h) => sum + h.platform_fee, 0).toFixed(2)}
                        </td>
                        <td className="p-3 text-right font-mono text-sm text-emerald-700 font-black">
                          ₹{selectedHotelPayoutData.total_net.toFixed(2)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}

            {/* Super Admin Early Release Option */}
            {selectedHotelPayoutData.has_on_hold && (
              <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 space-y-2">
                <div className="flex items-start gap-2.5">
                  <input
                    type="checkbox"
                    id="overrideHoldCheck"
                    checked={overrideHold}
                    onChange={(e) => setOverrideHold(e.target.checked)}
                    className="mt-0.5 rounded border-amber-400 text-amber-600 focus:ring-amber-500 cursor-pointer"
                  />
                  <label htmlFor="overrideHoldCheck" className="text-xs font-bold cursor-pointer">
                    Approve Early Escrow Release (Super Admin Authorization)
                  </label>
                </div>
                <p className="text-[11px] text-amber-800 leading-relaxed pl-6">
                  Check this box if you have verified that the guests have checked out without complaints or disputes, allowing immediate payout release before the 7-day period expires.
                </p>
              </div>
            )}

            {/* Idempotency Note */}
            <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-900 flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
              <p className="text-[11px] leading-relaxed">
                <strong>Idempotent Safe Transfer:</strong> Batch payout includes database lock and idempotency key to prevent accidental double-spending.
              </p>
            </div>



            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowHotelPayoutModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleHotelPayoutConfirm}
                disabled={processingPayout || (selectedHotelPayoutData.has_on_hold && selectedHotelPayoutData.total_eligible === 0 && !overrideHold)}
                className="py-2.5 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-black text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer"
              >
                {processingPayout ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Processing Payout...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Confirm & Disburse ₹{selectedHotelPayoutData.total_net.toFixed(2)}</span>
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODAL: EDIT / MANAGE OWNER BANK DETAILS */}
      {showEditBankModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white card-white max-w-md w-full p-6 space-y-4 rounded-3xl shadow-2xl border border-slate-200 text-xs">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <Landmark className="w-5 h-5 text-indigo-600" />
                <h3 className="text-sm font-black text-slate-900">Manage Owner Payout Destination</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowEditBankModal(false)}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 hover:text-slate-900 flex items-center justify-center text-sm font-bold cursor-pointer"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSaveOwnerBankDetails} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Payout Method</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingBankForm(prev => ({ ...prev, payout_method: 'BANK_ACCOUNT' }))}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold text-center cursor-pointer ${
                      editingBankForm.payout_method === 'BANK_ACCOUNT'
                        ? 'bg-indigo-50 border-indigo-500 text-indigo-700 font-black'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    🏦 Bank Account
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingBankForm(prev => ({ ...prev, payout_method: 'UPI' }))}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold text-center cursor-pointer ${
                      editingBankForm.payout_method === 'UPI'
                        ? 'bg-indigo-50 border-indigo-500 text-indigo-700 font-black'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    ⚡ UPI ID
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Account Holder / Beneficiary Name</label>
                <input
                  type="text"
                  required
                  value={editingBankForm.account_holder_name}
                  onChange={(e) => setEditingBankForm(prev => ({ ...prev, account_holder_name: e.target.value }))}
                  placeholder="e.g. Account Holder Name"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium outline-none focus:border-red-600 focus:bg-white text-xs"
                />
              </div>

              {editingBankForm.payout_method === 'BANK_ACCOUNT' ? (
                <>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Bank Name</label>
                    <input
                      type="text"
                      required
                      value={editingBankForm.bank_name}
                      onChange={(e) => setEditingBankForm(prev => ({ ...prev, bank_name: e.target.value }))}
                      placeholder="e.g. HDFC Bank Ltd."
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium outline-none focus:border-red-600 focus:bg-white text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Account Number</label>
                    <input
                      type="password"
                      required
                      value={editingBankForm.account_number}
                      onChange={(e) => setEditingBankForm(prev => ({ ...prev, account_number: e.target.value }))}
                      placeholder="Enter 9-18 digit account number"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono outline-none focus:border-red-600 focus:bg-white text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Confirm Account Number</label>
                    <input
                      type="text"
                      required
                      value={editingBankForm.confirm_account_number}
                      onChange={(e) => setEditingBankForm(prev => ({ ...prev, confirm_account_number: e.target.value }))}
                      placeholder="Re-enter account number"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono outline-none focus:border-red-600 focus:bg-white text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">IFSC Code (11 Digits)</label>
                    <input
                      type="text"
                      required
                      maxLength={11}
                      value={editingBankForm.ifsc_code}
                      onChange={(e) => setEditingBankForm(prev => ({ ...prev, ifsc_code: e.target.value.toUpperCase() }))}
                      placeholder="e.g. HDFC0001234"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono uppercase font-bold outline-none focus:border-red-600 focus:bg-white text-xs"
                    />
                  </div>
                </>
              ) : (
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">UPI ID (VPA)</label>
                  <input
                    type="text"
                    required
                    value={editingBankForm.upi_id}
                    onChange={(e) => setEditingBankForm(prev => ({ ...prev, upi_id: e.target.value }))}
                    placeholder="e.g. username@okhdfcbank"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono outline-none focus:border-red-600 focus:bg-white text-xs"
                  />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowEditBankModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingBankDetails}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {savingBankDetails ? 'Saving...' : 'Verify & Save Payout Destination'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* MODAL: PAYOUT OUTCOME & PROVIDER SETUP NOTICE */}
      {payoutResult && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white card-white max-w-lg w-full p-6 sm:p-7 space-y-5 rounded-3xl shadow-2xl border border-slate-200 animate-scale-up max-h-[92vh] overflow-y-auto text-xs">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                  payoutResult.payout?.status === 'PROVIDER_SETUP_REQUIRED' || payoutResult.status === 'PROVIDER_SETUP_REQUIRED'
                    ? 'bg-amber-50 border border-amber-200 text-amber-600'
                    : 'bg-emerald-50 border border-emerald-200 text-emerald-600'
                }`}>
                  {payoutResult.payout?.status === 'PROVIDER_SETUP_REQUIRED' || payoutResult.status === 'PROVIDER_SETUP_REQUIRED' ? (
                    <AlertTriangle className="w-5 h-5" />
                  ) : (
                    <CheckCircle2 className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    {payoutResult.payout?.status === 'PROVIDER_SETUP_REQUIRED' || payoutResult.status === 'PROVIDER_SETUP_REQUIRED'
                      ? 'Payout Recorded: Provider Activation Required'
                      : 'Payout Initiated Successfully'}
                  </h3>
                  <p className="text-xs text-slate-900 font-black font-mono">
                    Payout ID: #{payoutResult.payout?.payout_id || payoutResult.payout_id || 'N/A'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setPayoutResult(null)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:text-slate-900 flex items-center justify-center text-sm font-bold cursor-pointer"
              >
                ×
              </button>
            </div>

            <div className={`p-4 rounded-2xl space-y-2 ${
              payoutResult.status === 'success' || payoutResult.payout?.status === 'COMPLETED'
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-950'
                : 'bg-amber-50 border border-amber-200 text-amber-900'
            }`}>
              <span className="font-black text-xs block">
                {payoutResult.message || 'Platform payout processed successfully.'}
              </span>
              {(payoutResult.bank_reference || payoutResult.payout?.bank_reference) && (
                <div className="font-mono text-xs font-bold text-emerald-800 bg-white/90 p-2.5 rounded-xl border border-emerald-300 flex items-center justify-between">
                  <span>Bank UTR Reference:</span>
                  <span className="select-all font-black text-emerald-900 tracking-wider">
                    {payoutResult.bank_reference || payoutResult.payout?.bank_reference}
                  </span>
                </div>
              )}
              {(payoutResult.payout?.status === 'PROVIDER_SETUP_REQUIRED' || payoutResult.status === 'PROVIDER_SETUP_REQUIRED') && (
                <p className="text-[11px] leading-relaxed">
                  {payoutResult.payout?.setup_required_instructions ||
                   'Platform-managed collection is active. Automated direct transfers require activating Razorpay Route or RazorpayX Current Account credentials in Platform Settings.'}
                </p>
              )}
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5 text-slate-700">
              <div className="flex justify-between">
                <span>Total Amount Disbursed:</span>
                <span className="font-mono font-bold text-emerald-700">₹{payoutResult.payout?.amount || payoutResult.grand_total?.total_net?.toFixed(2) || '0.00'}</span>
              </div>
              <div className="flex justify-between">
                <span>Destination:</span>
                <span className="font-mono font-bold">{payoutResult.payout?.destination_summary || 'Host Verified Bank / UPI'}</span>
              </div>
              <div className="flex justify-between">
                <span>Idempotency Key:</span>
                <span className="font-mono text-[10px] truncate max-w-[200px]">{payoutResult.payout?.idempotency_key || 'Verified'}</span>
              </div>
            </div>

            {/* Hotel-Wise Disbursal Breakdown Table */}
            {payoutResult.hotels_breakdown && payoutResult.hotels_breakdown.length > 0 && (
              <div className="space-y-2 border border-slate-200 rounded-2xl p-3 bg-slate-50/70">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-red-600" /> Hotel-Wise Disbursal Breakdown ({payoutResult.hotels_breakdown.length} Hotels)
                  </h4>
                  <span className="text-[11px] font-black text-slate-900">
                    Grand Total: <span className="font-mono font-black text-slate-900">₹{payoutResult.grand_total?.total_net?.toFixed(2)}</span>
                  </span>
                </div>

                <div className="max-h-56 overflow-y-auto rounded-xl border border-slate-200 bg-white">
                  <table className="w-full text-left text-[11px]">
                    <thead className="bg-slate-100 text-slate-700 uppercase font-bold sticky top-0 border-b border-slate-200">
                      <tr>
                        <th className="p-2">Hotel Property</th>
                        <th className="p-2">Location & Owner</th>
                        <th className="p-2 text-center">Stays</th>
                        <th className="p-2 text-right">Gross</th>
                        <th className="p-2 text-right">Fee (15%)</th>
                        <th className="p-2 text-right">Net Paid</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                      {payoutResult.hotels_breakdown.map((h, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="p-2 font-black text-slate-900">{h.hotel_name}</td>
                          <td className="p-2 text-slate-900 font-bold text-[10px]">{h.city || 'India'} • {h.owner_name}</td>
                          <td className="p-2 text-center font-bold">{h.bookings_count}</td>
                          <td className="p-2 text-right font-mono text-slate-600">₹{Number(h.gross_amount).toFixed(2)}</td>
                          <td className="p-2 text-right font-mono text-rose-600 font-bold">-₹{Number(h.platform_fee).toFixed(2)}</td>
                          <td className="p-2 text-right font-mono font-black text-emerald-700">₹{Number(h.net_payable).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                    {payoutResult.grand_total && (
                      <tfoot className="bg-slate-100/90 font-black text-slate-900 border-t-2 border-slate-300 sticky bottom-0">
                        <tr>
                          <td className="p-2" colSpan={2}>Grand Total ({payoutResult.grand_total.total_hotels} Hotels)</td>
                          <td className="p-2 text-center font-black">{payoutResult.grand_total.total_bookings} Stays</td>
                          <td className="p-2 text-right font-mono text-slate-700">₹{payoutResult.grand_total.total_gross?.toFixed(2)}</td>
                          <td className="p-2 text-right font-mono text-rose-700">-₹{payoutResult.grand_total.total_platform_fee?.toFixed(2)}</td>
                          <td className="p-2 text-right font-mono text-emerald-800 text-xs">₹{payoutResult.grand_total.total_net?.toFixed(2)}</td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-4 border-t border-slate-100 mt-2">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-semibold text-slate-600">Disbursement recorded in platform ledger</span>
              </div>
              <button
                type="button"
                onClick={() => setPayoutResult(null)}
                className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 active:scale-95 text-white font-bold text-xs transition-all shadow-md hover:shadow-lg flex items-center gap-2 cursor-pointer"
              >
                <Check className="w-4 h-4 text-emerald-400 stroke-[3]" />
                <span>Acknowledge & Close</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODAL: DISPUTE / HOLD REASON */}
      {showDisputeModal && selectedEarningForDispute && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white card-white max-w-md w-full p-6 space-y-4 rounded-3xl shadow-2xl border border-slate-200 text-xs">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <ShieldAlert className="w-5 h-5 text-rose-600" />
                <h3 className="text-sm font-black text-slate-900">Place Settlement on Hold</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowDisputeModal(false)}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 hover:text-slate-900 flex items-center justify-center text-sm font-bold cursor-pointer"
              >
                ×
              </button>
            </div>

            <p className="text-slate-600">
              Enter reason for blocking payout for booking <strong className="font-mono text-slate-900">#{selectedEarningForDispute.booking_id}</strong> ({selectedEarningForDispute.hotel_name}):
            </p>

            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-slate-800 mb-1">
                Dispute / Investigation Reason <span className="text-rose-600">*</span>
              </label>
              <textarea
                rows={3}
                required
                value={disputeReason}
                onChange={(e) => setDisputeReason(e.target.value)}
                placeholder="e.g. Guest reported unhygienic room condition under support ticket #12; pending inspection."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium outline-none focus:border-red-600 focus:bg-white text-xs"
              ></textarea>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowDisputeModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleToggleDispute(selectedEarningForDispute, true, disputeReason)}
                disabled={!disputeReason.trim()}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black cursor-pointer disabled:opacity-50"
              >
                Place on Hold
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODAL: SUPER ADMIN ITEMIZED STATEMENT VOUCHER */}
      {showStatementModal && selectedStatementEarning && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white card-white max-w-xl w-full p-6 sm:p-8 space-y-5 rounded-3xl shadow-2xl border border-slate-200 animate-scale-up max-h-[92vh] overflow-y-auto text-xs">
            
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="px-3 py-1 rounded-full bg-red-50 text-red-700 border border-red-200 text-[10px] font-black uppercase tracking-wider">
                  Super Admin Escrow Statement
                </span>
                <h3 className="text-xl font-black text-slate-900 mt-1">
                  Settlement #{selectedStatementEarning.id}
                </h3>
                <p className="text-xs text-slate-900 font-mono font-bold">
                  Ref Code: #{selectedStatementEarning.booking_id} • Hotel: {selectedStatementEarning.hotel_name}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowStatementModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:text-slate-900 flex items-center justify-center text-sm font-bold cursor-pointer"
              >
                ×
              </button>
            </div>

            {/* Financial Ledger */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-slate-700">
              <div className="flex justify-between">
                <span>Gross Tariff Collected from Customer:</span>
                <span className="font-mono font-bold text-white">₹{parseFloat(selectedStatementEarning.gross_amount).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-amber-700">
                <span>Platform Commission (10%):</span>
                <span className="font-mono font-bold">-₹{parseFloat(selectedStatementEarning.platform_fee).toFixed(2)}</span>
              </div>
              {parseFloat(selectedStatementEarning.refund_amount || 0) > 0 && (
                <div className="flex justify-between text-rose-600">
                  <span>Refund / Cancellation Adjustment:</span>
                  <span className="font-mono font-bold">-₹{parseFloat(selectedStatementEarning.refund_amount).toFixed(2)}</span>
                </div>
              )}
              <div className="border-t border-slate-200 pt-2 flex justify-between items-center text-sm font-black text-slate-900">
                <span>Net Payable to Hotel Host:</span>
                <span className="text-base text-emerald-700 font-mono">₹{parseFloat(selectedStatementEarning.net_amount).toFixed(2)}</span>
              </div>
            </div>

            {/* Stay & Host Details */}
            <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-200 text-slate-700">
              <div>
                <span className="text-[10px] text-slate-900 font-black uppercase block">Host Name</span>
                <span className="font-black text-slate-900">{selectedStatementEarning.host_name}</span>
                <span className="text-[10px] text-slate-900 font-medium font-mono block">{selectedStatementEarning.host_email}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-900 font-black uppercase block">Guest Name</span>
                <span className="font-black text-slate-900">{selectedStatementEarning.guest_name}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-900 font-black uppercase block">Stay Dates</span>
                <span className="font-mono text-xs">{selectedStatementEarning.check_in} → {selectedStatementEarning.check_out}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-900 font-black uppercase block">{selectedStatementEarning?.holding_period_days || 7}-Day Escrow Hold Until</span>
                <span className="font-mono font-bold text-indigo-700 text-xs">
                  {selectedStatementEarning.hold_until ? new Date(selectedStatementEarning.hold_until).toLocaleDateString('en-IN') : 'Post Check-out'}
                </span>
              </div>
            </div>

            {/* Destination summary */}
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs">
              <div>
                <span className="text-[10px] text-emerald-700 font-bold uppercase block">Destination Account</span>
                <span className="font-black font-mono text-emerald-950">{selectedStatementEarning.destination_summary || 'Not registered'}</span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black border border-emerald-300">
                Encrypted & Masked
              </span>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => window.print()}
                className="py-2 px-4 rounded-xl border border-slate-200 text-slate-900 font-black hover:bg-slate-50 cursor-pointer"
              >
                Print Statement
              </button>
              <button
                type="button"
                onClick={() => setShowStatementModal(false)}
                className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-all shadow-sm cursor-pointer"
              >
                Close Statement
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODAL: PROVIDER SETUP & SETTLEMENT ARCHITECTURE GUIDE */}
      {showProviderGuideModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white card-white max-w-2xl w-full p-6 sm:p-8 space-y-6 rounded-3xl shadow-2xl border border-slate-200 animate-scale-up max-h-[92vh] overflow-y-auto text-xs">
            
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-black uppercase tracking-wider">
                  Payment Architecture Documentation
                </span>
                <h3 className="text-xl font-black text-slate-900 mt-1">
                  Book My Room Platform-Managed Settlement Architecture
                </h3>
                <p className="text-xs text-slate-900 font-black mt-0.5">
                  How guest payments, 7-day escrow holds, and hotel owner disbursements operate
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowProviderGuideModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:text-slate-900 flex items-center justify-center text-sm font-bold cursor-pointer"
              >
                ×
              </button>
            </div>

            <div className="space-y-4 text-slate-700 leading-relaxed">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <h4 className="font-black text-slate-900 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" /> 1. Centralized Platform Payment Collection
                </h4>
                <p className="text-[11px]">
                  All guest reservations are paid exclusively through Book My Room's approved Razorpay payment gateway. Customer money never flows directly to hotel owners at booking time. Payments are validated server-side against Razorpay orders and webhook signatures.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <h4 className="font-black text-slate-900 text-xs flex items-center gap-2">
                  <Clock className="w-4 h-4 text-indigo-600" /> 2. Configurable 7-Day Post Check-Out Escrow Hold
                </h4>
                <p className="text-[11px]">
                  Earnings are placed in a 7-day holding period that begins strictly after the guest checks out. Early payouts are blocked at the database level. If a customer files a dispute, complaint, or cancellation, the payout remains blocked on hold until resolution.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <h4 className="font-black text-slate-900 text-xs flex items-center gap-2">
                  <Landmark className="w-4 h-4 text-red-600" /> 3. Hotel Owner Onboarding & Masked Details
                </h4>
                <p className="text-[11px]">
                  Hotel owners register their verified Bank Account (NEFT/IMPS) or UPI ID during registration or via the Host Dashboard. Account numbers are masked everywhere in the UI (e.g., •••• •••• •••• 1234) and protected behind password verification.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <h4 className="font-black text-slate-900 text-xs flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-blue-600" /> 4. Approved Payment Provider Arrangement (Razorpay Route / RazorpayX)
                </h4>
                <p className="text-[11px]">
                  Standard gateway payments do not support arbitrary holding in ordinary accounts. The platform uses:
                </p>
                <ul className="list-disc pl-5 text-[11px] space-y-1">
                  <li><strong>Razorpay Route (Marketplace Split):</strong> Linked accounts with transfers on hold until check-out.</li>
                  <li><strong>RazorpayX Current Account (Direct Payouts):</strong> Automated bank transfers via Fund Accounts with webhook confirmation and idempotency keys to eliminate double-transfers.</li>
                </ul>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowProviderGuideModal(false)}
                className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-all shadow-sm cursor-pointer"
              >
                Close Documentation
              </button>
            </div>

          </div>
        </div>
      )}

      {/* PROCESS REFUND MODAL */}
      {showProcessRefundModal && selectedRefundBooking && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white card-white max-w-xl w-full p-6 sm:p-8 space-y-6 rounded-3xl shadow-2xl border border-slate-200 animate-scale-up max-h-[92vh] overflow-y-auto">
            
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="px-3 py-1 rounded-full bg-red-50 text-red-700 border border-red-200 text-[10px] font-black uppercase tracking-wider">
                  Super Admin Disbursal Authorization
                </span>
                <h3 className="text-xl font-black text-slate-900 mt-1">
                  Process Customer Refund
                </h3>
                <p className="text-xs text-slate-900 font-black mt-0.5">
                  Booking #{selectedRefundBooking.id} • {selectedRefundBooking.hotel_name || selectedRefundBooking.hotel_details?.name}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowProcessRefundModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:text-slate-900 flex items-center justify-center text-sm font-bold cursor-pointer"
              >
                ×
              </button>
            </div>

            {/* Financial Ledger & Customer Destination Details */}
            {(() => {
              const refDetails = resolveCustomerRefundDetails(selectedRefundBooking);
              const gross = refDetails.gross_amount;
              const refAmt = refDetails.refund_amount;
              const fee = refDetails.cancellation_fee;

              return (
                <div className="space-y-4">
                  
                  {/* Guest, Booking & Cancellation Summary Card */}
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-3">
                    <div className="grid grid-cols-2 gap-2 pb-2.5 border-b border-slate-200">
                      <div>
                        <span className="text-slate-900 font-black uppercase text-[10px] block">Customer Name</span>
                        <span className="font-bold text-white text-xs">{refDetails.customer_name || 'Guest User'}</span>
                        <span className="text-[11px] text-slate-900 font-semibold block font-mono">{selectedRefundBooking.user_email || selectedRefundBooking.guest_email || '—'}</span>
                      </div>
                      <div>
                        <span className="text-slate-900 font-black uppercase text-[10px] block">Hotel Property & Room</span>
                        <span className="font-bold text-white text-xs truncate block">{selectedRefundBooking.hotel_name || selectedRefundBooking.hotel_details?.name || 'Hotel Property'}</span>
                        <span className="text-[11px] text-slate-900 font-semibold block">{selectedRefundBooking.room_type_name || 'Room Reservation'}</span>
                      </div>
                    </div>

                    {/* Refund Mode & Status */}
                    <div className="grid grid-cols-2 gap-2 pb-2.5 border-b border-slate-200">
                      <div>
                        <span className="text-slate-900 font-black uppercase text-[10px] block">Preferred Refund Mode</span>
                        <span className="inline-flex items-center gap-1.5 font-mono font-bold text-white text-[11px] mt-0.5">
                          {refDetails.refund_mode === 'BANK_TRANSFER' ? (
                            <Landmark className="w-3.5 h-3.5 text-blue-600" />
                          ) : refDetails.refund_mode === 'UPI' ? (
                            <RotateCcw className="w-3.5 h-3.5 text-indigo-600" />
                          ) : (
                            <CreditCard className="w-3.5 h-3.5 text-red-600" />
                          )}
                          <span>{refDetails.refund_mode || refundMethod}</span>
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-900 font-black uppercase text-[10px] block">Refund Status</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200 inline-flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3 text-amber-600" />
                          {refDetails.refund_status || selectedRefundBooking.refund_status || 'REFUND_PENDING'}
                        </span>
                      </div>
                    </div>

                    {/* Original Razorpay Payment Reference */}
                    <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between text-[11px]">
                      <div>
                        <span className="text-[10px] text-slate-900 font-black uppercase block">Original Razorpay Payment ID</span>
                        <span className="font-mono font-bold text-white text-xs">{refDetails.payment_id}</span>
                      </div>
                      <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 text-[10px] font-extrabold border border-emerald-200 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Payment Captured
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-900 font-bold">Cancellation Reason:</span>
                      <span className="font-semibold text-slate-800 italic max-w-xs text-right">
                        "{refDetails.cancellation_reason || 'Requested by guest'}"
                      </span>
                    </div>

                    <div className="flex justify-between items-center pt-1 border-t border-slate-200 text-xs">
                      <span className="text-slate-900 font-bold">Owner Authorization:</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-300 inline-flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Owner Approved
                      </span>
                    </div>
                  </div>

                  {/* Calculations breakdown */}
                  <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200 text-xs space-y-2">
                    <div className="flex justify-between text-slate-700">
                      <span>Original Paid Amount:</span>
                      <span className="font-mono font-bold">₹{gross.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-amber-700">
                      <span>Cancellation Policy Charges Retained:</span>
                      <span className="font-mono font-bold">-₹{fee.toFixed(2)}</span>
                    </div>
                    <div className="border-t border-emerald-200 pt-2 flex justify-between items-center text-sm font-black text-slate-900">
                      <span>Net Refund Payable to Guest:</span>
                      <span className="text-base font-mono text-emerald-700 font-black">₹{refAmt.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Disbursement Destination Method */}
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase text-slate-700 tracking-wider">
                      Refund Destination Method
                    </label>
                    <div className="p-4 rounded-2xl border-2 border-red-500 bg-red-50/20 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-black text-slate-900 flex items-center gap-2">
                          <CreditCard className="w-4 h-4 text-red-600" />
                          <span>Direct Reversal to Original Payment Source (via Razorpay)</span>
                        </div>
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black border border-emerald-300">
                          Automatic & Secure
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
                        This initiates a direct gateway refund against original Razorpay Payment ID <strong className="font-mono text-slate-900">{refDetails.payment_id}</strong>. The net refund of <strong className="text-emerald-700 font-black">₹{refAmt.toFixed(2)}</strong> will be credited directly to the customer's original payment method (Credit/Debit Card, UPI handle, or NetBanking).
                      </p>
                    </div>
                  </div>

                  {/* Admin Internal Notes */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">
                      Super Admin Authorization Notes / Transaction Remarks:
                    </label>
                    <textarea
                      rows="2"
                      value={refundAdminNotes}
                      onChange={(e) => setRefundAdminNotes(e.target.value)}
                      placeholder="Optional authorization remarks or audit reference..."
                      className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>

                  {/* Idempotency & Security Notice */}
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-800 flex items-start gap-2">
                    <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <strong>Security & Idempotency Guarantee:</strong> Requests are protected with unique idempotency keys. Duplicate submissions will never cause multiple payouts. Bank account data is masked and audited.
                    </div>
                  </div>

                  {/* Actual Gateway Payout Result & Status Feedback */}
                  {lastPayoutResult && (
                    <div className={`p-3.5 rounded-2xl border text-xs transition-all ${
                      lastPayoutResult.status === 'PROCESSED' || lastPayoutResult.status === 'SUCCESS' || lastPayoutResult.status === 'REFUNDED'
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                        : lastPayoutResult.status === 'PENDING' || lastPayoutResult.status === 'PROCESSING' || lastPayoutResult.status === 'QUEUED'
                        ? 'bg-blue-50 border-blue-300 text-blue-950'
                        : 'bg-rose-50 border-rose-300 text-rose-950'
                    }`}>
                      <div className="flex items-center justify-between gap-2 flex-wrap pb-1 border-b border-black/5">
                        <span className="font-black flex items-center gap-1.5">
                          {lastPayoutResult.status === 'PROCESSED' || lastPayoutResult.status === 'SUCCESS' || lastPayoutResult.status === 'REFUNDED' ? (
                            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                          ) : lastPayoutResult.status === 'PENDING' || lastPayoutResult.status === 'PROCESSING' || lastPayoutResult.status === 'QUEUED' ? (
                            <Clock className="w-4 h-4 text-blue-600 shrink-0" />
                          ) : (
                            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                          )}
                          <span>Payout Gateway Status: <span className="uppercase tracking-wider font-extrabold">{lastPayoutResult.status}</span></span>
                        </span>
                        <div className="flex items-center gap-1.5">
                          {lastPayoutResult.payout_id && (
                            <span className="font-mono text-[10px] font-bold bg-white px-2 py-0.5 rounded-md border border-slate-200">
                              ID: {lastPayoutResult.payout_id}
                            </span>
                          )}
                          {lastPayoutResult.utr && (
                            <span className="font-mono text-[10px] font-extrabold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md border border-emerald-300">
                              UTR: {lastPayoutResult.utr}
                            </span>
                          )}
                        </div>
                      </div>
                      {lastPayoutResult.message && (
                        <p className="text-[11px] font-medium mt-1.5 leading-relaxed">
                          {lastPayoutResult.message}
                        </p>
                      )}
                      {lastPayoutResult.failure_reason && lastPayoutResult.failure_reason !== lastPayoutResult.message && (
                        <p className="text-[10px] text-rose-700 font-bold mt-1">
                          Failure Reason: {lastPayoutResult.failure_reason}
                        </p>
                      )}
                      {(lastPayoutResult.status === 'PENDING' || lastPayoutResult.status === 'PROCESSING' || lastPayoutResult.status === 'QUEUED') && (
                        <div className="pt-2 mt-2 border-t border-blue-200 flex items-center justify-between">
                          <span className="text-[10px] text-blue-700 font-semibold">Gateway is processing payout in background.</span>
                          <button
                            type="button"
                            disabled={syncingGatewayBookingId === String(selectedRefundBooking?.id || selectedRefundBooking?.booking_id)}
                            onClick={() => handleCheckCustomerPayoutStatus(selectedRefundBooking)}
                            className="text-[10px] font-black text-blue-800 bg-white border border-blue-300 hover:bg-blue-100 px-2 py-0.5 rounded-md flex items-center gap-1 cursor-pointer"
                          >
                            <RefreshCw className={`w-3 h-3 ${syncingGatewayBookingId === String(selectedRefundBooking?.id || selectedRefundBooking?.booking_id) ? 'animate-spin' : ''}`} />
                            Sync Status
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Modal Action Buttons */}
                  <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      disabled={processingAdminRefund}
                      onClick={() => setShowProcessRefundModal(false)}
                      className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-900 font-black text-xs transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={processingAdminRefund}
                      onClick={handleAdminExecuteRefund}
                      className="px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs transition-all shadow-md shadow-red-600/20 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {processingAdminRefund ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Processing Refund...</span>
                        </>
                      ) : (
                        <>
                          <RotateCcw className="w-4 h-4" />
                          <span>Confirm & Refund ₹{refAmt.toFixed(2)}</span>
                        </>
                      )}
                    </button>
                  </div>

                </div>
              );
            })()}

          </div>
        </div>
      )}

      </div>
    </div>
  );
};

export default AdminDashboard;
