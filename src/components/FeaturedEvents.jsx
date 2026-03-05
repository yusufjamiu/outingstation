import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import EventCard from './EventCard';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { filterUpcomingEvents } from '../utils/eventFilters';

const FeaturedEvents = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFeaturedEvents();
  }, []);

  const loadFeaturedEvents = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'events'));
      const allEvents = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        // Convert Firestore Timestamp to Date for EventCard
        date: doc.data().date?.toDate ? doc.data().date.toDate() : new Date(doc.data().date)
      }));

      // Filter: published, trending OR featured
      let featured = allEvents.filter(e => e.status === 'published' && (e.isTrending || e.isFeatured));
      
      // ✅ FILTER OUT PAST EVENTS
      featured = filterUpcomingEvents(featured);
      
      // Max 8 events
      featured = featured.slice(0, 8);

      setEvents(featured);
    } catch (err) {
      console.error('Error loading events:', err);
    }
    setLoading(false);
  };

  return (
    <section className="bg-gradient-to-br from-gray-100 to-gray-50 py-16 md:py-24 px-4 md:px-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-3">
            Featured & Trending Events
          </h2>
          <p className="text-gray-500 text-base md:text-lg">
            Discover what's happening around you this week
          </p>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-cyan-500"></div>
          </div>
        ) : (
          <>
            {/* Events Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
              {events.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>

            {/* Empty State */}
            {events.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500">No featured events available yet.</p>
              </div>
            )}
          </>
        )}

        {/* View More Button */}
        <div className="text-center">
          <Link 
            to="/events"
            className="inline-flex items-center gap-2 bg-white text-gray-700 px-8 py-4 rounded-full font-medium shadow-lg hover:shadow-xl transition-all group"
          >
            View More Events
            <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>
    </section>
  );
};

export default FeaturedEvents;