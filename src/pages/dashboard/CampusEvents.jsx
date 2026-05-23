import { useState, useEffect } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { Heart, ChevronDown, Calendar, Clock, MapPin } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { filterUpcomingEvents } from '../../utils/eventFilters';
import { collection, getDocs, doc, getDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '../../firebase';
import { formatEventDate, formatEventTime } from '../../utils/dateTimeHelpers';

export default function CampusEvents() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { searchQuery } = useOutletContext();

  const [selectedUniversity, setSelectedUniversity] = useState('All Universities');
  const [showUniversityDropdown, setShowUniversityDropdown] = useState(false);
  const [savedEventIds, setSavedEventIds] = useState([]);
  const [events, setEvents] = useState([]);
  const [universities, setUniversities] = useState(['All Universities']);
  const [universityImages, setUniversityImages] = useState({});
  const [loading, setLoading] = useState(true);

  // ✅ University follow state
  const [followedUniversities, setFollowedUniversities] = useState(new Set());
  const [followingUni, setFollowingUni] = useState(null);

  // ✅ Follower counts per university
  const [followerCounts, setFollowerCounts] = useState({});

  useEffect(() => { loadData(); }, [currentUser]);

  const loadData = async () => {
    try {
      setLoading(true);

      // ✅ FIX: Load ALL universities from universities collection first
      const uniSnapshot = await getDocs(collection(db, 'universities'));
      const uniImagesMap = {};
      const uniList = ['All Universities'];

      uniSnapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.name) {
          uniList.push(data.name);
          if (data.imageUrl) uniImagesMap[data.name] = data.imageUrl;
        }
      });

      // ✅ Load campus events
      const snapshot = await getDocs(collection(db, 'events'));
      let allEvents = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      allEvents = allEvents.filter(e => e.eventType === 'campus' && e.status === 'published');
      allEvents = filterUpcomingEvents(allEvents);

      // ✅ Add any universities from events not already in the list
      allEvents.forEach(event => {
        if (event.university && !uniList.includes(event.university)) {
          uniList.push(event.university);
        }
      });

      setUniversityImages(uniImagesMap);
      setUniversities(uniList);
      setEvents(allEvents);

      // ✅ Count followers per university from all users
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const counts = {};
      usersSnapshot.docs.forEach(doc => {
        const followed = doc.data().followedUniversities || [];
        followed.forEach(uni => {
          counts[uni] = (counts[uni] || 0) + 1;
        });
      });
      setFollowerCounts(counts);

      // ✅ Load current user data
      if (currentUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
          if (userDoc.exists()) {
            setSavedEventIds(userDoc.data().savedEvents || []);
            const followed = userDoc.data().followedUniversities || [];
            setFollowedUniversities(new Set(followed));
          }
        } catch (err) {
          console.error('Error loading user data:', err);
        }
      }

    } catch (err) {
      console.error('Error loading events:', err);
    }
    setLoading(false);
  };

  const handleFollowUniversity = async (uniName) => {
    if (!currentUser || followingUni === uniName) return;
    setFollowingUni(uniName);

    const isFollowing = followedUniversities.has(uniName);
    const userRef = doc(db, 'users', currentUser.uid);

    // Optimistic update — also update follower count
    setFollowedUniversities(prev => {
      const next = new Set(prev);
      isFollowing ? next.delete(uniName) : next.add(uniName);
      return next;
    });
    setFollowerCounts(prev => ({
      ...prev,
      [uniName]: Math.max(0, (prev[uniName] || 0) + (isFollowing ? -1 : 1))
    }));

    try {
      await updateDoc(userRef, {
        followedUniversities: isFollowing ? arrayRemove(uniName) : arrayUnion(uniName)
      });
    } catch (err) {
      // Rollback
      setFollowedUniversities(prev => {
        const next = new Set(prev);
        isFollowing ? next.add(uniName) : next.delete(uniName);
        return next;
      });
      setFollowerCounts(prev => ({
        ...prev,
        [uniName]: Math.max(0, (prev[uniName] || 0) + (isFollowing ? 1 : -1))
      }));
      console.error('Follow error:', err);
    } finally {
      setFollowingUni(null);
    }
  };

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

  const filteredEvents = selectedUniversity === 'All Universities'
    ? events
    : events.filter(e => e.university === selectedUniversity);

  const filterEventsBySearch = (events) => {
    if (!searchQuery?.trim()) return events;
    const query = searchQuery.toLowerCase();
    return events.filter(event =>
      event.title?.toLowerCase().includes(query) ||
      event.description?.toLowerCase().includes(query) ||
      event.location?.toLowerCase().includes(query) ||
      event.university?.toLowerCase().includes(query)
    );
  };

  const displayEvents = filterEventsBySearch(filteredEvents);

  const getImage = (event) => event.imageUrl || 'https://images.unsplash.com/photo-1562774053-701939374585?w=800&q=80';

  const getUniversityBannerImage = () => {
    if (selectedUniversity === 'All Universities') return 'https://images.unsplash.com/photo-1562774053-701939374585?w=1200&q=80';
    return universityImages[selectedUniversity] || 'https://images.unsplash.com/photo-1562774053-701939374585?w=1200&q=80';
  };

  const totalFollowers = followerCounts[selectedUniversity] || 0;

  return (
    <div className="p-4 sm:p-6 lg:p-8">

      {/* Header */}
      <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Campus Events</h1>
          <p className="text-sm sm:text-base text-gray-600">
            Discover events happening in your university and campuses around you.
          </p>
        </div>

        {/* University Dropdown */}
        <div className="relative">
          <button onClick={() => setShowUniversityDropdown(!showUniversityDropdown)}
            className="w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-3 bg-white border border-gray-300 rounded-lg flex items-center justify-between sm:justify-start gap-2 hover:border-cyan-400 transition text-sm sm:text-base">
            <span className="font-medium">{selectedUniversity}</span>
            <ChevronDown size={20} className={`transition-transform ${showUniversityDropdown ? 'rotate-180' : ''}`} />
          </button>

          {showUniversityDropdown && (
            <>
              <div className="fixed inset-0 bg-black/20 z-40 sm:hidden" onClick={() => setShowUniversityDropdown(false)}></div>
              <div className="absolute right-0 mt-2 w-full sm:w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                <div className="p-2 max-h-80 overflow-y-auto">
                  {universities.map((uni, index) => (
                    <button key={index}
                      onClick={() => { setSelectedUniversity(uni); setShowUniversityDropdown(false); }}
                      className={`w-full text-left px-4 py-3 hover:bg-gray-100 rounded-lg transition text-sm ${selectedUniversity === uni ? 'bg-cyan-50 text-cyan-600 font-medium' : ''}`}>
                      <div className="flex items-center justify-between">
                        <span>
                          {uni}
                          {uni !== 'All Universities' && followedUniversities.has(uni) && (
                            <span className="ml-2 text-xs text-purple-500 font-medium">✓ Following</span>
                          )}
                        </span>
                        {/* ✅ Show follower count in dropdown */}
                        {uni !== 'All Universities' && followerCounts[uni] > 0 && (
                          <span className="text-xs text-gray-400 flex items-center gap-1 flex-shrink-0">
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                            </svg>
                            {followerCounts[uni]}
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ✅ Banner with Follow button + follower count */}
      <div className="relative rounded-xl sm:rounded-2xl overflow-hidden mb-6 sm:mb-8 shadow-lg">
        <img src={getUniversityBannerImage()} alt={selectedUniversity}
          className="w-full h-48 sm:h-64 lg:h-80 object-cover"
          onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1562774053-701939374585?w=1200&q=80'; }} />
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-transparent"></div>

        <div className="absolute bottom-4 sm:bottom-6 lg:bottom-8 left-4 sm:left-6 lg:left-8 right-4 sm:right-6 lg:right-8 text-white">
          <div className="flex items-end justify-between gap-4">
            <div>
              <div className="bg-cyan-400 text-white text-xs sm:text-sm px-2.5 sm:px-3 py-1 rounded-full inline-block mb-2 sm:mb-3">
                Featured Campus
              </div>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-1 sm:mb-2">{selectedUniversity}</h2>
              <div className="flex items-center gap-4 flex-wrap">
                <p className="text-sm sm:text-base lg:text-lg">
                  {displayEvents.length} event{displayEvents.length !== 1 ? 's' : ''} available
                </p>
                {/* ✅ Follower count on banner */}
                {selectedUniversity !== 'All Universities' && totalFollowers > 0 && (
                  <div className="flex items-center gap-1.5 bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="white">
                      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                    </svg>
                    <span className="text-xs font-semibold">
                      {totalFollowers} follower{totalFollowers !== 1 ? 's' : ''}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* ✅ Follow button */}
            {selectedUniversity !== 'All Universities' && currentUser && (
              <button
                onClick={() => handleFollowUniversity(selectedUniversity)}
                disabled={followingUni === selectedUniversity}
                className={`flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition shadow-lg ${
                  followedUniversities.has(selectedUniversity)
                    ? 'bg-white text-purple-600 hover:bg-gray-50'
                    : 'bg-purple-500 hover:bg-purple-600 text-white border-2 border-white/30'
                }`}
              >
                {followingUni === selectedUniversity ? (
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : followedUniversities.has(selectedUniversity) ? (
                  <>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                    </svg>
                    Following
                  </>
                ) : (
                  <>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                    </svg>
                    Follow
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Events Grid */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-cyan-500"></div>
        </div>
      ) : displayEvents.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 lg:gap-6">
          {displayEvents.map((event) => {
            const eventTime = formatEventTime(event);
            return (
              <div key={event.id} onClick={() => navigate(`/event/${event.id}`)}
                className="bg-white rounded-xl overflow-hidden shadow-md hover:shadow-xl transition group cursor-pointer">
                <div className="relative h-48 sm:h-56">
                  <img src={getImage(event)} alt={event.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                  <div className="absolute top-3 left-3">
                    <span className="bg-blue-500 text-white text-xs px-2.5 sm:px-3 py-1 rounded-full">#{event.category}</span>
                  </div>
                  <button onClick={(e) => handleSaveClick(e, event.id)}
                    className="absolute top-3 right-3 w-9 h-9 sm:w-10 sm:h-10 bg-white rounded-full flex items-center justify-center hover:bg-gray-100 transition z-10">
                    <Heart size={18} className={`sm:w-5 sm:h-5 ${savedEventIds.includes(event.id) ? 'text-red-500 fill-red-500' : 'text-gray-600'}`} />
                  </button>
                  {event.isFree && (
                    <div className="absolute bottom-3 right-3">
                      <span className="bg-emerald-500 text-white text-xs px-2.5 sm:px-3 py-1 rounded-lg font-semibold">Free</span>
                    </div>
                  )}
                </div>
                <div className="p-4 sm:p-5">
                  <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-3 group-hover:text-cyan-500 transition line-clamp-2">
                    {event.title}
                  </h3>
                  <div className="space-y-2 text-xs sm:text-sm text-gray-600">
                    {event.university && <div className="flex items-center gap-2"><span>🏛️ {event.university}</span></div>}
                    <div className="flex items-center gap-2">
                      <Calendar size={14} />
                      <span>{formatEventDate(event)}</span>
                      {eventTime && <><Clock size={14} /><span>{eventTime}</span></>}
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin size={14} />
                      <span>{event.location || 'Campus'}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-20">
          <div className="text-5xl mb-4">🎓</div>
          <p className="text-gray-500 text-lg mb-2">
            {searchQuery ? `No campus events found for "${searchQuery}"` : 'No campus events yet'}
          </p>
          <p className="text-gray-400 text-sm">
            {selectedUniversity !== 'All Universities'
              ? `No events available for ${selectedUniversity} yet`
              : 'Campus events will appear here once added'}
          </p>
        </div>
      )}
    </div>
  );
}