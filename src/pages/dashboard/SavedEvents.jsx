import { useState, useEffect } from 'react';
import { Link, useNavigate, useOutletContext } from 'react-router-dom';
import { Calendar, Clock, MapPin, X, Bookmark, Heart } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { doc, getDoc, updateDoc, arrayRemove } from 'firebase/firestore';
import { db } from '../../firebase';

export default function SavedEvents() {
  const navigate = useNavigate();
  const { currentUser, userProfile } = useAuth();
  
  // ✅ Get searchQuery from parent UserLayout
  const { searchQuery } = useOutletContext();

  const [savedEvents, setSavedEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [eventToRemove, setEventToRemove] = useState(null);
  const [savedEventIds, setSavedEventIds] = useState([]);
  
  // ✅ Tab state
  const [activeTab, setActiveTab] = useState('upcoming'); // all, upcoming, past

  useEffect(() => {
    loadSavedEvents();
  }, [currentUser]);

  const loadSavedEvents = async () => {
    if (!currentUser) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      
      if (!userDoc.exists()) {
        setSavedEvents([]);
        setSavedEventIds([]);
        setLoading(false);
        return;
      }

      const eventIds = userDoc.data().savedEvents || [];
      setSavedEventIds(eventIds);

      if (eventIds.length === 0) {
        setSavedEvents([]);
        setLoading(false);
        return;
      }

      const eventPromises = eventIds.map(id => getDoc(doc(db, 'events', id)));
      const eventDocs = await Promise.all(eventPromises);
      
      let events = eventDocs
        .filter(d => d.exists())
        .map(d => ({ id: d.id, ...d.data() }));

      setSavedEvents(events);
    } catch (err) {
      console.error('Error loading saved events:', err);
    }
    setLoading(false);
  };

  // ✅ Filter events by tab
  const getFilteredEventsByTab = (events) => {
    const now = new Date();
    
    if (activeTab === 'upcoming') {
      return events.filter(e => {
        const eventDate = e.date?.toDate ? e.date.toDate() : 
                         e.startDate?.toDate ? e.startDate.toDate() : 
                         new Date(e.date || e.startDate);
        return eventDate >= now;
      });
    }
    
    if (activeTab === 'past') {
      return events.filter(e => {
        const eventDate = e.date?.toDate ? e.date.toDate() : 
                         e.startDate?.toDate ? e.startDate.toDate() : 
                         new Date(e.date || e.startDate);
        return eventDate < now;
      });
    }
    
    return events;
  };

  const filterEventsBySearch = (events) => {
    if (!searchQuery.trim()) return events;
    const query = searchQuery.toLowerCase();
    return events.filter(event =>
      event.title?.toLowerCase().includes(query) ||
      event.description?.toLowerCase().includes(query) ||
      event.location?.toLowerCase().includes(query) ||
      event.category?.toLowerCase().includes(query)
    );
  };

  const tabFiltered = getFilteredEventsByTab(savedEvents);
  const displayEvents = filterEventsBySearch(tabFiltered);

  const handleEventClick = (id) => navigate(`/event/${id}`);

  const handleRemoveClick = (e, event) => {
    e.stopPropagation();
    setEventToRemove(event);
  };

  const confirmRemove = async () => {
    if (!eventToRemove || !currentUser) return;

    try {
      const userRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userRef, {
        savedEvents: arrayRemove(eventToRemove.id)
      });

      setSavedEvents(prev => prev.filter(e => e.id !== eventToRemove.id));
      setSavedEventIds(prev => prev.filter(id => id !== eventToRemove.id));
      setEventToRemove(null);
    } catch (err) {
      console.error('Error removing event:', err);
      alert('Error removing event. Please try again.');
    }
  };

  const getDate = (e) => {
    if (e.date) {
      const date = e.date.toDate ? e.date.toDate() : new Date(e.date);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
    if (e.startDate) {
      const date = e.startDate.toDate ? e.startDate.toDate() : new Date(e.startDate);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
    if (e.recurringPattern) return `Every ${e.recurringDay || e.recurringPattern}`;
    return 'TBD';
  };

  const getTime = (e) => e.time || e.dailyStartTime || e.recurringTime || '';
  const getImage = (e) => e.imageUrl || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=400&q=80';

  // ✅ Count events for each tab
  const upcomingCount = savedEvents.filter(e => {
    const eventDate = e.date?.toDate ? e.date.toDate() : e.startDate?.toDate ? e.startDate.toDate() : new Date(e.date || e.startDate);
    return eventDate >= new Date();
  }).length;
  
  const pastCount = savedEvents.filter(e => {
    const eventDate = e.date?.toDate ? e.date.toDate() : e.startDate?.toDate ? e.startDate.toDate() : new Date(e.date || e.startDate);
    return eventDate < new Date();
  }).length;

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Saved Events</h1>
          <p className="text-sm sm:text-base text-gray-500 mt-1">
            You've saved {savedEventIds.length} event{savedEventIds.length !== 1 ? 's' : ''} total.
          </p>
        </div>
      </div>

      {/* ✅ TABS */}
      <div className="flex gap-2 mb-6 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-6 py-3 font-medium transition-colors ${
            activeTab === 'all'
              ? 'border-b-2 border-cyan-500 text-cyan-500'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          All ({savedEvents.length})
        </button>
        <button
          onClick={() => setActiveTab('upcoming')}
          className={`px-6 py-3 font-medium transition-colors ${
            activeTab === 'upcoming'
              ? 'border-b-2 border-cyan-500 text-cyan-500'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Upcoming ({upcomingCount})
        </button>
        <button
          onClick={() => setActiveTab('past')}
          className={`px-6 py-3 font-medium transition-colors ${
            activeTab === 'past'
              ? 'border-b-2 border-cyan-500 text-cyan-500'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Past ({pastCount})
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-cyan-500"></div>
        </div>
      ) : displayEvents.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
          {displayEvents.map((event) => (
            <div 
              key={event.id} 
              onClick={() => handleEventClick(event.id)} 
              className="relative group cursor-pointer"
            >
              <div className="relative h-48 sm:h-56 rounded-xl overflow-hidden">
                <img 
                  src={getImage(event)} 
                  alt={event.title} 
                  className="w-full h-full object-cover group-hover:scale-105 transition duration-300" 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>

                <button
                  onClick={(e) => handleRemoveClick(e, event)}
                  className="absolute top-2 sm:top-3 right-2 sm:right-3 p-1.5 sm:p-2 bg-white rounded-full hover:bg-gray-100 transition z-10"
                >
                  <Heart size={16} className="text-red-500 fill-red-500" />
                </button>

                {event.category && (
                  <span className="absolute top-2 sm:top-3 left-2 sm:left-3 px-2 sm:px-3 py-0.5 sm:py-1 bg-white/90 rounded-full text-xs font-semibold text-cyan-500">
                    #{event.category}
                  </span>
                )}

                {event.isFree && (
                  <span className="absolute top-10 sm:top-12 left-2 sm:left-3 px-2 sm:px-3 py-0.5 sm:py-1 bg-emerald-500 text-white rounded-lg text-xs font-semibold">
                    Free
                  </span>
                )}

                <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4 text-white">
                  <h3 className="text-sm sm:text-base font-bold mb-1.5 sm:mb-2 line-clamp-2">
                    {event.title}
                  </h3>
                  
                  <div className="flex items-center gap-2 sm:gap-3 text-xs mb-1.5 sm:mb-2">
                    <div className="flex items-center gap-1">
                      <Calendar size={11} />
                      <span>{getDate(event)}</span>
                    </div>
                    {getTime(event) && (
                      <div className="flex items-center gap-1">
                        <Clock size={11} />
                        <span>{getTime(event)}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1 text-xs">
                    <MapPin size={11} className="flex-shrink-0" />
                    <span className="truncate">{event.location || 'Online'}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex items-center justify-center min-h-[400px] sm:min-h-[500px]">
          <div className="text-center max-w-md px-4">
            <div className="mb-6 flex justify-center">
              <div className="w-24 h-24 sm:w-32 sm:h-32 bg-gray-100 rounded-full flex items-center justify-center">
                <Bookmark size={40} className="sm:w-12 sm:h-12 text-gray-400" strokeWidth={1.5} />
              </div>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2 sm:mb-3">
              {searchQuery ? 'No Results Found' : 
               activeTab === 'upcoming' ? 'No Upcoming Events' :
               activeTab === 'past' ? 'No Past Events' :
               'No Saved Events'}
            </h2>
            <p className="text-sm sm:text-base text-gray-500 mb-6 sm:mb-8">
              {searchQuery 
                ? `No saved events match "${searchQuery}". Try a different search.`
                : activeTab === 'upcoming'
                ? 'You have no upcoming saved events. Start exploring!'
                : activeTab === 'past'
                ? 'You have no past saved events.'
                : 'Start exploring amazing events and save your favorites!'
              }
            </p>
            <Link 
              to="/dashboard"
              className="inline-flex items-center gap-2 px-6 sm:px-8 py-2.5 sm:py-3 bg-cyan-400 text-white rounded-full font-medium hover:bg-cyan-500 transition text-sm sm:text-base"
            >
              Browse Events
            </Link>
          </div>
        </div>
      )}

      {eventToRemove && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 sm:p-8 max-w-md w-full relative">
            <button 
              onClick={() => setEventToRemove(null)} 
              className="absolute top-3 sm:top-4 right-3 sm:right-4 p-1 text-gray-400 hover:text-gray-600"
            >
              <X size={20} />
            </button>
            
            <div className="flex justify-center mb-4 sm:mb-6">
              <div className="w-14 h-14 sm:w-16 sm:h-16 bg-cyan-100 rounded-full flex items-center justify-center">
                <Bookmark size={24} className="sm:w-7 sm:h-7 text-cyan-500" />
              </div>
            </div>

            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 text-center mb-2 sm:mb-3">
              Remove From Saved?
            </h2>
            <p className="text-sm sm:text-base text-gray-600 text-center mb-6 sm:mb-8">
              Are you sure you want to remove <span className="font-semibold text-gray-900">{eventToRemove.title}</span> from your saved events?
            </p>

            <div className="flex gap-3">
              <button
                onClick={confirmRemove}
                className="flex-1 px-4 sm:px-6 py-2.5 sm:py-3 bg-cyan-400 text-white rounded-full font-medium hover:bg-cyan-500 transition text-sm sm:text-base"
              >
                Remove
              </button>
              <button
                onClick={() => setEventToRemove(null)}
                className="flex-1 px-4 sm:px-6 py-2.5 sm:py-3 bg-gray-100 text-gray-700 rounded-full font-medium hover:bg-gray-200 transition text-sm sm:text-base"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}