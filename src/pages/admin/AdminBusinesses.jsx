import { useState, useEffect } from 'react';
import { Menu, Store, CheckCircle, XCircle, Clock, Phone, MapPin, DollarSign } from 'lucide-react';
import { AdminSidebar } from '../../components/AdminSidebar';
import { collection, getDocs, doc, updateDoc, deleteDoc, query, where, writeBatch } from 'firebase/firestore';
import { db } from '../../firebase';
import toast from 'react-hot-toast';

const TABS = ['pending', 'approved', 'rejected', 'all'];

// ✅ NEW — computes the tick from both verification statuses combined:
// Gov ID approved → blue, CAC approved → green, both approved → gold
function computeVerificationTick(cacStatus, govIdStatus) {
  const cacApproved = cacStatus === 'approved';
  const govIdApproved = govIdStatus === 'approved';

  if (cacApproved && govIdApproved) return 'gold';
  if (cacApproved) return 'green';
  if (govIdApproved) return 'blue';
  return null;
}

// ✅ NEW — deletes every Outing this business posted, before the business
// document itself is deleted, so their videos stop appearing in the feed
// instead of becoming orphaned. Uses a batched delete since a business
// could have many posts.
//
// ⚠️ ASSUMPTION — I don't have your `outings` schema, so this assumes each
// Outing document has a `posterId` field storing the business's Firestore
// doc id (separate from `linkedId`, which is what the video promotes and
// could be tagged by someone else). If the actual field is named
// differently (e.g. `businessId`, `ownerId`), update the `where('posterId', ...)`
// line below to match — otherwise this silently deletes nothing.
//
// Also note: if outing comments/likes live in subcollections
// (`outings/{id}/comments`, etc.) rather than top-level collections,
// deleting the outing document does NOT delete those subcollections —
// Firestore never cascades subcollections automatically. Flag it if that's
// your setup and I'll add cleanup for those too.
async function deleteBusinessOutings(businessId) {
  const q = query(
    collection(db, 'outings'),
    where('posterId', '==', businessId),
    where('posterType', '==', 'business')
  );
  const snap = await getDocs(q);
  if (snap.empty) return;

  // Firestore batches cap at 500 writes — chunk just in case a business
  // has posted more than that.
  const chunks = [];
  for (let i = 0; i < snap.docs.length; i += 450) {
    chunks.push(snap.docs.slice(i, i + 450));
  }
  for (const chunk of chunks) {
    const batch = writeBatch(db);
    chunk.forEach(d => batch.delete(d.ref));
    await batch.commit();
  }
}

// ✅ NEW — one-time cleanup for videos left behind by businesses that were
// deleted BEFORE the cascade-delete above existed. Scans every Outing
// posted by a business and deletes any whose business no longer has a
// document in `businesses`. Same `posterId`/`posterType` field assumption
// as above — confirm the real field name if this finds nothing but you
// know orphans exist.
async function cleanupOrphanedBusinessOutings(existingBusinessIds) {
  const snap = await getDocs(query(collection(db, 'outings'), where('posterType', '==', 'business')));
  const orphaned = snap.docs.filter(d => !existingBusinessIds.has(d.data().posterId));
  if (orphaned.length === 0) return 0;

  const chunks = [];
  for (let i = 0; i < orphaned.length; i += 450) {
    chunks.push(orphaned.slice(i, i + 450));
  }
  for (const chunk of chunks) {
    const batch = writeBatch(db);
    chunk.forEach(d => batch.delete(d.ref));
    await batch.commit();
  }
  return orphaned.length;
}

export default function AdminBusinesses() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending');
  const [updatingId, setUpdatingId] = useState('');

  useEffect(() => {
    loadBusinesses();
  }, []);

  const loadBusinesses = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'businesses'));
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setBusinesses(list);
    } catch (err) {
      console.error('Error loading businesses:', err);
      toast.error('Failed to load businesses');
    }
    setLoading(false);
  };

  // ✅ UPDATED — now also recomputes and saves verificationTick every
  // time either Gov ID or CAC status changes, based on BOTH statuses
  // together (not just the one that just changed)
  const handleVerifyDoc = async (id, docType, approve) => {
    const statusField = docType === 'gov' ? 'govIdStatus' : 'cacStatus';
    const newStatus = approve ? 'approved' : 'rejected';
    setUpdatingId(id);
    try {
      const business = businesses.find(b => b.id === id);
      const otherStatus = docType === 'gov' ? business?.cacStatus : business?.govIdStatus;
      const cacStatus = docType === 'cac' ? newStatus : otherStatus;
      const govIdStatus = docType === 'gov' ? newStatus : otherStatus;
      const verificationTick = computeVerificationTick(cacStatus, govIdStatus);

      await updateDoc(doc(db, 'businesses', id), {
        [statusField]: newStatus,
        verificationTick,
      });
      setBusinesses(prev => prev.map(b => b.id === id ? { ...b, [statusField]: newStatus, verificationTick } : b));
      toast.success(approve ? `${docType === 'gov' ? 'Gov ID' : 'CAC'} approved` : `${docType === 'gov' ? 'Gov ID' : 'CAC'} rejected`);
    } catch (err) {
      console.error(err);
      toast.error('Failed to update verification status');
    }
    setUpdatingId('');
  };

  const handleDecision = async (id, status) => {
    setUpdatingId(id);
    try {
      await updateDoc(doc(db, 'businesses', id), { status });
      setBusinesses(prev => prev.map(b => b.id === id ? { ...b, status } : b));
      toast.success(status === 'approved' ? '✅ Business approved' : 'Business rejected');
    } catch (err) {
      console.error(err);
      toast.error('Failed to update business');
    }
    setUpdatingId('');
  };

  // ✅ CHANGED — cascade-deletes the business's Outings first, so their
  // videos don't keep showing in the feed after the business account
  // itself is gone.
  const handleDelete = async (id, businessName) => {
    if (!window.confirm(`Permanently delete "${businessName}"? This can't be undone.`)) return;
    setUpdatingId(id);
    try {
      await deleteBusinessOutings(id); // ✅ NEW
      await deleteDoc(doc(db, 'businesses', id));
      setBusinesses(prev => prev.filter(b => b.id !== id));
      toast.success('Business and its Outings deleted');
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete business');
    }
    setUpdatingId('');
  };

  // ✅ NEW — one-time backfill for businesses that were approved before
  // this tick logic existed. Safe to run repeatedly — only writes when
  // the computed tick actually differs from what's currently stored.
  const handleBackfillTicks = async () => {
    if (!window.confirm('Recompute verification ticks for ALL businesses based on their current approval status?')) return;
    setLoading(true);
    try {
      const updates = businesses.map(async (b) => {
        const tick = computeVerificationTick(b.cacStatus, b.govIdStatus);
        if (tick !== (b.verificationTick || null)) {
          await updateDoc(doc(db, 'businesses', b.id), { verificationTick: tick });
        }
      });
      await Promise.all(updates);
      toast.success('Verification ticks backfilled');
      loadBusinesses();
    } catch (err) {
      console.error(err);
      toast.error('Backfill failed');
      setLoading(false);
    }
  };

  // ✅ NEW — one-time button to purge videos left behind by businesses
  // deleted before the cascade-delete fix existed.
  const handleCleanupOrphans = async () => {
    if (!window.confirm('Scan all business Outings and delete any whose business account no longer exists? This is a one-time cleanup and can\'t be undone.')) return;
    setLoading(true);
    try {
      const existingIds = new Set(businesses.map(b => b.id));
      const count = await cleanupOrphanedBusinessOutings(existingIds);
      toast.success(count > 0 ? `Deleted ${count} orphaned video(s)` : 'No orphaned videos found');
    } catch (err) {
      console.error(err);
      toast.error('Cleanup failed');
    }
    setLoading(false);
  };

  const filtered = activeTab === 'all' ? businesses : businesses.filter(b => b.status === activeTab);
  const pendingCount = businesses.filter(b => b.status === 'pending').length;

  return (
    <div className="flex h-screen bg-gray-50">
      <AdminSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="flex-1 overflow-auto">
        <header className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 py-4 sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 hover:bg-gray-100 rounded-lg">
              <Menu size={24} />
            </button>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Business Submissions</h2>
            {pendingCount > 0 && (
              <span className="text-xs bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full font-semibold">
                {pendingCount} pending
              </span>
            )}
          </div>
        </header>

        <div className="p-4 sm:p-6 lg:p-8">
          <div className="max-w-5xl mx-auto">

            {/* Tabs */}
            <div className="flex flex-wrap items-center gap-2 mb-6">
              {TABS.map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 rounded-full text-sm font-semibold capitalize transition ${
                    activeTab === tab ? 'bg-cyan-500 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:border-cyan-400'
                  }`}
                >
                  {tab}
                </button>
              ))}
              {/* ✅ NEW — one-click backfill for existing businesses */}
              <button
                onClick={handleBackfillTicks}
                className="px-4 py-2 rounded-full text-sm font-semibold bg-white text-gray-600 border border-gray-200 hover:border-cyan-400 transition"
              >
                Backfill verification ticks
              </button>
              {/* ✅ NEW — one-time cleanup for videos orphaned by businesses deleted before the cascade fix existed */}
              <button
                onClick={handleCleanupOrphans}
                className="px-4 py-2 rounded-full text-sm font-semibold bg-white text-gray-600 border border-gray-200 hover:border-red-400 transition"
              >
                Clean up orphaned videos
              </button>
            </div>

            {loading ? (
              <div className="flex justify-center py-20">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-cyan-500" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                <Store size={40} className="mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500">No {activeTab !== 'all' ? activeTab : ''} businesses to show.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filtered.map(biz => (
                  <div key={biz.id} className="bg-white rounded-2xl border border-gray-200 p-5">
                    <div className="flex items-start gap-4">
                      {biz.logoUrl ? (
                        <img src={biz.logoUrl} alt={biz.businessName} className="w-16 h-16 rounded-xl object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-16 h-16 rounded-xl bg-cyan-50 flex items-center justify-center flex-shrink-0">
                          <Store size={24} className="text-cyan-400" />
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-bold text-gray-900">{biz.businessName}</h3>
                              {/* ✅ NEW — visual tick indicator right in the admin list */}
                              {biz.verificationTick && <TickBadge tick={biz.verificationTick} />}
                            </div>
                            <p className="text-sm text-cyan-600 font-medium">
                              {biz.businessType}
                              {biz.customTypeName && ` — ${biz.customTypeName}`}
                            </p>
                          </div>
                          <StatusBadge status={biz.status} />
                        </div>
                        <p className="text-sm text-gray-600 mt-2 line-clamp-2">{biz.description}</p>

                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-xs text-gray-500">
                          <span className="flex items-center gap-1"><MapPin size={12} /> {biz.city}</span>
                          <span className="flex items-center gap-1"><Phone size={12} /> {biz.whatsappNumber}</span>
                          {biz.pricingInfo && <span className="flex items-center gap-1"><DollarSign size={12} /> {biz.pricingInfo}</span>}
                          <span className="text-gray-400">{biz.ownerEmail}</span>
                        </div>

                        {(biz.govIdUrl || biz.cacUrl) && (
                          <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Verification</p>
                            {biz.govIdUrl && (
                              <div className="flex items-center gap-3">
                                <img src={biz.govIdUrl} alt="Gov ID" className="w-14 h-14 rounded-lg object-cover border border-gray-200" />
                                <div className="flex-1">
                                  <p className="text-xs font-semibold text-gray-700">Government ID</p>
                                  <VerifyStatusBadge status={biz.govIdStatus} />
                                </div>
                                {biz.govIdStatus === 'pending' && (
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => handleVerifyDoc(biz.id, 'gov', true)}
                                      disabled={updatingId === biz.id}
                                      className="text-xs bg-blue-500 hover:bg-blue-600 text-white font-medium px-3 py-1.5 rounded-lg disabled:opacity-50"
                                    >
                                      Approve
                                    </button>
                                    <button
                                      onClick={() => handleVerifyDoc(biz.id, 'gov', false)}
                                      disabled={updatingId === biz.id}
                                      className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 font-medium px-3 py-1.5 rounded-lg disabled:opacity-50"
                                    >
                                      Reject
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}

                            {biz.cacUrl && (
                              <div className="flex items-center gap-3">
                                <img src={biz.cacUrl} alt="CAC" className="w-14 h-14 rounded-lg object-cover border border-gray-200" />
                                <div className="flex-1">
                                  <p className="text-xs font-semibold text-gray-700">CAC Registration</p>
                                  <VerifyStatusBadge status={biz.cacStatus} />
                                </div>
                                {biz.cacStatus === 'pending' && (
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => handleVerifyDoc(biz.id, 'cac', true)}
                                      disabled={updatingId === biz.id}
                                      className="text-xs bg-emerald-500 hover:bg-emerald-600 text-white font-medium px-3 py-1.5 rounded-lg disabled:opacity-50"
                                    >
                                      Approve
                                    </button>
                                    <button
                                      onClick={() => handleVerifyDoc(biz.id, 'cac', false)}
                                      disabled={updatingId === biz.id}
                                      className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 font-medium px-3 py-1.5 rounded-lg disabled:opacity-50"
                                    >
                                      Reject
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        {biz.status === 'pending' && (
                          <div className="flex gap-2 mt-4">
                            <button
                              onClick={() => handleDecision(biz.id, 'approved')}
                              disabled={updatingId === biz.id}
                              className="flex items-center gap-1.5 bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-emerald-600 transition disabled:opacity-50"
                            >
                              <CheckCircle size={14} /> Approve
                            </button>
                            <button
                              onClick={() => handleDecision(biz.id, 'rejected')}
                              disabled={updatingId === biz.id}
                              className="flex items-center gap-1.5 bg-red-500 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-red-600 transition disabled:opacity-50"
                            >
                              <XCircle size={14} /> Reject
                            </button>
                          </div>
                        )}

                        {biz.status === 'approved' && (
                          <button
                            onClick={() => handleDecision(biz.id, 'rejected')}
                            disabled={updatingId === biz.id}
                            className="mt-4 text-xs text-red-500 hover:text-red-600 font-medium"
                          >
                            Revoke approval
                          </button>
                        )}

                        {biz.status === 'rejected' && (
                          <button
                            onClick={() => handleDecision(biz.id, 'approved')}
                            disabled={updatingId === biz.id}
                            className="mt-4 text-xs text-emerald-500 hover:text-emerald-600 font-medium"
                          >
                            Approve anyway
                          </button>
                        )}

                        <button
                          onClick={() => handleDelete(biz.id, biz.businessName)}
                          disabled={updatingId === biz.id}
                          className="mt-2 text-xs text-gray-400 hover:text-red-500 font-medium block disabled:opacity-50"
                        >
                          Delete permanently
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function StatusBadge({ status }) {
  const config = {
    pending: { label: 'Pending', color: 'bg-amber-100 text-amber-700', icon: Clock },
    approved: { label: 'Approved', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle },
    rejected: { label: 'Rejected', color: 'bg-red-100 text-red-600', icon: XCircle },
  }[status] || { label: status, color: 'bg-gray-100 text-gray-600', icon: Clock };
  const Icon = config.icon;
  return (
    <span className={`flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0 ${config.color}`}>
      <Icon size={11} /> {config.label}
    </span>
  );
}

function VerifyStatusBadge({ status }) {
  const config = {
    pending: { label: 'Under Review', color: 'text-amber-600' },
    approved: { label: 'Approved', color: 'text-emerald-600' },
    rejected: { label: 'Rejected', color: 'text-red-500' },
  }[status] || { label: 'Not Uploaded', color: 'text-gray-400' };
  return <p className={`text-xs font-medium ${config.color}`}>{config.label}</p>;
}

// ✅ NEW — small colored tick badge shown next to a business name in the
// admin list, matching the same color scheme used in the mobile app
function TickBadge({ tick }) {
  const config = {
    blue: { label: 'Blue', color: 'text-blue-500' },
    green: { label: 'Green', color: 'text-emerald-500' },
    gold: { label: 'Gold', color: 'text-amber-500' },
  }[tick];
  if (!config) return null;
  return (
    <span title={`${config.label} tick`} className={config.color}>
      <CheckCircle size={16} fill="currentColor" className="text-white" style={{ color: config.color.includes('blue') ? '#3b82f6' : config.color.includes('emerald') ? '#22c55e' : '#f59e0b' }} />
    </span>
  );
}