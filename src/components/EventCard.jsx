import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Clock, MapPin, Heart } from 'lucide-react';

export default function EventCard({ event }) {
  const formatDate = (timestamp) => {
    if (!timestamp) return 'TBD';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  return (
    <Link to={`/event/${event.id}`}>
      <div className="event-card group bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300">

        {/* Event Image */}
        <div className="relative overflow-hidden">
          <img
            src={event.imageUrl || '/assets/placeholder-event.jpg'}
            alt={event.title}
            className="w-full h-36 sm:h-52 object-cover group-hover:scale-105 transition-transform duration-300"
          />

          {/* Category Badge - top left */}
          {event.category && (
            <div className="absolute top-3 left-3">
              <span className="bg-cyan-500 text-white text-xs px-3 py-1 rounded-full font-semibold">
                #{event.category}
              </span>
            </div>
          )}

          {/* Favorite Button - top right */}
          <button
            onClick={(e) => { e.preventDefault(); }}
            className="absolute top-3 right-3 bg-white rounded-full p-1.5 shadow hover:scale-110 transition-transform"
          >
            <Heart size={16} className="text-gray-400 hover:text-red-500 transition-colors" />
          </button>

          {/* Price Badge - bottom right of image */}
          <div className="absolute bottom-3 right-3">
            <span className={`${event.isFree ? 'bg-emerald-500' : 'bg-blue-500'} text-white text-xs px-3 py-1 rounded-full font-semibold`}>
              {event.isFree ? 'Free' : 'Paid'}
            </span>
          </div>
        </div>

        {/* Event Details */}
        <div className="p-3 sm:p-4">
          <h3 className="text-sm sm:text-base font-bold text-gray-900 mb-2 line-clamp-2 group-hover:text-cyan-500 transition">
            {event.title}
          </h3>

          <div className="space-y-1.5 text-xs sm:text-sm text-gray-500">
            <div className="flex items-center gap-1.5">
              <Calendar size={13} className="text-gray-400 shrink-0" />
              <span className="truncate">{formatDate(event.date)}</span>
            </div>

            <div className="flex items-center gap-1.5">
              <Clock size={13} className="text-gray-400 shrink-0" />
              <span>{event.time || 'TBD'}</span>
            </div>

            <div className="flex items-center gap-1.5">
              <MapPin size={13} className="text-gray-400 shrink-0" />
              <span className="line-clamp-1">
                {event.location && event.city
                  ? `${event.location}, ${event.city}`
                  : event.location || event.city || 'Location TBA'}
              </span>
            </div>
          </div>
        </div>

      </div>
    </Link>
  );
}