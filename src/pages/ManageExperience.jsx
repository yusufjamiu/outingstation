// ManageExperience.jsx — "Manage" page for a single Experience.
// Route: /manage-experience/:experienceId?key=... — no login required.
//
// Mirrors ManageEvent.jsx's shape (stats cards, search/filter table,
// check-in button) AND its access model: reached via a secret
// `manageKey` link generated at admin-approval time
// (AdminExperienceSubmissions.jsx), not through login or business
// ownership. Experiences never required a business account — this
// matches events exactly, where an organizer manages their event
// through the private link they were given, not an authenticated
// dashboard.
import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Calendar, Clock, Users, CheckCircle, XCircle, Search, Filter,
  AlertCircle, Plus, Trash2, FileSpreadsheet, FileText, ArrowLeft, Ticket, MapPin,
} from 'lucide-react';
import { doc, getDoc, collection, query, where, getDocs, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import * as XLSX from 'xlsx';

const formatSessionDate = (dateStr) => {
  if (!dateStr) return 'No date';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return dateStr;
  }
};

const formatSessionTime = (timeStr) => {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':').map(Number);
  if (Number.isNaN(h)) return timeStr;
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m || 0).padStart(2, '0')} ${period}`;
};

export default function ManageExperience() {
  const { experienceId } = useParams();
  const [searchParams] = useSearchParams();
  const manageKeyFromUrl = searchParams.get('key');
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [experience, setExperience] = useState(null);
  const [authorized, setAuthorized] = useState(false);
  const [bookings, setBookings] = useState([]);
  const [activeTab, setActiveTab] = useState('sessions'); // 'sessions' | 'bookings'

  // Sessions tab
  const [addingSession, setAddingSession] = useState(false);
  const [newSessionDate, setNewSessionDate] = useState('');
  const [newSessionTime, setNewSessionTime] = useState('');
  const [newSessionSpots, setNewSessionSpots] = useState('');
  const [savingSession, setSavingSession] = useState(false);

  // Bookings tab
  const [filterSessionId, setFilterSessionId] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCheckedIn, setFilterCheckedIn] = useState('all');
  const [filterPaid, setFilterPaid] = useState('all');

  useEffect(() => {
    loadExperience();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [experienceId]);

  const loadExperience = async () => {
    setLoading(true);
    try {
      const expDoc = await getDoc(doc(db, 'experiences', experienceId));
      if (!expDoc.exists()) {
        toast.error('Experience not found');
        navigate('/');
        return;
      }
      const expData = { id: expDoc.id, ...expDoc.data() };

      // Key-based access, same model as ManageEvent.jsx — the link
      // itself is the credential, checked against the manageKey
      // generated at approval time. No login or business ownership
      // involved.
      const isAuthorized = !!manageKeyFromUrl && manageKeyFromUrl === expData.manageKey;

      setExperience(expData);
      setAuthorized(isAuthorized);
      if (isAuthorized) await loadBookings(expData.id);
    } catch (err) {
      console.error('Error loading experience:', err);
      toast.error('Failed to load experience');
    }
    setLoading(false);
  };

  // Bookings live in their own top-level collection, keyed to this
  // experience by experienceId — same shape as `tickets` for events.
  // This collection is only ever populated once the checkout/payment
  // flow (Paystack) writes to it, which isn't built yet — so an empty
  // result here just means no one has booked yet, not an error.
  const loadBookings = async (expId) => {
    try {
      const snap = await getDocs(query(collection(db, 'experienceBookings'), where('experienceId', '==', expId)));
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setBookings(list);
    } catch (err) {
      console.error('Error loading bookings:', err);
    }
  };

  const sessions = experience?.sessions || [];
  const now = new Date(new Date().toDateString());
  const upcomingSessions = sessions.filter(s => !s.date || new Date(s.date) >= now);
  const totalBookedGuests = sessions.reduce((sum, s) => sum + (s.bookedSpots || 0), 0);
  const totalRevenue = bookings.filter(b => b.paidStatus === 'paid').reduce((sum, b) => sum + (b.amountPaid || 0), 0);

  const handleAddSession = async () => {
    if (!newSessionDate) { toast.error('Pick a date'); return; }
    if (!newSessionTime) { toast.error('Pick a time'); return; }
    const spots = parseInt(newSessionSpots, 10);
    if (!spots || spots < 1) { toast.error('Enter a valid number of spots'); return; }

    setSavingSession(true);
    try {
      const newSession = {
        id: `session_${Date.now()}`,
        date: newSessionDate,
        time: newSessionTime,
        totalSpots: spots,
        bookedSpots: 0,
      };
      const updatedSessions = [...sessions, newSession];
      await updateDoc(doc(db, 'experiences', experience.id), { sessions: updatedSessions });
      setExperience(prev => ({ ...prev, sessions: updatedSessions }));
      setNewSessionDate(''); setNewSessionTime(''); setNewSessionSpots('');
      setAddingSession(false);
      toast.success('Session added');
    } catch (err) {
      console.error('Error adding session:', err);
      toast.error('Failed to add session');
    }
    setSavingSession(false);
  };

  const handleDeleteSession = async (sessionId) => {
    const session = sessions.find(s => s.id === sessionId);
    if (!session) return;
    if ((session.bookedSpots || 0) > 0) {
      toast.error("Can't delete a session with existing bookings");
      return;
    }
    if (!window.confirm(`Delete the ${formatSessionDate(session.date)} session? This can't be undone.`)) return;
    try {
      const updatedSessions = sessions.filter(s => s.id !== sessionId);
      await updateDoc(doc(db, 'experiences', experience.id), { sessions: updatedSessions });
      setExperience(prev => ({ ...prev, sessions: updatedSessions }));
      toast.success('Session deleted');
    } catch (err) {
      console.error('Error deleting session:', err);
      toast.error('Failed to delete session');
    }
  };

  const handleViewSessionBookings = (sessionId) => {
    setFilterSessionId(sessionId);
    setActiveTab('bookings');
  };

  const handleCheckIn = async (bookingId, currentStatus) => {
    try {
      await updateDoc(doc(db, 'experienceBookings', bookingId), { checkedIn: !currentStatus });
      setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, checkedIn: !currentStatus } : b));
      toast.success(currentStatus ? 'Checked out' : '✅ Checked in!');
    } catch (err) {
      console.error('Error updating check-in:', err);
      toast.error('Failed to update check-in status');
    }
  };

  const sessionLabel = (sessionId) => {
    const s = sessions.find(x => x.id === sessionId);
    if (!s) return 'Unknown session';
    return `${formatSessionDate(s.date)} · ${formatSessionTime(s.time)}`;
  };

  const filteredBookings = bookings.filter(b => {
    const matchesSearch =
      b.buyerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.buyerEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.bookingId?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSession = filterSessionId === 'all' || b.sessionId === filterSessionId;
    const matchesCheckedIn =
      filterCheckedIn === 'all' ||
      (filterCheckedIn === 'checked-in' && b.checkedIn) ||
      (filterCheckedIn === 'not-checked-in' && !b.checkedIn);
    const matchesPaid =
      filterPaid === 'all' ||
      (filterPaid === 'paid' && b.paidStatus === 'paid') ||
      (filterPaid === 'pending' && b.paidStatus !== 'paid');
    return matchesSearch && matchesSession && matchesCheckedIn && matchesPaid;
  });

  const getExportData = () => {
    const headers = ['Booking ID', 'Guest Name', 'Email', 'Phone', 'Session', 'Guests', 'Amount Paid', 'Paid', 'Booked On', 'Checked In'];
    const rows = filteredBookings.map(b => [
      b.bookingId || b.id,
      b.buyerName || '',
      b.buyerEmail || '',
      b.buyerPhone || 'N/A',
      sessionLabel(b.sessionId),
      b.guestCount || 1,
      `₦${Number(b.amountPaid || 0).toLocaleString()}`,
      b.paidStatus === 'paid' ? 'Yes' : 'No',
      b.createdAt?.seconds ? new Date(b.createdAt.seconds * 1000).toLocaleDateString() : 'N/A',
      b.checkedIn ? 'Yes' : 'No',
    ]);
    return { headers, rows };
  };

  const exportToCSV = () => {
    const { headers, rows } = getExportData();
    const csvContent = [headers.join(','), ...rows.map(row => row.map(cell => `"${cell}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${experience.title}-bookings-${Date.now()}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('✅ Bookings exported (CSV)!');
  };

  const exportToExcel = () => {
    const { headers, rows } = getExportData();
    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const colWidths = headers.map((header, colIndex) => {
      const maxLen = Math.max(header.length, ...rows.map(row => String(row[colIndex] ?? '').length));
      return { wch: Math.min(Math.max(maxLen + 2, 10), 40) };
    });
    worksheet['!cols'] = colWidths;
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Bookings');
    XLSX.writeFile(workbook, `${experience.title}-bookings-${Date.now()}.xlsx`);
    toast.success('✅ Bookings exported (Excel)!');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500" />
      </div>
    );
  }

  if (!experience || !authorized) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md mx-auto text-center">
          <AlertCircle size={48} className="mx-auto text-red-500 mb-4" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">Invalid or Missing Link</h1>
          <p className="text-gray-500 mb-6">This manage link is invalid or incomplete. Check the link you were given, or contact admin@outingstation.com.</p>
          <button onClick={() => navigate('/')} className="px-6 py-2.5 bg-cyan-500 text-white rounded-xl font-bold hover:bg-cyan-600 transition">
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">

        <button onClick={() => navigate('/')} className="flex items-center gap-2 text-gray-500 hover:text-gray-800 mb-4 transition text-sm font-semibold">
          <ArrowLeft size={16} /> Back to Home
        </button>

        {/* Header */}
        <div className="bg-white rounded-2xl p-6 shadow-sm mb-6">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h1 className="text-2xl sm:text-3xl font-black text-gray-900">{experience.title}</h1>
                <span className="inline-flex items-center gap-1 bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-xs font-bold">
                  ✨ {experience.category}
                </span>
              </div>
              <p className="text-sm text-gray-500 flex items-center gap-1.5">
                <MapPin size={14} /> {experience.city} · ₦{Number(experience.pricePerPerson || 0).toLocaleString()}/person
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={exportToCSV} className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition text-sm font-semibold">
                <FileText size={16} /> CSV
              </button>
              <button onClick={exportToExcel} className="flex items-center gap-2 px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition text-sm font-semibold">
                <FileSpreadsheet size={16} /> Excel
              </button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-2"><Calendar size={18} className="text-purple-500" /><p className="text-xs text-gray-500 font-semibold">Sessions</p></div>
            <p className="text-2xl font-black text-gray-900">{sessions.length}</p>
            <p className="text-xs text-gray-400 mt-0.5">{upcomingSessions.length} upcoming</p>
          </div>
          <div className="bg-white rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-2"><Users size={18} className="text-cyan-500" /><p className="text-xs text-gray-500 font-semibold">Total Booked</p></div>
            <p className="text-2xl font-black text-gray-900">{totalBookedGuests}</p>
          </div>
          <div className="bg-white rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-2"><CheckCircle size={18} className="text-green-500" /><p className="text-xs text-gray-500 font-semibold">Checked In</p></div>
            <p className="text-2xl font-black text-gray-900">{bookings.filter(b => b.checkedIn).length}</p>
          </div>
          <div className="bg-white rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-2"><span className="text-lg">💰</span><p className="text-xs text-gray-500 font-semibold">Revenue</p></div>
            <p className="text-2xl font-black text-gray-900">₦{totalRevenue.toLocaleString()}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 bg-white rounded-xl p-1.5 shadow-sm w-fit">
          <button
            onClick={() => setActiveTab('sessions')}
            className={`px-5 py-2 rounded-lg text-sm font-bold transition ${activeTab === 'sessions' ? 'bg-purple-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            Sessions
          </button>
          <button
            onClick={() => setActiveTab('bookings')}
            className={`px-5 py-2 rounded-lg text-sm font-bold transition ${activeTab === 'bookings' ? 'bg-purple-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            Bookings
          </button>
        </div>

        {/* ── Sessions tab ── */}
        {activeTab === 'sessions' && (
          <div className="space-y-4">
            {sessions.length === 0 && !addingSession && (
              <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-10 text-center">
                <Calendar size={32} className="mx-auto text-gray-300 mb-3" />
                <p className="font-bold text-gray-700 mb-1">No sessions yet</p>
                <p className="text-sm text-gray-400 mb-4">Add your first bookable date and time below.</p>
              </div>
            )}

            {sessions.map(session => {
              const booked = session.bookedSpots || 0;
              const total = session.totalSpots || 0;
              const pct = total > 0 ? Math.min(100, (booked / total) * 100) : 0;
              const isPast = session.date && new Date(session.date) < now;
              return (
                <div key={session.id} className={`bg-white rounded-2xl p-5 shadow-sm border-2 ${isPast ? 'border-gray-100 opacity-60' : 'border-gray-100'}`}>
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-purple-50 flex items-center justify-center flex-shrink-0">
                        <Calendar size={18} className="text-purple-500" />
                      </div>
                      <div>
                        <p className="font-bold text-gray-900 text-sm">{formatSessionDate(session.date)}</p>
                        <p className="text-xs text-gray-500 flex items-center gap-1"><Clock size={11} /> {formatSessionTime(session.time)}</p>
                      </div>
                      {isPast && <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-semibold">Past</span>}
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-sm font-black text-gray-800">{booked} / {total}</p>
                        <p className="text-xs text-gray-400">spots booked</p>
                      </div>
                      <button
                        onClick={() => handleViewSessionBookings(session.id)}
                        className="px-3 py-1.5 border-2 border-purple-200 text-purple-600 rounded-lg text-xs font-bold hover:bg-purple-50 transition"
                      >
                        Check-in
                      </button>
                      {booked === 0 && (
                        <button
                          onClick={() => handleDeleteSession(session.id)}
                          className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="mt-3 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-purple-500 transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}

            {/* Add New Session */}
            {addingSession ? (
              <div className="bg-white rounded-2xl p-5 shadow-sm border-2 border-purple-200">
                <p className="text-sm font-bold text-gray-800 mb-3">New Session</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                  <div>
                    <label className="text-xs font-bold text-gray-500 mb-1 block">Date</label>
                    <input type="date" value={newSessionDate} onChange={(e) => setNewSessionDate(e.target.value)}
                      className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-purple-400" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 mb-1 block">Time</label>
                    <input type="time" value={newSessionTime} onChange={(e) => setNewSessionTime(e.target.value)}
                      className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-purple-400" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 mb-1 block">Total Spots</label>
                    <input type="number" min="1" value={newSessionSpots} onChange={(e) => setNewSessionSpots(e.target.value)}
                      placeholder="e.g. 12" className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-purple-400" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={handleAddSession} disabled={savingSession}
                    className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl text-sm font-bold hover:from-purple-700 hover:to-pink-700 transition disabled:opacity-50">
                    {savingSession ? 'Saving...' : 'Add Session'}
                  </button>
                  <button onClick={() => { setAddingSession(false); setNewSessionDate(''); setNewSessionTime(''); setNewSessionSpots(''); }}
                    className="px-4 py-2.5 text-gray-500 hover:text-gray-700 text-sm font-semibold">
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setAddingSession(true)}
                className="w-full flex items-center justify-center gap-2 py-4 border-2 border-dashed border-purple-300 rounded-2xl text-sm font-bold text-purple-600 hover:bg-purple-50 transition"
              >
                <Plus size={16} /> Add New Session
              </button>
            )}
          </div>
        )}

        {/* ── Bookings tab ── */}
        {activeTab === 'bookings' && (
          <div>
            {bookings.length === 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
                <p className="text-sm text-blue-800">
                  💡 Bookings will show up here once guests can check out and pay for a session. No bookings yet.
                </p>
              </div>
            )}

            {/* Search + Filters */}
            <div className="bg-white rounded-xl p-5 shadow-sm mb-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="text"
                    placeholder="Search by name, email, or booking ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-cyan-400 focus:border-transparent"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Filter size={16} className="text-gray-400" />
                  <select value={filterSessionId} onChange={(e) => setFilterSessionId(e.target.value)}
                    className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-cyan-400 focus:border-transparent">
                    <option value="all">All Sessions</option>
                    {sessions.map(s => (
                      <option key={s.id} value={s.id}>{formatSessionDate(s.date)} · {formatSessionTime(s.time)}</option>
                    ))}
                  </select>
                </div>
                <select value={filterPaid} onChange={(e) => setFilterPaid(e.target.value)}
                  className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-cyan-400 focus:border-transparent">
                  <option value="all">All Payments</option>
                  <option value="paid">Paid</option>
                  <option value="pending">Pending</option>
                </select>
                <select value={filterCheckedIn} onChange={(e) => setFilterCheckedIn(e.target.value)}
                  className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-cyan-400 focus:border-transparent">
                  <option value="all">All Status</option>
                  <option value="checked-in">Checked In</option>
                  <option value="not-checked-in">Not Checked In</option>
                </select>
              </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Booking</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Guest</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Session</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Guests</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Amount</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredBookings.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-5 py-12 text-center text-gray-400 text-sm">
                          {searchTerm || filterSessionId !== 'all' || filterPaid !== 'all' || filterCheckedIn !== 'all'
                            ? 'No bookings match your search'
                            : 'No bookings yet'}
                        </td>
                      </tr>
                    ) : (
                      filteredBookings.map(b => (
                        <tr key={b.id} className="hover:bg-gray-50">
                          <td className="px-5 py-4">
                            <span className="text-sm font-mono font-semibold text-purple-600">{b.bookingId || b.id}</span>
                          </td>
                          <td className="px-5 py-4">
                            <p className="text-sm font-medium text-gray-900">{b.buyerName}</p>
                            <p className="text-xs text-gray-500">{b.buyerEmail}</p>
                          </td>
                          <td className="px-5 py-4 text-sm text-gray-600">{sessionLabel(b.sessionId)}</td>
                          <td className="px-5 py-4 text-sm font-semibold text-gray-900">{b.guestCount || 1}</td>
                          <td className="px-5 py-4 text-sm font-semibold text-gray-900">₦{Number(b.amountPaid || 0).toLocaleString()}</td>
                          <td className="px-5 py-4">
                            {b.checkedIn ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                                <CheckCircle size={12} /> Checked In
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800">
                                <XCircle size={12} /> Not Checked In
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-4">
                            <button
                              onClick={() => handleCheckIn(b.id, b.checkedIn)}
                              className={`px-3 py-1.5 rounded-lg font-semibold text-xs transition ${
                                b.checkedIn ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' : 'bg-purple-600 text-white hover:bg-purple-700'
                              }`}
                            >
                              {b.checkedIn ? 'Undo' : 'Check In'}
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}