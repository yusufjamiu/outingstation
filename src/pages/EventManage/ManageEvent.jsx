import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { 
  Calendar, Clock, MapPin, Users, Download, CheckCircle, XCircle,
  Ticket, Mail, Search, Filter, AlertCircle, Layers, UserPlus, FileSpreadsheet, FileText,
  Lock, Plus, Trash2
} from 'lucide-react';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import PublicNavbar from '../../components/PublicNavbar';
import Footer from '../../components/Footer';
import VendorStandsManager from '../../components/VendorStandsManager';
import { formatEventDateFull, formatEventTime } from '../../utils/dateTimeHelpers';
// ✅ NEW — SheetJS, for the Excel (.xlsx) export option alongside CSV
import * as XLSX from 'xlsx';

export default function ManageEvent() {
  const { manageKey } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  // ✅ Tier filter
  const [filterTier, setFilterTier] = useState('all');
  const [stats, setStats] = useState({
    totalSold: 0,
    totalCheckedIn: 0,
    totalRevenue: 0,
    tierBreakdown: [], // ✅ Per-tier stats
  });
  // ✅ NEW — Invite Guests panel state. Lets the organizer add more
  // invited guests after the event is already live, reusing the exact
  // same /api/invite-guest endpoint the approval flow calls for the
  // original invite list — same ticket generation, same dedupe, same
  // email template, just triggered from here instead.
  const [inviteEmailsText, setInviteEmailsText] = useState('');
  const [sendingInvites, setSendingInvites] = useState(false);
  const [inviteResult, setInviteResult] = useState(null);
  // ✅ NEW — Group Codes editor state (code-gated private events only).
  // `editingMax` tracks in-progress edits to an existing group's limit
  // (keyed by group id/code) so typing doesn't save on every keystroke —
  // only on explicit Save. `newGroupName`/`newGroupMax` are for adding a
  // brand new group.
  const [editingMax, setEditingMax] = useState({});
  const [savingGroups, setSavingGroups] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupMax, setNewGroupMax] = useState(5);

  useEffect(() => {
    loadEventAndTickets();
  }, [manageKey]);

  const loadEventAndTickets = async () => {
    try {
      setLoading(true);

      const eventsRef = collection(db, 'events');
      const q = query(eventsRef, where('manageKey', '==', manageKey));
      const eventsSnapshot = await getDocs(q);

      if (eventsSnapshot.empty) {
        toast.error('Invalid or expired management link');
        navigate('/');
        return;
      }

      const eventDoc = eventsSnapshot.docs[0];
      const eventData = { id: eventDoc.id, ...eventDoc.data() };
      setEvent(eventData);

      const ticketsRef = collection(db, 'tickets');
      const ticketsQuery = query(ticketsRef, where('eventId', '==', eventDoc.id));
      const ticketsSnapshot = await getDocs(ticketsQuery);

      const ticketsData = ticketsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setTickets(ticketsData);

      // ✅ Calculate stats
      const totalSold = ticketsData.reduce((sum, t) => sum + (t.quantity || 1), 0);
      const totalCheckedIn = ticketsData.filter(t => t.checkedIn).reduce((sum, t) => sum + (t.quantity || 1), 0);
      const totalRevenue = ticketsData.reduce((sum, t) => {
        return sum + ((t.ticketPrice || 0) * (t.quantity || 1));
      }, 0);

      // ✅ Per-tier breakdown
      const tierMap = {};
      ticketsData.forEach(t => {
        const tierName = t.tierName || 'Standard';
        if (!tierMap[tierName]) {
          tierMap[tierName] = { name: tierName, sold: 0, revenue: 0, checkedIn: 0 };
        }
        tierMap[tierName].sold += (t.quantity || 1);
        tierMap[tierName].revenue += (t.ticketPrice || 0) * (t.quantity || 1);
        if (t.checkedIn) tierMap[tierName].checkedIn += (t.quantity || 1);
      });
      const tierBreakdown = Object.values(tierMap);

      setStats({ totalSold, totalCheckedIn, totalRevenue, tierBreakdown });

    } catch (err) {
      console.error('Error loading event:', err);
      toast.error('Failed to load event data');
    }
    setLoading(false);
  };

  // ✅ NEW — parses the pasted email list (newline or comma-separated,
  // same tolerant parsing as SubmitEventPage.jsx's invite step) and
  // sends them to /api/invite-guest. Reloads tickets afterward so newly
  // invited guests show up in the ticket list immediately, same as any
  // other ticket.
  const handleSendInvites = async () => {
    const candidates = inviteEmailsText.split(/[\n,]+/).map(s => s.trim()).filter(Boolean);
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const emails = [...new Set(candidates.filter(e => emailRegex.test(e)).map(e => e.toLowerCase()))];

    if (emails.length === 0) {
      toast.error('Enter at least one valid email');
      return;
    }

    setSendingInvites(true);
    setInviteResult(null);
    try {
      const res = await fetch('/api/invite-guest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId: event.id, emails }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send invites');

      setInviteResult(data);
      if (data.issuedCount > 0) {
        toast.success(`💌 ${data.issuedCount} invite${data.issuedCount !== 1 ? 's' : ''} sent`);
        setInviteEmailsText('');
        loadEventAndTickets(); // refresh ticket list to show the new invites
      } else {
        toast.error('No new invites sent — everyone on that list already has a ticket');
      }
    } catch (err) {
      console.error('Error sending invites:', err);
      toast.error('Failed to send invites: ' + err.message);
    } finally {
      setSendingInvites(false);
    }
  };

  // ✅ NEW — same code-generation logic as SubmitEventPage.jsx's
  // GroupCodeBuilder, duplicated here rather than shared since this is a
  // separate file with no shared utils module for it yet. Keeping the
  // exact same shape (name + random suffix) so codes look consistent
  // regardless of whether a group was created at submission or added
  // later from here.
  const generateGroupCode = (groupName) => {
    const base = (groupName || 'GROUP').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12) || 'GROUP';
    const suffix = Math.random().toString(36).slice(2, 5).toUpperCase();
    return `${base}${suffix}`;
  };

  // ✅ NEW — raises (or lowers, but never below usedGuests) an existing
  // group's maxGuests. Writes the whole groupCodes array back — Firestore
  // has no way to update a single array element in place, so this reads
  // the array, patches the one group, and rewrites it whole.
  const handleUpdateGroupMax = async (groupId) => {
    const newMaxRaw = editingMax[groupId];
    const newMax = parseInt(newMaxRaw, 10);
    if (!newMax || newMax < 1) {
      toast.error('Enter a valid number');
      return;
    }
    const currentGroups = event.groupCodes || [];
    const target = currentGroups.find(g => g.id === groupId);
    if (target && newMax < (target.usedGuests || 0)) {
      toast.error(`Can't set limit below ${target.usedGuests} — that many guests already used this code`);
      return;
    }

    setSavingGroups(true);
    try {
      const updatedGroups = currentGroups.map(g => g.id === groupId ? { ...g, maxGuests: newMax } : g);
      await updateDoc(doc(db, 'events', event.id), { groupCodes: updatedGroups });
      setEvent(prev => ({ ...prev, groupCodes: updatedGroups }));
      setEditingMax(prev => { const next = { ...prev }; delete next[groupId]; return next; });
      toast.success('Group limit updated');
    } catch (err) {
      console.error('Error updating group limit:', err);
      toast.error('Failed to update limit');
    } finally {
      setSavingGroups(false);
    }
  };

  // ✅ NEW — adds a brand new group/code to the event, mid-event. Same
  // shape as the groups created at submission time.
  const handleAddGroup = async () => {
    if (!newGroupName.trim()) {
      toast.error('Enter a group name');
      return;
    }
    if (!newGroupMax || newGroupMax < 1) {
      toast.error('Enter a valid guest limit');
      return;
    }

    setSavingGroups(true);
    try {
      const newGroup = {
        id: `group_${Date.now()}`,
        code: generateGroupCode(newGroupName),
        groupName: newGroupName.trim(),
        maxGuests: newGroupMax,
        usedGuests: 0,
      };
      const updatedGroups = [...(event.groupCodes || []), newGroup];
      await updateDoc(doc(db, 'events', event.id), { groupCodes: updatedGroups });
      setEvent(prev => ({ ...prev, groupCodes: updatedGroups }));
      setNewGroupName('');
      setNewGroupMax(5);
      toast.success(`Group added — code: ${newGroup.code}`);
    } catch (err) {
      console.error('Error adding group:', err);
      toast.error('Failed to add group');
    } finally {
      setSavingGroups(false);
    }
  };

  const handleCheckIn = async (ticketId, currentStatus) => {
    try {
      const ticketRef = doc(db, 'tickets', ticketId);
      await updateDoc(ticketRef, { checkedIn: !currentStatus });

      setTickets(prev => prev.map(ticket => 
        ticket.id === ticketId 
          ? { ...ticket, checkedIn: !currentStatus }
          : ticket
      ));

      setStats(prev => ({
        ...prev,
        totalCheckedIn: currentStatus 
          ? prev.totalCheckedIn - 1 
          : prev.totalCheckedIn + 1
      }));

      toast.success(currentStatus ? 'Checked out' : '✅ Checked in!');
    } catch (err) {
      console.error('Error updating check-in:', err);
      toast.error('Failed to update check-in status');
    }
  };

  // ✅ NEW — free registration flag, drives several display tweaks below
  const isFreeRegistration = event?.ticketingOption === 'free_registration';

  // ✅ NEW — shared row-building logic, used by both exportToCSV and
  // exportToExcel so the two formats never drift out of sync with each other
  const getExportData = () => {
    const customQuestions = event?.customQuestions || [];

    const headers = isFreeRegistration
      ? ['Ticket ID', 'Buyer Name', 'Email', 'Phone', 'Group Size', 'Guest Names', ...customQuestions.map(q => q.label), 'Registered On', 'Checked In']
      : ['Ticket ID', 'Buyer Name', 'Email', 'Tier', 'Quantity', 'Ticket Price', 'Service Fee', 'Total Paid', 'Purchase Date', 'Checked In'];

    const rows = filteredTickets.map(ticket => {
      if (isFreeRegistration) {
        return [
          ticket.ticketId,
          ticket.buyerName,
          ticket.buyerEmail,
          ticket.buyerPhone || 'N/A',
          ticket.groupSize || ticket.quantity || 1,
          (ticket.guests || []).map(g => g.name).join('; ') || 'N/A',
          ...customQuestions.map(q => ticket.customAnswers?.[q.id] || ''),
          ticket.purchasedAt?.seconds
            ? new Date(ticket.purchasedAt.seconds * 1000).toLocaleDateString()
            : 'N/A',
          ticket.checkedIn ? 'Yes' : 'No'
        ];
      }
      return [
        ticket.ticketId,
        ticket.buyerName,
        ticket.buyerEmail,
        ticket.tierName || 'Standard',
        ticket.quantity || 1,
        `₦${((ticket.ticketPrice || 0) * (ticket.quantity || 1))?.toLocaleString()}`,
        `₦${((ticket.serviceFee || 0) * (ticket.quantity || 1))?.toLocaleString()}`,
        `₦${ticket.totalPaid?.toLocaleString()}`,
        ticket.purchasedAt?.seconds
          ? new Date(ticket.purchasedAt.seconds * 1000).toLocaleDateString()
          : 'N/A',
        ticket.checkedIn ? 'Yes' : 'No'
      ];
    });

    return { headers, rows };
  };

  const exportToCSV = () => {
    const { headers, rows } = getExportData();

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${event.title}-attendees-${Date.now()}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast.success('✅ Attendee list exported (CSV)!');
  };

  // ✅ NEW — Excel export via SheetJS, reusing the same headers/rows as CSV
  // so both formats always show identical data
  const exportToExcel = () => {
    const { headers, rows } = getExportData();

    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);

    // ✅ auto-size columns roughly by content length, so the sheet doesn't
    // open with everything crammed into default-width columns
    const colWidths = headers.map((header, colIndex) => {
      const maxLen = Math.max(
        header.length,
        ...rows.map(row => String(row[colIndex] ?? '').length)
      );
      return { wch: Math.min(Math.max(maxLen + 2, 10), 40) };
    });
    worksheet['!cols'] = colWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendees');

    XLSX.writeFile(workbook, `${event.title}-attendees-${Date.now()}.xlsx`);

    toast.success('✅ Attendee list exported (Excel)!');
  };

  // ✅ Get unique tier names from tickets for filter dropdown
  const uniqueTiers = [...new Set(tickets.map(t => t.tierName).filter(Boolean))];
  const hasTierData = uniqueTiers.length > 0 && !isFreeRegistration;

  // ✅ Filter tickets — includes tier filter
  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = 
      ticket.buyerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.buyerEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.ticketId?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFilter = 
      filterStatus === 'all' ||
      (filterStatus === 'checked-in' && ticket.checkedIn) ||
      (filterStatus === 'not-checked-in' && !ticket.checkedIn);

    const matchesTier =
      filterTier === 'all' ||
      (ticket.tierName || 'Standard') === filterTier;

    return matchesSearch && matchesFilter && matchesTier;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <PublicNavbar />
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-gray-50">
        <PublicNavbar />
        <div className="max-w-4xl mx-auto px-4 py-20 text-center">
          <AlertCircle size={64} className="mx-auto text-red-500 mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Invalid Management Link</h1>
          <p className="text-gray-600 mb-6">This link is invalid or has expired.</p>
          <button onClick={() => navigate('/')} className="px-6 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600">
            Go Home
          </button>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <PublicNavbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Event Header */}
        <div className="bg-white rounded-xl p-6 shadow-sm mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-2">
                <h1 className="text-3xl font-bold text-gray-900">{event.title}</h1>
                {/* ✅ NEW — private event badge */}
                {event.visibility === 'private' && (
                  <span className="inline-flex items-center gap-1 bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-sm font-semibold">
                    🔒 {event.privacyMode === 'invite_only' ? 'Invite-only' : event.privacyMode === 'code_gated' ? 'Code-gated' : 'Unlisted'}
                  </span>
                )}
                {isFreeRegistration && (
                  <span className="inline-flex items-center gap-1 bg-cyan-100 text-cyan-700 px-3 py-1 rounded-full text-sm font-semibold">
                    <UserPlus size={14} />Free Registration
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <Calendar size={16} />
                  <span>{formatEventDateFull(event)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock size={16} />
                  <span>{formatEventTime(event)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin size={16} />
                  <span>{event.location}</span>
                </div>
              </div>
            </div>
            {/* ✅ NEW — Excel export added alongside CSV */}
            <div className="flex gap-2">
              <button
                onClick={exportToCSV}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
              >
                <FileText size={18} />
                CSV
              </button>
              <button
                onClick={exportToExcel}
                className="flex items-center gap-2 px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition"
              >
                <FileSpreadsheet size={18} />
                Excel
              </button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <Ticket className="text-cyan-500" size={24} />
              {/* ✅ Label reads "Registered" instead of "Sold" for free-registration events */}
              <p className="text-sm text-gray-600">{isFreeRegistration ? 'Total Registered' : 'Total Sold'}</p>
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats.totalSold}</p>
            <p className="text-xs text-gray-500 mt-1">
              out of {event.ticketsAvailable} available
            </p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <CheckCircle className="text-green-500" size={24} />
              <p className="text-sm text-gray-600">Checked In</p>
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats.totalCheckedIn}</p>
            <p className="text-xs text-gray-500 mt-1">
              {stats.totalSold > 0 ? Math.round((stats.totalCheckedIn / stats.totalSold) * 100) : 0}% attendance
            </p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <Users className="text-purple-500" size={24} />
              <p className="text-sm text-gray-600">Attendees</p>
            </div>
            <p className="text-3xl font-bold text-gray-900">{tickets.length}</p>
            <p className="text-xs text-gray-500 mt-1">unique {isFreeRegistration ? 'registrations' : 'buyers'}</p>
          </div>

          {/* ✅ NEW — for free registration events, show "Spots Remaining"
              instead of "Your Revenue" since there's no money involved */}
          {isFreeRegistration ? (
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <UserPlus className="text-cyan-500" size={24} />
                <p className="text-sm text-gray-600">Spots Remaining</p>
              </div>
              <p className="text-3xl font-bold text-gray-900">
                {Math.max(0, (event.ticketsAvailable || 0) - stats.totalSold)}
              </p>
              <p className="text-xs text-gray-500 mt-1">out of {event.ticketsAvailable}</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">💰</span>
                <p className="text-sm text-gray-600">Your Revenue</p>
              </div>
              <p className="text-3xl font-bold text-gray-900">₦{stats.totalRevenue.toLocaleString()}</p>
              <p className="text-xs text-gray-500 mt-1">ticket sales only</p>
            </div>
          )}
        </div>

        {/* ✅ NEW — Invite Guests panel, only for invite-only private events.
            Lets the organizer add more guests any time after launch, not
            just the original list from submission — reuses the exact same
            endpoint (and therefore the exact same ticket/email behavior)
            as the automatic invite issued on approval. */}
        {event.visibility === 'private' && event.privacyMode === 'invite_only' && (
          <div className="bg-white rounded-xl p-6 shadow-sm mb-6 border-2 border-purple-100">
            <div className="flex items-center gap-2 mb-1">
              <UserPlus size={20} className="text-purple-600" />
              <h2 className="text-lg font-bold text-gray-900">Invite More Guests</h2>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              Each guest gets a comped ticket and QR code by email instantly — no payment, no registration form.
            </p>
            <textarea
              value={inviteEmailsText}
              onChange={(e) => setInviteEmailsText(e.target.value)}
              rows={4}
              placeholder={'guest1@gmail.com\nguest2@gmail.com\nguest3@gmail.com'}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-purple-400 transition resize-none"
            />
            <div className="flex items-center justify-between mt-3">
              <p className="text-xs text-gray-400">One per line or comma-separated. Already-invited guests are skipped automatically.</p>
              <button
                onClick={handleSendInvites}
                disabled={sendingInvites || !inviteEmailsText.trim()}
                className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 text-white rounded-xl text-sm font-bold hover:bg-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
              >
                {sendingInvites ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    Sending...
                  </>
                ) : (
                  <>💌 Send Invites</>
                )}
              </button>
            </div>

            {inviteResult && (
              <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
                {inviteResult.issued.length > 0 && (
                  <div className="flex items-start gap-2">
                    <span className="text-green-500 mt-0.5">✅</span>
                    <p className="text-sm text-gray-700">
                      Sent to: {inviteResult.issued.map(i => i.email).join(', ')}
                    </p>
                  </div>
                )}
                {inviteResult.skipped.length > 0 && (
                  <div className="flex items-start gap-2">
                    <span className="text-amber-500 mt-0.5">⚠️</span>
                    <p className="text-sm text-gray-500">
                      Skipped (already invited): {inviteResult.skipped.map(s => s.email).join(', ')}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ✅ NEW — Group Codes editor, only for code-gated private events.
            Lets the organizer raise an existing group's guest limit and
            add entirely new groups any time after launch. */}
        {event.visibility === 'private' && event.privacyMode === 'code_gated' && (
          <div className="bg-white rounded-xl p-6 shadow-sm mb-6 border-2 border-purple-100">
            <div className="flex items-center gap-2 mb-1">
              <Lock size={20} className="text-purple-600" />
              <h2 className="text-lg font-bold text-gray-900">Group Codes</h2>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              Each group has its own code and guest limit. Raise a limit or add a new group any time.
            </p>

            <div className="space-y-3 mb-5">
              {(event.groupCodes || []).map((group) => {
                const remaining = (group.maxGuests || 0) - (group.usedGuests || 0);
                const isEditing = editingMax[group.id] !== undefined;
                return (
                  <div key={group.id} className="border border-gray-200 rounded-xl p-4">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div>
                        <p className="font-bold text-gray-900 text-sm">{group.groupName}</p>
                        <p className="text-xs text-gray-400 font-mono mt-0.5">{group.code}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-sm font-bold text-gray-800">{group.usedGuests || 0} / {group.maxGuests || 0}</p>
                          <p className="text-xs text-gray-400">{remaining} left</p>
                        </div>
                        {isEditing ? (
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              min={group.usedGuests || 0}
                              value={editingMax[group.id]}
                              onChange={(e) => setEditingMax(prev => ({ ...prev, [group.id]: e.target.value }))}
                              className="w-16 px-2 py-1.5 border-2 border-purple-200 rounded-lg text-sm text-center focus:outline-none focus:border-purple-400"
                            />
                            <button
                              onClick={() => handleUpdateGroupMax(group.id)}
                              disabled={savingGroups}
                              className="px-3 py-1.5 bg-purple-600 text-white rounded-lg text-xs font-bold hover:bg-purple-700 transition disabled:opacity-50"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingMax(prev => { const n = { ...prev }; delete n[group.id]; return n; })}
                              className="px-2 py-1.5 text-gray-400 hover:text-gray-600 text-xs"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setEditingMax(prev => ({ ...prev, [group.id]: group.maxGuests || 0 }))}
                            className="px-3 py-1.5 border-2 border-purple-200 text-purple-600 rounded-lg text-xs font-bold hover:bg-purple-50 transition"
                          >
                            Raise limit
                          </button>
                        )}
                      </div>
                    </div>
                    {/* progress bar */}
                    <div className="mt-3 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-purple-500 transition-all"
                        style={{ width: `${group.maxGuests ? Math.min(100, ((group.usedGuests || 0) / group.maxGuests) * 100) : 0}%` }}
                      />
                    </div>
                  </div>
                );
              })}
              {(!event.groupCodes || event.groupCodes.length === 0) && (
                <p className="text-sm text-gray-400 text-center py-4">No groups yet — add one below.</p>
              )}
            </div>

            <div className="border-t border-gray-100 pt-4">
              <p className="text-xs font-bold text-gray-600 mb-2">Add a new group</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="e.g. Marketing Team"
                  className="flex-1 px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-purple-400 transition"
                />
                <div className="flex items-center gap-1.5 border-2 border-gray-200 rounded-xl px-2">
                  <button type="button" onClick={() => setNewGroupMax(Math.max(1, newGroupMax - 1))}
                    className="w-7 h-7 text-gray-500 font-bold hover:text-purple-600 transition">−</button>
                  <span className="w-6 text-center text-sm font-black text-gray-800">{newGroupMax}</span>
                  <button type="button" onClick={() => setNewGroupMax(Math.min(100, newGroupMax + 1))}
                    className="w-7 h-7 text-gray-500 font-bold hover:text-purple-600 transition">+</button>
                </div>
                <button
                  onClick={handleAddGroup}
                  disabled={savingGroups || !newGroupName.trim()}
                  className="flex items-center gap-1.5 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl text-sm font-bold hover:from-purple-700 hover:to-pink-700 transition disabled:opacity-50 flex-shrink-0"
                >
                  <Plus size={16} /> Add
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ✅ Tier Breakdown — shown when event has tiers (never for free registration) */}
        {hasTierData && stats.tierBreakdown.length > 0 && (
          <div className="bg-white rounded-xl p-6 shadow-sm mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Layers size={20} className="text-cyan-600" />
              <h2 className="text-lg font-bold text-gray-900">Ticket Tiers Breakdown</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {stats.tierBreakdown.map((tier, i) => (
                <div key={i} className="border-2 border-gray-100 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-bold text-gray-800">{tier.name}</span>
                    <span className="text-xs bg-cyan-100 text-cyan-700 px-2 py-0.5 rounded-full font-semibold">
                      {tier.sold} sold
                    </span>
                  </div>
                  <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between text-gray-600">
                      <span>Checked in:</span>
                      <span className="font-semibold text-green-600">
                        {tier.checkedIn} / {tier.sold}
                      </span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>Revenue:</span>
                      <span className="font-bold text-cyan-600">₦{tier.revenue.toLocaleString()}</span>
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div className="mt-3 bg-gray-100 rounded-full h-1.5">
                    <div
                      className="bg-green-500 h-1.5 rounded-full transition-all"
                      style={{ width: `${tier.sold > 0 ? (tier.checkedIn / tier.sold) * 100 : 0}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    {tier.sold > 0 ? Math.round((tier.checkedIn / tier.sold) * 100) : 0}% checked in
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ✅ Vendor Stands — organizer's stand builder + application review */}
        <div className="mb-6">
          <VendorStandsManager event={event} onEventUpdate={setEvent} />
        </div>

        {/* Search and Filter */}
        <div className="bg-white rounded-xl p-6 shadow-sm mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search by name, email, or ticket ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-transparent"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter size={20} className="text-gray-400" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="checked-in">Checked In</option>
                <option value="not-checked-in">Not Checked In</option>
              </select>
            </div>
            {/* ✅ Tier filter — only shown when tickets have tier data */}
            {hasTierData && (
              <div className="flex items-center gap-2">
                <Layers size={18} className="text-gray-400" />
                <select
                  value={filterTier}
                  onChange={(e) => setFilterTier(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-transparent"
                >
                  <option value="all">All Tiers</option>
                  {uniqueTiers.map(tier => (
                    <option key={tier} value={tier}>{tier}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Tickets Table */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ticket ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Buyer Info</th>
                  {/* ✅ NEW — one column per custom question, so every
                      attendee's answers are visible directly in the table
                      without needing to click anything */}
                  {isFreeRegistration && (event.customQuestions || []).map(q => (
                    <th key={q.id} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider max-w-[160px]">
                      {q.label}
                    </th>
                  ))}
                  {/* ✅ Tier column — shown when tickets have tier data */}
                  {hasTierData && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tier</th>
                  )}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {isFreeRegistration ? 'Group Size' : 'Quantity'}
                  </th>
                  {/* ✅ "Total Paid" column hidden entirely for free registration — always ₦0, pure noise */}
                  {!isFreeRegistration && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Paid</th>
                  )}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {isFreeRegistration ? 'Registered On' : 'Purchase Date'}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredTickets.length === 0 ? (
                  <tr>
                    <td colSpan={
                      2 // Ticket ID + Buyer Info
                      + (isFreeRegistration ? (event.customQuestions || []).length : 0)
                      + (hasTierData ? 1 : 0)
                      + 1 // Quantity/Group Size
                      + (!isFreeRegistration ? 1 : 0) // Total Paid
                      + 2 // Date + Status
                      + 1 // Action
                    } className="px-6 py-12 text-center text-gray-500">
                      {searchTerm || filterStatus !== 'all' || filterTier !== 'all'
                        ? 'No tickets match your search'
                        : (isFreeRegistration ? 'No registrations yet' : 'No tickets sold yet')}
                    </td>
                  </tr>
                ) : (
                  filteredTickets.map((ticket) => {
                    return (
                    <tr key={ticket.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-mono font-semibold text-cyan-600">
                          {ticket.ticketId}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{ticket.buyerName}</p>
                          <p className="text-xs text-gray-500">{ticket.buyerEmail}</p>
                          {ticket.buyerPhone && (
                            <p className="text-xs text-gray-400">{ticket.buyerPhone}</p>
                          )}
                          {/* ✅ NEW — show guest names inline for free registration group registrations */}
                          {isFreeRegistration && ticket.guests?.length > 0 && (
                            <p className="text-xs text-cyan-600 mt-0.5">
                              + {ticket.guests.map(g => g.name).join(', ')}
                            </p>
                          )}
                        </div>
                      </td>
                      {/* ✅ NEW — one answer cell per custom question, always
                          visible for every attendee (no toggle needed) */}
                      {isFreeRegistration && (event.customQuestions || []).map(q => (
                        <td key={q.id} className="px-6 py-4 max-w-[160px]">
                          <span className="text-sm text-gray-700">
                            {ticket.customAnswers?.[q.id] || <span className="text-gray-300 italic">—</span>}
                          </span>
                        </td>
                      ))}
                      {/* ✅ Tier cell */}
                      {hasTierData && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          {ticket.tierName ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-cyan-100 text-cyan-700">
                              <Layers size={10} />
                              {ticket.tierName}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">Standard</span>
                          )}
                        </td>
                      )}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-semibold text-gray-900">
                          {ticket.groupSize || ticket.quantity || 1}
                        </span>
                      </td>
                      {!isFreeRegistration && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-semibold text-gray-900">
                            ₦{((ticket.ticketPrice || 0) * (ticket.quantity || 1)).toLocaleString()}
                          </span>
                        </td>
                      )}
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {ticket.purchasedAt?.seconds 
                          ? new Date(ticket.purchasedAt.seconds * 1000).toLocaleDateString()
                          : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {ticket.checkedIn ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                            <CheckCircle size={14} />
                            Checked In
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800">
                            <XCircle size={14} />
                            Not Checked In
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => handleCheckIn(ticket.id, ticket.checkedIn)}
                          className={`px-4 py-2 rounded-lg font-medium text-sm transition ${
                            ticket.checkedIn
                              ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                              : 'bg-cyan-500 text-white hover:bg-cyan-600'
                          }`}
                        >
                          {/* ✅ Button reflects group size for free-registration group registrations */}
                          {ticket.checkedIn
                            ? 'Undo'
                            : (isFreeRegistration && (ticket.groupSize || 1) > 1
                                ? `Check In (${ticket.groupSize})`
                                : 'Check In')}
                        </button>
                      </td>
                    </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer tip */}
        <div className="mt-6 bg-blue-50 rounded-xl p-4 border border-blue-200">
          <p className="text-sm text-blue-800">
            💡 <strong>Tip:</strong> Use the search bar to quickly find attendees at the door.
            {hasTierData && ' Filter by tier to see specific ticket types.'}
            {isFreeRegistration && ' A "Check In (N)" button means the registration covers a group — confirm everyone listed has arrived before checking in.'}
            {' '}Click "Check In" to mark their arrival. Export the full list as CSV or Excel anytime!
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}