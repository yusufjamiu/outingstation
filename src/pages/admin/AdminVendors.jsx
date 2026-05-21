import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, Plus, Edit, Trash2, Eye, EyeOff, ShoppingBag, Search, Check, X, Clock } from 'lucide-react';
import { AdminSidebar } from '../../components/AdminSidebar';
import { collection, getDocs, deleteDoc, doc, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';

const VENDOR_CATEGORIES = [
  'Food & Drinks',
  'Fashion & Clothing',
  'Electronics & Gadgets',
  'Beauty & Grooming',
  'Books & Stationery',
  'Accessories',
];

export default function AdminVendors() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('active'); // ✅ active | pending
  const [vendors, setVendors] = useState([]);
  const [pendingVendors, setPendingVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterUniversity, setFilterUniversity] = useState('All');
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');

  useEffect(() => {
    loadVendors();
    loadPendingVendors();
  }, []);

  const loadVendors = async () => {
    try {
      setLoading(true);
      const snapshot = await getDocs(collection(db, 'vendors'));
      const allVendors = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setVendors(allVendors);
    } catch (err) {
      console.error('Error loading vendors:', err);
    }
    setLoading(false);
  };

  const loadPendingVendors = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'vendor_submissions'));
      const pending = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(v => v.status === 'pending');
      setPendingVendors(pending);
    } catch (err) {
      console.error('Error loading pending vendors:', err);
    }
  };

  const handleDelete = async (vendorId) => {
    if (!window.confirm('Are you sure you want to delete this vendor?')) return;
    try {
      await deleteDoc(doc(db, 'vendors', vendorId));
      setVendors(prev => prev.filter(v => v.id !== vendorId));
    } catch (err) {
      console.error('Error deleting vendor:', err);
    }
  };

  const handleToggleStatus = async (vendor) => {
    const newStatus = vendor.status === 'active' ? 'inactive' : 'active';
    try {
      await updateDoc(doc(db, 'vendors', vendor.id), { status: newStatus });
      setVendors(prev => prev.map(v =>
        v.id === vendor.id ? { ...v, status: newStatus } : v
      ));
    } catch (err) {
      console.error('Error updating vendor status:', err);
    }
  };

  // ✅ Approve vendor submission
  const handleApprove = async (submission) => {
    try {
      // Add to vendors collection
      await addDoc(collection(db, 'vendors'), {
        shopName: submission.shopName,
        description: submission.description,
        category: submission.category,
        university: submission.university,
        whatsappNumber: submission.whatsappNumber,
        imageUrl: submission.imageUrl || null,
        status: 'active',
        createdAt: serverTimestamp(),
        approvedAt: serverTimestamp(),
        submittedBy: submission.organizerEmail || null,
      });

      // Update submission status
      await updateDoc(doc(db, 'vendor_submissions', submission.id), {
        status: 'approved',
        approvedAt: serverTimestamp(),
      });

      // Remove from pending list
      setPendingVendors(prev => prev.filter(v => v.id !== submission.id));

      // Reload vendors
      loadVendors();

      alert(`✅ ${submission.shopName} approved and is now live!`);
    } catch (err) {
      console.error('Error approving vendor:', err);
      alert('❌ Error approving vendor');
    }
  };

  // ✅ Reject vendor submission
  const handleReject = async (submission) => {
    if (!window.confirm(`Reject ${submission.shopName}?`)) return;
    try {
      await updateDoc(doc(db, 'vendor_submissions', submission.id), {
        status: 'rejected',
        rejectedAt: serverTimestamp(),
      });
      setPendingVendors(prev => prev.filter(v => v.id !== submission.id));
      alert(`❌ ${submission.shopName} rejected.`);
    } catch (err) {
      console.error('Error rejecting vendor:', err);
    }
  };

  const filteredVendors = vendors.filter(vendor => {
    const matchesSearch =
      vendor.shopName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      vendor.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      vendor.university?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesUniversity = filterUniversity === 'All' || vendor.university === filterUniversity;
    const matchesCategory = filterCategory === 'All' || vendor.category === filterCategory;
    const matchesStatus = filterStatus === 'All' || vendor.status === filterStatus;
    return matchesSearch && matchesUniversity && matchesCategory && matchesStatus;
  });

  const activeCount = vendors.filter(v => v.status === 'active').length;
  const inactiveCount = vendors.filter(v => v.status === 'inactive').length;
  const vendorUniversities = [...new Set(vendors.map(v => v.university).filter(Boolean))];

  return (
    <div className="flex h-screen bg-gray-50">
      <AdminSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="flex-1 overflow-auto">
        <header className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 hover:bg-gray-100 rounded-lg">
                <Menu size={24} />
              </button>
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Manage Vendors</h2>
                <p className="text-sm text-gray-500">
                  {filteredVendors.length} of {vendors.length} vendors shown
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => { loadVendors(); loadPendingVendors(); }}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition text-sm">
                Refresh
              </button>
              <button onClick={() => navigate('/admin/vendors/create')}
                className="flex items-center gap-2 px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition text-sm font-medium">
                <Plus size={18} />
                Add Vendor
              </button>
            </div>
          </div>

          {/* ✅ Tabs */}
          <div className="mt-4 flex gap-2">
            <button
              onClick={() => setActiveTab('active')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                activeTab === 'active'
                  ? 'bg-cyan-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Active Vendors ({vendors.length})
            </button>
            <button
              onClick={() => setActiveTab('pending')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 ${
                activeTab === 'pending'
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Clock size={14} />
              Pending Review ({pendingVendors.length})
              {pendingVendors.length > 0 && (
                <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                  {pendingVendors.length}
                </span>
              )}
            </button>
          </div>

          {/* Filters — only for active tab */}
          {activeTab === 'active' && (
            <div className="mt-4 flex flex-col sm:flex-row gap-3">
              <div className="flex-1 relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search vendors..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 outline-none text-sm"
                />
              </div>
              <select value={filterUniversity} onChange={(e) => setFilterUniversity(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 outline-none text-sm">
                <option value="All">All Universities</option>
                {vendorUniversities.map(uni => (
                  <option key={uni} value={uni}>{uni}</option>
                ))}
              </select>
              <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 outline-none text-sm">
                <option value="All">All Categories</option>
                {VENDOR_CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 outline-none text-sm">
                <option value="All">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          )}
        </header>

        <div className="p-4 sm:p-6 lg:p-8">

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-xl p-4 border border-gray-200">
              <p className="text-2xl font-bold text-gray-900">{vendors.length}</p>
              <p className="text-sm text-gray-500 mt-1">Total Vendors</p>
            </div>
            <div className="bg-white rounded-xl p-4 border border-gray-200">
              <p className="text-2xl font-bold text-emerald-600">{activeCount}</p>
              <p className="text-sm text-gray-500 mt-1">Active</p>
            </div>
            <div className="bg-white rounded-xl p-4 border border-gray-200">
              <p className="text-2xl font-bold text-orange-500">{pendingVendors.length}</p>
              <p className="text-sm text-gray-500 mt-1">Pending Review</p>
            </div>
            <div className="bg-white rounded-xl p-4 border border-gray-200">
              <p className="text-2xl font-bold text-purple-600">{vendorUniversities.length}</p>
              <p className="text-sm text-gray-500 mt-1">Universities</p>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-cyan-500"></div>
            </div>
          ) : activeTab === 'active' ? (

            // ✅ ACTIVE VENDORS TAB
            filteredVendors.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-xl border border-gray-200">
                <ShoppingBag size={48} className="text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg font-medium">No vendors found</p>
                <p className="text-gray-400 text-sm mt-1">Add your first vendor to get started</p>
                <button onClick={() => navigate('/admin/vendors/create')}
                  className="inline-flex items-center gap-2 mt-4 bg-cyan-500 text-white px-4 py-2 rounded-lg hover:bg-cyan-600 transition text-sm font-medium">
                  <Plus size={16} />
                  Add Vendor
                </button>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        {['Vendor', 'Category', 'University', 'WhatsApp', 'Status', 'Actions'].map(h => (
                          <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredVendors.map(vendor => (
                        <tr key={vendor.id} className="hover:bg-gray-50 transition">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <img
                                src={vendor.imageUrl || 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=100'}
                                alt={vendor.shopName}
                                className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                                onError={(e) => e.target.src = 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=100'}
                              />
                              <div>
                                <p className="font-medium text-gray-900 text-sm">{vendor.shopName}</p>
                                <p className="text-xs text-gray-400 line-clamp-1">{vendor.description}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-cyan-100 text-cyan-700 whitespace-nowrap">
                              {vendor.category}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                            🏛️ {vendor.university || '—'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                            {vendor.whatsappNumber || '—'}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-xs px-2.5 py-1 rounded-full font-medium whitespace-nowrap ${
                              vendor.status === 'active'
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-red-100 text-red-600'
                            }`}>
                              {vendor.status === 'active' ? '✅ Active' : '❌ Inactive'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              <button onClick={() => handleToggleStatus(vendor)}
                                className="p-1.5 hover:bg-gray-100 rounded-lg transition text-gray-500"
                                title={vendor.status === 'active' ? 'Deactivate' : 'Activate'}>
                                {vendor.status === 'active' ? <EyeOff size={15} /> : <Eye size={15} />}
                              </button>
                              <button onClick={() => navigate(`/admin/vendors/edit/${vendor.id}`)}
                                className="p-1.5 hover:bg-blue-50 rounded-lg transition text-blue-600" title="Edit">
                                <Edit size={15} />
                              </button>
                              <button onClick={() => handleDelete(vendor.id)}
                                className="p-1.5 hover:bg-red-50 rounded-lg transition text-red-500" title="Delete">
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="px-4 py-3 border-t border-gray-100 text-sm text-gray-500">
                  Showing {filteredVendors.length} of {vendors.length} vendors
                </div>
              </div>
            )

          ) : (

            // ✅ PENDING VENDORS TAB
            pendingVendors.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-xl border border-gray-200">
                <Clock size={48} className="text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg font-medium">No pending submissions</p>
                <p className="text-gray-400 text-sm mt-1">New vendor registrations will appear here</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {pendingVendors.map(submission => (
                  <div key={submission.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">

                    {/* Shop Image */}
                    <div className="relative h-40">
                      <img
                        src={submission.imageUrl || 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=400'}
                        alt={submission.shopName}
                        className="w-full h-full object-cover"
                        onError={(e) => e.target.src = 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=400'}
                      />
                      <div className="absolute top-3 left-3">
                        <span className="bg-orange-500 text-white text-xs px-2.5 py-1 rounded-full font-medium">
                          ⏳ Pending
                        </span>
                      </div>
                    </div>

                    {/* Info */}
                    <div className="p-4">
                      <h3 className="font-bold text-gray-900 mb-1">{submission.shopName}</h3>
                      <p className="text-xs text-gray-500 mb-3 line-clamp-2">{submission.description}</p>

                      <div className="space-y-1 mb-3">
                        <div className="flex items-center gap-2 text-xs text-gray-600">
                          <span className="font-medium">Category:</span>
                          <span className="bg-cyan-100 text-cyan-700 px-2 py-0.5 rounded-full">{submission.category}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-600">
                          <span className="font-medium">University:</span>
                          <span>🏛️ {submission.university}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-600">
                          <span className="font-medium">WhatsApp:</span>
                          <span>📱 {submission.whatsappNumber}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-600">
                          <span className="font-medium">Submitted by:</span>
                          <span>{submission.organizerEmail || submission.organizerName || '—'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-600">
                          <span className="font-medium">Phone:</span>
                          <span>{submission.organizerPhone || '—'}</span>
                        </div>
                      </div>

                      {/* Approve/Reject buttons */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleApprove(submission)}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-semibold transition"
                        >
                          <Check size={15} />
                          Approve
                        </button>
                        <button
                          onClick={() => handleReject(submission)}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-semibold transition"
                        >
                          <X size={15} />
                          Reject
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      </main>
    </div>
  );
}