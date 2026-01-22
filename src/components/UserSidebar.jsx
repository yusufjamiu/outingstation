// UserSidebar.jsx Component
import { Link } from 'react-router-dom';
import { Home, Grid, Bookmark, Settings } from 'lucide-react';

export function UserSidebar({ activeTab, user }) {
  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
      <div className="p-6">
        <div className="bg-primary px-4 py-2 rounded-lg inline-block">
          <span className="text-white font-bold text-sm">OUTING<br/>STATION</span>
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
        <Link to="/dashboard">
          <button className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${
            activeTab === 'home' ? 'bg-primary text-white' : 'text-gray-700 hover:bg-gray-100'
          }`}>
            <Home size={20} />
            <span className="font-medium">Home</span>
          </button>
        </Link>

        <Link to="/categories">
          <button className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${
            activeTab === 'category' ? 'bg-primary text-white' : 'text-gray-700 hover:bg-gray-100'
          }`}>
            <Grid size={20} />
            <span className="font-medium">Category</span>
          </button>
        </Link>

        <Link to="/saved-events">
          <button className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${
            activeTab === 'saved' ? 'bg-primary text-white' : 'text-gray-700 hover:bg-gray-100'
          }`}>
            <Bookmark size={20} />
            <span className="font-medium">Saved Events</span>
          </button>
        </Link>

        <Link to="/settings">
          <button className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${
            activeTab === 'settings' ? 'bg-primary text-white' : 'text-gray-700 hover:bg-gray-100'
          }`}>
            <Settings size={20} />
            <span className="font-medium">Settings</span>
          </button>
        </Link>
      </nav>
    </aside>
  );
}