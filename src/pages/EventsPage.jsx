import SEO from '../components/SEO'
import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import EventCard from '../components/EventCard';
import { Filter, SearchX } from 'lucide-react';
import { filterUpcomingEvents } from '../utils/eventFilters';

const SkeletonCard = () => (
  <div className="bg-white rounded-2xl overflow-hidden shadow-sm animate-pulse">
    <div className="w-full h-48 bg-gray-200" />
    <div className="p-4 space-y-3">
      <div className="h-3 bg-gray-200 rounded-full w-1/3" />
      <div className="h-4 bg-gray-200 rounded-full w-3/4" />
      <div className="h-3 bg-gray-200 rounded-full w-1/2" />
      <div className="flex justify-between items-center pt-2">
        <div className="h-3 bg-gray-200 rounded-full w-1/4" />
        <div className="h-8 bg-gray-200 rounded-full w-1/4" />
      </div>
    </div>
  </div>
);

const EmptyState = ({ onClear, hasFilters }) => (
  <div className="flex flex-col items-center justify-center py-20 px-4">
    <div className="w-20 h-20 bg-cyan-50 rounded-full flex items-center justify-center mb-6">
      <SearchX size={36} className="text-cyan-400" />
    </div>
    <h3 className="text-xl font-bold text-gray-900 mb-2">No Events Found</h3>
    <p className="text-gray-500 text-center max-w-sm mb-8">
      {hasFilters
        ? "No events match your current filters. Try adjusting or clearing them to see more events."
        : "No events are available right now. Check back soon!"}
    </p>
    {hasFilters && (
      <button
        onClick={onClear}
        className="inline-flex items-center gap-2 bg-gradient-to-r from-cyan-400 to-cyan-500 text-white px-8 py-4 rounded-full font-medium shadow-lg hover:shadow-xl transition-all"
      >
        Clear All Filters
      </button>
    )}
  </div>
);

export default function EventsPage() {
  const [searchParams] = useSearchParams();
  const [allEvents, setAllEvents] = useState([]);
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [visibleCards, setVisibleCards] = useState([]);
  const [filters, setFilters] = useState({
    category: 'all',
    city: 'all',
    date: 'all',
    price: 'any',
    eventType: 'all',
    search: ''
  });

  const cardRefs = useRef([]);

  const categories = [
    'All', 'Business & Tech', 'Art & Culture', 'Food & Dining',
    'Sport & Fitness', 'Education', 'Religion & Community',
    'Nightlife & Parties', 'Family & Kids Fun', 'Networking & Social',
    'Gaming & Esport', 'Music & Concerts', 'Cinema & Show'
  ];

  const cities = ['All', 'Lagos', 'Abuja'];
  const eventTypes = ['All', 'Regular', 'Campus', 'Webinar'];

  const hasActiveFilters = filters.category !== 'all' || filters.city !== 'all' ||
    filters.date !== 'all' || filters.price !== 'any' ||
    filters.eventType !== 'all' || filters.search !== '';

  // Cards observer
  useEffect(() => {
    if (filteredEvents.length === 0) return;
    setVisibleCards([]);
    const timeout = setTimeout(() => {
      const observers = cardRefs.current.map((el, i) => {
        if (!el) return null;
        const obs = new IntersectionObserver(
          ([entry]) => {
            if (entry.isIntersecting) {
              setTimeout(() => {
                setVisibleCards(prev => {
                  if (prev.includes(i)) return prev;
                  return [...prev, i];
                });
              }, i * 60);
            } else {
              setVisibleCards(prev => prev.filter(v => v !== i));
            }
          },
          { threshold: 0.1 }
        );
        obs.observe(el);
        return obs;
      });
      return () => observers.forEach(o => o && o.disconnect());
    }, 100);
    return () => clearTimeout(timeout);
  }, [filteredEvents]);

  useEffect(() => {
    fetchEvents();
  }, []);

  useEffect(() => {
    const urlSearch = searchParams.get('search') || '';
    const urlCity = searchParams.get('city') || 'all';
    setFilters(prev => ({
      ...prev,
      search: urlSearch,
      city: urlCity.toLowerCase()
    }));
  }, [searchParams]);

  useEffect(() => {
    applyFilters();
  }, [filters, allEvents]);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const snapshot = await getDocs(collection(db, 'events'));
      const eventsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      let publishedEvents = eventsData.filter(e => e.status === 'published');
      publishedEvents = filterUpcomingEvents(publishedEvents);
      publishedEvents.sort((a, b) => {
        const dateA = a.date?.toDate ? a.date.toDate() : new Date(0);
        const dateB = b.date?.toDate ? b.date.toDate() : new Date(0);
        return dateB - dateA;
      });

      setAllEvents(publishedEvents);
      setFilteredEvents(publishedEvents);
    } catch (error) {
      console.error('Error fetching events:', error);
    }
    setLoading(false);
  };

  const applyFilters = () => {
    let filtered = [...allEvents];

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(e =>
        e.title?.toLowerCase().includes(searchLower) ||
        e.description?.toLowerCase().includes(searchLower) ||
        e.location?.toLowerCase().includes(searchLower) ||
        e.address?.toLowerCase().includes(searchLower)
      );
    }

    if (filters.category !== 'all') {
      filtered = filtered.filter(e => e.category === filters.category);
    }

    if (filters.city !== 'all') {
      filtered = filtered.filter(e =>
        e.location?.toLowerCase().includes(filters.city.toLowerCase()) ||
        e.city?.toLowerCase().includes(filters.city.toLowerCase())
      );
    }

    if (filters.eventType !== 'all') {
      filtered = filtered.filter(e => e.eventType === filters.eventType.toLowerCase());
    }

    if (filters.price === 'free') {
      filtered = filtered.filter(e => e.isFree === true);
    } else if (filters.price === 'paid') {
      filtered = filtered.filter(e => e.isFree === false);
    }

    if (filters.date !== 'all') {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const weekEnd = new Date(today);
      weekEnd.setDate(weekEnd.getDate() + 7);

      filtered = filtered.filter(e => {
        if (!e.date) return false;
        const eventDate = e.date.toDate ? e.date.toDate() : new Date(e.date);
        switch (filters.date) {
          case 'today':
            return eventDate >= today && eventDate < tomorrow;
          case 'tomorrow':
            return eventDate >= tomorrow && eventDate < new Date(tomorrow.getTime() + 24 * 60 * 60 * 1000);
          case 'this-week':
            return eventDate >= today && eventDate < weekEnd;
          case 'this-weekend':
            const dayOfWeek = today.getDay();
            const saturday = new Date(today);
            saturday.setDate(saturday.getDate() + (6 - dayOfWeek));
            const monday = new Date(saturday);
            monday.setDate(monday.getDate() + 2);
            return eventDate >= saturday && eventDate < monday;
          default:
            return true;
        }
      });
    }

    setFilteredEvents(filtered);
  };

  const clearFilters = () => {
    setFilters({
      category: 'all',
      city: 'all',
      date: 'all',
      price: 'any',
      eventType: 'all',
      search: ''
    });
  };

  return (
    <>
      <SEO
        title="Browse All Events - OutingStation"
        description="Discover upcoming concerts, webinars, campus events, and activities across Nigeria."
        url="https://outingstation.com/events"
        keywords="events Nigeria, Lagos events, Abuja events, upcoming events, concerts Nigeria, webinars, campus activities"
      />

      <div className="min-h-screen bg-gray-50">
        <Navbar />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">

          {/* Page Header */}
          <div className="mb-6 sm:mb-8">
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">Browse All Events</h1>
            <p className="text-sm sm:text-base text-gray-600">Discover amazing events happening around you</p>
            {filters.search && (
              <p className="text-sm text-cyan-600 mt-2">
                Searching for: "{filters.search}"
              </p>
            )}
          </div>

          {/* List Your Event Banner */}
          <div className="bg-gradient-to-r from-cyan-500 to-cyan-600 rounded-2xl p-6 mb-6 sm:mb-8 shadow-lg hover:shadow-xl transition">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-white text-center sm:text-left">
                <h3 className="text-xl sm:text-2xl font-bold mb-1">
                  Got an event or place? List it here!
                </h3>
                <p className="text-cyan-100 text-sm sm:text-base">
                  Free listing • Reach thousands • 24-hour approval
                </p>
              </div>
              <Link
                to="/submit-event"
                className="bg-white text-cyan-600 px-6 py-3 rounded-xl font-bold hover:bg-gray-100 transition shadow-lg whitespace-nowrap flex items-center gap-2"
              >
                <span className="text-xl">📝</span>
                <span>List Your Event</span>
              </Link>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 mb-6 sm:mb-8">
            <div className="flex items-center gap-2 mb-4 sm:mb-6">
              <Filter size={20} className="text-gray-600" />
              <h2 className="text-base sm:text-lg font-semibold text-gray-900">Filters</h2>
              <span className="ml-auto text-xs sm:text-sm text-gray-500">
                {filteredEvents.length} event{filteredEvents.length !== 1 ? 's' : ''} found
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">Category</label>
                <select
                  value={filters.category}
                  onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                  className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-transparent outline-none text-sm"
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat === 'All' ? 'all' : cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">City</label>
                <select
                  value={filters.city}
                  onChange={(e) => setFilters({ ...filters, city: e.target.value })}
                  className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-transparent outline-none text-sm"
                >
                  {cities.map(city => (
                    <option key={city} value={city === 'All' ? 'all' : city.toLowerCase()}>{city}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">Event Type</label>
                <select
                  value={filters.eventType}
                  onChange={(e) => setFilters({ ...filters, eventType: e.target.value })}
                  className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-transparent outline-none text-sm"
                >
                  {eventTypes.map(type => (
                    <option key={type} value={type === 'All' ? 'all' : type.toLowerCase()}>{type}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">Date</label>
                <select
                  value={filters.date}
                  onChange={(e) => setFilters({ ...filters, date: e.target.value })}
                  className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-transparent outline-none text-sm"
                >
                  <option value="all">All Dates</option>
                  <option value="today">Today</option>
                  <option value="tomorrow">Tomorrow</option>
                  <option value="this-week">This Week</option>
                  <option value="this-weekend">This Weekend</option>
                </select>
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">Price</label>
                <select
                  value={filters.price}
                  onChange={(e) => setFilters({ ...filters, price: e.target.value })}
                  className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-transparent outline-none text-sm"
                >
                  <option value="any">Any Price</option>
                  <option value="free">Free</option>
                  <option value="paid">Paid</option>
                </select>
              </div>
            </div>

            {hasActiveFilters && (
              <div className="mt-4 flex justify-end">
                <button
                  onClick={clearFilters}
                  className="text-xs sm:text-sm text-cyan-500 hover:text-cyan-600 font-medium"
                >
                  Clear all filters
                </button>
              </div>
            )}
          </div>

          {/* Events Grid */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 lg:gap-6">
              {[...Array(6)].map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : filteredEvents.length === 0 ? (
            <EmptyState onClear={clearFilters} hasFilters={hasActiveFilters} />
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 lg:gap-6">
                {filteredEvents.map((event, i) => (
                  <div
                    key={event.id}
                    ref={el => cardRefs.current[i] = el}
                    className={'transition-all duration-500 ' + (visibleCards.includes(i) ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-8')}
                  >
                    <EventCard event={event} />
                  </div>
                ))}
              </div>
              <div className="mt-8 text-center text-sm text-gray-500">
                Showing {filteredEvents.length} of {allEvents.length} total events
              </div>
            </>
          )}

        </div>

        <Footer />
      </div>
    </>
  );
}