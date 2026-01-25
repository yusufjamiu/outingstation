import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Calendar, Users, Grid, GraduationCap, Bookmark, LogOut, X } from 'lucide-react';
import OutingStation from '../assets/OutingStation.png';

export function AdminSidebar({ isOpen, onClose }) {
  const location = useLocation();
  
  const menuItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard, path: '/admin' },
    { id: 'events', label: 'Manage Events', icon: Calendar, path: '/admin/events' },
    { id: 'users', label: 'Manage Users', icon: Users, path: '/admin/users' },
    { id: 'categories', label: 'Categories', icon: Grid, path: '/admin/categories' },
    { id: 'universities', label: 'Universities', icon: GraduationCap, path: '/admin/universities' },
    { id: 'saved-events', label: 'Saved Events', icon: Bookmark, path: '/admin/saved-events-analytics' }, // NEW
  ];

  const isActive = (path) => location.pathname === path;

  const handleLogout = () => {
    // Clear admin authentication
    localStorage.removeItem('adminAuth');
    // Force page reload to clear React state and redirect
    window.location.href = '/#/admin/login';
  };

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50
        w-64 bg-gray-900 text-white
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        flex flex-col
      `}>
        {/* Close button - mobile only */}
        <button
          onClick={onClose}
          className="lg:hidden absolute top-4 right-4 p-2 hover:bg-gray-800 rounded-lg"
        >
          <X size={20} />
        </button>

        {/* Logo */}
        <div className="p-6 border-b border-gray-800">
          <h1 className="text-xl font-bold text-cyan-400">Admin Dashboard</h1>
          <Link to="/" className="flex items-center">
            <img
              src={OutingStation}
              alt="Outing Station"
              className="h-12 w-auto"
            />
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            
            return (
              <Link
                key={item.id}
                to={item.path}
                onClick={onClose}
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-lg
                  transition-colors
                  ${active 
                    ? 'bg-cyan-500 text-white' 
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                  }
                `}
              >
                <Icon size={20} />
                <span className="font-medium text-sm">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-gray-800">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
          >
            <LogOut size={20} />
            <span className="font-medium text-sm">Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
}