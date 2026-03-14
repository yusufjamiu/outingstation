import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Heart, Calendar, Clock, MapPin } from 'lucide-react';
import { 
  Briefcase, Palette, UtensilsCrossed, Dumbbell, GraduationCap, 
  Heart as HeartIcon, Music, Baby, Users, Gamepad2, Mic2, Tv 
} from 'lucide-react';
import { collection, getDocs } from 'firebase/firestore';
import { filterUpcomingEvents } from '../../utils/eventFilters';
import { db } from '../../firebase';
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";

export default function GenericCategoryPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState('events');
  const [religionFilter, setReligionFilter] = useState('all');
  const [allEvents, setAllEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filter states
  const [dateFilter, setDateFilter] = useState('any');
  const [locationFilter, setLocationFilter] = useState('all');
  const [priceFilter, setPriceFilter] = useState('any');

  const currentUser = null; // Public user

  // Category mapping
  const categoryMap = {
    'business-tech': { name: 'Business & Tech', icon: Briefcase, color: 'bg-blue-500', hasPlaces: false, isReligion: false },
    'art-culture': { name: 'Art & Culture', icon: Palette, color: 'bg-purple-500', hasPlaces: true, isReligion: false },
    'food-dining': { name: 'Food & Dining', icon: UtensilsCrossed, color: 'bg-orange-500', hasPlaces: true, isReligion: false },
    'sport-fitness': { name: 'Sport & Fitness', icon: Dumbbell, color: 'bg-green-500', hasPlaces: true, isReligion: false },
    'education': { name: 'Education', icon: GraduationCap, color: 'bg-indigo-500', hasPlaces: false, isReligion: false },
    'religion-community': { name: 'Religion & Community', icon: HeartIcon, color: 'bg-pink-500', hasPlaces: false, isReligion: true },
    'nightlife-parties': { name: 'Nightlife & Parties', icon: Music, color: 'bg-purple-600', hasPlaces: true, isReligion: false },
    'family-kids-fun': { name: 'Family & Kids Fun', icon: Baby, color: 'bg-yellow-500', hasPlaces: true, isReligion: false },
    'networking-social': { name: 'Networking & Social', icon: Users, color: 'bg-teal-500', hasPlaces: false, isReligion: false },
    'gaming-esport': { name: 'Gaming & Esport', icon: Gamepad2, color: 'bg-red-500', hasPlaces: false, isReligion: false },
    'music-concerts': { name: 'Music & Concerts', icon: Mic2, color: 'bg-pink-600', hasPlaces: false, isReligion: false },
    'cinema-show': { name: 'Cinema & Show', icon: Tv, color: 'bg-gray-700', hasPlaces: false, isReligion: false }
  };

  const currentCategory = categoryMap[slug] || categoryMap['business-tech'];
  const CategoryIcon = currentCategory.icon;

  useEffect(() => {
    loadCategoryEvents();
  }, [slug]);

  const loadCategoryEvents = async () => {
    try {
      setLoading(true);
      const snapshot = await getDocs(collection(db, 'events'));
      
      const eventsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Filter published and by category
      const categoryName = currentCategory.name;
      let categoryEvents = eventsData.filter(e => 
        e.status === 'published' && e.category === categoryName
      );
      categoryEvents = filterUpcomingEvents(categoryEvents);

      setAllEvents(categoryEvents);
    } catch (err) {
      console.error('Error loading events:', err);
    }
    setLoading(false);
  };

  // Apply all filters
  const getFilteredEvents = () => {
    let filtered = [...allEvents];

    // Tab filter (events/places)
    if (currentCategory.hasPlaces) {
      filtered = filtered.filter(e => e.subCategory === activeTab);
    }

    // Religion filter
    if (currentCategory.isReligion && religionFilter !== 'all') {
      filtered = filtered.filter(e => e.religionType === religionFilter);
    }

    // Date filter (only for events, not places)
    if (dateFilter !== 'any' && activeTab === 'events') {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      filtered = filtered.filter(e => {
        if (!e.date) return false;
        const eventDate = e.date.toDate ? e.date.toDate() : new Date(e.date);
        
        switch (dateFilter) {
          case 'today':
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            return eventDate >= today && eventDate < tomorrow;
          
          case 'this-week':
            const weekEnd = new Date(today);
            weekEnd.setDate(weekEnd.getDate() + 7);
            return eventDate >= today && eventDate < weekEnd;
          
          case 'this-month':
            const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
            return eventDate >= today && eventDate <= monthEnd;
          
          default:
            return true;
        }
      });
    }

    // Location filter
    if (locationFilter !== 'all') {
      filtered = filtered.filter(e => 
        e.location?.toLowerCase().includes(locationFilter.toLowerCase())
      );
    }

    // Price filter
    if (priceFilter !== 'any') {
      if (priceFilter === 'free') {
        filtered = filtered.filter(e => e.isFree === true);
      } else if (priceFilter === 'paid') {
        filtered = filtered.filter(e => e.isFree === false);
      }
    }

    return filtered;
  };

  const events = getFilteredEvents();

  const handleSaveClick = (e, eventId) => {
    e.stopPropagation();
    if (!currentUser) {
      navigate('/login');
      return;
    }
  };

  const handleEventClick = (eventId) => {
    navigate(`/event/${eventId}`);
  };

  // ✅ UPDATED: Handle Places with opening hours
  const getDate = (event) => {
    // For places, show availability
    if (event.subCategory === 'places') {
      return event.placeAvailability || 'Always Open';
    }
    
    // For events
    if (event.date) {
      const date = event.date.toDate ? event.date.toDate() : new Date(event.date);
      return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    }
    if (event.startDate) {
      const date = event.startDate.toDate ? event.startDate.toDate() : new Date(event.startDate);
      return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    }
    return 'TBD';
  };

  // ✅ UPDATED: Handle Places with opening hours
  const getTime = (event) => {
    // For places, show opening hours
    if (event.subCategory === 'places') {
      return event.openingTime && event.closingTime 
        ? `${event.openingTime} - ${event.closingTime}`
        : '';
    }
    
    // For events
    return event.time || event.dailyStartTime || event.recurringTime || 'TBD';
  };

  const getImage = (event) => event.imageUrl || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&q=80';

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className={`w-14 h-14 sm:w-16 sm:h-16 ${currentCategory.color} rounded-2xl flex items-center justify-center flex-shrink-0`}>
            <CategoryIcon size={28} className="sm:w-8 sm:h-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">{currentCategory.name}</h1>
            <p className="text-sm sm:text-base text-gray-600">
              Discover amazing {currentCategory.name.toLowerCase()} {currentCategory.hasPlaces ? 'events & places' : 'events'} happening around you
            </p>
          </div>
        </div>

        {/* Events/Places Tabs */}
        {currentCategory.hasPlaces && (
          <div className="flex gap-2 mb-6 border-b border-gray-200">
            <button
              onClick={() => setActiveTab('events')}
              className={`px-6 py-3 font-medium transition-colors ${
                activeTab === 'events'
                  ? 'border-b-2 border-cyan-500 text-cyan-500'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Events
            </button>
            <button
              onClick={() => setActiveTab('places')}
              className={`px-6 py-3 font-medium transition-colors ${
                activeTab === 'places'
                  ? 'border-b-2 border-cyan-500 text-cyan-500'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Places
            </button>
          </div>
        )}

        {/* Religion Filter */}
        {currentCategory.isReligion && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Religion:</label>
            <div className="flex flex-wrap gap-2">
              {['all', 'Christianity', 'Islam', 'Others'].map((religion) => (
                <button
                  key={religion}
                  onClick={() => setReligionFilter(religion)}
                  className={`px-4 py-2 rounded-lg font-medium transition ${
                    religionFilter === religion
                      ? 'bg-cyan-500 text-white'
                      : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {religion === 'all' ? 'All' : religion}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Filters - Only show date filter for events */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-6 sm:mb-8">
          {activeTab === 'events' && (
            <div className="flex-1 sm:flex-initial">
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">Date:</label>
              <select 
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full px-3 sm:px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 outline-none text-sm"
              >
                <option value="any">Any</option>
                <option value="today">Today</option>
                <option value="this-week">This Week</option>
                <option value="this-month">This Month</option>
              </select>
            </div>
          )}

          <div className="flex-1 sm:flex-initial">
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">Location:</label>
            <select 
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              className="w-full px-3 sm:px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 outline-none text-sm"
            >
              <option value="all">All Cities</option>
              <option value="lagos">Lagos</option>
            </select>
          </div>

          <div className="flex-1 sm:flex-initial">
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">Price:</label>
            <select 
              value={priceFilter}
              onChange={(e) => setPriceFilter(e.target.value)}
              className="w-full px-3 sm:px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 outline-none text-sm"
            >
              <option value="any">Any Price</option>
              <option value="free">Free</option>
              <option value="paid">Paid</option>
            </select>
          </div>

          <div className="sm:ml-auto flex items-end">
            <p className="text-sm sm:text-base text-gray-600 font-medium">
              {events.length} {activeTab === 'places' ? 'Places' : 'Events'} Available
            </p>
          </div>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-cyan-500"></div>
          </div>
        ) : events.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 lg:gap-6">
            {events.map((event) => (
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
                    <span className={`${currentCategory.color} text-white text-xs px-2.5 sm:px-3 py-1 rounded-full`}>
                      #{currentCategory.name}
                    </span>
                  </div>

                  <button
                    onClick={(e) => handleSaveClick(e, event.id)}
                    className="absolute top-3 right-3 w-9 h-9 sm:w-10 sm:h-10 bg-white rounded-full flex items-center justify-center hover:bg-gray-100 transition z-10"
                  >
                    <Heart size={18} className="sm:w-5 sm:h-5 text-gray-600" />
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
                  
                  <div className="space-y-2 text-xs sm:text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <Calendar size={14} />
                      <span>{getDate(event)}</span>
                      {getTime(event) && (
                        <>
                          <Clock size={14} />
                          <span>{getTime(event)}</span>
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin size={14} />
                      <span>{event.location || 'Online'}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No {activeTab} available with current filters.</p>
            <p className="text-gray-400 text-sm mt-2">Try adjusting your filters</p>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}