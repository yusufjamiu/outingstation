import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, Plus, Edit, Trash2, Eye, EyeOff, ShoppingBag, Search, Check, X, Clock, Flag, Gift, ChevronLeft, ChevronRight, Image } from 'lucide-react';
import { AdminSidebar } from '../../components/AdminSidebar';
import { collection, getDocs, deleteDoc, doc, updateDoc, addDoc, serverTimestamp, query, where, increment } from 'firebase/firestore';
import { db } from '../../firebase';

const VENDOR_CATEGORIES = [
  'Food & Drinks', 'Fashion & Clothing', 'Electronics & Gadgets',
  'Beauty & Grooming', 'Books & Stationery', 'Accessories',
];

const REASON_LABELS = {
  inactive: '🚫 Shop no longer exists / closed',
  scam: '⚠️ Scam / Fraud',
  wrong_contact: '📱 Wrong WhatsApp number',
  wrong_location: '📍 Wrong university / location',
  fake: '🤥 Fake listing',
  other: '💬 Other reason',
};

// ✅ Reusable image carousel for vendor photos
function VendorImageCarousel({ images, height = 'h-40' }) {
  const [index, setIndex] = useState(0);
  if (!images || images.length === 0) return (
    <div className={`${height} bg-gray-100 flex items-center justify-center`}>
      <ShoppingBag size={32} className="text-gray-300" />
    </div>
  );
  return (
    <div className={`relative ${height} group overflow-hidden`}>
      <img src={images[index]} alt="" className="w-full h-full object-cover"
        onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=400'; }} />
      {images.length > 1 && (
        <>
          <button onClick={(e) => { e.stopPropagation(); setIndex(i => (i - 1 + images.length) % images.length); }}
            className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition">
            <ChevronLeft size={14} />
          </button>
          <button onClick={(e) => { e.stopPropagation(); setIndex(i => (i + 1) % images.length); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition">
            <ChevronRight size={14} />
          </button>
          <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1">
            {images.map((_, i) => (
              <button key={i} onClick={(e) => { e.stopPropagation(); setIndex(i); }}
                className={`rounded-full transition-all ${i === index ? 'w-3 h-1.5 bg-white' : 'w-1.5 h-1.5 bg-white/50'}`} />
            ))}
          </div>
          <div className="absolute top-2 left-2 bg-black/50 text-white text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
            <Image size={9} />{index + 1}/{images.length}
          </div>
        </>
      )}
    </div>
  );
}

export default function AdminVendors() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('active');
  const [vendors, setVendors] = useState([]);
  const [pendingVendors, setPendingVendors] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterUniversity, setFilterUniversity] = useState('All');
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');

  // ✅ Detail modal for pending vendor
  const [selectedPending, setSelectedPending] = useState(null);
  const [approving, setApproving] = useState(false);

  useEffect(() => {
    loadVendors();
    loadPendingVendors();
    loadReports();
  }, []);

  const loadVendors = async () => {
    try {
      setLoading(true);
      const snapshot = await getDocs(collection(db, 'vendors'));
      setVendors(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (err) {
      console.error('Error loading vendors:', err);
    }
    setLoading(false);
  };

  const loadPendingVendors = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'vendor_submissions'));
      setPendingVendors(snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(v => v.status === 'pending')
        .sort((a, b) => (b.submittedAt?.seconds || 0) - (a.submittedAt?.seconds || 0)));
    } catch (err) {
      console.error('Error loading pending vendors:', err);
    }
  };

  const loadReports = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'vendor_reports'));
      setReports(snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(r => r.status === 'pending')
        .sort((a, b) => (b.reportedAt?.seconds || 0) - (a.reportedAt?.seconds || 0)));
    } catch (err) {
      console.error('Error loading reports:', err);
    }
  };

  // ✅ Award ₦100 referral credit
  const awardReferralCredit = async (referralCode) => {
    if (!referralCode) return null;
    try {
      const q = query(collection(db, 'users'), where('referralCode', '==', referralCode.toUpperCase()));
      const snap = await getDocs(q);
      if (snap.empty) return null;
      const userDoc = snap.docs[0];
      const userName = userDoc.data().name || 'User';
      const newCredit = {
        id: `credit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        amount: 100, originalAmount: 100,
        reason: 'Vendor listing reward',
        earnedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'active', usedAmount: 0
      };
      await updateDoc(doc(db, 'users', userDoc.id), {
        creditsHistory: [...(userDoc.data().creditsHistory || []), newCredit],
        totalCredits: increment(100),
        updatedAt: new Date()
      });
      return userName;
    } catch (err) {
      console.error('Error awarding credit:', err);
      return null;
    }
  };

  // ✅ Get all images from a submission/vendor (main + additional)
  const getAllImages = (item) => {
    const all = [];
    if (item.imageUrl) all.push(item.imageUrl);
    if (item.images?.length) item.images.forEach(img => { if (img && !all.includes(img)) all.push(img); });
    return all;
  };

  // ✅ Approve vendor — saves imageUrl + images[] + referral credit
  const handleApprove = async (submission) => {
    setApproving(true);
    try {
      const allImages = getAllImages(submission);
      const [mainImage = null, ...additionalImages] = allImages;

      const vendorRef = await addDoc(collection(db, 'vendors'), {
        shopName: submission.shopName,
        description: submission.description,
        category: submission.category,
        university: submission.university,
        whatsappNumber: submission.whatsappNumber,
        imageUrl: mainImage,
        images: additionalImages,
        likeCount: 0,
        reportCount: 0,
        status: 'active',
        createdAt: serverTimestamp(),
        approvedAt: serverTimestamp(),
        submittedBy: submission.organizerEmail || null,
        organizerName: submission.organizerName || null,
        organizerPhone: submission.organizerPhone || null,
        submissionId: submission.id,
      });

      await updateDoc(doc(db, 'vendor_submissions', submission.id), {
        status: 'approved',
        approvedVendorId: vendorRef.id,
        approvedAt: serverTimestamp(),
      });

      // ✅ Award referral credit
      let creditMsg = '';
      if (submission.referralCode) {
        const awardedTo = await awardReferralCredit(submission.referralCode);
        creditMsg = awardedTo
          ? `\n✅ Awarded ₦100 credit to ${awardedTo}`
          : `\n⚠️ Referral code "${submission.referralCode}" not found`;
      }

      setPendingVendors(prev => prev.filter(v => v.id !== submission.id));
      setSelectedPending(null);
      loadVendors();
      alert(`✅ ${submission.shopName} is now LIVE!\n${allImages.length} photo${allImages.length !== 1 ? 's' : ''} published${creditMsg}`);
    } catch (err) {
      console.error('Error approving vendor:', err);
      alert('❌ Error approving vendor: ' + err.message);
    } finally {
      setApproving(false);
    }
  };

  const handleReject = async (submission) => {
    if (!window.confirm(`Reject ${submission.shopName}?`)) return;
    try {
      await updateDoc(doc(db, 'vendor_submissions', submission.id), {
        status: 'rejected',
        rejectedAt: serverTimestamp(),
      });
      setPendingVendors(prev => prev.filter(v => v.id !== submission.id));
      setSelectedPending(null);
    } catch (err) {
      console.error('Error rejecting vendor:', err);
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
      setVendors(prev => prev.map(v => v.id === vendor.id ? { ...v, status: newStatus } : v));
    } catch (err) {
      console.error('Error updating vendor status:', err);
    }
  };

  const handleDismissReport = async (report) => {
    try {
      await updateDoc(doc(db, 'vendor_reports', report.id), {
        status: 'dismissed', reviewedAt: serverTimestamp(),
      });
      setReports(prev => prev.filter(r => r.id !== report.id));
    } catch (err) {
      console.error('Error dismissing report:', err);
    }
  };

  const handleDeactivateFromReport = async (report) => {
    if (!window.confirm(`Deactivate ${report.shopName} based on this report?`)) return;
    try {
      await updateDoc(doc(db, 'vendors', report.vendorId), { status: 'inactive' });
      await updateDoc(doc(db, 'vendor_reports', report.id), {
        status: 'resolved', reviewedAt: serverTimestamp(),
      });
      setReports(prev => prev.filter(r => r.id !== report.id));
      loadVendors();
      alert(`✅ ${report.shopName} has been deactivated.`);
    } catch (err) {
      console.error('Error deactivating vendor:', err);
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
  const vendorUniversities = [...new Set(vendors.map(v => v.university).filter(Boolean))];

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch { return 'N/A'; }
  };

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
                <p className="text-sm text-gray-500">{filteredVendors.length} of {vendors.length} vendors shown</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => { loadVendors(); loadPendingVendors(); loadReports(); }}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition text-sm">
                Refresh
              </button>
              <button onClick={() => navigate('/admin/vendors/create')}
                className="flex items-center gap-2 px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition text-sm font-medium">
                <Plus size={18} />Add Vendor
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="mt-4 flex gap-2 flex-wrap">
            <button onClick={() => setActiveTab('active')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${activeTab === 'active' ? 'bg-cyan-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              Active Vendors ({vendors.length})
            </button>
            <button onClick={() => setActiveTab('pending')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 ${activeTab === 'pending' ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              <Clock size={14} />Pending ({pendingVendors.length})
              {pendingVendors.length > 0 && (
                <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">{pendingVendors.length}</span>
              )}
            </button>
            <button onClick={() => setActiveTab('reports')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 ${activeTab === 'reports' ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              <Flag size={14} />Reports ({reports.length})
              {reports.length > 0 && (
                <span className="bg-red-600 text-white text-xs px-1.5 py-0.5 rounded-full">{reports.length}</span>
              )}
            </button>
          </div>

          {/* Filters — active tab only */}
          {activeTab === 'active' && (
            <div className="mt-4 flex flex-col sm:flex-row gap-3">
              <div className="flex-1 relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="text" placeholder="Search vendors..." value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 outline-none text-sm" />
              </div>
              <select value={filterUniversity} onChange={(e) => setFilterUniversity(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 outline-none text-sm">
                <option value="All">All Universities</option>
                {vendorUniversities.map(uni => <option key={uni} value={uni}>{uni}</option>)}
              </select>
              <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 outline-none text-sm">
                <option value="All">All Categories</option>
                {VENDOR_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
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
              <p className="text-2xl font-bold text-red-500">{reports.length}</p>
              <p className="text-sm text-gray-500 mt-1">Pending Reports</p>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-cyan-500"></div>
            </div>

          ) : activeTab === 'active' ? (
            // ── ACTIVE VENDORS TAB ──────────────────────────────────────
            filteredVendors.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-xl border border-gray-200">
                <ShoppingBag size={48} className="text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg font-medium">No vendors found</p>
                <button onClick={() => navigate('/admin/vendors/create')}
                  className="inline-flex items-center gap-2 mt-4 bg-cyan-500 text-white px-4 py-2 rounded-lg hover:bg-cyan-600 transition text-sm font-medium">
                  <Plus size={16} />Add Vendor
                </button>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        {['Vendor', 'Category', 'University', 'Photos', 'WhatsApp', 'Status', 'Actions'].map(h => (
                          <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredVendors.map(vendor => {
                        const allImages = getAllImages(vendor);
                        return (
                          <tr key={vendor.id} className="hover:bg-gray-50 transition">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                {/* ✅ Show main image with photo count */}
                                <div className="relative flex-shrink-0">
                                  <img
                                    src={vendor.imageUrl || 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=100'}
                                    alt={vendor.shopName}
                                    className="w-12 h-12 rounded-lg object-cover"
                                    onError={(e) => e.target.src = 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=100'}
                                  />
                                  {allImages.length > 1 && (
                                    <div className="absolute -bottom-1 -right-1 bg-gray-700 text-white text-xs px-1 py-0.5 rounded-full flex items-center gap-0.5">
                                      <Image size={8} />{allImages.length}
                                    </div>
                                  )}
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <p className="font-medium text-gray-900 text-sm">{vendor.shopName}</p>
                                    {vendor.reportCount > 0 && (
                                      <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-600 font-medium">
                                        🚩 {vendor.reportCount}
                                      </span>
                                    )}
                                    {vendor.likeCount > 0 && (
                                      <span className="text-xs px-2 py-0.5 rounded-full bg-pink-100 text-pink-600 font-medium">
                                        ❤️ {vendor.likeCount}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-gray-400 line-clamp-1 max-w-[180px]">{vendor.description}</p>
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
                            {/* ✅ Photos column */}
                            <td className="px-4 py-3">
                              <span className="text-xs text-gray-500 flex items-center gap-1">
                                <Image size={12} />{allImages.length} photo{allImages.length !== 1 ? 's' : ''}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                              {vendor.whatsappNumber || '—'}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`text-xs px-2.5 py-1 rounded-full font-medium whitespace-nowrap ${
                                vendor.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'
                              }`}>
                                {vendor.status === 'active' ? '✅ Active' : '❌ Inactive'}
                              </span>
                              {vendor.createdAt && (
                                <div className="text-xs text-gray-400 mt-0.5">{formatDate(vendor.createdAt)}</div>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1">
                                <button onClick={() => handleToggleStatus(vendor)}
                                  className="p-1.5 hover:bg-gray-100 rounded-lg transition text-gray-500"
                                  title={vendor.status === 'active' ? 'Deactivate' : 'Activate'}>
                                  {vendor.status === 'active' ? <EyeOff size={15} /> : <Eye size={15} />}
                                </button>
                                <button onClick={() => navigate(`/admin/vendors/edit/${vendor.id}`)}
                                  className="p-1.5 hover:bg-blue-50 rounded-lg transition text-blue-600">
                                  <Edit size={15} />
                                </button>
                                <button onClick={() => handleDelete(vendor.id)}
                                  className="p-1.5 hover:bg-red-50 rounded-lg transition text-red-500">
                                  <Trash2 size={15} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="px-4 py-3 border-t border-gray-100 text-sm text-gray-500">
                  Showing {filteredVendors.length} of {vendors.length} vendors
                </div>
              </div>
            )

          ) : activeTab === 'pending' ? (
            // ── PENDING VENDORS TAB ────────────────────────────────────
            pendingVendors.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-xl border border-gray-200">
                <Clock size={48} className="text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg font-medium">No pending submissions</p>
                <p className="text-gray-400 text-sm mt-1">New vendor registrations will appear here</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {pendingVendors.map(submission => {
                  const allImages = getAllImages(submission);
                  return (
                    <div key={submission.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition">
                      {/* ✅ Multi-image carousel on card */}
                      <div className="relative">
                        <VendorImageCarousel images={allImages} height="h-44" />
                        <div className="absolute top-3 left-3 z-10">
                          <span className="bg-orange-500 text-white text-xs px-2.5 py-1 rounded-full font-medium">⏳ Pending</span>
                        </div>
                        {/* ✅ Photo count badge */}
                        {allImages.length > 0 && (
                          <div className="absolute top-3 right-3 z-10 bg-black/50 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                            <Image size={10} />{allImages.length} photo{allImages.length !== 1 ? 's' : ''}
                          </div>
                        )}
                      </div>

                      <div className="p-4">
                        <div className="flex items-start justify-between mb-1">
                          <h3 className="font-bold text-gray-900">{submission.shopName}</h3>
                          {submission.referralCode && (
                            <span className="flex items-center gap-1 text-xs text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full font-medium flex-shrink-0 ml-2">
                              <Gift size={10} />{submission.referralCode}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mb-3 line-clamp-2">{submission.description}</p>

                        <div className="space-y-1 mb-4">
                          <div className="flex items-center gap-2 text-xs text-gray-600">
                            <span className="font-medium w-20 flex-shrink-0">Category:</span>
                            <span className="bg-cyan-100 text-cyan-700 px-2 py-0.5 rounded-full">{submission.category}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-600">
                            <span className="font-medium w-20 flex-shrink-0">University:</span>
                            <span>🏛️ {submission.university}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-600">
                            <span className="font-medium w-20 flex-shrink-0">WhatsApp:</span>
                            <span>📱 {submission.whatsappNumber}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-600">
                            <span className="font-medium w-20 flex-shrink-0">By:</span>
                            <span className="truncate">{submission.organizerEmail || submission.organizerName || '—'}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-600">
                            <span className="font-medium w-20 flex-shrink-0">Submitted:</span>
                            <span>{formatDate(submission.submittedAt)}</span>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <button onClick={() => setSelectedPending(submission)}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition">
                            <Eye size={15} />Review
                          </button>
                          <button onClick={() => handleApprove(submission)}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-semibold transition">
                            <Check size={15} />Approve
                          </button>
                          <button onClick={() => handleReject(submission)}
                            className="flex items-center justify-center gap-1 py-2.5 px-3 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-semibold transition">
                            <X size={15} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )

          ) : (
            // ── REPORTS TAB ────────────────────────────────────────────
            reports.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-xl border border-gray-200">
                <div className="text-5xl mb-4">✅</div>
                <p className="text-gray-500 text-lg font-medium">No pending reports</p>
                <p className="text-gray-400 text-sm mt-1">All vendor reports have been reviewed</p>
              </div>
            ) : (
              <div className="space-y-4">
                {reports.map(report => (
                  <div key={report.id} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Flag size={14} className="text-red-500" />
                          <span className="text-red-500 font-bold text-sm">Report</span>
                          <span className="bg-red-100 text-red-600 text-xs px-2 py-0.5 rounded-full font-medium">Pending Review</span>
                        </div>
                        <h3 className="font-bold text-gray-900">{report.shopName}</h3>
                        <p className="text-sm text-gray-500">🏛️ {report.university}</p>
                      </div>
                      <p className="text-xs text-gray-400">
                        {report.reportedAt?.toDate ? new Date(report.reportedAt.toDate()).toLocaleDateString() : 'Just now'}
                      </p>
                    </div>
                    <div className="bg-red-50 rounded-lg p-3 mb-4 border border-red-100">
                      <p className="text-sm font-medium text-red-700 mb-1">Reason:</p>
                      <p className="text-sm text-red-600">{REASON_LABELS[report.reason] || report.reason}</p>
                      {report.details && (
                        <p className="text-xs text-gray-600 mt-2 italic">"{report.details}"</p>
                      )}
                    </div>
                    <div className="flex gap-3">
                      <button onClick={() => handleDeactivateFromReport(report)}
                        className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-semibold transition">
                        🚫 Deactivate Vendor
                      </button>
                      <button onClick={() => handleDismissReport(report)}
                        className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition">
                        ✅ Dismiss Report
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      </main>

      {/* ✅ Pending Vendor Detail Modal */}
      {selectedPending && (() => {
        const allImages = getAllImages(selectedPending);
        return (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">

              {/* Modal header */}
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10 rounded-t-2xl">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{selectedPending.shopName}</h2>
                  <p className="text-sm text-gray-500">🏛️ {selectedPending.university} · {selectedPending.category}</p>
                </div>
                <button onClick={() => setSelectedPending(null)} className="p-2 hover:bg-gray-100 rounded-full transition">
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-5">

                {/* ✅ Image carousel */}
                {allImages.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-semibold text-gray-700">Shop Photos ({allImages.length})</h3>
                    </div>
                    <VendorDetailCarousel images={allImages} />
                  </div>
                )}

                {/* ✅ Referral code */}
                {selectedPending.referralCode && (
                  <div className="flex items-center gap-3 bg-purple-50 border border-purple-200 rounded-xl px-4 py-3">
                    <Gift size={18} className="text-purple-500 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-bold text-purple-800">Referral Code: {selectedPending.referralCode}</p>
                      <p className="text-xs text-purple-600">₦100 credit will be awarded to this user on approval</p>
                    </div>
                  </div>
                )}

                {/* Details */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Description</h3>
                  <p className="text-gray-700 text-sm whitespace-pre-wrap bg-gray-50 rounded-xl p-4">{selectedPending.description}</p>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="bg-gray-50 rounded-xl p-4">
                    <h4 className="font-semibold text-gray-700 mb-3">Vendor Info</h4>
                    <div className="space-y-2 text-gray-600">
                      <div><span className="font-medium text-gray-800">Category:</span><br/>{selectedPending.category}</div>
                      <div><span className="font-medium text-gray-800">University:</span><br/>🏛️ {selectedPending.university}</div>
                      <div><span className="font-medium text-gray-800">WhatsApp:</span><br/>📱 {selectedPending.whatsappNumber}</div>
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4">
                    <h4 className="font-semibold text-gray-700 mb-3">Submitted By</h4>
                    <div className="space-y-2 text-gray-600">
                      <div><span className="font-medium text-gray-800">Name:</span><br/>{selectedPending.organizerName || '—'}</div>
                      <div><span className="font-medium text-gray-800">Email:</span><br/>
                        <a href={`mailto:${selectedPending.organizerEmail}`} className="text-cyan-600 hover:underline text-xs">{selectedPending.organizerEmail || '—'}</a>
                      </div>
                      <div><span className="font-medium text-gray-800">Phone:</span><br/>
                        <a href={`tel:${selectedPending.organizerPhone}`} className="text-cyan-600 hover:underline">{selectedPending.organizerPhone || '—'}</a>
                      </div>
                      <div><span className="font-medium text-gray-800">Submitted:</span><br/>{formatDate(selectedPending.submittedAt)}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex gap-3 rounded-b-2xl">
                <button onClick={() => handleApprove(selectedPending)} disabled={approving}
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold transition disabled:opacity-50">
                  {approving
                    ? <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />Approving...</>
                    : <><Check size={18} />Approve & Publish{selectedPending.referralCode ? ' (+₦100)' : ''}</>
                  }
                </button>
                <button onClick={() => handleReject(selectedPending)} disabled={approving}
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold transition disabled:opacity-50">
                  <X size={18} />Reject
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

// ✅ Separate carousel for the detail modal — larger with thumbnails
function VendorDetailCarousel({ images }) {
  const [index, setIndex] = useState(0);
  if (!images.length) return null;

  return (
    <div>
      <div className="relative rounded-xl overflow-hidden bg-gray-100">
        <img src={images[index]} alt={`Photo ${index + 1}`}
          className="w-full h-64 object-cover"
          onError={(e) => { e.target.src = 'https://via.placeholder.com/800x400'; }} />
        {index === 0 && (
          <div className="absolute top-3 left-3 bg-cyan-500 text-white text-xs px-2.5 py-1 rounded-lg font-semibold">
            Main Photo
          </div>
        )}
        {images.length > 1 && (
          <>
            <button onClick={() => setIndex(i => (i - 1 + images.length) % images.length)}
              className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition">
              <ChevronLeft size={18} />
            </button>
            <button onClick={() => setIndex(i => (i + 1) % images.length)}
              className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition">
              <ChevronRight size={18} />
            </button>
            <div className="absolute bottom-3 right-3 bg-black/50 text-white text-xs px-2 py-1 rounded-full">
              {index + 1} / {images.length}
            </div>
          </>
        )}
      </div>
      {/* Thumbnails */}
      {images.length > 1 && (
        <div className="flex gap-2 mt-2 overflow-x-auto pb-1">
          {images.map((img, i) => (
            <button key={i} onClick={() => setIndex(i)}
              className={`flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden border-2 transition ${i === index ? 'border-cyan-400 scale-105' : 'border-gray-200 opacity-60 hover:opacity-100'}`}>
              <img src={img} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}