import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Clock, Video, ArrowRight } from 'lucide-react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { filterUpcomingEvents } from '../utils/eventFilters';

const SkeletonWebinarCard = () => (
  <div className="bg-white rounded-2xl overflow-hidden shadow-md animate-pulse">
    <div className="w-full h-48 bg-gray-200" />
    <div className="p-5 space-y-3">
      <div className="h-4 bg-gray-200 rounded-full w-3/4" />
      <div className="h-4 bg-gray-200 rounded-full w-1/2" />
      <div className="flex gap-4">
        <div className="h-3 bg-gray-200 rounded-full w-1/3" />
        <div className="h-3 bg-gray-200 rounded-full w-1/3" />
      </div>
      <div className="h-10 bg-gray-200 rounded-xl w-full" />
    </div>
  </div>
);

const EmptyWebinarState = () => (
  <div className="flex flex-col items-center justify-center py-20 px-4">
    <div className="w-20 h-20 bg-cyan-50 rounded-full flex items-center justify-center mb-6">
      <Video size={36} className="text-cyan-400" />
    </div>
    <h3 className="text-xl font-bold text-gray-900 mb-2">No Upcoming Webinars</h3>
    <p className="text-gray-500 text-center max-w-sm mb-8">
      We're adding new virtual events soon. Check back or browse all events in the meantime.
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

const WebinarSection = () => {
  const [webinars, setWebinars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [headerVisible, setHeaderVisible] = useState(false);
  const [visibleCards, setVisibleCards] = useState([]);

  const headerRef = useRef(null);
  const cardRefs = useRef([]);

  // Header observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setHeaderVisible(true);
        } else {
          setHeaderVisible(false);
        }
      },
      { threshold: 0.3 }
    );
    if (headerRef.current) observer.observe(headerRef.current);
    return () => observer.disconnect();
  }, []);

  // Cards observer
  useEffect(() => {
    if (webinars.length === 0) return;
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
            }, i * 80);
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
  }, [webinars]);

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

      let webinarEvents = allEvents.filter(e => e.eventType === 'webinar' && e.status === 'published');
      webinarEvents = filterUpcomingEvents(webinarEvents);
      webinarEvents = webinarEvents.slice(0, 8);

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
        <div
          ref={headerRef}
          className={'flex justify-between items-start mb-12 transition-all duration-700 ' + (headerVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6')}
        >
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

        {/* Loading — Skeleton */}
        {loading && (
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[...Array(8)].map((_, i) => (
              <SkeletonWebinarCard key={i} />
            ))}
          </div>
        )}

        {/* Loaded */}
        {!loading && (
          <>
            {webinars.length > 0 ? (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                  {webinars.map((webinar, i) => (
                    <div
                      key={webinar.id}
                      ref={el => cardRefs.current[i] = el}
                      className={'transition-all duration-500 ' + (visibleCards.includes(i) ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-8')}
                    >
                      <div className="bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 group">
                        <div className="relative h-48 overflow-hidden">
                          <img
                            src={webinar.image}
                            alt={webinar.title}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                          />
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
                        <div className="p-5">
                          <h3 className="font-bold text-gray-900 text-lg mb-4 line-clamp-2">
                            {webinar.title}
                          </h3>
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
                          <button className="w-full bg-cyan-50 text-cyan-500 py-3 rounded-xl font-medium hover:bg-cyan-100 transition-colors">
                            Join
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <EmptyWebinarState />
            )}
          </>
        )}

        {/* Mobile View All Link */}
        <div className="text-center md:hidden mt-6">
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