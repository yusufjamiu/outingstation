import { useState, useEffect } from 'react';
import { useNavigate, useOutletContext, Link } from 'react-router-dom';
import { Heart, ChevronRight, Calendar, Clock, MapPin } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { filterUpcomingEvents } from '../../utils/eventFilters';
import { collection, getDocs, doc, updateDoc, arrayUnion, arrayRemove, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';

export default function UserDashboard() {
  const navigate = useNavigate();
  const { currentUser, userProfile } = useAuth();
  
  // ✅ Get searchQuery from parent UserLayout
  const { searchQuery } = useOutletContext();

  const [activeCategory, setActiveCategory] = useState('All');
  const [trendingEvents, setTrendingEvents] = useState([]);
  const [pickedEvents, setPickedEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [savedEventIds, setSavedEventIds] = useState([]);
  const [hasEventsInUserCity, setHasEventsInUserCity] = useState(true);

  const displayName = userProfile?.name || currentUser?.displayName || 'Friend';
  const userCity = userProfile?.city || 'Lagos';

  const categories = [
    'All', 'Business & Tech', 'Art & Culture', 'Food & Dining', 'Sport & Fitness',
    'Education', 'Family & Kids Fun', 'Nightlife & Parties', 'Religion & Community',
    'Music & Concerts', 'Gaming & Esport', 'Cinema & Show'
  ];

  useEffect(() => {
    loadSavedEventIds();
  }, [currentUser]);

  useEffect(() => {
    loadEvents();
  }, [activeCategory, userCity]);

  useEffect(() => {
    if (userProfile) {
      console.log('🔍 Dashboard - User Profile:', {
        name: userProfile.name,
        city: userProfile.city,
        avatar: userProfile.avatar
      });
    }
  }, [userProfile]);

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

  const loadEvents = async () => {
    try {
      setLoadingEvents(true);
      const snapshot = await getDocs(collection(db, 'events'));

      let allEvents = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      allEvents = allEvents.filter(e => e.status === 'published');
      allEvents = filterUpcomingEvents(allEvents);

      console.log(`📊 Total published upcoming events: ${allEvents.length}`);
      console.log(`👤 User city: "${userCity}"`);

      // City filtering
      if (userCity && userCity.toLowerCase().trim() !== 'lagos') {
        const userCityNormalized = userCity.toLowerCase().split(',')[0].trim();
        
        console.log(`🔍 Looking for events EXACTLY in: "${userCityNormalized}"`);
        
        const cityMatchedEvents = allEvents.filter(e => {
          const eventLocation = (e.location || '').toLowerCase();
          const eventCity = eventLocation.split(',')[0].trim();
          const isMatch = eventCity === userCityNormalized;
          
          if (isMatch) {
            console.log(`Event: "${e.title}" | ✅ MATCH in ${eventCity}`);
          }
          
          return isMatch;
        });

        console.log(`✅ Events EXACTLY matching "${userCity}": ${cityMatchedEvents.length}`);

        if (cityMatchedEvents.length === 0) {
          console.log('❌ NO EVENTS FOUND - Showing empty state');
          setHasEventsInUserCity(false);
          setTrendingEvents([]);
          setPickedEvents([]);
          setLoadingEvents(false);
          return;
        } else {
          console.log(`✅ ${cityMatchedEvents.length} EVENTS FOUND - Showing filtered events`);
          setHasEventsInUserCity(true);
          allEvents = cityMatchedEvents;
        }
      } else {
        console.log('✅ User in Lagos or default - Showing all events');
        setHasEventsInUserCity(true);
      }

      // Category filtering
      if (activeCategory !== 'All') {
        allEvents = allEvents.filter(e => e.category === activeCategory);
      }

      allEvents.sort((a, b) => {
        const aTime = a.createdAt?.seconds || 0;
        const bTime = b.createdAt?.seconds || 0;
        return bTime - aTime;
      });

      const featured = allEvents.filter(e => e.isTrending || e.isFeatured);
      const regular = allEvents.filter(e => !e.isTrending && !e.isFeatured);

      setTrendingEvents(featured.length > 0 ? featured.slice(0, 3) : allEvents.slice(0, 3));
      setPickedEvents(regular.length > 0 ? regular.slice(0, 6) : allEvents.slice(3, 9));

      console.log(`📈 Final: ${trendingEvents.length} trending, ${pickedEvents.length} picked`);

    } catch (err) {
      console.error('Error loading events:', err);
    }
    setLoadingEvents(false);
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

  const displayTrending = filterEventsBySearch(trendingEvents);
  const displayPicked = filterEventsBySearch(pickedEvents);

  const handleEventClick = id => navigate(`/event/${id}`);

  const handleSaveEvent = async (e, eventId) => {
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

  const isEventSaved = (eventId) => savedEventIds.includes(eventId);

  const getImage = event => event.imageUrl || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&q=80';

  const getDate = event => {
    if (event.date) {
      const date = event.date.toDate ? event.date.toDate() : new Date(event.date);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
    if (event.startDate) {
      const date = event.startDate.toDate ? event.startDate.toDate() : new Date(event.startDate);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
    if (event.recurringPattern) {
      return `Every ${event.recurringDay || event.recurringPattern}`;
    }
    return 'TBD';
  };

  const getTime = event => event.time || event.dailyStartTime || event.recurringTime || '';

  const handleViewAllTrending = () => {
    navigate('/events', { state: { filter: 'trending' } });
  };

  return (
    <div className="px-6 py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">
          Good day, {displayName.split(' ')[0]}!
        </h1>
        <p className="text-gray-600 mt-1">
          {(() => {
            const hasEvents = trendingEvents.length > 0 || pickedEvents.length > 0;
            const userCityName = userCity.split(',')[0].trim();
            
            if (userCity === 'Lagos') {
              return <>Here's what is happening in <span className="font-semibold">Lagos</span> today.</>;
            } else if (hasEvents) {
              return <>Showing events in your area.</>;
            } else if (!loadingEvents) {
              return (
                <>
                  No events available in <span className="font-semibold">{userCityName}</span> yet.{' '}
                  <button 
                    onClick={() => navigate('/settings')}
                    className="text-cyan-500 hover:underline font-medium"
                  >
                    Change location
                  </button>
                  {' '}to see events in other cities.
                </>
              );
            } else {
              return <>Loading events...</>;
            }
          })()}
        </p>
      </div>

      <div className="flex gap-2 mb-8 overflow-x-auto pb-2 scrollbar-hide">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-5 py-2 rounded-full text-sm font-medium whitespace-nowrap transition ${
              activeCategory === cat
                ? 'bg-cyan-400 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:border-gray-400'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {searchQuery && (
        <p className="text-sm text-gray-600 mb-4">
          Found {displayTrending.length + displayPicked.length} result{displayTrending.length + displayPicked.length !== 1 ? 's' : ''} for "{searchQuery}"
        </p>
      )}

      {loadingEvents ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-cyan-500"></div>
        </div>
      ) : (
        <>
          {displayTrending.length > 0 && (
            <section className="mb-10">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-2xl font-bold">Trending This Week</h2>
                <button 
                  onClick={handleViewAllTrending}
                  className="text-cyan-500 font-medium text-sm hover:underline flex items-center gap-1"
                >
                  View All
                  <ChevronRight size={16} />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {displayTrending.map(event => (
                  <div
                    key={event.id}
                    onClick={() => handleEventClick(event.id)}
                    className="relative group cursor-pointer"
                  >
                    <div className="relative h-72 rounded-xl overflow-hidden">
                      <img
                        src={getImage(event)}
                        alt={event.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                      />

                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"></div>

                      <button
                        onClick={e => handleSaveEvent(e, event.id)}
                        className="absolute top-4 right-4 p-2 bg-white rounded-full hover:bg-gray-100 z-10"
                      >
                        <Heart
                          size={18}
                          className={isEventSaved(event.id) ? 'text-red-500 fill-red-500' : 'text-gray-700'}
                        />
                      </button>

                      {event.category && (
                        <span className="absolute top-4 left-4 px-3 py-1 bg-white/90 rounded-full text-xs font-semibold text-cyan-500">
                          #{event.category}
                        </span>
                      )}

                      <div className="absolute bottom-0 left-0 right-0 p-5 text-white">
                        <h3 className="text-lg font-bold mb-2 line-clamp-2">{event.title}</h3>

                        <div className="flex items-center gap-3 text-sm mb-2">
                          <Calendar size={14} />
                          <span>{getDate(event)}</span>
                          {getTime(event) && (
                            <>
                              <Clock size={14} />
                              <span>{getTime(event)}</span>
                            </>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-sm">
                          <MapPin size={14} />
                          <span>{event.location || 'Online'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {displayPicked.length > 0 && (
            <section>
              <h2 className="text-2xl font-bold mb-5">Picked For You</h2>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-5">
                {displayPicked.map(event => (
                  <div
                    key={event.id}
                    onClick={() => handleEventClick(event.id)}
                    className="relative group cursor-pointer"
                  >
                    <div className="relative h-48 rounded-xl overflow-hidden">
                      <img
                        src={getImage(event)}
                        alt={event.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                      />

                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>

                      <button
                        onClick={e => handleSaveEvent(e, event.id)}
                        className="absolute top-2 right-2 p-1.5 bg-white rounded-full hover:bg-gray-100 z-10"
                      >
                        <Heart
                          size={14}
                          className={isEventSaved(event.id) ? 'text-red-500 fill-red-500' : 'text-gray-700'}
                        />
                      </button>

                      <div className="absolute bottom-0 p-3 text-white">
                        <h3 className="text-sm font-bold line-clamp-2">{event.title}</h3>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {displayTrending.length === 0 && displayPicked.length === 0 && (
            <div className="text-center py-20">
              {searchQuery ? (
                <>
                  <p className="text-gray-500 text-lg mb-2">
                    No events found for "{searchQuery}"
                  </p>
                  <p className="text-gray-400 text-sm">
                    Try a different search term
                  </p>
                </>
              ) : !hasEventsInUserCity && userCity.toLowerCase() !== 'lagos' ? (
                <div className="max-w-md mx-auto">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <MapPin size={32} className="text-gray-400" />
                  </div>
                  <p className="text-gray-700 text-lg mb-2 font-medium">
                    No events in {userCity.split(',')[0]} yet
                  </p>
                  <p className="text-gray-500 text-sm mb-6">
                    We're currently only available in Lagos, but we're expanding soon!
                  </p>
                  
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <button
                      onClick={() => navigate('/settings')}
                      className="px-6 py-2.5 bg-cyan-400 text-white rounded-lg font-medium hover:bg-cyan-500 transition"
                    >
                      Change to Lagos
                    </button>
                    <button
                      onClick={() => window.open('https://forms.gle/your-create-event-form', '_blank')}
                      className="px-6 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition"
                    >
                      Create an Event
                    </button>
                  </div>
                </div>
              ) : activeCategory !== 'All' ? (
                <>
                  <p className="text-gray-500 text-lg mb-2">
                    No {activeCategory} events available yet
                  </p>
                  <p className="text-gray-400 text-sm mb-4">
                    Try selecting a different category or check back soon
                  </p>
                  <button
                    onClick={() => setActiveCategory('All')}
                    className="px-6 py-2.5 bg-cyan-400 text-white rounded-lg font-medium hover:bg-cyan-500 transition inline-flex items-center gap-2"
                  >
                    View All Events
                  </button>
                </>
              ) : (
                <>
                  <p className="text-gray-500 text-lg mb-2">
                    No events available yet
                  </p>
                  <p className="text-gray-400 text-sm mb-4">
                    Check back soon for exciting events!
                  </p>
                  <button
                    onClick={() => window.open('https://forms.gle/your-create-event-form', '_blank')}
                    className="px-6 py-2.5 bg-cyan-400 text-white rounded-lg font-medium hover:bg-cyan-500 transition"
                  >
                    Create an Event
                  </button>
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}