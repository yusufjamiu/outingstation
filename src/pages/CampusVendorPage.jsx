import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { Store, MapPin, Phone, Clock, CheckCircle2, XCircle, PlusCircle, Search, Pencil, Upload, X } from 'lucide-react';

const STATUS_STYLES = {
  pending: { label: 'Pending Review', color: 'text-amber-600 bg-amber-50 border-amber-200', icon: Clock },
  approved: { label: 'Approved', color: 'text-emerald-600 bg-emerald-50 border-emerald-200', icon: CheckCircle2 },
  rejected: { label: 'Rejected', color: 'text-red-600 bg-red-50 border-red-200', icon: XCircle },
};

const VENDOR_CATEGORIES = [
  { value: 'Food & Drinks', emoji: '🍔' },
  { value: 'Fashion & Clothing', emoji: '👗' },
  { value: 'Electronics & Gadgets', emoji: '📱' },
  { value: 'Beauty & Grooming', emoji: '💄' },
  { value: 'Books & Stationery', emoji: '📚' },
  { value: 'Accessories', emoji: '💍' },
];

const uploadToCloudinary = async (file, folder, onProgress) => {
  const data = new FormData();
  data.append('file', file);
  data.append('upload_preset', import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET);
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', 'https://api.cloudinary.com/v1_1/' + import.meta.env.VITE_CLOUDINARY_CLOUD_NAME + '/image/upload');
    xhr.upload.onprogress = function (e) { if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100)); };
    xhr.onload = function () {
      if (xhr.status === 200) resolve(JSON.parse(xhr.responseText).secure_url);
      else reject(new Error('Upload failed: ' + xhr.statusText));
    };
    xhr.onerror = function () { reject(new Error('Upload failed')); };
    xhr.send(data);
  });
};

const compressImage = async (file, maxWidth, quality) => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = function () {
      const scale = Math.min(1, maxWidth / img.width);
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      canvas.toBlob(function (blob) { resolve(new File([blob], file.name, { type: 'image/jpeg' })); }, 'image/jpeg', quality);
    };
    img.src = url;
  });
};

export default function CampusVendorPage() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [shop, setShop] = useState(null);
  const [shopSource, setShopSource] = useState(null); // ✅ NEW — 'vendors' | 'vendor_submissions'
  const [loading, setLoading] = useState(true);

  // ✅ NEW — up to 3 approved shops allowed per user now, not just 1.
  // Kept separate from the existing single-shop logic above (which
  // handles claim-by-phone / pending / rejected states) rather than
  // rewriting that delicate fallback chain.
  const [myApprovedShops, setMyApprovedShops] = useState([]);
  const MAX_SHOPS = 3;

  const [showClaim, setShowClaim] = useState(false);
  const [claimPhone, setClaimPhone] = useState('');
  const [claimSearching, setClaimSearching] = useState(false);
  const [claimResult, setClaimResult] = useState(null);
  const [claimError, setClaimError] = useState('');
  const [claiming, setClaiming] = useState(false);

  const [editing, setEditing] = useState(false);
  const [editCategory, setEditCategory] = useState('');
  const [editWhatsapp, setEditWhatsapp] = useState('');
  const [editImageUrl, setEditImageUrl] = useState('');
  const [editImages, setEditImages] = useState([]);
  const [uploadingMain, setUploadingMain] = useState(false);
  const [uploadingExtra, setUploadingExtra] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!currentUser) { navigate('/login'); return; }
    loadShop();
    loadAllApprovedShops();
  }, [currentUser]);

  // ✅ NEW — simple, separate query just for the shop-count/switcher —
  // doesn't touch the existing claim/pending/rejected fallback chain below.
  const loadAllApprovedShops = async () => {
    try {
      const snap = await getDocs(
        query(collection(db, 'vendors'), where('ownerId', '==', currentUser.uid), where('status', '==', 'active'))
      );
      const shops = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setMyApprovedShops(shops);
      // If they have exactly one, keep existing single-shop behavior as
      // the default view (loadShop already handles this). If they have
      // more than one and nothing is currently selected, default to the
      // first one so the page isn't blank.
      if (shops.length > 1 && !shop) {
        setShop(shops[0]);
        setShopSource('vendors');
        setEditCategory(shops[0].category || '');
        setEditWhatsapp(shops[0].whatsappNumber || '');
        setEditImageUrl(shops[0].imageUrl || '');
        setEditImages(shops[0].images || []);
      }
    } catch (err) {
      console.error('Error loading approved shops:', err);
    }
  };

  const selectShop = (s) => {
    setShop(s);
    setShopSource('vendors');
    setEditing(false);
    setEditCategory(s.category || '');
    setEditWhatsapp(s.whatsappNumber || '');
    setEditImageUrl(s.imageUrl || '');
    setEditImages(s.images || []);
  };

  const loadShop = async () => {
    try {
      // ✅ FIXED — vendors docs now DO get ownerId (fixed in AdminVendors.jsx's
      // approval flow — it was previously dropped, only copying whatever
      // email was typed into the submission form, which could differ from
      // the submitter's real account). Check ownerId first now; email
      // stays as a fallback for shops approved before that fix.
      let found = null;
      let source = null;

      const byOwnerId = await getDocs(
        query(collection(db, 'vendors'), where('ownerId', '==', currentUser.uid), where('status', '==', 'active'))
      );
      if (!byOwnerId.empty) {
        found = { id: byOwnerId.docs[0].id, ...byOwnerId.docs[0].data() };
        source = 'vendors';
      }

      if (!found && currentUser.email) {
        const activeSnap = await getDocs(
          query(collection(db, 'vendors'), where('submittedBy', '==', currentUser.email), where('status', '==', 'active'))
        );
        if (!activeSnap.empty) {
          found = { id: activeSnap.docs[0].id, ...activeSnap.docs[0].data() };
          source = 'vendors';
        }
      }

      // No active listing — check for a pending/rejected application still
      // in vendor_submissions (nothing to edit yet there, status display only).
      if (!found) {
        const byOwner = await getDocs(
          query(collection(db, 'vendor_submissions'), where('ownerId', '==', currentUser.uid))
        );
        if (!byOwner.empty) {
          found = byOwner.docs
            .map(d => ({ id: d.id, ...d.data() }))
            .sort((a, b) => (b.submittedAt?.seconds || 0) - (a.submittedAt?.seconds || 0))[0];
          source = 'vendor_submissions';
        }
      }

      if (!found && currentUser.email) {
        const byEmail = await getDocs(
          query(collection(db, 'vendor_submissions'), where('organizerEmail', '==', currentUser.email))
        );
        if (!byEmail.empty) {
          found = byEmail.docs
            .map(d => ({ id: d.id, ...d.data() }))
            .sort((a, b) => (b.submittedAt?.seconds || 0) - (a.submittedAt?.seconds || 0))[0];
          source = 'vendor_submissions';

          // ✅ FIX: this shop only ever matched by email, not ownerId — meaning
          // it was never actually claimed. Editing would fail Firestore's
          // permission check (which requires ownerId === your account) since
          // ownerId was still empty. Silently claim it now, same effect as
          // the explicit "claim by phone" button, since matching by their own
          // login email already establishes it's really theirs.
          if (found && !found.ownerId) {
            try {
              await updateDoc(doc(db, 'vendor_submissions', found.id), { ownerId: currentUser.uid });
              found = { ...found, ownerId: currentUser.uid };
            } catch (claimErr) {
              console.error('Auto-claim failed:', claimErr);
            }
          }
        }
      }

      setShop(found);
      setShopSource(source);
      if (found) {
        setEditCategory(found.category || '');
        setEditWhatsapp(found.whatsappNumber || '');
        setEditImageUrl(found.imageUrl || '');
        setEditImages(found.images || []);
      }
    } catch (err) {
      console.error('Error loading shop:', err);
    }
    setLoading(false);
  };

  const searchByPhone = async () => {
    const phone = claimPhone.trim();
    if (!phone) return;
    setClaimSearching(true);
    setClaimError('');
    setClaimResult(null);
    try {
      const snap = await getDocs(
        query(collection(db, 'vendor_submissions'), where('whatsappNumber', '==', phone))
      );
      const unclaimed = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .find(s => !s.ownerId);

      if (unclaimed) {
        setClaimResult(unclaimed);
      } else {
        setClaimError('No unclaimed shop found with that number. Double-check the number you used, or it may already be linked to another account.');
      }
    } catch (err) {
      console.error('Error searching for shop:', err);
      setClaimError('Something went wrong searching. Please try again.');
    }
    setClaimSearching(false);
  };

  const confirmClaim = async () => {
    if (!claimResult) return;
    setClaiming(true);
    try {
      await updateDoc(doc(db, 'vendor_submissions', claimResult.id), { ownerId: currentUser.uid });
      setShop({ ...claimResult, ownerId: currentUser.uid });
      setShopSource('vendor_submissions');
      setEditCategory(claimResult.category || '');
      setEditWhatsapp(claimResult.whatsappNumber || '');
      setEditImageUrl(claimResult.imageUrl || '');
      setEditImages(claimResult.images || []);
      setShowClaim(false);
      setClaimResult(null);
      setClaimPhone('');
    } catch (err) {
      console.error('Error claiming shop:', err);
      setClaimError('Could not link this shop. Please try again.');
    }
    setClaiming(false);
  };

  const handleMainImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !file.type.startsWith('image/')) return;
    setUploadingMain(true);
    try {
      const compressed = await compressImage(file, 1200, 0.8);
      const url = await uploadToCloudinary(compressed, 'vendors', () => {});
      setEditImageUrl(url);
    } catch (err) {
      console.error(err);
      alert('Failed to upload image');
    }
    setUploadingMain(false);
  };

  const handleExtraImagesUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    const slotsLeft = 9 - editImages.length;
    const toUpload = files.slice(0, slotsLeft);
    if (!toUpload.length) { alert('Maximum 9 additional photos allowed'); return; }
    setUploadingExtra(true);
    const uploaded = [];
    for (const file of toUpload) {
      if (!file.type.startsWith('image/')) continue;
      try {
        const compressed = await compressImage(file, 1200, 0.8);
        const url = await uploadToCloudinary(compressed, 'vendors', () => {});
        uploaded.push(url);
      } catch (err) { console.error(err); }
    }
    setEditImages(prev => [...prev, ...uploaded].slice(0, 9));
    setUploadingExtra(false);
    e.target.value = '';
  };

  const removeExtraImage = (index) => setEditImages(prev => prev.filter((_, i) => i !== index));

  const handleSaveEdit = async () => {
    if (!shop) return;
    setSaving(true);
    try {
      const updateData = {
        category: editCategory,
        whatsappNumber: editWhatsapp.trim(),
        imageUrl: editImageUrl,
        images: editImages,
      };
      // ✅ CORRECTED — save to whichever collection the shop actually came
      // from. In practice this should always be 'vendors' once approved,
      // since editing is only offered for active listings.
      await updateDoc(doc(db, shopSource || 'vendors', shop.id), updateData);
      setShop(prev => ({ ...prev, ...updateData }));
      setEditing(false);
    } catch (err) {
      console.error('Error saving shop edits:', err);
      alert('Failed to save changes. Please try again.');
    }
    setSaving(false);
  };

  const cancelEdit = () => {
    setEditCategory(shop.category || '');
    setEditWhatsapp(shop.whatsappNumber || '');
    setEditImageUrl(shop.imageUrl || '');
    setEditImages(shop.images || []);
    setEditing(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-10">
        <div className="mb-6">
          <p className="text-xs text-cyan-600 font-bold uppercase tracking-wider">Campus Vendor</p>
          <h1 className="text-2xl font-black text-gray-900">My Shop</h1>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-cyan-500" />
          </div>
        ) : !shop ? (
          <div className="bg-white rounded-3xl border-2 border-gray-100 p-8 text-center">
            <div className="w-16 h-16 bg-cyan-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Store size={28} className="text-cyan-500" />
            </div>
            <h2 className="text-lg font-black text-gray-900 mb-2">You haven't listed a shop yet</h2>
            <p className="text-sm text-gray-500 mb-6">
              Sell food, fashion, gadgets or accessories to students on your campus. Listing is free.
            </p>
            <button
              onClick={() => navigate('/list-vendor')}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white px-6 py-3 rounded-2xl font-bold hover:shadow-lg transition"
            >
              <PlusCircle size={18} /> List Your Shop
            </button>

            <div className="mt-8 pt-6 border-t border-gray-100">
              {!showClaim ? (
                <button
                  onClick={() => setShowClaim(true)}
                  className="text-sm text-cyan-600 font-semibold hover:text-cyan-700 transition"
                >
                  Already submitted a shop before creating an account?
                </button>
              ) : (
                <div className="text-left max-w-sm mx-auto">
                  <p className="text-sm font-bold text-gray-800 mb-2">Find your shop by phone number</p>
                  <p className="text-xs text-gray-500 mb-3">Enter the WhatsApp number you used when you first submitted your shop.</p>
                  <div className="flex gap-2 mb-3">
                    <input
                      type="tel"
                      value={claimPhone}
                      onChange={e => setClaimPhone(e.target.value)}
                      placeholder="+234 800 000 0000"
                      className="flex-1 px-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-cyan-500 transition"
                    />
                    <button
                      onClick={searchByPhone}
                      disabled={claimSearching}
                      className="px-4 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-bold hover:bg-gray-800 transition disabled:opacity-50 flex items-center gap-1.5"
                    >
                      <Search size={14} /> {claimSearching ? 'Searching...' : 'Find'}
                    </button>
                  </div>

                  {claimError && (
                    <p className="text-xs text-red-500 mb-3">{claimError}</p>
                  )}

                  {claimResult && (
                    <div className="bg-cyan-50 border border-cyan-200 rounded-xl p-4">
                      <p className="text-sm font-bold text-gray-900 mb-1">Is this your shop?</p>
                      <p className="text-sm text-gray-700 mb-3">{claimResult.shopName} — {claimResult.category}</p>
                      <button
                        onClick={confirmClaim}
                        disabled={claiming}
                        className="w-full bg-cyan-500 text-white py-2.5 rounded-xl text-sm font-bold hover:bg-cyan-600 transition disabled:opacity-50"
                      >
                        {claiming ? 'Linking...' : 'Yes, this is mine'}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          <>
            {/* ✅ NEW — switcher + Add Another, only shown when relevant */}
            {myApprovedShops.length > 1 && (
              <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
                {myApprovedShops.map(s => (
                  <button
                    key={s.id}
                    onClick={() => selectShop(s)}
                    className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-bold transition ${
                      shop?.id === s.id ? 'bg-cyan-500 text-white' : 'bg-white border-2 border-gray-200 text-gray-600'
                    }`}
                  >
                    {s.shopName}
                  </button>
                ))}
              </div>
            )}
            {myApprovedShops.length >= 1 && myApprovedShops.length < MAX_SHOPS && (
              <button
                onClick={() => navigate('/list-vendor')}
                className="w-full mb-4 flex items-center justify-center gap-2 border-2 border-dashed border-cyan-300 text-cyan-600 font-bold py-3 rounded-2xl hover:bg-cyan-50 transition"
              >
                <PlusCircle size={16} /> Add Another Shop ({myApprovedShops.length}/{MAX_SHOPS})
              </button>
            )}
          <div className="bg-white rounded-3xl border-2 border-gray-100 overflow-hidden">
            {!editing && shop.imageUrl && (
              <div className="h-48 bg-gray-100">
                <img src={shop.imageUrl} alt={shop.shopName} className="w-full h-full object-cover" />
              </div>
            )}
            <div className="p-6">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <h2 className="text-xl font-black text-gray-900">{shop.shopName}</h2>
                  {!editing && <p className="text-sm text-gray-500">{shop.category}</p>}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {(() => {
                    const s = STATUS_STYLES[shop.status] || STATUS_STYLES.pending;
                    const Icon = s.icon;
                    return (
                      <span className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border ${s.color}`}>
                        <Icon size={13} /> {s.label}
                      </span>
                    );
                  })()}
                  {!editing && shopSource === 'vendors' && (
                    <button
                      onClick={() => setEditing(true)}
                      className="flex items-center gap-1.5 text-xs font-bold text-cyan-600 hover:text-cyan-700 border-2 border-cyan-200 rounded-full px-3 py-1.5 transition"
                    >
                      <Pencil size={12} /> Edit
                    </button>
                  )}
                </div>
              </div>

              {!editing && (
                <>
                  <p className="text-sm text-gray-600 mb-4">{shop.description}</p>

                  <div className="space-y-2 mb-6">
                    {shop.university && (
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <MapPin size={14} className="text-cyan-500" /> {shop.university}
                      </div>
                    )}
                    {shop.whatsappNumber && (
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Phone size={14} className="text-cyan-500" /> {shop.whatsappNumber}
                      </div>
                    )}
                  </div>

                  {shop.status === 'pending' && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                      <p className="text-xs text-amber-700">Your shop is awaiting review. We'll email you once it's approved.</p>
                    </div>
                  )}
                  {shop.status === 'rejected' && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                      <p className="text-xs text-red-700">This listing wasn't approved. Contact admin@outingstation.com for details, or submit a new one.</p>
                    </div>
                  )}
                  {shop.status === 'approved' && shopSource === 'vendor_submissions' && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                      <p className="text-xs text-red-700 font-bold mb-1">⚠️ Listing not found</p>
                      <p className="text-xs text-red-700">
                        Your application was approved, but we can't find your live shop listing — it may not have been created correctly.
                        Please contact admin@outingstation.com so we can fix this for you.
                      </p>
                    </div>
                  )}
                  {shop.status === 'approved' && shopSource === 'vendors' && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                      <p className="text-xs text-emerald-700">Your shop is live! Students on your campus can now find and reach you.</p>
                    </div>
                  )}

                  <p className="text-xs text-gray-400 mt-4">
                    Need to change your shop name, description, or university? Email admin@outingstation.com — you can self-edit category, WhatsApp number, and photos above.
                  </p>
                </>
              )}

              {editing && (
                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-bold text-gray-800 mb-1.5">Category</label>
                    <div className="grid grid-cols-2 gap-2">
                      {VENDOR_CATEGORIES.map(c => (
                        <button
                          key={c.value}
                          type="button"
                          onClick={() => setEditCategory(c.value)}
                          className={`text-left px-3 py-2.5 rounded-xl border-2 text-sm transition ${
                            editCategory === c.value ? 'border-cyan-500 bg-cyan-50 text-cyan-700 font-bold' : 'border-gray-200 text-gray-600'
                          }`}
                        >
                          {c.emoji} {c.value}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-800 mb-1.5">WhatsApp Number</label>
                    <input
                      type="tel"
                      value={editWhatsapp}
                      onChange={e => setEditWhatsapp(e.target.value)}
                      placeholder="+234 800 000 0000"
                      className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-cyan-500 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-800 mb-1.5">Main Photo</label>
                    {editImageUrl ? (
                      <div className="relative w-32">
                        <img src={editImageUrl} alt="" className="w-32 h-32 rounded-xl object-cover border-2 border-gray-200" />
                        <button onClick={() => setEditImageUrl('')} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs"><X size={12} /></button>
                      </div>
                    ) : (
                      <label className="w-32 h-32 rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:border-cyan-400 transition gap-1">
                        {uploadingMain ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-cyan-500" /> : (
                          <>
                            <Upload size={20} className="text-gray-400" />
                            <span className="text-xs text-gray-400">Upload</span>
                          </>
                        )}
                        <input type="file" accept="image/*" onChange={handleMainImageUpload} disabled={uploadingMain} className="sr-only" />
                      </label>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-800 mb-1.5">Additional Photos <span className="text-gray-400 font-normal">({editImages.length}/9)</span></label>
                    {editImages.length > 0 && (
                      <div className="grid grid-cols-4 gap-2 mb-2">
                        {editImages.map((img, i) => (
                          <div key={i} className="relative">
                            <img src={img} alt="" className="w-full h-16 rounded-lg object-cover border border-gray-200" />
                            <button onClick={() => removeExtraImage(i)} className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"><X size={10} /></button>
                          </div>
                        ))}
                      </div>
                    )}
                    {editImages.length < 9 && (
                      <label className="flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-cyan-400 transition text-sm text-gray-500">
                        {uploadingExtra ? 'Uploading...' : (
                          <>
                            <Upload size={14} /> Add photos
                          </>
                        )}
                        <input type="file" accept="image/*" multiple onChange={handleExtraImagesUpload} disabled={uploadingExtra} className="sr-only" />
                      </label>
                    )}
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button onClick={cancelEdit} className="flex-1 border-2 border-gray-200 text-gray-600 py-3 rounded-2xl font-bold hover:bg-gray-50 transition">Cancel</button>
                    <button onClick={handleSaveEdit} disabled={saving} className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-600 text-white py-3 rounded-2xl font-bold hover:shadow-lg transition disabled:opacity-50">
                      {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
          </>
        )}
      </div>
      <Footer />
    </div>
  );
}