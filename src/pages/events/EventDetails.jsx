import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Search, Bell, X, Calendar, MapPin, Share2, Heart, ChevronRight } from 'lucide-react';

export default function EventDetails() {
  const navigate = useNavigate();
  const { id } = useParams();

  // 🔹 auth placeholder (replace later with Firebase Auth)
  const user = null; // guest for now

  const [event, setEvent] = useState(null);
  const [isSaved, setIsSaved] = useState(false);

  // 🔹 simulate fetching event by ID
  useEffect(() => {
    const mockEvent = {
      id,
      title: 'Tech Meet Up 2026: A Mega Circle of Genius Techies',
      image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&q=80',
      category: 'Tech',
      ticketPrice: 'FREE',
      date: 'Sat, Feb 12, 2026',
      time: '2:00 PM - 5:00 PM',
      venue: 'TIMX Tech Hub Hall',
      address: '0001 Main Street, Ikeja, Lagos, Nigeria',
      organizer: {
        name: 'Mars Techies Space',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=MarsTechiess'
      },
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
      mapUrl: 'https://images.unsplash.com/photo-1524661135-423995f22d0b?w=400&q=80'
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
          {/* Left */}
          <div className="lg:col-span-2 space-y-6">
            <div className="relative rounded-2xl overflow-hidden h-80">
              <img src={event.image} alt={event.title} className="w-full h-full object-cover" />
              <span className="absolute top-4 right-4 px-4 py-1.5 bg-white/90 rounded-full text-sm font-semibold text-cyan-500">
                #{event.category}
              </span>
            </div>

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

            <div className="bg-white rounded-2xl p-6 border">
              <h2 className="text-2xl font-bold mb-4">About This Event</h2>
              <p className="text-gray-600 mb-6">{event.description}</p>

              <ul className="space-y-3">
                {event.highlights.map((h, i) => (
                  <li key={i}>
                    <strong>{h.title}</strong> {h.description}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Right */}
          <div>
            <div className="bg-white rounded-2xl p-6 border sticky top-24">
              <button
                onClick={() => navigate(-1)}
                className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full"
              >
                <X size={18} />
              </button>

              <div className="mb-6">
                <p className="text-sm text-gray-500">Ticket Price</p>
                <span className="inline-block px-4 py-1 bg-cyan-100 text-cyan-600 rounded-lg font-bold">
                  {event.ticketPrice}
                </span>
              </div>

              <div className="mb-6 border-b pb-6">
                <div className="flex gap-3">
                  <Calendar className="text-cyan-500" />
                  <div>
                    <p className="font-semibold">{event.date}</p>
                    <p className="text-cyan-500">{event.time}</p>
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <div className="flex gap-3 mb-3">
                  <MapPin className="text-cyan-500" />
                  <div>
                    <p className="font-semibold">{event.venue}</p>
                    <p className="text-sm text-gray-600">{event.address}</p>
                  </div>
                </div>

                <img src={event.mapUrl} alt="" className="h-32 w-full rounded-lg object-cover border" />
              </div>

              <button className="w-full py-3 bg-cyan-400 text-white rounded-lg font-semibold mb-4 flex items-center justify-center gap-2">
                Visit Event <ChevronRight size={18} />
              </button>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleShare}
                  className="flex items-center justify-center gap-2 py-2.5 border rounded-lg"
                >
                  <Share2 size={18} /> Share
                </button>

                <button
                  onClick={handleSave}
                  className={`flex items-center justify-center gap-2 py-2.5 border rounded-lg ${
                    isSaved ? 'bg-red-50 border-red-300' : ''
                  }`}
                >
                  <Heart size={18} className={isSaved ? 'fill-red-500 text-red-500' : ''} />
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
