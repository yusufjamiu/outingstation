// src/pages/admin/EventSubmissionsPage.jsx
import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc, deleteDoc, addDoc, query, where, increment, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { AdminSidebar } from '../../components/AdminSidebar';
import {
  Eye, Check, X, Calendar, MapPin, DollarSign,
  Mail, Phone, ExternalLink, Clock, Filter,
  GraduationCap, Menu, RefreshCw, AlertTriangle,
  Gift, ChevronLeft, ChevronRight, Image, Ticket, Settings
} from 'lucide-react';

const generateSlug = (title) => {
  return (title || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
    .substring(0, 80);
};

export default function EventSubmissionsPage() {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [approving, setApproving] = useState(false);
  const [imageIndex, setImageIndex] = useState(0);

  // ✅ Ticketing setup modal state
  const [showTicketingModal, setShowTicketingModal] = useState(false);
  const [ticketingSubmission, setTicketingSubmission] = useState(null);
  const [ticketSetup, setTicketSetup] = useState({ price: '', available: 100, serviceFeeType: 'fixed', serviceFeeAmount: 100 });

  useEffect(() => { fetchSubmissions(); }, []);

  const fetchSubmissions = async () => {
    setLoading(true);
    setError(null);
    try {
      const snapshot = await getDocs(collection(db, 'event_submissions'));
      const data = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => (b.submittedAt?.seconds || 0) - (a.submittedAt?.seconds || 0));
      setSubmissions(data);
    } catch (err) {
      setError(err.code === 'permission-denied'
        ? 'Permission denied. Make sure you are logged in as admin.'
        : `Failed to load submissions: ${err.message}`);
      setSubmissions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchSubmissions();
    setTimeout(() => setRefreshing(false), 500);
  };

  // ✅ Award ₦100 referral credit
  const awardReferralCredit = async (referralCode) => {
    if (!referralCode) return null;
    try {
      const q = query(collection(db, 'users'), where('referralCode', '==', referralCode.toUpperCase()));
      const snap = await getDocs(q);
      if (snap.empty) return null;
      const userDoc = snap.docs[0];
      const userName = userDoc.data().name || 'User';
      const newCredit = {
        id: `credit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        amount: 100, originalAmount: 100,
        reason: 'Listing reward',
        earnedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'active', usedAmount: 0
      };
      await updateDoc(doc(db, 'users', userDoc.id), {
        creditsHistory: [...(userDoc.data().creditsHistory || []), newCredit],
        totalCredits: increment(100),
        eventsListed: increment(1),
        updatedAt: new Date()
      });
      return userName;
    } catch (err) {
      console.error('Error awarding credit:', err);
      return null;
    }
  };

  // ✅ Build the event doc from submission
  const buildEventDoc = (submission, ticketingOverride = null) => {
    const isPlace = submission.listingType === 'place';
    const wantsTicketing = submission.wantOutingstationTicketing === 'yes' || submission.wantOutingstationTicketing === true;

    const eventDoc = {
      title: submission.eventTitle || '',
      description: submission.eventDescription || '',
      category: submission.eventCategory || '',
      eventType: submission.isUniversityEvent ? 'campus'
        : (submission.eventType === 'webinar' ? 'webinar' : 'regular'),
      subCategory: submission.subCategory || (isPlace ? 'places' : 'events'),

      // ✅ Images — first = main, rest = additional
      imageUrl: submission.imageUrl || '',
      images: submission.images || [],

      location: submission.city || '',
      address: `${submission.venueName || ''}, ${submission.address || ''}`.replace(/^,\s*/, ''),
      mapLocation: submission.mapsLink || null,
      city: submission.city || '',
      venueName: submission.venueName || '',

      isFree: submission.isFree === true || submission.isFree === 'yes',
      price: submission.ticketPrice ? parseFloat(submission.ticketPrice) : 0,

      organizerName: submission.organizerName || '',
      organizerEmail: submission.organizerEmail || '',
      organizerPhone: submission.organizerPhone || '',
      organizationName: submission.organizationName || null,

      university: submission.universityName || null,
      isUniversityEvent: submission.isUniversityEvent || false,

      platform: submission.platform || null,
      platformLink: submission.webinarLink || null,

      operatingHours: submission.operatingHours || null,
      alwaysOpen: submission.alwaysOpen || false,

      additionalInfo: submission.additionalInfo || null,

      status: 'published',
      isFeatured: false,
      isTrending: false,
      savedCount: 0,
      slug: generateSlug(submission.eventTitle || ''),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdBy: 'admin_approved',
      submissionId: submission.id,

      // ✅ Ticketing defaults — none unless set up
      ticketingEnabled: false,
      ticketingOption: 'none',
      hasOutingStationTicketing: false,
      ticketPrice: 0,
      ticketsAvailable: 0,
      ticketsSold: 0,
      externalTicketLink: submission.externalTicketLink || null,
    };

    // ✅ If ticketing was configured by admin
    if (ticketingOverride) {
      eventDoc.ticketingEnabled = true;
      eventDoc.ticketingOption = 'outingstation';
      eventDoc.hasOutingStationTicketing = true;
      eventDoc.ticketPrice = parseFloat(ticketingOverride.price) || 0;
      eventDoc.ticketsAvailable = parseInt(ticketingOverride.available) || 100;
      eventDoc.serviceFeeType = ticketingOverride.serviceFeeType || 'fixed';
      eventDoc.serviceFeeAmount = parseFloat(ticketingOverride.serviceFeeAmount) || 100;
      eventDoc.serviceFee = ticketingOverride.serviceFeeType === 'fixed'
        ? parseFloat(ticketingOverride.serviceFeeAmount) || 100
        : Math.round(eventDoc.ticketPrice * (parseFloat(ticketingOverride.serviceFeeAmount) / 100));
    }

    // Handle dates
    if (!isPlace) {
      if (submission.startDate) {
        try { eventDoc.date = Timestamp.fromDate(new Date(submission.startDate)); } catch {}
        try { eventDoc.startDate = Timestamp.fromDate(new Date(submission.startDate)); } catch {}
      }
      if (submission.endDate) {
        try { eventDoc.endDate = Timestamp.fromDate(new Date(submission.endDate)); } catch {}
      }
      eventDoc.time = submission.startTime || '';
      eventDoc.eventDuration = submission.endDate && submission.endDate !== submission.startDate ? 'multi' : 'single';
    }

    return eventDoc;
  };

  // ✅ Direct approve — for free events or external ticketing
  const handleApprove = async (submissionId) => {
    const submission = submissions.find(s => s.id === submissionId);
    if (!submission) return;

    const isPlace = submission.listingType === 'place';
    const wantsOSTicketing = submission.wantOutingstationTicketing === 'yes' || submission.wantOutingstationTicketing === true;
    const label = isPlace ? 'place' : 'event';

    // ✅ If they want OutingStation ticketing — open setup modal instead
    if (wantsOSTicketing) {
      setTicketingSubmission(submission);
      setTicketSetup({
        price: submission.ticketPrice || '',
        available: 100,
        serviceFeeType: 'fixed',
        serviceFeeAmount: 100,
      });
      setShowTicketingModal(true);
      return;
    }

    if (!confirm(`Approve and publish this ${label} immediately to the live app?`)) return;

    setApproving(true);
    try {
      const eventDoc = buildEventDoc(submission);
      const docRef = await addDoc(collection(db, 'events'), eventDoc);

      await updateDoc(doc(db, 'event_submissions', submissionId), {
        status: 'approved',
        approvedEventId: docRef.id,
        reviewedAt: new Date(),
      });

      let creditMsg = '';
      if (submission.referralCode) {
        const awardedTo = await awardReferralCredit(submission.referralCode);
        creditMsg = awardedTo
          ? `\n✅ Awarded ₦100 credit to ${awardedTo}`
          : `\n⚠️ Referral code "${submission.referralCode}" not found`;
      }

      alert(`✅ ${label.charAt(0).toUpperCase() + label.slice(1)} is now LIVE!\n\nEvent ID: ${docRef.id}${creditMsg}`);
      fetchSubmissions();
      setSelectedSubmission(null);
    } catch (err) {
      console.error('Error approving:', err);
      alert('❌ Failed to approve: ' + err.message);
    } finally {
      setApproving(false);
    }
  };

  // ✅ Approve WITH ticketing setup
  const handleApproveWithTicketing = async () => {
    if (!ticketingSubmission) return;
    if (!ticketSetup.price || parseFloat(ticketSetup.price) <= 0) {
      alert('Please enter a valid ticket price');
      return;
    }

    setApproving(true);
    try {
      const eventDoc = buildEventDoc(ticketingSubmission, ticketSetup);
      const docRef = await addDoc(collection(db, 'events'), eventDoc);

      await updateDoc(doc(db, 'event_submissions', ticketingSubmission.id), {
        status: 'approved',
        approvedEventId: docRef.id,
        reviewedAt: new Date(),
      });

      let creditMsg = '';
      if (ticketingSubmission.referralCode) {
        const awardedTo = await awardReferralCredit(ticketingSubmission.referralCode);
        creditMsg = awardedTo ? `\n✅ Awarded ₦100 credit to ${awardedTo}` : '';
      }

      alert(`✅ Event is now LIVE with ticketing enabled!\n\nTicket Price: ₦${parseFloat(ticketSetup.price).toLocaleString()}\nAvailable: ${ticketSetup.available} tickets\nEvent ID: ${docRef.id}${creditMsg}`);

      setShowTicketingModal(false);
      setTicketingSubmission(null);
      fetchSubmissions();
      setSelectedSubmission(null);
    } catch (err) {
      console.error('Error approving with ticketing:', err);
      alert('❌ Failed to approve: ' + err.message);
    } finally {
      setApproving(false);
    }
  };

  // ✅ Flag for ticketing contact — approve without ticketing for now
  const handleApproveWithoutTicketing = async () => {
    if (!ticketingSubmission) return;
    if (!confirm('Publish without ticketing for now? You can enable ticketing later by editing the event.')) return;

    setApproving(true);
    try {
      const eventDoc = buildEventDoc(ticketingSubmission, null);
      const docRef = await addDoc(collection(db, 'events'), eventDoc);

      await updateDoc(doc(db, 'event_submissions', ticketingSubmission.id), {
        status: 'approved',
        approvedEventId: docRef.id,
        reviewedAt: new Date(),
        ticketingNote: 'Approved without ticketing — organizer requested OS ticketing',
      });

      alert(`✅ Event published (no ticketing yet)\n\nRemember to:\n• Contact ${ticketingSubmission.organizerEmail}\n• Set up ticketing in the Events editor\n\nEvent ID: ${docRef.id}`);

      setShowTicketingModal(false);
      setTicketingSubmission(null);
      fetchSubmissions();
      setSelectedSubmission(null);
    } catch (err) {
      alert('❌ Failed: ' + err.message);
    } finally {
      setApproving(false);
    }
  };

  const handleReject = async (submissionId) => {
    const reason = prompt('Enter rejection reason:');
    if (!reason) return;
    try {
      await updateDoc(doc(db, 'event_submissions', submissionId), {
        status: 'rejected', rejectionReason: reason, reviewedAt: new Date()
      });
      fetchSubmissions();
      setSelectedSubmission(null);
    } catch (err) {
      alert('Failed to reject: ' + err.message);
    }
  };

  const handleDelete = async (submissionId) => {
    if (!confirm('Permanently delete this submission?')) return;
    try {
      await deleteDoc(doc(db, 'event_submissions', submissionId));
      fetchSubmissions();
      setSelectedSubmission(null);
    } catch (err) {
      alert('Failed to delete: ' + err.message);
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch { return 'Invalid date'; }
  };

  const getStatusBadge = (status) => {
    const styles = { pending: 'bg-yellow-100 text-yellow-800', approved: 'bg-green-100 text-green-800', rejected: 'bg-red-100 text-red-800' };
    return <span className={`px-3 py-1 rounded-full text-xs font-semibold ${styles[status] || styles.pending}`}>{status?.toUpperCase() || 'PENDING'}</span>;
  };

  const getAllImages = (submission) => {
    const all = [];
    if (submission.imageUrl) all.push(submission.imageUrl);
    if (submission.images?.length) submission.images.forEach(img => { if (img && !all.includes(img)) all.push(img); });
    return all;
  };

  const filteredSubmissions = submissions.filter(sub => {
    if (statusFilter !== 'all' && (sub.status || 'pending') !== statusFilter) return false;
    if (typeFilter !== 'all' && sub.listingType !== typeFilter) return false;
    return true;
  });

  const wantsTicketing = (sub) => sub.wantOutingstationTicketing === 'yes' || sub.wantOutingstationTicketing === true;

  if (error) return (
    <div className="flex h-screen bg-gray-50">
      <AdminSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className="flex-1 overflow-auto">
        <div className="p-6 flex items-center justify-center min-h-[60vh]">
          <div className="text-center max-w-md">
            <AlertTriangle size={48} className="text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Failed to Load</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <button onClick={handleRefresh} className="px-6 py-3 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 font-medium">Try Again</button>
          </div>
        </div>
      </main>
    </div>
  );

  if (loading) return (
    <div className="flex h-screen bg-gray-50">
      <AdminSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto" />
          <p className="mt-4 text-gray-600">Loading submissions...</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-50">
      <AdminSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="flex-1 overflow-auto">
        <header className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 hover:bg-gray-100 rounded-lg"><Menu size={24} /></button>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Event Submissions</h1>
                <p className="text-sm text-gray-600 hidden sm:block">Review and approve/reject submissions from organizers</p>
              </div>
            </div>
            <button onClick={handleRefresh} disabled={refreshing || loading}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-cyan-600 hover:bg-cyan-50 rounded-lg font-medium transition disabled:opacity-50">
              <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
              <span className="hidden sm:inline">{refreshing ? 'Refreshing...' : 'Refresh'}</span>
            </button>
          </div>
        </header>

        <div className="p-4 sm:p-6">

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[
              { label: 'Total', value: submissions.length, style: 'bg-white border-gray-200 text-gray-900' },
              { label: 'Pending', value: submissions.filter(s => !s.status || s.status === 'pending').length, style: 'bg-yellow-50 border-yellow-200 text-yellow-800' },
              { label: 'Approved', value: submissions.filter(s => s.status === 'approved').length, style: 'bg-green-50 border-green-200 text-green-800' },
              { label: 'Needs Ticketing Setup', value: submissions.filter(s => !s.status || s.status === 'pending').filter(wantsTicketing).length, style: 'bg-blue-50 border-blue-200 text-blue-800' },
            ].map((stat, i) => (
              <div key={i} className={`rounded-xl p-4 sm:p-6 shadow-sm border ${stat.style}`}>
                <div className="text-xl sm:text-2xl font-bold">{stat.value}</div>
                <div className="text-xs sm:text-sm opacity-80">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200 mb-6 flex flex-col sm:flex-row sm:items-center gap-4">
            <Filter size={20} className="text-gray-600 hidden sm:block" />
            <div className="flex flex-col sm:flex-row gap-4 flex-1">
              <div>
                <label className="text-sm font-medium text-gray-700 mr-2">Status:</label>
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
                  <option value="all">All</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mr-2">Type:</label>
                <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
                  <option value="all">All</option>
                  <option value="event">Events</option>
                  <option value="place">Places</option>
                </select>
              </div>
            </div>
            <span className="text-sm text-gray-600">{filteredSubmissions.length} results</span>
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {['Submission', 'Organizer', 'Type', 'Ticketing', 'Status', 'Actions'].map(h => (
                      <th key={h} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredSubmissions.length === 0 ? (
                    <tr><td colSpan="6" className="px-6 py-12 text-center text-gray-500">No submissions found</td></tr>
                  ) : filteredSubmissions.map((sub) => {
                    const allImages = getAllImages(sub);
                    return (
                      <tr key={sub.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="flex items-start gap-3">
                            {allImages[0] && (
                              <div className="relative flex-shrink-0">
                                <img src={allImages[0]} alt={sub.eventTitle}
                                  className="w-16 h-16 object-cover rounded-lg"
                                  onError={(e) => e.target.style.display = 'none'} />
                                {allImages.length > 1 && (
                                  <div className="absolute -bottom-1 -right-1 bg-gray-800 text-white text-xs px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                                    <Image size={9} />{allImages.length}
                                  </div>
                                )}
                              </div>
                            )}
                            <div>
                              <div className="font-semibold text-gray-900">{sub.eventTitle}</div>
                              <div className="text-sm text-gray-600">{sub.eventCategory}</div>
                              <div className="text-sm text-gray-500 flex items-center gap-1 mt-1"><MapPin size={14} />{sub.city}</div>
                              {sub.referralCode && (
                                <div className="text-xs text-purple-600 font-semibold mt-1 flex items-center gap-1 bg-purple-50 px-2 py-0.5 rounded">
                                  <Gift size={12} />{sub.referralCode}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm">
                            <div className="font-medium text-gray-900">{sub.organizerName}</div>
                            <div className="text-gray-600 text-xs">{sub.organizationName || 'Individual'}</div>
                            <div className="text-gray-500 flex items-center gap-1 mt-1 text-xs"><Mail size={11} /><span className="truncate max-w-[180px]">{sub.organizerEmail}</span></div>
                            <div className="text-gray-500 flex items-center gap-1 text-xs"><Phone size={11} />{sub.organizerPhone}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${sub.listingType === 'event' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}`}>
                            {sub.listingType === 'event' ? '🎉 Event' : '🏛️ Place'}
                          </span>
                          {sub.isUniversityEvent && <div className="text-xs text-blue-600 font-semibold mt-1">🎓 Campus</div>}
                        </td>
                        {/* ✅ Ticketing column */}
                        <td className="px-6 py-4">
                          {wantsTicketing(sub) ? (
                            <div className="flex flex-col gap-1">
                              <span className="inline-flex items-center gap-1 text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full font-semibold">
                                <Ticket size={11} />Wants OS Ticketing
                              </span>
                              <span className="text-xs text-gray-500">₦{parseFloat(sub.ticketPrice || 0).toLocaleString()}</span>
                            </div>
                          ) : sub.externalTicketLink ? (
                            <span className="text-xs text-gray-500">External link</span>
                          ) : sub.isFree === true || sub.isFree === 'yes' ? (
                            <span className="text-xs text-green-600 font-medium">Free</span>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {getStatusBadge(sub.status)}
                          <div className="text-xs text-gray-500 mt-1">{formatDate(sub.submittedAt)}</div>
                          {sub.approvedEventId && <div className="text-xs text-green-600 mt-1 font-medium">✓ Live</div>}
                        </td>
                        <td className="px-6 py-4">
                          <button onClick={() => { setSelectedSubmission(sub); setImageIndex(0); }}
                            className="flex items-center gap-1 text-cyan-600 hover:text-cyan-700 font-medium text-sm">
                            <Eye size={16} />View
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>

      {/* ✅ Detail Modal */}
      {selectedSubmission && (() => {
        const allImages = getAllImages(selectedSubmission);
        const needsTicketing = wantsTicketing(selectedSubmission);
        return (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-start justify-between z-10">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-2xl font-bold text-gray-900">{selectedSubmission.eventTitle}</h2>
                    {getStatusBadge(selectedSubmission.status)}
                    {needsTicketing && (
                      <span className="inline-flex items-center gap-1 bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-sm font-semibold">
                        <Ticket size={14} />Needs Ticketing Setup
                      </span>
                    )}
                  </div>
                  <p className="text-gray-600">{selectedSubmission.eventCategory}</p>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    {selectedSubmission.referralCode && (
                      <span className="inline-flex items-center gap-1 bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-semibold">
                        <Gift size={14} />Referral: {selectedSubmission.referralCode}
                      </span>
                    )}
                    {selectedSubmission.approvedEventId && (
                      <span className="inline-flex items-center gap-1 bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-semibold">
                        ✓ Live — ID: {selectedSubmission.approvedEventId}
                      </span>
                    )}
                  </div>
                </div>
                <button onClick={() => setSelectedSubmission(null)} className="p-2 hover:bg-gray-100 rounded-lg flex-shrink-0"><X size={24} /></button>
              </div>

              <div className="p-6 space-y-6">

                {/* ✅ Ticketing warning banner */}
                {needsTicketing && selectedSubmission.status !== 'approved' && (
                  <div className="bg-orange-50 border-2 border-orange-200 rounded-xl p-4 flex items-start gap-3">
                    <Ticket size={22} className="text-orange-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-orange-800 text-sm">This organizer wants OutingStation Ticketing</p>
                      <p className="text-orange-700 text-sm mt-1">
                        Contact them first: <strong>{selectedSubmission.organizerEmail}</strong> · {selectedSubmission.organizerPhone}
                      </p>
                      <p className="text-orange-600 text-xs mt-1">
                        Requested price: ₦{parseFloat(selectedSubmission.ticketPrice || 0).toLocaleString()} · Once agreed, click "Approve & Set Up Ticketing" below to configure and publish.
                      </p>
                    </div>
                  </div>
                )}

                {/* Image carousel */}
                {allImages.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-semibold text-gray-700">Photos ({allImages.length})</h3>
                      <span className="text-xs text-gray-400">{imageIndex + 1} / {allImages.length}</span>
                    </div>
                    <div className="relative rounded-xl overflow-hidden bg-gray-100">
                      <img src={allImages[imageIndex]} alt={`Photo ${imageIndex + 1}`}
                        className="w-full max-h-72 object-cover"
                        onError={(e) => { e.target.src = 'https://via.placeholder.com/800x400'; }} />
                      {imageIndex === 0 && (
                        <div className="absolute top-3 left-3 bg-cyan-500 text-white text-xs px-2 py-1 rounded-lg font-semibold">Main Photo</div>
                      )}
                      {allImages.length > 1 && (
                        <>
                          <button onClick={() => setImageIndex(i => (i - 1 + allImages.length) % allImages.length)}
                            className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full">
                            <ChevronLeft size={18} />
                          </button>
                          <button onClick={() => setImageIndex(i => (i + 1) % allImages.length)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full">
                            <ChevronRight size={18} />
                          </button>
                        </>
                      )}
                    </div>
                    {allImages.length > 1 && (
                      <div className="flex gap-2 mt-2 overflow-x-auto pb-1">
                        {allImages.map((img, i) => (
                          <button key={i} onClick={() => setImageIndex(i)}
                            className={`flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden border-2 transition ${i === imageIndex ? 'border-cyan-400 scale-105' : 'border-gray-200 opacity-60 hover:opacity-100'}`}>
                            <img src={img} alt="" className="w-full h-full object-cover" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Description</h3>
                  <p className="text-gray-700 whitespace-pre-wrap">{selectedSubmission.eventDescription}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 mb-1">Category</h4>
                      <p className="text-gray-900">{selectedSubmission.eventCategory}</p>
                    </div>
                    {selectedSubmission.listingType === 'event' ? (
                      <>
                        <div>
                          <h4 className="text-sm font-semibold text-gray-700 mb-1">Date & Time</h4>
                          <div className="flex items-center gap-2 text-gray-900"><Calendar size={16} />{selectedSubmission.startDate}</div>
                          <div className="flex items-center gap-2 text-gray-900 mt-1"><Clock size={16} />{selectedSubmission.startTime}</div>
                          {selectedSubmission.endDate && <div className="text-sm text-gray-600 mt-1">Ends: {selectedSubmission.endDate}</div>}
                        </div>
                        {(selectedSubmission.platform || selectedSubmission.webinarLink) && (
                          <div>
                            <h4 className="text-sm font-semibold text-gray-700 mb-1">Virtual Details</h4>
                            {selectedSubmission.platform && <p className="text-gray-900">{selectedSubmission.platform}</p>}
                            {selectedSubmission.webinarLink && (
                              <a href={selectedSubmission.webinarLink} target="_blank" rel="noopener noreferrer"
                                className="flex items-center gap-1 text-cyan-600 text-sm hover:underline">
                                <ExternalLink size={14} />Registration Link
                              </a>
                            )}
                          </div>
                        )}
                      </>
                    ) : (
                      <div>
                        <h4 className="text-sm font-semibold text-gray-700 mb-1">Operating Hours</h4>
                        {selectedSubmission.alwaysOpen
                          ? <p className="text-green-600 font-semibold">Open 24/7</p>
                          : <p className="text-gray-900 whitespace-pre-line">{selectedSubmission.operatingHours}</p>}
                      </div>
                    )}
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 mb-1">Location</h4>
                      <div className="flex items-start gap-2 text-gray-900">
                        <MapPin size={16} className="flex-shrink-0 mt-1" />
                        <div>
                          <p>{selectedSubmission.venueName}</p>
                          <p className="text-sm text-gray-600">{selectedSubmission.address}</p>
                          <p className="text-sm text-gray-600">{selectedSubmission.city}</p>
                        </div>
                      </div>
                      {selectedSubmission.mapsLink && (
                        <a href={selectedSubmission.mapsLink} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1 text-cyan-600 text-sm mt-2 hover:underline">
                          <ExternalLink size={14} />View on Maps
                        </a>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 mb-1">Organizer</h4>
                      <p className="text-gray-900 font-medium">{selectedSubmission.organizerName}</p>
                      {selectedSubmission.organizationName && <p className="text-gray-600 text-sm">{selectedSubmission.organizationName}</p>}
                      <div className="flex items-center gap-2 text-gray-600 text-sm mt-2">
                        <Mail size={14} />
                        <a href={`mailto:${selectedSubmission.organizerEmail}`} className="hover:text-cyan-600">{selectedSubmission.organizerEmail}</a>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600 text-sm mt-1">
                        <Phone size={14} />
                        <a href={`tel:${selectedSubmission.organizerPhone}`} className="hover:text-cyan-600">{selectedSubmission.organizerPhone}</a>
                      </div>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 mb-1">Pricing</h4>
                      <div className="flex items-center gap-2">
                        <DollarSign size={16} />
                        {selectedSubmission.isFree === true || selectedSubmission.isFree === 'yes'
                          ? <span className="text-green-600 font-semibold">FREE</span>
                          : <span className="text-gray-900">₦{parseFloat(selectedSubmission.ticketPrice || 0).toLocaleString()}</span>}
                      </div>
                      {needsTicketing && (
                        <p className="text-xs text-orange-600 mt-1 font-medium">🎫 Requested OutingStation ticketing</p>
                      )}
                      {selectedSubmission.externalTicketLink && (
                        <a href={selectedSubmission.externalTicketLink} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1 text-cyan-600 text-xs mt-1 hover:underline">
                          <ExternalLink size={12} />External ticket link
                        </a>
                      )}
                    </div>
                    {selectedSubmission.referralCode && (
                      <div>
                        <h4 className="text-sm font-semibold text-gray-700 mb-1">Referral Code</h4>
                        <div className="flex items-center gap-2 text-purple-600 font-semibold bg-purple-50 px-3 py-2 rounded-lg">
                          <Gift size={16} />{selectedSubmission.referralCode}
                          <span className="text-xs ml-auto">₦100 on approval</span>
                        </div>
                      </div>
                    )}
                    {selectedSubmission.additionalInfo && (
                      <div>
                        <h4 className="text-sm font-semibold text-gray-700 mb-1">Additional Info</h4>
                        <p className="text-gray-700 text-sm whitespace-pre-wrap">{selectedSubmission.additionalInfo}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-gray-50 rounded-xl p-4 text-sm">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-semibold text-gray-700 mb-1">Submitted</h4>
                      <p className="text-gray-900">{formatDate(selectedSubmission.submittedAt)}</p>
                    </div>
                    {selectedSubmission.approvedEventId && (
                      <div className="col-span-2">
                        <h4 className="font-semibold text-green-700 mb-1">✅ Published Event ID</h4>
                        <p className="text-green-700 font-mono text-xs bg-green-50 px-2 py-1 rounded">{selectedSubmission.approvedEventId}</p>
                      </div>
                    )}
                    {selectedSubmission.rejectionReason && (
                      <div className="col-span-2">
                        <h4 className="font-semibold text-red-700 mb-1">Rejection Reason</h4>
                        <p className="text-red-600 text-sm">{selectedSubmission.rejectionReason}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* ✅ Action Buttons — different for ticketing vs non-ticketing */}
              <div className="sticky bottom-0 bg-white border-t border-gray-200 p-6 flex gap-3 justify-end flex-wrap">
                {selectedSubmission.status !== 'approved' && (
                  needsTicketing ? (
                    <button onClick={() => handleApprove(selectedSubmission.id)} disabled={approving}
                      className="flex items-center gap-2 px-5 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 font-semibold disabled:opacity-50 transition">
                      {approving
                        ? <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />Publishing...</>
                        : <><Settings size={18} />Set Up Ticketing & Publish</>
                      }
                    </button>
                  ) : (
                    <button onClick={() => handleApprove(selectedSubmission.id)} disabled={approving}
                      className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold disabled:opacity-50 transition">
                      {approving
                        ? <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />Publishing...</>
                        : <><Check size={20} />Approve & Publish{selectedSubmission.referralCode ? ' (+₦100)' : ''}</>
                      }
                    </button>
                  )
                )}
                {selectedSubmission.status !== 'rejected' && (
                  <button onClick={() => handleReject(selectedSubmission.id)}
                    className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold">
                    <X size={20} />Reject
                  </button>
                )}
                <button onClick={() => handleDelete(selectedSubmission.id)}
                  className="flex items-center gap-2 px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-semibold">
                  <X size={20} />Delete
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ✅ Ticketing Setup Modal */}
      {showTicketingModal && ticketingSubmission && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-orange-500 to-amber-500 p-6 text-white">
              <div className="flex items-center gap-3 mb-1">
                <Ticket size={24} />
                <h2 className="text-xl font-bold">Set Up Ticketing</h2>
              </div>
              <p className="text-orange-100 text-sm">{ticketingSubmission.eventTitle}</p>
            </div>

            <div className="p-6 space-y-5">

              {/* Contact reminder */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm">
                <p className="font-semibold text-blue-800 mb-1">✅ Confirm you've spoken to the organizer</p>
                <p className="text-blue-700">
                  <strong>{ticketingSubmission.organizerName}</strong> · {ticketingSubmission.organizerEmail}
                </p>
                <p className="text-blue-600 text-xs mt-1">Their requested price: ₦{parseFloat(ticketingSubmission.ticketPrice || 0).toLocaleString()}</p>
              </div>

              {/* Ticket price */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Ticket Price (₦) <span className="text-red-500">*</span>
                </label>
                <input type="number" value={ticketSetup.price}
                  onChange={(e) => setTicketSetup(prev => ({ ...prev, price: e.target.value }))}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-orange-400 focus:outline-none text-lg font-semibold"
                  placeholder="e.g. 5000" />
                <p className="text-xs text-gray-500 mt-1">Agreed amount after your conversation with the organizer</p>
              </div>

              {/* Tickets available */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Tickets Available</label>
                <input type="number" value={ticketSetup.available}
                  onChange={(e) => setTicketSetup(prev => ({ ...prev, available: e.target.value }))}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-orange-400 focus:outline-none"
                  placeholder="100" />
              </div>

              {/* Service fee */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">OutingStation Service Fee</label>
                <div className="flex gap-3 mb-3">
                  {[
                    { value: 'fixed', label: 'Fixed (₦)' },
                    { value: 'percentage', label: 'Percentage (%)' },
                    { value: 'none', label: 'None' },
                  ].map(opt => (
                    <button key={opt.value} type="button"
                      onClick={() => setTicketSetup(prev => ({ ...prev, serviceFeeType: opt.value }))}
                      className={`flex-1 py-2 text-sm rounded-lg border-2 font-medium transition ${
                        ticketSetup.serviceFeeType === opt.value
                          ? 'border-orange-400 bg-orange-50 text-orange-700'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}>
                      {opt.label}
                    </button>
                  ))}
                </div>
                {ticketSetup.serviceFeeType !== 'none' && (
                  <input type="number" value={ticketSetup.serviceFeeAmount}
                    onChange={(e) => setTicketSetup(prev => ({ ...prev, serviceFeeAmount: e.target.value }))}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-orange-400 focus:outline-none"
                    placeholder={ticketSetup.serviceFeeType === 'percentage' ? '2' : '100'} />
                )}
              </div>

              {/* Live breakdown */}
              {ticketSetup.price > 0 && (
                <div className="bg-gray-50 rounded-xl p-4 text-sm border border-gray-200">
                  <p className="font-semibold text-gray-800 mb-3">💰 Pricing Breakdown</p>
                  {(() => {
                    const price = parseFloat(ticketSetup.price) || 0;
                    const fee = ticketSetup.serviceFeeType === 'fixed' ? parseFloat(ticketSetup.serviceFeeAmount) || 0
                      : ticketSetup.serviceFeeType === 'percentage' ? Math.round(price * (parseFloat(ticketSetup.serviceFeeAmount) || 0) / 100)
                      : 0;
                    const paystack = Math.round(((price + fee) * 0.015) + 100);
                    const total = price + fee + paystack;
                    return (
                      <div className="space-y-2">
                        <div className="flex justify-between"><span className="text-gray-600">Ticket Price</span><span className="font-medium">₦{price.toLocaleString()}</span></div>
                        <div className="flex justify-between"><span className="text-gray-600">Service Fee</span><span className="font-medium">₦{fee.toLocaleString()}</span></div>
                        <div className="flex justify-between"><span className="text-gray-600">Paystack</span><span className="font-medium">₦{paystack.toLocaleString()}</span></div>
                        <div className="border-t border-gray-300 pt-2 flex justify-between font-bold text-base">
                          <span>Buyer pays</span><span className="text-orange-600">₦{total.toLocaleString()}</span>
                        </div>
                        <div className="border-t border-gray-200 pt-2 space-y-1 text-xs text-gray-500">
                          <div className="flex justify-between"><span>Organizer receives</span><span className="text-green-700 font-semibold">₦{price.toLocaleString()}</span></div>
                          <div className="flex justify-between"><span>OutingStation earns</span><span className="text-blue-700 font-semibold">₦{fee.toLocaleString()}</span></div>
                          <div className="flex justify-between"><span>Paystack gets</span><span className="font-semibold">₦{paystack.toLocaleString()}</span></div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>

            <div className="border-t border-gray-200 p-5 flex flex-col sm:flex-row gap-3">
              <button onClick={handleApproveWithTicketing} disabled={approving}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold transition disabled:opacity-50">
                {approving
                  ? <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />Publishing...</>
                  : <><Ticket size={18} />Publish with Ticketing</>
                }
              </button>
              <button onClick={handleApproveWithoutTicketing} disabled={approving}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold transition disabled:opacity-50">
                <Check size={18} />Publish Without (set up later)
              </button>
              <button onClick={() => { setShowTicketingModal(false); setTicketingSubmission(null); }}
                className="px-4 py-3 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition font-medium text-sm">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}