import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Search, Bell, Heart, ChevronDown, Menu, Calendar, Clock, MapPin } from 'lucide-react';
import { UserSidebar } from '../../components/UserSidebar';
import { useAuth } from '../../context/AuthContext';
import { filterUpcomingEvents } from '../../utils/eventFilters';
import { collection, getDocs, doc, getDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '../../firebase';

export default function CampusEvents() {
  const navigate = useNavigate();
  const { currentUser, userProfile } = useAuth();

  const [selectedUniversity, setSelectedUniversity] = useState('All Universities');
  const [showUniversityDropdown, setShowUniversityDropdown] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [savedEventIds, setSavedEventIds] = useState([]);
  const [events, setEvents] = useState([]);
  const [universities, setUniversities] = useState(['All Universities']);
  const [universityImages, setUniversityImages] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const displayName = userProfile?.name || currentUser?.displayName || 'User';
  const avatarUrl = userProfile?.avatar || userProfile?.photoURL || currentUser?.photoURL ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=22D3EE&color=fff&size=128`;

  const user = {
    name: displayName,
    city: userProfile?.city || 'Lagos',
    avatar: avatarUrl
  };

  useEffect(() => {
    loadSavedEventIds();
    loadCampusEvents();
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

  const loadCampusEvents = async () => {
    try {
      setLoading(true);
      
      const uniSnapshot = await getDocs(collection(db, 'universities'));
      const uniImagesMap = {};
      
      uniSnapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.name && data.imageUrl) {
          uniImagesMap[data.name] = data.imageUrl;
        }
      });
      
      console.log('📷 Loaded university images:', uniImagesMap);
      setUniversityImages(uniImagesMap);

      const snapshot = await getDocs(collection(db, 'events'));

      let allEvents = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      allEvents = allEvents.filter(e => 
        e.eventType === 'campus' && e.status === 'published'
      );
      // ✅ FILTER OUT PAST EVENTS
     allEvents = filterUpcomingEvents(allEvents);

      const uniSet = new Set(['All Universities']);
      allEvents.forEach(event => {
        if (event.university) {
          uniSet.add(event.university);
        }
      });

      setUniversities(Array.from(uniSet));
      setEvents(allEvents);
    } catch (err) {
      console.error('Error loading events:', err);
    }
    setLoading(false);
  };

  const filteredEvents = selectedUniversity === 'All Universities'
    ? events
    : events.filter(e => e.university === selectedUniversity);

  const filterEventsBySearch = (events) => {
    if (!searchQuery.trim()) return events;
    const query = searchQuery.toLowerCase();
    return events.filter(event =>
      event.title?.toLowerCase().includes(query) ||
      event.description?.toLowerCase().includes(query) ||
      event.location?.toLowerCase().includes(query) ||
      event.university?.toLowerCase().includes(query)
    );
  };

  const displayEvents = filterEventsBySearch(filteredEvents);

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

  const getDate = (event) => {
    if (event.date) {
      const date = event.date.toDate ? event.date.toDate() : new Date(event.date);
      return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    }
    return 'TBD';
  };

  const getTime = (event) => event.time || event.dailyStartTime || '';
  const getImage = (event) => event.imageUrl || 'https://images.unsplash.com/photo-1562774053-701939374585?w=800&q=80';

  const getUniversityBannerImage = () => {
    if (selectedUniversity === 'All Universities') {
      return 'https://images.unsplash.com/photo-1562774053-701939374585?w=1200&q=80';
    }
    
    const imageUrl = universityImages[selectedUniversity];
    console.log(`🖼️ Banner for ${selectedUniversity}:`, imageUrl);
    
    return imageUrl || 'https://images.unsplash.com/photo-1562774053-701939374585?w=1200&q=80';
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <UserSidebar 
        activeTab="category" 
        user={user}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <main className="flex-1 overflow-y-auto">
        <header className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 py-4 sticky top-0 z-30">
          <div className="flex items-center justify-between">
            <button 
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 hover:bg-gray-100 rounded-lg mr-2"
            >
              <Menu size={24} />
            </button>

            <div className="flex-1 max-w-xl">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Search campus events..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-100 border-0 rounded-lg focus:ring-2 focus:ring-cyan-400 outline-none text-sm"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-4 ml-2 sm:ml-6">
              <button className="p-2 hover:bg-gray-100 rounded-full relative">
                <Bell size={20} className="text-gray-600" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>
              <Link to="/settings">
                <img 
                  src={avatarUrl} 
                  alt={displayName} 
                  className="w-8 h-8 sm:w-10 sm:h-10 rounded-full cursor-pointer hover:ring-2 hover:ring-cyan-400 transition object-cover" 
                />
              </Link>
            </div>
          </div>
        </header>

        <div className="p-4 sm:p-6 lg:p-8">
          <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Campus Events</h1>
              <p className="text-sm sm:text-base text-gray-600">
                Discover events happening in your university and campuses around you.
              </p>
            </div>
            
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
                            console.log('🎓 Selected university:', uni);
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

          <div className="relative rounded-xl sm:rounded-2xl overflow-hidden mb-6 sm:mb-8 shadow-lg">
            <img 
              src={getUniversityBannerImage()}
              alt={selectedUniversity}
              className="w-full h-48 sm:h-64 lg:h-80 object-cover"
              onError={(e) => {
                console.error('❌ Failed to load banner image for:', selectedUniversity);
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
                {displayEvents.length} campus event{displayEvents.length !== 1 ? 's' : ''} available
                {searchQuery && ` (filtered from ${filteredEvents.length} total)`}
              </p>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-cyan-500"></div>
            </div>
          ) : (
            <>
              {displayEvents.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 lg:gap-6">
                  {displayEvents.map((event) => (
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
                          onClick={(e) => handleSaveClick(e, event.id)}
                          className="absolute top-3 right-3 w-9 h-9 sm:w-10 sm:h-10 bg-white rounded-full flex items-center justify-center hover:bg-gray-100 transition z-10"
                        >
                          <Heart 
                            size={18}
                            className={`sm:w-5 sm:h-5 ${
                              savedEventIds.includes(event.id) 
                                ? 'text-red-500 fill-red-500' 
                                : 'text-gray-600'
                            }`}
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
                        
                        <div className="space-y-2 text-xs sm:text-sm text-gray-600">
                          {event.university && (
                            <div className="flex items-center gap-2">
                              <span>🏛️ {event.university}</span>
                            </div>
                          )}
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
                            <span>{event.location || 'Campus'}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-20">
                  <p className="text-gray-500 text-lg mb-2">
                    {searchQuery 
                      ? `No campus events found for "${searchQuery}"` 
                      : 'No campus events found'
                    }
                  </p>
                  <p className="text-gray-400 text-sm">
                    {searchQuery 
                      ? 'Try a different search term' 
                      : (selectedUniversity === 'All Universities' 
                        ? 'Create campus events in the admin panel with eventType: "campus"'
                        : `No events for ${selectedUniversity}`)
                    }
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}