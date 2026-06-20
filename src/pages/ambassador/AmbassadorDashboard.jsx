import { useState, useEffect } from 'react';
import { collection, getDocs, getDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { AmbassadorSidebar } from '../../components/AmbassadorSidebar';
import {
  Menu, Calendar, MapPin, ShoppingBag, Bell,
  AlertTriangle, ArrowRight, FileText, Plus, Wallet, Users, TrendingUp
} from 'lucide-react';

export default function AmbassadorDashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [universities, setUniversities] = useState([]);
  const [earnings, setEarnings] = useState(null);
  const { userProfile, currentUser } = useAuth();

  const isCityAmbassador = userProfile?.ambassadorType === 'city' && !userProfile?.isCampusAmbassador;
  const assigned = userProfile?.assignedCampuses || [];
  const name = userProfile?.name || 'Ambassador';
  const totalReferrals = userProfile?.totalReferrals || 0;
  const commissionUnlocked = totalReferrals >= 100;

  useEffect(() => {
    if (!isCityAmbassador) {
      getDocs(collection(db, 'universities'))
        .then(snap => setUniversities(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
        .catch(e => console.error('Failed to load campuses:', e));
    }

    if (currentUser) {
      getDoc(doc(db, 'ambassadorEarnings', currentUser.uid))
        .then(snap => { if (snap.exists()) setEarnings(snap.data()); })
        .catch(() => {});
    }
  }, [currentUser, isCityAmbassador]);

  const uniName = (u) => u?.name || u?.title || u?.id || 'Unknown';
  const myCampuses = assigned.map(id => universities.find(u => u.id === id)).filter(Boolean);

  // ── Campus ambassador cards
  const campusCards = [
    { icon: Calendar, label: 'Events', desc: 'Create and manage events for your campus', to: '/ambassador/events', color: 'from-cyan-500 to-blue-500' },
    { icon: MapPin, label: 'Places', desc: 'Add and manage campus places', to: '/ambassador/places', color: 'from-purple-500 to-violet-500' },
    { icon: ShoppingBag, label: 'Vendors', desc: 'Review and accept vendors for your campus', to: '/ambassador/vendors', color: 'from-teal-500 to-emerald-500' },
    { icon: Bell, label: 'Notifications', desc: 'Message people who follow your campus', to: '/ambassador/notifications', color: 'from-amber-500 to-orange-500' },
    { icon: FileText, label: 'Submitted Events', desc: 'Review and approve submitted events', to: '/ambassador/submitted-events', color: 'from-rose-500 to-pink-500' },
    { icon: Wallet, label: 'Earnings', desc: 'Track your referrals and commissions', to: '/ambassador/earnings', color: 'from-green-500 to-emerald-500' },
  ];

  // ── City ambassador cards
  const cityCards = [
    { icon: Plus, label: 'Create', desc: 'Submit an event or place in your city', to: '/ambassador/create', color: 'from-cyan-500 to-blue-500' },
    { icon: Wallet, label: 'Earnings', desc: 'Track your referrals and commissions', to: '/ambassador/earnings', color: 'from-green-500 to-emerald-500' },
    { icon: Bell, label: 'Notifications', desc: 'Receive updates from OutingStation', to: '/ambassador/notifications', color: 'from-amber-500 to-orange-500' },
  ];

  const cards = isCityAmbassador ? cityCards : campusCards;

  return (
    <div className="flex h-screen bg-gray-50">
      <AmbassadorSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="flex-1 overflow-auto">
        <header className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 hover:bg-gray-100 rounded-lg">
              <Menu size={24} />
            </button>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Dashboard</h2>
              <p className="text-sm text-gray-500">
                {isCityAmbassador ? `Your city control centre` : 'Your campus control centre'}
              </p>
            </div>
          </div>
        </header>

        <div className="p-4 sm:p-6 lg:p-8">

          {/* Welcome banner */}
          <div className="bg-gradient-to-br from-cyan-500 to-teal-500 rounded-2xl p-6 text-white mb-6">
            <h3 className="text-2xl font-bold mb-1">Welcome back, {name.split(' ')[0]} 👋</h3>
            <p className="text-cyan-50/90 text-sm mb-4">
              {isCityAmbassador
                ? `You're representing OutingStation in ${userProfile?.city || 'your city'}.`
                : "Here's what you can manage today."}
            </p>

            {/* City ambassador — show city + referral stats */}
            {isCityAmbassador ? (
              <div className="flex flex-wrap gap-3">
                {userProfile?.city ? (
                  <span className="inline-flex items-center gap-1 bg-white/20 rounded-full px-3 py-1 text-sm font-medium">
                    <MapPin size={13} /> {userProfile.city}
                  </span>
                ) : (
                  <div className="inline-flex items-center gap-2 bg-white/15 rounded-lg px-3 py-2 text-sm">
                    <AlertTriangle size={16} />
                    No city assigned yet — contact your admin.
                  </div>
                )}
                <span className="inline-flex items-center gap-1 bg-white/20 rounded-full px-3 py-1 text-sm font-medium">
                  <Users size={13} /> {totalReferrals} referrals
                </span>
                {commissionUnlocked && (
                  <span className="inline-flex items-center gap-1 bg-green-400/30 rounded-full px-3 py-1 text-sm font-medium">
                    💰 Commission unlocked
                  </span>
                )}
              </div>
            ) : (
              // Campus ambassador — show assigned campuses
              <div>
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
            )}
          </div>

          {/* Stats row — city ambassadors */}
          {isCityAmbassador && (
            <div className="grid grid-cols-3 gap-4 mb-6">
              {[
                {
                  label: 'Referrals',
                  value: totalReferrals,
                  icon: <Users size={18} className="text-cyan-500" />,
                  bg: 'bg-cyan-50',
                },
                {
                  label: 'Cash Earned',
                  value: `₦${(earnings?.totalEarned || 0).toLocaleString()}`,
                  icon: <TrendingUp size={18} className="text-green-500" />,
                  bg: 'bg-green-50',
                },
                {
                  label: 'Available',
                  value: `₦${(earnings?.availableBalance || 0).toLocaleString()}`,
                  icon: <Wallet size={18} className="text-purple-500" />,
                  bg: 'bg-purple-50',
                },
              ].map((stat, i) => (
                <div key={i} className={`${stat.bg} rounded-2xl p-4 border border-gray-100`}>
                  <div className="mb-2">{stat.icon}</div>
                  <p className="text-lg font-bold text-gray-900">{stat.value}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
                </div>
              ))}
            </div>
          )}

          {/* Commission unlock progress — city ambassadors */}
          {isCityAmbassador && !commissionUnlocked && (
            <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-bold text-gray-800">🔒 Commission unlocks at 100 referrals</p>
                <span className="text-xs text-gray-500">{totalReferrals}/100</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2.5">
                <div
                  className="bg-gradient-to-r from-cyan-400 to-cyan-500 h-2.5 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min((totalReferrals / 100) * 100, 100)}%` }}
                />
              </div>
              <p className="text-xs text-gray-400 mt-2">
                Refer {100 - totalReferrals} more people to unlock 50% commission from all events in {userProfile?.city || 'your city'}.
              </p>
            </div>
          )}

          {/* Action cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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