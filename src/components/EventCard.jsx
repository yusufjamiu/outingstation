import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Calendar, Clock, MapPin, Heart } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { doc, updateDoc, arrayUnion, arrayRemove, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { formatEventDate, formatEventTime } from '../utils/dateTimeHelpers';

export default function EventCard({ event }) {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    checkIfSaved();
  }, [currentUser, event.id]);

  const checkIfSaved = async () => {
    if (!currentUser) {
      setIsSaved(false);
      return;
    }

    try {
      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      if (userDoc.exists()) {
        const savedEvents = userDoc.data().savedEvents || [];
        setIsSaved(savedEvents.includes(event.id));
      }
    } catch (err) {
      console.error('Error checking saved status:', err);
    }
  };

  const handleSaveClick = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!currentUser) {
      const shouldLogin = window.confirm('Please login to save events. Would you like to login now?');
      if (shouldLogin) {
        navigate('/login');
      }
      return;
    }

    if (isSaving) return;

    try {
      setIsSaving(true);
      const userRef = doc(db, 'users', currentUser.uid);

      if (isSaved) {
        await updateDoc(userRef, {
          savedEvents: arrayRemove(event.id)
        });
        setIsSaved(false);
      } else {
        await updateDoc(userRef, {
          savedEvents: arrayUnion(event.id)
        });
        setIsSaved(true);
      }
    } catch (err) {
      console.error('Error saving event:', err);
      alert('Failed to save event. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const isPlace = event.subCategory === 'places';
  const eventTime = formatEventTime(event);

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
            onClick={handleSaveClick}
            disabled={isSaving}
            className="absolute top-3 right-3 bg-white rounded-full p-2 shadow hover:scale-110 transition-transform disabled:opacity-50"
          >
            {isSaving ? (
              <div className="w-4 h-4 border-2 border-gray-300 border-t-cyan-500 rounded-full animate-spin"></div>
            ) : (
              <Heart 
                size={16} 
                className={`transition-colors ${
                  isSaved 
                    ? 'text-red-500 fill-red-500' 
                    : 'text-gray-400 hover:text-red-500'
                }`}
              />
            )}
          </button>

          {/* Place Badge - bottom left */}
          {isPlace && (
            <div className="absolute bottom-3 left-3">
              <span className="bg-orange-500 text-white text-xs px-3 py-1 rounded-full font-semibold">
                📍 Place
              </span>
            </div>
          )}

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
              <span className="truncate">{formatEventDate(event)}</span>
            </div>

            {eventTime && (
              <div className="flex items-center gap-1.5">
                <Clock size={13} className="text-gray-400 shrink-0" />
                <span>{eventTime}</span>
              </div>
            )}

            <div className="flex items-center gap-1.5">
              <MapPin size={13} className="text-gray-400 shrink-0" />
              <span className="line-clamp-1">
                {event.address || event.location || 'Location TBA'}
              </span>
            </div>
          </div>
        </div>

      </div>
    </Link>
  );
}