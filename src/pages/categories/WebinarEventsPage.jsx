import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, Calendar, Clock, MapPin } from 'lucide-react';
import { collection, getDocs } from 'firebase/firestore';
import { filterUpcomingEvents } from '../../utils/eventFilters';
import { db } from '../../firebase';
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import { formatEventDate, formatEventTime } from '../../utils/dateTimeHelpers';

export default function WebinarEventsPage() {
  const navigate = useNavigate();
  const currentUser = null;

  const [allWebinars, setAllWebinars] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [dateFilter, setDateFilter] = useState('any');
  const [topicFilter, setTopicFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    loadWebinars();
  }, []);

  const loadWebinars = async () => {
    try {
      setLoading(true);
      const snapshot = await getDocs(collection(db, 'events'));
      
      const eventsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      let webinarEvents = eventsData.filter(e => 
        e.eventType === 'webinar' && e.status === 'published'
      );

      webinarEvents = filterUpcomingEvents(webinarEvents);

      setAllWebinars(webinarEvents);
    } catch (err) {
      console.error('Error loading webinars:', err);
    }
    setLoading(false);
  };

  const getFilteredWebinars = () => {
    let filtered = [...allWebinars];

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

    if (topicFilter !== 'all') {
      filtered = filtered.filter(e => {
        const category = e.category?.toLowerCase() || '';
        
        switch (topicFilter) {
          case 'technology':
            return category.includes('tech') || category.includes('gaming');
          case 'business':
            return category.includes('business') || category.includes('networking');
          case 'education':
            return category.includes('education');
          default:
            return true;
        }
      });
    }

    if (statusFilter !== 'all') {
      if (statusFilter === 'free') {
        filtered = filtered.filter(e => e.isFree === true);
      } else if (statusFilter === 'paid') {
        filtered = filtered.filter(e => e.isFree === false);
      }
    }

    return filtered;
  };

  const webinars = getFilteredWebinars();

  const handleSaveClick = (e, webinarId) => {
    e.stopPropagation();
    if (!currentUser) {
      navigate('/login');
      return;
    }
  };

  const handleEventClick = (webinarId) => {
    navigate(`/event/${webinarId}`);
  };

  const getImage = (event) => event.imageUrl || 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800&q=80';

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Webinar & Virtual Events</h1>
          <p className="text-sm sm:text-base text-gray-600">
            Discover online workshops, conferences, and live sessions. Connect with experts and learn new things from various parts of the world
          </p>
        </div>

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
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">Topic:</label>
            <select 
              value={topicFilter}
              onChange={(e) => setTopicFilter(e.target.value)}
              className="w-full px-3 sm:px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 outline-none text-sm"
            >
              <option value="all">All</option>
              <option value="technology">Technology</option>
              <option value="business">Business</option>
              <option value="education">Education</option>
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

          <div className="sm:ml-auto flex items-end">
            <p className="text-sm sm:text-base text-gray-600 font-medium">{webinars.length} Events Available</p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-cyan-500"></div>
          </div>
        ) : webinars.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 lg:gap-6">
            {webinars.map((webinar) => {
              const eventTime = formatEventTime(webinar);
              
              return (
                <div 
                  key={webinar.id}
                  onClick={() => handleEventClick(webinar.id)}
                  className="bg-white rounded-xl overflow-hidden shadow-md hover:shadow-xl transition group cursor-pointer"
                >
                  <div className="relative h-48 sm:h-56">
                    <img 
                      src={getImage(webinar)} 
                      alt={webinar.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    />
                    
                    <div className="absolute top-3 left-3">
                      <span className="bg-purple-500 text-white text-xs px-2.5 sm:px-3 py-1 rounded-full">
                        📹 Virtual
                      </span>
                    </div>

                    <button 
                      onClick={(e) => handleSaveClick(e, webinar.id)}
                      className="absolute top-3 right-3 w-9 h-9 sm:w-10 sm:h-10 bg-white rounded-full flex items-center justify-center hover:bg-gray-100 transition z-10"
                    >
                      <Heart size={18} className="sm:w-5 sm:h-5 text-gray-600" />
                    </button>

                    {webinar.isFree && (
                      <div className="absolute bottom-3 right-3">
                        <span className="bg-emerald-500 text-white text-xs px-2.5 sm:px-3 py-1 rounded-lg font-semibold">
                          Free
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="p-4 sm:p-5">
                    <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-3 group-hover:text-cyan-500 transition line-clamp-2">
                      {webinar.title}
                    </h3>
                    
                    <div className="space-y-2 text-xs sm:text-sm text-gray-600 mb-4">
                      <div className="flex items-center gap-2">
                        <Calendar size={14} />
                        <span>{formatEventDate(webinar)}</span>
                        {eventTime && (
                          <>
                            <Clock size={14} />
                            <span>{eventTime}</span>
                          </>
                        )}
                      </div>
                      {webinar.platform && (
                        <div className="flex items-center gap-2">
                          <MapPin size={14} />
                          <span>{webinar.platform}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-cyan-500 text-xs sm:text-sm">
                        📍 {webinar.platform || 'Online'}
                      </span>
                      {webinar.platformLink && (
                        <a 
                          href={webinar.platformLink}
                          onClick={(e) => e.stopPropagation()}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-cyan-500 font-semibold text-xs sm:text-sm hover:underline"
                        >
                          Join →
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No upcoming webinars available with current filters.</p>
            <p className="text-gray-400 text-sm mt-2">Try adjusting your filters or check back later for new virtual events!</p>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}