import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Bell, X, Pencil, MapPin, User, Mail, Calendar, Bookmark, LogOut, Menu, Phone, Camera } from 'lucide-react';
import { UserSidebar } from '../../components/UserSidebar';
import { useAuth } from '../../context/AuthContext';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { uploadToCloudinary } from '../../services/cloudinaryService';

export default function Settings() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  
  const { currentUser, userProfile, logout } = useAuth();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showSavedNotification, setShowSavedNotification] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [savedCount, setSavedCount] = useState(0);
  const [avatarUrl, setAvatarUrl] = useState('');

  const displayName = userProfile?.name || currentUser?.displayName || 'User';
  const joinedDate = userProfile?.createdAt?.toDate?.()?.toLocaleDateString('en-US', { 
    day: 'numeric', month: 'short', year: 'numeric' 
  }) || 'Recently';

  const [formData, setFormData] = useState({
    name: userProfile?.name || displayName,
    email: currentUser?.email || '',
    phone: userProfile?.phone || '',
    city: userProfile?.city || ''
  });

  useEffect(() => {
    loadUserData();
  }, [currentUser, userProfile]);

  const loadUserData = async () => {
    if (!currentUser) return;

    try {
      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        setSavedCount((data.savedEvents || []).length);
        
        const avatar = data.avatar || data.photoURL || currentUser.photoURL ||
          `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=22D3EE&color=fff&size=128`;
        setAvatarUrl(avatar);

        setFormData({
          name: data.name || displayName,
          email: currentUser.email || '',
          phone: data.phone || '',
          city: data.city || ''
        });
      }
    } catch (err) {
      console.error('Error loading user data:', err);
    }
  };

  const user = { 
    name: displayName, 
    city: userProfile?.city || '', 
    avatar: avatarUrl 
  };

  const handleEditClick = () => {
    setFormData({
      name: userProfile?.name || displayName,
      email: currentUser?.email || '',
      phone: userProfile?.phone || '',
      city: userProfile?.city || ''
    });
    setIsEditing(true);
  };

  const handleCancelEdit = () => setIsEditing(false);

  const handleAvatarClick = () => {
    if (isEditing) {
      fileInputRef.current?.click();
    }
  };

  // ✅ Cloudinary Profile Picture Upload
  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser) return;

    try {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('Image size must be less than 5MB');
        return;
      }

      setUploadingAvatar(true);

      // Upload to Cloudinary
      console.log('☁️ Uploading profile picture...');
      const imageUrl = await uploadToCloudinary(file, 'profiles');
      console.log('✅ Upload complete:', imageUrl);

      // Update Firestore
      const userRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userRef, { avatar: imageUrl });

      // Update local state
      setAvatarUrl(imageUrl);

      setUploadingAvatar(false);
      alert('Profile picture updated successfully!');

    } catch (err) {
      console.error('❌ Upload error:', err);
      alert(err.message || 'Failed to upload profile picture');
      setUploadingAvatar(false);
    }
  };

  const handleSaveChanges = async () => {
    if (!currentUser) return;

    try {
      setSaving(true);

      const userRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userRef, {
        name: formData.name,
        phone: formData.phone,
        city: formData.city
      });

      setIsEditing(false);
      setShowSavedNotification(true);
      setTimeout(() => setShowSavedNotification(false), 3000);

      loadUserData();
    } catch (err) {
      console.error('Error saving:', err);
      alert('Error saving changes: ' + err.message);
    }
    setSaving(false);
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <UserSidebar activeTab="settings" user={user} isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="flex-1 overflow-auto">
        <header className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 py-4 sticky top-0 z-30">
          <div className="flex items-center justify-between">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 hover:bg-gray-100 rounded-lg mr-2">
              <Menu size={24} />
            </button>
            
            <div className="flex-1 max-w-xl">
              <div className="relative">
                
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-4 ml-2 sm:ml-6">
              <button className="p-2 hover:bg-gray-100 rounded-full relative">
                <Bell size={20} className="text-gray-600" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>
              <img 
                src={avatarUrl} 
                alt={displayName} 
                className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover" 
              />
            </div>
          </div>
        </header>

        <div className="px-4 sm:px-6 lg:px-8 py-6 max-w-4xl mx-auto">
          {/* Success Notification */}
          {showSavedNotification && (
            <div className="fixed top-20 sm:top-24 left-1/2 -translate-x-1/2 z-50">
              <div className="bg-white px-6 py-3 rounded-lg shadow-lg border-t-4 border-cyan-400">
                <p className="font-medium text-gray-900">Changes Saved! ✅</p>
              </div>
            </div>
          )}

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
              {/* Profile Card */}
              <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 shadow-sm border border-gray-200 mb-4 sm:mb-6">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6">
                    <img 
                      src={avatarUrl} 
                      alt={displayName} 
                      className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover" 
                    />
                    <div className="text-center sm:text-left">
                      <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">{displayName}</h2>
                      <p className="text-sm sm:text-base text-gray-600 mb-1 break-all">{currentUser?.email}</p>
                      {userProfile?.phone && <p className="text-sm text-gray-600 mb-3">{userProfile.phone}</p>}
                      
                      <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-6 text-xs sm:text-sm">
                        {userProfile?.city && (
                          <div className="flex items-center gap-2 text-gray-700">
                            <MapPin size={14} />
                            <span>{userProfile.city}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-gray-700">
                          <Calendar size={14} />
                          <span>Joined: {joinedDate}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <button 
                    onClick={handleEditClick}
                    className="flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition text-sm w-full sm:w-auto"
                  >
                    <Pencil size={16} />
                    <span className="font-medium">Edit</span>
                  </button>
                </div>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
                <div className="bg-white rounded-xl sm:rounded-2xl p-5 sm:p-6 shadow-sm border border-gray-200">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-cyan-100 rounded-lg flex items-center justify-center">
                      <Bookmark size={20} className="sm:w-6 sm:h-6 text-cyan-500" />
                    </div>
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-1">
                    {savedCount} Saved Event{savedCount !== 1 ? 's' : ''}
                  </h3>
                  <p className="text-gray-600 text-xs sm:text-sm">Events you're interested in.</p>
                </div>

                <div className="bg-white rounded-xl sm:rounded-2xl p-5 sm:p-6 shadow-sm border border-gray-200">
                  <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">Your Collection</h3>
                  <p className="text-gray-600 text-xs sm:text-sm mb-4">
                    Review the events you've saved and plan your next outing.
                  </p>
                  <Link 
                    to="/saved-events"
                    className="w-full sm:w-auto px-5 sm:px-6 py-2 bg-cyan-400 text-white rounded-lg font-medium hover:bg-cyan-500 transition text-sm inline-block text-center"
                  >
                    View
                  </Link>
                </div>
              </div>

              <button 
                onClick={() => setShowLogoutModal(true)}
                className="flex items-center gap-2 text-gray-700 hover:text-gray-900 transition text-sm sm:text-base"
              >
                <LogOut size={18} />
                <span className="font-medium">Logout</span>
              </button>
            </>
          ) : (
            /* Edit Mode */
            <div className="bg-white rounded-xl sm:rounded-2xl p-5 sm:p-6 lg:p-8 shadow-sm border border-gray-200">
              {/* Avatar Upload with Cloudinary */}
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 mb-6 pb-6 border-b border-gray-200">
                <div className="relative">
                  <img 
                    src={avatarUrl} 
                    alt={displayName} 
                    className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover cursor-pointer hover:opacity-80 transition"
                    onClick={handleAvatarClick}
                  />
                  
                  {uploadingAvatar && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                    </div>
                  )}

                  <button
                    onClick={handleAvatarClick}
                    className="absolute bottom-0 right-0 p-2 bg-cyan-400 text-white rounded-full hover:bg-cyan-500 transition shadow-lg"
                    disabled={uploadingAvatar}
                  >
                    <Camera size={14} />
                  </button>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </div>

                <div className="text-center sm:text-left flex-1">
                  <h3 className="text-lg sm:text-xl font-bold text-gray-900">{displayName}</h3>
                  <p className="text-sm text-gray-600 break-all mb-2">{currentUser?.email}</p>
                  <p className="text-xs text-gray-500">
                    {uploadingAvatar ? 'Uploading...' : 'Click the camera icon to upload a new photo (max 5MB)'}
                  </p>
                </div>
              </div>

              {/* Form Fields */}
              <div className="space-y-5 sm:space-y-6 mb-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      Full Name *
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                      <input 
                        type="text" 
                        value={formData.name} 
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
                        required
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400 text-sm sm:text-base" 
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                      <input 
                        type="email" 
                        value={formData.email} 
                        disabled
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg bg-gray-50 text-gray-500 text-sm cursor-not-allowed" 
                      />
                    </div>
                    <p className="text-xs text-gray-400 mt-1">Email cannot be changed</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Phone <span className="text-gray-400 text-xs">(Optional)</span>
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input 
                      type="tel" 
                      value={formData.phone} 
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+234 800 000 0000"
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400 text-sm" 
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">City *</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input 
                      type="text" 
                      value={formData.city} 
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })} 
                      required
                      placeholder="e.g., Lagos, Nigeria"
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400 text-sm" 
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-2">We'll show you events based on this city.</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
                <button 
                  onClick={handleCancelEdit}
                  disabled={uploadingAvatar}
                  className="w-full sm:w-auto px-6 sm:px-8 py-2.5 bg-gray-100 text-gray-700 rounded-full font-medium hover:bg-gray-200 transition text-sm order-2 sm:order-1 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSaveChanges} 
                  disabled={saving || uploadingAvatar}
                  className="w-full sm:w-auto px-6 sm:px-8 py-2.5 bg-cyan-400 text-white rounded-full font-medium hover:bg-cyan-500 transition text-sm order-1 sm:order-2 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Logout Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 sm:p-8 max-w-md w-full relative">
            <button 
              onClick={() => setShowLogoutModal(false)} 
              className="absolute top-3 sm:top-4 right-3 sm:right-4 p-1 text-gray-400 hover:text-gray-600"
            >
              <X size={20} />
            </button>
            
            <div className="flex justify-center mb-4 sm:mb-6">
              <div className="w-14 h-14 sm:w-16 sm:h-16 bg-cyan-100 rounded-full flex items-center justify-center">
                <LogOut size={24} className="sm:w-7 sm:h-7 text-cyan-500" />
              </div>
            </div>

            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 text-center mb-2 sm:mb-3">
              Logout?
            </h2>
            <p className="text-sm sm:text-base text-gray-600 text-center mb-6 sm:mb-8">
              Are you sure you want to logout? You'll need to sign back in to access your saved events.
            </p>

            <div className="flex gap-3">
              <button
                onClick={handleLogout}
                className="flex-1 px-4 sm:px-6 py-2.5 sm:py-3 bg-cyan-400 text-white rounded-full font-medium hover:bg-cyan-500 transition text-sm sm:text-base"
              >
                Logout
              </button>
              <button
                onClick={() => setShowLogoutModal(false)}
                className="flex-1 px-4 sm:px-6 py-2.5 sm:py-3 bg-gray-100 text-gray-700 rounded-full font-medium hover:bg-gray-200 transition text-sm sm:text-base"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}