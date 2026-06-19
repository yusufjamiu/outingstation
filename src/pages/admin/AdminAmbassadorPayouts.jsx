import { useState, useEffect } from 'react';
import { collection, getDocs, updateDoc, doc, increment } from 'firebase/firestore';
import { db } from '../../firebase';
import { AdminSidebar } from '../../components/AdminSidebar';
import { Menu, Search, Check, Clock, XCircle, Wallet } from 'lucide-react';
import toast from 'react-hot-toast';

const STATUS_COLORS = {
  pending: 'bg-amber-100 text-amber-700',
  paid: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
};

function formatNaira(amount) {
  return `₦${Number(amount || 0).toLocaleString()}`;
}

export default function AdminAmbassadorPayouts() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [requests, setRequests] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => { loadRequests(); }, []);

  const loadRequests = async () => {
    try {
      setLoading(true);
      const snap = await getDocs(collection(db, 'ambassadorPayoutRequests'));
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      data.sort((a, b) => (b.requestedAt?.toDate?.() || 0) - (a.requestedAt?.toDate?.() || 0));
      setRequests(data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load payout requests');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkPaid = async (request) => {
    if (!confirm(`Mark ₦${request.amount?.toLocaleString()} as paid to ${request.ambassadorName}?`)) return;
    try {
      setProcessing(true);

      // Update request status
      await updateDoc(doc(db, 'ambassadorPayoutRequests', request.id), {
        status: 'paid',
        paidAt: new Date(),
      });

      // Deduct from ambassador's available balance and add to totalPaidOut
      await updateDoc(doc(db, 'ambassadorEarnings', request.ambassadorId), {
        availableBalance: increment(-request.amount),
        totalPaidOut: increment(request.amount),
      });

      setRequests(prev =>
        prev.map(r => r.id === request.id ? { ...r, status: 'paid' } : r)
      );
      toast.success(`✅ Payout of ${formatNaira(request.amount)} marked as paid!`);
    } catch (err) {
      console.error(err);
      toast.error('Failed to update payout');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async (request) => {
    if (!confirm(`Reject payout request from ${request.ambassadorName}?`)) return;
    try {
      setProcessing(true);
      await updateDoc(doc(db, 'ambassadorPayoutRequests', request.id), {
        status: 'rejected',
        rejectedAt: new Date(),
      });
      setRequests(prev =>
        prev.map(r => r.id === request.id ? { ...r, status: 'rejected' } : r)
      );
      toast.success('Payout request rejected');
    } catch (err) {
      console.error(err);
      toast.error('Failed to reject request');
    } finally {
      setProcessing(false);
    }
  };

  const filtered = requests.filter(r => {
    const q = searchQuery.toLowerCase();
    const matchSearch = !q ||
      r.ambassadorName?.toLowerCase().includes(q) ||
      r.ambassadorEmail?.toLowerCase().includes(q) ||
      r.bankName?.toLowerCase().includes(q);
    const matchStatus = filterStatus === 'all' || r.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const stats = {
    total: requests.length,
    pending: requests.filter(r => r.status === 'pending').length,
    paid: requests.filter(r => r.status === 'paid').length,
    totalPending: requests.filter(r => r.status === 'pending').reduce((s, r) => s + (r.amount || 0), 0),
  };

  const formatDate = (ts) => {
    if (!ts) return '—';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <AdminSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="flex-1 overflow-auto">
        <header className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-4">
              <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 hover:bg-gray-100 rounded-lg">
                <Menu size={24} />
              </button>
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Ambassador Payouts</h2>
                <p className="text-sm text-gray-500">Review and process ambassador payout requests</p>
              </div>
            </div>
            <button onClick={loadRequests} className="text-sm text-cyan-600 hover:text-cyan-700 font-medium">↻ Refresh</button>
          </div>
        </header>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500" />
          </div>
        ) : (
          <div className="p-4 sm:p-6 lg:p-8">

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              {[
                { label: 'Total Requests', value: stats.total, color: 'text-cyan-600', bg: 'bg-cyan-50', icon: '📋' },
                { label: 'Pending', value: stats.pending, color: 'text-amber-600', bg: 'bg-amber-50', icon: '⏳' },
                { label: 'Paid', value: stats.paid, color: 'text-green-600', bg: 'bg-green-50', icon: '✅' },
                { label: 'Pending Amount', value: formatNaira(stats.totalPending), color: 'text-red-600', bg: 'bg-red-50', icon: '💰' },
              ].map((s, i) => (
                <div key={i} className={`${s.bg} rounded-xl p-4 border border-gray-100`}>
                  <div className="text-2xl mb-1">{s.icon}</div>
                  <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
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
                  placeholder="Search by name, email or bank..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-cyan-400"
                />
              </div>
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-cyan-400 bg-white">
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="paid">Paid</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>

            {/* Requests list */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {filtered.length === 0 ? (
                <div className="text-center py-16">
                  <Wallet className="mx-auto text-gray-300 mb-3" size={48} />
                  <p className="text-gray-500">No payout requests found</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {filtered.map(request => (
                    <div key={request.id} className="p-4 sm:p-5 hover:bg-gray-50/60 transition">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <p className="font-semibold text-gray-900">{request.ambassadorName}</p>
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[request.status] || STATUS_COLORS.pending}`}>
                              {request.status === 'pending' && <Clock size={11} />}
                              {request.status === 'paid' && <Check size={11} />}
                              {request.status === 'rejected' && <XCircle size={11} />}
                              {request.status || 'pending'}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 mb-1">{request.ambassadorEmail}</p>
                          <p className="text-xs text-gray-400">Requested {formatDate(request.requestedAt)}</p>

                          {/* Bank details */}
                          <div className="mt-3 bg-gray-50 rounded-lg p-3 text-xs space-y-1">
                            <p className="text-gray-600">Bank: <strong>{request.bankName || '—'}</strong></p>
                            <p className="text-gray-600">Account: <strong className="font-mono">{request.accountNumber || '—'}</strong></p>
                            <p className="text-gray-600">Name: <strong>{request.accountName || '—'}</strong></p>
                          </div>
                        </div>

                        <div className="text-right flex-shrink-0">
                          <p className="text-xl font-black text-cyan-600 mb-3">{formatNaira(request.amount)}</p>
                          {request.status === 'pending' && (
                            <div className="flex flex-col gap-2">
                              <button onClick={() => handleMarkPaid(request)} disabled={processing}
                                className="px-4 py-2 bg-green-500 text-white rounded-lg text-xs font-semibold hover:bg-green-600 transition disabled:opacity-50 flex items-center gap-1.5 justify-center">
                                <Check size={13} /> Mark Paid
                              </button>
                              <button onClick={() => handleReject(request)} disabled={processing}
                                className="px-4 py-2 bg-red-50 text-red-600 rounded-lg text-xs font-semibold hover:bg-red-100 transition disabled:opacity-50">
                                Reject
                              </button>
                            </div>
                          )}
                          {request.status === 'paid' && (
                            <p className="text-xs text-green-600 font-medium">Paid {formatDate(request.paidAt)}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}