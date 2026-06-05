import {
  Home, Calendar, ShoppingBag, Bell, LogOut, X, GraduationCap, MapPin, FileText,
} from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function AmbassadorSidebar({ isOpen, onClose }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { userProfile, logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();              // real Firebase sign-out (ambassadors use their normal account)
      navigate('/login');
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  const menuItems = [
    { icon: Home, label: 'Dashboard', path: '/ambassador' },
    { icon: Calendar, label: 'Events', path: '/ambassador/events' },
    { icon: MapPin, label: 'Places', path: '/ambassador/places' },
    { icon: ShoppingBag, label: 'Vendors', path: '/ambassador/vendors' },
    { icon: Bell, label: 'Notifications', path: '/ambassador/notifications' },
    { icon: FileText, label: 'Submitted Events', path: '/ambassador/submitted-events' },
  ];

  // exact match for the dashboard root, "starts with" for the sub-sections
  const isActive = (path) =>
    path === '/ambassador'
      ? location.pathname === '/ambassador'
      : location.pathname.startsWith(path);

  const name = userProfile?.name || 'Ambassador';
  const avatar = userProfile?.avatar || userProfile?.photoURL;

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={onClose} />
      )}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">

          {/* Gradient header */}
          <div className="relative bg-gradient-to-br from-cyan-500 to-teal-500 px-5 py-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                  <GraduationCap size={22} className="text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-white leading-tight">Ambassador</h1>
                  <p className="text-[11px] text-cyan-50/90">OutingStation</p>
                </div>
              </div>
              <button onClick={onClose} className="lg:hidden p-2 hover:bg-white/15 rounded-lg text-white">
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Profile block */}
          <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
            <div className="relative flex-shrink-0">
              {avatar && (
                <img
                  src={avatar}
                  alt={name}
                  className="w-10 h-10 rounded-full object-cover"
                  onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                />
              )}
              <div
                className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 items-center justify-center text-white font-bold"
                style={{ display: avatar ? 'none' : 'flex' }}
              >
                {name.charAt(0).toUpperCase()}
              </div>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">{name}</p>
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full mt-0.5">
                🎓 Campus Ambassador
              </span>
            </div>
          </div>

          {/* Nav */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={onClose}
                  className={`relative flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                    active
                      ? 'bg-gradient-to-r from-cyan-50 to-teal-50 text-cyan-700 font-semibold'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {active && <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r bg-cyan-500" />}
                  <Icon size={20} />
                  <span className="font-medium">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Logout */}
          <div className="p-4 border-t border-gray-200">
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 w-full px-4 py-3 text-red-600 hover:bg-red-50 rounded-xl transition-colors"
            >
              <LogOut size={20} />
              <span className="font-medium">Logout</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}