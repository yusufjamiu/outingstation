import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Search, Bell, X, Calendar, MapPin, Share2, Heart, ChevronRight, Phone, Mail, User, ExternalLink, Ticket } from 'lucide-react';

export default function EventDetails() {
  const navigate = useNavigate();
  const { id } = useParams();

  const user = null; // guest for now (replace with Firebase Auth later)

  const [event, setEvent] = useState(null);
  const [isSaved, setIsSaved] = useState(false);

  // Simulate fetching event by ID
  useEffect(() => {
    const mockEvent = {
      id,
      title: 'Tech Meet Up 2026: A Mega Circle of Genius Techies',
      image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&q=80',
      
      // Multiple categories
      categories: ['Business & Tech', 'Networking & Social', 'Education'],
      
      // Event type
      eventType: 'regular', // regular, campus, webinar
      subCategory: 'events', // events or places
      
      // Event Duration - can be single, multi, or recurring
      eventDuration: 'single', // or 'multi' or 'recurring'
      
      // Single day event
      date: 'Sat, Feb 12, 2026',
      time: '2:00 PM - 5:00 PM',
      
      // Multi-day event (if eventDuration is 'multi')
      // startDate: 'Mon, Feb 15, 2026',
      // endDate: 'Wed, Feb 17, 2026',
      // dailyTime: '10:00 AM - 8:00 PM',
      
      // Recurring event (if eventDuration is 'recurring')
      // recurringPattern: 'Every Monday',
      // recurringTime: '6:00 PM',
      
      // Location
      venue: 'TIMX Tech Hub Hall',
      address: '0001 Main Street, Ikeja, Lagos, Nigeria',
      city: 'Lagos, Nigeria',
      mapLocation: 'https://maps.google.com/?q=6.4549,3.3841', // Google Maps link
      mapPreview: 'https://images.unsplash.com/photo-1524661135-423995f22d0b?w=400&q=80',
      
      // Organizer info
      organizer: {
        name: 'Mars Techies Space',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=MarsTechiess',
        phone: '+234 800 123 4567',
        email: 'info@marstechies.com'
      },
      
      // Pricing
      isFree: true,
      price: 0,
      capacity: 200,
      
      // Description
      description: `Join us for an immersive evening dedicated to the pulse of modern technology and the people building it. In an industry that moves at breakneck speed, it's easy to get lost in documentation; this event is designed to pull us away from our screens and into a space of collaborative learning and genuine connection.`,
      
      highlights: [
        {
          title: 'Expert Insight:',
          description: 'A featured session led by industry veterans who have scaled systems to millions of users.'
        },
        {
          title: 'Interactive Demo:',
          description: 'A live technical walkthrough of modern tools and frameworks.'
        },
        {
          title: 'Community Lightning Talks:',
          description: 'Short talks from developers sharing real-world experiences.'
        }
      ],
      
      // For webinars
      platform: null, // 'Zoom', 'Google Meet', etc.
      platformLink: null,
      
      // For campus events
      university: null
    };

    setEvent(mockEvent);
  }, [id]);

  if (!event) return null;

  const handleSave = () => {
    if (!user) {
      alert('Login or enter your phone number to save this event.');
      return;
    }
    setIsSaved(!isSaved);
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: event.title,
        text: `Check out this event: ${event.title}`,
        url: window.location.href,
      });
    }
  };

  // Format date display based on event duration
  const getDateDisplay = () => {
    if (event.eventDuration === 'single') {
      return event.date;
    } else if (event.eventDuration === 'multi') {
      return `${event.startDate} - ${event.endDate}`;
    } else if (event.eventDuration === 'recurring') {
      return event.recurringPattern;
    }
  };

  // Format time display
  const getTimeDisplay = () => {
    if (event.eventDuration === 'single') {
      return event.time;
    } else if (event.eventDuration === 'multi') {
      return `Daily: ${event.dailyTime}`;
    } else if (event.eventDuration === 'recurring') {
      return event.recurringTime;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 py-4 sticky top-0 z-30">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex-1 max-w-xl">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search location, event & more"
                className="w-full pl-10 pr-4 py-2.5 bg-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400 text-sm"
              />
            </div>
          </div>

          <div className="flex items-center gap-4 ml-6">
            <button className="p-2 hover:bg-gray-100 rounded-full relative">
              <Bell size={20} className="text-gray-600" />
            </button>
            <div className="w-10 h-10 rounded-full bg-gray-200" />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Event Image */}
            <div className="relative rounded-2xl overflow-hidden h-80">
              <img src={event.image} alt={event.title} className="w-full h-full object-cover" />
              
              {/* Multiple Category Badges */}
              <div className="absolute top-4 right-4 flex flex-wrap gap-2 justify-end max-w-md">
                {event.categories.map((category, index) => (
                  <span 
                    key={index}
                    className="px-3 py-1.5 bg-white/90 backdrop-blur rounded-full text-xs font-semibold text-cyan-500"
                  >
                    #{category}
                  </span>
                ))}
              </div>
              
              {/* Event Type Badge */}
              {event.eventType === 'webinar' && (
                <span className="absolute top-4 left-4 px-3 py-1.5 bg-blue-500 text-white rounded-full text-xs font-semibold">
                  Virtual Event
                </span>
              )}
              {event.eventType === 'campus' && (
                <span className="absolute top-4 left-4 px-3 py-1.5 bg-purple-500 text-white rounded-full text-xs font-semibold">
                  Campus Event
                </span>
              )}
            </div>

            {/* Event Title & Organizer */}
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-4">{event.title}</h1>

              <div className="flex items-center gap-3">
                <img src={event.organizer.avatar} alt="" className="w-12 h-12 rounded-full" />
                <div>
                  <p className="text-xs text-gray-500 uppercase">Organized By</p>
                  <p className="font-semibold">{event.organizer.name}</p>
                </div>
              </div>
            </div>

            {/* About Event */}
            <div className="bg-white rounded-2xl p-6 border">
              <h2 className="text-2xl font-bold mb-4">About This Event</h2>
              <p className="text-gray-600 mb-6 whitespace-pre-line">{event.description}</p>

              {event.highlights && event.highlights.length > 0 && (
                <ul className="space-y-3">
                  {event.highlights.map((h, i) => (
                    <li key={i} className="text-gray-700">
                      <strong className="text-gray-900">{h.title}</strong> {h.description}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Organizer Contact Info */}
            {(event.organizer.phone || event.organizer.email) && (
              <div className="bg-white rounded-2xl p-6 border">
                <h2 className="text-xl font-bold mb-4">Contact Organizer</h2>
                <div className="space-y-3">
                  {event.organizer.phone && (
                    <a 
                      href={`tel:${event.organizer.phone}`}
                      className="flex items-center gap-3 text-gray-700 hover:text-cyan-500 transition"
                    >
                      <Phone size={20} className="text-cyan-500" />
                      <span>{event.organizer.phone}</span>
                    </a>
                  )}
                  {event.organizer.email && (
                    <a 
                      href={`mailto:${event.organizer.email}`}
                      className="flex items-center gap-3 text-gray-700 hover:text-cyan-500 transition"
                    >
                      <Mail size={20} className="text-cyan-500" />
                      <span>{event.organizer.email}</span>
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* For Webinars - Platform Info */}
            {event.eventType === 'webinar' && event.platform && (
              <div className="bg-blue-50 rounded-2xl p-6 border border-blue-200">
                <h2 className="text-xl font-bold mb-3 text-blue-900">Join Online</h2>
                <p className="text-blue-800 mb-4">
                  This is a virtual event. Join via <strong>{event.platform}</strong>
                </p>
                {event.platformLink && (
                  <a
                    href={event.platformLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600 transition"
                  >
                    Join Meeting
                    <ExternalLink size={18} />
                  </a>
                )}
              </div>
            )}

            {/* For Campus Events - University Info */}
            {event.eventType === 'campus' && event.university && (
              <div className="bg-purple-50 rounded-2xl p-6 border border-purple-200">
                <h2 className="text-xl font-bold mb-2 text-purple-900">Campus Event</h2>
                <p className="text-purple-800">
                  Hosted at <strong>{event.university}</strong>
                </p>
              </div>
            )}
          </div>

          {/* Right Sidebar */}
          <div>
            <div className="bg-white rounded-2xl p-6 border sticky top-24 space-y-6">
              <button
                onClick={() => navigate(-1)}
                className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full"
              >
                <X size={18} />
              </button>

              {/* Ticket Price */}
              <div>
                <p className="text-sm text-gray-500 mb-2">Ticket Price</p>
                <span className={`inline-block px-4 py-2 rounded-lg font-bold ${
                  event.isFree 
                    ? 'bg-emerald-100 text-emerald-600' 
                    : 'bg-cyan-100 text-cyan-600'
                }`}>
                  {event.isFree ? 'FREE' : `₦${event.price.toLocaleString()}`}
                </span>
              </div>

              {/* Date & Time */}
              <div className="border-b pb-6">
                <div className="flex gap-3">
                  <Calendar className="text-cyan-500 flex-shrink-0" size={24} />
                  <div>
                    <p className="font-semibold text-gray-900">{getDateDisplay()}</p>
                    <p className="text-cyan-500 text-sm">{getTimeDisplay()}</p>
                    
                    {/* Event Duration Badge */}
                    {event.eventDuration === 'multi' && (
                      <span className="inline-block mt-2 px-2 py-1 bg-orange-100 text-orange-600 rounded text-xs font-medium">
                        Multi-Day Event
                      </span>
                    )}
                    {event.eventDuration === 'recurring' && (
                      <span className="inline-block mt-2 px-2 py-1 bg-green-100 text-green-600 rounded text-xs font-medium">
                        Recurring Event
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Location - Only for non-webinar events */}
              {event.eventType !== 'webinar' && (
                <div>
                  <div className="flex gap-3 mb-3">
                    <MapPin className="text-cyan-500 flex-shrink-0" size={24} />
                    <div>
                      <p className="font-semibold text-gray-900">{event.venue}</p>
                      <p className="text-sm text-gray-600">{event.address}</p>
                      <p className="text-xs text-gray-500 mt-1">{event.city}</p>
                    </div>
                  </div>

                  {/* Map Preview */}
                  {event.mapPreview && (
                    <div className="relative">
                      <img 
                        src={event.mapPreview} 
                        alt="Location map" 
                        className="h-32 w-full rounded-lg object-cover border" 
                      />
                      
                      {/* Map Link Overlay */}
                      {event.mapLocation && (
                        <a
                          href={event.mapLocation}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 hover:opacity-100 transition rounded-lg"
                        >
                          <span className="px-4 py-2 bg-white rounded-lg font-medium text-sm flex items-center gap-2">
                            <MapPin size={16} />
                            View on Map
                          </span>
                        </a>
                      )}
                    </div>
                  )}
                  
                  {/* Direct Map Link (if no preview) */}
                  {!event.mapPreview && event.mapLocation && (
                    <a
                      href={event.mapLocation}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-cyan-500 hover:text-cyan-600 text-sm font-medium"
                    >
                      <MapPin size={16} />
                      View Location on Map
                    </a>
                  )}
                </div>
              )}

              {/* Capacity Info */}
              {event.capacity && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <User size={16} />
                  <span>Capacity: {event.capacity} attendees</span>
                </div>
              )}

              {/* Buy Ticket Button - ONLY shows if ticketLink exists */}
{event.ticketLink && (
  <a
    href={event.ticketLink}
    target="_blank"
    rel="noopener noreferrer"
    className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-lg font-semibold hover:from-cyan-600 hover:to-blue-600 transition flex items-center justify-center gap-2"
  >
    <Ticket size={20} />
    Buy Tickets
  </a>
)}

              {/* Visit Event Button */}
              <button className="w-full py-3 bg-cyan-400 text-white rounded-lg font-semibold hover:bg-cyan-500 transition flex items-center justify-center gap-2">
                {event.eventType === 'webinar' ? 'Register for Event' : 'Visit Event'}
                <ChevronRight size={18} />
              </button>

              {/* Share & Save Buttons */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleShare}
                  className="flex items-center justify-center gap-2 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                >
                  <Share2 size={18} /> Share
                </button>

                <button
                  onClick={handleSave}
                  className={`flex items-center justify-center gap-2 py-2.5 border rounded-lg transition ${
                    isSaved 
                      ? 'bg-red-50 border-red-300 text-red-600' 
                      : 'border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <Heart size={18} className={isSaved ? 'fill-red-500 text-red-500' : ''} />
                  {isSaved ? 'Saved' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}