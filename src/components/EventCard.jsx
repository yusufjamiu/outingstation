import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Clock, MapPin, Tag } from 'lucide-react';

export default function EventCard({ event }) {
  const formatDate = (timestamp) => {
    if (!timestamp) return 'TBD';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <Link to={`/event/${event.id}`}>
      <div className="event-card group">
        {/* Event Image */}
        <div className="relative h-48 overflow-hidden">
          <img
            src={event.imageUrl || '/assets/placeholder-event.jpg'}
            alt={event.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          
          {/* Category Badge */}
          <div className="absolute top-3 left-3">
            <span className="bg-primary/90 text-white text-xs px-3 py-1 rounded-full">
              #{event.category}
            </span>
          </div>

          {/* Price Badge */}
          <div className="absolute top-3 right-3">
            <span className={`${event.isFree ? 'bg-green-500' : 'bg-blue-500'} text-white text-xs px-3 py-1 rounded-full font-semibold`}>
              {event.isFree ? 'Free' : 'Paid'}
            </span>
          </div>
        </div>

        {/* Event Details */}
        <div className="p-5">
          <h3 className="text-xl font-bold text-gray-900 mb-3 line-clamp-2 group-hover:text-primary transition">
            {event.title}
          </h3>

          <div className="space-y-2 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-gray-400" />
              <span>{formatDate(event.date)}</span>
              <Clock size={16} className="text-gray-400 ml-2" />
              <span>{event.time}</span>
            </div>

            <div className="flex items-center gap-2">
              <MapPin size={16} className="text-gray-400" />
              <span className="line-clamp-1">{event.location}, {event.city}</span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}