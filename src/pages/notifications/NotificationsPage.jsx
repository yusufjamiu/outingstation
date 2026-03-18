import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, ArrowLeft, Check, Trash2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { collection, query, where, orderBy, onSnapshot, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase';

export default function NotificationsPage() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, unread, read

  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
      return;
    }

    console.log('🔑 Current User ID:', currentUser.uid);
    console.log('📬 Loading notifications for user:', currentUser.uid);

    // Real-time listener for ALL user's notifications
    const notifQuery = query(
      collection(db, 'notifications'),
      where('userId', '==', currentUser.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(notifQuery, (snapshot) => {
      console.log('📨 Notifications received:', snapshot.size);
      
      const notifList = snapshot.docs.map(doc => {
        const data = { id: doc.id, ...doc.data() };
        console.log('Notification:', data);
        return data;
      });
      
      setNotifications(notifList);
      setLoading(false);
    }, (error) => {
      console.error('❌ Error loading notifications:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser, navigate]);

  const markAsRead = async (notificationId) => {
    try {
      await updateDoc(doc(db, 'notifications', notificationId), {
        read: true
      });
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const unreadNotifs = notifications.filter(n => !n.read);
      await Promise.all(
        unreadNotifs.map(n => 
          updateDoc(doc(db, 'notifications', n.id), { read: true })
        )
      );
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const deleteNotification = async (notificationId) => {
    try {
      await deleteDoc(doc(db, 'notifications', notificationId));
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const handleNotificationClick = async (notification) => {
    await markAsRead(notification.id);
    
    if (notification.eventId) {
      navigate(`/event/${notification.eventId}`);
    } else if (notification.link) {
      navigate(notification.link);
    }
  };

  const getTimeAgo = (timestamp) => {
    if (!timestamp) return 'Just now';
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const seconds = Math.floor((new Date() - date) / 1000);
    
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'unread') return !n.read;
    if (filter === 'read') return n.read;
    return true;
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition"
        >
          <ArrowLeft size={20} />
          <span>Back</span>
        </button>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Notifications</h1>
            <p className="text-gray-600 mt-1">
              {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}` : 'All caught up!'}
            </p>
          </div>

          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="flex items-center gap-2 px-4 py-2 bg-cyan-500 text-white rounded-lg font-medium hover:bg-cyan-600 transition"
            >
              <Check size={16} />
              Mark all read
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-200">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 font-medium transition ${
            filter === 'all'
              ? 'text-cyan-500 border-b-2 border-cyan-500'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          All ({notifications.length})
        </button>
        <button
          onClick={() => setFilter('unread')}
          className={`px-4 py-2 font-medium transition ${
            filter === 'unread'
              ? 'text-cyan-500 border-b-2 border-cyan-500'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Unread ({unreadCount})
        </button>
        <button
          onClick={() => setFilter('read')}
          className={`px-4 py-2 font-medium transition ${
            filter === 'read'
              ? 'text-cyan-500 border-b-2 border-cyan-500'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Read ({notifications.length - unreadCount})
        </button>
      </div>

      {/* Notifications List */}
      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
        </div>
      ) : filteredNotifications.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center">
          <Bell size={48} className="mx-auto mb-4 text-gray-300" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            {filter === 'unread' ? 'No unread notifications' : 
             filter === 'read' ? 'No read notifications' : 
             'No notifications yet'}
          </h3>
          <p className="text-gray-600">
            {filter === 'all' && "We'll notify you when something important happens!"}
            {filter === 'unread' && "All caught up! You're doing great."}
            {filter === 'read' && "No read notifications to show."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredNotifications.map((notif) => (
            <div
              key={notif.id}
              className={`bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition ${
                !notif.read ? 'border-l-4 border-cyan-500' : ''
              }`}
            >
              <div className="flex gap-4">
                {/* Icon */}
                <div className="flex-shrink-0 text-3xl mt-1">
                  {notif.type === 'event_reminder' && '📅'}
                  {notif.type === 'new_event' && '🎉'}
                  {notif.type === 'event_update' && '🔔'}
                  {notif.type === 'saved_event' && '❤️'}
                  {notif.type === 'welcome' && '🎉'}
                  {notif.type === 'announcement' && '📢'}
                  {!notif.type && '📬'}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-gray-900">
                      {notif.title}
                    </h3>
                    {!notif.read && (
                      <div className="w-2 h-2 bg-cyan-500 rounded-full flex-shrink-0 mt-2"></div>
                    )}
                  </div>
                  
                  <p className="text-gray-600 mt-1">{notif.message}</p>
                  
                  <div className="flex items-center gap-4 mt-3">
                    <span className="text-sm text-gray-500">
                      {getTimeAgo(notif.createdAt)}
                    </span>
                    
                    {(notif.eventId || notif.link) && (
                      <button
                        onClick={() => handleNotificationClick(notif)}
                        className="text-sm text-cyan-500 hover:underline font-medium"
                      >
                        View Details →
                      </button>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2">
                  {!notif.read && (
                    <button
                      onClick={() => markAsRead(notif.id)}
                      className="p-2 text-gray-400 hover:text-cyan-500 hover:bg-cyan-50 rounded-lg transition"
                      title="Mark as read"
                    >
                      <Check size={18} />
                    </button>
                  )}
                  <button
                    onClick={() => deleteNotification(notif.id)}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                    title="Delete"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}