import { useState, useEffect } from 'react';
import { useParams, useNavigate, useOutletContext, useLocation } from 'react-router-dom';
import { Heart, Calendar, Clock, MapPin } from 'lucide-react';
import { Briefcase, Palette, UtensilsCrossed, Dumbbell, GraduationCap,
  Heart as HeartIcon, Music, Baby, Users, Gamepad2, Mic2, Tv,
  ShoppingBag, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { filterUpcomingEvents } from '../../utils/eventFilters';
import { collection, getDocs, doc, getDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '../../firebase';
import { formatEventDate, formatEventTime } from '../../utils/dateTimeHelpers';

export default function GenericCategory() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, userProfile } = useAuth();
  const { searchQuery } = useOutletContext();

  const isPlacesMode = new URLSearchParams(location.search).get('places') === 'true';

  const [savedEventIds, setSavedEventIds] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [religionFilter, setReligionFilter] = useState('all');

  const categoryMap = {
    'Business & Tech': { icon: Briefcase, color: 'bg-blue-500', hasPlaces: false, isReligion: false },
    'Art & Culture': { icon: Palette, color: 'bg-purple-500', hasPlaces: true, isReligion: false },
    'Food & Dining': { icon: UtensilsCrossed, color: 'bg-orange-500', hasPlaces: true, isReligion: false },
    'Sport & Fitness': { icon: Dumbbell, color: 'bg-green-500', hasPlaces: true, isReligion: false },
    'Education': { icon: GraduationCap, color: 'bg-indigo-500', hasPlaces: false, isReligion: false },
    'Religion & Community': { icon: HeartIcon, color: 'bg-pink-500', hasPlaces: false, isReligion: true },
    'Nightlife & Parties': { icon: Music, color: 'bg-purple-600', hasPlaces: true, isReligion: false },
    'Family & Kids Fun': { icon: Baby, color: 'bg-yellow-500', hasPlaces: true, isReligion: false },
    'Networking & Social': { icon: Users, color: 'bg-teal-500', hasPlaces: false, isReligion: false },
    'Gaming & Esport': { icon: Gamepad2, color: 'bg-red-500', hasPlaces: false, isReligion: false },
    'Music & Concerts': { icon: Mic2, color: 'bg-pink-600', hasPlaces: false, isReligion: false },
    'Cinema & Show': { icon: Tv, color: 'bg-gray-700', hasPlaces: true, isReligion: false },
    // ✅ Places only
    'Malls': { icon: ShoppingBag, color: 'bg-sky-500', hasPlaces: true, isReligion: false, placesOnly: true },
    'Spas': { icon: Sparkles, color: 'bg-pink-400', hasPlaces: true, isReligion: false, placesOnly: true },
  };

  const currentCategory = categoryMap[slug] || categoryMap['Business & Tech'];
  const CategoryIcon = currentCategory.icon;
  const showingPlaces = currentCategory.placesOnly || isPlacesMode;

  useEffect(() => {
    loadSavedEventIds();
    loadCategoryEvents();
  }, [currentUser, slug, userProfile?.city]);

  const loadSavedEventIds = async () => {
    if (!currentUser) return;
    try {
      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      if (userDoc.exists()) setSavedEventIds(userDoc.data().savedEvents || []);
    } catch (err) {
      console.error('Error loading saved events:', err);
    }
  };

  const loadCategoryEvents = async () => {
    try {
      setLoading(true);
      const snapshot = await getDocs(collection(db, 'events'));
      let allEvents = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      allEvents = allEvents.filter(e => e.category === slug && e.status === 'published');
      allEvents = filterUpcomingEvents(allEvents);

      const userCity = userProfile?.city || 'Lagos';
      if (userCity && userCity.toLowerCase().trim() !== 'lagos') {
        const userCityNormalized = userCity.toLowerCase().split(',')[0].trim();
        const cityMatchedEvents = allEvents.filter(e => {
          const eventLocation = (e.location || '').toLowerCase();
          const eventCity = eventLocation.split(',')[0].trim();
          return eventCity === userCityNormalized;
        });
        if (cityMatchedEvents.length === 0) {
          setEvents([]);
          setLoading(false);
          return;
        }
        allEvents = cityMatchedEvents;
      }

      setEvents(allEvents);
    } catch (err) {
      console.error('Error loading events:', err);
    }
    setLoading(false);
  };

  const filterEventsBySearch = (events) => {
    if (!searchQuery?.trim()) return events;
    const query = searchQuery.toLowerCase();
    return events.filter(event =>
      event.title?.toLowerCase().includes(query) ||
      event.description?.toLowerCase().includes(query) ||
      event.location?.toLowerCase().includes(query)
    );
  };

  const getFilteredEvents = () => {
    let filtered = filterEventsBySearch(events);

    if (currentCategory.placesOnly) {
      filtered = filtered.filter(e => e.subCategory === 'places');
    } else if (currentCategory.hasPlaces) {
      filtered = filtered.filter(e =>
        isPlacesMode ? e.subCategory === 'places' : e.subCategory !== 'places'
      );
    }

    if (currentCategory.isReligion && religionFilter !== 'all') {
      filtered = filtered.filter(e => e.religionType === religionFilter);
    }

    return filtered;
  };

  const displayEvents = getFilteredEvents();

  const handleEventClick = (eventId) => navigate(`/event/${eventId}`);

  const handleSaveClick = async (e, eventId) => {
    e.stopPropagation();
    if (!currentUser) { navigate('/login'); return; }
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

  const getImage = (event) => event.imageUrl || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&q=80';

  const userCity = userProfile?.city || 'Lagos';
  const userCityName = userCity.split(',')[0].trim();

  return (
    <div className="p-4 sm:p-6 lg:p-8">

      <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className={`w-14 h-14 sm:w-16 sm:h-16 ${currentCategory.color} rounded-2xl flex items-center justify-center flex-shrink-0`}>
          <CategoryIcon size={28} className="sm:w-8 sm:h-8 text-white" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">
            {slug} {showingPlaces ? 'Places' : 'Events'}
          </h1>
          <p className="text-sm sm:text-base text-gray-600">
            Discover amazing {slug.toLowerCase()} {showingPlaces ? 'places' : 'events'} around you
          </p>
        </div>
      </div>

      {currentCategory.isReligion && (
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Religion:</label>
          <div className="flex flex-wrap gap-2">
            {['all', 'Christianity', 'Islam', 'Others'].map((religion) => (
              <button key={religion} onClick={() => setReligionFilter(religion)}
                className={`px-4 py-2 rounded-lg font-medium transition ${religionFilter === religion ? 'bg-cyan-500 text-white' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'}`}>
                {religion === 'all' ? 'All' : religion}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mb-6">
        <p className="text-sm sm:text-base text-gray-600 font-medium">
          {displayEvents.length} {showingPlaces ? 'Places' : 'Events'} Available
          {searchQuery && ` (filtered from ${events.length} total)`}
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-cyan-500"></div>
        </div>
      ) : displayEvents.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 lg:gap-6">
          {displayEvents.map((event) => {
            const eventTime = formatEventTime(event);
            return (
              <div key={event.id} onClick={() => handleEventClick(event.id)}
                className="bg-white rounded-xl overflow-hidden shadow-md hover:shadow-xl transition group cursor-pointer">
                <div className="relative h-48 sm:h-56">
                  <img src={getImage(event)} alt={event.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                  <div className="absolute top-3 left-3">
                    <span className={`${currentCategory.color} text-white text-xs px-2.5 sm:px-3 py-1 rounded-full`}>
                      #{event.category}
                    </span>
                  </div>
                  <button onClick={(e) => handleSaveClick(e, event.id)}
                    className="absolute top-3 right-3 w-9 h-9 sm:w-10 sm:h-10 bg-white rounded-full flex items-center justify-center hover:bg-gray-100 transition z-10">
                    <Heart size={18}
                      className={`sm:w-5 sm:h-5 ${savedEventIds.includes(event.id) ? 'text-red-500 fill-red-500' : 'text-gray-600'}`} />
                  </button>
                  {event.isFree && (
                    <div className="absolute bottom-3 right-3">
                      <span className="bg-emerald-500 text-white text-xs px-2.5 sm:px-3 py-1 rounded-lg font-semibold">
                        {showingPlaces ? 'Free Entry' : 'Free'}
                      </span>
                    </div>
                  )}
                </div>
                <div className="p-4 sm:p-5">
                  <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-3 group-hover:text-cyan-500 transition line-clamp-2">
                    {event.title}
                  </h3>
                  <div className="space-y-2 text-xs sm:text-sm text-gray-600">
                    {!showingPlaces && (
                      <div className="flex items-center gap-2">
                        <Calendar size={14} />
                        <span>{formatEventDate(event)}</span>
                        {eventTime && (<><Clock size={14} /><span>{eventTime}</span></>)}
                      </div>
                    )}
                    {showingPlaces && event.openingTime && event.closingTime && (
                      <div className="flex items-center gap-2">
                        <Clock size={14} />
                        <span>{event.openingTime} - {event.closingTime}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <MapPin size={14} />
                      <span>{event.location || 'Online'}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-20">
          {searchQuery ? (
            <>
              <p className="text-gray-500 text-lg mb-2">No {showingPlaces ? 'places' : 'events'} found for "{searchQuery}"</p>
              <p className="text-gray-400 text-sm">Try a different search term</p>
            </>
          ) : userCity.toLowerCase() !== 'lagos' && !showingPlaces ? (
            <div className="max-w-md mx-auto">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <MapPin size={32} className="text-gray-400" />
              </div>
              <p className="text-gray-700 text-lg mb-2 font-medium">
                No {slug} {showingPlaces ? 'places' : 'events'} in {userCityName} yet
              </p>
              <p className="text-gray-500 text-sm mb-6">
                We're currently only available in Lagos, but we're expanding soon!
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button onClick={() => navigate('/settings')}
                  className="px-6 py-2.5 bg-cyan-400 text-white rounded-lg font-medium hover:bg-cyan-500 transition">
                  Change to Lagos
                </button>
              </div>
            </div>
          ) : (
            <>
              <p className="text-gray-500 text-lg mb-2">No {showingPlaces ? 'places' : 'events'} available yet.</p>
              <p className="text-gray-400 text-sm">Check back soon!</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}