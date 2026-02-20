import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { 
  Calendar, Clock, MapPin, DollarSign, Users, Share2, Heart, 
  ExternalLink, Mail, Phone, Globe, Bookmark, ArrowLeft, CheckCircle, Navigation
} from 'lucide-react';
import { doc, getDoc, collection, getDocs, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';

const openInMaps = (event) => {
  // Use the mapLocation field from Firebase
  if (event.mapLocation) {
    window.open(event.mapLocation, '_blank');
    return;
  }
  
  // Fallback: Search using address
  const location = event.address || event.location;
  if (!location) {
    toast.error('No location information available');
    return;
  }
  
  const query = encodeURIComponent(location);
  window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
};

const handleRegister = (event, currentUser, navigate) => {
  if (!currentUser) {
    toast.error('Please login to register for this event');
    navigate('/login');
    return;
  }
  
  // Check if event is free
  if (event.isFree) {
   toast.success(`Free Event - Registration Successful!\n\nThis is a FREE event. See you there!`, { 
  icon: '🎉',
  duration: 5000 
});
    return;
  }
  
  // If paid and has ticket link, open it
  if (event.ticketLink) {
   toast((t) => (
  <div className="flex flex-col gap-3">
    <div>
      <p className="font-semibold">🎟️ Ticket Required</p>
      <p className="text-sm text-gray-600 mt-1">{event.title}</p>
      <p className="text-sm font-semibold text-cyan-600 mt-1">
        Price: ₦{event.price?.toLocaleString()}
      </p>
    </div>
    <div className="flex gap-2">
      <button
        onClick={() => {
          window.open(event.ticketLink, '_blank');
          toast.dismiss(t.id);
        }}
        className="flex-1 px-4 py-2 bg-cyan-500 text-white rounded-lg font-medium hover:bg-cyan-600"
      >
        Buy Tickets
      </button>
      <button
        onClick={() => toast.dismiss(t.id)}
        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200"
      >
        Cancel
      </button>
    </div>
  </div>
), { duration: Infinity });
    if (confirmBuy) {
      window.open(event.ticketLink, '_blank');
    }
    return;
  }
  
  // Paid event without ticket link
  toast.success('Registration Successful!', { icon: '🎉' })
  
  // TODO: Future implementation:
  // - Save registration to Firebase
  // - Send confirmation email
  // - Add to user's registered events list
};

export default function EventDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const [event, setEvent] = useState(null);
  const [similarEvents, setSimilarEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);

  useEffect(() => {
    loadEventDetails();
    checkIfSaved();
  }, [id, currentUser]);

  const loadEventDetails = async () => {
    try {
      setLoading(true);
      
      // Load event
      const eventDoc = await getDoc(doc(db, 'events', id));
      
      if (!eventDoc.exists()) {
        navigate('/events');
        return;
      }

      const eventData = { id: eventDoc.id, ...eventDoc.data() };
      setEvent(eventData);

      // Load similar events (same category)
      const eventsSnapshot = await getDocs(collection(db, 'events'));
      const allEvents = eventsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      const similar = allEvents
        .filter(e => 
          e.id !== id && 
          e.category === eventData.category && 
          e.status === 'published'
        )
        .slice(0, 3);

      setSimilarEvents(similar);
    } catch (err) {
      console.error('Error loading event:', err);
    }
    setLoading(false);
  };

  const checkIfSaved = async () => {
    if (!currentUser) {
      setSaved(false);
      return;
    }

    try {
      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      if (userDoc.exists()) {
        const savedEvents = userDoc.data().savedEvents || [];
        setSaved(savedEvents.includes(id));
      }
    } catch (err) {
      console.error('Error checking saved status:', err);
    }
  };

  const handleSaveToggle = async () => {
    if (!currentUser) {
      navigate('/login');
      return;
    }

    try {
      const userRef = doc(db, 'users', currentUser.uid);
      
      if (saved) {
        await updateDoc(userRef, {
          savedEvents: arrayRemove(id)
        });
        setSaved(false);
      } else {
        await updateDoc(userRef, {
          savedEvents: arrayUnion(id)
        });
        setSaved(true);
      }
    } catch (err) {
      console.error('Error toggling save:', err);
    }
  };

  const handleShare = (platform) => {
    const url = window.location.href;
    const text = `Check out this event: ${event.title}`;
    
    const shareUrls = {
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
      twitter: `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
      whatsapp: `https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
      copy: url
    };

    if (platform === 'copy') {
      navigator.clipboard.writeText(url);
      toast.success('Link copied!', { icon: '📋' });
    } else {
      window.open(shareUrls[platform], '_blank');
    }
    
    setShowShareMenu(false);
  };

  const getDate = (event) => {
    if (!event) return 'TBD';
    if (event.date) {
      const date = event.date.toDate ? event.date.toDate() : new Date(event.date);
      return date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    }
    return 'TBD';
  };

  const getTime = (event) => {
    if (!event) return '';
    return event.time || event.dailyStartTime || event.recurringTime || 'TBD';
  };

  const getImage = (event) => {
    return event?.imageUrl || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200&q=80';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 py-20 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Event Not Found</h1>
          <Link to="/events" className="text-cyan-500 hover:underline">
            Back to Events
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Back Button */}
        <button 
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition"
        >
          <ArrowLeft size={20} />
          <span>Back</span>
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Hero Image */}
            <div className="relative rounded-2xl overflow-hidden mb-6 shadow-lg">
              <img 
                src={getImage(event)} 
                alt={event.title}
                className="w-full h-64 sm:h-96 object-cover"
              />
              
              {/* Category Badge */}
              <div className="absolute top-4 left-4">
                <span className="bg-white/90 backdrop-blur-sm text-cyan-500 px-4 py-2 rounded-full text-sm font-semibold">
                  #{event.category}
                </span>
              </div>

              {/* Event Type Badge */}
              {event.eventType && (
                <div className="absolute top-4 right-4">
                  <span className="bg-purple-500 text-white px-4 py-2 rounded-full text-sm font-semibold">
                    {event.eventType === 'campus' && '🎓 Campus'}
                    {event.eventType === 'webinar' && '📹 Virtual'}
                    {event.eventType === 'regular' && '🎉 Event'}
                  </span>
                </div>
              )}

              {/* Free Badge */}
              {event.isFree && (
                <div className="absolute bottom-4 right-4">
                  <span className="bg-emerald-500 text-white px-4 py-2 rounded-lg font-semibold">
                    Free Event
                  </span>
                </div>
              )}
            </div>

            {/* Title & Actions */}
            <div className="flex items-start justify-between mb-6">
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 flex-1">
                {event.title}
              </h1>
              
              <div className="flex gap-2 ml-4">
                <button
                  onClick={handleSaveToggle}
                  className={`p-3 rounded-full transition ${
                    saved 
                      ? 'bg-red-50 text-red-500' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {saved ? (
                    <Heart size={24} className="fill-current" />
                  ) : (
                    <Heart size={24} />
                  )}
                </button>

                <div className="relative">
                  <button
                    onClick={() => setShowShareMenu(!showShareMenu)}
                    className="p-3 bg-gray-100 text-gray-600 rounded-full hover:bg-gray-200 transition"
                  >
                    <Share2 size={24} />
                  </button>

                  {showShareMenu && (
                    <>
                      <div 
                        className="fixed inset-0 z-40"
                        onClick={() => setShowShareMenu(false)}
                      ></div>
                      <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                        <button
                          onClick={() => handleShare('facebook')}
                          className="w-full px-4 py-2 text-left hover:bg-gray-100 text-sm"
                        >
                          Share on Facebook
                        </button>
                        <button
                          onClick={() => handleShare('twitter')}
                          className="w-full px-4 py-2 text-left hover:bg-gray-100 text-sm"
                        >
                          Share on Twitter
                        </button>
                        <button
                          onClick={() => handleShare('whatsapp')}
                          className="w-full px-4 py-2 text-left hover:bg-gray-100 text-sm"
                        >
                          Share on WhatsApp
                        </button>
                        <button
                          onClick={() => handleShare('linkedin')}
                          className="w-full px-4 py-2 text-left hover:bg-gray-100 text-sm"
                        >
                          Share on LinkedIn
                        </button>
                        <hr className="my-2" />
                        <button
                          onClick={() => handleShare('copy')}
                          className="w-full px-4 py-2 text-left hover:bg-gray-100 text-sm"
                        >
                          Copy Link
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="bg-white rounded-xl p-6 mb-6 shadow-sm">
              <h2 className="text-xl font-bold text-gray-900 mb-4">About This Event</h2>
              <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                {event.description || 'No description available.'}
              </p>
            </div>

            {/* Additional Details */}
            {(event.university || event.platform || event.religion) && (
              <div className="bg-white rounded-xl p-6 mb-6 shadow-sm">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Additional Information</h2>
                <div className="space-y-3">
                  {event.university && (
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-gray-700">University:</span>
                      <span className="text-gray-600">{event.university}</span>
                    </div>
                  )}
                  {event.platform && (
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-gray-700">Platform:</span>
                      <span className="text-gray-600">{event.platform}</span>
                    </div>
                  )}
                  {event.platformLink && (
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-gray-700">Join Link:</span>
                      <a 
                        href={event.platformLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-cyan-500 hover:underline flex items-center gap-1"
                      >
                        Join Meeting <ExternalLink size={16} />
                      </a>
                    </div>
                  )}
                  {event.religion && (
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-gray-700">Religion:</span>
                      <span className="text-gray-600">{event.religion}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Organizer Info */}
            {(event.organizerName || event.organizerEmail || event.organizerPhone) && (
              <div className="bg-white rounded-xl p-6 mb-6 shadow-sm">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Organizer</h2>
                <div className="space-y-3">
                  {event.organizerName && (
                    <div className="flex items-center gap-3">
                      <Users size={20} className="text-gray-400" />
                      <span className="text-gray-700">{event.organizerName}</span>
                    </div>
                  )}
                  {event.organizerEmail && (
                    <div className="flex items-center gap-3">
                      <Mail size={20} className="text-gray-400" />
                      <a 
                        href={`mailto:${event.organizerEmail}`}
                        className="text-cyan-500 hover:underline"
                      >
                        {event.organizerEmail}
                      </a>
                    </div>
                  )}
                  {event.organizerPhone && (
                    <div className="flex items-center gap-3">
                      <Phone size={20} className="text-gray-400" />
                      <a 
                        href={`tel:${event.organizerPhone}`}
                        className="text-cyan-500 hover:underline"
                      >
                        {event.organizerPhone}
                      </a>
                    </div>
                  )}
                  {event.organizerWebsite && (
                    <div className="flex items-center gap-3">
                      <Globe size={20} className="text-gray-400" />
                      <a 
                        href={event.organizerWebsite}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-cyan-500 hover:underline"
                      >
                        Visit Website
                      </a>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            {/* Event Details Card */}
            <div className="bg-white rounded-xl p-6 shadow-lg sticky top-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Event Details</h2>
              
              <div className="space-y-4 mb-6">
                {/* Date */}
                <div className="flex items-start gap-3">
                  <Calendar size={20} className="text-cyan-500 mt-1 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">Date</p>
                    <p className="text-gray-600 text-sm">{getDate(event)}</p>
                  </div>
                </div>

                {/* Time */}
                {getTime(event) && (
                  <div className="flex items-start gap-3">
                    <Clock size={20} className="text-cyan-500 mt-1 flex-shrink-0" />
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">Time</p>
                      <p className="text-gray-600 text-sm">{getTime(event)}</p>
                    </div>
                  </div>
                )}

                {/* Location */}
                <div className="flex items-start gap-3">
                  <MapPin size={20} className="text-cyan-500 mt-1 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900 text-sm">Location</p>
                    {event.address ? (
                      <>
                        <p className="text-gray-600 text-sm mb-1">{event.address}</p>
                        {event.location && (
                          <p className="text-gray-500 text-xs mb-2">📍 {event.location}</p>
                        )}
                      </>
                    ) : (
                      <p className="text-gray-600 text-sm mb-2">{event.location || 'Online'}</p>
                    )}
                    {(event.mapLocation || event.address) && 
                     event.location?.toLowerCase() !== 'online' && (
                      <button
                        onClick={() => openInMaps(event)}
                        className="text-cyan-500 text-xs font-medium hover:underline flex items-center gap-1"
                      >
                        <Navigation size={14} />
                        Open in Maps
                      </button>
                    )}
                  </div>
                </div>

                {/* Price */}
                <div className="flex items-start gap-3">
                  <DollarSign size={20} className="text-cyan-500 mt-1 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">Price</p>
                    <p className="text-gray-600 text-sm">
                      {event.isFree ? (
                        <span className="text-emerald-600 font-semibold">Free Event</span>
                      ) : (
                        <span className="font-semibold">₦{event.price?.toLocaleString() || 'Contact Organizer'}</span>
                      )}
                    </p>
                  </div>
                </div>
              </div>

              {/* CTA Buttons */}
              <div className="space-y-3">
                <button 
                  onClick={() => handleRegister(event, currentUser, navigate)}
                  className="w-full bg-gradient-to-r from-cyan-400 to-cyan-500 text-white py-3 rounded-xl font-semibold hover:shadow-lg transition flex items-center justify-center gap-2"
                >
                  <CheckCircle size={20} />
                  Register for Event
                </button>

                <button 
                  onClick={handleSaveToggle}
                  className={`w-full py-3 rounded-xl font-semibold transition flex items-center justify-center gap-2 ${
                    saved
                      ? 'bg-red-50 text-red-500 border-2 border-red-200'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Bookmark size={20} className={saved ? 'fill-current' : ''} />
                  {saved ? 'Saved' : 'Save Event'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Similar Events */}
        {similarEvents.length > 0 && (
          <div className="mt-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Similar Events</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {similarEvents.map((similar) => (
                <Link
                  key={similar.id}
                  to={`/event/${similar.id}`}
                  className="bg-white rounded-xl overflow-hidden shadow-md hover:shadow-xl transition group"
                >
                  <div className="relative h-48">
                    <img 
                      src={similar.imageUrl || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&q=80'} 
                      alt={similar.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    />
                    {similar.isFree && (
                      <span className="absolute top-3 right-3 bg-emerald-500 text-white text-xs px-3 py-1 rounded-lg font-semibold">
                        Free
                      </span>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="font-bold text-gray-900 mb-2 group-hover:text-cyan-500 transition line-clamp-2">
                      {similar.title}
                    </h3>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar size={14} />
                      <span>{getDate(similar)}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}