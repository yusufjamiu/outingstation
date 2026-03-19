import { useState, useEffect } from 'react';
import { Menu, Search, Edit, Trash2, Shield, Ban, CheckCircle, X, Save } from 'lucide-react';
import { AdminSidebar } from '../../components/AdminSidebar';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db, functions } from '../../firebase';
import { httpsCallable } from 'firebase/functions';

export default function AdminUsers() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({ name: '', phone: '', city: '', role: 'user', status: 'active' });

  useEffect(() => { loadUsers(); }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const snapshot = await getDocs(collection(db, 'users'));
      const usersData = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setUsers(usersData);
    } catch (err) {
      console.error('Error loading users:', err);
    }
    setLoading(false);
  };

  const handleToggleStatus = async (userId, currentStatus) => {
    const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
    try {
      await updateDoc(doc(db, 'users', userId), { status: newStatus });
      setUsers(users.map(u => u.id === userId ? { ...u, status: newStatus } : u));
    } catch (err) { 
      alert('Error: ' + err.message); 
    }
  };

  // ✅ FIXED: Changed userId to uid parameter
  const handleDeleteUser = async (userId, userName) => {
    if (window.confirm(`⚠️ PERMANENT DELETION\n\nAre you sure you want to permanently delete ${userName}?\n\nThis will:\n• Delete their Firebase Auth account\n• Delete their user profile\n\nThis action CANNOT be undone!`)) {
      try {
        setLoading(true);
        
        // ✅ Call Cloud Function with correct parameter name: uid (not userId)
        const deleteUserFunc = httpsCallable(functions, 'deleteUser');
        const result = await deleteUserFunc({ uid: userId });
        
        // ✅ Remove from local state
        setUsers(users.filter(u => u.id !== userId));
        
        // ✅ Show success message
        alert(`✅ ${result.data.message}`);
        
        setLoading(false);
      } catch (err) {
        setLoading(false);
        console.error('Delete error:', err);
        
        // ✅ Better error messages
        if (err.code === 'functions/permission-denied') {
          alert('❌ Permission denied: Only admins can delete users');
        } else if (err.code === 'functions/invalid-argument') {
          alert('❌ Invalid request');
        } else if (err.code === 'functions/unauthenticated') {
          alert('❌ You must be logged in to delete users');
        } else {
          alert('❌ Error deleting user: ' + err.message);
        }
      }
    }
  };

  const handleOpenEdit = (user) => {
    setEditingUser(user);
    setFormData({ 
      name: user.name || '', 
      phone: user.phone || '', 
      city: user.city || '', 
      role: user.role || 'user', 
      status: user.status || 'active' 
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    try {
      await updateDoc(doc(db, 'users', editingUser.id), { 
        ...formData, 
        updatedAt: new Date() 
      });
      setUsers(users.map(u => u.id === editingUser.id ? { ...u, ...formData } : u));
      setShowEditModal(false);
      alert('✅ User updated successfully!');
    } catch (err) { 
      alert('Error: ' + err.message); 
    }
  };

  // Handle Firestore Timestamp
  const formatDate = (user) => {
    if (user.createdAt?.toDate) {
      return user.createdAt.toDate().toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      });
    } else if (user.createdAt?.seconds) {
      const date = new Date(user.createdAt.seconds * 1000);
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      });
    }
    return 'N/A';
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch =
      (user.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (user.email || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterRole === 'all' || (user.role || 'user') === filterRole;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="flex h-screen bg-gray-50">
      <AdminSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className="flex-1 overflow-auto">
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
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Manage Users</h2>
                <p className="text-sm text-gray-500">{users.length} registered users</p>
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

        <div className="p-4 sm:p-6 lg:p-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input 
                  type="text" 
                  placeholder="Search by name or email..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-transparent outline-none" 
                />
              </div>
              <select 
                value={filterRole} 
                onChange={(e) => setFilterRole(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 outline-none"
              >
                <option value="all">All Roles</option>
                <option value="user">Users</option>
                <option value="organizer">Organizers</option>
                <option value="admin">Admins</option>
              </select>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Users</p>
                  <p className="text-2xl font-bold text-gray-900">{users.length}</p>
                </div>
                <Shield size={40} className="text-blue-500" />
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Active Users</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {users.filter(u => !u.status || u.status === 'active').length}
                  </p>
                </div>
                <CheckCircle size={40} className="text-green-500" />
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Suspended</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {users.filter(u => u.status === 'suspended').length}
                  </p>
                </div>
                <Ban size={40} className="text-red-500" />
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      {['User', 'Phone', 'City', 'Role', 'Status', 'Joined', 'Saved Events', 'Actions'].map(h => (
                        <th key={h} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredUsers.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <img
                              src={user.photoURL || user.photoUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name || user.email}`}
                              alt={user.name} 
                              className="w-9 h-9 rounded-full"
                              onError={e => e.target.style.display='none'} 
                            />
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {user.name || 'No name'}
                              </div>
                              <div className="text-sm text-gray-500">{user.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {user.phone || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {user.city || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                            user.role === 'admin' ? 'bg-red-100 text-red-700' :
                            user.role === 'organizer' ? 'bg-purple-100 text-purple-700' :
                            'bg-gray-100 text-gray-700'}`}>
                            {user.role || 'user'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                            !user.status || user.status === 'active' ? 
                            'bg-green-100 text-green-700' : 
                            'bg-red-100 text-red-700'}`}>
                            {user.status || 'active'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {formatDate(user)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {Array.isArray(user.savedEvents) ? user.savedEvents.length : 0}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <div className="flex items-center gap-2">
                            {/* Suspend/Activate Button */}
                            <button 
                              onClick={() => handleToggleStatus(user.id, user.status || 'active')}
                              className={`p-2 rounded-lg transition ${
                                !user.status || user.status === 'active' ? 
                                'text-orange-600 hover:bg-orange-50' : 
                                'text-green-600 hover:bg-green-50'}`}
                              title={!user.status || user.status === 'active' ? 'Suspend' : 'Activate'}
                            >
                              {!user.status || user.status === 'active' ? 
                                <Ban size={18} /> : 
                                <CheckCircle size={18} />
                              }
                            </button>
                            
                            {/* Edit Button */}
                            <button 
                              onClick={() => handleOpenEdit(user)} 
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition" 
                              title="Edit"
                            >
                              <Edit size={18} />
                            </button>
                            
                            {/* Delete Button */}
                            <button 
                              onClick={() => handleDeleteUser(user.id, user.name || user.email)} 
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition" 
                              title="Delete Permanently"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {filteredUsers.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-gray-500">
                    {users.length === 0 ? 'No registered users yet.' : 'No users match your search.'}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">Edit User</h3>
              <button 
                onClick={() => setShowEditModal(false)} 
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                <input 
                  type="text" 
                  value={formData.name} 
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 outline-none" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                <input 
                  type="tel" 
                  value={formData.phone} 
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 outline-none" 
                  placeholder="+234 800 000 0000" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                <input 
                  type="text" 
                  value={formData.city} 
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 outline-none" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                <select 
                  value={formData.role} 
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 outline-none"
                >
                  <option value="user">User</option>
                  <option value="organizer">Organizer</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select 
                  value={formData.status} 
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 outline-none"
                >
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button 
                  type="submit" 
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-2.5 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition font-medium"
                >
                  <Save size={20} />
                  <span>Save Changes</span>
                </button>
                <button 
                  type="button" 
                  onClick={() => setShowEditModal(false)} 
                  className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-medium"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
