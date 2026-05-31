import { useState, useEffect } from 'react';
import { 
  collection, 
  getDocs, 
  doc, 
  updateDoc,
  deleteDoc,
} from 'firebase/firestore';
import { db } from '../../firebase';
import toast from 'react-hot-toast';
import { 
  Users, 
  Search, 
  Mail, 
  Calendar,
  Shield,
  Ban,
  Trash2,
  ChevronDown,
  ChevronUp,
  Download,
  Menu,
  UserCheck,
  Filter,
  Star,
  Lock,
  Unlock,
} from 'lucide-react';
import { AdminSidebar } from '../../components/AdminSidebar';
import {
  formatCredits,
  calculateAvailableCredits,
  REFERRAL_LIMIT_NORMAL,
  REFERRAL_LIMIT_AMBASSADOR,
} from '../../utils/referralUtils';

export default function AdminUsers() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [userFilter, setUserFilter] = useState('all');
  const [expandedUser, setExpandedUser] = useState(null);
  const [stats, setStats] = useState({
    totalUsers: 0,
    adminUsers: 0,
    regularUsers: 0,
    bannedUsers: 0,
    verifiedEmails: 0,
    ambassadors: 0,
    creditsLocked: 0,
    creditsUnlocked: 0,
  });

  useEffect(() => { loadUsers(); }, []);
  useEffect(() => { filterUsers(); }, [users, searchQuery, userFilter]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const usersData = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUsers(usersData);
      setStats({
        totalUsers: usersData.length,
        adminUsers: usersData.filter(u => u.role === 'admin').length,
        regularUsers: usersData.filter(u => u.role !== 'admin' && u.banned !== true).length,
        bannedUsers: usersData.filter(u => u.banned === true).length,
        verifiedEmails: usersData.filter(u => u.emailVerified).length,
        ambassadors: usersData.filter(u => u.isAmbassador === true).length,
        creditsLocked: usersData.filter(u => !u.isAmbassador && !u.creditsUnlocked).length,
        creditsUnlocked: usersData.filter(u => !u.isAmbassador && u.creditsUnlocked === true).length,
      });
    } catch (err) {
      console.error('Error loading users:', err);
      toast.error('Failed to load users');
    }
    setLoading(false);
  };

  const filterUsers = () => {
    let filtered = [...users];

    if (userFilter === 'admins') filtered = filtered.filter(u => u.role === 'admin');
    else if (userFilter === 'regular') filtered = filtered.filter(u => u.role !== 'admin' && u.banned !== true);
    else if (userFilter === 'banned') filtered = filtered.filter(u => u.banned === true);
    else if (userFilter === 'ambassadors') filtered = filtered.filter(u => u.isAmbassador === true);
    else if (userFilter === 'credits_locked') filtered = filtered.filter(u => !u.isAmbassador && !u.creditsUnlocked);
    else if (userFilter === 'credits_unlocked') filtered = filtered.filter(u => !u.isAmbassador && u.creditsUnlocked === true);

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(u =>
        u.name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.phone?.toLowerCase().includes(q) ||
        u.referralCode?.toLowerCase().includes(q) ||
        u.id.toLowerCase().includes(q)
      );
    }
    setFilteredUsers(filtered);
  };

  const toggleAdmin = async (userId, currentRole) => {
    const isAdmin = currentRole === 'admin';
    if (!confirm(`Are you sure you want to ${isAdmin ? 'remove admin access from' : 'grant admin access to'} this user?`)) return;
    try {
      await updateDoc(doc(db, 'users', userId), {
        role: isAdmin ? 'user' : 'admin',
        updatedAt: new Date()
      });
      setUsers(prev => prev.map(u =>
        u.id === userId ? { ...u, role: isAdmin ? 'user' : 'admin' } : u
      ));
      toast.success(isAdmin ? '✅ Admin access removed' : '✅ Admin access granted');
    } catch (err) {
      console.error('Error updating admin status:', err);
      toast.error('Failed to update admin status');
    }
  };

  // ✅ FIXED — never pass undefined to Firestore
  const toggleAmbassador = async (userId, currentAmbassadorStatus) => {
    if (!confirm(`Are you sure you want to ${currentAmbassadorStatus ? 'remove ambassador status from' : 'make'} this user an ambassador?`)) return;
    try {
      const newStatus = !currentAmbassadorStatus;

      // ✅ Build update object conditionally — never pass undefined
      const updateData = {
        isAmbassador: newStatus,
        ambassadorSince: newStatus ? new Date() : null,
        updatedAt: new Date(),
      };

      if (newStatus === true) {
        // Making an ambassador → unlock their credits
        updateData.creditsUnlocked = true;
      } else {
        // Removing the reward also removes any campus-ambassador role,
        // so the Users page and Campus Ambassadors page never get out of sync.
        updateData.isCampusAmbassador = false;
        updateData.assignedCampuses = [];
      }

      await updateDoc(doc(db, 'users', userId), updateData);

      setUsers(prev => prev.map(u =>
        u.id === userId
          ? {
              ...u,
              isAmbassador: newStatus,
              ambassadorSince: newStatus ? new Date() : null,
              ...(newStatus
                ? { creditsUnlocked: true }
                : { isCampusAmbassador: false, assignedCampuses: [] }),
            }
          : u
      ));

      setStats(prev => ({
        ...prev,
        ambassadors: newStatus ? prev.ambassadors + 1 : prev.ambassadors - 1,
      }));

      toast.success(currentAmbassadorStatus ? '✅ Ambassador status removed' : '⭐ User is now an Ambassador!');
    } catch (err) {
      console.error('Error updating ambassador status:', err);
      toast.error('Failed to update ambassador status');
    }
  };

  // ✅ Toggle credits unlock for regular users
  const toggleCreditsUnlock = async (userId, currentUnlocked, isAmbassador) => {
    if (isAmbassador) {
      toast.error('Ambassador credits are always unlocked');
      return;
    }
    const newState = !currentUnlocked;
    try {
      await updateDoc(doc(db, 'users', userId), {
        creditsUnlocked: newState,
        creditsUnlockedAt: newState ? new Date() : null,
        updatedAt: new Date(),
      });
      setUsers(prev => prev.map(u =>
        u.id === userId ? { ...u, creditsUnlocked: newState } : u
      ));
      setStats(prev => ({
        ...prev,
        creditsLocked: newState ? prev.creditsLocked - 1 : prev.creditsLocked + 1,
        creditsUnlocked: newState ? prev.creditsUnlocked + 1 : prev.creditsUnlocked - 1,
      }));
      toast.success(newState ? '🔓 Credits unlocked!' : '🔒 Credits locked');
    } catch (err) {
      console.error('Error updating credits status:', err);
      toast.error('Failed to update credits status');
    }
  };

  const toggleBan = async (userId, currentBanStatus) => {
    if (!confirm(`Are you sure you want to ${currentBanStatus ? 'unban' : 'ban'} this user?`)) return;
    try {
      await updateDoc(doc(db, 'users', userId), {
        banned: !currentBanStatus,
        bannedAt: !currentBanStatus ? new Date() : null,
        updatedAt: new Date(),
      });
      setUsers(prev => prev.map(u =>
        u.id === userId ? { ...u, banned: !currentBanStatus } : u
      ));
      toast.success(currentBanStatus ? '✅ User unbanned' : '✅ User banned');
    } catch (err) {
      console.error('Error updating ban status:', err);
      toast.error('Failed to update ban status');
    }
  };

  const deleteUser = async (userId) => {
    if (!confirm('⚠️ Are you sure you want to DELETE this user? This action cannot be undone!')) return;
    if (!confirm('⚠️⚠️ FINAL WARNING: This will permanently delete all user data!')) return;
    try {
      await deleteDoc(doc(db, 'users', userId));
      setUsers(prev => prev.filter(u => u.id !== userId));
      toast.success('✅ User deleted');
    } catch (err) {
      console.error('Error deleting user:', err);
      toast.error('Failed to delete user');
    }
  };

  const toggleUserDetails = (userId) => {
    setExpandedUser(expandedUser === userId ? null : userId);
  };

  const exportUsersCSV = () => {
    const headers = [
      'User ID', 'Name', 'Email', 'Phone', 'City', 'Role',
      'Ambassador', 'Credits Unlocked', 'Referral Code',
      'Total Referrals', 'Banned', 'Saved Events', 'Created At'
    ];
    const rows = filteredUsers.map(user => [
      user.id,
      user.name || 'N/A',
      user.email || 'N/A',
      user.phone || 'N/A',
      user.city || 'N/A',
      user.role || 'user',
      user.isAmbassador === true ? 'Yes' : 'No',
      user.isAmbassador ? 'Auto (Ambassador)' : (user.creditsUnlocked ? 'Yes' : 'No'),
      user.referralCode || 'N/A',
      user.totalReferrals || 0,
      user.banned === true ? 'Yes' : 'No',
      user.savedEvents?.length || 0,
      user.createdAt?.seconds
        ? new Date(user.createdAt.seconds * 1000).toLocaleDateString()
        : 'N/A',
    ]);
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `outingstation-users-${Date.now()}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('✅ Users exported to CSV!');
  };

  const formatDate = (timestamp) => {
    if (!timestamp?.seconds) return 'N/A';
    return new Date(timestamp.seconds * 1000).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <AdminSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="flex-1 overflow-auto">
        <header className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 hover:bg-gray-100 rounded-lg">
                <Menu size={24} />
              </button>
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900">User Management</h2>
                <p className="text-sm text-gray-500">Manage users, credits and ambassador status</p>
              </div>
            </div>
            <button onClick={loadUsers} className="text-sm text-cyan-600 hover:text-cyan-700 font-medium">
              ↻ Refresh
            </button>
          </div>
        </header>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
          </div>
        ) : (
          <div className="p-4 sm:p-6 lg:p-8">

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
              <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="text-cyan-500" size={18} />
                  <p className="text-xs text-gray-600">Total Users</p>
                </div>
                <p className="text-3xl font-bold text-gray-900">{stats.totalUsers}</p>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="text-purple-500" size={18} />
                  <p className="text-xs text-gray-600">Admins</p>
                </div>
                <p className="text-3xl font-bold text-gray-900">{stats.adminUsers}</p>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
                <div className="flex items-center gap-2 mb-2">
                  <UserCheck className="text-green-500" size={18} />
                  <p className="text-xs text-gray-600">Regular</p>
                </div>
                <p className="text-3xl font-bold text-gray-900">{stats.regularUsers}</p>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
                <div className="flex items-center gap-2 mb-2">
                  <Ban className="text-red-500" size={18} />
                  <p className="text-xs text-gray-600">Banned</p>
                </div>
                <p className="text-3xl font-bold text-gray-900">{stats.bannedUsers}</p>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
                <div className="flex items-center gap-2 mb-2">
                  <Mail className="text-blue-500" size={18} />
                  <p className="text-xs text-gray-600">Verified</p>
                </div>
                <p className="text-3xl font-bold text-gray-900">{stats.verifiedEmails}</p>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm border border-yellow-200">
                <div className="flex items-center gap-2 mb-2">
                  <Star className="text-yellow-500" size={18} />
                  <p className="text-xs text-gray-600">Ambassadors</p>
                </div>
                <p className="text-3xl font-bold text-gray-900">{stats.ambassadors}</p>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm border border-orange-200">
                <div className="flex items-center gap-2 mb-2">
                  <Lock className="text-orange-500" size={18} />
                  <p className="text-xs text-gray-600">Credits Locked</p>
                </div>
                <p className="text-3xl font-bold text-gray-900">{stats.creditsLocked}</p>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm border border-emerald-200">
                <div className="flex items-center gap-2 mb-2">
                  <Unlock className="text-emerald-500" size={18} />
                  <p className="text-xs text-gray-600">Credits Unlocked</p>
                </div>
                <p className="text-3xl font-bold text-gray-900">{stats.creditsUnlocked}</p>
              </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search by name, email, referral code or ID..."
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 outline-none text-sm"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Filter size={18} className="text-gray-400" />
                  <select
                    value={userFilter}
                    onChange={(e) => setUserFilter(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 outline-none text-sm"
                  >
                    <option value="all">👥 All Users</option>
                    <option value="admins">🛡️ Admins Only</option>
                    <option value="ambassadors">⭐ Ambassadors</option>
                    <option value="regular">✅ Regular Users</option>
                    <option value="banned">🚫 Banned Users</option>
                    <option value="credits_locked">🔒 Credits Locked</option>
                    <option value="credits_unlocked">🔓 Credits Unlocked</option>
                  </select>
                </div>
                <button
                  onClick={exportUsersCSV}
                  className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition text-sm"
                >
                  <Download size={16} />
                  Export CSV
                </button>
              </div>
              <p className="text-sm text-gray-500 mt-3">
                Showing {filteredUsers.length} of {stats.totalUsers} users
              </p>
            </div>

            {/* Users List */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Users</h2>
              </div>

              {filteredUsers.length === 0 ? (
                <div className="px-6 py-12 text-center text-gray-500">
                  <Users size={48} className="mx-auto mb-4 text-gray-300" />
                  <p>No users found matching your search</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {filteredUsers.map((user) => {
                    const isAmbassador = user.isAmbassador === true;
                    const creditsUnlocked = user.creditsUnlocked === true;
                    const creditsUsable = isAmbassador || creditsUnlocked;
                    const availableCredits = calculateAvailableCredits(user.creditsHistory || []);
                    const limit = isAmbassador ? REFERRAL_LIMIT_AMBASSADOR : REFERRAL_LIMIT_NORMAL;
                    const referrals = user.totalReferrals || 0;

                    return (
                      <div key={user.id} className="hover:bg-gray-50 transition">
                        <div className="px-6 py-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4 flex-1">

                              {/* ✅ Photo with gradient fallback */}
                              <div className="relative flex-shrink-0">
                                {(user.avatar || user.photoURL) && (
                                  <img
                                    src={user.avatar || user.photoURL}
                                    alt={user.name}
                                    className="w-12 h-12 rounded-full object-cover"
                                    onError={(e) => {
                                      e.target.style.display = 'none';
                                      e.target.nextSibling.style.display = 'flex';
                                    }}
                                  />
                                )}
                                <div
                                  className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 items-center justify-center text-white font-bold text-lg"
                                  style={{ display: (user.avatar || user.photoURL) ? 'none' : 'flex' }}
                                >
                                  {user.name?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase() || '?'}
                                </div>
                              </div>

                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                  <h3 className="text-base font-semibold text-gray-900">
                                    {user.name || 'No name'}
                                  </h3>
                                  {user.role === 'admin' && (
                                    <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs font-medium">ADMIN</span>
                                  )}
                                  {isAmbassador && (
                                    <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded text-xs font-medium">⭐ AMBASSADOR</span>
                                  )}
                                  {user.isCampusAmbassador === true && (
                                    <span className="px-2 py-0.5 bg-teal-100 text-teal-700 rounded text-xs font-medium">🎓 CAMPUS</span>
                                  )}
                                  {user.banned === true && (
                                    <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs font-medium">BANNED</span>
                                  )}
                                  {!isAmbassador && (
                                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                      creditsUnlocked
                                        ? 'bg-emerald-100 text-emerald-700'
                                        : 'bg-orange-100 text-orange-700'
                                    }`}>
                                      {creditsUnlocked ? '🔓 Credits Open' : '🔒 Credits Locked'}
                                    </span>
                                  )}
                                  {user.city && (
                                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                                      📍 {user.city}
                                    </span>
                                  )}
                                </div>
                                <div className="flex flex-wrap gap-3 text-sm text-gray-600">
                                  <span className="flex items-center gap-1">
                                    <Mail size={13} />{user.email || 'No email'}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Calendar size={13} />Joined {formatDate(user.createdAt)}
                                  </span>
                                  {availableCredits > 0 && (
                                    <span className={`font-semibold text-xs ${creditsUsable ? 'text-cyan-600' : 'text-orange-500'}`}>
                                      {formatCredits(availableCredits)} {creditsUsable ? 'credits' : 'credits (locked)'}
                                    </span>
                                  )}
                                  <span className="text-gray-400 text-xs">
                                    {referrals}/{limit} referrals
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              {/* ✅ Quick unlock/lock button */}
                              {!isAmbassador && (
                                <button
                                  onClick={() => toggleCreditsUnlock(user.id, creditsUnlocked, isAmbassador)}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1 ${
                                    creditsUnlocked
                                      ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                                      : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                                  }`}
                                >
                                  {creditsUnlocked
                                    ? <><Unlock size={11} /> Unlocked</>
                                    : <><Lock size={11} /> Locked</>
                                  }
                                </button>
                              )}

                              <button
                                onClick={() => toggleUserDetails(user.id)}
                                className="p-2 hover:bg-gray-100 rounded-lg transition"
                              >
                                {expandedUser === user.id
                                  ? <ChevronUp size={20} className="text-gray-600" />
                                  : <ChevronDown size={20} className="text-gray-600" />
                                }
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Expanded Details */}
                        {expandedUser === user.id && (
                          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">

                              <div className="bg-white rounded-lg p-4 shadow-sm">
                                <h4 className="font-semibold text-gray-900 mb-3">Account Details</h4>
                                <div className="space-y-2 text-sm">
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">User ID:</span>
                                    <span className="font-mono text-gray-900 text-xs truncate max-w-[160px]">{user.id}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">Name:</span>
                                    <span className="text-gray-900">{user.name || 'N/A'}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">Email:</span>
                                    <span className="text-gray-900 truncate max-w-[160px]">{user.email || 'N/A'}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">Phone:</span>
                                    <span className="text-gray-900">{user.phone || 'N/A'}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">City:</span>
                                    <span className="text-gray-900">{user.city || 'N/A'}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">Role:</span>
                                    <span className={`font-semibold ${user.role === 'admin' ? 'text-purple-600' : 'text-gray-900'}`}>
                                      {user.role || 'user'}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">Ambassador:</span>
                                    <span className={`font-semibold ${isAmbassador ? 'text-yellow-600' : 'text-gray-400'}`}>
                                      {isAmbassador ? '⭐ Yes' : 'No'}
                                    </span>
                                  </div>
                                  {user.isCampusAmbassador === true && (
                                    <div className="flex justify-between">
                                      <span className="text-gray-600">Campus Ambassador:</span>
                                      <span className="font-semibold text-teal-600">
                                        🎓 Yes ({(user.assignedCampuses || []).length} campus)
                                      </span>
                                    </div>
                                  )}
                                  {isAmbassador && user.ambassadorSince && (
                                    <div className="flex justify-between">
                                      <span className="text-gray-600">Ambassador Since:</span>
                                      <span className="text-gray-900">{formatDate(user.ambassadorSince)}</span>
                                    </div>
                                  )}
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">Referral Code:</span>
                                    <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">
                                      {user.referralCode || 'N/A'}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">Referrals:</span>
                                    <span className="font-semibold">{referrals} / {limit}</span>
                                  </div>
                                </div>
                              </div>

                              <div className="bg-white rounded-lg p-4 shadow-sm">
                                <h4 className="font-semibold text-gray-900 mb-3">Credits & Activity</h4>
                                <div className="space-y-2 text-sm">
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">Available Credits:</span>
                                    <span className={`font-semibold ${availableCredits > 0 ? 'text-cyan-600' : 'text-gray-400'}`}>
                                      {formatCredits(availableCredits)}
                                    </span>
                                  </div>
                                  <div className="flex justify-between items-center">
                                    <span className="text-gray-600">Credits Status:</span>
                                    {isAmbassador ? (
                                      <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded font-semibold">
                                        Auto-unlocked (Ambassador)
                                      </span>
                                    ) : (
                                      <span className={`text-xs px-2 py-0.5 rounded font-semibold ${
                                        creditsUnlocked
                                          ? 'bg-emerald-100 text-emerald-700'
                                          : 'bg-orange-100 text-orange-700'
                                      }`}>
                                        {creditsUnlocked ? '🔓 Unlocked' : '🔒 Locked'}
                                      </span>
                                    )}
                                  </div>
                                  {user.creditsUnlockedAt && !isAmbassador && (
                                    <div className="flex justify-between">
                                      <span className="text-gray-600">Unlocked At:</span>
                                      <span className="text-gray-900">{formatDate(user.creditsUnlockedAt)}</span>
                                    </div>
                                  )}
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">Saved Events:</span>
                                    <span className="font-semibold">{user.savedEvents?.length || 0}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">Created:</span>
                                    <span className="text-gray-900">{formatDate(user.createdAt)}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">Last Login:</span>
                                    <span className="text-gray-900">{formatDate(user.lastLoginAt)}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">Last Updated:</span>
                                    <span className="text-gray-900">{formatDate(user.updatedAt)}</span>
                                  </div>
                                  {user.banned === true && (
                                    <div className="flex justify-between">
                                      <span className="text-gray-600">Banned At:</span>
                                      <span className="text-red-600">{formatDate(user.bannedAt)}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex items-center gap-3 flex-wrap">
                              <button
                                onClick={() => toggleAdmin(user.id, user.role)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition text-sm ${
                                  user.role === 'admin'
                                    ? 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                                    : 'bg-purple-500 text-white hover:bg-purple-600'
                                }`}
                              >
                                <Shield size={16} />
                                {user.role === 'admin' ? 'Remove Admin' : 'Make Admin'}
                              </button>

                              {/* ✅ FIXED Ambassador button */}
                              <button
                                onClick={() => toggleAmbassador(user.id, isAmbassador)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition text-sm ${
                                  isAmbassador
                                    ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                                    : 'bg-yellow-500 text-white hover:bg-yellow-600'
                                }`}
                              >
                                <Star size={16} />
                                {isAmbassador ? 'Remove Ambassador' : 'Make Ambassador'}
                              </button>

                              {/* ✅ Credits unlock/lock button */}
                              {!isAmbassador && (
                                <button
                                  onClick={() => toggleCreditsUnlock(user.id, creditsUnlocked, isAmbassador)}
                                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition text-sm ${
                                    creditsUnlocked
                                      ? 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                                      : 'bg-emerald-500 text-white hover:bg-emerald-600'
                                  }`}
                                >
                                  {creditsUnlocked
                                    ? <><Lock size={16} /> Lock Credits</>
                                    : <><Unlock size={16} /> Unlock Credits</>
                                  }
                                </button>
                              )}

                              <button
                                onClick={() => toggleBan(user.id, user.banned)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition text-sm ${
                                  user.banned
                                    ? 'bg-green-500 text-white hover:bg-green-600'
                                    : 'bg-red-100 text-red-700 hover:bg-red-200'
                                }`}
                              >
                                {user.banned
                                  ? <><UserCheck size={16} /> Unban User</>
                                  : <><Ban size={16} /> Ban User</>
                                }
                              </button>

                              <button
                                onClick={() => deleteUser(user.id)}
                                className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition text-sm"
                              >
                                <Trash2 size={16} />
                                Delete User
                              </button>
                            </div>

                            {/* Status banners */}
                            {user.banned === true && (
                              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                                <p className="text-sm text-red-700">
                                  ⚠️ This user is currently banned and cannot access the platform.
                                </p>
                              </div>
                            )}

                            {user.isCampusAmbassador === true && (
                              <div className="mt-4 p-3 bg-teal-50 border border-teal-200 rounded-lg">
                                <p className="text-sm text-teal-700">
                                  🎓 Campus Ambassador — manage their assigned campuses on the <strong>Campus Ambassadors</strong> page.
                                  Removing their ⭐ here will also remove their campus role.
                                </p>
                              </div>
                            )}

                            {isAmbassador && (
                              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                <p className="text-sm text-yellow-700">
                                  ⭐ Ambassador — can refer up to {REFERRAL_LIMIT_AMBASSADOR} users. Credits always unlocked automatically.
                                </p>
                              </div>
                            )}

                            {/* ✅ Credits locked warning with quick unlock */}
                            {!isAmbassador && !creditsUnlocked && availableCredits > 0 && (
                              <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg flex items-start justify-between gap-3">
                                <p className="text-sm text-orange-700">
                                  🔒 This user has {formatCredits(availableCredits)} in credits but they are locked.
                                  Click "Unlock Credits" to allow this user to use their credits.
                                </p>
                                <button
                                  onClick={() => toggleCreditsUnlock(user.id, false, false)}
                                  className="flex-shrink-0 px-3 py-1.5 bg-emerald-500 text-white rounded-lg text-xs font-semibold hover:bg-emerald-600 transition"
                                >
                                  Unlock Now
                                </button>
                              </div>
                            )}
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
    </div>
  );
}