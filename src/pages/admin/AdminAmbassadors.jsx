import { useState, useEffect } from 'react';
import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase';
import { AdminSidebar } from '../../components/AdminSidebar';
import {
  Menu, Search, GraduationCap, Star, X, UserPlus, Trash2,
  MapPin, AlertTriangle, ChevronDown, ChevronUp, Building2,
} from 'lucide-react';
import toast from 'react-hot-toast';

const NIGERIAN_STATES = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue',
  'Borno', 'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'FCT',
  'Gombe', 'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi',
  'Kwara', 'Lagos', 'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo',
  'Plateau', 'Rivers', 'Sokoto', 'Taraba', 'Yobe', 'Zamfara',
];

export default function AdminAmbassadors() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState('campus'); // 'campus' | 'city'

  const [allUsers, setAllUsers] = useState([]);
  const [universities, setUniversities] = useState([]);
  const [earnings, setEarnings] = useState({}); // ambassadorId → earnings data

  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addSearch, setAddSearch] = useState('');
  const [cityInput, setCityInput] = useState(''); // for city ambassador city assignment

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    try {
      setLoading(true);
      const [usersSnap, uniSnap, earningsSnap] = await Promise.all([
        getDocs(collection(db, 'users')),
        getDocs(collection(db, 'universities')),
        getDocs(collection(db, 'ambassadorEarnings')),
      ]);
      setAllUsers(usersSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setUniversities(uniSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      const earningsMap = {};
      earningsSnap.docs.forEach(d => { earningsMap[d.id] = d.data(); });
      setEarnings(earningsMap);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const uniName = (u) => u?.name || u?.title || u?.id || 'Unknown';
  const uniById = (id) => universities.find(u => u.id === id);

  // ── Derived lists ──
  const campusAmbassadors = allUsers.filter(u => u.isCampusAmbassador === true);
  const cityAmbassadors = allUsers.filter(u => u.isAmbassador === true && u.ambassadorType === 'city' && !u.isCampusAmbassador);

  const filteredCampus = campusAmbassadors.filter(u => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q);
  });

  const filteredCity = cityAmbassadors.filter(u => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q) || u.city?.toLowerCase().includes(q);
  });

  const candidateUsers = allUsers
    .filter(u => activeTab === 'campus' ? u.isCampusAmbassador !== true : !(u.isAmbassador === true && u.ambassadorType === 'city'))
    .filter(u => {
      if (!addSearch.trim()) return true;
      const q = addSearch.toLowerCase();
      return u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q);
    })
    .slice(0, 30);

  const stats = {
    campus: campusAmbassadors.length,
    city: cityAmbassadors.length,
    campusAssigned: campusAmbassadors.filter(a => (a.assignedCampuses || []).length > 0).length,
    cityAssigned: cityAmbassadors.filter(a => a.city).length,
  };

  // ── Campus Ambassador Actions ──
  const makeCampusAmbassador = async (userId) => {
    try {
      setProcessing(true);
      const updateData = {
        isCampusAmbassador: true,
        isAmbassador: true,
        ambassadorType: 'campus',
        ambassadorSince: new Date(),
        creditsUnlocked: true,
        updatedAt: new Date(),
      };
      await updateDoc(doc(db, 'users', userId), updateData);
      setAllUsers(prev => prev.map(u => u.id === userId ? { ...u, ...updateData } : u));
      toast.success('🎓 Campus Ambassador added!');
      setShowAddModal(false);
      setAddSearch('');
      setExpandedId(userId);
    } catch (err) {
      console.error(err);
      toast.error('Failed to add ambassador');
    } finally {
      setProcessing(false);
    }
  };

  const removeCampusAmbassador = async (userId) => {
    if (!confirm('Remove campus ambassador access?')) return;
    try {
      setProcessing(true);
      const updateData = {
        isCampusAmbassador: false,
        assignedCampuses: [],
        isAmbassador: false,
        ambassadorType: null,
        ambassadorSince: null,
        updatedAt: new Date(),
      };
      await updateDoc(doc(db, 'users', userId), updateData);
      setAllUsers(prev => prev.map(u => u.id === userId ? { ...u, ...updateData } : u));
      toast.success('Campus ambassador removed');
    } catch (err) {
      console.error(err);
      toast.error('Failed to remove ambassador');
    } finally {
      setProcessing(false);
    }
  };

  const toggleAssignedCampus = async (userId, campusId, current = []) => {
    const has = current.includes(campusId);
    const next = has ? current.filter(c => c !== campusId) : [...current, campusId];
    try {
      await updateDoc(doc(db, 'users', userId), { assignedCampuses: next, updatedAt: new Date() });
      setAllUsers(prev => prev.map(u => u.id === userId ? { ...u, assignedCampuses: next } : u));
      toast.success(has ? 'Campus unassigned' : 'Campus assigned');
    } catch (err) {
      console.error(err);
      toast.error('Failed to update campuses');
    }
  };

  // ── City Ambassador Actions ──
  const makeCityAmbassador = async (userId) => {
    try {
      setProcessing(true);
      const updateData = {
        isAmbassador: true,
        ambassadorType: 'city',
        isCampusAmbassador: false,
        ambassadorSince: new Date(),
        creditsUnlocked: true,
        updatedAt: new Date(),
      };
      await updateDoc(doc(db, 'users', userId), updateData);
      setAllUsers(prev => prev.map(u => u.id === userId ? { ...u, ...updateData } : u));
      toast.success('🏙️ City Ambassador added!');
      setShowAddModal(false);
      setAddSearch('');
      setExpandedId(userId);
    } catch (err) {
      console.error(err);
      toast.error('Failed to add city ambassador');
    } finally {
      setProcessing(false);
    }
  };

  const removeCityAmbassador = async (userId) => {
    if (!confirm('Remove city ambassador access?')) return;
    try {
      setProcessing(true);
      const updateData = {
        isAmbassador: false,
        ambassadorType: null,
        city: null,
        ambassadorSince: null,
        updatedAt: new Date(),
      };
      await updateDoc(doc(db, 'users', userId), updateData);
      setAllUsers(prev => prev.map(u => u.id === userId ? { ...u, ...updateData } : u));
      toast.success('City ambassador removed');
    } catch (err) {
      console.error(err);
      toast.error('Failed to remove city ambassador');
    } finally {
      setProcessing(false);
    }
  };

  const assignCity = async (userId, city) => {
    if (!city.trim()) { toast.error('Enter a city name'); return; }
    try {
      await updateDoc(doc(db, 'users', userId), { city: city.trim(), updatedAt: new Date() });
      setAllUsers(prev => prev.map(u => u.id === userId ? { ...u, city: city.trim() } : u));
      toast.success(`City assigned: ${city}`);
      setCityInput('');
    } catch (err) {
      console.error(err);
      toast.error('Failed to assign city');
    }
  };

  const Avatar = ({ user, size = 'w-11 h-11' }) => (
    <div className="relative flex-shrink-0">
      {(user.avatar || user.photoURL) && (
        <img src={user.avatar || user.photoURL} alt={user.name}
          className={`${size} rounded-full object-cover`}
          onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
        />
      )}
      <div
        className={`${size} rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 items-center justify-center text-white font-bold`}
        style={{ display: (user.avatar || user.photoURL) ? 'none' : 'flex' }}
      >
        {user.name?.charAt(0)?.toUpperCase() || '?'}
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-50">
      <AdminSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="flex-1 overflow-auto">
        <header className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-4">
              <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 hover:bg-gray-100 rounded-lg">
                <Menu size={24} />
              </button>
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Ambassadors</h2>
                <p className="text-sm text-gray-500">Manage campus and city ambassadors</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={loadAll} className="text-sm text-cyan-600 hover:text-cyan-700 font-medium">↻ Refresh</button>
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition text-sm"
              >
                <UserPlus size={16} />
                Add Ambassador
              </button>
            </div>
          </div>
        </header>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500" />
          </div>
        ) : (
          <div className="p-4 sm:p-6 lg:p-8">

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              {[
                { label: 'Campus Ambassadors', value: stats.campus, color: 'text-cyan-600', bg: 'bg-cyan-50', icon: '🎓' },
                { label: 'Campus Assigned', value: stats.campusAssigned, color: 'text-green-600', bg: 'bg-green-50', icon: '✅' },
                { label: 'City Ambassadors', value: stats.city, color: 'text-purple-600', bg: 'bg-purple-50', icon: '🏙️' },
                { label: 'City Assigned', value: stats.cityAssigned, color: 'text-orange-600', bg: 'bg-orange-50', icon: '📍' },
              ].map((s, i) => (
                <div key={i} className={`${s.bg} rounded-xl p-4 border border-gray-100`}>
                  <div className="text-2xl mb-1">{s.icon}</div>
                  <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-sm text-gray-500">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-6 w-fit">
              <button
                onClick={() => { setActiveTab('campus'); setSearchQuery(''); setExpandedId(null); }}
                className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
                  activeTab === 'campus' ? 'bg-white text-cyan-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                🎓 Campus ({stats.campus})
              </button>
              <button
                onClick={() => { setActiveTab('city'); setSearchQuery(''); setExpandedId(null); }}
                className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
                  activeTab === 'city' ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                🏙️ City ({stats.city})
              </button>
            </div>

            {/* Search */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6 flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder={`Search ${activeTab} ambassadors...`}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-cyan-400"
                />
              </div>
              <p className="text-sm text-gray-500 self-center">
                {activeTab === 'campus' ? filteredCampus.length : filteredCity.length} ambassadors
              </p>
            </div>

            {/* ── CAMPUS TAB ── */}
            {activeTab === 'campus' && (
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                {filteredCampus.length === 0 ? (
                  <div className="text-center py-16">
                    <GraduationCap className="mx-auto text-gray-300 mb-3" size={48} />
                    <p className="text-gray-500 mb-4">No campus ambassadors yet</p>
                    <button onClick={() => setShowAddModal(true)}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition text-sm">
                      <UserPlus size={16} /> Add your first
                    </button>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {filteredCampus.map(amb => {
                      const assigned = amb.assignedCampuses || [];
                      const isOpen = expandedId === amb.id;
                      const ambEarnings = earnings[amb.id];
                      return (
                        <div key={amb.id} className="hover:bg-gray-50/60 transition">
                          <div className="p-4 sm:p-5">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                <Avatar user={amb} />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <p className="font-semibold text-gray-900 truncate">{amb.name || 'No name'}</p>
                                    <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded text-xs font-medium">⭐ Ambassador</span>
                                    {(amb.totalReferrals || 0) >= 100 && (
                                      <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-medium">💰 Commission Unlocked</span>
                                    )}
                                  </div>
                                  <p className="text-xs text-gray-500 truncate">{amb.email}</p>
                                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                                    <span>👥 {amb.totalReferrals || 0} referrals</span>
                                    {ambEarnings && <span>💵 ₦{(ambEarnings.totalEarned || 0).toLocaleString()} earned</span>}
                                  </div>
                                  <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                                    {assigned.length === 0 ? (
                                      <span className="inline-flex items-center gap-1 text-xs text-amber-600">
                                        <AlertTriangle size={12} /> No campus assigned
                                      </span>
                                    ) : (
                                      assigned.map(cid => (
                                        <span key={cid} className="inline-flex items-center gap-1 px-2 py-0.5 bg-teal-100 text-teal-700 rounded-full text-xs font-medium">
                                          <MapPin size={11} /> {uniName(uniById(cid))}
                                        </span>
                                      ))
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <button onClick={() => setExpandedId(isOpen ? null : amb.id)}
                                  className="px-3 py-1.5 bg-teal-500 text-white rounded-lg text-xs font-semibold hover:bg-teal-600 transition flex items-center gap-1">
                                  <GraduationCap size={13} />
                                  {assigned.length > 0 ? 'Edit campuses' : 'Assign campus'}
                                  {isOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                                </button>
                                <button onClick={() => removeCampusAmbassador(amb.id)} disabled={processing}
                                  className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition disabled:opacity-50">
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Campus picker */}
                          {isOpen && (
                            <div className="px-4 sm:px-5 pb-5">
                              <div className="p-4 bg-teal-50 border border-teal-200 rounded-lg">
                                <h4 className="font-semibold text-teal-800 mb-1 flex items-center gap-2">
                                  <GraduationCap size={16} /> Assigned Campuses
                                </h4>
                                <p className="text-xs text-teal-700 mb-3">
                                  Tap a campus to give or remove access.
                                </p>
                                {universities.length === 0 ? (
                                  <p className="text-sm text-gray-500">No campuses found.</p>
                                ) : (
                                  <div className="flex flex-wrap gap-2">
                                    {universities.map(uni => {
                                      const on = assigned.includes(uni.id);
                                      return (
                                        <button key={uni.id}
                                          onClick={() => toggleAssignedCampus(amb.id, uni.id, assigned)}
                                          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${
                                            on ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-gray-700 border-gray-300 hover:border-teal-400'
                                          }`}
                                        >
                                          {on ? '✓ ' : ''}{uniName(uni)}
                                        </button>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ── CITY TAB ── */}
            {activeTab === 'city' && (
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                {filteredCity.length === 0 ? (
                  <div className="text-center py-16">
                    <Building2 className="mx-auto text-gray-300 mb-3" size={48} />
                    <p className="text-gray-500 mb-4">No city ambassadors yet</p>
                    <button onClick={() => setShowAddModal(true)}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition text-sm">
                      <UserPlus size={16} /> Add your first
                    </button>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {filteredCity.map(amb => {
                      const isOpen = expandedId === amb.id;
                      const ambEarnings = earnings[amb.id];
                      return (
                        <div key={amb.id} className="hover:bg-gray-50/60 transition">
                          <div className="p-4 sm:p-5">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                <Avatar user={amb} />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <p className="font-semibold text-gray-900 truncate">{amb.name || 'No name'}</p>
                                    <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs font-medium">🏙️ City Ambassador</span>
                                    {(amb.totalReferrals || 0) >= 100 && (
                                      <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-medium">💰 Commission Unlocked</span>
                                    )}
                                  </div>
                                  <p className="text-xs text-gray-500 truncate">{amb.email}</p>
                                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                                    <span>👥 {amb.totalReferrals || 0} referrals</span>
                                    {ambEarnings && <span>💵 ₦{(ambEarnings.totalEarned || 0).toLocaleString()} earned</span>}
                                  </div>
                                  <div className="mt-2">
                                    {amb.city ? (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                                        <MapPin size={11} /> {amb.city}
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 text-xs text-amber-600">
                                        <AlertTriangle size={12} /> No city assigned
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <button onClick={() => setExpandedId(isOpen ? null : amb.id)}
                                  className="px-3 py-1.5 bg-purple-500 text-white rounded-lg text-xs font-semibold hover:bg-purple-600 transition flex items-center gap-1">
                                  <MapPin size={13} />
                                  {amb.city ? 'Edit city' : 'Assign city'}
                                  {isOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                                </button>
                                <button onClick={() => removeCityAmbassador(amb.id)} disabled={processing}
                                  className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition disabled:opacity-50">
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* City assignment panel */}
                          {isOpen && (
                            <div className="px-4 sm:px-5 pb-5">
                              <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                                <h4 className="font-semibold text-purple-800 mb-1 flex items-center gap-2">
                                  <MapPin size={16} /> Assign City
                                </h4>
                                <p className="text-xs text-purple-700 mb-3">
                                  Select a state/city or type a custom city name.
                                </p>

                                {/* Quick state buttons */}
                                <div className="flex flex-wrap gap-2 mb-3">
                                  {['Lagos', 'Abuja', 'Port Harcourt', 'Kano', 'Ibadan', 'Enugu', 'Benin City'].map(city => (
                                    <button key={city}
                                      onClick={() => assignCity(amb.id, city)}
                                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${
                                        amb.city === city
                                          ? 'bg-purple-600 text-white border-purple-600'
                                          : 'bg-white text-gray-700 border-gray-300 hover:border-purple-400'
                                      }`}
                                    >
                                      {amb.city === city ? '✓ ' : ''}{city}
                                    </button>
                                  ))}
                                </div>

                                {/* Custom city input */}
                                <div className="flex gap-2">
                                  <input
                                    value={cityInput}
                                    onChange={e => setCityInput(e.target.value)}
                                    placeholder="Or type any city name..."
                                    className="flex-1 px-3 py-2 border border-purple-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-purple-400 bg-white"
                                  />
                                  <button
                                    onClick={() => assignCity(amb.id, cityInput)}
                                    className="px-4 py-2 bg-purple-500 text-white rounded-lg text-sm font-semibold hover:bg-purple-600 transition"
                                  >
                                    Assign
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

          </div>
        )}
      </main>

      {/* Add Ambassador Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-gray-200">
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  Add {activeTab === 'campus' ? 'Campus' : 'City'} Ambassador
                </h3>
                <p className="text-sm text-gray-500">
                  {activeTab === 'campus' ? 'Pick a user to appoint as campus ambassador' : 'Pick a user to appoint as city ambassador'}
                </p>
              </div>
              <button onClick={() => { setShowAddModal(false); setAddSearch(''); }} className="p-2 hover:bg-gray-100 rounded-lg">
                <X size={20} />
              </button>
            </div>

            <div className="p-5 border-b border-gray-100">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  autoFocus
                  type="text"
                  value={addSearch}
                  onChange={e => setAddSearch(e.target.value)}
                  placeholder="Search users by name or email..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-cyan-400"
                />
              </div>
            </div>

            <div className="overflow-y-auto p-2">
              {candidateUsers.length === 0 ? (
                <p className="text-center text-gray-500 py-10 text-sm">No matching users.</p>
              ) : (
                candidateUsers.map(u => (
                  <div key={u.id} className="flex items-center justify-between gap-3 p-3 hover:bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar user={u} size="w-9 h-9" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{u.name || 'No name'}</p>
                        <p className="text-xs text-gray-500 truncate">{u.email}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => activeTab === 'campus' ? makeCampusAmbassador(u.id) : makeCityAmbassador(u.id)}
                      disabled={processing}
                      className={`flex-shrink-0 px-3 py-1.5 text-white rounded-lg text-xs font-semibold transition disabled:opacity-50 ${
                        activeTab === 'campus' ? 'bg-cyan-500 hover:bg-cyan-600' : 'bg-purple-500 hover:bg-purple-600'
                      }`}
                    >
                      Make {activeTab === 'campus' ? 'Campus' : 'City'} Ambassador
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}