import { useState, useEffect, useRef } from 'react';
import { useNavigate, useOutletContext, Link } from 'react-router-dom';
import { Heart, ChevronRight, Calendar, Clock, MapPin, Compass } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { filterUpcomingEvents } from '../../utils/eventFilters';
import { collection, getDocs, doc, updateDoc, arrayUnion, arrayRemove, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { formatEventDate, formatEventTime } from '../../utils/dateTimeHelpers';

export default function UserDashboard() {
  const navigate = useNavigate();
  const { currentUser, userProfile } = useAuth();
  const { searchQuery } = useOutletContext();

  const [activeCategory, setActiveCategory] = useState('All');
  const [trendingEvents, setTrendingEvents] = useState([]);
  const [pickedEvents, setPickedEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [savedEventIds, setSavedEventIds] = useState([]);
  const [hasEventsInUserCity, setHasEventsInUserCity] = useState(true);
  const [activeTrendingIndex, setActiveTrendingIndex] = useState(0);

  const trendingScrollRef = useRef(null);

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

      allEvents = allEvents.filter(e =>
        e.status === 'published' && e.subCategory !== 'places'
      );
      allEvents = filterUpcomingEvents(allEvents);

      if (userCity && userCity.toLowerCase().trim() !== 'lagos') {
        const userCityNormalized = userCity.toLowerCase().split(',')[0].trim();
        const cityMatchedEvents = allEvents.filter(e => {
          const eventLocation = (e.location || '').toLowerCase();
          const eventCity = eventLocation.split(',')[0].trim();
          return eventCity === userCityNormalized;
        });

        if (cityMatchedEvents.length === 0) {
          setHasEventsInUserCity(false);
          setTrendingEvents([]);
          setPickedEvents([]);
          setLoadingEvents(false);
          return;
        } else {
          setHasEventsInUserCity(true);
          allEvents = cityMatchedEvents;
        }
      } else {
        setHasEventsInUserCity(true);
      }

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

      setTrendingEvents(featured.length > 0 ? featured.slice(0, 5) : allEvents.slice(0, 5));
      setPickedEvents(regular.length > 0 ? regular.slice(0, 6) : allEvents.slice(5, 11));
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

  // ✅ displayTrending defined BEFORE useEffect that uses it
  const displayTrending = filterEventsBySearch(trendingEvents);
  const displayPicked = filterEventsBySearch(pickedEvents);

  // ✅ Auto-scroll trending on mobile — AFTER displayTrending is defined
  useEffect(() => {
    const container = trendingScrollRef.current;
    if (!container || displayTrending.length <= 1) return;

    const cardWidth = 288 + 16; // w-72 + gap-4
    let currentIndex = 0;

    const interval = setInterval(() => {
      if (!container) return;
      currentIndex = (currentIndex + 1) % displayTrending.length;
      setActiveTrendingIndex(currentIndex);
      container.scrollTo({
        left: currentIndex * cardWidth,
        behavior: 'smooth',
      });
    }, 4000);

    return () => clearInterval(interval);
  }, [displayTrending]);

  const handleEventClick = id => navigate(`/event/${id}`);

  const handleSaveEvent = async (e, eventId) => {
    e.stopPropagation();
    if (!currentUser) {
      navigate('/login');
      return;
    }
    try {
      const userRef = doc(db, 'users', currentUser.uid);
      const isSaved = savedEventIds.includes(eventId);
      if (isSaved) {
        await updateDoc(userRef, { savedEvents: arrayRemove(eventId) });
        setSavedEventIds(prev => prev.filter(id => id !== eventId));
      } else {
        await updateDoc(userRef, { savedEvents: arrayUnion(eventId) });
        setSavedEventIds(prev => [...prev, eventId]);
      }
    } catch (err) {
      console.error('Error saving event:', err);
    }
  };

  const isEventSaved = (eventId) => savedEventIds.includes(eventId);
  const getImage = event => event.imageUrl || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&q=80';
  const handleViewAllTrending = () => navigate('/events', { state: { filter: 'trending' } });

  return (
    <div className="px-0 sm:px-6 py-0 sm:py-6">

      {/* Header */}
      <div className="px-4 sm:px-0 pt-4 sm:pt-0 mb-5">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
          Good day, {displayName.split(' ')[0]}! 👋
        </h1>
        <p className="text-gray-600 mt-1 text-sm sm:text-base">
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
                  No events in <span className="font-semibold">{userCityName}</span> yet.{' '}
                  <button onClick={() => navigate('/settings')} className="text-cyan-500 hover:underline font-medium">
                    Change location
                  </button>
                </>
              );
            } else {
              return <>Loading events...</>;
            }
          })()}
        </p>
      </div>

      {/* Category Chips */}
      <div className="flex gap-2 mb-5 overflow-x-auto pb-2 scrollbar-hide px-4 sm:px-0">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-4 py-1.5 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap transition ${
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
        <p className="text-sm text-gray-600 mb-4 px-4 sm:px-0">
          Found {displayTrending.length + displayPicked.length} result{displayTrending.length + displayPicked.length !== 1 ? 's' : ''} for "{searchQuery}"
        </p>
      )}

      {loadingEvents ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-cyan-500"></div>
        </div>
      ) : (
        <>
          {/* ✅ Trending Events */}
          {displayTrending.length > 0 && (
            <section className="mb-8">
              <div className="flex items-center justify-between mb-4 px-4 sm:px-0">
                <h2 className="text-xl sm:text-2xl font-bold">Trending This Week</h2>
                <button
                  onClick={handleViewAllTrending}
                  className="text-cyan-500 font-medium text-sm hover:underline flex items-center gap-1"
                >
                  View All <ChevronRight size={16} />
                </button>
              </div>

              {/* Mobile: horizontal auto-scroll | Desktop: 3-col grid */}
              <div
                ref={trendingScrollRef}
                className="
                  flex gap-4 overflow-x-auto pb-2 scrollbar-hide px-4
                  sm:grid sm:grid-cols-3 sm:gap-5 sm:overflow-visible sm:px-0
                "
              >
                {displayTrending.map(event => {
                  const eventTime = formatEventTime(event);
                  return (
                    <div
                      key={event.id}
                      onClick={() => handleEventClick(event.id)}
                      className="relative group cursor-pointer flex-shrink-0 w-72 sm:w-auto"
                    >
                      <div className="relative h-56 sm:h-72 rounded-xl overflow-hidden">
                        <img
                          src={getImage(event)}
                          alt={event.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"></div>
                        <button
                          onClick={e => handleSaveEvent(e, event.id)}
                          className="absolute top-3 right-3 p-2 bg-white rounded-full hover:bg-gray-100 z-10"
                        >
                          <Heart
                            size={16}
                            className={isEventSaved(event.id) ? 'text-red-500 fill-red-500' : 'text-gray-700'}
                          />
                        </button>
                        {event.category && (
                          <span className="absolute top-3 left-3 px-3 py-1 bg-white/90 rounded-full text-xs font-semibold text-cyan-500">
                            #{event.category}
                          </span>
                        )}
                        <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                          <h3 className="text-sm sm:text-base font-bold mb-1.5 line-clamp-2">{event.title}</h3>
                          <div className="flex items-center gap-2 text-xs mb-1">
                            <Calendar size={12} />
                            <span>{formatEventDate(event)}</span>
                            {eventTime && (
                              <>
                                <Clock size={12} />
                                <span>{eventTime}</span>
                              </>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 text-xs">
                            <MapPin size={12} />
                            <span className="truncate">{event.location || 'Online'}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* ✅ Dot indicators — mobile only */}
              {displayTrending.length > 1 && (
                <div className="flex justify-center gap-1.5 mt-3 sm:hidden">
                  {displayTrending.map((_, index) => (
                    <div
                      key={index}
                      className={`rounded-full transition-all duration-300 ${
                        activeTrendingIndex === index
                          ? 'w-4 h-1.5 bg-cyan-500'
                          : 'w-1.5 h-1.5 bg-gray-300'
                      }`}
                    />
                  ))}
                </div>
              )}
            </section>
          )}

          {/* ✅ Places Banner */}
          {!searchQuery && (
            <section className="mb-8 px-4 sm:px-0">
              <Link to="/dashboard/categories" className="block group">
                <div className="relative rounded-2xl overflow-hidden shadow-lg">
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-600 via-purple-500 to-indigo-600" />
                  <div className="absolute -top-6 -right-6 w-32 h-32 rounded-full bg-white/10" />
                  <div className="absolute -bottom-4 -left-4 w-24 h-24 rounded-full bg-white/10" />

                  <div className="relative z-10 px-4 sm:px-8 py-4 sm:py-6 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 sm:gap-5 flex-1 min-w-0">
                      <div className="bg-white/20 rounded-xl p-2.5 sm:p-4 flex-shrink-0">
                        <Compass size={22} className="text-white sm:w-8 sm:h-8" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-white font-bold text-sm sm:text-xl leading-tight">
                          Explore Places Near You
                        </h3>
                        <p className="text-white/80 text-xs sm:text-sm mt-0.5 line-clamp-1">
                          Restaurants, parks, cinemas, campus spots & more
                        </p>
                        <div className="hidden sm:flex gap-2 flex-wrap mt-2">
                          {['🍽️ Food', '🎭 Art', '💪 Fitness', '🏛️ Campus', '🎬 Cinema'].map((tag) => (
                            <span key={tag} className="bg-white/15 text-white text-xs px-2.5 py-0.5 rounded-full font-medium">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="flex-shrink-0 bg-white/20 hover:bg-white/30 transition rounded-full p-2 sm:p-3 group-hover:translate-x-1 transition-transform">
                      <ChevronRight size={18} className="text-white" />
                    </div>
                  </div>

                  {/* Tags — mobile only */}
                  <div className="relative z-10 px-4 pb-3 flex gap-2 sm:hidden overflow-x-auto scrollbar-hide">
                    {['🍽️ Food', '🎭 Art', '💪 Fitness', '🏛️ Campus', '🎬 Cinema'].map((tag) => (
                      <span key={tag} className="bg-white/15 text-white text-xs px-2.5 py-0.5 rounded-full font-medium whitespace-nowrap flex-shrink-0">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </Link>
            </section>
          )}

          {/* ✅ Picked For You */}
          {displayPicked.length > 0 && (
            <section className="px-4 sm:px-0 mb-6">
              <h2 className="text-xl sm:text-2xl font-bold mb-4">Picked For You</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-5">
                {displayPicked.map(event => (
                  <div
                    key={event.id}
                    onClick={() => handleEventClick(event.id)}
                    className="relative group cursor-pointer"
                  >
                    <div className="relative h-40 sm:h-48 rounded-xl overflow-hidden">
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
                          size={13}
                          className={isEventSaved(event.id) ? 'text-red-500 fill-red-500' : 'text-gray-700'}
                        />
                      </button>
                      {event.isFree && (
                        <span className="absolute top-2 left-2 bg-emerald-500 text-white text-xs px-2 py-0.5 rounded-full font-semibold">
                          Free
                        </span>
                      )}
                      <div className="absolute bottom-0 p-2.5 text-white w-full">
                        <h3 className="text-xs font-bold line-clamp-2">{event.title}</h3>
                        <div className="flex items-center gap-1 mt-0.5 text-white/80">
                          <MapPin size={9} />
                          <span className="text-xs truncate">{event.location || 'Online'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Empty State */}
          {displayTrending.length === 0 && displayPicked.length === 0 && (
            <div className="text-center py-20 px-4 sm:px-0">
              {searchQuery ? (
                <>
                  <p className="text-gray-500 text-lg mb-2">No events found for "{searchQuery}"</p>
                  <p className="text-gray-400 text-sm">Try a different search term</p>
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
                  <button
                    onClick={() => navigate('/settings')}
                    className="px-6 py-2.5 bg-cyan-400 text-white rounded-lg font-medium hover:bg-cyan-500 transition"
                  >
                    Change to Lagos
                  </button>
                </div>
              ) : activeCategory !== 'All' ? (
                <>
                  <p className="text-gray-500 text-lg mb-2">No {activeCategory} events available yet</p>
                  <p className="text-gray-400 text-sm mb-4">Try selecting a different category</p>
                  <button
                    onClick={() => setActiveCategory('All')}
                    className="px-6 py-2.5 bg-cyan-400 text-white rounded-lg font-medium hover:bg-cyan-500 transition"
                  >
                    View All Events
                  </button>
                </>
              ) : (
                <>
                  <p className="text-gray-500 text-lg mb-2">No events available yet</p>
                  <p className="text-gray-400 text-sm">Check back soon!</p>
                </>
              )}
            </div>
          )}
        </>
      )}

      <div className="h-6" />
    </div>
  );
}