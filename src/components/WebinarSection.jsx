import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Clock, Video, ArrowRight } from 'lucide-react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { filterUpcomingEvents } from '../utils/eventFilters';

const WebinarSection = () => {
  const [webinars, setWebinars] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWebinars();
  }, []);

  const loadWebinars = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'events'));
      const allEvents = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Filter: eventType === 'webinar', published
      let webinarEvents = allEvents.filter(e => e.eventType === 'webinar' && e.status === 'published');
      
      // ✅ FILTER OUT PAST EVENTS
      webinarEvents = filterUpcomingEvents(webinarEvents);
      
      // Max 8
      webinarEvents = webinarEvents.slice(0, 8);

      // Format for display
      const formatted = webinarEvents.map(event => ({
        id: event.id,
        title: event.title,
        image: event.imageUrl || 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=400&h=300&fit=crop',
        type: event.platform ? 'Live' : 'Online',
        typeIcon: event.platform ? 'video' : 'dot',
        date: event.date?.toDate ? event.date.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'TBD',
        time: event.time || 'TBD',
        platform: event.platform || 'Online'
      }));

      setWebinars(formatted);
    } catch (err) {
      console.error('Error loading webinars:', err);
    }
    setLoading(false);
  };

  return (
    <section className="bg-gray-300 py-16 md:py-24 px-4 md:px-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-start mb-12">
          <div>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-3">
              Webinar & Virtual Events
            </h2>
            <p className="text-gray-500 text-base md:text-lg">
              Connect from anywhere with industry experts & communities.
            </p>
          </div>
          <Link 
            to="/webinar-events"
            className="hidden md:flex items-center gap-2 text-cyan-500 font-medium hover:text-cyan-600 transition-colors group"
          >
            View All Webinars
            <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {/* Loading */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-cyan-500"></div>
          </div>
        ) : (
          <>
            {/* Webinars Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {webinars.map((webinar) => (
                <div
                  key={webinar.id}
                  className="bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 group"
                >
                  {/* Image */}
                  <div className="relative h-48 overflow-hidden">
                    <img 
                      src={webinar.image} 
                      alt={webinar.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                    {/* Type Badge */}
                    <div className="absolute top-3 left-3">
                      <div className="flex items-center gap-2 bg-white px-3 py-1 rounded-full">
                        {webinar.typeIcon === 'video' ? (
                          <Video className="text-cyan-500" size={14} />
                        ) : (
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        )}
                        <span className="text-cyan-500 text-xs font-semibold">
                          {webinar.type}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-5">
                    <h3 className="font-bold text-gray-900 text-lg mb-4 line-clamp-2">
                      {webinar.title}
                    </h3>

                    {/* Date & Time */}
                    <div className="flex items-center gap-4 mb-4 text-gray-600 text-sm">
                      <div className="flex items-center gap-1">
                        <Calendar size={16} />
                        <span>{webinar.date}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock size={16} />
                        <span>{webinar.time}</span>
                      </div>
                    </div>

                    {/* Join Button */}
                    <button className="w-full bg-cyan-50 text-cyan-500 py-3 rounded-xl font-medium hover:bg-cyan-100 transition-colors">
                      Join
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Empty State */}
            {webinars.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500">No upcoming webinars available.</p>
              </div>
            )}
          </>
        )}

        {/* Mobile View All Link */}
        <div className="text-center md:hidden">
          <Link 
            to="/webinar-events"
            className="inline-flex items-center gap-2 text-cyan-500 font-medium hover:text-cyan-600 transition-colors group"
          >
            View All Webinars
            <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>
    </section>
  );
};

export default WebinarSection;