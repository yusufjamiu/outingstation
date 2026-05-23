import { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { Bell, Send, Users, MapPin, X, Loader, CheckCircle, AlertCircle, RefreshCw, GraduationCap } from 'lucide-react';

export default function NotifyUsersModal({ event, onClose, notificationType = 'new' }) {
  const [targetAudience, setTargetAudience] = useState('all');
  const [selectedCity, setSelectedCity] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);
  const [cities, setCities] = useState([]);
  const [userCount, setUserCount] = useState(0);
  const [followerCount, setFollowerCount] = useState(0);

  const isUpdateNotification = notificationType === 'update';
  const eventUniversity = event?.university || null;

  useEffect(() => {
    loadCitiesAndCount();
  }, []);

  const loadCitiesAndCount = async () => {
    try {
      const usersSnapshot = await getDocs(collection(db, 'users'));
      setUserCount(usersSnapshot.size);

      const citySet = new Set();
      let uniFollowers = 0;

      usersSnapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.city) citySet.add(data.city);
        // ✅ Count followers of this event's university
        if (eventUniversity && (data.followedUniversities || []).includes(eventUniversity)) {
          uniFollowers++;
        }
      });

      setCities(Array.from(citySet).sort());
      setFollowerCount(uniFollowers);
    } catch (error) {
      console.error('Error loading cities:', error);
    }
  };

  const getEventCity = () => {
    if (!event.location) return '';
    const locationParts = event.location.split(',').map(p => p.trim());
    if (locationParts.length > 1) return locationParts[locationParts.length - 1];
    return event.location;
  };

  const getTargetUsers = async () => {
    try {
      const usersSnapshot = await getDocs(collection(db, 'users'));

      if (targetAudience === 'all') {
        return usersSnapshot.docs.map(doc => doc.id);
      }

      if (targetAudience === 'university_followers') {
        // ✅ Only users who follow this event's university
        return usersSnapshot.docs
          .filter(doc => {
            const followed = doc.data().followedUniversities || [];
            return followed.includes(eventUniversity);
          })
          .map(doc => doc.id);
      }

      if (targetAudience === 'event_city') {
        const eventCity = getEventCity().toLowerCase();
        return usersSnapshot.docs
          .filter(doc => {
            const userCity = (doc.data().city || '').toLowerCase();
            return userCity.includes(eventCity) || eventCity.includes(userCity);
          })
          .map(doc => doc.id);
      }

      if (targetAudience === 'saved_users') {
        return usersSnapshot.docs
          .filter(doc => (doc.data().savedEvents || []).includes(event.id))
          .map(doc => doc.id);
      }

      if (targetAudience === 'custom_city' && selectedCity) {
        const targetCity = selectedCity.toLowerCase();
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
          message: targetAudience === 'university_followers'
            ? `No followers found for ${eventUniversity} yet. Share the app so students can follow their university!`
            : 'No users found matching the criteria'
        });
        setSending(false);
        return;
      }

      const isPlace = event.subCategory === 'places';
      let title, message, type;

      if (isUpdateNotification) {
        title = `📢 Event Updated!`;
        message = `"${event.title}" has been updated. Check out the latest details!`;
        type = 'event_update';
      } else if (targetAudience === 'university_followers') {
        // ✅ University-specific notification message
        title = `🎓 New Event at ${eventUniversity}!`;
        message = `"${event.title}" — ${event.isFree ? 'FREE' : `₦${event.price?.toLocaleString()}`} · ${event.location}`;
        type = 'university_event';
      } else {
        title = `🎉 New ${isPlace ? 'Place' : 'Event'} Added!`;
        message = `Check out "${event.title}" in ${event.location}${!event.isFree ? ` - ₦${event.price?.toLocaleString()}` : ' - FREE!'}`;
        type = 'new_feature';
      }

      const promises = userIds.map(userId =>
        addDoc(collection(db, 'notifications'), {
          userId,
          title,
          message,
          type,
          eventId: event.id || null,
          university: eventUniversity || null,
          read: false,
          createdAt: serverTimestamp(),
        })
      );

      await Promise.all(promises);

      setResult({
        type: 'success',
        message: `✅ Notification sent to ${userIds.length} user${userIds.length !== 1 ? 's' : ''}!`
      });

      setTimeout(() => { onClose(); }, 2000);
    } catch (error) {
      console.error('Error sending notifications:', error);
      setResult({ type: 'error', message: `❌ Error: ${error.message}` });
    }

    setSending(false);
  };

  const eventCityName = getEventCity();

  // ✅ Build audience options — university followers first if campus event
  const audienceOptions = isUpdateNotification
    ? [
        { value: 'saved_users', label: 'Users Who Saved This Event', description: 'Notify users who bookmarked this event', icon: Bell },
        ...(eventUniversity ? [{ value: 'university_followers', label: `${eventUniversity} Followers`, description: `${followerCount} student${followerCount !== 1 ? 's' : ''} following this university`, icon: GraduationCap }] : []),
        { value: 'event_city', label: `Users in ${eventCityName}`, description: 'Notify all users in the event city', icon: MapPin },
        { value: 'all', label: 'All Users', description: `Notify all ${userCount} registered users`, icon: Users },
        { value: 'custom_city', label: 'Specific City', description: 'Choose a different city', icon: MapPin },
      ]
    : [
        ...(eventUniversity ? [{ value: 'university_followers', label: `${eventUniversity} Followers`, description: `${followerCount} student${followerCount !== 1 ? 's' : ''} following this university`, icon: GraduationCap, recommended: true }] : []),
        { value: 'event_city', label: `Users in ${eventCityName}`, description: 'Notify users in the event city', icon: MapPin },
        { value: 'all', label: 'All Users', description: `Notify all ${userCount} registered users`, icon: Users },
        { value: 'custom_city', label: 'Specific City', description: 'Choose a different city', icon: MapPin },
      ];

  // ✅ Default to university_followers if campus event, else saved_users for updates
  useEffect(() => {
    if (isUpdateNotification) {
      setTargetAudience(eventUniversity ? 'university_followers' : 'saved_users');
    } else {
      setTargetAudience(eventUniversity ? 'university_followers' : 'all');
    }
  }, [isUpdateNotification, eventUniversity]);

  // Notification preview text
  const getPreviewTitle = () => {
    if (isUpdateNotification) return '📢 Event Updated!';
    if (targetAudience === 'university_followers' && eventUniversity) return `🎓 New Event at ${eventUniversity}!`;
    return `🎉 New ${event.subCategory === 'places' ? 'Place' : 'Event'} Added!`;
  };

  const getPreviewMessage = () => {
    if (isUpdateNotification) return `"${event.title}" has been updated. Check out the latest details!`;
    if (targetAudience === 'university_followers') return `"${event.title}" — ${event.isFree ? 'FREE' : `₦${event.price?.toLocaleString()}`} · ${event.location}`;
    return `Check out "${event.title}" in ${event.location}${!event.isFree ? ` - ₦${event.price?.toLocaleString()}` : ' - FREE!'}`;
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">

        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isUpdateNotification ? 'bg-orange-100' : 'bg-cyan-100'}`}>
              {isUpdateNotification
                ? <RefreshCw size={20} className="text-orange-600" />
                : <Bell size={20} className="text-cyan-600" />
              }
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
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">

          {/* Event Preview */}
          <div className={`rounded-xl p-4 border ${isUpdateNotification ? 'bg-gradient-to-r from-orange-50 to-yellow-50 border-orange-100' : 'bg-gradient-to-r from-cyan-50 to-blue-50 border-cyan-100'}`}>
            <div className="flex gap-4">
              {event.imageUrl && (
                <img src={event.imageUrl} alt={event.title} className="w-20 h-20 rounded-lg object-cover" />
              )}
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-1">{event.title}</h3>
                <p className="text-sm text-gray-600 mb-2 line-clamp-2">{event.description}</p>
                <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                  <span>📍 {event.location}</span>
                  <span>#{event.category}</span>
                  {eventUniversity && <span className="text-purple-600 font-medium">🎓 {eventUniversity}</span>}
                  {!event.isFree && <span>₦{event.price?.toLocaleString()}</span>}
                  {event.isFree && <span className="text-green-600 font-semibold">FREE</span>}
                </div>
              </div>
            </div>
          </div>

          {/* University followers info banner */}
          {eventUniversity && followerCount > 0 && (
            <div className="flex items-center gap-3 bg-purple-50 border border-purple-200 rounded-xl px-4 py-3">
              <GraduationCap size={20} className="text-purple-500 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-purple-700">
                  {followerCount} student{followerCount !== 1 ? 's' : ''} follow {eventUniversity}
                </p>
                <p className="text-xs text-purple-500">
                  These users will receive targeted university notifications
                </p>
              </div>
            </div>
          )}

          {/* Target Audience */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-3">
              Who should receive this notification?
            </label>
            <div className="space-y-3">
              {audienceOptions.map(option => {
                const Icon = option.icon;
                const isSelected = targetAudience === option.value;
                const isUniOption = option.value === 'university_followers';

                return (
                  <button
                    key={option.value}
                    onClick={() => {
                      setTargetAudience(option.value);
                      if (option.value !== 'custom_city') setSelectedCity('');
                    }}
                    className={`w-full p-4 rounded-xl border-2 text-left transition-all flex items-start gap-3 ${
                      isSelected
                        ? isUniOption
                          ? 'border-purple-500 bg-purple-50'
                          : isUpdateNotification
                            ? 'border-orange-500 bg-orange-50'
                            : 'border-cyan-500 bg-cyan-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      isSelected
                        ? isUniOption ? 'bg-purple-100' : isUpdateNotification ? 'bg-orange-100' : 'bg-cyan-100'
                        : 'bg-gray-100'
                    }`}>
                      <Icon size={20} className={
                        isSelected
                          ? isUniOption ? 'text-purple-600' : isUpdateNotification ? 'text-orange-600' : 'text-cyan-600'
                          : 'text-gray-600'
                      } />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">{option.label}</span>
                        {option.recommended && (
                          <span className="text-xs bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full font-semibold">
                            ⭐ Recommended
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-600 mt-0.5">{option.description}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom City Selector */}
          {targetAudience === 'custom_city' && (
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Select City</label>
              <select
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              >
                <option value="">Choose a city...</option>
                {cities.map(city => <option key={city} value={city}>{city}</option>)}
              </select>
            </div>
          )}

          {/* Notification Preview */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">Notification Preview</label>
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
              <div className="flex gap-3">
                <div className="flex-shrink-0 text-2xl">
                  {targetAudience === 'university_followers' ? '🎓' : isUpdateNotification ? '📢' : '🎉'}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900 mb-1">{getPreviewTitle()}</p>
                  <p className="text-sm text-gray-600">{getPreviewMessage()}</p>
                  <p className="text-xs text-gray-500 mt-2">Just now</p>
                </div>
              </div>
            </div>
          </div>

          {/* Result */}
          {result && (
            <div className={`p-4 rounded-lg flex items-start gap-3 ${result.type === 'success' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
              {result.type === 'success'
                ? <CheckCircle size={20} className="text-green-600 flex-shrink-0 mt-0.5" />
                : <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
              }
              <p className={`text-sm font-medium ${result.type === 'success' ? 'text-green-700' : 'text-red-700'}`}>
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
              targetAudience === 'university_followers'
                ? 'bg-gradient-to-r from-purple-500 to-purple-600'
                : isUpdateNotification
                  ? 'bg-gradient-to-r from-orange-500 to-yellow-500'
                  : 'bg-gradient-to-r from-cyan-500 to-blue-500'
            }`}
          >
            {sending
              ? <><Loader size={20} className="animate-spin" /><span>Sending...</span></>
              : <><Send size={20} /><span>Send Notification</span></>
            }
          </button>
          <button onClick={onClose} disabled={sending}
            className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition disabled:opacity-50">
            Skip
          </button>
        </div>
      </div>
    </div>
  );
}