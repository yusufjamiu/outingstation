import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, Plus, Edit, Trash2, Eye, EyeOff, ShoppingBag, Search, Check, X, Clock, Gift, ChevronLeft, ChevronRight, Image, AlertTriangle } from 'lucide-react';
import { AmbassadorSidebar } from '../../components/AmbassadorSidebar';
import { collection, getDocs, deleteDoc, doc, updateDoc, addDoc, serverTimestamp, query, where, increment } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';

const VENDOR_CATEGORIES = [
  'Food & Drinks', 'Fashion & Clothing', 'Electronics & Gadgets',
  'Beauty & Grooming', 'Books & Stationery', 'Accessories',
];

// ─── Image carousel (card) ───────────────────────────────────────────────
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
          <div className="absolute top-2 left-2 bg-black/50 text-white text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
            <Image size={9} />{index + 1}/{images.length}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Detail carousel (modal) ───────────────────────────────────────────────
function VendorDetailCarousel({ images }) {
  const [index, setIndex] = useState(0);
  if (!images.length) return null;
  return (
    <div>
      <div className="relative rounded-xl overflow-hidden bg-gray-100">
        <img src={images[index]} alt={`Photo ${index + 1}`} className="w-full h-64 object-cover"
          onError={(e) => { e.target.src = 'https://via.placeholder.com/800x400'; }} />
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
    </div>
  );
}

// ─── School ID viewer ───────────────────────────────────────────────
function SchoolIdViewer({ url }) {
  const [expanded, setExpanded] = useState(false);
  if (!url) return (
    <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex items-center gap-3">
      <span className="text-2xl">🪪</span>
      <p className="text-sm text-gray-500 italic">No school ID was uploaded with this submission.</p>
    </div>
  );
  return (
    <div className="bg-amber-50 border-2 border-amber-200 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-amber-200">
        <div className="flex items-center gap-2">
          <span className="text-lg">🪪</span>
          <div>
            <p className="text-sm font-bold text-amber-800">School ID / Matric Card</p>
            <p className="text-xs text-amber-600">Verify this is a valid student ID before approving</p>
          </div>
        </div>
        <button onClick={() => setExpanded(v => !v)}
          className="text-xs font-semibold text-amber-700 bg-amber-100 hover:bg-amber-200 px-3 py-1.5 rounded-lg transition">
          {expanded ? 'Collapse' : 'View ID'}
        </button>
      </div>
      {expanded && (
        <div className="p-3">
          <img src={url} alt="School ID" className="w-full rounded-lg object-contain max-h-64 bg-white border border-amber-200"
            onError={(e) => { e.target.src = 'https://via.placeholder.com/400x200?text=ID+Not+Found'; }} />
          <div className="flex justify-between items-center mt-2">
            <p className="text-xs text-amber-700">✅ Confirm the name, photo, and university match</p>
            <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-cyan-600 hover:underline font-medium">
              Open full size ↗
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main ───────────────────────────────────────────────
export default function AmbassadorVendors() {
  const navigate = useNavigate();
  const { userProfile } = useAuth();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('active');
  const [vendors, setVendors] = useState([]);
  const [pendingVendors, setPendingVendors] = useState([]);
  const [universities, setUniversities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [selectedPending, setSelectedPending] = useState(null);
  const [approving, setApproving] = useState(false);
  const [viewIdVendor, setViewIdVendor] = useState(null);

  const assignedIds = userProfile?.assignedCampuses || [];
  const myCampuses = universities.filter(u => assignedIds.includes(u.id));
  const myCampusNames = myCampuses.map(u => u.name).filter(Boolean);

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    try {
      setLoading(true);
      const [vendorsSnap, subsSnap, uniSnap] = await Promise.all([
        getDocs(collection(db, 'vendors')),
        getDocs(collection(db, 'vendor_submissions')),
        getDocs(collection(db, 'universities')),
      ]);
      setVendors(vendorsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setPendingVendors(subsSnap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(v => v.status === 'pending')
        .sort((a, b) => (b.submittedAt?.seconds || 0) - (a.submittedAt?.seconds || 0)));
      setUniversities(uniSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error('Error loading vendors:', err);
    }
    setLoading(false);
  };

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
        status: 'active', usedAmount: 0,
      };
      await updateDoc(doc(db, 'users', userDoc.id), {
        creditsHistory: [...(userDoc.data().creditsHistory || []), newCredit],
        totalCredits: increment(100),
        updatedAt: new Date(),
      });
      return userName;
    } catch (err) {
      console.error('Error awarding credit:', err);
      return null;
    }
  };

  const getAllImages = (item) => {
    const all = [];
    if (item.imageUrl) all.push(item.imageUrl);
    if (item.images?.length) item.images.forEach(img => { if (img && !all.includes(img)) all.push(img); });
    return all;
  };

  const handleApprove = async (submission) => {
    // 🔒 Safety: ambassador can only approve submissions for their own campus
    if (!myCampusNames.includes(submission.university)) {
      alert("This submission isn't for your campus.");
      return;
    }
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
        schoolIdImageUrl: submission.schoolIdImageUrl || null,
        likeCount: 0,
        reportCount: 0,
        status: 'active',
        createdAt: serverTimestamp(),
        approvedAt: serverTimestamp(),
        approvedByAmbassador: true,
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
      let creditMsg = '';
      if (submission.referralCode) {
        const awardedTo = await awardReferralCredit(submission.referralCode);
        creditMsg = awardedTo ? `\n✅ Awarded ₦100 credit to ${awardedTo}` : `\n⚠️ Referral code "${submission.referralCode}" not found`;
      }
      setPendingVendors(prev => prev.filter(v => v.id !== submission.id));
      setSelectedPending(null);
      loadAll();
      alert(`✅ ${submission.shopName} is now LIVE!${creditMsg}`);
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
      await updateDoc(doc(db, 'vendor_submissions', submission.id), { status: 'rejected', rejectedAt: serverTimestamp() });
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

  // 🔒 Only this ambassador's campus vendors / submissions
  const myVendors = vendors.filter(v => v.university && myCampusNames.includes(v.university));
  const myPending = pendingVendors.filter(v => v.university && myCampusNames.includes(v.university));

  const filteredVendors = myVendors.filter(vendor => {
    const matchesSearch =
      vendor.shopName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      vendor.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory === 'All' || vendor.category === filterCategory;
    const matchesStatus = filterStatus === 'All' || vendor.status === filterStatus;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const activeCount = myVendors.filter(v => v.status === 'active').length;
  const noCampus = !loading && myCampuses.length === 0;

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch { return 'N/A'; }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <AmbassadorSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="flex-1 overflow-auto">
        <header className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 hover:bg-gray-100 rounded-lg">
                <Menu size={24} />
              </button>
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Vendors</h2>
                <p className="text-sm text-gray-500">
                  {myCampusNames.length > 0 ? myCampusNames.join(', ') : 'No campus assigned'}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={loadAll} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition text-sm">
                Refresh
              </button>
              <button onClick={() => navigate('/ambassador/vendors/create')} disabled={noCampus}
                className="flex items-center gap-2 px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition text-sm font-medium disabled:opacity-50">
                <Plus size={18} />Add Vendor
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="mt-4 flex gap-2 flex-wrap">
            <button onClick={() => setActiveTab('active')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${activeTab === 'active' ? 'bg-cyan-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              Active Vendors ({myVendors.length})
            </button>
            <button onClick={() => setActiveTab('pending')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 ${activeTab === 'pending' ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              <Clock size={14} />Pending ({myPending.length})
              {myPending.length > 0 && <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">{myPending.length}</span>}
            </button>
          </div>

          {/* Filters (active tab) */}
          {activeTab === 'active' && (
            <div className="mt-4 flex flex-col sm:flex-row gap-3">
              <div className="flex-1 relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="text" placeholder="Search vendors..." value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 outline-none text-sm" />
              </div>
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
          {noCampus ? (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 flex items-start gap-3">
              <AlertTriangle className="text-amber-500 flex-shrink-0" size={22} />
              <div>
                <p className="font-semibold text-amber-800">No campus assigned yet</p>
                <p className="text-sm text-amber-700">Ask your admin to assign you a campus. Then you can manage and approve vendors for it here.</p>
              </div>
            </div>
          ) : loading ? (
            <div className="flex justify-center py-20">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-cyan-500"></div>
            </div>
          ) : activeTab === 'active' ? (
            filteredVendors.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-xl border border-gray-200">
                <ShoppingBag size={48} className="text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg font-medium">No vendors for your campus yet</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        {['Vendor', 'Category', 'Photos', 'WhatsApp', 'Status', 'Actions'].map(h => (
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
                                <img src={vendor.imageUrl || 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=100'}
                                  alt={vendor.shopName} className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                                  onError={(e) => e.target.src = 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=100'} />
                                <div>
                                  <p className="font-medium text-gray-900 text-sm">{vendor.shopName}</p>
                                  <p className="text-xs text-gray-400 line-clamp-1 max-w-[180px]">{vendor.description}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-cyan-100 text-cyan-700 whitespace-nowrap">{vendor.category}</span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-xs text-gray-500 flex items-center gap-1"><Image size={12} />{allImages.length}</span>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{vendor.whatsappNumber || '—'}</td>
                            <td className="px-4 py-3">
                              <span className={`text-xs px-2.5 py-1 rounded-full font-medium whitespace-nowrap ${vendor.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
                                {vendor.status === 'active' ? '✅ Active' : '❌ Inactive'}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1">
                                <button onClick={() => handleToggleStatus(vendor)} className="p-1.5 hover:bg-gray-100 rounded-lg transition text-gray-500"
                                  title={vendor.status === 'active' ? 'Deactivate' : 'Activate'}>
                                  {vendor.status === 'active' ? <EyeOff size={15} /> : <Eye size={15} />}
                                </button>
                                {vendor.schoolIdImageUrl && (
                                  <button onClick={() => setViewIdVendor(vendor)} className="p-1.5 hover:bg-amber-50 rounded-lg transition text-amber-600" title="View School ID">
                                    <span className="text-sm leading-none">🪪</span>
                                  </button>
                                )}
                                <button onClick={() => navigate(`/ambassador/vendors/edit/${vendor.id}`)} className="p-1.5 hover:bg-blue-50 rounded-lg transition text-blue-600">
                                  <Edit size={15} />
                                </button>
                                <button onClick={() => handleDelete(vendor.id)} className="p-1.5 hover:bg-red-50 rounded-lg transition text-red-500">
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
              </div>
            )
          ) : (
            // Pending tab
            myPending.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-xl border border-gray-200">
                <Clock size={48} className="text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg font-medium">No pending submissions for your campus</p>
                <p className="text-gray-400 text-sm mt-1">Vendors who pick your campus will appear here to approve</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {myPending.map(submission => {
                  const allImages = getAllImages(submission);
                  return (
                    <div key={submission.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition">
                      <div className="relative">
                        <VendorImageCarousel images={allImages} height="h-44" />
                        <div className="absolute top-3 left-3 z-10">
                          <span className="bg-orange-500 text-white text-xs px-2.5 py-1 rounded-full font-medium">⏳ Pending</span>
                        </div>
                        {submission.schoolIdImageUrl && (
                          <div className="absolute bottom-3 left-3 z-10 bg-amber-500 text-white text-xs px-2 py-1 rounded-full font-medium">🪪 ID uploaded</div>
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
                        <div className="space-y-1 mb-4 text-xs text-gray-600">
                          <div><span className="font-medium">Category:</span> <span className="bg-cyan-100 text-cyan-700 px-2 py-0.5 rounded-full">{submission.category}</span></div>
                          <div><span className="font-medium">WhatsApp:</span> 📱 {submission.whatsappNumber}</div>
                          <div><span className="font-medium">Submitted:</span> {formatDate(submission.submittedAt)}</div>
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
          )}
        </div>
      </main>

      {/* School ID modal (active vendor) */}
      {viewIdVendor && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setViewIdVendor(null)}>
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="font-bold text-gray-900">School ID — {viewIdVendor.shopName}</h3>
              <button onClick={() => setViewIdVendor(null)} className="p-2 hover:bg-gray-100 rounded-full transition"><X size={18} /></button>
            </div>
            <div className="p-5">
              <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-3">
                <img src={viewIdVendor.schoolIdImageUrl} alt="School ID" className="w-full rounded-lg object-contain max-h-72 bg-white border border-amber-100"
                  onError={(e) => { e.target.src = 'https://via.placeholder.com/400x200?text=ID+Not+Found'; }} />
                <div className="flex justify-end mt-3">
                  <a href={viewIdVendor.schoolIdImageUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-cyan-600 hover:underline font-medium">Open full size ↗</a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pending detail modal */}
      {selectedPending && (() => {
        const allImages = getAllImages(selectedPending);
        return (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10 rounded-t-2xl">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{selectedPending.shopName}</h2>
                  <p className="text-sm text-gray-500">🎓 {selectedPending.university} · {selectedPending.category}</p>
                </div>
                <button onClick={() => setSelectedPending(null)} className="p-2 hover:bg-gray-100 rounded-full transition"><X size={20} /></button>
              </div>
              <div className="p-6 space-y-5">
                {allImages.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-2">Shop Photos ({allImages.length})</h3>
                    <VendorDetailCarousel images={allImages} />
                  </div>
                )}
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Identity Verification</h3>
                  <SchoolIdViewer url={selectedPending.schoolIdImageUrl} />
                </div>
                {selectedPending.referralCode && (
                  <div className="flex items-center gap-3 bg-purple-50 border border-purple-200 rounded-xl px-4 py-3">
                    <Gift size={18} className="text-purple-500 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-bold text-purple-800">Referral Code: {selectedPending.referralCode}</p>
                      <p className="text-xs text-purple-600">₦100 credit awarded to this user on approval</p>
                    </div>
                  </div>
                )}
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Description</h3>
                  <p className="text-gray-700 text-sm whitespace-pre-wrap bg-gray-50 rounded-xl p-4">{selectedPending.description}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-600 space-y-2">
                  <div><span className="font-medium text-gray-800">WhatsApp:</span> 📱 {selectedPending.whatsappNumber}</div>
                  <div><span className="font-medium text-gray-800">Submitted by:</span> {selectedPending.organizerName || selectedPending.organizerEmail || '—'}</div>
                  <div><span className="font-medium text-gray-800">Submitted:</span> {formatDate(selectedPending.submittedAt)}</div>
                </div>
              </div>
              <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex gap-3 rounded-b-2xl">
                <button onClick={() => handleApprove(selectedPending)} disabled={approving}
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold transition disabled:opacity-50">
                  {approving ? <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />Approving...</> : <><Check size={18} />Approve & Publish{selectedPending.referralCode ? ' (+₦100)' : ''}</>}
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