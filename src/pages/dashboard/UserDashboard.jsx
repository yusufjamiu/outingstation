import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Search, Bell, Heart, ChevronRight, Calendar, Clock, MapPin, Menu } from 'lucide-react';
import { UserSidebar } from '../../components/UserSidebar';
import { useAuth } from '../../context/AuthContext';
import { collection, getDocs, doc, updateDoc, arrayUnion, arrayRemove, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';

export default function UserDashboard() {
  const navigate = useNavigate();
  const { currentUser, userProfile } = useAuth();

  const [activeCategory, setActiveCategory] = useState('All');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [trendingEvents, setTrendingEvents] = useState([]);
  const [pickedEvents, setPickedEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [savedEventIds, setSavedEventIds] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  const displayName = userProfile?.name || currentUser?.displayName || 'Friend';
  const city = userProfile?.city || 'your city';
  const avatarUrl = userProfile?.avatar || userProfile?.photoURL || currentUser?.photoURL ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=22D3EE&color=fff&size=128`;

  const user = { name: displayName, city: '', avatar: avatarUrl };

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
  }, [activeCategory]);

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

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <UserSidebar
        activeTab="home"
        user={user}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <main className="flex-1 overflow-auto">
        <header className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-30">
          <div className="flex items-center justify-between">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 hover:bg-gray-100 rounded-lg">
              <Menu size={24} />
            </button>

            <div className="flex-1 max-w-xl">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Search location, events & more"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400 text-sm"
                />
              </div>
            </div>

            <div className="flex items-center gap-4">
              <button className="p-2 hover:bg-gray-100 rounded-full relative">
                <Bell size={20} className="text-gray-600" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>

              <Link to="/settings">
                <img
                  src={avatarUrl}
                  alt={displayName}
                  className="w-10 h-10 rounded-full cursor-pointer hover:ring-2 hover:ring-cyan-400 transition object-cover"
                />
              </Link>
            </div>
          </div>
        </header>

        <div className="px-6 py-6">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900">
              Good day, {displayName.split(' ')[0]}!
            </h1>
            <p className="text-gray-600 mt-1">
              Here's what is happening in <span className="font-semibold">{city.split(',')[0]}</span> today.
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
                    <button className="text-cyan-500 font-medium text-sm hover:underline">View All</button>
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
                  <p className="text-gray-500 text-lg mb-2">
                    {searchQuery ? `No events found for "${searchQuery}"` : 'No events available yet.'}
                  </p>
                  <p className="text-gray-400 text-sm">
                    {searchQuery ? 'Try a different search term' : 'Check back soon for exciting events!'}
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