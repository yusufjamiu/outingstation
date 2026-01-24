import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Search, Bell, X, Pencil, MapPin, User, Mail, Calendar, Bookmark, LogOut, Menu } from 'lucide-react';
import { UserSidebar } from '../../components/UserSidebar';

export default function Settings() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showSavedNotification, setShowSavedNotification] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  
  const [profileData, setProfileData] = useState({
    name: 'Brahim Wins',
    email: 'brahiimwins23@gmail.com',
    city: 'Lagos, Nigeria',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=User',
    joinedDate: '21 Jan, 2026',
    savedEvents: 12
  });

  const [formData, setFormData] = useState({
    name: profileData.name,
    email: profileData.email,
    city: profileData.city
  });

  const handleEditClick = () => {
    setIsEditing(true);
    setFormData({
      name: profileData.name,
      email: profileData.email,
      city: profileData.city
    });
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setFormData({
      name: profileData.name,
      email: profileData.email,
      city: profileData.city
    });
  };

  const handleSaveChanges = () => {
    setProfileData({
      ...profileData,
      name: formData.name,
      email: formData.email,
      city: formData.city
    });
    setIsEditing(false);
    setShowSavedNotification(true);
    setTimeout(() => {
      setShowSavedNotification(false);
    }, 3000);
  };

  const handleLogoutClick = () => {
    setShowLogoutModal(true);
  };

  const confirmLogout = () => {
    setShowLogoutModal(false);
    navigate('/');
  };

  const cancelLogout = () => {
    setShowLogoutModal(false);
  };

  const user = {
    name: profileData.name,
    city: profileData.city.split(',')[0],
    avatar: profileData.avatar
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <UserSidebar 
        activeTab="settings" 
        user={user}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      
      <main className="flex-1 overflow-auto">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 py-4 sticky top-0 z-30">
          <div className="flex items-center justify-between">
            {/* Hamburger Menu - Mobile */}
            <button 
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 hover:bg-gray-100 rounded-lg mr-2"
            >
              <Menu size={24} />
            </button>

            <div className="flex-1 max-w-xl">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Search location, event & more"
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400 text-sm"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-4 ml-2 sm:ml-6">
              <button className="p-2 hover:bg-gray-100 rounded-full relative">
                <Bell size={20} className="text-gray-600" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>
              <img src={profileData.avatar} alt={profileData.name} className="w-8 h-8 sm:w-10 sm:h-10 rounded-full" />
            </div>
          </div>
        </header>

        {/* Main Content */}
        <div className="px-4 sm:px-6 lg:px-8 py-6 max-w-4xl mx-auto">
          {/* Success Notification */}
          {showSavedNotification && (
            <div className="fixed top-20 sm:top-24 left-1/2 transform -translate-x-1/2 z-50 animate-in slide-in-from-top duration-300">
              <div className="bg-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg shadow-lg border-t-4 border-cyan-400">
                <p className="font-medium text-gray-900 text-sm sm:text-base">Changes Saved!</p>
              </div>
            </div>
          )}

          {/* Close Button */}
          <div className="flex justify-end mb-4">
            <button 
              onClick={() => navigate('/dashboard')}
              className="p-2 hover:bg-gray-200 rounded-full transition"
            >
              <X size={20} className="sm:w-6 sm:h-6 text-gray-600" />
            </button>
          </div>

          {/* Page Header */}
          <div className="mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              {isEditing ? 'Edit Profile' : 'Profile'}
            </h1>
            <p className="text-sm sm:text-base text-gray-600 mt-1">
              {isEditing ? 'Updates your personal profiles' : 'Manage your personal information'}
            </p>
          </div>

          {!isEditing ? (
            // View Mode
            <>
              {/* Profile Card */}
              <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 shadow-sm border border-gray-200 mb-4 sm:mb-6">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6">
                    <img 
                      src={profileData.avatar} 
                      alt={profileData.name}
                      className="w-20 h-20 sm:w-24 sm:h-24 rounded-full"
                    />
                    <div className="text-center sm:text-left">
                      <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">
                        {profileData.name}
                      </h2>
                      <p className="text-sm sm:text-base text-gray-600 mb-3 sm:mb-4 break-all">{profileData.email}</p>
                      
                      <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-6 text-xs sm:text-sm">
                        <div className="flex items-center gap-2 text-gray-700">
                          <MapPin size={14} className="sm:w-4 sm:h-4" />
                          <span>{profileData.city}</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-700">
                          <Calendar size={14} className="sm:w-4 sm:h-4" />
                          <span>Joined: {profileData.joinedDate}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <button 
                    onClick={handleEditClick}
                    className="flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition text-sm sm:text-base w-full sm:w-auto"
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
                    {profileData.savedEvents} Saved Events
                  </h3>
                  <p className="text-gray-600 text-xs sm:text-sm">Events you're interested in.</p>
                </div>

                <div className="bg-white rounded-xl sm:rounded-2xl p-5 sm:p-6 shadow-sm border border-gray-200">
                  <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">
                    Your Collection
                  </h3>
                  <p className="text-gray-600 text-xs sm:text-sm mb-4">
                    Review the events you've saved to list and plan your next outing.
                  </p>
                  
                  <Link 
  to="/saved-events"
  className="w-full sm:w-auto px-5 sm:px-6 py-2 bg-cyan-400 text-white rounded-lg font-medium hover:bg-cyan-500 transition text-sm sm:text-base inline-block text-center"
>
  View
</Link>
                </div>
              </div>

              {/* Logout Button */}
              <button 
                onClick={handleLogoutClick}
                className="flex items-center gap-2 text-gray-700 hover:text-gray-900 transition text-sm sm:text-base"
              >
                <LogOut size={18} className="sm:w-5 sm:h-5" />
                <span className="font-medium">Logout</span>
              </button>
            </>
          ) : (
            // Edit Mode
            <div className="bg-white rounded-xl sm:rounded-2xl p-5 sm:p-6 lg:p-8 shadow-sm border border-gray-200">
              {/* Avatar Section */}
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 mb-6 sm:mb-8 pb-6 sm:pb-8 border-b border-gray-200">
                <img 
                  src={profileData.avatar} 
                  alt={profileData.name}
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-full"
                />
                <div className="text-center sm:text-left">
                  <h3 className="text-lg sm:text-xl font-bold text-gray-900">{profileData.name}</h3>
                  <p className="text-sm sm:text-base text-gray-600 break-all">{profileData.email}</p>
                </div>
              </div>

              {/* Form Fields */}
              <div className="space-y-5 sm:space-y-6 mb-6 sm:mb-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6">
                  {/* Full Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      Full Name
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent text-sm sm:text-base"
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      Email
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent text-sm sm:text-base"
                      />
                    </div>
                  </div>
                </div>

                {/* City */}
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    City
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent text-sm sm:text-base"
                    />
                    <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    We'll show you events based on this city.
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
                <button 
                  onClick={handleCancelEdit}
                  className="w-full sm:w-auto px-6 sm:px-8 py-2.5 bg-gray-100 text-gray-700 rounded-full font-medium hover:bg-gray-200 transition text-sm sm:text-base order-2 sm:order-1"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSaveChanges}
                  className="w-full sm:w-auto px-6 sm:px-8 py-2.5 bg-cyan-400 text-white rounded-full font-medium hover:bg-cyan-500 transition text-sm sm:text-base order-1 sm:order-2"
                >
                  Save Changes
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 sm:p-8 max-w-md w-full relative animate-in fade-in zoom-in duration-200">
            <button 
              onClick={cancelLogout}
              className="absolute top-3 sm:top-4 right-3 sm:right-4 p-1 text-gray-400 hover:text-gray-600 transition"
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
              Are you sure you want to logout. You'll have to sign in back to access your saved events and continue your actions.
            </p>

            <div className="flex gap-3">
              <button 
                onClick={confirmLogout}
                className="flex-1 px-4 sm:px-6 py-2.5 sm:py-3 bg-cyan-400 text-white rounded-full font-medium hover:bg-cyan-500 transition text-sm sm:text-base"
              >
                Logout
              </button>
              <button 
                onClick={cancelLogout}
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