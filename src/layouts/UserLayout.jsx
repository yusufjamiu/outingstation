import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { UserNavbar } from '../components/UserNavbar';
import { UserSidebar } from '../components/UserSidebar';
import { useAuth } from '../context/AuthContext';

export default function UserLayout() {
  const location = useLocation();
  const { currentUser, userProfile } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const displayName = userProfile?.name || currentUser?.displayName || 'User';
  const avatarUrl = userProfile?.avatar || userProfile?.photoURL || currentUser?.photoURL ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=22D3EE&color=fff&size=128`;

  const user = {
    name: displayName,
    city: userProfile?.city || 'Lagos',
    avatar: avatarUrl,
    isNewUser: userProfile?.isNewUser
  };

  // Determine active tab based on current route
  const getActiveTab = () => {
    const path = location.pathname;
    if (path === '/dashboard') return 'dashboard';
    if (path === '/saved') return 'saved';
    if (path === '/settings') return 'settings';
    if (path.startsWith('/category')) return 'category';
    if (path === '/campus-events' || path === '/webinars') return 'category';
    return 'dashboard';
  };

  // Get search placeholder based on route
  const getSearchPlaceholder = () => {
    const path = location.pathname;
    if (path === '/saved') return 'Search saved events';
    if (path === '/settings') return 'Search settings...';
    if (path === '/campus-events') return 'Search campus events...';
    if (path === '/webinars') return 'Search webinars...';
    if (path.startsWith('/category')) return 'Search events...';
    return 'Search events...';
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <UserSidebar 
        activeTab={getActiveTab()}
        user={user}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      
      <main className="flex-1 overflow-y-auto">
        <UserNavbar 
          currentUser={currentUser}
          userProfile={userProfile}
          onMenuClick={() => setSidebarOpen(true)}
          searchValue={searchQuery}
          onSearchChange={(e) => setSearchQuery(e.target.value)}
          searchPlaceholder={getSearchPlaceholder()}
        />
        
        {/* Child routes render here with shared context */}
        <Outlet context={{ searchQuery, setSearchQuery }} />
      </main>
    </div>
  );
}