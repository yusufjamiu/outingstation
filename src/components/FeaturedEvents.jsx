import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Calendar } from 'lucide-react';
import EventCard from './EventCard';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { filterUpcomingEvents } from '../utils/eventFilters';

// Skeleton Card
const SkeletonCard = () => (
  <div className="bg-white rounded-2xl overflow-hidden shadow-sm animate-pulse">
    <div className="w-full h-40 bg-gray-200" />
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

// Empty State
const EmptyState = () => (
  <div className="flex flex-col items-center justify-center py-20 px-4">
    <div className="w-20 h-20 bg-cyan-50 rounded-full flex items-center justify-center mb-6">
      <Calendar size={36} className="text-cyan-400" />
    </div>
    <h3 className="text-xl font-bold text-gray-900 mb-2">No Featured Events Yet</h3>
    <p className="text-gray-500 text-center max-w-sm mb-8">
      We're busy curating the best events for you. Check back soon or explore all available events now.
    </p>
    <Link
      to="/events"
      className="inline-flex items-center gap-2 bg-gradient-to-r from-cyan-400 to-cyan-500 text-white px-8 py-4 rounded-full font-medium shadow-lg hover:shadow-xl transition-all group"
    >
      Browse All Events
      <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
    </Link>
  </div>
);

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
        date: doc.data().date?.toDate ? doc.data().date.toDate() : new Date(doc.data().date)
      }));

      let featured = allEvents.filter(e => e.status === 'published' && (e.isTrending || e.isFeatured));
      featured = filterUpcomingEvents(featured);
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

        {/* Loading — Skeleton */}
        {loading && (
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {[...Array(8)].map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        )}

        {/* Loaded — Events or Empty */}
        {!loading && (
          <>
            {events.length > 0 ? (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                  {events.map((event) => (
                    <EventCard key={event.id} event={event} />
                  ))}
                </div>
                <div className="text-center">
                  <Link
                    to="/events"
                    className="inline-flex items-center gap-2 bg-white text-gray-700 px-8 py-4 rounded-full font-medium shadow-lg hover:shadow-xl transition-all group"
                  >
                    View More Events
                    <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>
              </>
            ) : (
              <EmptyState />
            )}
          </>
        )}

      </div>
    </section>
  );
};

export default FeaturedEvents;