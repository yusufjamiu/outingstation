import { useState, useEffect } from 'react';
import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase';
import { AdminSidebar } from '../../components/AdminSidebar';
import {
  Menu, Search, GraduationCap, Star, X, UserPlus, Trash2,
  MapPin, AlertTriangle, ChevronDown, ChevronUp,
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminAmbassadors() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  const [allUsers, setAllUsers] = useState([]);
  const [universities, setUniversities] = useState([]);

  const [searchQuery, setSearchQuery] = useState('');   // search within ambassadors list
  const [expandedId, setExpandedId] = useState(null);   // which ambassador's campus picker is open

  const [showAddModal, setShowAddModal] = useState(false);
  const [addSearch, setAddSearch] = useState('');       // search within the "add" user list

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    try {
      setLoading(true);
      const [usersSnap, uniSnap] = await Promise.all([
        getDocs(collection(db, 'users')),
        getDocs(collection(db, 'universities')), // ⚠️ change this string if your collection is named differently
      ]);
      setAllUsers(usersSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setUniversities(uniSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error(err);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  // resilient display name — works whatever your university field is called
  const uniName = (u) => u?.name || u?.title || u?.universityName || u?.shortName || u?.id || 'Unknown';
  const uniById = (id) => universities.find(u => u.id === id);

  // ---- Derived lists ----
  const ambassadors = allUsers.filter(u => u.isCampusAmbassador === true);

  const filteredAmbassadors = ambassadors.filter(u => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      u.name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q)
    );
  });

  const candidateUsers = allUsers
    .filter(u => u.isCampusAmbassador !== true)
    .filter(u => {
      if (!addSearch.trim()) return true;
      const q = addSearch.toLowerCase();
      return (
        u.name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q)
      );
    })
    .slice(0, 30);

  const stats = {
    total: ambassadors.length,
    assigned: ambassadors.filter(a => (a.assignedCampuses || []).length > 0).length,
    unassigned: ambassadors.filter(a => (a.assignedCampuses || []).length === 0).length,
    campuses: universities.length,
  };

  // ---- Actions ----
  const makeCampusAmbassador = async (userId) => {
    try {
      setProcessing(true);
      const updateData = {
        isCampusAmbassador: true,
        isAmbassador: true,           // campus ambassadors also get the reward perk
        ambassadorSince: new Date(),
        creditsUnlocked: true,
        updatedAt: new Date(),
      };
      await updateDoc(doc(db, 'users', userId), updateData);
      setAllUsers(prev => prev.map(u => u.id === userId ? { ...u, ...updateData } : u));
      toast.success('🎓 Campus Ambassador added!');
      setShowAddModal(false);
      setAddSearch('');
      setExpandedId(userId); // open their campus picker right away
    } catch (err) {
      console.error(err);
      toast.error('Failed to add ambassador');
    } finally {
      setProcessing(false);
    }
  };

  const removeCampusAmbassador = async (userId) => {
    if (!confirm('Remove campus ambassador access from this user? Their assigned campuses will be cleared.')) return;
    try {
      setProcessing(true);
      const updateData = {
        isCampusAmbassador: false,
        assignedCampuses: [],
        isAmbassador: false,
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

  const Avatar = ({ user, size = 'w-11 h-11' }) => (
    <div className="relative flex-shrink-0">
      {(user.avatar || user.photoURL) && (
        <img
          src={user.avatar || user.photoURL}
          alt={user.name}
          className={`${size} rounded-full object-cover`}
          onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
        />
      )}
      <div
        className={`${size} rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 items-center justify-center text-white font-bold`}
        style={{ display: (user.avatar || user.photoURL) ? 'none' : 'flex' }}
      >
        {user.name?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase() || '?'}
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-50">
      <AdminSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="flex-1 overflow-auto">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-4">
              <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 hover:bg-gray-100 rounded-lg">
                <Menu size={24} />
              </button>
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Campus Ambassadors</h2>
                <p className="text-sm text-gray-500">Appoint ambassadors and assign the campuses they manage</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={loadAll} className="text-sm text-cyan-600 hover:text-cyan-700 font-medium">↻ Refresh</button>
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition text-sm"
              >
                <UserPlus size={16} /> Add Ambassador
              </button>
            </div>
          </div>
        </header>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
          </div>
        ) : (
          <div className="p-4 sm:p-6 lg:p-8">

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              {[
                { label: 'Ambassadors', value: stats.total, color: 'text-cyan-600', bg: 'bg-cyan-50', icon: '🎓' },
                { label: 'With a campus', value: stats.assigned, color: 'text-green-600', bg: 'bg-green-50', icon: '✅' },
                { label: 'No campus yet', value: stats.unassigned, color: 'text-amber-600', bg: 'bg-amber-50', icon: '⚠️' },
                { label: 'Total campuses', value: stats.campuses, color: 'text-purple-600', bg: 'bg-purple-50', icon: '🏫' },
              ].map((s, i) => (
                <div key={i} className={`${s.bg} rounded-xl p-4 border border-gray-100`}>
                  <div className="text-2xl mb-1">{s.icon}</div>
                  <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-sm text-gray-500">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Search */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6 flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search ambassadors by name or email..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-cyan-400"
                />
              </div>
              <p className="text-sm text-gray-500 self-center">{filteredAmbassadors.length} ambassadors</p>
            </div>

            {/* Ambassadors list */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {filteredAmbassadors.length === 0 ? (
                <div className="text-center py-16">
                  <GraduationCap className="mx-auto text-gray-300 mb-3" size={48} />
                  <p className="text-gray-500 mb-4">No campus ambassadors yet</p>
                  <button
                    onClick={() => setShowAddModal(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition text-sm"
                  >
                    <UserPlus size={16} /> Add your first ambassador
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {filteredAmbassadors.map(amb => {
                    const assigned = amb.assignedCampuses || [];
                    const isOpen = expandedId === amb.id;
                    return (
                      <div key={amb.id} className="hover:bg-gray-50/60 transition">
                        {/* Row */}
                        <div className="p-4 sm:p-5">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <Avatar user={amb} />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="font-semibold text-gray-900 truncate">{amb.name || 'No name'}</p>
                                  <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded text-xs font-medium">⭐ Ambassador</span>
                                </div>
                                <p className="text-xs text-gray-500 truncate">{amb.email}</p>

                                {/* Assigned campus chips */}
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
                              <button
                                onClick={() => setExpandedId(isOpen ? null : amb.id)}
                                className="px-3 py-1.5 bg-teal-500 text-white rounded-lg text-xs font-semibold hover:bg-teal-600 transition flex items-center gap-1"
                              >
                                <GraduationCap size={13} />
                                {assigned.length > 0 ? 'Edit campuses' : 'Assign campus'}
                                {isOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                              </button>
                              <button
                                onClick={() => removeCampusAmbassador(amb.id)}
                                disabled={processing}
                                className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition disabled:opacity-50"
                                title="Remove campus ambassador"
                              >
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
                                Tap a campus to give or remove access. This ambassador only sees and manages events, vendors,
                                and followers for the campuses highlighted below.
                              </p>
                              {universities.length === 0 ? (
                                <p className="text-sm text-gray-500">No campuses found.</p>
                              ) : (
                                <div className="flex flex-wrap gap-2">
                                  {universities.map(uni => {
                                    const on = assigned.includes(uni.id);
                                    return (
                                      <button
                                        key={uni.id}
                                        onClick={() => toggleAssignedCampus(amb.id, uni.id, assigned)}
                                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${
                                          on
                                            ? 'bg-teal-600 text-white border-teal-600'
                                            : 'bg-white text-gray-700 border-gray-300 hover:border-teal-400'
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
          </div>
        )}
      </main>

      {/* Add Ambassador modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-gray-200">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Add Campus Ambassador</h3>
                <p className="text-sm text-gray-500">Pick a user to appoint. They'll also get the ⭐ reward perk.</p>
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
                      onClick={() => makeCampusAmbassador(u.id)}
                      disabled={processing}
                      className="flex-shrink-0 px-3 py-1.5 bg-cyan-500 text-white rounded-lg text-xs font-semibold hover:bg-cyan-600 transition disabled:opacity-50"
                    >
                      Make Ambassador
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