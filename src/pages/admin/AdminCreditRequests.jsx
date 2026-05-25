import { useState, useEffect } from 'react';
import {
  collection, getDocs, doc, updateDoc,
  query, orderBy, serverTimestamp
} from 'firebase/firestore';
import { db } from '../../firebase';
import toast from 'react-hot-toast';
import {
  Menu, Search, CheckCircle, XCircle,
  Clock, Filter, RefreshCw, Instagram,
  Twitter, Youtube, Facebook, Globe, Users
} from 'lucide-react';
import { AdminSidebar } from '../../components/AdminSidebar';

const PLATFORM_ICONS = {
  instagram: Instagram,
  twitter: Twitter,
  tiktok: Globe,
  facebook: Facebook,
  youtube: Youtube,
};

const PLATFORM_COLORS = {
  instagram: 'text-pink-500 bg-pink-50',
  twitter: 'text-sky-500 bg-sky-50',
  tiktok: 'text-gray-800 bg-gray-100',
  facebook: 'text-blue-600 bg-blue-50',
  youtube: 'text-red-500 bg-red-50',
};

export default function AdminCreditRequests() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [processing, setProcessing] = useState(null);
  const [reviewNote, setReviewNote] = useState('');

  useEffect(() => { loadRequests(); }, []);

  const loadRequests = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(
        query(collection(db, 'creditUnlockRequests'), orderBy('submittedAt', 'desc'))
      );
      setRequests(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error('Error loading requests:', err);
      toast.error('Failed to load requests');
    }
    setLoading(false);
  };

  const handleApprove = async (request) => {
    if (!confirm(`Approve credit unlock for ${request.userName}?`)) return;
    setProcessing(request.id);
    try {
      // ✅ Update the request status
      await updateDoc(doc(db, 'creditUnlockRequests', request.id), {
        status: 'approved',
        reviewedAt: serverTimestamp(),
        reviewNote: reviewNote || 'Approved by admin',
      });

      // ✅ Unlock the user's credits
      await updateDoc(doc(db, 'users', request.userId), {
        creditsUnlocked: true,
        creditsUnlockedAt: serverTimestamp(),
        creditsUnlockedVia: 'social_follow',
        updatedAt: serverTimestamp(),
      });

      setRequests(prev => prev.map(r =>
        r.id === request.id ? { ...r, status: 'approved' } : r
      ));
      setReviewNote('');
      setExpandedId(null);
      toast.success(`✅ Credits unlocked for ${request.userName}!`);
    } catch (err) {
      console.error('Error approving:', err);
      toast.error('Failed to approve request');
    }
    setProcessing(null);
  };

  const handleReject = async (request) => {
    if (!confirm(`Reject credit unlock request from ${request.userName}?`)) return;
    setProcessing(request.id);
    try {
      await updateDoc(doc(db, 'creditUnlockRequests', request.id), {
        status: 'rejected',
        reviewedAt: serverTimestamp(),
        reviewNote: reviewNote || 'Rejected by admin',
      });
      setRequests(prev => prev.map(r =>
        r.id === request.id ? { ...r, status: 'rejected' } : r
      ));
      setReviewNote('');
      setExpandedId(null);
      toast.success('Request rejected');
    } catch (err) {
      console.error('Error rejecting:', err);
      toast.error('Failed to reject request');
    }
    setProcessing(null);
  };

  const filtered = requests.filter(r => {
    const matchesFilter = filter === 'all' || r.status === filter;
    const matchesSearch = !search.trim() ||
      r.userName?.toLowerCase().includes(search.toLowerCase()) ||
      r.userEmail?.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const stats = {
    pending: requests.filter(r => r.status === 'pending').length,
    approved: requests.filter(r => r.status === 'approved').length,
    rejected: requests.filter(r => r.status === 'rejected').length,
    total: requests.length,
  };

  const formatDate = (ts) => {
    if (!ts?.seconds) return 'N/A';
    return new Date(ts.seconds * 1000).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <AdminSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="flex-1 overflow-auto">
        <header className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 py-4 sticky top-0 z-30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 hover:bg-gray-100 rounded-lg">
                <Menu size={24} />
              </button>
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Credit Unlock Requests</h2>
                <p className="text-sm text-gray-500">Review and approve user credit unlock requests</p>
              </div>
            </div>
            <button onClick={loadRequests} disabled={loading}
              className="flex items-center gap-2 text-sm text-cyan-600 hover:bg-cyan-50 px-3 py-1.5 rounded-lg font-medium transition">
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>
        </header>

        <div className="p-4 sm:p-6 lg:p-8">

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[
              { label: 'Total', value: stats.total, color: 'border-gray-200', icon: '📋' },
              { label: 'Pending', value: stats.pending, color: 'border-orange-200 bg-orange-50', icon: '⏳' },
              { label: 'Approved', value: stats.approved, color: 'border-emerald-200 bg-emerald-50', icon: '✅' },
              { label: 'Rejected', value: stats.rejected, color: 'border-red-200 bg-red-50', icon: '❌' },
            ].map((s, i) => (
              <div key={i} className={`bg-white rounded-xl p-4 shadow-sm border ${s.color}`}>
                <p className="text-2xl mb-1">{s.icon}</p>
                <p className="text-2xl font-bold text-gray-900">{s.value}</p>
                <p className="text-xs text-gray-500">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200 mb-6 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or email..."
                className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-cyan-400 outline-none"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter size={16} className="text-gray-400" />
              <select value={filter} onChange={(e) => setFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-cyan-400 outline-none">
                <option value="all">All Requests</option>
                <option value="pending">⏳ Pending</option>
                <option value="approved">✅ Approved</option>
                <option value="rejected">❌ Rejected</option>
              </select>
            </div>
            <span className="text-sm text-gray-500 self-center">{filtered.length} requests</span>
          </div>

          {/* Requests List */}
          {loading ? (
            <div className="flex justify-center py-20">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-cyan-500" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="bg-white rounded-xl p-12 text-center border border-gray-200">
              <Users size={48} className="mx-auto mb-4 text-gray-300" />
              <p className="text-gray-500">No requests found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filtered.map(request => (
                <div key={request.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="p-5">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                          {request.userName?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-900">{request.userName}</h3>
                          <p className="text-sm text-gray-500">{request.userEmail}</p>
                          <p className="text-xs text-gray-400 mt-1">
                            Submitted: {formatDate(request.submittedAt)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                          request.status === 'pending'
                            ? 'bg-orange-100 text-orange-700'
                            : request.status === 'approved'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-red-100 text-red-700'
                        }`}>
                          {request.status === 'pending' ? '⏳ Pending'
                            : request.status === 'approved' ? '✅ Approved'
                            : '❌ Rejected'}
                        </span>
                        <button
                          onClick={() => setExpandedId(expandedId === request.id ? null : request.id)}
                          className="text-xs text-cyan-600 hover:text-cyan-700 font-medium"
                        >
                          {expandedId === request.id ? 'Hide ▲' : 'Review ▼'}
                        </button>
                      </div>
                    </div>

                    {/* Platform badges */}
                    <div className="flex flex-wrap gap-2 mt-4">
                      {request.followedPlatforms?.map(p => {
                        const Icon = PLATFORM_ICONS[p.platform] || Globe;
                        const colorClass = PLATFORM_COLORS[p.platform] || 'text-gray-500 bg-gray-100';
                        return (
                          <div key={p.platform} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium ${colorClass}`}>
                            <Icon size={12} />
                            {p.platformName}: <span className="font-bold">{p.username}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Expanded review section */}
                  {expandedId === request.id && (
                    <div className="border-t border-gray-100 bg-gray-50 p-5">
                      <h4 className="font-semibold text-gray-900 mb-4">Platform Details</h4>
                      <div className="space-y-3 mb-5">
                        {request.followedPlatforms?.map(p => {
                          const Icon = PLATFORM_ICONS[p.platform] || Globe;
                          return (
                            <div key={p.platform} className="bg-white rounded-lg p-3 border border-gray-200 flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <Icon size={18} className={PLATFORM_COLORS[p.platform]?.split(' ')[0] || 'text-gray-500'} />
                                <div>
                                  <p className="text-sm font-semibold text-gray-900">{p.platformName}</p>
                                  <p className="text-xs text-gray-500">Following: {p.handle}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-bold text-gray-900">{p.username}</p>
                                <p className="text-xs text-gray-400">Their username</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {request.status === 'pending' && (
                        <>
                          <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Review Note (optional)
                            </label>
                            <input
                              type="text"
                              value={reviewNote}
                              onChange={(e) => setReviewNote(e.target.value)}
                              placeholder="e.g. Verified all follows manually"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-cyan-400 outline-none"
                            />
                          </div>
                          <div className="flex gap-3">
                            <button
                              onClick={() => handleApprove(request)}
                              disabled={processing === request.id}
                              className="flex-1 flex items-center justify-center gap-2 bg-emerald-500 text-white py-2.5 rounded-xl font-semibold hover:bg-emerald-600 transition disabled:opacity-50 text-sm"
                            >
                              {processing === request.id ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                              ) : (
                                <><CheckCircle size={16} /> Approve & Unlock Credits</>
                              )}
                            </button>
                            <button
                              onClick={() => handleReject(request)}
                              disabled={processing === request.id}
                              className="flex-1 flex items-center justify-center gap-2 bg-red-100 text-red-700 py-2.5 rounded-xl font-semibold hover:bg-red-200 transition disabled:opacity-50 text-sm"
                            >
                              <XCircle size={16} /> Reject
                            </button>
                          </div>
                        </>
                      )}

                      {request.status !== 'pending' && (
                        <div className={`p-3 rounded-lg ${
                          request.status === 'approved' ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'
                        }`}>
                          <p className={`text-sm font-semibold ${request.status === 'approved' ? 'text-emerald-700' : 'text-red-700'}`}>
                            {request.status === 'approved' ? '✅ Approved' : '❌ Rejected'} — {formatDate(request.reviewedAt)}
                          </p>
                          {request.reviewNote && (
                            <p className="text-xs text-gray-600 mt-1">Note: {request.reviewNote}</p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}