import { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { AmbassadorSidebar } from '../../components/AmbassadorSidebar';
import { Menu, Calendar, MapPin, ShoppingBag, Bell, AlertTriangle, ArrowRight } from 'lucide-react';

export default function AmbassadorDashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [universities, setUniversities] = useState([]);
  const { userProfile } = useAuth();

  const assigned = userProfile?.assignedCampuses || [];
  const name = userProfile?.name || 'Ambassador';

  useEffect(() => {
    (async () => {
      try {
        const snap = await getDocs(collection(db, 'universities')); // ⚠️ change if your collection differs
        setUniversities(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (e) {
        console.error('Failed to load campuses:', e);
      }
    })();
  }, []);

  const uniName = (u) => u?.name || u?.title || u?.universityName || u?.shortName || u?.id || 'Unknown';
  const myCampuses = assigned.map(id => universities.find(u => u.id === id)).filter(Boolean);

  const cards = [
    { icon: Calendar, label: 'Events', desc: 'Create and manage events for your campus', to: '/ambassador/events', color: 'from-cyan-500 to-blue-500' },
    { icon: MapPin, label: 'Places', desc: 'Add and manage campus places (library, gym, etc.)', to: '/ambassador/places', color: 'from-purple-500 to-violet-500' },
    { icon: ShoppingBag, label: 'Vendors', desc: 'Review and accept vendors for your campus', to: '/ambassador/vendors', color: 'from-teal-500 to-emerald-500' },
    { icon: Bell, label: 'Notifications', desc: 'Message people who follow your campus', to: '/ambassador/notifications', color: 'from-amber-500 to-orange-500' },
  ];

  return (
    <div className="flex h-screen bg-gray-50">
      <AmbassadorSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="flex-1 overflow-auto">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 hover:bg-gray-100 rounded-lg">
              <Menu size={24} />
            </button>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Dashboard</h2>
              <p className="text-sm text-gray-500">Your campus control centre</p>
            </div>
          </div>
        </header>

        <div className="p-4 sm:p-6 lg:p-8">
          {/* Welcome */}
          <div className="bg-gradient-to-br from-cyan-500 to-teal-500 rounded-2xl p-6 text-white mb-6">
            <h3 className="text-2xl font-bold mb-1">Welcome back, {name.split(' ')[0]} 👋</h3>
            <p className="text-cyan-50/90 text-sm">Here's what you can manage today.</p>

            {/* Assigned campuses */}
            <div className="mt-4">
              {assigned.length === 0 ? (
                <div className="inline-flex items-center gap-2 bg-white/15 rounded-lg px-3 py-2 text-sm">
                  <AlertTriangle size={16} />
                  No campus assigned yet — ask your admin to assign you one.
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {myCampuses.length === 0 ? (
                    <span className="text-sm text-cyan-50/90">Loading your campus…</span>
                  ) : (
                    myCampuses.map(c => (
                      <span key={c.id} className="inline-flex items-center gap-1 bg-white/20 rounded-full px-3 py-1 text-sm font-medium">
                        <MapPin size={13} /> {uniName(c)}
                      </span>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Action cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {cards.map(card => {
              const Icon = card.icon;
              return (
                <Link
                  key={card.to}
                  to={card.to}
                  className="group bg-white rounded-2xl border border-gray-200 p-5 hover:shadow-md hover:border-cyan-300 transition"
                >
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center text-white mb-4`}>
                    <Icon size={22} />
                  </div>
                  <div className="flex items-center justify-between">
                    <h4 className="text-lg font-bold text-gray-900">{card.label}</h4>
                    <ArrowRight size={18} className="text-gray-300 group-hover:text-cyan-500 transition" />
                  </div>
                  <p className="text-sm text-gray-500 mt-1">{card.desc}</p>
                </Link>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}