import { useState, useEffect } from 'react';
import { collection, getDocs, orderBy, query, updateDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase';
import { AdminSidebar } from '../../components/AdminSidebar';
import { Menu, Star, Search, CheckCircle, X, Clock, Filter, Eye, Download } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminAmbassadors() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [applications, setApplications] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedApp, setSelectedApp] = useState(null);
  const [processing, setProcessing] = useState(false);

  const stats = {
    total: applications.length,
    pending: applications.filter(a => a.status === 'pending').length,
    approved: applications.filter(a => a.status === 'approved').length,
    rejected: applications.filter(a => a.status === 'rejected').length,
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  useEffect(() => {
    let result = [...applications];
    if (statusFilter !== 'all') {
      result = result.filter(a => a.status === statusFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(a =>
        a.fullName?.toLowerCase().includes(q) ||
        a.email?.toLowerCase().includes(q) ||
        a.city?.toLowerCase().includes(q) ||
        a.university?.toLowerCase().includes(q)
      );
    }
    setFiltered(result);
  }, [applications, statusFilter, searchQuery]);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const q = query(collection(db, 'ambassadorApplications'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data(),
        createdAt: d.data().createdAt?.toDate?.()?.toLocaleDateString('en-US', {
          day: 'numeric', month: 'short', year: 'numeric'
        }) || 'Unknown'
      }));
      setApplications(data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load applications');
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id, status) => {
    try {
      setProcessing(true);
      await updateDoc(doc(db, 'ambassadorApplications', id), {
        status,
        reviewedAt: new Date()
      });
      setApplications(prev => prev.map(a => a.id === id ? { ...a, status } : a));
      if (selectedApp?.id === id) setSelectedApp(prev => ({ ...prev, status }));
      toast.success(status === 'approved' ? '✅ Application approved!' : '❌ Application rejected');
    } catch (err) {
      toast.error('Failed to update status');
    } finally {
      setProcessing(false);
    }
  };

  const exportCSV = () => {
    const headers = ['Name', 'Email', 'Phone', 'City', 'University', 'Instagram', 'TikTok', 'Twitter', 'Followers', 'Status', 'Applied'];
    const rows = filtered.map(a => [
      a.fullName, a.email, a.phone, a.city, a.university || 'N/A',
      a.instagram || 'N/A', a.tiktok || 'N/A', a.twitter || 'N/A',
      a.followers, a.status, a.createdAt
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ambassador-applications-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Exported!');
  };

  const statusBadge = (status) => {
    const map = {
      pending: 'bg-yellow-100 text-yellow-700',
      approved: 'bg-green-100 text-green-700',
      rejected: 'bg-red-100 text-red-700',
    };
    const icons = { pending: '⏳', approved: '✅', rejected: '❌' };
    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${map[status] || 'bg-gray-100 text-gray-600'}`}>
        {icons[status]} {status?.charAt(0).toUpperCase() + status?.slice(1)}
      </span>
    );
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <AdminSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="flex-1 overflow-auto">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 hover:bg-gray-100 rounded-lg">
                <Menu size={24} />
              </button>
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Ambassador Applications</h2>
                <p className="text-sm text-gray-500">Review and approve ambassador candidates</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={fetchApplications} className="text-sm text-cyan-600 hover:text-cyan-700 font-medium">↻ Refresh</button>
              <button onClick={exportCSV} disabled={filtered.length === 0}
                className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition text-sm disabled:opacity-50">
                <Download size={16} /> Export
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
                { label: 'Pending', value: stats.pending, color: 'text-yellow-600', bg: 'bg-yellow-50', icon: '⏳' },
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
            <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6 flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search by name, email, city..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-cyan-400"
                />
              </div>
              <div className="flex items-center gap-2">
                <Filter size={18} className="text-gray-400" />
                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  className="px-4 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-cyan-400"
                >
                  <option value="all">All Applications</option>
                  <option value="pending">⏳ Pending</option>
                  <option value="approved">✅ Approved</option>
                  <option value="rejected">❌ Rejected</option>
                </select>
              </div>
              <p className="text-sm text-gray-500 self-center">{filtered.length} applications</p>
            </div>

            <div className="flex gap-6">
              {/* Applications List */}
              <div className="flex-1 bg-white rounded-xl border border-gray-200 overflow-hidden">
                {filtered.length === 0 ? (
                  <div className="text-center py-16">
                    <Star className="mx-auto text-gray-300 mb-3" size={48} />
                    <p className="text-gray-500">No applications found</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {filtered.map(app => (
                      <div
                        key={app.id}
                        onClick={() => setSelectedApp(app)}
                        className={`p-4 sm:p-5 cursor-pointer hover:bg-gray-50 transition ${selectedApp?.id === app.id ? 'bg-cyan-50 border-l-4 border-cyan-400' : ''}`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3 flex-1">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-white font-bold flex-shrink-0">
                              {app.fullName?.charAt(0)?.toUpperCase() || '?'}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-gray-900 truncate">{app.fullName}</p>
                              <p className="text-xs text-gray-500 truncate">{app.email}</p>
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                <span className="text-xs text-gray-400">📍 {app.city}</span>
                                {app.university && <span className="text-xs text-gray-400">🎓 {app.university}</span>}
                                <span className="text-xs text-gray-400">👥 {app.followers}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-2 flex-shrink-0">
                            {statusBadge(app.status)}
                            <span className="text-xs text-gray-400">{app.createdAt}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Detail Panel */}
              {selectedApp && (
                <div className="w-96 hidden lg:block">
                  <div className="bg-white rounded-xl border border-gray-200 overflow-hidden sticky top-4">
                    <div className="bg-gradient-to-r from-cyan-500 to-cyan-600 p-5">
                      <div className="flex items-center justify-between mb-3">
                        <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-xl">
                          {selectedApp.fullName?.charAt(0)?.toUpperCase()}
                        </div>
                        <button onClick={() => setSelectedApp(null)} className="text-white/70 hover:text-white">
                          <X size={20} />
                        </button>
                      </div>
                      <h3 className="text-white font-bold text-lg">{selectedApp.fullName}</h3>
                      <p className="text-cyan-100 text-sm">{selectedApp.email}</p>
                      <div className="mt-2">{statusBadge(selectedApp.status)}</div>
                    </div>

                    <div className="p-5 overflow-y-auto max-h-[calc(100vh-300px)]">
                      <div className="space-y-4">
                        <div>
                          <p className="text-xs font-semibold text-gray-400 uppercase mb-2">Contact</p>
                          <p className="text-sm text-gray-700">📞 {selectedApp.phone}</p>
                          <p className="text-sm text-gray-700">📍 {selectedApp.city}</p>
                          {selectedApp.university && <p className="text-sm text-gray-700">🎓 {selectedApp.university}</p>}
                        </div>

                        <div>
                          <p className="text-xs font-semibold text-gray-400 uppercase mb-2">Social Media</p>
                          {selectedApp.instagram && <p className="text-sm text-gray-700">📸 @{selectedApp.instagram}</p>}
                          {selectedApp.tiktok && <p className="text-sm text-gray-700">🎵 @{selectedApp.tiktok}</p>}
                          {selectedApp.twitter && <p className="text-sm text-gray-700">🐦 @{selectedApp.twitter}</p>}
                          <p className="text-sm text-gray-700">👥 {selectedApp.followers} followers</p>
                        </div>

                        <div>
                          <p className="text-xs font-semibold text-gray-400 uppercase mb-2">Why Ambassador?</p>
                          <p className="text-sm text-gray-700 leading-relaxed">{selectedApp.whyAmbassador}</p>
                        </div>

                        <div>
                          <p className="text-xs font-semibold text-gray-400 uppercase mb-2">How They'll Promote</p>
                          <p className="text-sm text-gray-700 leading-relaxed">{selectedApp.howPromote}</p>
                        </div>

                        {selectedApp.expectedReferrals && (
                          <div>
                            <p className="text-xs font-semibold text-gray-400 uppercase mb-2">Expected Referrals/Month</p>
                            <p className="text-sm text-gray-700">{selectedApp.expectedReferrals}</p>
                          </div>
                        )}

                        <div>
                          <p className="text-xs font-semibold text-gray-400 uppercase mb-2">Applied</p>
                          <p className="text-sm text-gray-700">{selectedApp.createdAt}</p>
                        </div>
                      </div>

                      {/* Actions */}
                      {selectedApp.status === 'pending' && (
                        <div className="flex gap-3 mt-6">
                          <button
                            onClick={() => updateStatus(selectedApp.id, 'approved')}
                            disabled={processing}
                            className="flex-1 flex items-center justify-center gap-2 py-3 bg-green-500 text-white rounded-xl font-semibold hover:bg-green-600 transition disabled:opacity-50 text-sm"
                          >
                            <CheckCircle size={16} />
                            Approve
                          </button>
                          <button
                            onClick={() => updateStatus(selectedApp.id, 'rejected')}
                            disabled={processing}
                            className="flex-1 flex items-center justify-center gap-2 py-3 bg-red-100 text-red-700 rounded-xl font-semibold hover:bg-red-200 transition disabled:opacity-50 text-sm"
                          >
                            <X size={16} />
                            Reject
                          </button>
                        </div>
                      )}

                      {selectedApp.status === 'approved' && (
                        <div className="mt-6 p-3 bg-green-50 border border-green-200 rounded-xl">
                          <p className="text-xs text-green-700 font-medium">
                            ✅ Approved! Go to <strong>Users</strong> page to grant Ambassador status.
                          </p>
                        </div>
                      )}

                      {selectedApp.status === 'rejected' && (
                        <button
                          onClick={() => updateStatus(selectedApp.id, 'pending')}
                          disabled={processing}
                          className="w-full mt-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition text-sm"
                        >
                          Move Back to Pending
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}