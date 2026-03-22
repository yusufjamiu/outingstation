import { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, serverTimestamp, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { Bell, Send, Users, MapPin, X, Loader, CheckCircle, AlertCircle } from 'lucide-react';

export default function NotifyUsersModal({ event, onClose }) {
  const [targetAudience, setTargetAudience] = useState('all');
  const [selectedCity, setSelectedCity] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);
  const [cities, setCities] = useState([]);
  const [userCount, setUserCount] = useState(0);

  useEffect(() => {
    loadCitiesAndCount();
  }, []);

  const loadCitiesAndCount = async () => {
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
      console.error('Error loading cities:', error);
    }
  };

  const getTargetUsers = async () => {
    try {
      let usersQuery;
      
      if (targetAudience === 'all') {
        usersQuery = collection(db, 'users');
      } else if (targetAudience === 'event_city') {
        // Notify users in the event's city
        usersQuery = query(
          collection(db, 'users'),
          where('city', '==', event.location)
        );
      } else if (targetAudience === 'custom_city' && selectedCity) {
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

  const sendNotifications = async () => {
    if (targetAudience === 'custom_city' && !selectedCity) {
      setResult({ type: 'error', message: 'Please select a city' });
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

      // Create notification for each user
      const isPlace = event.subCategory === 'places';
      const title = `🎉 New ${isPlace ? 'Place' : 'Event'} Added!`;
      const message = `Check out "${event.title}" in ${event.location}${!event.isFree ? ` - ₦${event.price}` : ' - FREE!'}`;

      const promises = userIds.map(userId => 
        addDoc(collection(db, 'notifications'), {
          userId: userId,
          title: title,
          message: message,
          type: 'new_feature',
          eventId: event.id || null,
          read: false,
          createdAt: serverTimestamp()
        })
      );
      
      await Promise.all(promises);
      
      setResult({ 
        type: 'success', 
        message: `✅ Notification sent to ${userIds.length} user${userIds.length !== 1 ? 's' : ''}!` 
      });

      // Auto-close after 2 seconds on success
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (error) {
      console.error('Error sending notifications:', error);
      setResult({ 
        type: 'error', 
        message: `❌ Error: ${error.message}` 
      });
    }
    
    setSending(false);
  };

  const audienceOptions = [
    { 
      value: 'all', 
      label: 'All Users', 
      description: `Notify all ${userCount} registered users`,
      icon: Users 
    },
    { 
      value: 'event_city', 
      label: `Users in ${event.location}`, 
      description: `Notify users in the event location`,
      icon: MapPin 
    },
    { 
      value: 'custom_city', 
      label: 'Specific City', 
      description: 'Choose a different city',
      icon: MapPin 
    },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-cyan-100 rounded-xl flex items-center justify-center">
              <Bell size={20} className="text-cyan-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Notify Users</h2>
              <p className="text-sm text-gray-600">Send notification about this {event.subCategory === 'places' ? 'place' : 'event'}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Event Preview */}
          <div className="bg-gradient-to-r from-cyan-50 to-blue-50 rounded-xl p-4 border border-cyan-100">
            <div className="flex gap-4">
              {event.imageUrl && (
                <img 
                  src={event.imageUrl} 
                  alt={event.title}
                  className="w-20 h-20 rounded-lg object-cover"
                />
              )}
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-1">{event.title}</h3>
                <p className="text-sm text-gray-600 mb-2 line-clamp-2">{event.description}</p>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span>📍 {event.location}</span>
                  <span>#{event.category}</span>
                  {!event.isFree && <span>₦{event.price?.toLocaleString()}</span>}
                  {event.isFree && <span className="text-green-600 font-semibold">FREE</span>}
                </div>
              </div>
            </div>
          </div>

          {/* Target Audience */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-3">
              Who should receive this notification?
            </label>
            <div className="space-y-3">
              {audienceOptions.map(option => {
                const Icon = option.icon;
                return (
                  <button
                    key={option.value}
                    onClick={() => {
                      setTargetAudience(option.value);
                      if (option.value !== 'custom_city') setSelectedCity('');
                    }}
                    className={`w-full p-4 rounded-lg border-2 text-left transition-all flex items-start gap-3 ${
                      targetAudience === option.value
                        ? 'border-cyan-500 bg-cyan-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      targetAudience === option.value ? 'bg-cyan-100' : 'bg-gray-100'
                    }`}>
                      <Icon size={20} className={targetAudience === option.value ? 'text-cyan-600' : 'text-gray-600'} />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{option.label}</div>
                      <div className="text-sm text-gray-600 mt-1">{option.description}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom City Selector */}
          {targetAudience === 'custom_city' && (
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

          {/* Notification Preview */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Notification Preview
            </label>
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="flex gap-3">
                <div className="flex-shrink-0 text-2xl">🎉</div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900 mb-1">
                    New {event.subCategory === 'places' ? 'Place' : 'Event'} Added!
                  </p>
                  <p className="text-sm text-gray-600">
                    Check out "{event.title}" in {event.location}
                    {!event.isFree ? ` - ₦${event.price?.toLocaleString()}` : ' - FREE!'}
                  </p>
                  <p className="text-xs text-gray-500 mt-2">Just now</p>
                </div>
              </div>
            </div>
          </div>

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
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex gap-3">
          <button
            onClick={sendNotifications}
            disabled={sending || (targetAudience === 'custom_city' && !selectedCity)}
            className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-500 text-white py-3 rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
          
          <button
            onClick={onClose}
            disabled={sending}
            className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition disabled:opacity-50"
          >
            Skip
          </button>
        </div>
      </div>
    </div>
  );
}