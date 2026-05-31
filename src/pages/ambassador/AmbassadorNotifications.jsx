import { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, deleteDoc, doc, serverTimestamp, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import { AmbassadorSidebar } from '../../components/AmbassadorSidebar';
import { Bell, Send, Users, CheckCircle, AlertCircle, Loader, Trash2, History, Menu, RefreshCw, GraduationCap, AlertTriangle } from 'lucide-react';

const notificationTypes = [
  { value: 'university_event', label: 'Event', emoji: '🎓' },
  { value: 'announcement', label: 'Announcement', emoji: '📢' },
  { value: 'promotion', label: 'Promotion', emoji: '🎉' },
  { value: 'update', label: 'Update', emoji: '🔔' },
];

export default function AmbassadorNotifications() {
  const { userProfile } = useAuth();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('send');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState('university_event');
  const [selectedCampus, setSelectedCampus] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);

  const [users, setUsers] = useState([]);
  const [universities, setUniversities] = useState([]);
  const [recentNotifications, setRecentNotifications] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [deletingNotif, setDeletingNotif] = useState(null);

  const assignedIds = userProfile?.assignedCampuses || [];
  const myCampuses = universities.filter(u => assignedIds.includes(u.id));
  const myCampusNames = myCampuses.map(u => u.name).filter(Boolean);

  const followerCount = (campusName) =>
    users.filter(u => (u.followedUniversities || []).includes(campusName)).length;

  useEffect(() => { loadAll(); }, []);

  useEffect(() => {
    if (activeTab === 'history') loadRecentNotifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // Auto-pick the campus when there's only one
  useEffect(() => {
    if (myCampuses.length === 1 && !selectedCampus) setSelectedCampus(myCampuses[0].name);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [universities]);

  const loadAll = async () => {
    try {
      const [usersSnap, uniSnap] = await Promise.all([
        getDocs(collection(db, 'users')),
        getDocs(collection(db, 'universities')),
      ]);
      setUsers(usersSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setUniversities(uniSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error('Error loading data:', err);
    }
  };

  const loadRecentNotifications = async () => {
    setLoadingHistory(true);
    try {
      const q = query(collection(db, 'notifications'), orderBy('createdAt', 'desc'), limit(200));
      const snapshot = await getDocs(q);
      const grouped = {};
      snapshot.docs.forEach(d => {
        const data = d.data();
        // only this ambassador's campuses
        if (!data.university || !myCampusNames.includes(data.university)) return;
        const key = `${data.title}|${data.message}|${data.createdAt?.seconds || 0}`;
        if (!grouped[key]) {
          grouped[key] = { id: d.id, title: data.title, message: data.message, type: data.type, university: data.university, createdAt: data.createdAt, recipients: [] };
        }
        grouped[key].recipients.push({ id: d.id });
      });
      setRecentNotifications(Object.values(grouped).slice(0, 20));
    } catch (err) {
      console.error('Error loading notifications:', err);
    }
    setLoadingHistory(false);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAll();
    if (activeTab === 'history') await loadRecentNotifications();
    setTimeout(() => setRefreshing(false), 400);
  };

  const sendNotification = async () => {
    if (!selectedCampus) { setResult({ type: 'error', message: 'Please select your campus' }); return; }
    if (!myCampusNames.includes(selectedCampus)) { setResult({ type: 'error', message: 'You can only message your assigned campus.' }); return; }
    if (!title.trim() || !message.trim()) { setResult({ type: 'error', message: 'Please fill in both title and message' }); return; }

    setSending(true);
    setResult(null);
    try {
      const targetUserIds = users
        .filter(u => (u.followedUniversities || []).includes(selectedCampus))
        .map(u => u.id);

      if (targetUserIds.length === 0) {
        setResult({ type: 'error', message: `No followers found for ${selectedCampus} yet` });
        setSending(false);
        return;
      }

      await Promise.all(targetUserIds.map(userId =>
        addDoc(collection(db, 'notifications'), {
          userId,
          title: title.trim(),
          message: message.trim(),
          type,
          university: selectedCampus,
          sentByAmbassador: true,
          read: false,
          createdAt: serverTimestamp(),
        })
      ));

      setResult({ type: 'success', message: `✅ Sent to ${targetUserIds.length} follower${targetUserIds.length !== 1 ? 's' : ''} of ${selectedCampus}!` });
      setTitle(''); setMessage(''); setType('university_event');
      if (activeTab === 'history') loadRecentNotifications();
    } catch (err) {
      setResult({ type: 'error', message: `❌ Error: ${err.message}` });
    }
    setSending(false);
  };

  const deleteNotificationBroadcast = async (notification) => {
    if (!window.confirm(`Delete this notification for ${notification.recipients.length} user(s)?\n\n"${notification.title}"`)) return;
    setDeletingNotif(notification.id);
    try {
      await Promise.all(notification.recipients.map(r => deleteDoc(doc(db, 'notifications', r.id))));
      setResult({ type: 'success', message: `✅ Deleted notification for ${notification.recipients.length} user(s)` });
      await loadRecentNotifications();
    } catch (err) {
      setResult({ type: 'error', message: `❌ Error deleting: ${err.message}` });
    }
    setDeletingNotif(null);
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Just now';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp.seconds * 1000);
    return date.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const noCampus = myCampuses.length === 0;
  const currentReach = selectedCampus ? followerCount(selectedCampus) : 0;

  return (
    <div className="flex h-screen bg-gray-50">
      <AmbassadorSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="flex-1 overflow-auto">
        <header className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 hover:bg-gray-100 rounded-lg">
                <Menu size={24} />
              </button>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-cyan-100 rounded-xl flex items-center justify-center">
                  <Bell size={20} className="sm:w-6 sm:h-6 text-cyan-600" />
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Notifications</h1>
                  <p className="text-sm text-gray-600 hidden sm:block">Message people who follow your campus</p>
                </div>
              </div>
            </div>
            <button onClick={handleRefresh} disabled={refreshing}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-cyan-600 hover:text-cyan-700 hover:bg-cyan-50 rounded-lg font-medium transition disabled:opacity-50">
              <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
              <span className="hidden sm:inline">{refreshing ? 'Refreshing...' : 'Refresh'}</span>
            </button>
          </div>
        </header>

        <div className="p-4 sm:p-6 lg:p-8">
          <div className="max-w-3xl mx-auto">

            {noCampus ? (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 flex items-start gap-3">
                <AlertTriangle className="text-amber-500 flex-shrink-0" size={22} />
                <div>
                  <p className="font-semibold text-amber-800">No campus assigned yet</p>
                  <p className="text-sm text-amber-700">Ask your admin to assign you a campus. Then you can message its followers here.</p>
                </div>
              </div>
            ) : (
              <>
                {/* Tabs */}
                <div className="flex gap-2 mb-6 bg-gray-100 p-1 rounded-lg">
                  <button onClick={() => setActiveTab('send')}
                    className={`flex-1 px-4 py-2 rounded-lg font-medium transition ${activeTab === 'send' ? 'bg-white text-cyan-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}>
                    <Send size={18} className="inline mr-2" />Send New
                  </button>
                  <button onClick={() => setActiveTab('history')}
                    className={`flex-1 px-4 py-2 rounded-lg font-medium transition ${activeTab === 'history' ? 'bg-white text-cyan-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}>
                    <History size={18} className="inline mr-2" />History
                  </button>
                </div>

                {/* Reach stat */}
                <div className="bg-gradient-to-r from-purple-50 to-violet-50 rounded-xl p-4 border border-purple-100 mb-6">
                  <div className="flex items-center gap-3">
                    <GraduationCap size={24} className="text-purple-600" />
                    <div>
                      <p className="text-sm text-gray-600">Followers of {selectedCampus || 'your campus'}</p>
                      <p className="text-2xl font-bold text-gray-900">{currentReach.toLocaleString()}</p>
                    </div>
                  </div>
                </div>

                {activeTab === 'send' ? (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 space-y-6">

                    {/* Campus (locked) */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-2">Your Campus</label>
                      {myCampuses.length === 1 ? (
                        <div className="px-4 py-3 border border-teal-200 rounded-lg bg-teal-50 text-teal-800 font-medium">
                          🎓 {myCampuses[0].name}
                        </div>
                      ) : (
                        <select value={selectedCampus} onChange={(e) => setSelectedCampus(e.target.value)}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 outline-none">
                          <option value="">Choose a campus...</option>
                          {myCampuses.map(uni => (
                            <option key={uni.id} value={uni.name}>{uni.name} ({followerCount(uni.name)} followers)</option>
                          ))}
                        </select>
                      )}
                    </div>

                    {/* Type */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-2">Type</label>
                      <div className="grid grid-cols-4 gap-3">
                        {notificationTypes.map(t => (
                          <button key={t.value} onClick={() => setType(t.value)}
                            className={`p-3 rounded-lg border-2 text-center transition-all ${type === t.value ? 'border-cyan-500 bg-cyan-50 text-cyan-700' : 'border-gray-200 text-gray-700 hover:border-gray-300'}`}>
                            <div className="text-2xl mb-1">{t.emoji}</div>
                            <div className="text-xs font-medium">{t.label}</div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Title */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-2">Title</label>
                      <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={100}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 outline-none"
                        placeholder={selectedCampus ? `🎓 New event at ${selectedCampus}!` : '🎉 Big news for your campus!'} />
                      <p className="text-xs text-gray-500 mt-1">{title.length}/100 characters</p>
                    </div>

                    {/* Message */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-2">Message</label>
                      <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={4} maxLength={500}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 outline-none"
                        placeholder="Write your message to your campus followers..." />
                      <p className="text-xs text-gray-500 mt-1">{message.length}/500 characters</p>
                    </div>

                    {/* Preview */}
                    {(title || message) && (
                      <div>
                        <label className="block text-sm font-semibold text-gray-900 mb-2">Preview</label>
                        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 flex gap-3">
                          <div className="flex-shrink-0 text-2xl">{notificationTypes.find(t => t.value === type)?.emoji || '📢'}</div>
                          <div className="flex-1">
                            <p className="font-semibold text-gray-900 mb-1">{title || 'Notification Title'}</p>
                            <p className="text-sm text-gray-600">{message || 'Your message will appear here...'}</p>
                            <p className="text-xs text-gray-500 mt-2">Just now</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Result */}
                    {result && (
                      <div className={`p-4 rounded-lg flex items-start gap-3 ${result.type === 'success' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                        {result.type === 'success' ? <CheckCircle size={20} className="text-green-600 flex-shrink-0 mt-0.5" /> : <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />}
                        <p className={`text-sm font-medium ${result.type === 'success' ? 'text-green-700' : 'text-red-700'}`}>{result.message}</p>
                      </div>
                    )}

                    {/* Send */}
                    <button onClick={sendNotification} disabled={!title.trim() || !message.trim() || !selectedCampus || sending}
                      className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 text-white py-4 rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                      {sending ? <><Loader size={20} className="animate-spin" />Sending...</> : <><Send size={20} />Send to {currentReach} follower{currentReach !== 1 ? 's' : ''}</>}
                    </button>
                  </div>
                ) : (
                  // History
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
                    <h2 className="text-lg font-bold text-gray-900 mb-4">Your Campus Broadcasts</h2>
                    {loadingHistory ? (
                      <div className="flex justify-center py-12"><Loader size={32} className="animate-spin text-cyan-500" /></div>
                    ) : recentNotifications.length === 0 ? (
                      <div className="text-center py-12">
                        <Bell size={48} className="mx-auto text-gray-300 mb-3" />
                        <p className="text-gray-500">No notifications sent for your campus yet</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {recentNotifications.map((notif) => (
                          <div key={notif.id} className="border border-gray-200 rounded-lg p-4 hover:border-cyan-300 transition">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-xl">{notificationTypes.find(t => t.value === notif.type)?.emoji || '📢'}</span>
                                  <p className="font-semibold text-gray-900 truncate">{notif.title}</p>
                                  {notif.university && (
                                    <span className="text-xs bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full font-medium flex-shrink-0">🎓 {notif.university}</span>
                                  )}
                                </div>
                                <p className="text-sm text-gray-600 mb-2 line-clamp-2">{notif.message}</p>
                                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs text-gray-500">
                                  <span>📤 Sent to {notif.recipients.length} user(s)</span>
                                  <span className="hidden sm:inline">•</span>
                                  <span>{formatDate(notif.createdAt)}</span>
                                </div>
                              </div>
                              <button onClick={() => deleteNotificationBroadcast(notif)} disabled={deletingNotif === notif.id}
                                className="flex-shrink-0 p-2 text-red-600 hover:bg-red-50 rounded-lg transition disabled:opacity-50">
                                {deletingNotif === notif.id ? <Loader size={18} className="animate-spin" /> : <Trash2 size={18} />}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}