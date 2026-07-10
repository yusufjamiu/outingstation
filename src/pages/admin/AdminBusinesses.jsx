import { useState, useEffect } from 'react';
import { Menu, Store, CheckCircle, XCircle, Clock, Phone, MapPin, DollarSign } from 'lucide-react';
import { AdminSidebar } from '../../components/AdminSidebar';
import { collection, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import toast from 'react-hot-toast';

const TABS = ['pending', 'approved', 'rejected', 'all'];

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

  // ✅ NEW — was completely missing; revoke/re-approve already existed
  // (via handleDecision above) but there was no way to permanently delete
  // a business record at all, regardless of status.
  const handleDelete = async (id, businessName) => {
    if (!window.confirm(`Permanently delete "${businessName}"? This can't be undone.`)) return;
    setUpdatingId(id);
    try {
      await deleteDoc(doc(db, 'businesses', id));
      setBusinesses(prev => prev.filter(b => b.id !== id));
      toast.success('Business deleted');
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete business');
    }
    setUpdatingId('');
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
            <div className="flex gap-2 mb-6">
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
                            <h3 className="font-bold text-gray-900">{biz.businessName}</h3>
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

                        {/* ✅ NEW — always available, any status */}
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