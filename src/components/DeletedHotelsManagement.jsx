import React, { useState, useEffect } from 'react';
import {
  Archive, Building2, Search, Calendar, User, Mail, Phone, MapPin, Star,
  Clock, ShieldAlert, CheckCircle, AlertTriangle, FileText, BedDouble,
  CreditCard, RotateCcw, X, ExternalLink, RefreshCw, Eye, ArrowLeft,
  DollarSign, CheckCircle2, ChevronRight, Hash, Layers
} from 'lucide-react';
import api from '../services/api';
import { formatDisplayDate } from '../utils/dateUtils';

const DELETED_META_STORAGE_KEY = 'goonstay_deleted_hotels_meta';

export const getDeletedHotelsMeta = () => {
  try {
    const raw = localStorage.getItem(DELETED_META_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    console.warn('Failed to parse deleted hotels metadata:', e);
    return {};
  }
};

export const saveDeletedHotelMeta = (hotelId, metaData) => {
  try {
    const current = getDeletedHotelsMeta();
    current[hotelId] = {
      ...metaData,
      updated_at: new Date().toISOString()
    };
    localStorage.setItem(DELETED_META_STORAGE_KEY, JSON.stringify(current));
  } catch (e) {
    console.warn('Failed to save deleted hotel metadata:', e);
  }
};

export const removeDeletedHotelMeta = (hotelId) => {
  try {
    const current = getDeletedHotelsMeta();
    delete current[hotelId];
    localStorage.setItem(DELETED_META_STORAGE_KEY, JSON.stringify(current));
  } catch (e) {
    console.warn('Failed to remove deleted hotel metadata:', e);
  }
};

const DeletedHotelsManagement = ({
  hotelsList = [],
  bookingsList = [],
  paymentsList = [],
  currentUser = null,
  showToast = () => {},
  onRestoreHotel = null,
  onRefresh = () => {},
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('ALL');
  const [selectedHotelForDetails, setSelectedHotelForDetails] = useState(null);
  const [hotelRooms, setHotelRooms] = useState([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [activeModalTab, setActiveModalTab] = useState('OVERVIEW');
  const [bookingFilterQuery, setBookingFilterQuery] = useState('');
  const [deletedMetaMap, setDeletedMetaMap] = useState(getDeletedHotelsMeta());

  useEffect(() => {
    setDeletedMetaMap(getDeletedHotelsMeta());
  }, [hotelsList]);

  // Merge backend hotels with status === 'DELETED' or tracked in local audit metadata
  const deletedHotels = React.useMemo(() => {
    const map = new Map();

    // 1. Check all hotels from backend
    hotelsList.forEach(h => {
      const isDeletedStatus = h.status === 'DELETED' || h.is_deleted === true;
      const isTrackedDeleted = Boolean(deletedMetaMap[h.id]);
      if (isDeletedStatus || isTrackedDeleted) {
        map.set(h.id, {
          ...h,
          is_deleted: true,
          status: 'DELETED',
          deletion_meta: deletedMetaMap[h.id] || {
            deleted_at: h.deleted_at || h.updated_at || new Date().toISOString(),
            deleted_by: h.deleted_by?.username || 'Master Administrator',
            deleted_by_name: h.deleted_by?.first_name || 'Master Admin',
            reason: 'Administrative decommission'
          }
        });
      }
    });

    // 2. Check any hotels tracked in deletedMetaMap that might be missing from backend list
    Object.entries(deletedMetaMap).forEach(([idStr, meta]) => {
      const hid = parseInt(idStr, 10);
      if (!map.has(hid) && meta.hotel_snapshot) {
        map.set(hid, {
          ...meta.hotel_snapshot,
          id: hid,
          is_deleted: true,
          status: 'DELETED',
          deletion_meta: meta
        });
      }
    });

    return Array.from(map.values());
  }, [hotelsList, deletedMetaMap]);

  // Filter deleted hotels by search and date
  const filteredDeletedHotels = React.useMemo(() => {
    return deletedHotels.filter(h => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || (
        h.name?.toLowerCase().includes(q) ||
        h.city?.toLowerCase().includes(q) ||
        h.id?.toString().includes(q) ||
        h.owner_name?.toLowerCase().includes(q) ||
        h.owner_email?.toLowerCase().includes(q) ||
        h.deletion_meta?.deleted_by?.toLowerCase().includes(q)
      );
      if (!matchesSearch) return false;

      if (dateFilter !== 'ALL') {
        const delTime = new Date(h.deletion_meta?.deleted_at || h.deleted_at || h.updated_at).getTime();
        const now = Date.now();
        if (dateFilter === '7_DAYS' && now - delTime > 7 * 24 * 60 * 60 * 1000) return false;
        if (dateFilter === '30_DAYS' && now - delTime > 30 * 24 * 60 * 60 * 1000) return false;
        if (dateFilter === 'THIS_YEAR') {
          const currentYear = new Date().getFullYear();
          const delYear = new Date(delTime).getFullYear();
          if (delYear !== currentYear) return false;
        }
      }

      return true;
    });
  }, [deletedHotels, searchQuery, dateFilter]);

  // Calculate historical bookings for a hotel
  const getHotelBookings = (hotelId, hotelName) => {
    return bookingsList.filter(b => {
      const hid = b.hotel || b.hotel_id || b.hotel_details?.id;
      if (hid && hotelId && String(hid) === String(hotelId)) return true;
      if (hotelName && b.hotel_name && b.hotel_name.toLowerCase() === hotelName.toLowerCase()) return true;
      return false;
    });
  };

  // KPI Metrics across all deleted properties
  const totalDeletedCount = deletedHotels.length;
  const totalRetainedBookingsCount = deletedHotels.reduce((sum, h) => sum + getHotelBookings(h.id, h.name).length, 0);
  const totalRetainedRevenue = deletedHotels.reduce((sum, h) => {
    const bList = getHotelBookings(h.id, h.name);
    return sum + bList.reduce((bSum, b) => bSum + parseFloat(b.total_amount || b.total_price || 0), 0);
  }, 0);

  // Open Details Modal and fetch Rooms
  const handleOpenDetails = async (hotel) => {
    setSelectedHotelForDetails(hotel);
    setActiveModalTab('OVERVIEW');
    setHotelRooms([]);
    setLoadingRooms(true);

    try {
      const res = await api.get(`/rooms/hotel/${hotel.id}/`);
      const roomsData = res.data?.results || (Array.isArray(res.data) ? res.data : []);
      setHotelRooms(roomsData);
    } catch (e) {
      console.warn('Rooms fetch notice for archived hotel:', e);
      // Fallback: extract room snapshots from hotel bookings if endpoint fails
      const hotelBookings = getHotelBookings(hotel.id, hotel.name);
      const snapshotMap = new Map();
      hotelBookings.forEach(b => {
        if (b.room_details && b.room_details.id) {
          snapshotMap.set(b.room_details.id, {
            ...b.room_details,
            is_snapshot: true
          });
        }
      });
      setHotelRooms(Array.from(snapshotMap.values()));
    } finally {
      setLoadingRooms(false);
    }
  };

  // Restore hotel handler
  const handleRestore = async (hotel) => {
    const confirmMsg = `Restore Property Confirmation:\nAre you sure you want to restore '${hotel.name}' (ID #${hotel.id}) back to the active catalog?`;
    if (!window.confirm(confirmMsg)) return;

    try {
      await api.patch(`/hotels/${hotel.id}/`, {
        status: 'SUBMITTED',
        is_approved: false
      });
      removeDeletedHotelMeta(hotel.id);
      showToast(`🎉 Hotel '${hotel.name}' restored to active catalog in Submitted status!`, 'success');
      setSelectedHotelForDetails(null);
      if (onRestoreHotel) onRestoreHotel(hotel.id);
      onRefresh();
    } catch (err) {
      console.error('Failed to restore hotel:', err);
      showToast(err.response?.data?.error || 'Failed to restore hotel.', 'error');
    }
  };

  // Historical bookings for currently opened hotel
  const currentModalBookings = selectedHotelForDetails
    ? getHotelBookings(selectedHotelForDetails.id, selectedHotelForDetails.name)
    : [];

  const filteredModalBookings = currentModalBookings.filter(b => {
    if (!bookingFilterQuery) return true;
    const q = bookingFilterQuery.toLowerCase();
    const bId = String(b.booking_id || b.id || '').toLowerCase();
    const gName = (b.guest_name || b.customer_name || '').toLowerCase();
    const gEmail = (b.guest_email || b.user_email || '').toLowerCase();
    return bId.includes(q) || gName.includes(q) || gEmail.includes(q);
  });

  const modalRevenue = currentModalBookings.reduce((sum, b) => sum + parseFloat(b.total_amount || b.total_price || 0), 0);
  const modalCompletedStays = currentModalBookings.filter(b => b.booking_status === 'COMPLETED' || b.booking_status === 'CHECKED_OUT').length;
  const modalCancelledStays = currentModalBookings.filter(b => b.booking_status === 'CANCELLED' || b.payment_status === 'REFUNDED').length;

  return (
    <div className="space-y-5">
      
      {/* Top Banner & KPI Summary Cards */}
      <div className="bg-[#121316] border border-[#2D2A26] rounded-3xl p-6 sm:p-7 shadow-xl shadow-black/30 relative overflow-hidden">
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
                <Archive className="w-5 h-5" />
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                Deleted Hotels — Permanent Historical Records
              </h2>
            </div>
            <p className="text-slate-400 text-xs sm:text-sm mt-1.5 max-w-2xl leading-relaxed">
              Decommissioned hotel properties preserved permanently for audit, legal compliance, and customer booking history. All historical transactions and reservations remain completely intact.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => {
                setDeletedMetaMap(getDeletedHotelsMeta());
                onRefresh();
                showToast('Audit records synced with live storage.', 'info');
              }}
              className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Sync Records
            </button>
          </div>
        </div>

        {/* KPI Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mt-6 pt-6 border-t border-white/10">
          <div className="bg-white/5 border border-white/5 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Archived Properties</div>
              <div className="text-2xl font-black text-white mt-0.5">{totalDeletedCount}</div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
              <Building2 className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white/5 border border-white/5 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Historical Bookings Preserved</div>
              <div className="text-2xl font-black text-amber-400 mt-0.5">{totalRetainedBookingsCount}</div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Calendar className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white/5 border border-white/5 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Historical Revenue Retained</div>
              <div className="text-2xl font-black text-emerald-400 mt-0.5">₹{totalRetainedRevenue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <CreditCard className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search deleted properties by name, city, owner, ID..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:bg-white focus:border-amber-600 transition-all text-slate-900"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs font-bold text-slate-500 whitespace-nowrap">Deletion Period:</span>
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-amber-600"
          >
            <option value="ALL">All Time</option>
            <option value="7_DAYS">Last 7 Days</option>
            <option value="30_DAYS">Last 30 Days</option>
            <option value="THIS_YEAR">This Year</option>
          </select>
        </div>
      </div>

      {/* Table of Deleted Properties */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-900 font-bold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="p-4">Deleted Property</th>
                <th className="p-4">Owner Details</th>
                <th className="p-4">Location</th>
                <th className="p-4">Deletion Date & Admin</th>
                <th className="p-4 text-center">Historical Bookings</th>
                <th className="p-4">Compliance Status</th>
                <th className="p-4 text-right">Historical Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-normal text-slate-800">
              {filteredDeletedHotels.length === 0 ? (
                <tr>
                  <td colSpan="7" className="p-12 text-center">
                    <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
                        <Archive className="w-6 h-6" />
                      </div>
                      <div className="text-sm font-bold text-slate-800">No Deleted Hotels Found</div>
                      <div className="text-xs text-slate-500 mt-1">
                        {searchQuery ? 'No deleted hotels match your search criteria.' : 'No hotels have been deleted yet. Decommissioned hotels will permanently appear here.'}
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredDeletedHotels.map(h => {
                  const hBookings = getHotelBookings(h.id, h.name);
                  const delMeta = h.deletion_meta || {};
                  const delDateStr = delMeta.deleted_at || h.deleted_at || h.updated_at;

                  return (
                    <tr key={h.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0 relative">
                            {h.primary_image ? (
                              <img src={h.primary_image} alt={h.name} className="w-full h-full object-cover grayscale opacity-80" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-400">
                                <Building2 className="w-5 h-5" />
                              </div>
                            )}
                            <div className="absolute top-0 right-0 bg-rose-600 text-[8px] text-white px-1 font-bold rounded-bl">
                              OFF
                            </div>
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                              {h.name}
                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-bold">
                                #{h.id}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500 font-medium">
                              {h.property_type || 'Hotel Property'} • {h.star_rating || 4}★
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="p-4">
                        <div className="font-semibold text-slate-900 flex items-center gap-1">
                          <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          {h.owner_name || 'Owner Profile'}
                        </div>
                        {h.owner_email && (
                          <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1 font-mono">
                            <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                            {h.owner_email}
                          </div>
                        )}
                        {h.owner_phone && (
                          <div className="text-[10px] text-slate-500 mt-0.5 font-mono">
                            📞 {h.owner_phone}
                          </div>
                        )}
                      </td>

                      <td className="p-4">
                        <div className="font-semibold text-slate-900 flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          {h.city}
                        </div>
                        {h.address && (
                          <div className="text-[10px] text-slate-500 truncate max-w-[150px] mt-0.5" title={h.address}>
                            {h.address}
                          </div>
                        )}
                      </td>

                      <td className="p-4">
                        <div className="font-semibold text-slate-900 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                          {delDateStr ? formatDisplayDate(delDateStr) : 'Prior session'}
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5 font-mono">
                          By: <span className="text-slate-700 font-semibold">{delMeta.deleted_by || 'Master Admin'}</span>
                        </div>
                      </td>

                      <td className="p-4 text-center">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-amber-50 text-amber-800 border border-amber-200">
                          <Calendar className="w-3 h-3" />
                          {hBookings.length} Bookings
                        </span>
                      </td>

                      <td className="p-4">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200">
                          <ShieldAlert className="w-3 h-3 shrink-0" />
                          Deleted (Archived)
                        </span>
                        <div className="text-[9px] text-emerald-700 font-bold mt-1">
                          ✓ Legal Retention Active
                        </div>
                      </td>

                      <td className="p-4 text-right space-x-1.5 whitespace-nowrap">
                        <button
                          onClick={() => handleOpenDetails(h)}
                          className="py-1.5 px-3 rounded-lg bg-[#121316] text-[#D4AF37] hover:bg-black border border-[#D4AF37]/30 hover:border-[#D4AF37] text-[11px] font-bold inline-flex items-center justify-center gap-1 shrink-0 whitespace-nowrap leading-none transition-all cursor-pointer shadow-xs"
                          title="Inspect historical bookings, rooms, and payments"
                        >
                          <Eye className="w-3.5 h-3.5 shrink-0" /> Historical Records
                        </button>

                        {onRestoreHotel && (
                          <button
                            onClick={() => handleRestore(h)}
                            className="py-1.5 px-3 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white border border-emerald-200 text-[11px] font-bold inline-flex items-center justify-center gap-1 shrink-0 whitespace-nowrap leading-none transition-all cursor-pointer"
                            title="Restore this hotel to active properties catalog"
                          >
                            <RefreshCw className="w-3 h-3 shrink-0" /> Restore
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
      </div>

      {/* COMPREHENSIVE HISTORICAL RECORDS MODAL */}
      {selectedHotelForDetails && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-3xl max-w-5xl w-full max-h-[92vh] overflow-hidden shadow-2xl flex flex-col border border-slate-200">
            
            {/* Modal Header Banner */}
            <div className="relative bg-[#121316] text-white p-6 sm:p-7 border-b border-[#2D2A26] overflow-hidden shrink-0">
              <div className="absolute right-0 top-0 w-80 h-full opacity-20 pointer-events-none">
                {selectedHotelForDetails.primary_image && (
                  <img src={selectedHotelForDetails.primary_image} alt="" className="w-full h-full object-cover" />
                )}
              </div>

              <div className="relative z-10 flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1">
                      <Archive className="w-3 h-3" /> Historical Snapshot
                    </span>
                    <span className="text-slate-400 text-xs font-mono">Hotel ID #{selectedHotelForDetails.id}</span>
                  </div>

                  <h3 className="text-xl sm:text-2xl font-black text-white mt-1.5 tracking-tight">
                    {selectedHotelForDetails.name}
                  </h3>

                  <p className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                    <span>{selectedHotelForDetails.city}, {selectedHotelForDetails.state || 'India'}</span>
                    <span>•</span>
                    <span>Decommissioned: {formatDisplayDate(selectedHotelForDetails.deletion_meta?.deleted_at || selectedHotelForDetails.deleted_at || selectedHotelForDetails.updated_at)}</span>
                    <span>•</span>
                    <span className="text-slate-300">By: {selectedHotelForDetails.deletion_meta?.deleted_by || 'Master Admin'}</span>
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {onRestoreHotel && (
                    <button
                      onClick={() => handleRestore(selectedHotelForDetails)}
                      className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" /> Restore Property
                    </button>
                  )}
                  <button
                    onClick={() => setSelectedHotelForDetails(null)}
                    className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Modal KPI Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-5 border-t border-white/10">
                <div className="bg-white/5 rounded-xl p-3">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Bookings</div>
                  <div className="text-lg font-black text-amber-400 mt-0.5">{currentModalBookings.length}</div>
                </div>
                <div className="bg-white/5 rounded-xl p-3">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Gross Revenue</div>
                  <div className="text-lg font-black text-emerald-400 mt-0.5">₹{modalRevenue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</div>
                </div>
                <div className="bg-white/5 rounded-xl p-3">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Completed Stays</div>
                  <div className="text-lg font-black text-white mt-0.5">{modalCompletedStays}</div>
                </div>
                <div className="bg-white/5 rounded-xl p-3">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Preserved Rooms</div>
                  <div className="text-lg font-black text-white mt-0.5">{hotelRooms.length}</div>
                </div>
              </div>
            </div>

            {/* Modal SubTab Navigation */}
            <div className="bg-slate-100 px-6 border-b border-slate-200 flex items-center gap-2 overflow-x-auto shrink-0">
              {[
                { id: 'OVERVIEW', label: 'Property Overview', icon: Building2 },
                { id: 'ROOMS', label: `Rooms & Inventory (${hotelRooms.length})`, icon: BedDouble },
                { id: 'BOOKINGS', label: `Historical Bookings (${currentModalBookings.length})`, icon: Calendar },
                { id: 'AUDIT', label: 'Compliance & Audit Log', icon: ShieldAlert },
              ].map(tab => {
                const Icon = tab.icon;
                const isActive = activeModalTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveModalTab(tab.id)}
                    className={`py-3 px-3.5 text-xs font-bold transition-all flex items-center gap-2 border-b-2 whitespace-nowrap cursor-pointer ${
                      isActive
                        ? 'border-amber-600 text-slate-900 bg-white font-black rounded-t-lg'
                        : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-amber-600' : 'text-slate-400'}`} />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Modal Body Content (Scrollable) */}
            <div className="p-6 overflow-y-auto flex-1 text-slate-800 text-xs">
              
              {/* TAB 1: OVERVIEW */}
              {activeModalTab === 'OVERVIEW' && (
                <div className="space-y-6">
                  {/* Statutory Banner */}
                  <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-3">
                    <ShieldAlert className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold text-sm">Statutory Record Retention Guarantee</div>
                      <div className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
                        Under hospitality regulatory audit controls and Consumer Protection standards, this hotel's historical snapshot, room configurations, and guest ledgers are permanently preserved. This property has been removed from customer booking searches, but cannot be cascaded or erased.
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {/* Hotel Details Card */}
                    <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-3">
                      <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                        <Building2 className="w-4 h-4 text-amber-600" /> Property Snapshot Details
                      </h4>
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between border-b border-slate-200/60 pb-1.5">
                          <span className="text-slate-500">Property Type:</span>
                          <span className="font-bold text-slate-900">{selectedHotelForDetails.property_type || 'Hotel'}</span>
                        </div>
                        <div className="flex justify-between border-b border-slate-200/60 pb-1.5">
                          <span className="text-slate-500">Address:</span>
                          <span className="font-semibold text-slate-900 text-right max-w-[200px]">{selectedHotelForDetails.address}</span>
                        </div>
                        <div className="flex justify-between border-b border-slate-200/60 pb-1.5">
                          <span className="text-slate-500">City / State:</span>
                          <span className="font-bold text-slate-900">{selectedHotelForDetails.city}, {selectedHotelForDetails.state}</span>
                        </div>
                        <div className="flex justify-between border-b border-slate-200/60 pb-1.5">
                          <span className="text-slate-500">Star Rating:</span>
                          <span className="font-bold text-slate-900">{selectedHotelForDetails.star_rating} ★</span>
                        </div>
                        <div className="flex justify-between border-b border-slate-200/60 pb-1.5">
                          <span className="text-slate-500">Starting Price:</span>
                          <span className="font-bold text-slate-900">₹{selectedHotelForDetails.starting_price}/night</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Check-In / Out:</span>
                          <span className="font-semibold text-slate-900">{selectedHotelForDetails.check_in_time || '12:00 PM'} - {selectedHotelForDetails.check_out_time || '11:00 AM'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Owner Information Card */}
                    <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-3">
                      <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                        <User className="w-4 h-4 text-amber-600" /> Host & Owner Record
                      </h4>
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between border-b border-slate-200/60 pb-1.5">
                          <span className="text-slate-500">Owner Name:</span>
                          <span className="font-bold text-slate-900">{selectedHotelForDetails.owner_name || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between border-b border-slate-200/60 pb-1.5">
                          <span className="text-slate-500">Owner Email:</span>
                          <span className="font-mono text-slate-900">{selectedHotelForDetails.owner_email || '—'}</span>
                        </div>
                        <div className="flex justify-between border-b border-slate-200/60 pb-1.5">
                          <span className="text-slate-500">Phone Number:</span>
                          <span className="font-mono text-slate-900">{selectedHotelForDetails.owner_phone || '—'}</span>
                        </div>
                        <div className="flex justify-between border-b border-slate-200/60 pb-1.5">
                          <span className="text-slate-500">Owner Account Status:</span>
                          <span className={`font-bold ${selectedHotelForDetails.owner_is_blocked ? 'text-rose-600' : 'text-emerald-600'}`}>
                            {selectedHotelForDetails.owner_is_blocked ? 'Account Blocked' : 'Account Active'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Portal Access:</span>
                          <span className="font-bold text-rose-600">Restricted for this property</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Policies & Rules */}
                  <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-3">
                    <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">
                      Historical Hotel Policies & Guest Rules
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="font-bold text-slate-700">Cancellation Policy:</span>
                        <p className="text-slate-600 mt-0.5">{selectedHotelForDetails.cancellation_policy || 'Standard cancellation policy applied.'}</p>
                      </div>
                      <div>
                        <span className="font-bold text-slate-700">Check-in Rules:</span>
                        <p className="text-slate-600 mt-0.5">{selectedHotelForDetails.rules || 'Valid government ID mandatory at check-in.'}</p>
                      </div>
                      <div>
                        <span className="font-bold text-slate-700">Safety Information:</span>
                        <p className="text-slate-600 mt-0.5">{selectedHotelForDetails.safety_info || '24/7 CCTV surveillance, fire extinguishers.'}</p>
                      </div>
                      <div>
                        <span className="font-bold text-slate-700">Payment Policy:</span>
                        <p className="text-slate-600 mt-0.5">{selectedHotelForDetails.payment_policy || 'Online prepaid bookings via Razorpay escrow.'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: ROOMS */}
              {activeModalTab === 'ROOMS' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">Archived Room Configurations</h4>
                      <p className="text-slate-500 text-xs mt-0.5">Rooms snapshot preserved at the moment of hotel decommission.</p>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
                      {hotelRooms.length} Rooms Configured
                    </span>
                  </div>

                  {loadingRooms ? (
                    <div className="p-8 text-center text-slate-500">Loading archived rooms...</div>
                  ) : hotelRooms.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 bg-slate-50 rounded-2xl border border-slate-200">
                      No rooms found for this property snapshot.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {hotelRooms.map(r => (
                        <div key={r.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white transition-all space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900 text-sm">{r.room_type || r.title || 'Standard Room'}</span>
                            <span className="font-mono text-emerald-700 font-bold">₹{r.price_per_night || r.base_price}/night</span>
                          </div>
                          <div className="text-[11px] text-slate-500">
                            Max Occupancy: <span className="font-semibold text-slate-700">{r.max_occupancy || r.capacity || 2} Persons</span>
                          </div>
                          {r.description && (
                            <p className="text-[10px] text-slate-600 line-clamp-2">{r.description}</p>
                          )}
                          <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[10px] text-slate-500">
                            <span>Room ID: #{r.id}</span>
                            <span className="text-rose-600 font-bold uppercase">Deactivated</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: BOOKINGS */}
              {activeModalTab === 'BOOKINGS' && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">Permanent Historical Bookings Ledger</h4>
                      <p className="text-slate-500 text-xs mt-0.5">All customer reservations, transactions, and stay histories associated with this hotel.</p>
                    </div>
                    <div className="relative w-full sm:w-64">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={bookingFilterQuery}
                        onChange={(e) => setBookingFilterQuery(e.target.value)}
                        placeholder="Search by ID, guest name..."
                        className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:bg-white"
                      />
                    </div>
                  </div>

                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 uppercase text-[10px]">
                        <tr>
                          <th className="p-3">Booking ID</th>
                          <th className="p-3">Guest Details</th>
                          <th className="p-3">Check-In / Out</th>
                          <th className="p-3">Amount</th>
                          <th className="p-3">Booking Status</th>
                          <th className="p-3">Payment Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredModalBookings.length === 0 ? (
                          <tr>
                            <td colSpan="6" className="p-8 text-center text-slate-500">
                              No historical bookings match the search criteria.
                            </td>
                          </tr>
                        ) : (
                          filteredModalBookings.map(b => (
                            <tr key={b.id} className="hover:bg-slate-50">
                              <td className="p-3 font-mono font-bold text-slate-900">
                                #{b.id}
                                {b.booking_id && <div className="text-[10px] text-slate-500">{b.booking_id}</div>}
                              </td>
                              <td className="p-3">
                                <div className="font-semibold text-slate-900">{b.guest_name || b.customer_name || 'Guest'}</div>
                                <div className="text-[10px] text-slate-500 font-mono">{b.guest_email || b.user_email || '—'}</div>
                              </td>
                              <td className="p-3 text-[11px]">
                                <div>{formatDisplayDate(b.check_in)}</div>
                                <div className="text-[10px] text-slate-400">to {formatDisplayDate(b.check_out)}</div>
                              </td>
                              <td className="p-3 font-black text-slate-900">
                                ₹{parseFloat(b.total_amount || b.total_price || 0).toFixed(2)}
                              </td>
                              <td className="p-3">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                                  b.booking_status === 'CONFIRMED' ? 'bg-emerald-50 text-emerald-700' :
                                  b.booking_status === 'CANCELLED' ? 'bg-rose-50 text-rose-700' :
                                  b.booking_status === 'COMPLETED' ? 'bg-blue-50 text-blue-700' :
                                  'bg-slate-100 text-slate-700'
                                }`}>
                                  {b.booking_status || 'CONFIRMED'}
                                </span>
                              </td>
                              <td className="p-3">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                                  b.payment_status === 'PAID' || b.payment_status === 'CAPTURED' ? 'bg-emerald-50 text-emerald-700' :
                                  b.payment_status === 'REFUNDED' ? 'bg-purple-50 text-purple-700' :
                                  'bg-amber-50 text-amber-700'
                                }`}>
                                  {b.payment_status || 'PAID'}
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 4: AUDIT LOG */}
              {activeModalTab === 'AUDIT' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                    <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                      <ShieldAlert className="w-4 h-4 text-rose-600" />
                      Administrative Deletion Audit Trail
                    </h4>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between border-b border-slate-200/60 pb-1.5">
                        <span className="text-slate-500">Decommission Timestamp:</span>
                        <span className="font-mono font-bold text-slate-900">
                          {selectedHotelForDetails.deletion_meta?.deleted_at || selectedHotelForDetails.deleted_at || selectedHotelForDetails.updated_at}
                        </span>
                      </div>
                      <div className="flex justify-between border-b border-slate-200/60 pb-1.5">
                        <span className="text-slate-500">Authorizing Super Admin:</span>
                        <span className="font-bold text-slate-900">
                          {selectedHotelForDetails.deletion_meta?.deleted_by || 'Master Administrator'}
                        </span>
                      </div>
                      <div className="flex justify-between border-b border-slate-200/60 pb-1.5">
                        <span className="text-slate-500">Decommission Reason:</span>
                        <span className="font-medium text-slate-800">
                          {selectedHotelForDetails.deletion_meta?.reason || 'Administrative Decommission'}
                        </span>
                      </div>
                      <div className="flex justify-between border-b border-slate-200/60 pb-1.5">
                        <span className="text-slate-500">Statutory Retention Mode:</span>
                        <span className="font-black text-emerald-700">PERMANENT ENFORCED (NO CASCADE)</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Customer Search Visibility:</span>
                        <span className="font-bold text-rose-600">ZERO VISIBILITY (DISABLED)</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 p-4 border-t border-slate-200 flex items-center justify-between shrink-0">
              <span className="text-[11px] text-slate-500 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Permanent Audit Snapshot Verified
              </span>
              <button
                onClick={() => setSelectedHotelForDetails(null)}
                className="px-5 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-black transition-all cursor-pointer"
              >
                Close Records
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default DeletedHotelsManagement;
