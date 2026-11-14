import React, { useState, useEffect } from 'react';
import {
  MessageSquare, Search, Filter, CheckCircle2, Clock, AlertTriangle,
  User, Building2, Calendar, Phone, Mail, ArrowUpRight, Send,
  Paperclip, ExternalLink, RefreshCw, ChevronRight, X, ShieldAlert,
  ShieldCheck, HelpCircle, Check, Eye, UserCheck, AlertCircle
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const SupportTicketsManagement = ({ usersList = [], hotelsList = [], bookingsList = [] }) => {
  const { user: currentAdmin, showToast } = useAuth();

  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ALL'); // ALL, OPEN, IN_PROGRESS, RESOLVED, URGENT
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  // Selected Ticket Drawer / Modal
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [ticketLoading, setTicketLoading] = useState(false);
  const [linkedBooking, setLinkedBooking] = useState(null);
  const [loadingBooking, setLoadingBooking] = useState(false);

  // Admin Actions State
  const [replyText, setReplyText] = useState('');
  const [replyAttachment, setReplyAttachment] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [selectedOwnerId, setSelectedOwnerId] = useState('');
  const [updatingTicket, setUpdatingTicket] = useState(false);
  const [showResolveConfirm, setShowResolveConfirm] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const res = await api.get('/payments/support-tickets/');
      const list = res.data.results || res.data || [];
      setTickets(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error('Failed to load tickets:', err);
      showToast?.('Failed to load support tickets from server.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenTicket = async (ticket) => {
    setSelectedTicket(ticket);
    setReplyText('');
    setReplyAttachment('');
    setLinkedBooking(null);
    setTicketLoading(true);

    try {
      // Fetch fresh details with full messages list
      const res = await api.get(`/payments/support-tickets/${ticket.id}/`);
      const freshTicket = res.data;
      setSelectedTicket(freshTicket);
      setSelectedOwnerId(freshTicket.assigned_agent || '');

      // If ticket has a linked booking, fetch booking details
      if (freshTicket.booking) {
        fetchLinkedBooking(freshTicket.booking);
      }
    } catch (err) {
      console.error('Error fetching ticket details:', err);
    } finally {
      setTicketLoading(false);
    }
  };

  const fetchLinkedBooking = async (bookingIdOrPk) => {
    setLoadingBooking(true);
    try {
      const res = await api.get(`/bookings/${bookingIdOrPk}/`);
      setLinkedBooking(res.data);
    } catch (err) {
      console.warn('Could not load linked booking details:', err);
      // Fallback check from existing bookingsList if available
      const local = bookingsList.find(b => b.id === bookingIdOrPk || b.booking_id === bookingIdOrPk);
      if (local) setLinkedBooking(local);
    } finally {
      setLoadingBooking(false);
    }
  };

  // Admin Reply Action
  const handleSendReply = async (e) => {
    e?.preventDefault();
    if (!replyText.trim() || !selectedTicket) return;

    setSendingReply(true);
    try {
      const payload = {
        message: replyText.trim(),
        attachment_url: replyAttachment.trim() || null
      };
      const res = await api.post(`/payments/support-tickets/${selectedTicket.id}/messages/`, payload);

      showToast?.('Reply sent to customer successfully!', 'success');
      setReplyText('');
      setReplyAttachment('');

      // Refresh ticket details
      const ticketRes = await api.get(`/payments/support-tickets/${selectedTicket.id}/`);
      setSelectedTicket(ticketRes.data);
      // Update in main list
      setTickets(prev => prev.map(t => t.id === ticketRes.data.id ? ticketRes.data : t));
    } catch (err) {
      console.error('Failed to send reply:', err);
      const msg = err.response?.data?.error || err.response?.data?.detail || 'Failed to send reply.';
      showToast?.(msg, 'error');
    } finally {
      setSendingReply(false);
    }
  };

  // Status or Priority Update Action
  const handleUpdateTicketField = async (fields, successMsg) => {
    if (!selectedTicket) return;
    setUpdatingTicket(true);
    try {
      const res = await api.patch(`/payments/support-tickets/${selectedTicket.id}/`, fields);
      setSelectedTicket(res.data);
      setTickets(prev => prev.map(t => t.id === res.data.id ? res.data : t));
      showToast?.(successMsg || 'Ticket updated successfully!', 'success');
    } catch (err) {
      console.error('Failed to update ticket:', err);
      const msg = err.response?.data?.error || 'Failed to update ticket.';
      showToast?.(msg, 'error');
    } finally {
      setUpdatingTicket(false);
    }
  };

  // Assign to Hotel Owner Action
  const handleAssignOwner = async () => {
    if (!selectedTicket || !selectedOwnerId) return;
    const ownerObj = usersList.find(u => String(u.id) === String(selectedOwnerId));
    const ownerName = ownerObj ? (ownerObj.get_full_name || `${ownerObj.first_name || ''} ${ownerObj.last_name || ''}`.trim() || ownerObj.username) : 'Hotel Owner';
    
    await handleUpdateTicketField(
      { assigned_agent: selectedOwnerId, status: selectedTicket.status === 'OPEN' ? 'IN_PROGRESS' : selectedTicket.status },
      `Assigned to ${ownerName}`
    );
  };

  // Mark as Resolved
  const handleResolveTicket = async () => {
    setShowResolveConfirm(false);
    await handleUpdateTicketField({ status: 'RESOLVED' }, 'Ticket marked as RESOLVED!');
  };

  // Filtered Tickets
  const filteredTickets = tickets.filter(t => {
    // Tab filter
    if (activeTab === 'OPEN' && t.status !== 'OPEN') return false;
    if (activeTab === 'IN_PROGRESS' && t.status !== 'IN_PROGRESS') return false;
    if (activeTab === 'RESOLVED' && !['RESOLVED', 'CLOSED'].includes(t.status)) return false;
    if (activeTab === 'URGENT' && t.priority !== 'URGENT') return false;

    // Category filter
    if (categoryFilter !== 'ALL' && t.category !== categoryFilter) return false;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const numMatch = t.ticket_number?.toLowerCase().includes(q);
      const subMatch = t.subject?.toLowerCase().includes(q);
      const descMatch = t.description?.toLowerCase().includes(q);
      const userMatch = t.user_name?.toLowerCase().includes(q);
      const bookMatch = String(t.booking || '').toLowerCase().includes(q);
      if (!numMatch && !subMatch && !descMatch && !userMatch && !bookMatch) return false;
    }
    return true;
  });

  // Tab counts
  const counts = {
    all: tickets.length,
    open: tickets.filter(t => t.status === 'OPEN').length,
    inProgress: tickets.filter(t => t.status === 'IN_PROGRESS').length,
    resolved: tickets.filter(t => ['RESOLVED', 'CLOSED'].includes(t.status)).length,
    urgent: tickets.filter(t => t.priority === 'URGENT').length,
  };

  // Hotel Owners list for assignment dropdown
  const hotelOwners = usersList.filter(u => u.role === 'HOTEL_OWNER');

  // Category display helper
  const getCategoryBadge = (cat) => {
    const map = {
      BOOKING: { label: 'Booking Issue', bg: 'bg-sky-50 text-sky-700 border-sky-200' },
      PAYMENT: { label: 'Payment Issue', bg: 'bg-amber-50 text-amber-700 border-amber-200' },
      REFUND: { label: 'Refund Request', bg: 'bg-purple-50 text-purple-700 border-purple-200' },
      HOTEL: { label: 'Hotel & Room', bg: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
      CANCELLATION: { label: 'Cancellation', bg: 'bg-rose-50 text-rose-700 border-rose-200' },
      ACCOUNT: { label: 'General Query', bg: 'bg-slate-50 text-slate-700 border-slate-200' },
      TECHNICAL: { label: 'Technical Bug', bg: 'bg-orange-50 text-orange-700 border-orange-200' },
    };
    const c = map[cat] || { label: cat || 'Inquiry', bg: 'bg-slate-50 text-slate-700 border-slate-200' };
    return (
      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${c.bg}`}>
        {c.label}
      </span>
    );
  };

  const getPriorityBadge = (pri) => {
    switch (pri) {
      case 'URGENT':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-700 border border-rose-300 animate-pulse">URGENT</span>;
      case 'HIGH':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-orange-50 text-orange-700 border border-orange-200">HIGH</span>;
      case 'MEDIUM':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">MEDIUM</span>;
      case 'LOW':
      default:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">LOW</span>;
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'RESOLVED':
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1"><Check className="w-3 h-3 text-emerald-600" /> RESOLVED</span>;
      case 'CLOSED':
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-slate-100 text-slate-600 border border-slate-200">CLOSED</span>;
      case 'IN_PROGRESS':
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-sky-50 text-sky-700 border border-sky-200 flex items-center gap-1"><Clock className="w-3 h-3 text-sky-600" /> IN PROGRESS</span>;
      case 'WAITING_FOR_USER':
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-purple-50 text-purple-700 border border-purple-200">WAITING GUEST</span>;
      case 'OPEN':
      default:
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1"><AlertCircle className="w-3 h-3 text-rose-600" /> OPEN</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Metrics Bar */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 rounded-xl bg-purple-50 text-purple-700">
              <MessageSquare className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">Support Tickets Management</h2>
          </div>
          <p className="text-xs text-slate-500 font-medium">
            Monitor, assign to hotel owners, communicate with guests, and resolve platform support requests
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchTickets}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer"
            title="Refresh tickets list"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-purple-600' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Navigation Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
        {[
          { id: 'ALL', label: 'All Tickets', count: counts.all, color: 'text-slate-700' },
          { id: 'OPEN', label: 'Open', count: counts.open, color: 'text-rose-600' },
          { id: 'IN_PROGRESS', label: 'In Progress', count: counts.inProgress, color: 'text-sky-600' },
          { id: 'RESOLVED', label: 'Resolved', count: counts.resolved, color: 'text-emerald-600' },
          { id: 'URGENT', label: 'Urgent', count: counts.urgent, color: 'text-rose-700 font-black' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
              activeTab === tab.id
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
            }`}
          >
            <span>{tab.label}</span>
            <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-black ${
              activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Search & Category Filter */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by ticket #, subject, customer, or booking ID..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold placeholder:text-slate-400 focus:outline-none focus:border-purple-600 shadow-2xs"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full sm:w-auto px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-purple-600 shadow-2xs cursor-pointer"
          >
            <option value="ALL">All Categories</option>
            <option value="BOOKING">Booking Issue</option>
            <option value="PAYMENT">Payment Issue</option>
            <option value="REFUND">Refund Request</option>
            <option value="CANCELLATION">Cancellation</option>
            <option value="HOTEL">Hotel & Room Issue</option>
            <option value="ACCOUNT">General Query</option>
            <option value="TECHNICAL">Technical Bug</option>
          </select>
        </div>
      </div>

      {/* Tickets List Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        {loading ? (
          <div className="py-20 text-center space-y-3">
            <div className="w-8 h-8 border-3 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-xs font-bold text-slate-500">Loading support tickets...</p>
          </div>
        ) : filteredTickets.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <HelpCircle className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="text-sm font-black text-slate-700">No Tickets Found</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto font-medium">
              {searchQuery || categoryFilter !== 'ALL' || activeTab !== 'ALL'
                ? 'No tickets match your active filter criteria. Try clearing search or filters.'
                : 'There are currently no support tickets logged in the system.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-black uppercase text-slate-500 tracking-wider">
                  <th className="py-3 px-4">Ticket</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Booking / Property</th>
                  <th className="py-3 px-4">Subject & Category</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Assigned To</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                {filteredTickets.map((t) => {
                  const assignedOwner = hotelOwners.find(o => String(o.id) === String(t.assigned_agent));
                  return (
                    <tr
                      key={t.id}
                      onClick={() => handleOpenTicket(t)}
                      className="hover:bg-purple-50/40 transition-colors cursor-pointer group"
                    >
                      <td className="py-3.5 px-4">
                        <div className="font-mono font-black text-purple-700 text-xs flex items-center gap-1">
                          #{t.ticket_number}
                        </div>
                        <div className="text-[10px] text-slate-400 font-semibold mt-0.5">
                          {new Date(t.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-black text-slate-900 flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span>{t.user_name || 'Guest'}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        {t.booking ? (
                          <div className="space-y-0.5">
                            <span className="inline-block px-1.5 py-0.5 rounded bg-slate-100 font-mono text-[10px] font-bold text-slate-700">
                              Booking #{t.booking}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">None (General)</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="font-black text-slate-900 truncate" title={t.subject}>
                          {t.subject}
                        </div>
                        <div className="mt-1">
                          {getCategoryBadge(t.category)}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        {getPriorityBadge(t.priority)}
                      </td>
                      <td className="py-3.5 px-4">
                        {getStatusBadge(t.status)}
                      </td>
                      <td className="py-3.5 px-4">
                        {t.assigned_agent_name || (assignedOwner ? assignedOwner.get_full_name || assignedOwner.username : null) ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                            <Building2 className="w-3 h-3 text-purple-600" />
                            {t.assigned_agent_name || (assignedOwner?.get_full_name || assignedOwner?.username)}
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-slate-400 italic">Unassigned</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenTicket(t);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-purple-700 text-white text-[11px] font-bold transition-all cursor-pointer inline-flex items-center gap-1"
                        >
                          <Eye className="w-3 h-3" />
                          Manage
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* TICKET DETAILS MODAL DRAWER */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-fade-in">
          <div className="bg-white w-full max-w-4xl max-h-[92vh] rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
            
            {/* Header */}
            <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-md bg-purple-100 text-purple-800 font-mono font-black text-xs">
                    Ticket #{selectedTicket.ticket_number}
                  </span>
                  {getStatusBadge(selectedTicket.status)}
                  {getPriorityBadge(selectedTicket.priority)}
                  {getCategoryBadge(selectedTicket.category)}
                </div>
                <h3 className="text-lg font-black text-slate-900 tracking-tight">
                  {selectedTicket.subject}
                </h3>
                <div className="text-[11px] text-slate-500 font-semibold flex items-center gap-3">
                  <span>Created: {new Date(selectedTicket.created_at).toLocaleString('en-IN')}</span>
                  <span>•</span>
                  <span>Customer: <strong className="text-slate-800">{selectedTicket.user_name || 'Guest'}</strong></span>
                </div>
              </div>

              <button
                onClick={() => setSelectedTicket(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-800 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
              
              {/* Linked Booking Card (Conditional) */}
              {selectedTicket.booking && (
                <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-5 rounded-2xl shadow-md border border-slate-700 space-y-3">
                  <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-purple-400" />
                      <span className="text-xs font-black tracking-wide uppercase text-purple-300">
                        Linked Reservation Details
                      </span>
                    </div>
                    {loadingBooking && (
                      <span className="text-[11px] text-slate-400 font-medium">Fetching details...</span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase font-black">Booking ID</div>
                      <div className="font-mono font-bold text-white mt-0.5">
                        {linkedBooking?.booking_id || `#${selectedTicket.booking}`}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase font-black">Hotel / Property</div>
                      <div className="font-bold text-white mt-0.5 truncate" title={linkedBooking?.hotel_details?.name}>
                        {linkedBooking?.hotel_details?.name || 'Hotel Property'} (ID: {linkedBooking?.hotel || 'N/A'})
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase font-black">Room Assigned</div>
                      <div className="font-bold text-white mt-0.5">
                        {linkedBooking?.room_number || linkedBooking?.room_details?.room_type || 'Room Details'} (ID: {linkedBooking?.room || 'N/A'})
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase font-black">Check-in / Check-out</div>
                      <div className="font-bold text-purple-200 mt-0.5">
                        {linkedBooking?.check_in || 'N/A'} → {linkedBooking?.check_out || 'N/A'}
                      </div>
                    </div>
                  </div>

                  {linkedBooking && (
                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/10 text-[11px]">
                      <span className="text-slate-300 font-medium">Guest: <strong>{linkedBooking.guest_name || linkedBooking.customer_name}</strong></span>
                      <span className="text-slate-400">•</span>
                      <span className="text-slate-300 font-medium">Email: <strong>{linkedBooking.guest_email || 'N/A'}</strong></span>
                      <span className="text-slate-400">•</span>
                      <span className="text-slate-300 font-medium">Phone: <strong>{linkedBooking.guest_phone || 'N/A'}</strong></span>
                      <span className="text-slate-400">•</span>
                      <span className="text-slate-300 font-medium">Amount: <strong>₹{Number(linkedBooking.total_amount || 0).toLocaleString('en-IN')}</strong></span>
                      <span className="text-slate-400">•</span>
                      <span className="px-2 py-0.5 rounded bg-white/10 font-bold uppercase text-[10px]">
                        Status: {linkedBooking.booking_status}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Initial Customer Issue Box */}
              <div className="p-4 rounded-2xl bg-purple-50/50 border border-purple-200/80 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <div className="font-black text-purple-900 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-purple-600" />
                    <span>Customer Issue Description</span>
                  </div>
                  <span className="text-[11px] font-semibold text-purple-700">
                    {new Date(selectedTicket.created_at).toLocaleString('en-IN')}
                  </span>
                </div>
                <p className="text-xs text-slate-800 leading-relaxed font-medium whitespace-pre-wrap">
                  {selectedTicket.description}
                </p>
              </div>

              {/* Conversation History Thread */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-600">
                    Conversation History ({selectedTicket.messages?.length || 0} Replies)
                  </h4>
                  <span className="text-[11px] text-slate-400 font-semibold">Replies are visible to guest and admin</span>
                </div>

                <div className="space-y-3 max-h-[300px] overflow-y-auto p-3 bg-slate-50 rounded-2xl border border-slate-200">
                  {(!selectedTicket.messages || selectedTicket.messages.length === 0) ? (
                    <div className="py-6 text-center text-xs text-slate-400 font-medium">
                      No replies logged in this thread yet. Send a response to the customer below.
                    </div>
                  ) : (
                    selectedTicket.messages.map((m) => {
                      const isAdminMsg = m.sender_role === 'ADMIN' || m.sender_role === 'SUPER_ADMIN' || m.is_staff_reply;
                      const isOwnerMsg = m.sender_role === 'HOTEL_OWNER';

                      return (
                        <div
                          key={m.id}
                          className={`p-3.5 rounded-2xl space-y-1.5 text-xs ${
                            isAdminMsg
                              ? 'bg-purple-100/70 border border-purple-200 ml-6 text-purple-950'
                              : isOwnerMsg
                              ? 'bg-amber-50 border border-amber-200 ml-4 mr-4 text-amber-950'
                              : 'bg-white border border-slate-200 mr-6 text-slate-900 shadow-2xs'
                          }`}
                        >
                          <div className="flex items-center justify-between text-[11px] font-black border-b border-black/5 pb-1">
                            <div className="flex items-center gap-1.5">
                              {isAdminMsg && <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />}
                              {isOwnerMsg && <Building2 className="w-3.5 h-3.5 text-amber-600" />}
                              {!isAdminMsg && !isOwnerMsg && <User className="w-3.5 h-3.5 text-slate-500" />}
                              <span>{m.sender_name || (isAdminMsg ? 'GoOnStay Support Admin' : 'Customer')}</span>
                              <span className="text-[10px] font-normal opacity-75">
                                ({isAdminMsg ? 'Admin' : isOwnerMsg ? 'Hotel Owner' : 'Guest'})
                              </span>
                            </div>
                            <span className="text-[10px] opacity-60">
                              {new Date(m.created_at).toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' })}
                            </span>
                          </div>

                          <p className="leading-relaxed font-medium whitespace-pre-wrap">
                            {m.message}
                          </p>

                          {m.attachment_url && (
                            <div className="pt-1.5 flex items-center gap-2">
                              <Paperclip className="w-3.5 h-3.5 text-purple-600" />
                              <a
                                href={m.attachment_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[11px] font-bold text-purple-700 hover:underline flex items-center gap-1"
                              >
                                View Attachment <ExternalLink className="w-3 h-3" />
                              </a>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Reply Form */}
              <form onSubmit={handleSendReply} className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div className="text-xs font-black text-slate-800 flex items-center gap-1">
                  <Send className="w-3.5 h-3.5 text-purple-600" />
                  <span>Reply to Customer & Participants</span>
                </div>

                <textarea
                  rows={3}
                  required
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Type an official resolution, status update, or message to customer..."
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:border-purple-600 shadow-2xs"
                />

                <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Paperclip className="w-3.5 h-3.5 text-slate-400" />
                    <input
                      type="url"
                      value={replyAttachment}
                      onChange={(e) => setReplyAttachment(e.target.value)}
                      placeholder="Attachment URL (optional image / proof link)"
                      className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs w-full sm:w-64 focus:outline-none focus:border-purple-600"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={sendingReply || !replyText.trim()}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 disabled:opacity-50 text-white text-xs font-black flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    {sendingReply ? 'Sending Reply...' : 'Send Official Reply'}
                  </button>
                </div>
              </form>

              {/* Admin Actions Bar: Assign, Change Priority, Change Status */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-4">
                <div className="text-xs font-black text-slate-800 uppercase tracking-wider">
                  Admin Control & Workflow Actions
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  
                  {/* Action 1: Assign to Hotel Owner */}
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                    <label className="block text-[11px] font-black text-slate-700">
                      Assign to Hotel Owner
                    </label>
                    <select
                      value={selectedOwnerId}
                      onChange={(e) => setSelectedOwnerId(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold focus:outline-none focus:border-purple-600 cursor-pointer"
                    >
                      <option value="">-- Choose Hotel Owner --</option>
                      {hotelOwners.map(owner => (
                        <option key={owner.id} value={owner.id}>
                          {owner.get_full_name || owner.username} ({owner.email})
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={handleAssignOwner}
                      disabled={updatingTicket || !selectedOwnerId || String(selectedOwnerId) === String(selectedTicket.assigned_agent)}
                      className="w-full py-1.5 px-3 rounded-lg bg-slate-900 hover:bg-purple-700 disabled:opacity-40 text-white text-[11px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1"
                    >
                      <UserCheck className="w-3 h-3" />
                      Assign Ticket
                    </button>
                  </div>

                  {/* Action 2: Change Priority */}
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                    <label className="block text-[11px] font-black text-slate-700">
                      Update Priority
                    </label>
                    <select
                      value={selectedTicket.priority}
                      onChange={(e) => handleUpdateTicketField({ priority: e.target.value }, `Priority set to ${e.target.value}`)}
                      disabled={updatingTicket}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold focus:outline-none focus:border-purple-600 cursor-pointer"
                    >
                      <option value="LOW">Low</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HIGH">High</option>
                      <option value="URGENT">Urgent Assistance</option>
                    </select>
                    <div className="text-[10px] text-slate-400">
                      Priority dictates resolution escalation level.
                    </div>
                  </div>

                  {/* Action 3: Change Status */}
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                    <label className="block text-[11px] font-black text-slate-700">
                      Update Ticket Status
                    </label>
                    <select
                      value={selectedTicket.status}
                      onChange={(e) => handleUpdateTicketField({ status: e.target.value }, `Status updated to ${e.target.value}`)}
                      disabled={updatingTicket}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold focus:outline-none focus:border-purple-600 cursor-pointer"
                    >
                      <option value="OPEN">Open</option>
                      <option value="IN_PROGRESS">In Progress</option>
                      <option value="WAITING_FOR_USER">Waiting for Customer</option>
                      <option value="RESOLVED">Resolved</option>
                      <option value="CLOSED">Closed</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => setShowResolveConfirm(true)}
                      disabled={updatingTicket || selectedTicket.status === 'RESOLVED'}
                      className="w-full py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-[11px] font-black transition-all cursor-pointer flex items-center justify-center gap-1"
                    >
                      <CheckCircle2 className="w-3 h-3" />
                      Mark as Resolved
                    </button>
                  </div>

                </div>
              </div>

            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <span className="text-[11px] text-slate-400 font-semibold">
                GoOnStay Master Admin Desk
              </span>
              <button
                onClick={() => setSelectedTicket(null)}
                className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold transition-all cursor-pointer"
              >
                Close Ticket View
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Resolve Confirmation Modal */}
      {showResolveConfirm && (
        <div className="fixed inset-0 z-[60] bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h4 className="text-base font-black text-slate-900">Resolve This Ticket?</h4>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                Are you sure the customer's query has been successfully resolved? The status will update to <strong>RESOLVED</strong>.
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowResolveConfirm(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleResolveTicket}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-sm cursor-pointer"
              >
                Confirm Resolve
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupportTicketsManagement;

