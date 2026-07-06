import { useState } from 'react';
import {
  Home, Calendar, Users, Grid, GraduationCap, BarChart3, Unlock, LogOut, X,
  FileText, Bell, Ticket, Mail, Star, MapPin, ShoppingBag, ClipboardList,
  Wallet, Store, ChevronDown,
} from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

// ✅ Top-level items always visible, no grouping needed
const TOP_ITEMS = [
  { icon: Home, label: 'Dashboard', path: '/admin' },
];

// ✅ Grouped sections — click the group header to expand/collapse
const GROUPS = [
  {
    label: 'Listings',
    icon: Calendar,
    items: [
      { icon: Calendar, label: 'Events', path: '/admin/events' },
      { icon: MapPin, label: 'Places', path: '/admin/places' },
      { icon: ShoppingBag, label: 'Vendors', path: '/admin/vendors' },
      { icon: Store, label: 'Businesses', path: '/admin/businesses' },
      { icon: FileText, label: 'Event Submissions', path: '/admin/event-submissions' },
      { icon: Ticket, label: 'Ticketing', path: '/admin/tickets' },
    ],
  },
  {
    label: 'Community',
    icon: Users,
    items: [
      { icon: Users, label: 'Users', path: '/admin/users' },
      { icon: Star, label: 'Ambassadors', path: '/admin/ambassadors' },
      { icon: ClipboardList, label: 'Ambassador Applications', path: '/admin/ambassador-applications' },
      { icon: Wallet, label: 'Ambassador Payouts', path: '/admin/ambassador-payouts' },
      { icon: Unlock, label: 'Credit Requests', path: '/admin/credit-requests' },
    ],
  },
  {
    label: 'Configuration',
    icon: Grid,
    items: [
      { icon: Grid, label: 'Categories', path: '/admin/categories' },
      { icon: GraduationCap, label: 'Universities', path: '/admin/universities' },
    ],
  },
  {
    label: 'Marketing',
    icon: Bell,
    items: [
      { icon: BarChart3, label: 'Analytics', path: '/admin/saved-events-analytics' },
      { icon: Bell, label: 'Send Notification', path: '/admin/notifications' },
      { icon: Mail, label: 'Early Access', path: '/admin/early-access' },
    ],
  },
];

export function AdminSidebar({ isOpen, onClose }) {
  const location = useLocation();
  const navigate = useNavigate();

  // ✅ Auto-expand whichever group contains the current page, so you never
  // land on a page with its own nav item hidden inside a collapsed group
  const activeGroupLabel = GROUPS.find(g => g.items.some(i => i.path === location.pathname))?.label;
  const [openGroup, setOpenGroup] = useState(activeGroupLabel || null);

  const handleLogout = () => {
    localStorage.removeItem('adminAuth');
    navigate('/admin/login');
  };

  const toggleGroup = (label) => {
    setOpenGroup(prev => (prev === label ? null : label));
  };

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
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h1 className="text-xl font-bold text-gray-900">Admin Panel</h1>
            <button onClick={onClose} className="lg:hidden p-2 hover:bg-gray-100 rounded-lg">
              <X size={20} />
            </button>
          </div>

          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {/* Top-level items */}
            {TOP_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={onClose}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive ? 'bg-cyan-50 text-cyan-600' : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Icon size={20} />
                  <span className="font-medium">{item.label}</span>
                </Link>
              );
            })}

            {/* Grouped sections */}
            {GROUPS.map((group) => {
              const GroupIcon = group.icon;
              const isOpenGroup = openGroup === group.label;
              const groupHasActive = group.items.some(i => i.path === location.pathname);

              return (
                <div key={group.label} className="pt-1">
                  <button
                    onClick={() => toggleGroup(group.label)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-colors ${
                      groupHasActive ? 'text-cyan-600' : 'text-gray-500 hover:bg-gray-100'
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <GroupIcon size={20} />
                      <span className="font-semibold text-sm">{group.label}</span>
                    </span>
                    <ChevronDown size={16} className={`transition-transform ${isOpenGroup ? 'rotate-180' : ''}`} />
                  </button>

                  {isOpenGroup && (
                    <div className="pl-4 space-y-1 mt-1">
                      {group.items.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.path;
                        return (
                          <Link
                            key={item.path}
                            to={item.path}
                            onClick={onClose}
                            className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-colors ${
                              isActive ? 'bg-cyan-50 text-cyan-600 font-semibold' : 'text-gray-600 hover:bg-gray-100'
                            }`}
                          >
                            <Icon size={16} />
                            <span>{item.label}</span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>

          <div className="p-4 border-t border-gray-200">
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 w-full px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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