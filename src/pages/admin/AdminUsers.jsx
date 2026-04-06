import { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  getDocs, 
  doc, 
  updateDoc,
  deleteDoc,
  orderBy,
  where
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
  Eye,
  UserCheck,
  UserX,
  Filter
} from 'lucide-react';
import { AdminSidebar } from '../../components/AdminSidebar';

export default function AdminUsers() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [userFilter, setUserFilter] = useState('all'); // all, admins, regular, banned
  const [expandedUser, setExpandedUser] = useState(null);
  const [stats, setStats] = useState({
    totalUsers: 0,
    adminUsers: 0,
    regularUsers: 0,
    bannedUsers: 0,
    verifiedEmails: 0
  });

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [users, searchQuery, userFilter]);

  const loadUsers = async () => {
    try {
      setLoading(true);

      // Get all users from Firestore
      const usersRef = collection(db, 'users');
      const usersSnapshot = await getDocs(usersRef);

      const usersData = usersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setUsers(usersData);

      // Calculate stats
      const calculatedStats = {
        totalUsers: usersData.length,
        adminUsers: usersData.filter(u => u.role === 'admin').length,
        regularUsers: usersData.filter(u => u.role !== 'admin' && u.banned !== true).length,
        bannedUsers: usersData.filter(u => u.banned === true).length,
        verifiedEmails: usersData.filter(u => u.emailVerified).length
      };

      setStats(calculatedStats);

    } catch (err) {
      console.error('Error loading users:', err);
      toast.error('Failed to load users');
    }
    setLoading(false);
  };

  const filterUsers = () => {
    let filtered = [...users];

    // Apply filter type
    if (userFilter === 'admins') {
      filtered = filtered.filter(u => u.role === 'admin');
    } else if (userFilter === 'regular') {
      filtered = filtered.filter(u => u.role !== 'admin' && u.banned !== true);
    } else if (userFilter === 'banned') {
      filtered = filtered.filter(u => u.banned === true);
    }

    // Apply search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(u => 
        u.name?.toLowerCase().includes(query) ||
        u.email?.toLowerCase().includes(query) ||
        u.phone?.toLowerCase().includes(query) ||
        u.id.toLowerCase().includes(query)
      );
    }

    setFilteredUsers(filtered);
  };

  const toggleAdmin = async (userId, currentRole) => {
    const isAdmin = currentRole === 'admin';
    const action = isAdmin ? 'remove admin access from' : 'grant admin access to';
    if (!confirm(`Are you sure you want to ${action} this user?`)) {
      return;
    }

    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        role: isAdmin ? 'user' : 'admin',
        updatedAt: new Date()
      });

      // Update local state
      setUsers(prev => prev.map(user => 
        user.id === userId 
          ? { ...user, role: isAdmin ? 'user' : 'admin' }
          : user
      ));

      toast.success(isAdmin ? '✅ Admin access removed' : '✅ Admin access granted');
    } catch (err) {
      console.error('Error updating admin status:', err);
      toast.error('Failed to update admin status');
    }
  };

  const toggleBan = async (userId, currentBanStatus) => {
    const action = currentBanStatus ? 'unban' : 'ban';
    if (!confirm(`Are you sure you want to ${action} this user?`)) {
      return;
    }

    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        banned: !currentBanStatus,
        bannedAt: !currentBanStatus ? new Date() : null,
        updatedAt: new Date()
      });

      // Update local state
      setUsers(prev => prev.map(user => 
        user.id === userId 
          ? { ...user, banned: !currentBanStatus, bannedAt: !currentBanStatus ? new Date() : null }
          : user
      ));

      toast.success(currentBanStatus ? '✅ User unbanned' : '✅ User banned');
    } catch (err) {
      console.error('Error updating ban status:', err);
      toast.error('Failed to update ban status');
    }
  };

  const deleteUser = async (userId) => {
    if (!confirm('⚠️ Are you sure you want to DELETE this user? This action cannot be undone!')) {
      return;
    }

    if (!confirm('⚠️⚠️ FINAL WARNING: This will permanently delete all user data!')) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'users', userId));

      // Update local state
      setUsers(prev => prev.filter(user => user.id !== userId));

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
    const headers = ['User ID', 'Name', 'Email', 'Phone', 'City', 'Role', 'Banned', 'Saved Events', 'Created At', 'Last Login'];
    const rows = filteredUsers.map(user => [
      user.id,
      user.name || 'N/A',
      user.email || 'N/A',
      user.phone || 'N/A',
      user.city || 'N/A',
      user.role || 'user',
      user.banned === true ? 'Yes' : 'No',
      user.savedEvents?.length || 0,
      user.createdAt?.seconds 
        ? new Date(user.createdAt.seconds * 1000).toLocaleDateString()
        : 'N/A',
      user.lastLoginAt?.seconds 
        ? new Date(user.lastLoginAt.seconds * 1000).toLocaleDateString()
        : 'N/A'
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
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <AdminSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <main className="flex-1 overflow-auto">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setSidebarOpen(true)} 
                className="lg:hidden p-2 hover:bg-gray-100 rounded-lg"
              >
                <Menu size={24} />
              </button>
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900">User Management</h2>
                <p className="text-sm text-gray-500">Manage all registered users</p>
              </div>
            </div>
            <button 
              onClick={loadUsers} 
              className="text-sm text-cyan-600 hover:text-cyan-700 font-medium"
            >
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                <div className="flex items-center gap-3 mb-2">
                  <Users className="text-cyan-500" size={24} />
                  <p className="text-sm text-gray-600">Total Users</p>
                </div>
                <p className="text-3xl font-bold text-gray-900">{stats.totalUsers}</p>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                <div className="flex items-center gap-3 mb-2">
                  <Shield className="text-purple-500" size={24} />
                  <p className="text-sm text-gray-600">Admins</p>
                </div>
                <p className="text-3xl font-bold text-gray-900">{stats.adminUsers}</p>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                <div className="flex items-center gap-3 mb-2">
                  <UserCheck className="text-green-500" size={24} />
                  <p className="text-sm text-gray-600">Regular</p>
                </div>
                <p className="text-3xl font-bold text-gray-900">{stats.regularUsers}</p>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                <div className="flex items-center gap-3 mb-2">
                  <Ban className="text-red-500" size={24} />
                  <p className="text-sm text-gray-600">Banned</p>
                </div>
                <p className="text-3xl font-bold text-gray-900">{stats.bannedUsers}</p>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                <div className="flex items-center gap-3 mb-2">
                  <Mail className="text-blue-500" size={24} />
                  <p className="text-sm text-gray-600">Verified</p>
                </div>
                <p className="text-3xl font-bold text-gray-900">{stats.verifiedEmails}</p>
              </div>
            </div>

            {/* Filters and Search */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
              <div className="flex flex-col md:flex-row gap-4">
                {/* Search */}
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search by name, email, or ID..."
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-transparent outline-none"
                    />
                  </div>
                </div>

                {/* Filter */}
                <div className="flex items-center gap-2">
                  <Filter size={20} className="text-gray-400" />
                  <select
                    value={userFilter}
                    onChange={(e) => setUserFilter(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-transparent outline-none"
                  >
                    <option value="all">👥 All Users</option>
                    <option value="admins">🛡️ Admins Only</option>
                    <option value="regular">✅ Regular Users</option>
                    <option value="banned">🚫 Banned Users</option>
                  </select>
                </div>

                {/* Export */}
                <button
                  onClick={exportUsersCSV}
                  className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition"
                >
                  <Download size={18} />
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
                  {filteredUsers.map((user) => (
                    <div key={user.id} className="hover:bg-gray-50 transition">
                      {/* User Row */}
                      <div className="px-6 py-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4 flex-1">
                            {/* Avatar */}
                            {user.avatar || user.photoURL ? (
                              <img 
                                src={user.avatar || user.photoURL} 
                                alt={user.name}
                                className="w-12 h-12 rounded-full object-cover"
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                  e.target.nextSibling.style.display = 'flex';
                                }}
                              />
                            ) : null}
                            <div 
                              className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-white font-bold text-lg"
                              style={{ display: (user.avatar || user.photoURL) ? 'none' : 'flex' }}
                            >
                              {user.name?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase() || '?'}
                            </div>

                            {/* User Info */}
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="text-lg font-semibold text-gray-900">
                                  {user.name || 'No name'}
                                </h3>
                                {user.role === 'admin' && (
                                  <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs font-medium">
                                    ADMIN
                                  </span>
                                )}
                                {user.banned === true && (
                                  <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs font-medium">
                                    BANNED
                                  </span>
                                )}
                                {user.city && (
                                  <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                                    📍 {user.city}
                                  </span>
                                )}
                              </div>
                              <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                                <span className="flex items-center gap-1">
                                  <Mail size={14} />
                                  {user.email || 'No email'}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Calendar size={14} />
                                  Joined {formatDate(user.createdAt)}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => toggleUserDetails(user.id)}
                              className="p-2 hover:bg-gray-100 rounded-lg transition"
                            >
                              {expandedUser === user.id ? (
                                <ChevronUp size={20} className="text-gray-600" />
                              ) : (
                                <ChevronDown size={20} className="text-gray-600" />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Expanded Details */}
                      {expandedUser === user.id && (
                        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                          {/* User Details */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                            <div className="bg-white rounded-lg p-4 shadow-sm">
                              <h4 className="font-semibold text-gray-900 mb-3">Account Details</h4>
                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-gray-600">User ID:</span>
                                  <span className="font-mono text-gray-900 text-xs">{user.id}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Name:</span>
                                  <span className="text-gray-900">{user.name || 'N/A'}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Email:</span>
                                  <span className="text-gray-900">{user.email || 'N/A'}</span>
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
                              </div>
                            </div>

                            <div className="bg-white rounded-lg p-4 shadow-sm">
                              <h4 className="font-semibold text-gray-900 mb-3">Activity</h4>
                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Saved Events:</span>
                                  <span className="font-semibold text-gray-900">{user.savedEvents?.length || 0}</span>
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

                          {/* Admin Actions */}
                          <div className="flex items-center gap-3 flex-wrap">
                            <button
                              onClick={() => toggleAdmin(user.id, user.role)}
                              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
                                user.role === 'admin'
                                  ? 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                                  : 'bg-purple-500 text-white hover:bg-purple-600'
                              }`}
                            >
                              <Shield size={18} />
                              {user.role === 'admin' ? 'Remove Admin' : 'Make Admin'}
                            </button>

                            <button
                              onClick={() => toggleBan(user.id, user.banned)}
                              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
                                user.banned
                                  ? 'bg-green-500 text-white hover:bg-green-600'
                                  : 'bg-red-100 text-red-700 hover:bg-red-200'
                              }`}
                            >
                              {user.banned ? <UserCheck size={18} /> : <Ban size={18} />}
                              {user.banned ? 'Unban User' : 'Ban User'}
                            </button>

                            <button
                              onClick={() => deleteUser(user.id)}
                              className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
                            >
                              <Trash2 size={18} />
                              Delete User
                            </button>
                          </div>

                          {user.banned === true && (
                            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                              <p className="text-sm text-red-700">
                                ⚠️ This user is currently banned and cannot access the platform.
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}