// src/pages/admin/AdminExperienceSubmissions.jsx
import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc, deleteDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { AdminSidebar } from '../../components/AdminSidebar';
import {
  Eye, Check, X, MapPin, DollarSign, Mail, Phone, ExternalLink,
  Menu, RefreshCw, AlertTriangle, ChevronLeft, ChevronRight, Image,
  Ticket, Building2, Calendar, Users,
} from 'lucide-react';

// ✅ Generate unique manage key for host access — mirrors
// EventSubmissionsPage.jsx's generateManageKey() exactly. Since there's
// no business/login requirement for experiences (same as events), this
// unauthenticated key is how the host reaches ManageExperience.jsx to
// add sessions and check guests in — same access model as an event's
// manageKey link, not a Firebase-Auth-gated dashboard.
const generateManageKey = () =>
  Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('');

const generateSlug = (title) => (title || '')
  .toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').trim().substring(0, 80);

export default function AdminExperienceSubmissions() {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [approving, setApproving] = useState(false);
  const [imageIndex, setImageIndex] = useState(0);
  // ✅ NEW — shows the manage link right after approval so the admin can
  // copy/share it with the host, same UX as EventSubmissionsPage.jsx's
  // ManageLinkModal flow.
  const [approvedExperienceForManage, setApprovedExperienceForManage] = useState(null);

  useEffect(() => { fetchSubmissions(); }, []);

  const fetchSubmissions = async () => {
    setLoading(true);
    setError(null);
    try {
      const snapshot = await getDocs(collection(db, 'experience_submissions'));
      const data = snapshot.docs
        .map(d => ({ id: d.id, ...d.data() }))
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

  const handleRefresh = async () => { setRefreshing(true); await fetchSubmissions(); setTimeout(() => setRefreshing(false), 500); };

  const buildExperienceDoc = (submission) => ({
    title: submission.title || '',
    description: submission.description || '',
    category: submission.category || '',
    included: submission.included || [],
    toBring: submission.toBring || [],
    pricePerPerson: submission.pricePerPerson || 0,
    minGuests: submission.minGuests || 1,
    maxGuests: submission.maxGuests || 1,
    sessions: (submission.sessions || []).map(s => ({ ...s, bookedSpots: 0 })),
    recurring: submission.recurring || false,
    recurringPattern: submission.recurringPattern || null,
    city: submission.city || '',
    address: submission.address || '',
    mapsLink: submission.mapsLink || null,
    bookingMethod: submission.bookingMethod || 'contact',
    bankAccount: submission.bankAccount || null,
    organizerName: submission.organizerName || '',
    organizerEmail: submission.organizerEmail || '',
    organizerPhone: submission.organizerPhone || '',
    organizationName: submission.organizationName || null,
    imageUrl: submission.imageUrl || '',
    images: submission.images || [],
    status: 'published',
    savedCount: 0,
    slug: generateSlug(submission.title || ''),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    createdBy: submission.ownerId || 'admin_approved',
    ownerId: submission.ownerId || null,
    // ✅ CHANGED — no business/agency involved anymore, matching events
    // exactly. The host reaches ManageExperience.jsx via this key, not
    // through business ownership.
    manageKey: generateManageKey(),
    submissionId: submission.id,
  });

  const handleApprove = async (submissionId) => {
    const submission = submissions.find(s => s.id === submissionId);
    if (!submission) return;
    if (submission.bookingMethod === 'outingstation' && !confirm('This experience uses OutingStation Booking — payouts will go to the submitted bank account. Approve and publish?')) return;
    if (submission.bookingMethod === 'contact' && !confirm('Approve and publish this experience immediately to the live app?')) return;

    setApproving(true);
    try {
      const expDoc = buildExperienceDoc(submission);
      const docRef = await addDoc(collection(db, 'experiences'), expDoc);
      await updateDoc(doc(db, 'experience_submissions', submissionId), {
        status: 'approved', approvedExperienceId: docRef.id, reviewedAt: new Date(),
      });
      setApprovedExperienceForManage({ id: docRef.id, ...expDoc });
      fetchSubmissions();
      setSelectedSubmission(null);
    } catch (err) {
      console.error('Error approving:', err);
      alert('❌ Failed to approve: ' + err.message);
    } finally {
      setApproving(false);
    }
  };

  const handleReject = async (submissionId) => {
    const reason = prompt('Enter rejection reason:');
    if (!reason) return;
    try {
      await updateDoc(doc(db, 'experience_submissions', submissionId), { status: 'rejected', rejectionReason: reason, reviewedAt: new Date() });
      fetchSubmissions();
      setSelectedSubmission(null);
    } catch (err) {
      alert('Failed to reject: ' + err.message);
    }
  };

  const handleDelete = async (submissionId) => {
    if (!confirm('Permanently delete this submission?')) return;
    try {
      await deleteDoc(doc(db, 'experience_submissions', submissionId));
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

  const getAllImages = (sub) => {
    const all = [];
    if (sub.imageUrl) all.push(sub.imageUrl);
    if (sub.images?.length) sub.images.forEach(img => { if (img && !all.includes(img)) all.push(img); });
    return all;
  };

  const filteredSubmissions = submissions.filter(sub => statusFilter === 'all' || (sub.status || 'pending') === statusFilter);

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
        <div className="text-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto" /><p className="mt-4 text-gray-600">Loading submissions...</p></div>
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
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Experience Submissions</h1>
                <p className="text-sm text-gray-600 hidden sm:block">Review and approve/reject experiences from OSB hosts</p>
              </div>
            </div>
            <button onClick={handleRefresh} disabled={refreshing || loading} className="flex items-center gap-2 px-3 py-1.5 text-sm text-cyan-600 hover:bg-cyan-50 rounded-lg font-medium transition disabled:opacity-50">
              <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} /><span className="hidden sm:inline">{refreshing ? 'Refreshing...' : 'Refresh'}</span>
            </button>
          </div>
        </header>

        <div className="p-4 sm:p-6">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
            {[
              { label: 'Total', value: submissions.length, style: 'bg-white border-gray-200 text-gray-900' },
              { label: 'Pending', value: submissions.filter(s => !s.status || s.status === 'pending').length, style: 'bg-yellow-50 border-yellow-200 text-yellow-800' },
              { label: 'Approved', value: submissions.filter(s => s.status === 'approved').length, style: 'bg-green-50 border-green-200 text-green-800' },
            ].map((stat, i) => (
              <div key={i} className={`rounded-xl p-4 sm:p-6 shadow-sm border ${stat.style}`}>
                <div className="text-xl sm:text-2xl font-bold">{stat.value}</div>
                <div className="text-xs sm:text-sm opacity-80">{stat.label}</div>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200 mb-6 flex items-center gap-4">
            <label className="text-sm font-medium text-gray-700">Status:</label>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
              <option value="all">All</option><option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option>
            </select>
            <span className="text-sm text-gray-600 ml-auto">{filteredSubmissions.length} results</span>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>{['Submission', 'Host', 'Category', 'Booking', 'Status', 'Actions'].map(h => (
                    <th key={h} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
                  ))}</tr>
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
                                <img src={allImages[0]} alt={sub.title} className="w-16 h-16 object-cover rounded-lg" onError={(e) => e.target.style.display = 'none'} />
                                {allImages.length > 1 && <div className="absolute -bottom-1 -right-1 bg-gray-800 text-white text-xs px-1.5 py-0.5 rounded-full flex items-center gap-0.5"><Image size={9} />{allImages.length}</div>}
                              </div>
                            )}
                            <div>
                              <div className="font-semibold text-gray-900">{sub.title}</div>
                              <div className="text-sm text-gray-500 flex items-center gap-1 mt-1"><MapPin size={14} />{sub.city}</div>
                              <div className="text-xs text-gray-500 mt-1">₦{Number(sub.pricePerPerson || 0).toLocaleString()}/person · {sub.sessions?.length || 0} session(s)</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm">
                            <div className="font-medium text-gray-900">{sub.organizerName}</div>
                            <div className="text-gray-600 text-xs">{sub.organizationName || 'Individual'}</div>
                            <div className="text-gray-500 flex items-center gap-1 mt-1 text-xs"><Mail size={11} /><span className="truncate max-w-[180px]">{sub.organizerEmail}</span></div>
                          </div>
                        </td>
                        <td className="px-6 py-4"><span className="px-2 py-1 rounded text-xs font-semibold bg-purple-100 text-purple-800">{sub.category}</span></td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full font-semibold ${sub.bookingMethod === 'outingstation' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                            {sub.bookingMethod === 'outingstation' ? <><Ticket size={11} />OS Booking</> : <><Phone size={11} />Contact</>}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {getStatusBadge(sub.status)}
                          <div className="text-xs text-gray-500 mt-1">{formatDate(sub.submittedAt)}</div>
                        </td>
                        <td className="px-6 py-4">
                          <button onClick={() => { setSelectedSubmission(sub); setImageIndex(0); }} className="flex items-center gap-1 text-cyan-600 hover:text-cyan-700 font-medium text-sm">
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

      {selectedSubmission && (() => {
        const allImages = getAllImages(selectedSubmission);
        return (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-start justify-between z-10">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-2xl font-bold text-gray-900">{selectedSubmission.title}</h2>
                    {getStatusBadge(selectedSubmission.status)}
                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold ${selectedSubmission.bookingMethod === 'outingstation' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                      {selectedSubmission.bookingMethod === 'outingstation' ? <><Ticket size={14} />OutingStation Booking</> : <><Phone size={14} />Contact Host</>}
                    </span>
                  </div>
                  <p className="text-gray-600">{selectedSubmission.category}</p>
                  {selectedSubmission.approvedExperienceId && (
                    <span className="inline-flex items-center gap-1 bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-semibold mt-2">✓ Live — ID: {selectedSubmission.approvedExperienceId}</span>
                  )}
                </div>
                <button onClick={() => setSelectedSubmission(null)} className="p-2 hover:bg-gray-100 rounded-lg flex-shrink-0"><X size={24} /></button>
              </div>

              <div className="p-6 space-y-6">
                {allImages.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-semibold text-gray-700">Photos ({allImages.length})</h3>
                      <span className="text-xs text-gray-400">{imageIndex + 1} / {allImages.length}</span>
                    </div>
                    <div className="relative rounded-xl overflow-hidden bg-gray-100">
                      <img src={allImages[imageIndex]} alt={`Photo ${imageIndex + 1}`} className="w-full max-h-72 object-cover" onError={(e) => { e.target.src = 'https://via.placeholder.com/800x400'; }} />
                      {allImages.length > 1 && (
                        <>
                          <button onClick={() => setImageIndex(i => (i - 1 + allImages.length) % allImages.length)} className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full"><ChevronLeft size={18} /></button>
                          <button onClick={() => setImageIndex(i => (i + 1) % allImages.length)} className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full"><ChevronRight size={18} /></button>
                        </>
                      )}
                    </div>
                  </div>
                )}

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Description</h3>
                  <p className="text-gray-700 whitespace-pre-wrap">{selectedSubmission.description}</p>
                </div>

                {(selectedSubmission.included?.length > 0 || selectedSubmission.toBring?.length > 0) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedSubmission.included?.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-gray-700 mb-2">What's Included</h4>
                        <ul className="space-y-1">{selectedSubmission.included.map((item, i) => <li key={i} className="text-sm text-gray-700 flex items-start gap-1.5"><Check size={14} className="text-emerald-500 mt-0.5 flex-shrink-0" />{item}</li>)}</ul>
                      </div>
                    )}
                    {selectedSubmission.toBring?.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-gray-700 mb-2">What to Bring</h4>
                        <ul className="space-y-1">{selectedSubmission.toBring.map((item, i) => <li key={i} className="text-sm text-gray-700">• {item}</li>)}</ul>
                      </div>
                    )}
                  </div>
                )}

                <div className="border-2 border-cyan-100 rounded-xl p-4">
                  <h3 className="text-sm font-black text-gray-800 mb-3 flex items-center gap-2"><Calendar size={16} className="text-cyan-600" />Sessions ({selectedSubmission.sessions?.length || 0})</h3>
                  <div className="space-y-2">
                    {(selectedSubmission.sessions || []).map((s, i) => (
                      <div key={i} className="flex items-center justify-between py-2.5 px-3 bg-gray-50 rounded-xl border border-gray-100 text-sm">
                        <span className="font-medium text-gray-800">{s.date} · {s.time}</span>
                        <span className="text-gray-500">{s.totalSpots} spots</span>
                      </div>
                    ))}
                  </div>
                  {selectedSubmission.recurring && (
                    <p className="text-xs text-blue-600 mt-2 font-semibold">🔁 Recurring: {selectedSubmission.recurringPattern}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 mb-1">Pricing</h4>
                      <div className="flex items-center gap-2"><DollarSign size={16} /><span className="text-gray-900">₦{Number(selectedSubmission.pricePerPerson || 0).toLocaleString()} / person</span></div>
                      <div className="flex items-center gap-2 mt-1 text-sm text-gray-600"><Users size={14} />{selectedSubmission.minGuests}–{selectedSubmission.maxGuests} guests / booking</div>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 mb-1">Location</h4>
                      <div className="flex items-start gap-2 text-gray-900">
                        <MapPin size={16} className="flex-shrink-0 mt-1" />
                        <div><p className="text-sm text-gray-600">{selectedSubmission.address}</p><p className="text-sm text-gray-600">{selectedSubmission.city}</p></div>
                      </div>
                      {selectedSubmission.mapsLink && (
                        <a href={selectedSubmission.mapsLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-cyan-600 text-sm mt-2 hover:underline"><ExternalLink size={14} />View on Maps</a>
                      )}
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 mb-1">Host</h4>
                      <p className="text-gray-900 font-medium">{selectedSubmission.organizerName}</p>
                      {selectedSubmission.organizationName && <p className="text-gray-600 text-sm">{selectedSubmission.organizationName}</p>}
                      <div className="flex items-center gap-2 text-gray-600 text-sm mt-2"><Mail size={14} /><a href={`mailto:${selectedSubmission.organizerEmail}`} className="hover:text-cyan-600">{selectedSubmission.organizerEmail}</a></div>
                      <div className="flex items-center gap-2 text-gray-600 text-sm mt-1"><Phone size={14} /><a href={`tel:${selectedSubmission.organizerPhone}`} className="hover:text-cyan-600">{selectedSubmission.organizerPhone}</a></div>
                    </div>
                    {selectedSubmission.bookingMethod === 'outingstation' && selectedSubmission.bankAccount && (
                      <div>
                        <h4 className="text-sm font-semibold text-gray-700 mb-1 flex items-center gap-1.5"><Building2 size={14} />Payout Account</h4>
                        <p className="text-sm text-gray-900">{selectedSubmission.bankAccount.bankName} · {selectedSubmission.bankAccount.accountNumber}</p>
                        <p className="text-xs text-gray-500">{selectedSubmission.bankAccount.accountName}</p>
                      </div>
                    )}
                    {selectedSubmission.rejectionReason && (
                      <div><h4 className="font-semibold text-red-700 mb-1 text-sm">Rejection Reason</h4><p className="text-red-600 text-sm">{selectedSubmission.rejectionReason}</p></div>
                    )}
                  </div>
                </div>
              </div>

              <div className="sticky bottom-0 bg-white border-t border-gray-200 p-6 flex gap-3 justify-end flex-wrap">
                {selectedSubmission.status !== 'approved' && (
                  <button onClick={() => handleApprove(selectedSubmission.id)} disabled={approving}
                    className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold disabled:opacity-50 transition">
                    {approving ? <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />Publishing...</> : <><Check size={20} />Approve & Publish</>}
                  </button>
                )}
                {selectedSubmission.status !== 'rejected' && (
                  <button onClick={() => handleReject(selectedSubmission.id)} className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold"><X size={20} />Reject</button>
                )}
                <button onClick={() => handleDelete(selectedSubmission.id)} className="flex items-center gap-2 px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-semibold"><X size={20} />Delete</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ✅ NEW — manage link, shown right after approval. Self-contained
          rather than reusing the shared ManageLinkModal component from
          events — that component's internals aren't visible here, and
          it may hardcode the /manage-event/ path, which would be wrong
          for an experience. This mirrors its purpose (show + copy the
          unauthenticated manage link) without assuming its internals.
          Route shown is /manage-experience/:id?key=... — add that route
          in App.jsx pointing at ManageExperience.jsx if it isn't there yet. */}
      {approvedExperienceForManage?.manageKey && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6">
            <div className="flex items-center gap-2 mb-1">
              <Check size={20} className="text-green-600" />
              <h3 className="text-lg font-bold text-gray-900">Experience is Live!</h3>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              Send this link to the host — they use it to add sessions and check guests in. No login needed; keep it private, anyone with the link can manage this experience.
            </p>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-4">
              <p className="text-xs font-mono text-gray-700 break-all">
                {`${window.location.origin}/manage-experience/${approvedExperienceForManage.id}?key=${approvedExperienceForManage.manageKey}`}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/manage-experience/${approvedExperienceForManage.id}?key=${approvedExperienceForManage.manageKey}`);
                  alert('Link copied!');
                }}
                className="flex-1 px-4 py-2.5 bg-cyan-600 text-white rounded-lg font-semibold hover:bg-cyan-700 transition"
              >
                Copy Link
              </button>
              <button
                onClick={() => setApprovedExperienceForManage(null)}
                className="px-4 py-2.5 text-gray-600 hover:bg-gray-100 rounded-lg font-medium transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}