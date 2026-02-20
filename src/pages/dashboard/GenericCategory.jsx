import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Search, Bell, Heart, Menu, Calendar, Clock, MapPin } from 'lucide-react';
import { Briefcase, Palette, UtensilsCrossed, Dumbbell, GraduationCap, 
  Heart as HeartIcon, Music, Baby, Users, Gamepad2, Mic2, Tv } from 'lucide-react';
import { UserSidebar } from '../../components/UserSidebar';
import { useAuth } from '../../context/AuthContext';
import { collection, getDocs, doc, getDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '../../firebase';

export default function GenericCategory() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { currentUser, userProfile } = useAuth();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [savedEventIds, setSavedEventIds] = useState([]);
  const [events, setEvents] = useState([]);
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

  const categoryMap = {
    'Business & Tech': { icon: Briefcase, color: 'bg-blue-500' },
    'Art & Culture': { icon: Palette, color: 'bg-purple-500' },
    'Food & Dining': { icon: UtensilsCrossed, color: 'bg-orange-500' },
    'Sport & Fitness': { icon: Dumbbell, color: 'bg-green-500' },
    'Education': { icon: GraduationCap, color: 'bg-indigo-500' },
    'Religion & Community': { icon: HeartIcon, color: 'bg-pink-500' },
    'Nightlife & Parties': { icon: Music, color: 'bg-purple-600' },
    'Family & Kids Fun': { icon: Baby, color: 'bg-yellow-500' },
    'Networking & Social': { icon: Users, color: 'bg-teal-500' },
    'Gaming & Esport': { icon: Gamepad2, color: 'bg-red-500' },
    'Music & Concerts': { icon: Mic2, color: 'bg-pink-600' },
    'Cinema & Show': { icon: Tv, color: 'bg-gray-700' }
  };

  const currentCategory = categoryMap[slug] || categoryMap['Business & Tech'];
  const CategoryIcon = currentCategory.icon;

  useEffect(() => {
    loadSavedEventIds();
    loadCategoryEvents();
  }, [currentUser, slug]);

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

  const loadCategoryEvents = async () => {
    try {
      setLoading(true);
      const snapshot = await getDocs(collection(db, 'events'));
      
      let allEvents = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      allEvents = allEvents.filter(e => 
        e.category === slug && e.status === 'published'
      );

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
      event.location?.toLowerCase().includes(query)
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

  const getDate = (event) => {
    if (event.date) {
      const date = event.date.toDate ? event.date.toDate() : new Date(event.date);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
    if (event.startDate) {
      const date = event.startDate.toDate ? event.startDate.toDate() : new Date(event.startDate);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
    return 'TBD';
  };

  const getTime = (event) => event.time || event.dailyStartTime || event.recurringTime || '';
  const getImage = (event) => event.imageUrl || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&q=80';

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
                  placeholder="Search events..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400 text-sm"
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
          <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className={`w-14 h-14 sm:w-16 sm:h-16 ${currentCategory.color} rounded-2xl flex items-center justify-center flex-shrink-0`}>
              <CategoryIcon size={28} className="sm:w-8 sm:h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">{slug}</h1>
              <p className="text-sm sm:text-base text-gray-600">
                Discover amazing {slug.toLowerCase()} events happening around you
              </p>
            </div>
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
                          <span className={`${currentCategory.color} text-white text-xs px-2.5 sm:px-3 py-1 rounded-full`}>
                            #{event.category}
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
                <div className="text-center py-20">
                  <p className="text-gray-500 text-lg mb-2">
                    {searchQuery 
                      ? `No events found for "${searchQuery}"` 
                      : 'No events available in this category yet.'
                    }
                  </p>
                  <p className="text-gray-400 text-sm">
                    {searchQuery 
                      ? 'Try a different search term' 
                      : 'Check back soon for exciting events!'
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