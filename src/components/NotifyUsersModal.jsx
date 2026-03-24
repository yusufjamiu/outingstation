import { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, serverTimestamp, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { Bell, Send, Users, MapPin, X, Loader, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';

export default function NotifyUsersModal({ event, onClose, notificationType = 'new' }) {
  const [targetAudience, setTargetAudience] = useState('all');
  const [selectedCity, setSelectedCity] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);
  const [cities, setCities] = useState([]);
  const [userCount, setUserCount] = useState(0);

  // For update notifications
  const isUpdateNotification = notificationType === 'update';

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

  // Extract city name from event location
  const getEventCity = () => {
    if (!event.location) return '';
    
    // Extract city from location like "Victoria Island, Lagos" → "Lagos"
    const locationParts = event.location.split(',').map(p => p.trim());
    
    // If location has comma, take the last part (likely the city)
    if (locationParts.length > 1) {
      return locationParts[locationParts.length - 1];
    }
    
    // Otherwise use the whole location
    return event.location;
  };

  const getTargetUsers = async () => {
    try {
      let usersSnapshot;
      
      if (targetAudience === 'all') {
        // Get all users
        usersSnapshot = await getDocs(collection(db, 'users'));
        return usersSnapshot.docs.map(doc => doc.id);
      } 
      
      if (targetAudience === 'event_city') {
        // Match users whose city contains the event city
        const eventCity = getEventCity().toLowerCase();
        
        console.log(`🔍 Notifying users in event city: "${eventCity}"`);
        
        // Get ALL users, then filter in memory
        usersSnapshot = await getDocs(collection(db, 'users'));
        
        const matchedUserIds = usersSnapshot.docs
          .filter(doc => {
            const userCity = (doc.data().city || '').toLowerCase();
            // Match if user's city contains the event city OR vice versa
            const isMatch = userCity.includes(eventCity) || eventCity.includes(userCity);
            
            if (isMatch) {
              console.log(`✅ User ${doc.id} matches: "${doc.data().city}" contains "${eventCity}"`);
            }
            
            return isMatch;
          })
          .map(doc => doc.id);
        
        console.log(`📊 Found ${matchedUserIds.length} users in ${eventCity}`);
        return matchedUserIds;
      }

      if (targetAudience === 'saved_users') {
        // ✅ NEW: Notify users who saved this event
        console.log(`🔍 Finding users who saved event: ${event.id}`);
        
        usersSnapshot = await getDocs(collection(db, 'users'));
        
        const savedUserIds = usersSnapshot.docs
          .filter(doc => {
            const savedEvents = doc.data().savedEvents || [];
            return savedEvents.includes(event.id);
          })
          .map(doc => doc.id);
        
        console.log(`📊 Found ${savedUserIds.length} users who saved this event`);
        return savedUserIds;
      }
      
      if (targetAudience === 'custom_city' && selectedCity) {
        // Match users whose city contains selected city
        const targetCity = selectedCity.toLowerCase();
        
        usersSnapshot = await getDocs(collection(db, 'users'));
        
        return usersSnapshot.docs
          .filter(doc => {
            const userCity = (doc.data().city || '').toLowerCase();
            return userCity.includes(targetCity) || targetCity.includes(userCity);
          })
          .map(doc => doc.id);
      }
      
      return [];
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
      
      let title, message, type;

      if (isUpdateNotification) {
        // ✅ Update notification
        title = `📢 Event Updated!`;
        message = `"${event.title}" has been updated. Check out the latest details!`;
        type = 'event_update';
      } else {
        // New event notification
        title = `🎉 New ${isPlace ? 'Place' : 'Event'} Added!`;
        message = `Check out "${event.title}" in ${event.location}${!event.isFree ? ` - ₦${event.price?.toLocaleString()}` : ' - FREE!'}`;
        type = 'new_feature';
      }

      const promises = userIds.map(userId => 
        addDoc(collection(db, 'notifications'), {
          userId: userId,
          title: title,
          message: message,
          type: type,
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

  const eventCityName = getEventCity();

  const audienceOptions = isUpdateNotification 
    ? [
        { 
          value: 'saved_users', 
          label: 'Users Who Saved This Event', 
          description: `Notify users who bookmarked this event`,
          icon: Bell 
        },
        { 
          value: 'event_city', 
          label: `Users in ${eventCityName}`, 
          description: `Notify all users in the event city`,
          icon: MapPin 
        },
        { 
          value: 'all', 
          label: 'All Users', 
          description: `Notify all ${userCount} registered users`,
          icon: Users 
        },
        { 
          value: 'custom_city', 
          label: 'Specific City', 
          description: 'Choose a different city',
          icon: MapPin 
        },
      ]
    : [
        { 
          value: 'all', 
          label: 'All Users', 
          description: `Notify all ${userCount} registered users`,
          icon: Users 
        },
        { 
          value: 'event_city', 
          label: `Users in ${eventCityName}`, 
          description: `Notify users in the event city`,
          icon: MapPin 
        },
        { 
          value: 'custom_city', 
          label: 'Specific City', 
          description: 'Choose a different city',
          icon: MapPin 
        },
      ];

  // Set default audience for update notifications
  useEffect(() => {
    if (isUpdateNotification) {
      setTargetAudience('saved_users');
    }
  }, [isUpdateNotification]);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              isUpdateNotification ? 'bg-orange-100' : 'bg-cyan-100'
            }`}>
              {isUpdateNotification ? (
                <RefreshCw size={20} className="text-orange-600" />
              ) : (
                <Bell size={20} className="text-cyan-600" />
              )}
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {isUpdateNotification ? 'Notify Update' : 'Notify Users'}
              </h2>
              <p className="text-sm text-gray-600">
                {isUpdateNotification 
                  ? 'Send update notification about this event'
                  : `Send notification about this ${event.subCategory === 'places' ? 'place' : 'event'}`
                }
              </p>
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
          <div className={`rounded-xl p-4 border ${
            isUpdateNotification 
              ? 'bg-gradient-to-r from-orange-50 to-yellow-50 border-orange-100' 
              : 'bg-gradient-to-r from-cyan-50 to-blue-50 border-cyan-100'
          }`}>
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
                        ? isUpdateNotification 
                          ? 'border-orange-500 bg-orange-50'
                          : 'border-cyan-500 bg-cyan-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      targetAudience === option.value 
                        ? isUpdateNotification ? 'bg-orange-100' : 'bg-cyan-100'
                        : 'bg-gray-100'
                    }`}>
                      <Icon size={20} className={
                        targetAudience === option.value 
                          ? isUpdateNotification ? 'text-orange-600' : 'text-cyan-600'
                          : 'text-gray-600'
                      } />
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
                <div className="flex-shrink-0 text-2xl">
                  {isUpdateNotification ? '📢' : '🎉'}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900 mb-1">
                    {isUpdateNotification 
                      ? 'Event Updated!'
                      : `New ${event.subCategory === 'places' ? 'Place' : 'Event'} Added!`
                    }
                  </p>
                  <p className="text-sm text-gray-600">
                    {isUpdateNotification 
                      ? `"${event.title}" has been updated. Check out the latest details!`
                      : `Check out "${event.title}" in ${event.location}${!event.isFree ? ` - ₦${event.price?.toLocaleString()}` : ' - FREE!'}`
                    }
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
            className={`flex-1 text-white py-3 rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
              isUpdateNotification 
                ? 'bg-gradient-to-r from-orange-500 to-yellow-500'
                : 'bg-gradient-to-r from-cyan-500 to-blue-500'
            }`}
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