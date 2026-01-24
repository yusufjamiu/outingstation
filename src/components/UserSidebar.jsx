import { Link } from 'react-router-dom';
import { Home, Grid, Bookmark, Settings, Plus, X } from 'lucide-react';
import OutingStation from '../assets/OutingStation.png';

export function UserSidebar({ activeTab = 'home', user, isOpen, onClose }) {
  const menuItems = [
    { id: 'home', label: 'Home', icon: Home, path: '/dashboard' },
    { id: 'category', label: 'Category', icon: Grid, path: '/dashboard/categories' },
    { id: 'saved', label: 'Saved Events', icon: Bookmark, path: '/saved-events' },
  ];

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
        w-64 bg-white border-r border-gray-200 
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        flex flex-col
      `}>
        {/* Close button - mobile only */}
        <button
          onClick={onClose}
          className="lg:hidden absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-lg"
        >
          <X size={20} />
        </button>

        {/* Logo */}
        <div className="p-6">
          <div className="p-6">
          <img src={OutingStation} alt="Outing Station" className="h-12 w-auto" />
        </div>
        </div>

        {/* User Info */}
        <div className="px-6 py-4">
          <div className="flex items-center gap-3">
            <img 
              src={user?.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=User'} 
              alt={user?.name || 'User'} 
              className="w-10 h-10 rounded-full"
            />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 text-sm truncate">Welcome Back!</p>
              <p className="text-xs text-gray-500 truncate">{user?.city || 'Lagos'}</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            
            return (
              <Link
                key={item.id}
                to={item.path}
                onClick={onClose}
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-lg mb-1
                  transition-colors
                  ${isActive 
                    ? 'bg-cyan-400 text-white' 
                    : 'text-gray-700 hover:bg-gray-100'
                  }
                `}
              >
                <Icon size={20} />
                <span className="font-medium text-sm">{item.label}</span>
              </Link>
            );
          })}

          {/* Create Event Button */}
          <Link
            to="/create-event"
            onClick={onClose}
            className="flex items-center gap-3 px-4 py-3 rounded-lg mb-1 text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <Plus size={20} />
            <span className="font-medium text-sm">Create Event</span>
          </Link>

          {/* Settings */}
          <Link
            to="/settings"
            onClick={onClose}
            className={`
              flex items-center gap-3 px-4 py-3 rounded-lg mb-1
              transition-colors
              ${activeTab === 'settings' 
                ? 'bg-cyan-400 text-white' 
                : 'text-gray-700 hover:bg-gray-100'
              }
            `}
          >
            <Settings size={20} />
            <span className="font-medium text-sm">Settings</span>
          </Link>
        </nav>
      </aside>
    </>
  );
}