// AdminExperienceBookings.jsx — platform-admin visibility into every
// Experience booking, across every host, in one place. AdminExperiences.jsx
// covers the experiences themselves (approve/reject, delete, per-experience
// session/booking counts); this is the read-only companion for the
// bookings underneath them — same relationship AdminEvents.jsx has to
// individual ticket sales, just surfaced explicitly here since there was
// previously no cross-host view at all (only each host's own
// ManageExperience.jsx, scoped to their own business).
//
// Deliberately read-only — no check-in toggle here. Check-in is the
// host's operational job at the door (ManageExperience.jsx already
// covers that); this page is for oversight — spotting problems,
// answering support questions, reconciling payouts — not for running
// the door remotely.
import { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import {
  Search, Filter, Users, CheckCircle, XCircle,
  FileSpreadsheet, FileText, Ticket,
} from 'lucide-react';
import * as XLSX from 'xlsx';

export default function AdminExperienceBookings() {
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterExperience, setFilterExperience] = useState('all');
  const [filterPaid, setFilterPaid] = useState('all');
  const [filterCheckedIn, setFilterCheckedIn] = useState('all');

  useEffect(() => {
    loadBookings();
  }, []);

  const loadBookings = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'experienceBookings'));
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setBookings(list);
    } catch (err) {
      console.error('Error loading experience bookings:', err);
    }
    setLoading(false);
  };

  // Unique experience titles for the filter dropdown — derived from the
  // bookings themselves rather than a separate `experiences` fetch, so
  // this page only ever offers filters that actually have bookings
  // under them (an experience with zero bookings just won't appear,
  // which is the right behavior for a bookings-focused view).
  const uniqueExperiences = [...new Set(bookings.map(b => b.experienceTitle).filter(Boolean))].sort();

  const totalRevenue = bookings.filter(b => b.paidStatus === 'paid').reduce((sum, b) => sum + (b.amountPaid || 0), 0);
  const totalGuests = bookings.reduce((sum, b) => sum + (b.guestCount || 1), 0);
  const totalCheckedIn = bookings.filter(b => b.checkedIn).length;

  const filteredBookings = bookings.filter(b => {
    const matchesSearch =
      b.buyerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.buyerEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.bookingId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.experienceTitle?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesExperience = filterExperience === 'all' || b.experienceTitle === filterExperience;
    const matchesPaid =
      filterPaid === 'all' ||
      (filterPaid === 'paid' && b.paidStatus === 'paid') ||
      (filterPaid === 'pending' && b.paidStatus !== 'paid');
    const matchesCheckedIn =
      filterCheckedIn === 'all' ||
      (filterCheckedIn === 'checked-in' && b.checkedIn) ||
      (filterCheckedIn === 'not-checked-in' && !b.checkedIn);
    return matchesSearch && matchesExperience && matchesPaid && matchesCheckedIn;
  });

  const getExportData = () => {
    const headers = ['Booking ID', 'Experience', 'Host', 'Guest Name', 'Email', 'Phone', 'Session Date', 'Session Time', 'Guests', 'Amount Paid', 'Paid', 'Booked On', 'Checked In'];
    const rows = filteredBookings.map(b => [
      b.bookingId || b.id,
      b.experienceTitle || '',
      b.organizerName || '',
      b.buyerName || '',
      b.buyerEmail || '',
      b.buyerPhone || 'N/A',
      b.sessionDate || '',
      b.sessionTime || '',
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
    a.download = `experience-bookings-${Date.now()}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
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
    XLSX.writeFile(workbook, `experience-bookings-${Date.now()}.xlsx`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">

        <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
              <Ticket className="text-purple-500" size={26} /> Experience Bookings
            </h1>
            <p className="text-sm text-gray-500 mt-1">All bookings across every Experience host — read-only view for oversight and support.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={exportToCSV} className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition text-sm font-semibold">
              <FileText size={16} /> CSV
            </button>
            <button onClick={exportToExcel} className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition text-sm font-semibold">
              <FileSpreadsheet size={16} /> Excel
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-2"><Ticket size={18} className="text-purple-500" /><p className="text-xs text-gray-500 font-semibold">Bookings</p></div>
            <p className="text-2xl font-black text-gray-900">{bookings.length}</p>
          </div>
          <div className="bg-white rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-2"><Users size={18} className="text-cyan-500" /><p className="text-xs text-gray-500 font-semibold">Total Guests</p></div>
            <p className="text-2xl font-black text-gray-900">{totalGuests}</p>
          </div>
          <div className="bg-white rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-2"><CheckCircle size={18} className="text-green-500" /><p className="text-xs text-gray-500 font-semibold">Checked In</p></div>
            <p className="text-2xl font-black text-gray-900">{totalCheckedIn}</p>
          </div>
          <div className="bg-white rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-2"><span className="text-lg">💰</span><p className="text-xs text-gray-500 font-semibold">Total Revenue</p></div>
            <p className="text-2xl font-black text-gray-900">₦{totalRevenue.toLocaleString()}</p>
          </div>
        </div>

        {/* Search + Filters */}
        <div className="bg-white rounded-xl p-5 shadow-sm mb-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search by name, email, booking ID, or experience..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-400 focus:border-transparent"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter size={16} className="text-gray-400" />
              <select value={filterExperience} onChange={(e) => setFilterExperience(e.target.value)}
                className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-400 focus:border-transparent">
                <option value="all">All Experiences</option>
                {uniqueExperiences.map(title => <option key={title} value={title}>{title}</option>)}
              </select>
            </div>
            <select value={filterPaid} onChange={(e) => setFilterPaid(e.target.value)}
              className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-400 focus:border-transparent">
              <option value="all">All Payments</option>
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
            </select>
            <select value={filterCheckedIn} onChange={(e) => setFilterCheckedIn(e.target.value)}
              className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-400 focus:border-transparent">
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
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Experience</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Host</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Guest</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Session</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Guests</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Amount</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredBookings.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-5 py-12 text-center text-gray-400 text-sm">
                      {searchTerm || filterExperience !== 'all' || filterPaid !== 'all' || filterCheckedIn !== 'all'
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
                        <span className="text-sm text-gray-800 font-medium">{b.experienceTitle || '—'}</span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-sm text-gray-600">{b.organizerName || '—'}</span>
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-sm font-medium text-gray-900">{b.buyerName}</p>
                        <p className="text-xs text-gray-500">{b.buyerEmail}</p>
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-600">
                        {b.sessionDate}{b.sessionTime ? ` · ${b.sessionTime}` : ''}
                      </td>
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
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}