import { useState, useEffect } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { Heart, Calendar, Clock, MapPin } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { filterUpcomingEvents } from '../../utils/eventFilters';
import { collection, getDocs, doc, getDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '../../firebase';
import { formatEventDate, formatEventTime } from '../../utils/dateTimeHelpers';

export default function WebinarEvents() {
  const navigate = useNavigate();
  const { currentUser, userProfile } = useAuth();
  
  const { searchQuery } = useOutletContext();

  const [savedEventIds, setSavedEventIds] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSavedEventIds();
    loadWebinarEvents();
  }, [currentUser]);

  const loadSavedEventIds = async () => {
    if (!currentUser) return;
    try {
      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      if (userDoc.exists()) {
        setSavedEventIds(userDoc.data().savedEvents || []);
      }
    } catch (err) {
      console.error('Error loading saved events:', err);
    }
  };

  const loadWebinarEvents = async () => {
    try {
      setLoading(true);
      const snapshot = await getDocs(collection(db, 'events'));

      let allEvents = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      allEvents = allEvents.filter(e => 
        e.eventType === 'webinar' && e.status === 'published'
      );
      allEvents = filterUpcomingEvents(allEvents);

      setEvents(allEvents);
    } catch (err) {
      console.error('Error loading events:', err);
    }
    setLoading(false);
  };

  const filterEventsBySearch = (events) => {
    if (!searchQuery.trim()) return events;
    const query = searchQuery.toLowerCase();
    return events.filter(event =>
      event.title?.toLowerCase().includes(query) ||
      event.description?.toLowerCase().includes(query) ||
      event.platform?.toLowerCase().includes(query)
    );
  };

  const displayEvents = filterEventsBySearch(events);

  const handleEventClick = (eventId) => {
    navigate(`/event/${eventId}`);
  };

  const handleSaveClick = async (e, eventId) => {
    e.stopPropagation();
    
    if (!currentUser) {
      alert('Please login to save events');
      navigate('/login');
      return;
    }

    try {
      const userRef = doc(db, 'users', currentUser.uid);
      const isSaved = savedEventIds.includes(eventId);

      if (isSaved) {
        await updateDoc(userRef, {
          savedEvents: arrayRemove(eventId)
        });
        setSavedEventIds(prev => prev.filter(id => id !== eventId));
      } else {
        await updateDoc(userRef, {
          savedEvents: arrayUnion(eventId)
        });
        setSavedEventIds(prev => [...prev, eventId]);
      }
    } catch (err) {
      console.error('Error saving event:', err);
      alert('Error saving event. Please try again.');
    }
  };

  const getImage = (event) => event.imageUrl || 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800&q=80';

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Webinar & Virtual Events</h1>
        <p className="text-sm sm:text-base text-gray-600">
          Discover online workshops, conferences, and live sessions. Connect with experts and learn new things from various parts of the world
        </p>
      </div>

      <div className="mb-6">
        <p className="text-sm sm:text-base text-gray-600 font-medium">
          {displayEvents.length} Event{displayEvents.length !== 1 ? 's' : ''} Available
          {searchQuery && ` (filtered from ${events.length} total)`}
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-cyan-500"></div>
        </div>
      ) : (
        <>
          {displayEvents.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 lg:gap-6">
              {displayEvents.map((event) => {
                const eventTime = formatEventTime(event);
                
                return (
                  <div 
                    key={event.id}
                    onClick={() => handleEventClick(event.id)}
                    className="bg-white rounded-xl overflow-hidden shadow-md hover:shadow-xl transition group cursor-pointer"
                  >
                    <div className="relative h-48 sm:h-56">
                      <img 
                        src={getImage(event)} 
                        alt={event.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                      />
                      
                      <div className="absolute top-3 left-3">
                        <span className="bg-purple-500 text-white text-xs px-2.5 sm:px-3 py-1 rounded-full">
                          📹 Virtual
                        </span>
                      </div>

                      <button 
                        onClick={(e) => handleSaveClick(e, event.id)}
                        className="absolute top-3 right-3 w-9 h-9 sm:w-10 sm:h-10 bg-white rounded-full flex items-center justify-center hover:bg-gray-100 transition z-10"
                      >
                        <Heart 
                          size={18}
                          className={`sm:w-5 sm:h-5 ${savedEventIds.includes(event.id) ? 'text-red-500 fill-red-500' : 'text-gray-600'}`}
                        />
                      </button>

                      {event.isFree && (
                        <div className="absolute bottom-3 right-3">
                          <span className="bg-emerald-500 text-white text-xs px-2.5 sm:px-3 py-1 rounded-lg font-semibold">
                            Free
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="p-4 sm:p-5">
                      <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-3 group-hover:text-cyan-500 transition line-clamp-2">
                        {event.title}
                      </h3>
                      
                      <div className="space-y-2 text-xs sm:text-sm text-gray-600 mb-4">
                        <div className="flex items-center gap-2">
                          <Calendar size={14} />
                          <span>{formatEventDate(event)}</span>
                          {eventTime && (
                            <>
                              <Clock size={14} />
                              <span>{eventTime}</span>
                            </>
                          )}
                        </div>
                        {event.platform && (
                          <div className="flex items-center gap-2">
                            <MapPin size={14} />
                            <span>{event.platform}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between">
                        {event.platformLink && (
                          <a 
                            href={event.platformLink}
                            onClick={(e) => e.stopPropagation()}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-cyan-500 text-xs sm:text-sm hover:underline"
                          >
                            Join Meeting →
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-20">
              <p className="text-gray-500 text-lg mb-2">
                {searchQuery 
                  ? `No webinars found for "${searchQuery}"` 
                  : 'No webinar events found'
                }
              </p>
              <p className="text-gray-400 text-sm">
                {searchQuery 
                  ? 'Try a different search term' 
                  : 'Create webinar events in the admin panel with eventType: "webinar"'
                }
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}