// UserSidebar.jsx - Mobile Responsive
import { Link } from 'react-router-dom';
import { Home, Grid, Bookmark, Settings, X } from 'lucide-react';
import OutingStation from '../assets/OutingStation.png';

export function UserSidebar({ activeTab, user, isOpen, onClose }) {
  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        ></div>
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50
        w-64 bg-white border-r border-gray-200 flex flex-col
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Close button - Mobile only */}
        <button 
          onClick={onClose}
          className="lg:hidden absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-lg"
        >
          <X size={20} />
        </button>

        <div className="p-6">
          <div className="p-6">
          <img src={OutingStation} alt="Outing Station" className="h-12 w-auto" />
        </div>
        </div>

        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <img src={user.avatar} alt={user.name} className="w-10 h-10 rounded-full" />
            <div>
              <p className="font-semibold text-gray-900">Welcome Back!</p>
              <p className="text-sm text-gray-500">{user.city}</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2">
          <Link to="/dashboard" onClick={onClose}>
            <button className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${
              activeTab === 'home' ? 'bg-primary text-white' : 'text-gray-700 hover:bg-gray-100'
            }`}>
              <Home size={20} />
              <span className="font-medium">Home</span>
            </button>
          </Link>

          <Link to="/dashboard/categories" onClick={onClose}>
            <button className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${
              activeTab === 'category' ? 'bg-primary text-white' : 'text-gray-700 hover:bg-gray-100'
            }`}>
              <Grid size={20} />
              <span className="font-medium">Category</span>
            </button>
          </Link>

          <Link to="/saved-events" onClick={onClose}>
            <button className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${
              activeTab === 'saved' ? 'bg-primary text-white' : 'text-gray-700 hover:bg-gray-100'
            }`}>
              <Bookmark size={20} />
              <span className="font-medium">Saved Events</span>
            </button>
          </Link>

          <Link to="/settings" onClick={onClose}>
            <button className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${
              activeTab === 'settings' ? 'bg-primary text-white' : 'text-gray-700 hover:bg-gray-100'
            }`}>
              <Settings size={20} />
              <span className="font-medium">Settings</span>
            </button>
          </Link>
        </nav>
      </aside>
    </>
  );
}