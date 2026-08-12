import { useState, useEffect } from 'react';
import { collection, getDocs, getDoc, addDoc, updateDoc, doc, query, where } from 'firebase/firestore';
import { db } from '../../firebase';
import { AdminSidebar } from '../../components/AdminSidebar';
import {
  Menu, Search, X, Eye, Check, XCircle, Clock,
  MapPin, GraduationCap, User, Phone, Mail, CreditCard,
  Instagram, ExternalLink, ChevronDown, ChevronUp, Users, TrendingUp, UserPlus
} from 'lucide-react';
import toast from 'react-hot-toast';

const STATUS_COLORS = {
  pending: 'bg-amber-100 text-amber-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
};

const STATUS_ICONS = {
  pending: <Clock size={12} />,
  approved: <Check size={12} />,
  rejected: <XCircle size={12} />,
};

export default function AdminAmbassadorApplications() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [applications, setApplications] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [selectedApp, setSelectedApp] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  // ✅ NEW — admin-side view into a specific ambassador's referral
  // tracking (current cycle + history). Keyed by application id, loaded
  // lazily only when that row is expanded — not fetched for every row up
  // front, since that'd be one extra read pair per application on every
  // page load for data most rows will never need to show.
  const [trackingByApp, setTrackingByApp] = useState({});

  const loadTrackingForApp = async (app) => {
    if (!app.accountEmail || trackingByApp[app.id]) return;
    setTrackingByApp(prev => ({ ...prev, [app.id]: { loading: true } }));
    try {
      const usersQuery = query(
        collection(db, 'users'),
        where('email', '==', app.accountEmail)
      );
      const usersSnap = await getDocs(usersQuery);
      if (usersSnap.empty) {
        setTrackingByApp(prev => ({ ...prev, [app.id]: { loading: false, notFound: true } }));
        return;
      }
      const userDoc = usersSnap.docs[0];
      const userData = userDoc.data();
      const earningsSnap = await getDoc(doc(db, 'ambassadorEarnings', userDoc.id));
      const earningsData = earningsSnap.exists() ? earningsSnap.data() : {};
      setTrackingByApp(prev => ({
        ...prev,
        [app.id]: {
          loading: false,
          totalReferrals: userData.totalReferrals || 0,
          cycleReferrals: userData.cycleReferrals || 0,
          cycleStartAt: userData.cycleStartAt || null,
          cycleHistory: earningsData.cycleHistory || [],
        },
      }));
    } catch (err) {
      console.error('Failed to load tracking data:', err);
      setTrackingByApp(prev => ({ ...prev, [app.id]: { loading: false, error: true } }));
    }
  };

  const toggleExpand = (app) => {
    const opening = expandedId !== app.id;
    setExpandedId(opening ? app.id : null);
    if (opening && app.status === 'approved') {
      loadTrackingForApp(app);
    }
  };

  // ✅ NEW — covers people who are ambassadors (or should be) but never
  // went through the public /join application form — e.g. an existing
  // admin, or anyone added directly in Firestore in the past. Without a
  // real application record, they can't be assigned a city/campus and
  // don't show up anywhere to toggle tracking on for them.
  //
  // This creates a synthetic ambassadorApplications doc with status
  // already 'approved' — same shape handleApprove produces — so this
  // person shows up in the SAME list, gets the SAME tracking panel, and
  // uses the SAME Activate Tracking toggle as anyone who applied for
  // real. Nothing downstream needs to know the difference.
  const [showAddModal, setShowAddModal] = useState(false);
  const [addingAmbassador, setAddingAmbassador] = useState(false);
  const [addForm, setAddForm] = useState({
    accountEmail: '',
    fullName: '',
    ambassadorType: 'city',
    city: '',
    state: '',
    university: '',
  });

  const handleAddManualAmbassador = async () => {
    const { accountEmail, fullName, ambassadorType, city, state, university } = addForm;
    if (!accountEmail.trim()) {
      toast.error('Account email is required');
      return;
    }
    if (ambassadorType === 'campus' && !university.trim()) {
      toast.error('University is required for a campus ambassador');
      return;
    }
    if (ambassadorType === 'city' && !city.trim()) {
      toast.error('City is required for a city ambassador');
      return;
    }

    try {
      setAddingAmbassador(true);

      const usersQuery = query(
        collection(db, 'users'),
        where('email', '==', accountEmail.trim())
      );
      const usersSnap = await getDocs(usersQuery);
      if (usersSnap.empty) {
        toast.error('No account found with that email — they need to have an account first');
        return;
      }
      const userDoc = usersSnap.docs[0];
      const userData = userDoc.data();
      const resolvedName = fullName.trim() || userData.name || 'Ambassador';

      const appData = {
        fullName: resolvedName,
        email: accountEmail.trim(),
        accountEmail: accountEmail.trim(),
        ambassadorType,
        ...(ambassadorType === 'campus' ? { university: university.trim() } : { city: city.trim(), state: state.trim() }),
        status: 'approved',
        // ✅ Flags this row as manually added rather than a real
        // submission, purely for admin's own reference — nothing reads
        // this to change behavior anywhere.
        addedManually: true,
        createdAt: new Date(),
        approvedAt: new Date(),
        earningActivated: false,
      };

      const appRef = await addDoc(collection(db, 'ambassadorApplications'), appData);

      const userUpdate = {
        isAmbassador: true,
        ambassadorType,
        ambassadorSince: new Date(),
        creditsUnlocked: true,
        updatedAt: new Date(),
        earningActivated: false,
      };
      if (ambassadorType === 'campus') userUpdate.isCampusAmbassador = true;

      await updateDoc(doc(db, 'users', userDoc.id), userUpdate);

      setApplications(prev => [{ id: appRef.id, ...appData }, ...prev]);
      setShowAddModal(false);
      setAddForm({ accountEmail: '', fullName: '', ambassadorType: 'city', city: '', state: '', university: '' });
      toast.success(`✅ ${resolvedName} added as an ambassador`);
    } catch (err) {
      console.error(err);
      toast.error('Failed to add ambassador');
    } finally {
      setAddingAmbassador(false);
    }
  };

  useEffect(() => { loadApplications(); }, []);

  const loadApplications = async () => {
    try {
      setLoading(true);
      const snap = await getDocs(collection(db, 'ambassadorApplications'));
      const apps = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      apps.sort((a, b) => (b.createdAt?.toDate?.() || 0) - (a.createdAt?.toDate?.() || 0));
      setApplications(apps);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load applications');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (app) => {
    if (!confirm(`Approve ${app.fullName} as an OutingStation Ambassador?`)) return;
    try {
      setProcessing(true);

      // Update application status
      await updateDoc(doc(db, 'ambassadorApplications', app.id), {
        status: 'approved',
        approvedAt: new Date(),
        // ✅ NEW — denormalized copy of the user doc's earningActivated,
        // purely so this list can show/toggle earning status without a
        // second Firestore read per row. The user doc is still the
        // source of truth the cron and Firestore rules actually check.
        earningActivated: false,
      });

      // Find user by accountEmail and update their profile
      if (app.accountEmail) {
        const usersQuery = query(
          collection(db, 'users'),
          where('email', '==', app.accountEmail)
        );
        const usersSnap = await getDocs(usersQuery);
        if (!usersSnap.empty) {
          const userDoc = usersSnap.docs[0];
          const updateData = {
            isAmbassador: true,
            ambassadorType: app.ambassadorType,
            ambassadorSince: new Date(),
            creditsUnlocked: true,
            updatedAt: new Date(),
            // ✅ CHANGED — approval no longer starts the 30-day tracking
            // cycle by itself. Not every approved ambassador is meant to
            // have their referrals tracked; that's a separate admin
            // decision made later via "Activate Tracking" below.
            // cycleStartAt/cycleReferrals only get set at that point now.
            earningActivated: false,
          };
          if (app.ambassadorType === 'campus') {
            updateData.isCampusAmbassador = true;
          }
          await updateDoc(doc(db, 'users', userDoc.id), updateData);
        }
      }

      // Send approval email
      // ✅ CHANGED — send-ambassador-approval-email.js was merged into
      // send-notification.js (Vercel's Hobby plan caps deployments at 12
      // serverless functions; this project had 14). Same request body as
      // before, just a different URL plus a `type` field.
      try {
        await fetch('/api/send-notification', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'ambassador-approval',
            name: app.fullName,
            email: app.email,
            ambassadorType: app.ambassadorType,
            university: app.university || '',
            city: app.city || '',
            state: app.state || '',
          }),
        });
      } catch (emailErr) {
        console.error('Email send failed:', emailErr);
        // Don't block approval if email fails
      }

      setApplications(prev =>
        prev.map(a => a.id === app.id ? { ...a, status: 'approved' } : a)
      );
      setSelectedApp(null);
      toast.success(`✅ ${app.fullName} approved as Ambassador!`);
    } catch (err) {
      console.error(err);
      toast.error('Failed to approve application');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async (app) => {
    if (!confirm(`Reject ${app.fullName}'s application?`)) return;
    try {
      setProcessing(true);
      await updateDoc(doc(db, 'ambassadorApplications', app.id), {
        status: 'rejected',
        rejectedAt: new Date(),
      });
      setApplications(prev =>
        prev.map(a => a.id === app.id ? { ...a, status: 'rejected' } : a)
      );
      setSelectedApp(null);
      toast.success('Application rejected');
    } catch (err) {
      console.error(err);
      toast.error('Failed to reject application');
    } finally {
      setProcessing(false);
    }
  };

  // ✅ NEW — approval alone no longer starts the 30-day tracking cycle.
  // This is the separate admin decision of WHICH approved ambassadors
  // actually get their referrals tracked. Turning it ON starts a fresh
  // cycle (cycleStartAt: now, cycleReferrals: 0) on the matching user
  // doc; turning it OFF just stops the cron from picking them up again.
  // ✅ RENAMED from handleToggleEarning — plan change: this is now pure
  // referral tracking, not payout eligibility. Ambassadors get paid
  // manually/upfront outside the app, so there's no unclaimed-amount risk
  // on reactivation anymore — always safe to just start a fresh cycle.
  const handleToggleTracking = async (app) => {
    const activating = !app.earningActivated;
    const verb = activating ? 'Activate' : 'Deactivate';
    if (!confirm(`${verb} referral tracking for ${app.fullName}?`)) return;

    if (!app.accountEmail) {
      toast.error('No linked account email on this application');
      return;
    }

    try {
      setProcessing(true);

      const usersQuery = query(
        collection(db, 'users'),
        where('email', '==', app.accountEmail)
      );
      const usersSnap = await getDocs(usersQuery);
      if (usersSnap.empty) {
        toast.error('Could not find the matching user account');
        return;
      }
      const userDoc = usersSnap.docs[0];

      await updateDoc(doc(db, 'users', userDoc.id), {
        // ✅ NOTE — field name kept as "earningActivated" even though the
        // UI now calls this "tracking", to avoid touching the cron query,
        // Firestore rules, and this field name all in the same change.
        earningActivated: activating,
        updatedAt: new Date(),
        ...(activating ? { cycleStartAt: new Date(), cycleReferrals: 0 } : {}),
      });

      await updateDoc(doc(db, 'ambassadorApplications', app.id), {
        earningActivated: activating,
      });

      setApplications(prev =>
        prev.map(a => a.id === app.id ? { ...a, earningActivated: activating } : a)
      );
      toast.success(`✅ Tracking ${activating ? 'activated' : 'deactivated'} for ${app.fullName}`);
    } catch (err) {
      console.error(err);
      toast.error('Failed to update tracking status');
    } finally {
      setProcessing(false);
    }
  };

  const filtered = applications.filter(app => {
    const q = searchQuery.toLowerCase();
    const matchSearch = !q ||
      app.fullName?.toLowerCase().includes(q) ||
      app.email?.toLowerCase().includes(q) ||
      app.university?.toLowerCase().includes(q) ||
      app.city?.toLowerCase().includes(q);
    const matchStatus = filterStatus === 'all' || app.status === filterStatus;
    const matchType = filterType === 'all' || app.ambassadorType === filterType;
    return matchSearch && matchStatus && matchType;
  });

  const stats = {
    total: applications.length,
    pending: applications.filter(a => a.status === 'pending').length,
    approved: applications.filter(a => a.status === 'approved').length,
    rejected: applications.filter(a => a.status === 'rejected').length,
  };

  const formatDate = (ts) => {
    if (!ts) return '—';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const Avatar = ({ app, size = 'w-11 h-11' }) => (
    <div className={`${size} rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-white font-bold flex-shrink-0 overflow-hidden`}>
      {app.photoUrl
        ? <img src={app.photoUrl} alt={app.fullName} className="w-full h-full object-cover" />
        : (app.fullName?.charAt(0)?.toUpperCase() || '?')
      }
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-50">
      <AdminSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="flex-1 overflow-auto">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-4">
              <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 hover:bg-gray-100 rounded-lg">
                <Menu size={24} />
              </button>
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Ambassador Applications</h2>
                <p className="text-sm text-gray-500">Review and approve ambassador applications from outingstation.com/join</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => setShowAddModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-500 text-white rounded-lg text-sm font-semibold hover:bg-cyan-600 transition">
                <UserPlus size={15} /> Add Ambassador
              </button>
              <button onClick={loadApplications} className="text-sm text-cyan-600 hover:text-cyan-700 font-medium">
                ↻ Refresh
              </button>
            </div>
          </div>
        </header>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
          </div>
        ) : (
          <div className="p-4 sm:p-6 lg:p-8">

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              {[
                { label: 'Total', value: stats.total, color: 'text-cyan-600', bg: 'bg-cyan-50', icon: '📋' },
                { label: 'Pending', value: stats.pending, color: 'text-amber-600', bg: 'bg-amber-50', icon: '⏳' },
                { label: 'Approved', value: stats.approved, color: 'text-green-600', bg: 'bg-green-50', icon: '✅' },
                { label: 'Rejected', value: stats.rejected, color: 'text-red-600', bg: 'bg-red-50', icon: '❌' },
              ].map((s, i) => (
                <div key={i} className={`${s.bg} rounded-xl p-4 border border-gray-100`}>
                  <div className="text-2xl mb-1">{s.icon}</div>
                  <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-sm text-gray-500">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6 flex flex-col sm:flex-row gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search by name, email, university, city..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-cyan-400"
                />
              </div>
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-cyan-400 bg-white">
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
              <select value={filterType} onChange={e => setFilterType(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-cyan-400 bg-white">
                <option value="all">All Types</option>
                <option value="campus">Campus</option>
                <option value="city">City</option>
              </select>
              <p className="text-sm text-gray-500 self-center whitespace-nowrap">{filtered.length} results</p>
            </div>

            {/* Applications List */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {filtered.length === 0 ? (
                <div className="text-center py-16">
                  <User className="mx-auto text-gray-300 mb-3" size={48} />
                  <p className="text-gray-500">No applications found</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {filtered.map(app => {
                    const isOpen = expandedId === app.id;
                    return (
                      <div key={app.id} className="hover:bg-gray-50/60 transition">
                        {/* Row */}
                        <div className="p-4 sm:p-5">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <Avatar app={app} />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap mb-0.5">
                                  <p className="font-semibold text-gray-900">{app.fullName}</p>
                                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[app.status] || STATUS_COLORS.pending}`}>
                                    {STATUS_ICONS[app.status]}
                                    {app.status || 'pending'}
                                  </span>
                                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                    app.ambassadorType === 'campus'
                                      ? 'bg-purple-100 text-purple-700'
                                      : 'bg-blue-100 text-blue-700'
                                  }`}>
                                    {app.ambassadorType === 'campus' ? '🎓 Campus' : '🏙️ City'}
                                  </span>
                                  {app.status === 'approved' && (
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                      app.earningActivated
                                        ? 'bg-emerald-100 text-emerald-700'
                                        : 'bg-gray-100 text-gray-500'
                                    }`}>
                                      {app.earningActivated ? '📊 Tracking active' : '⏸️ Tracking inactive'}
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-gray-500">{app.email}</p>
                                <p className="text-xs text-gray-400 mt-0.5">
                                  {app.ambassadorType === 'campus'
                                    ? app.university
                                    : `${app.city}, ${app.state}`
                                  } · Applied {formatDate(app.createdAt)}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 flex-shrink-0">
                              {app.status === 'pending' && (
                                <>
                                  <button onClick={() => handleApprove(app)} disabled={processing}
                                    className="px-3 py-1.5 bg-green-500 text-white rounded-lg text-xs font-semibold hover:bg-green-600 transition disabled:opacity-50">
                                    Approve
                                  </button>
                                  <button onClick={() => handleReject(app)} disabled={processing}
                                    className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs font-semibold hover:bg-red-100 transition disabled:opacity-50">
                                    Reject
                                  </button>
                                </>
                              )}
                              {app.status === 'approved' && (
                                <button onClick={() => handleToggleTracking(app)} disabled={processing}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition disabled:opacity-50 ${
                                    app.earningActivated
                                      ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                      : 'bg-emerald-500 text-white hover:bg-emerald-600'
                                  }`}>
                                  {app.earningActivated ? 'Deactivate Tracking' : 'Activate Tracking'}
                                </button>
                              )}
                              <button onClick={() => toggleExpand(app)}
                                className="p-2 hover:bg-gray-100 rounded-lg transition">
                                {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Expanded Details */}
                        {isOpen && (
                          <div className="px-4 sm:px-5 pb-5 border-t border-gray-100 pt-4">

                            {/* ✅ NEW — referral tracking, admin's view into
                                the same data the ambassador sees on their
                                own dashboard: current cycle + history. */}
                            {app.status === 'approved' && (
                              <div className="bg-cyan-50 border border-cyan-100 rounded-xl p-4 mb-4">
                                <p className="text-xs font-bold text-cyan-700 uppercase mb-3 flex items-center gap-1.5">
                                  <TrendingUp size={13} /> Referral Tracking
                                </p>
                                {trackingByApp[app.id]?.loading ? (
                                  <p className="text-sm text-gray-500">Loading…</p>
                                ) : trackingByApp[app.id]?.notFound ? (
                                  <p className="text-sm text-gray-500">Could not find the linked account.</p>
                                ) : trackingByApp[app.id]?.error ? (
                                  <p className="text-sm text-gray-500">Failed to load tracking data.</p>
                                ) : trackingByApp[app.id] ? (
                                  <>
                                    <div className="grid grid-cols-3 gap-3 mb-3">
                                      <div>
                                        <p className="text-lg font-black text-cyan-700">{trackingByApp[app.id].cycleReferrals}</p>
                                        <p className="text-[10px] text-gray-500 uppercase font-semibold">This Cycle</p>
                                      </div>
                                      <div>
                                        <p className="text-lg font-black text-cyan-700">{trackingByApp[app.id].totalReferrals}</p>
                                        <p className="text-[10px] text-gray-500 uppercase font-semibold">Total Referrals</p>
                                      </div>
                                      <div>
                                        <p className="text-lg font-black text-cyan-700">{trackingByApp[app.id].cycleHistory.length}</p>
                                        <p className="text-[10px] text-gray-500 uppercase font-semibold">Cycles Completed</p>
                                      </div>
                                    </div>
                                    {trackingByApp[app.id].cycleHistory.length > 0 && (
                                      <div className="border-t border-cyan-100 pt-3">
                                        <p className="text-[10px] font-bold text-gray-500 uppercase mb-2">Past Cycles</p>
                                        <div className="space-y-1.5 max-h-40 overflow-y-auto">
                                          {[...trackingByApp[app.id].cycleHistory].reverse().map((cycle, i) => {
                                            const endDate = cycle.cycleEnd?.toDate ? cycle.cycleEnd.toDate() : (cycle.cycleEnd ? new Date(cycle.cycleEnd) : null);
                                            return (
                                              <div key={i} className="flex items-center justify-between text-xs bg-white rounded-lg px-3 py-1.5">
                                                <span className="text-gray-700 flex items-center gap-1.5"><Users size={11} className="text-gray-400" /> {cycle.referrals} referral{cycle.referrals === 1 ? '' : 's'}</span>
                                                <span className="text-gray-400">{endDate ? endDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</span>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    )}
                                  </>
                                ) : (
                                  <p className="text-sm text-gray-500">—</p>
                                )}
                              </div>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

                              {/* Contact */}
                              <div className="bg-gray-50 rounded-xl p-4">
                                <p className="text-xs font-bold text-gray-500 uppercase mb-3">Contact</p>
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2 text-sm">
                                    <Phone size={13} className="text-gray-400" />
                                    <span>{app.phone || '—'}</span>
                                  </div>
                                  <div className="flex items-center gap-2 text-sm">
                                    <Mail size={13} className="text-gray-400" />
                                    <span className="truncate">{app.accountEmail || '—'}</span>
                                  </div>
                                  {app.isContentCreator === 'Yes' && (
                                    <div className="flex items-center gap-2 text-sm">
                                      <Instagram size={13} className="text-gray-400" />
                                      <span>{app.socialHandle}</span>
                                      {app.followerCount && <span className="text-gray-400">· {app.followerCount} followers</span>}
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Ambassador Info */}
                              <div className="bg-gray-50 rounded-xl p-4">
                                <p className="text-xs font-bold text-gray-500 uppercase mb-3">Ambassador Info</p>
                                <div className="space-y-2 text-sm">
                                  {app.ambassadorType === 'campus' ? (
                                    <>
                                      <div className="flex items-center gap-2">
                                        <GraduationCap size={13} className="text-gray-400" />
                                        <span>{app.university}</span>
                                      </div>
                                      <p className="text-gray-600">Dept: {app.department}</p>
                                      <p className="text-gray-600">Level: {app.level}</p>
                                    </>
                                  ) : (
                                    <div className="flex items-center gap-2">
                                      <MapPin size={13} className="text-gray-400" />
                                      <span>{app.city}, {app.state}</span>
                                    </div>
                                  )}
                                  <p className="text-gray-600">Reach: {app.reach}</p>
                                  <p className="text-gray-600">Availability: {app.availability}</p>
                                  {app.referredBy && <p className="text-gray-600">Referred by: {app.referredBy}</p>}
                                </div>
                              </div>

                              {/* Bank Details */}
                              <div className="bg-gray-50 rounded-xl p-4">
                                <p className="text-xs font-bold text-gray-500 uppercase mb-3">Bank Details</p>
                                <div className="space-y-2 text-sm">
                                  <div className="flex items-center gap-2">
                                    <CreditCard size={13} className="text-gray-400" />
                                    <span>{app.bankName || '—'}</span>
                                  </div>
                                  <p className="text-gray-600">Acct No: <span className="font-mono">{app.accountNumber || '—'}</span></p>
                                  <p className="text-gray-600">Acct Name: {app.accountName || '—'}</p>
                                </div>
                              </div>

                              {/* ID */}
                              <div className="bg-gray-50 rounded-xl p-4">
                                <p className="text-xs font-bold text-gray-500 uppercase mb-3">ID Verification</p>
                                <div className="space-y-2 text-sm">
                                  <p className="text-gray-600">Type: {app.idType || '—'}</p>
                                  <p className="text-gray-600">Number: <span className="font-mono">{app.idNumber || '—'}</span></p>
                                  {app.idImageUrl && (
                                    <a href={app.idImageUrl} target="_blank" rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1.5 mt-2 px-3 py-1.5 bg-cyan-50 text-cyan-600 rounded-lg text-xs font-semibold hover:bg-cyan-100 transition">
                                      <ExternalLink size={12} /> View ID Image
                                    </a>
                                  )}
                                </div>
                              </div>

                              {/* Why Join */}
                              <div className="bg-gray-50 rounded-xl p-4 sm:col-span-2">
                                <p className="text-xs font-bold text-gray-500 uppercase mb-3">Why They Want to Join</p>
                                <p className="text-sm text-gray-700 leading-relaxed">{app.whyJoin || '—'}</p>
                              </div>

                            </div>

                            {/* Action buttons at bottom of expanded */}
                            {app.status === 'pending' && (
                              <div className="flex gap-3 mt-4 pt-4 border-t border-gray-100">
                                <button onClick={() => handleApprove(app)} disabled={processing}
                                  className="flex-1 py-2.5 bg-green-500 text-white rounded-xl text-sm font-semibold hover:bg-green-600 transition disabled:opacity-50 flex items-center justify-center gap-2">
                                  <Check size={16} /> Approve Application
                                </button>
                                <button onClick={() => handleReject(app)} disabled={processing}
                                  className="flex-1 py-2.5 bg-red-50 text-red-600 rounded-xl text-sm font-semibold hover:bg-red-100 transition disabled:opacity-50 flex items-center justify-center gap-2">
                                  <XCircle size={16} /> Reject
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Add Ambassador Manually Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-gray-900 mb-1">Add Ambassador Manually</h3>
            <p className="text-sm text-gray-500 mb-5">
              For anyone who's already an ambassador (e.g. an existing admin) but never went through the /join application form. They'll show up in this list exactly like anyone who applied.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Account Email</label>
                <input
                  type="email"
                  value={addForm.accountEmail}
                  onChange={e => setAddForm(prev => ({ ...prev, accountEmail: e.target.value }))}
                  placeholder="their@email.com"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-cyan-400"
                />
                <p className="text-xs text-gray-400 mt-1">Must match an existing account's email exactly.</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Full Name <span className="text-gray-300 font-normal normal-case">(optional — falls back to their account name)</span></label>
                <input
                  type="text"
                  value={addForm.fullName}
                  onChange={e => setAddForm(prev => ({ ...prev, fullName: e.target.value }))}
                  placeholder="Full name"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-cyan-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Ambassador Type</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setAddForm(prev => ({ ...prev, ambassadorType: 'city' }))}
                    className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition ${
                      addForm.ambassadorType === 'city'
                        ? 'bg-blue-500 text-white border-blue-500'
                        : 'bg-white text-gray-600 border-gray-200'
                    }`}
                  >
                    🏙️ City
                  </button>
                  <button
                    onClick={() => setAddForm(prev => ({ ...prev, ambassadorType: 'campus' }))}
                    className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition ${
                      addForm.ambassadorType === 'campus'
                        ? 'bg-purple-500 text-white border-purple-500'
                        : 'bg-white text-gray-600 border-gray-200'
                    }`}
                  >
                    🎓 Campus
                  </button>
                </div>
              </div>

              {addForm.ambassadorType === 'city' ? (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">City</label>
                    <input
                      type="text"
                      value={addForm.city}
                      onChange={e => setAddForm(prev => ({ ...prev, city: e.target.value }))}
                      placeholder="e.g. Lagos"
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-cyan-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">State <span className="text-gray-300 font-normal normal-case">(optional)</span></label>
                    <input
                      type="text"
                      value={addForm.state}
                      onChange={e => setAddForm(prev => ({ ...prev, state: e.target.value }))}
                      placeholder="e.g. Lagos State"
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-cyan-400"
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">University</label>
                  <input
                    type="text"
                    value={addForm.university}
                    onChange={e => setAddForm(prev => ({ ...prev, university: e.target.value }))}
                    placeholder="e.g. University of Lagos"
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-cyan-400"
                  />
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleAddManualAmbassador}
                disabled={addingAmbassador}
                className="flex-1 py-2.5 bg-cyan-500 text-white rounded-xl text-sm font-semibold hover:bg-cyan-600 transition disabled:opacity-50"
              >
                {addingAmbassador ? 'Adding...' : 'Add Ambassador'}
              </button>
              <button
                onClick={() => setShowAddModal(false)}
                disabled={addingAmbassador}
                className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-200 transition disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}