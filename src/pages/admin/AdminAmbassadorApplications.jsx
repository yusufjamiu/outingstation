import { useState, useEffect } from 'react';
import { collection, getDocs, updateDoc, doc, query, where } from 'firebase/firestore';
import { db } from '../../firebase';
import { AdminSidebar } from '../../components/AdminSidebar';
import {
  Menu, Search, X, Eye, Check, XCircle, Clock,
  MapPin, GraduationCap, User, Phone, Mail, CreditCard,
  Instagram, ExternalLink, ChevronDown, ChevronUp
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
          };
          if (app.ambassadorType === 'campus') {
            updateData.isCampusAmbassador = true;
          }
          await updateDoc(doc(db, 'users', userDoc.id), updateData);
        }
      }

      // Send approval email
      try {
        await fetch('/api/send-ambassador-approval-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
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
            <button onClick={loadApplications} className="text-sm text-cyan-600 hover:text-cyan-700 font-medium">
              ↻ Refresh
            </button>
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
                              <button onClick={() => setExpandedId(isOpen ? null : app.id)}
                                className="p-2 hover:bg-gray-100 rounded-lg transition">
                                {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Expanded Details */}
                        {isOpen && (
                          <div className="px-4 sm:px-5 pb-5 border-t border-gray-100 pt-4">
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
    </div>
  );
}