import { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, deleteDoc, doc, serverTimestamp, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '../../firebase';
import { AdminSidebar } from '../../components/AdminSidebar';
import { Bell, Send, Users, CheckCircle, AlertCircle, Loader, Trash2, History, Menu, RefreshCw } from 'lucide-react';

export default function AdminNotifications() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('send'); // 'send' or 'history'
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState('announcement');
  const [targetAudience, setTargetAudience] = useState('all');
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);
  const [userCount, setUserCount] = useState(0);
  const [cities, setCities] = useState([]);
  const [recentNotifications, setRecentNotifications] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [deletingNotif, setDeletingNotif] = useState(null);

  useEffect(() => {
    loadUserStats();
  }, []);

  useEffect(() => {
    if (activeTab === 'history') {
      loadRecentNotifications();
    }
  }, [activeTab]);

  const loadUserStats = async () => {
    try {
      const usersSnapshot = await getDocs(collection(db, 'users'));
      setUserCount(usersSnapshot.size);
      
      const citySet = new Set();
      usersSnapshot.docs.forEach(doc => {
        const city = doc.data().city;
        if (city) citySet.add(city);
      });
      setCities(Array.from(citySet).sort());
    } catch (error) {
      console.error('Error loading user stats:', error);
    }
  };

  const loadRecentNotifications = async () => {
    setLoadingHistory(true);
    try {
      // Get last 50 notifications grouped by title+message+createdAt
      const notificationsRef = collection(db, 'notifications');
      const q = query(
        notificationsRef,
        orderBy('createdAt', 'desc'),
        limit(100)
      );
      
      const snapshot = await getDocs(q);
      
      // Group by title+message+timestamp (same broadcast)
      const grouped = {};
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        const key = `${data.title}|${data.message}|${data.createdAt?.seconds || 0}`;
        
        if (!grouped[key]) {
          grouped[key] = {
            id: doc.id,
            title: data.title,
            message: data.message,
            type: data.type,
            createdAt: data.createdAt,
            recipients: []
          };
        }
        grouped[key].recipients.push({
          id: doc.id,
          userId: data.userId
        });
      });
      
      setRecentNotifications(Object.values(grouped).slice(0, 20));
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
    setLoadingHistory(false);
  };

  // ✅ REFRESH HANDLER
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      if (activeTab === 'history') {
        await loadRecentNotifications();
      }
      await loadUserStats();
      setTimeout(() => setRefreshing(false), 500);
    } catch (err) {
      console.error('Refresh error:', err);
      setRefreshing(false);
    }
  };

  const getTargetUsers = async () => {
    try {
      let usersQuery;
      
      if (targetAudience === 'all') {
        usersQuery = collection(db, 'users');
      } else if (targetAudience === 'city' && selectedCity) {
        usersQuery = query(
          collection(db, 'users'),
          where('city', '==', selectedCity)
        );
      } else if (targetAudience === 'role' && selectedRole) {
        usersQuery = query(
          collection(db, 'users'),
          where('role', '==', selectedRole)
        );
      } else {
        return [];
      }
      
      const snapshot = await getDocs(usersQuery);
      return snapshot.docs.map(doc => doc.id);
    } catch (error) {
      console.error('Error getting target users:', error);
      throw error;
    }
  };

  const sendNotification = async () => {
    if (!title.trim() || !message.trim()) {
      setResult({ 
        type: 'error', 
        message: 'Please fill in both title and message' 
      });
      return;
    }

    if (targetAudience === 'city' && !selectedCity) {
      setResult({ type: 'error', message: 'Please select a city' });
      return;
    }

    if (targetAudience === 'role' && !selectedRole) {
      setResult({ type: 'error', message: 'Please select a role' });
      return;
    }

    setSending(true);
    setResult(null);
    
    try {
      const userIds = await getTargetUsers();
      
      if (userIds.length === 0) {
        setResult({ 
          type: 'error', 
          message: 'No users found matching the criteria' 
        });
        setSending(false);
        return;
      }

      const promises = userIds.map(userId => 
        addDoc(collection(db, 'notifications'), {
          userId: userId,
          title: title.trim(),
          message: message.trim(),
          type: type,
          read: false,
          createdAt: serverTimestamp()
        })
      );
      
      await Promise.all(promises);
      
      setResult({ 
        type: 'success', 
        message: `✅ Successfully sent to ${userIds.length} user${userIds.length !== 1 ? 's' : ''}!` 
      });
      
      // Clear form
      setTitle('');
      setMessage('');
      setType('announcement');
      setTargetAudience('all');
      setSelectedCity('');
      setSelectedRole('');
      
      // Reload history if on that tab
      if (activeTab === 'history') {
        loadRecentNotifications();
      }
    } catch (error) {
      console.error('Error sending notifications:', error);
      setResult({ 
        type: 'error', 
        message: `❌ Error: ${error.message}` 
      });
    }
    
    setSending(false);
  };

  const deleteNotificationBroadcast = async (notification) => {
    if (!window.confirm(
      `Delete this notification for ${notification.recipients.length} user(s)?\n\n` +
      `"${notification.title}"\n\n` +
      `This cannot be undone!`
    )) {
      return;
    }

    setDeletingNotif(notification.id);
    
    try {
      // Delete all notifications in this broadcast
      const deletePromises = notification.recipients.map(recipient => 
        deleteDoc(doc(db, 'notifications', recipient.id))
      );
      
      await Promise.all(deletePromises);
      
      setResult({
        type: 'success',
        message: `✅ Deleted notification for ${notification.recipients.length} user(s)`
      });
      
      // Reload history
      await loadRecentNotifications();
    } catch (error) {
      console.error('Error deleting notifications:', error);
      setResult({
        type: 'error',
        message: `❌ Error deleting: ${error.message}`
      });
    }
    
    setDeletingNotif(null);
  };

  const notificationTypes = [
    { value: 'announcement', label: '📢 Announcement', emoji: '📢' },
    { value: 'new_feature', label: '✨ New Feature', emoji: '✨' },
    { value: 'promotion', label: '🎉 Promotion', emoji: '🎉' },
    { value: 'maintenance', label: '🔧 Maintenance', emoji: '🔧' },
    { value: 'update', label: '🔔 Update', emoji: '🔔' },
  ];

  const audienceOptions = [
    { value: 'all', label: 'All Users', description: `Send to all ${userCount} users` },
    { value: 'city', label: 'Specific City', description: 'Target users in a specific city' },
    { value: 'role', label: 'By Role', description: 'Target users by role (admin, organizer, user)' },
  ];

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Just now';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp.seconds * 1000);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* ✅ ADMIN SIDEBAR */}
      <AdminSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* ✅ MAIN CONTENT */}
      <main className="flex-1 overflow-auto">
        {/* ✅ HEADER WITH MENU BUTTON */}
        <header className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 hover:bg-gray-100 rounded-lg"
              >
                <Menu size={24} />
              </button>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-cyan-100 rounded-xl flex items-center justify-center">
                  <Bell size={20} className="sm:w-6 sm:h-6 text-cyan-600" />
                </div>
                <div>
                  <h1 className="text-xl sm:text-3xl font-bold text-gray-900">Notifications</h1>
                  <p className="text-sm text-gray-600 hidden sm:block">Broadcast messages to your users</p>
                </div>
              </div>
            </div>

            {/* ✅ REFRESH BUTTON */}
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-cyan-600 hover:text-cyan-700 hover:bg-cyan-50 rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw 
                size={16} 
                className={refreshing ? 'animate-spin' : ''} 
              />
              <span className="hidden sm:inline">
                {refreshing ? 'Refreshing...' : 'Refresh'}
              </span>
            </button>
          </div>
        </header>

        {/* ✅ PAGE CONTENT */}
        <div className="p-4 sm:p-6 lg:p-8">
          <div className="max-w-4xl mx-auto">
            {/* Tabs */}
            <div className="flex gap-2 mb-6 bg-gray-100 p-1 rounded-lg">
              <button
                onClick={() => setActiveTab('send')}
                className={`flex-1 px-4 py-2 rounded-lg font-medium transition ${
                  activeTab === 'send'
                    ? 'bg-white text-cyan-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Send size={18} className="inline mr-2" />
                <span className="hidden sm:inline">Send New</span>
                <span className="sm:hidden">Send</span>
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`flex-1 px-4 py-2 rounded-lg font-medium transition ${
                  activeTab === 'history'
                    ? 'bg-white text-cyan-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <History size={18} className="inline mr-2" />
                History
              </button>
            </div>

            {/* Stats Card */}
            <div className="bg-gradient-to-r from-cyan-50 to-blue-50 rounded-xl p-4 sm:p-6 mb-6 border border-cyan-100">
              <div className="flex items-center gap-3">
                <Users size={24} className="text-cyan-600" />
                <div>
                  <p className="text-sm text-gray-600">Total Registered Users</p>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900">{userCount.toLocaleString()}</p>
                </div>
              </div>
            </div>

            {/* TAB CONTENT */}
            {activeTab === 'send' ? (
              // SEND NEW NOTIFICATION
              <div className="bg-white rounded-xl shadow-lg border border-gray-200">
                <div className="p-4 sm:p-6 space-y-6">
                  
                  {/* Target Audience */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-3">
                      Target Audience
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {audienceOptions.map(option => (
                        <button
                          key={option.value}
                          onClick={() => {
                            setTargetAudience(option.value);
                            if (option.value === 'all') {
                              setSelectedCity('');
                              setSelectedRole('');
                            }
                          }}
                          className={`p-4 rounded-lg border-2 text-left transition-all ${
                            targetAudience === option.value
                              ? 'border-cyan-500 bg-cyan-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="font-medium text-gray-900 text-sm sm:text-base">{option.label}</div>
                          <div className="text-xs sm:text-sm text-gray-600 mt-1">{option.description}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* City Selector */}
                  {targetAudience === 'city' && (
                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-2">
                        Select City
                      </label>
                      <select
                        value={selectedCity}
                        onChange={(e) => setSelectedCity(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                      >
                        <option value="">Choose a city...</option>
                        {cities.map(city => (
                          <option key={city} value={city}>{city}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Role Selector */}
                  {targetAudience === 'role' && (
                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-2">
                        Select Role
                      </label>
                      <select
                        value={selectedRole}
                        onChange={(e) => setSelectedRole(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                      >
                        <option value="">Choose a role...</option>
                        <option value="user">Users</option>
                        <option value="organizer">Organizers</option>
                        <option value="admin">Admins</option>
                      </select>
                    </div>
                  )}

                  {/* Notification Type */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      Notification Type
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                      {notificationTypes.map(notifType => (
                        <button
                          key={notifType.value}
                          onClick={() => setType(notifType.value)}
                          className={`p-3 rounded-lg border-2 text-center transition-all ${
                            type === notifType.value
                              ? 'border-cyan-500 bg-cyan-50 text-cyan-700'
                              : 'border-gray-200 text-gray-700 hover:border-gray-300'
                          }`}
                        >
                          <div className="text-2xl mb-1">{notifType.emoji}</div>
                          <div className="text-xs font-medium">{notifType.label.replace(/^.\s/, '')}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Title */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      Title
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                      placeholder="🎉 New Feature Launched!"
                      maxLength={100}
                    />
                    <p className="text-xs text-gray-500 mt-1">{title.length}/100 characters</p>
                  </div>
                  
                  {/* Message */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      Message
                    </label>
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                      rows={4}
                      placeholder="Check out our new event filters and enhanced search!"
                      maxLength={500}
                    />
                    <p className="text-xs text-gray-500 mt-1">{message.length}/500 characters</p>
                  </div>

                  {/* Preview */}
                  {(title || message) && (
                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-2">
                        Preview
                      </label>
                      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <div className="flex gap-3">
                          <div className="flex-shrink-0 text-2xl">
                            {notificationTypes.find(t => t.value === type)?.emoji || '📢'}
                          </div>
                          <div className="flex-1">
                            <p className="font-semibold text-gray-900 mb-1">
                              {title || 'Notification Title'}
                            </p>
                            <p className="text-sm text-gray-600">
                              {message || 'Your message will appear here...'}
                            </p>
                            <p className="text-xs text-gray-500 mt-2">Just now</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Result Message */}
                  {result && (
                    <div className={`p-4 rounded-lg flex items-start gap-3 ${
                      result.type === 'success' 
                        ? 'bg-green-50 border border-green-200' 
                        : 'bg-red-50 border border-red-200'
                    }`}>
                      {result.type === 'success' ? (
                        <CheckCircle size={20} className="text-green-600 flex-shrink-0 mt-0.5" />
                      ) : (
                        <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
                      )}
                      <p className={`text-sm font-medium ${
                        result.type === 'success' ? 'text-green-700' : 'text-red-700'
                      }`}>
                        {result.message}
                      </p>
                    </div>
                  )}

                  {/* Send Button */}
                  <button
                    onClick={sendNotification}
                    disabled={!title.trim() || !message.trim() || sending}
                    className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 text-white py-4 rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {sending ? (
                      <>
                        <Loader size={20} className="animate-spin" />
                        <span>Sending...</span>
                      </>
                    ) : (
                      <>
                        <Send size={20} />
                        <span>Send Notification</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              // HISTORY TAB
              <div className="bg-white rounded-xl shadow-lg border border-gray-200">
                <div className="p-4 sm:p-6">
                  <h2 className="text-lg font-bold text-gray-900 mb-4">Recent Broadcasts</h2>
                  
                  {loadingHistory ? (
                    <div className="flex justify-center py-12">
                      <Loader size={32} className="animate-spin text-cyan-500" />
                    </div>
                  ) : recentNotifications.length === 0 ? (
                    <div className="text-center py-12">
                      <Bell size={48} className="mx-auto text-gray-300 mb-3" />
                      <p className="text-gray-500">No notifications sent yet</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {recentNotifications.map((notif) => (
                        <div
                          key={notif.id}
                          className="border border-gray-200 rounded-lg p-4 hover:border-cyan-300 transition"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xl">
                                  {notificationTypes.find(t => t.value === notif.type)?.emoji || '📢'}
                                </span>
                                <p className="font-semibold text-gray-900 truncate">{notif.title}</p>
                              </div>
                              <p className="text-sm text-gray-600 mb-2 line-clamp-2">{notif.message}</p>
                              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs text-gray-500">
                                <span>📤 Sent to {notif.recipients.length} user(s)</span>
                                <span className="hidden sm:inline">•</span>
                                <span>{formatDate(notif.createdAt)}</span>
                              </div>
                            </div>
                            
                            <button
                              onClick={() => deleteNotificationBroadcast(notif)}
                              disabled={deletingNotif === notif.id}
                              className="flex-shrink-0 p-2 text-red-600 hover:bg-red-50 rounded-lg transition disabled:opacity-50"
                              title="Delete for all recipients"
                            >
                              {deletingNotif === notif.id ? (
                                <Loader size={18} className="animate-spin" />
                              ) : (
                                <Trash2 size={18} />
                              )}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Tips Card */}
            <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4 sm:p-6">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <AlertCircle size={18} className="text-blue-600" />
                Best Practices
              </h3>
              <ul className="space-y-2 text-sm text-gray-700">
                <li>• Keep titles short and attention-grabbing (under 50 characters)</li>
                <li>• Use emojis to make notifications more engaging</li>
                <li>• Be specific about what action users should take</li>
                <li>• Test with a small group before sending to all users</li>
                <li>• Avoid sending notifications too frequently (max 2-3 per week)</li>
                <li>• You can delete sent notifications from the History tab</li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}