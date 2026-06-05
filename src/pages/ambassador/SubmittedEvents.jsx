// src/pages/ambassador/SubmittedEvents.jsx
import React, { useState, useEffect, useMemo } from 'react';
import {
  collection, getDocs, doc, updateDoc, addDoc,
  serverTimestamp, Timestamp,
} from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import { AmbassadorSidebar } from '../../components/AmbassadorSidebar';
import ManageLinkModal from '../../components/ManageLinkModal';
import {
  Eye, Check, X, Calendar, MapPin, DollarSign,
  Mail, Phone, ExternalLink, Clock, Filter,
  Menu, RefreshCw, AlertTriangle, ChevronLeft, ChevronRight,
  Image, Ticket, GraduationCap,
} from 'lucide-react';

const generateSlug = (title) =>
  (title || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
    .substring(0, 80);

// Unique key that lets an organizer manage their event (check-in, sales)
const generateManageKey = () =>
  Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('');

// Normalise a university name for loose matching (case-insensitive, trimmed)
const norm = (s) => (s || '').toString().trim().toLowerCase();

// Resolve a university's display name from a university doc
const uniName = (u) =>
  u?.name || u?.title || u?.universityName || u?.shortName || u?.id || '';

export default function SubmittedEvents() {
  const { userProfile } = useAuth();
  const assigned = userProfile?.assignedCampuses || [];

  const [universities, setUniversities] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [working, setWorking] = useState(false);
  const [showManageModal, setShowManageModal] = useState(false);
  const [approvedEventForManage, setApprovedEventForManage] = useState(null);
  const [imageIndex, setImageIndex] = useState(0);

  // ── Load universities (to turn the ambassador's assigned IDs into names) ──
  useEffect(() => {
    (async () => {
      try {
        const snap = await getDocs(collection(db, 'universities'));
        setUniversities(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (e) {
        console.error('Failed to load campuses:', e);
      }
    })();
  }, []);

  // The names of the campuses this ambassador is assigned to (usually one)
  const myCampusNames = useMemo(() => {
    return assigned
      .map(id => universities.find(u => u.id === id))
      .filter(Boolean)
      .map(u => norm(uniName(u)));
  }, [assigned, universities]);

  const myCampusLabel = useMemo(() => {
    const first = assigned
      .map(id => universities.find(u => u.id === id))
      .filter(Boolean)
      .map(u => uniName(u))[0];
    return first || '';
  }, [assigned, universities]);

  // ── Load submissions ──
  const fetchSubmissions = async () => {
    setLoading(true);
    setError(null);
    try {
      const snapshot = await getDocs(collection(db, 'event_submissions'));
      const data = snapshot.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (b.submittedAt?.seconds || 0) - (a.submittedAt?.seconds || 0));
      setSubmissions(data);
    } catch (err) {
      setError(
        err.code === 'permission-denied'
          ? 'Permission denied. Make sure you are logged in.'
          : `Failed to load submissions: ${err.message}`
      );
      setSubmissions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSubmissions(); }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchSubmissions();
    setTimeout(() => setRefreshing(false), 500);
  };

  // ── Keep only submissions for THIS ambassador's campus ──
  // A submission belongs to the campus if it's marked as a university event
  // and its universityName matches one of the ambassador's assigned campuses.
  const campusSubmissions = useMemo(() => {
    if (myCampusNames.length === 0) return [];
    return submissions.filter(sub => {
      const subUni = norm(sub.universityName);
      if (!subUni) return false;
      return myCampusNames.includes(subUni);
    });
  }, [submissions, myCampusNames]);

  const filteredSubmissions = campusSubmissions.filter(sub => {
    if (statusFilter !== 'all' && (sub.status || 'pending') !== statusFilter) return false;
    return true;
  });

  // ── Helpers ──
  const wantsOSTicketing = (sub) =>
    sub.wantOutingstationTicketing === 'yes' || sub.wantOutingstationTicketing === true;

  const isFreeSub = (sub) => sub.isFree === true || sub.isFree === 'yes';

  const getAllImages = (sub) => {
    const all = [];
    if (sub.imageUrl) all.push(sub.imageUrl);
    if (sub.images?.length) sub.images.forEach(img => { if (img && !all.includes(img)) all.push(img); });
    return all;
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch { return 'Invalid date'; }
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
    };
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${styles[status] || styles.pending}`}>
        {status?.toUpperCase() || 'PENDING'}
      </span>
    );
  };

  // ── Build the event doc from a submission ──
  // ticketed = true  → OutingStation ticketing with a FIXED ₦100 service fee
  // ticketed = false → free / external-link event, no OS ticketing
  const buildEventDoc = (submission, ticketed) => {
    const isPlace = submission.listingType === 'place';

    const eventDoc = {
      title: submission.eventTitle || '',
      description: submission.eventDescription || '',
      category: submission.eventCategory || '',
      // This page only handles campus submissions, so FORCE campus fields.
      // (Don't rely on submission.isUniversityEvent — it may be missing or a string.)
      eventType: 'campus',
      subCategory: isPlace ? 'places' : 'events',
      imageUrl: submission.imageUrl || '',
      images: submission.images || [],
      location: submission.city || '',
      address: `${submission.venueName || ''}, ${submission.address || ''}`.replace(/^,\s*/, ''),
      mapLocation: submission.mapsLink || null,
      city: submission.city || '',
      venueName: submission.venueName || '',
      isFree: isFreeSub(submission),
      price: submission.ticketPrice ? parseFloat(submission.ticketPrice) : 0,
      organizerName: submission.organizerName || '',
      organizerEmail: submission.organizerEmail || '',
      organizerPhone: submission.organizerPhone || '',
      organizationName: submission.organizationName || null,
      university: submission.universityName || null,
      isUniversityEvent: true,
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
      createdBy: 'ambassador_approved',
      approvedByAmbassador: userProfile?.uid || userProfile?.id || true,
      submissionId: submission.id,
      // ticketing defaults (off)
      ticketingEnabled: false,
      ticketingOption: 'none',
      hasOutingStationTicketing: false,
      ticketPrice: 0,
      ticketsAvailable: 0,
      ticketsSold: 0,
      externalTicketLink: submission.externalTicketLink || null,
      ticketTiers: submission.ticketTiers || [],
      hasTicketTiers: submission.hasTicketTiers || false,
    };

    // OutingStation ticketing → fixed ₦100 service fee (no setup screen).
    // We DO carry over the tiers the organizer submitted, and generate a
    // manage key so the organizer gets a manage link (same as admin flow).
    if (ticketed) {
      eventDoc.ticketingEnabled = true;
      eventDoc.ticketingOption = 'outingstation';
      eventDoc.hasOutingStationTicketing = true;
      eventDoc.serviceFeeType = 'fixed';
      eventDoc.serviceFeeAmount = 100;
      eventDoc.serviceFee = 100;

      // manage key so the organizer can check in attendees / view sales
      eventDoc.manageKey = generateManageKey();

      const submittedTiers = submission.ticketTiers || [];
      const hasTiers = submission.hasTicketTiers && submittedTiers.length > 0;

      if (hasTiers) {
        // Carry the submitted tiers across, exactly as submitted
        eventDoc.hasTicketTiers = true;
        eventDoc.ticketTiers = submittedTiers.map((t, i) => ({
          id: t.id || `tier_${i + 1}`,
          name: t.name,
          price: parseFloat(t.price) || 0,
          benefits: t.benefits || null,
          quantity: t.quantity != null ? parseInt(t.quantity) : null,
          sold: 0,
          saleEndDate: t.saleEndDate || null,
        }));
        // base price = lowest tier; capacity = sum of tier quantities (fallback 100)
        eventDoc.ticketPrice = Math.min(...eventDoc.ticketTiers.map(t => t.price));
        eventDoc.ticketsAvailable =
          eventDoc.ticketTiers.reduce((sum, t) => sum + (t.quantity || 0), 0) || 100;
      } else {
        // Single price, no tiers
        eventDoc.hasTicketTiers = false;
        eventDoc.ticketTiers = [];
        eventDoc.ticketPrice = submission.ticketPrice ? parseFloat(submission.ticketPrice) : 0;
        eventDoc.ticketsAvailable = 100;
      }
    }

    // dates for events (places have no date)
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

  // ── Accept / publish ──
  const handleAccept = async (submissionId) => {
    const submission = campusSubmissions.find(s => s.id === submissionId);
    if (!submission) return;

    const ticketed = wantsOSTicketing(submission); // only these get the ₦100 fee
    const label = submission.listingType === 'place' ? 'place' : 'event';

    const feeNote = ticketed
      ? '\n\nA fixed ₦100 service fee will be applied (OutingStation ticketing).'
      : '';

    if (!confirm(`Accept and publish this ${label} live for your campus?${feeNote}`)) return;

    setWorking(true);
    try {
      const eventDoc = buildEventDoc(submission, ticketed);
      const docRef = await addDoc(collection(db, 'events'), eventDoc);

      await updateDoc(doc(db, 'event_submissions', submissionId), {
        status: 'approved',
        approvedEventId: docRef.id,
        reviewedAt: new Date(),
        reviewedBy: 'ambassador',
      });

      alert(`✅ ${label.charAt(0).toUpperCase() + label.slice(1)} is now LIVE!${ticketed ? '\n💳 ₦100 service fee applied.' : ''}`);
      await fetchSubmissions();
      setSelectedSubmission(null);

      // If this was a ticketed event, show the manage link so the
      // ambassador can copy it and send it to the organizer.
      if (ticketed && eventDoc.manageKey) {
        setApprovedEventForManage({ id: docRef.id, ...eventDoc });
        setShowManageModal(true);
      }
    } catch (err) {
      console.error('Error accepting:', err);
      alert('❌ Failed to publish: ' + err.message);
    } finally {
      setWorking(false);
    }
  };

  // ── Reject ──
  const handleReject = async (submissionId) => {
    const reason = prompt('Enter a reason for rejecting this submission:');
    if (!reason) return;
    setWorking(true);
    try {
      await updateDoc(doc(db, 'event_submissions', submissionId), {
        status: 'rejected',
        rejectionReason: reason,
        reviewedAt: new Date(),
        reviewedBy: 'ambassador',
      });
      await fetchSubmissions();
      setSelectedSubmission(null);
    } catch (err) {
      alert('Failed to reject: ' + err.message);
    } finally {
      setWorking(false);
    }
  };

  // ── No campus assigned ──
  const noCampus = assigned.length === 0;

  // ── Error / loading states ──
  if (error) return (
    <div className="flex h-screen bg-gray-50">
      <AmbassadorSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
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
      <AmbassadorSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
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
      <AmbassadorSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="flex-1 overflow-auto">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 hover:bg-gray-100 rounded-lg"><Menu size={24} /></button>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Submitted Events</h1>
                <p className="text-sm text-gray-600 hidden sm:flex items-center gap-1">
                  <GraduationCap size={14} />
                  {myCampusLabel ? `Submissions for ${myCampusLabel}` : 'Submissions for your campus'}
                </p>
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

          {noCampus ? (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 flex items-start gap-3">
              <AlertTriangle size={22} className="text-yellow-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-yellow-800">No campus assigned yet</p>
                <p className="text-yellow-700 text-sm mt-1">Ask your admin to assign you a campus, then submissions for that campus will appear here.</p>
              </div>
            </div>
          ) : (
            <>
              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                {[
                  { label: 'Total', value: campusSubmissions.length, style: 'bg-white border-gray-200 text-gray-900' },
                  { label: 'Pending', value: campusSubmissions.filter(s => !s.status || s.status === 'pending').length, style: 'bg-yellow-50 border-yellow-200 text-yellow-800' },
                  { label: 'Approved', value: campusSubmissions.filter(s => s.status === 'approved').length, style: 'bg-green-50 border-green-200 text-green-800' },
                  { label: 'Rejected', value: campusSubmissions.filter(s => s.status === 'rejected').length, style: 'bg-red-50 border-red-200 text-red-800' },
                ].map((stat, i) => (
                  <div key={i} className={`rounded-xl p-4 sm:p-6 shadow-sm border ${stat.style}`}>
                    <div className="text-xl sm:text-2xl font-bold">{stat.value}</div>
                    <div className="text-xs sm:text-sm opacity-80">{stat.label}</div>
                  </div>
                ))}
              </div>

              {/* Filter */}
              <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200 mb-6 flex items-center gap-4">
                <Filter size={20} className="text-gray-600 hidden sm:block" />
                <div>
                  <label className="text-sm font-medium text-gray-700 mr-2">Status:</label>
                  <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
                    <option value="all">All</option>
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
                <span className="text-sm text-gray-600 ml-auto">{filteredSubmissions.length} results</span>
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
                        <tr><td colSpan="6" className="px-6 py-12 text-center text-gray-500">No submissions for your campus yet</td></tr>
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
                              <div className="text-xs text-blue-600 font-semibold mt-1">🎓 Campus</div>
                            </td>
                            <td className="px-6 py-4">
                              {wantsOSTicketing(sub) ? (
                                <span className="inline-flex items-center gap-1 text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full font-semibold">
                                  <Ticket size={11} />OS Ticketing (₦100 fee)
                                </span>
                              ) : sub.externalTicketLink ? (
                                <span className="text-xs text-gray-500">External link</span>
                              ) : isFreeSub(sub) ? (
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
            </>
          )}
        </div>
      </main>

      {/* Detail Modal */}
      {selectedSubmission && (() => {
        const allImages = getAllImages(selectedSubmission);
        const ticketed = wantsOSTicketing(selectedSubmission);
        return (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-start justify-between z-10">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-2xl font-bold text-gray-900">{selectedSubmission.eventTitle}</h2>
                    {getStatusBadge(selectedSubmission.status)}
                    {ticketed && (
                      <span className="inline-flex items-center gap-1 bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-sm font-semibold">
                        <Ticket size={14} />OS Ticketing · ₦100 fee
                      </span>
                    )}
                  </div>
                  <p className="text-gray-600">{selectedSubmission.eventCategory}</p>
                  {selectedSubmission.approvedEventId && (
                    <span className="inline-flex items-center gap-1 bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-semibold mt-2">
                      ✓ Live — ID: {selectedSubmission.approvedEventId}
                    </span>
                  )}
                </div>
                <button onClick={() => setSelectedSubmission(null)} className="p-2 hover:bg-gray-100 rounded-lg flex-shrink-0"><X size={24} /></button>
              </div>

              <div className="p-6 space-y-6">

                {ticketed && selectedSubmission.status !== 'approved' && (
                  <div className="bg-orange-50 border-2 border-orange-200 rounded-xl p-4 flex items-start gap-3">
                    <Ticket size={22} className="text-orange-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-orange-800 text-sm">This organizer wants OutingStation Ticketing</p>
                      <p className="text-orange-700 text-sm mt-1">If you accept, a fixed <strong>₦100 service fee</strong> is applied automatically. Ticket price: ₦{parseFloat(selectedSubmission.ticketPrice || 0).toLocaleString()}.</p>
                    </div>
                  </div>
                )}

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
                      <div>
                        <h4 className="text-sm font-semibold text-gray-700 mb-1">Date & Time</h4>
                        <div className="flex items-center gap-2 text-gray-900"><Calendar size={16} />{selectedSubmission.startDate}</div>
                        <div className="flex items-center gap-2 text-gray-900 mt-1"><Clock size={16} />{selectedSubmission.startTime}</div>
                        {selectedSubmission.endDate && <div className="text-sm text-gray-600 mt-1">Ends: {selectedSubmission.endDate}</div>}
                      </div>
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
                        {isFreeSub(selectedSubmission)
                          ? <span className="text-green-600 font-semibold">FREE</span>
                          : <span className="text-gray-900">₦{parseFloat(selectedSubmission.ticketPrice || 0).toLocaleString()}</span>}
                      </div>
                      {ticketed && (
                        <p className="text-xs text-orange-600 mt-1 font-medium">🎫 OutingStation ticketing — ₦100 fee on accept</p>
                      )}
                      {selectedSubmission.externalTicketLink && (
                        <a href={selectedSubmission.externalTicketLink} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1 text-cyan-600 text-xs mt-1 hover:underline">
                          <ExternalLink size={12} />External ticket link
                        </a>
                      )}
                    </div>
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
                    {selectedSubmission.rejectionReason && (
                      <div className="col-span-2">
                        <h4 className="font-semibold text-red-700 mb-1">Rejection Reason</h4>
                        <p className="text-red-600 text-sm">{selectedSubmission.rejectionReason}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions: Accept / Reject only */}
              <div className="sticky bottom-0 bg-white border-t border-gray-200 p-6 flex gap-3 justify-end flex-wrap">
                {selectedSubmission.status !== 'approved' && (
                  <button onClick={() => handleAccept(selectedSubmission.id)} disabled={working}
                    className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold disabled:opacity-50 transition">
                    {working
                      ? <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />Publishing...</>
                      : <><Check size={20} />Accept & Publish{ticketed ? ' (₦100 fee)' : ''}</>
                    }
                  </button>
                )}
                {selectedSubmission.status !== 'rejected' && (
                  <button onClick={() => handleReject(selectedSubmission.id)} disabled={working}
                    className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold disabled:opacity-50">
                    <X size={20} />Reject
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Manage Link Modal — shown after a ticketed event is accepted,
          so the ambassador can copy the link and send it to the organizer */}
      {showManageModal && approvedEventForManage?.manageKey && (
        <ManageLinkModal
          event={approvedEventForManage}
          onClose={() => {
            setShowManageModal(false);
            setApprovedEventForManage(null);
          }}
        />
      )}
    </div>
  );
}