import SEO from '../components/SEO'
import React, { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import EventCard from '../components/EventCard';
import { Filter } from 'lucide-react';

export default function EventsPage() {
  const [allEvents, setAllEvents] = useState([]);
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    category: 'all',
    city: 'all',
    date: 'all',
    price: 'any',
    eventType: 'all'
  });

  const categories = [
    'All',
    'Business & Tech',
    'Art & Culture',
    'Food & Dining',
    'Sport & Fitness',
    'Education',
    'Religion & Community',
    'Nightlife & Parties',
    'Family & Kids Fun',
    'Networking & Social',
    'Gaming & Esport',
    'Music & Concerts',
    'Cinema & Show'
  ];

  const cities = ['All', 'Lagos', 'Abuja', 'Riyadh', 'Jeddah'];
  
  const eventTypes = ['All', 'Regular', 'Campus', 'Webinar'];

  useEffect(() => {
    fetchEvents();
  }, []);

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

      // Filter only published events
      const publishedEvents = eventsData.filter(e => e.status === 'published');
      
      // Sort by date (newest first)
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

    // Filter by category
    if (filters.category !== 'all') {
      filtered = filtered.filter(e => e.category === filters.category);
    }

    // Filter by city/location
    if (filters.city !== 'all') {
      filtered = filtered.filter(e => 
        e.location?.toLowerCase().includes(filters.city.toLowerCase()) ||
        e.city?.toLowerCase().includes(filters.city.toLowerCase())
      );
    }

    // Filter by event type
    if (filters.eventType !== 'all') {
      filtered = filtered.filter(e => e.eventType === filters.eventType.toLowerCase());
    }

    // Filter by price
    if (filters.price === 'free') {
      filtered = filtered.filter(e => e.isFree === true);
    } else if (filters.price === 'paid') {
      filtered = filtered.filter(e => e.isFree === false);
    }

    // Filter by date
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
      eventType: 'all'
    });
  };

  return (
   <>
    <SEO 
      title="Browse All Events - OutingStation"
      description="Discover upcoming concerts, webinars, campus events, and activities across Nigeria. Filter by category, location, and price."
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
            {/* Category Filter */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              <select
                value={filters.category}
                onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-transparent outline-none text-sm"
              >
                {categories.map(cat => (
                  <option key={cat} value={cat === 'All' ? 'all' : cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* City Filter */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                City
              </label>
              <select
                value={filters.city}
                onChange={(e) => setFilters({ ...filters, city: e.target.value })}
                className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-transparent outline-none text-sm"
              >
                {cities.map(city => (
                  <option key={city} value={city === 'All' ? 'all' : city.toLowerCase()}>
                    {city}
                  </option>
                ))}
              </select>
            </div>

            {/* Event Type Filter */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                Event Type
              </label>
              <select
                value={filters.eventType}
                onChange={(e) => setFilters({ ...filters, eventType: e.target.value })}
                className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-transparent outline-none text-sm"
              >
                {eventTypes.map(type => (
                  <option key={type} value={type === 'All' ? 'all' : type.toLowerCase()}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            {/* Date Filter */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                Date
              </label>
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

            {/* Price Filter */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                Price
              </label>
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

          {/* Clear Filters Button */}
          {(filters.category !== 'all' || filters.city !== 'all' || filters.date !== 'all' || filters.price !== 'any' || filters.eventType !== 'all') && (
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
          <div className="text-center py-20">
            <div className="inline-block animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-cyan-500"></div>
            <p className="mt-4 text-sm sm:text-base text-gray-600">Loading events...</p>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="text-center py-12 sm:py-20">
            <p className="text-lg sm:text-xl text-gray-600 mb-4">No events found with the selected filters.</p>
            <button
              onClick={clearFilters}
              className="text-sm sm:text-base text-cyan-500 hover:text-cyan-600 font-medium hover:underline"
            >
              Clear all filters
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 lg:gap-6">
              {filteredEvents.map(event => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>

            {/* Results Summary */}
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