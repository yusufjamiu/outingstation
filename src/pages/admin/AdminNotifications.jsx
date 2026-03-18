import { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, serverTimestamp, query, where } from 'firebase/firestore';
import { db } from '../../firebase';
import { Bell, Send, Users, CheckCircle, AlertCircle, Loader } from 'lucide-react';

export default function AdminNotifications() {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState('announcement');
  const [targetAudience, setTargetAudience] = useState('all');
  const [selectedCity, setSelectedCity] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);
  const [userCount, setUserCount] = useState(0);
  const [cities, setCities] = useState([]);

  // Load user count and cities on mount
  useEffect(() => {
    loadUserStats();
  }, []);

  const loadUserStats = async () => {
    try {
      const usersSnapshot = await getDocs(collection(db, 'users'));
      setUserCount(usersSnapshot.size);
      
      // Extract unique cities
      const citySet = new Set();
      usersSnapshot.docs.forEach(doc => {
        const city = doc.data().city;
        if (city) {
          citySet.add(city);
        }
      });
      setCities(Array.from(citySet).sort());
    } catch (error) {
      console.error('Error loading user stats:', error);
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
      setResult({ 
        type: 'error', 
        message: 'Please select a city' 
      });
      return;
    }

    setSending(true);
    setResult(null);
    
    try {
      // Get target user IDs
      const userIds = await getTargetUsers();
      
      if (userIds.length === 0) {
        setResult({ 
          type: 'error', 
          message: 'No users found matching the criteria' 
        });
        setSending(false);
        return;
      }

      // Create notification for each user
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
    } catch (error) {
      console.error('Error sending notifications:', error);
      setResult({ 
        type: 'error', 
        message: `❌ Error: ${error.message}` 
      });
    }
    
    setSending(false);
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
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-cyan-100 rounded-xl flex items-center justify-center">
              <Bell size={24} className="text-cyan-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Send Notification</h1>
              <p className="text-gray-600">Broadcast messages to your users</p>
            </div>
          </div>
        </div>

        {/* Stats Card */}
        <div className="bg-gradient-to-r from-cyan-50 to-blue-50 rounded-xl p-6 mb-6 border border-cyan-100">
          <div className="flex items-center gap-3">
            <Users size={24} className="text-cyan-600" />
            <div>
              <p className="text-sm text-gray-600">Total Registered Users</p>
              <p className="text-2xl font-bold text-gray-900">{userCount.toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* Main Form Card */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200">
          <div className="p-6 space-y-6">
            
            {/* Target Audience */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-3">
                Target Audience
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {audienceOptions.map(option => (
                  <button
                    key={option.value}
                    onClick={() => {
                      setTargetAudience(option.value);
                      if (option.value === 'all') setSelectedCity('');
                    }}
                    className={`p-4 rounded-lg border-2 text-left transition-all ${
                      targetAudience === option.value
                        ? 'border-cyan-500 bg-cyan-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-medium text-gray-900">{option.label}</div>
                    <div className="text-sm text-gray-600 mt-1">{option.description}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* City Selector (if city targeting is selected) */}
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

            {/* Notification Type */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Notification Type
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
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

        {/* Tips Card */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-6">
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
          </ul>
        </div>
      </div>
    </div>
  );
}