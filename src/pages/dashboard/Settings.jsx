import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link, useOutletContext } from 'react-router-dom';
import {
  X, Pencil, MapPin, User, Mail, Calendar, Bookmark,
  LogOut, Phone, Camera, CreditCard, Star, Gift,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { doc, updateDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import ReferralCard from '../../components/ReferralCard';
import {
  formatCredits,
  calculateAvailableCredits,
  getActiveCredits,
} from '../../utils/referralUtils';

export default function Settings() {
  const navigate     = useNavigate();
  const fileInputRef = useRef(null);
  const { searchQuery } = useOutletContext();
  const { currentUser, userProfile, logout, updateProfile } = useAuth();

  const [isEditing, setIsEditing]                   = useState(false);
  const [showSavedNotification, setShowSavedNotification] = useState(false);
  const [showLogoutModal, setShowLogoutModal]         = useState(false);
  const [saving, setSaving]                           = useState(false);
  const [uploadingAvatar, setUploadingAvatar]         = useState(false);
  const [savedCount, setSavedCount]                   = useState(0);
  const [avatarUrl, setAvatarUrl]                     = useState('');
  const [userData, setUserData]                       = useState(null);

  const displayName = userProfile?.name || currentUser?.displayName || 'User';
  const joinedDate  = userProfile?.createdAt?.toDate?.()?.toLocaleDateString('en-US', {
    day: 'numeric', month: 'short', year: 'numeric',
  }) || 'Recently';

  const [formData, setFormData] = useState({
    name:  userProfile?.name  || displayName,
    email: currentUser?.email || '',
    phone: userProfile?.phone || '',
    city:  userProfile?.city  || '',
  });

  useEffect(() => {
    if (!currentUser) return;
    const unsub = onSnapshot(
      doc(db, 'users', currentUser.uid),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setUserData(data);
          setSavedCount((data.savedEvents || []).length);
          setAvatarUrl(
            data.avatar || data.photoURL || currentUser.photoURL ||
            `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=22D3EE&color=fff&size=128`
          );
          setFormData({
            name:  data.name  || displayName,
            email: currentUser.email || '',
            phone: data.phone || '',
            city:  data.city  || '',
          });
        }
      },
      (err) => console.error('Settings snapshot error:', err)
    );
    return unsub;
  }, [currentUser]);

  const isAmbassador    = userData?.isAmbassador    === true;
  const creditsUnlocked = userData?.creditsUnlocked === true;
  const availableCredits = calculateAvailableCredits(userData?.creditsHistory || []);
  const activeCredits    = getActiveCredits(userData?.creditsHistory || []);

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleEditClick   = () => { setFormData({ name: userProfile?.name || displayName, email: currentUser?.email || '', phone: userProfile?.phone || '', city: userProfile?.city || '' }); setIsEditing(true); };
  const handleCancelEdit  = () => setIsEditing(false);
  const handleAvatarClick = () => { if (isEditing) fileInputRef.current?.click(); };

  const uploadToCloudinary = async (file) => {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('upload_preset', import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET);
    fd.append('folder', 'outingstation/profiles');
    const r = await fetch(`https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/image/upload`, { method: 'POST', body: fd });
    if (!r.ok) throw new Error(`Upload failed: ${r.statusText}`);
    return (await r.json()).secure_url;
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser) return;
    if (!file.type.startsWith('image/')) { alert('Please select an image file'); return; }
    if (file.size > 5 * 1024 * 1024)    { alert('Image size must be less than 5MB'); return; }
    try {
      setUploadingAvatar(true);
      let imageUrl;
      try {
        imageUrl = await Promise.race([
          uploadToCloudinary(file),
          new Promise((_, rej) => setTimeout(() => rej(new Error('Timeout')), 10000)),
        ]);
      } catch {
        imageUrl = await new Promise(res => { const r = new FileReader(); r.onloadend = () => res(r.result); r.readAsDataURL(file); });
      }
      await updateDoc(doc(db, 'users', currentUser.uid), { avatar: imageUrl });
      await updateProfile({ avatar: imageUrl });
      setAvatarUrl(imageUrl);
    } catch (err) {
      alert(err.message || 'Failed to upload profile picture');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSaveChanges = async () => {
    if (!currentUser) return;
    try {
      setSaving(true);
      await updateDoc(doc(db, 'users', currentUser.uid), {
        name: formData.name, phone: formData.phone, city: formData.city, updatedAt: new Date(),
      });
      await updateProfile({ name: formData.name, phone: formData.phone, city: formData.city });
      setIsEditing(false);
      setShowSavedNotification(true);
      setTimeout(() => setShowSavedNotification(false), 3000);
    } catch (err) {
      alert('Error saving changes: ' + err.message);
    }
    setSaving(false);
  };

  const handleLogout = async () => {
    try { await logout(); navigate('/'); } catch (err) { console.error('Logout error:', err); }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 max-w-4xl mx-auto">

      {/* Saved notification */}
      {showSavedNotification && (
        <div className="fixed top-20 sm:top-24 left-1/2 -translate-x-1/2 z-50">
          <div className="bg-white px-6 py-3 rounded-lg shadow-lg border-t-4 border-cyan-400">
            <p className="font-medium text-gray-900">Changes Saved! ✅</p>
          </div>
        </div>
      )}

      {/* Page header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            {isEditing ? 'Edit Profile' : 'Profile'}
          </h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">
            {isEditing ? 'Update your personal information' : 'Manage your personal information'}
          </p>
        </div>
        <button onClick={() => navigate('/dashboard')} className="p-2 hover:bg-gray-200 rounded-full transition">
          <X size={20} className="text-gray-600" />
        </button>
      </div>

      {!isEditing ? (
        <>
          {/* ── Profile card ───────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-gray-200 mb-5">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6">
                <div className="relative">
                  <img src={avatarUrl} alt={displayName} className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover" />
                  {isAmbassador && (
                    <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-yellow-400 rounded-full flex items-center justify-center border-2 border-white">
                      <Star size={14} className="text-white" fill="white" />
                    </div>
                  )}
                </div>
                <div className="text-center sm:text-left">
                  <div className="flex items-center gap-2 justify-center sm:justify-start mb-1">
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900">{displayName}</h2>
                    {isAmbassador && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full text-xs font-semibold">
                        <Star size={10} fill="currentColor" /> Ambassador
                      </span>
                    )}
                  </div>
                  <p className="text-sm sm:text-base text-gray-600 mb-1 break-all">{currentUser?.email}</p>
                  {userProfile?.phone && <p className="text-sm text-gray-600 mb-2">{userProfile.phone}</p>}
                  <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-6 text-xs sm:text-sm">
                    {userProfile?.city && (
                      <div className="flex items-center gap-2 text-gray-700">
                        <MapPin size={14} /><span>{userProfile.city}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-gray-700">
                      <Calendar size={14} /><span>Joined: {joinedDate}</span>
                    </div>
                  </div>
                </div>
              </div>
              <button onClick={handleEditClick} className="flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition text-sm w-full sm:w-auto">
                <Pencil size={16} /><span className="font-medium">Edit</span>
              </button>
            </div>
          </div>

          {/* ── Add phone banner ────────────────────────────────────────── */}
          {!userData?.phone && (
            <div className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl p-4 mb-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Phone size={22} />
                <div>
                  <p className="font-semibold text-sm">Add your phone number</p>
                  <p className="text-xs text-cyan-100">Get WhatsApp notifications for your tickets</p>
                </div>
              </div>
              <button onClick={handleEditClick} className="bg-white text-cyan-600 px-4 py-2 rounded-lg font-semibold text-sm hover:bg-cyan-50 transition whitespace-nowrap">
                Add Now
              </button>
            </div>
          )}

          {/* ── Credits balance card ────────────────────────────────────── */}
          <div className="bg-gradient-to-br from-cyan-500 to-blue-600 text-white rounded-2xl p-5 sm:p-6 mb-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <CreditCard size={22} />
                <h3 className="text-lg font-bold">My Credits</h3>
              </div>
              {!creditsUnlocked && !isAmbassador && (
                <span className="text-xs bg-white/20 border border-white/30 px-3 py-1 rounded-full font-semibold">
                  🔒 Pending Approval
                </span>
              )}
              {(creditsUnlocked || isAmbassador) && (
                <span className="text-xs bg-white/20 border border-white/30 px-3 py-1 rounded-full font-semibold">
                  ✅ Active
                </span>
              )}
            </div>

            {/* Balance */}
            <div className="mb-4">
              <p className="text-sm text-white/70 mb-1">Available Balance</p>
              <p className="text-4xl font-black tracking-tight">{formatCredits(availableCredits)}</p>
              {(creditsUnlocked || isAmbassador) && (
                <p className="text-xs text-white/60 mt-1">Usable on ticket purchases at checkout</p>
              )}
            </div>

            {/* How to earn */}
            <div className="bg-white/10 rounded-xl p-3 mb-4">
              <p className="text-xs font-bold text-white/80 mb-2">HOW TO EARN MORE</p>
              <div className="space-y-1.5">
                {[
                  ['👥', `Refer a friend — earn ${isAmbassador ? '₦500' : '₦300'} per signup`],
                  ['🎉', 'List an event — earn credits on approval'],
                  ['📍', 'List a place — earn credits on approval'],
                ].map(([emoji, text]) => (
                  <div key={text} className="flex items-center gap-2 text-xs text-white/80">
                    <span>{emoji}</span><span>{text}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Credit history — no expiry */}
            {activeCredits.length > 0 ? (
              <div>
                <p className="text-xs font-bold text-white/70 mb-2">CREDIT HISTORY</p>
                <div className="space-y-2">
                  {activeCredits.slice(0, 3).map((credit) => (
                    <div key={credit.id} className="flex items-center justify-between bg-white/10 rounded-lg px-3 py-2">
                      <div className="flex items-center gap-2">
                        <Gift size={13} className="text-white/70" />
                        <p className="text-xs text-white/80 truncate max-w-[160px]">{credit.reason || 'Credit earned'}</p>
                      </div>
                      <p className="text-sm font-bold text-white">{formatCredits(credit.amount)}</p>
                    </div>
                  ))}
                  {activeCredits.length > 3 && (
                    <p className="text-xs text-white/50 text-center mt-1">+{activeCredits.length - 3} more</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-2">
                <p className="text-sm text-white/60">No credits yet — invite friends to start earning!</p>
              </div>
            )}
          </div>

          {/* ── Referral card ───────────────────────────────────────────── */}
          {userData?.referralCode ? (
            <div className="mb-5">
              <ReferralCard
                referralCode={userData.referralCode}
                totalReferrals={userData.totalReferrals || 0}
                isAmbassador={isAmbassador}
                creditsUnlocked={creditsUnlocked}
                creditsHistory={userData.creditsHistory || []}
              />
            </div>
          ) : (
            <div className="bg-gradient-to-br from-cyan-500 to-blue-600 text-white rounded-2xl p-5 mb-5">
              <h3 className="text-lg font-bold mb-2">🎁 Get Your Referral Code</h3>
              <p className="text-sm text-cyan-100 mb-3">Loading your referral link...</p>
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white" />
            </div>
          )}

          {/* ── Saved events ────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-200">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-cyan-100 rounded-lg flex items-center justify-center">
                  <Bookmark size={20} className="text-cyan-500" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">{savedCount} Saved Event{savedCount !== 1 ? 's' : ''}</h3>
              </div>
              <p className="text-gray-500 text-sm">Events you're interested in.</p>
            </div>

            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-200">
              <h3 className="text-lg font-bold text-gray-900 mb-2">Your Collection</h3>
              <p className="text-gray-500 text-sm mb-4">Review events you've saved and plan your next outing.</p>
              <Link to="/saved-events" className="inline-block px-5 py-2 bg-cyan-400 text-white rounded-lg font-medium hover:bg-cyan-500 transition text-sm text-center">
                View
              </Link>
            </div>
          </div>

          {/* ── Logout ──────────────────────────────────────────────────── */}
          <button onClick={() => setShowLogoutModal(true)} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition text-sm">
            <LogOut size={16} /><span className="font-medium">Logout</span>
          </button>
        </>
      ) : (
        /* ── Edit form ──────────────────────────────────────────────────── */
        <div className="bg-white rounded-2xl p-5 sm:p-6 lg:p-8 shadow-sm border border-gray-200">
          {/* Avatar */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 mb-6 pb-6 border-b border-gray-200">
            <div className="relative">
              <img src={avatarUrl} alt={displayName} className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover cursor-pointer hover:opacity-80 transition" onClick={handleAvatarClick} />
              {uploadingAvatar && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white" />
                </div>
              )}
              <button onClick={handleAvatarClick} disabled={uploadingAvatar} className="absolute bottom-0 right-0 p-2 bg-cyan-400 text-white rounded-full hover:bg-cyan-500 transition shadow-lg">
                <Camera size={14} />
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
            </div>
            <div className="text-center sm:text-left flex-1">
              <div className="flex items-center gap-2 justify-center sm:justify-start mb-1">
                <h3 className="text-lg sm:text-xl font-bold text-gray-900">{displayName}</h3>
                {isAmbassador && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full text-xs font-semibold">
                    <Star size={10} fill="currentColor" /> Ambassador
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-500 break-all mb-1">{currentUser?.email}</p>
              <p className="text-xs text-gray-400">{uploadingAvatar ? 'Uploading...' : 'Click the camera icon to upload a new photo (max 5MB)'}</p>
            </div>
          </div>

          {/* Fields */}
          <div className="space-y-5 mb-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">Full Name *</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400 text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input type="email" value={formData.email} disabled className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg bg-gray-50 text-gray-400 text-sm cursor-not-allowed" />
                </div>
                <p className="text-xs text-gray-400 mt-1">Email cannot be changed</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">Phone <span className="text-gray-400 text-xs">(Optional)</span></label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input type="tel" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} placeholder="+234 800 000 0000" className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400 text-sm" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">City *</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input type="text" value={formData.city} onChange={e => setFormData({ ...formData, city: e.target.value })} placeholder="e.g. Lagos" className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400 text-sm" />
              </div>
              <p className="text-xs text-gray-500 mt-1">We'll show you events based on this city.</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
            <button onClick={handleCancelEdit} disabled={uploadingAvatar} className="w-full sm:w-auto px-6 py-2.5 bg-gray-100 text-gray-700 rounded-full font-medium hover:bg-gray-200 transition text-sm disabled:opacity-50">
              Cancel
            </button>
            <button onClick={handleSaveChanges} disabled={saving || uploadingAvatar} className="w-full sm:w-auto px-6 py-2.5 bg-cyan-400 text-white rounded-full font-medium hover:bg-cyan-500 transition text-sm disabled:opacity-50">
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      )}

      {/* ── Logout modal ─────────────────────────────────────────────────── */}
      {showLogoutModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 sm:p-8 max-w-md w-full relative">
            <button onClick={() => setShowLogoutModal(false)} className="absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-600">
              <X size={20} />
            </button>
            <div className="flex justify-center mb-5">
              <div className="w-14 h-14 bg-cyan-100 rounded-full flex items-center justify-center">
                <LogOut size={24} className="text-cyan-500" />
              </div>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 text-center mb-2">Logout?</h2>
            <p className="text-sm text-gray-600 text-center mb-7">Are you sure you want to logout? You'll need to sign back in to access your saved events.</p>
            <div className="flex gap-3">
              <button onClick={handleLogout} className="flex-1 px-4 py-2.5 bg-cyan-400 text-white rounded-full font-medium hover:bg-cyan-500 transition text-sm">Logout</button>
              <button onClick={() => setShowLogoutModal(false)} className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-full font-medium hover:bg-gray-200 transition text-sm">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}