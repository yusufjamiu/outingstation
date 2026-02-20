import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Heart, ChevronDown, Calendar, Clock, MapPin } from 'lucide-react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";

export default function CampusEventsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  
  const [selectedUniversity, setSelectedUniversity] = useState('All Universities');
  const [showUniversityDropdown, setShowUniversityDropdown] = useState(false);
  const [universities, setUniversities] = useState(['All Universities']);
  const [universityImages, setUniversityImages] = useState({});
  const [allEvents, setAllEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filter states
  const [dateFilter, setDateFilter] = useState('any');
  const [statusFilter, setStatusFilter] = useState('all');
  const [locationFilter, setLocationFilter] = useState('all');

  const currentUser = null; // Public user

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const uniParam = params.get('university');
    if (uniParam) {
      setSelectedUniversity(decodeURIComponent(uniParam));
    }
  }, [location.search]);

  useEffect(() => {
    loadCampusEvents();
  }, []);

  const loadCampusEvents = async () => {
    try {
      setLoading(true);

      // Load universities
      const uniSnapshot = await getDocs(collection(db, 'universities'));
      const uniImagesMap = {};
      const uniList = ['All Universities'];

      uniSnapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.name && data.imageUrl) {
          uniImagesMap[data.name] = data.imageUrl;
          uniList.push(data.name);
        }
      });

      setUniversityImages(uniImagesMap);
      setUniversities(uniList);

      // Load campus events
      const snapshot = await getDocs(collection(db, 'events'));
      const eventsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Filter campus events
      const campusEvents = eventsData.filter(e => 
        e.eventType === 'campus' && e.status === 'published'
      );

      setAllEvents(campusEvents);
    } catch (err) {
      console.error('Error loading campus events:', err);
    }
    setLoading(false);
  };

  // Apply all filters
  const getFilteredEvents = () => {
    let filtered = [...allEvents];

    // University filter
    if (selectedUniversity !== 'All Universities') {
      filtered = filtered.filter(e => e.university === selectedUniversity);
    }

    // Date filter
    if (dateFilter !== 'any') {
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

    // Status filter (free/paid)
    if (statusFilter !== 'all') {
      if (statusFilter === 'free') {
        filtered = filtered.filter(e => e.isFree === true);
      } else if (statusFilter === 'paid') {
        filtered = filtered.filter(e => e.isFree === false);
      }
    }

    // Location filter
    if (locationFilter !== 'all') {
      if (locationFilter === 'on-campus') {
        filtered = filtered.filter(e => 
          e.location?.toLowerCase().includes('campus') ||
          e.location?.toLowerCase().includes('hall') ||
          e.location?.toLowerCase().includes('auditorium')
        );
      } else if (locationFilter === 'off-campus') {
        filtered = filtered.filter(e => 
          !e.location?.toLowerCase().includes('campus') &&
          !e.location?.toLowerCase().includes('hall') &&
          !e.location?.toLowerCase().includes('auditorium')
        );
      }
    }

    return filtered;
  };

  const filteredEvents = getFilteredEvents();

  const handleSaveClick = (eventId) => {
    if (!currentUser) {
      navigate('/login');
      return;
    }
  };

  const handleEventClick = (eventId) => {
    navigate(`/event/${eventId}`);
  };

  const getUniversityBannerImage = () => {
    if (selectedUniversity === 'All Universities') {
      return 'https://images.unsplash.com/photo-1562774053-701939374585?w=1200&q=80';
    }
    return universityImages[selectedUniversity] || 'https://images.unsplash.com/photo-1562774053-701939374585?w=1200&q=80';
  };

  const getDate = (event) => {
    if (event.date) {
      const date = event.date.toDate ? event.date.toDate() : new Date(event.date);
      return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    }
    return 'TBD';
  };

  const getTime = (event) => event.time || 'TBD';
  const getImage = (event) => event.imageUrl || 'https://images.unsplash.com/photo-1562774053-701939374585?w=800&q=80';

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Header with University Selector */}
        <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Campus Events</h1>
            <p className="text-sm sm:text-base text-gray-600">
              Discover events happening in your university and campuses around you.
            </p>
          </div>
          
          {/* University Dropdown */}
          <div className="relative">
            <button 
              onClick={() => setShowUniversityDropdown(!showUniversityDropdown)}
              className="w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-3 bg-white border border-gray-300 rounded-lg flex items-center justify-between sm:justify-start gap-2 hover:border-cyan-400 transition text-sm sm:text-base"
            >
              <span className="font-medium">{selectedUniversity}</span>
              <ChevronDown size={20} className={`transition-transform ${showUniversityDropdown ? 'rotate-180' : ''}`} />
            </button>

            {showUniversityDropdown && (
              <>
                <div 
                  className="fixed inset-0 bg-black/20 z-40 sm:hidden"
                  onClick={() => setShowUniversityDropdown(false)}
                ></div>
                
                <div className="absolute right-0 mt-2 w-full sm:w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                  <div className="p-2 max-h-80 overflow-y-auto">
                    {universities.map((uni, index) => (
                      <button
                        key={index}
                        onClick={() => {
                          setSelectedUniversity(uni);
                          setShowUniversityDropdown(false);
                        }}
                        className={`w-full text-left px-4 py-3 hover:bg-gray-100 rounded-lg transition text-sm sm:text-base ${
                          selectedUniversity === uni ? 'bg-cyan-50 text-cyan-600' : ''
                        }`}
                      >
                        {uni}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* University Banner */}
        <div className="relative rounded-xl sm:rounded-2xl overflow-hidden mb-6 sm:mb-8 shadow-lg">
          <img 
            src={getUniversityBannerImage()}
            alt={selectedUniversity}
            className="w-full h-48 sm:h-64 lg:h-80 object-cover"
            onError={(e) => {
              e.target.src = 'https://images.unsplash.com/photo-1562774053-701939374585?w=1200&q=80';
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-transparent"></div>
          
          <div className="absolute bottom-4 sm:bottom-6 lg:bottom-8 left-4 sm:left-6 lg:left-8 text-white">
            <div className="bg-cyan-400 text-white text-xs sm:text-sm px-2.5 sm:px-3 py-1 rounded-full inline-block mb-2 sm:mb-3">
              Featured Campus
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-1 sm:mb-2">{selectedUniversity}</h2>
            <p className="text-sm sm:text-base lg:text-lg">
              {filteredEvents.length} campus event{filteredEvents.length !== 1 ? 's' : ''} available
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-6 sm:mb-8">
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

          <div className="flex-1 sm:flex-initial">
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">Status:</label>
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 sm:px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 outline-none text-sm"
            >
              <option value="all">All</option>
              <option value="free">Free</option>
              <option value="paid">Paid</option>
            </select>
          </div>

          <div className="flex-1 sm:flex-initial">
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">Location:</label>
            <select 
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              className="w-full px-3 sm:px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 outline-none text-sm"
            >
              <option value="all">All Locations</option>
              <option value="on-campus">On-Campus</option>
              <option value="off-campus">Off-Campus</option>
            </select>
          </div>

          <div className="sm:ml-auto flex items-end">
            <p className="text-sm sm:text-base text-gray-600 font-medium">{filteredEvents.length} Events Available</p>
          </div>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-cyan-500"></div>
          </div>
        ) : filteredEvents.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 lg:gap-6">
            {filteredEvents.map((event) => (
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
                    <span className="bg-blue-500 text-white text-xs px-2.5 sm:px-3 py-1 rounded-full">
                      #{event.category}
                    </span>
                  </div>

                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSaveClick(event.id);
                    }}
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
                    {event.university && (
                      <div className="flex items-center gap-2">
                        <span>🏛️ {event.university}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Calendar size={14} />
                      <span>{getDate(event)}</span>
                      <Clock size={14} />
                      <span>{getTime(event)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin size={14} />
                      <span>{event.location || 'Campus'}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No campus events found</p>
            <p className="text-gray-400 text-sm mt-2">
              {selectedUniversity === 'All Universities' 
                ? 'Try adjusting your filters'
                : `No events for ${selectedUniversity} with current filters`
              }
            </p>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}