import { useState } from 'react';
import { Search, Bell, Calendar, Clock, MapPin, ChevronRight, ArrowUpDown, X, Bookmark, Menu } from 'lucide-react';
import { UserSidebar } from '../../components/UserSidebar';

export default function SavedEvents() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [savedEvents, setSavedEvents] = useState([
    {
      id: 1,
      title: 'Osogbo Horse Racing: Polo',
      category: 'Sports',
      date: 'Sun, Jan 12',
      time: '3:00 PM',
      location: 'Osogbo, Nigeria.',
      image: 'https://images.unsplash.com/photo-1519315901367-f34ff9154487?w=400&q=80',
      free: true
    },
    {
      id: 2,
      title: 'Family Outing & Kid Fun',
      category: 'Free',
      date: 'Mon, Jan 12',
      time: '4:00 PM',
      location: 'Ibadan, Nigeria.',
      image: 'https://images.unsplash.com/photo-1511895426328-dc8714191300?w=400&q=80',
      free: true
    },
    {
      id: 3,
      title: 'Eid-Fitr Outing & Picnic',
      category: 'Faith',
      date: 'Sun, Jan 12',
      time: '3:00 PM',
      location: 'Ibadan, Nigeria.',
      image: 'https://images.unsplash.com/photo-1577985043696-3d9b3c39e0e0?w=400&q=80',
      free: true
    },
    {
      id: 4,
      title: 'Veggies cookathon Record Breaking',
      category: 'Food',
      date: 'Sun, Jan 12',
      time: '3:00 PM',
      location: 'Ibadan, Nigeria.',
      image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&q=80',
      free: true
    },
    {
      id: 5,
      title: 'Eid-Fitr Outing & Picnic',
      category: 'Faith',
      date: 'Sun, Jan 12',
      time: '3:00 PM',
      location: 'Ibadan, Nigeria.',
      image: 'https://images.unsplash.com/photo-1577985043696-3d9b3c39e0e0?w=400&q=80',
      free: true
    },
    {
      id: 6,
      title: 'Veggies cookathon Record Breaking',
      category: 'Food',
      date: 'Sun, Jan 12',
      time: '3:00 PM',
      location: 'Ibadan, Nigeria.',
      image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&q=80',
      free: true
    },
    {
      id: 7,
      title: 'Osogbo Horse Racing: Polo',
      category: 'Sports',
      date: 'Sun, Jan 12',
      time: '3:00 PM',
      location: 'Osogbo, Nigeria.',
      image: 'https://images.unsplash.com/photo-1519315901367-f34ff9154487?w=400&q=80',
      free: true
    },
    {
      id: 8,
      title: 'Family Outing & Kid Fun',
      category: 'Free',
      date: 'Mon, Jan 12',
      time: '4:00 PM',
      location: 'Ibadan, Nigeria.',
      image: 'https://images.unsplash.com/photo-1511895426328-dc8714191300?w=400&q=80',
      free: true
    }
  ]);

  const [eventToRemove, setEventToRemove] = useState(null);

  const user = {
    name: 'Saleem',
    city: 'Lagos',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Saleem'
  };

  const handleRemoveClick = (event) => {
    setEventToRemove(event);
  };

  const confirmRemove = () => {
    if (eventToRemove) {
      setSavedEvents(savedEvents.filter(event => event.id !== eventToRemove.id));
      setEventToRemove(null);
    }
  };

  const cancelRemove = () => {
    setEventToRemove(null);
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <UserSidebar 
        activeTab="saved" 
        user={user}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      
      <main className="flex-1 overflow-auto">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 py-4 sticky top-0 z-30">
          <div className="flex items-center justify-between">
            {/* Hamburger Menu - Mobile */}
            <button 
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 hover:bg-gray-100 rounded-lg mr-2"
            >
              <Menu size={24} />
            </button>

            <div className="flex-1 max-w-xl">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Search location, event"
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400 text-sm"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-4 ml-2 sm:ml-6">
              <button className="p-2 hover:bg-gray-100 rounded-full relative">
                <Bell size={20} className="text-gray-600" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>
              <img src={user.avatar} alt={user.name} className="w-8 h-8 sm:w-10 sm:h-10 rounded-full" />
            </div>
          </div>
        </header>

        {/* Main Content */}
        <div className="px-4 sm:px-6 lg:px-8 py-6">
          {/* Page Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Saved Events</h1>
              <p className="text-sm sm:text-base text-gray-500 mt-1">You've saved {savedEvents.length} events.</p>
            </div>
            {savedEvents.length > 0 && (
              <button className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition self-start sm:self-auto">
                <ArrowUpDown size={18} />
                <span className="font-medium">Sorted by Date</span>
              </button>
            )}
          </div>

          {/* Events Grid or Empty State */}
          {savedEvents.length > 0 ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5 mb-8">
                {savedEvents.map((event) => (
                  <div key={event.id} className="relative group">
                    <div className="relative h-48 sm:h-56 rounded-xl overflow-hidden cursor-pointer">
                      <img 
                        src={event.image} 
                        alt={event.title}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                      
                      <button 
                        onClick={() => handleRemoveClick(event)}
                        className="absolute top-2 sm:top-3 right-2 sm:right-3 p-1.5 sm:p-2 bg-white rounded-full hover:bg-gray-100 transition"
                      >
                        <Bookmark size={14} className="sm:w-4 sm:h-4 text-red-500 fill-red-500" />
                      </button>

                      <span className="absolute top-2 sm:top-3 left-2 sm:left-3 px-2 sm:px-3 py-0.5 sm:py-1 bg-white/90 rounded-full text-xs font-semibold text-cyan-500">
                        #{event.category}
                      </span>

                      {event.free && (
                        <span className="absolute top-10 sm:top-12 left-2 sm:left-3 px-2 sm:px-3 py-0.5 sm:py-1 bg-emerald-500 text-white rounded-lg text-xs font-semibold">
                          Free
                        </span>
                      )}

                      <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4 text-white">
                        <h3 className="text-sm sm:text-base font-bold mb-1.5 sm:mb-2 line-clamp-2">{event.title}</h3>
                        <div className="flex items-center gap-2 sm:gap-3 text-xs mb-1.5 sm:mb-2">
                          <div className="flex items-center gap-1">
                            <Calendar size={11} className="sm:w-3 sm:h-3" />
                            <span className="text-xs">{event.date}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock size={11} className="sm:w-3 sm:h-3" />
                            <span className="text-xs">{event.time}</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1 text-xs flex-1 mr-2">
                            <MapPin size={11} className="sm:w-3 sm:h-3 flex-shrink-0" />
                            <span className="truncate">{event.location}</span>
                          </div>
                          <button className="text-cyan-400 text-xs font-medium hover:text-cyan-300 flex items-center gap-0.5 flex-shrink-0">
                            View
                            <ChevronRight size={12} className="sm:w-3.5 sm:h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="text-center">
                <button className="text-sm sm:text-base text-gray-600 hover:text-gray-900 font-medium">
                  View all
                </button>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center min-h-[400px] sm:min-h-[500px]">
              <div className="text-center max-w-md px-4">
                <div className="mb-6 flex justify-center">
                  <div className="w-24 h-24 sm:w-32 sm:h-32 bg-gray-100 rounded-full flex items-center justify-center">
                    <Search size={40} className="sm:w-12 sm:h-12 text-gray-400" strokeWidth={1.5} />
                  </div>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2 sm:mb-3">No Saved Events Yet</h2>
                <p className="text-sm sm:text-base text-gray-500 mb-6 sm:mb-8">
                  Your weekends are looking little too quiet. Start exploring now
                  until you fill up schedule with amazing experiences
                </p>
                <button className="px-6 sm:px-8 py-2.5 sm:py-3 bg-cyan-400 text-white rounded-full font-medium hover:bg-cyan-500 transition inline-flex items-center gap-2 text-sm sm:text-base">
                  Browse Categories
                  <ChevronRight size={16} className="sm:w-4.5 sm:h-4.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Remove Confirmation Modal */}
      {eventToRemove && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 sm:p-8 max-w-md w-full relative animate-in fade-in zoom-in duration-200">
            <button 
              onClick={cancelRemove}
              className="absolute top-3 sm:top-4 right-3 sm:right-4 p-1 text-gray-400 hover:text-gray-600 transition"
            >
              <X size={20} />
            </button>

            <div className="flex justify-center mb-4 sm:mb-6">
              <div className="w-14 h-14 sm:w-16 sm:h-16 bg-cyan-100 rounded-full flex items-center justify-center">
                <Bookmark size={24} className="sm:w-7 sm:h-7 text-cyan-500" />
              </div>
            </div>

            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 text-center mb-2 sm:mb-3">
              Remove From Saved?
            </h2>
            <p className="text-sm sm:text-base text-gray-600 text-center mb-6 sm:mb-8">
              Are you sure you want to remove <span className="font-semibold text-gray-900">{eventToRemove.title}</span> from your saved event lists?
              You can always save it later.
            </p>

            <div className="flex gap-3">
              <button 
                onClick={confirmRemove}
                className="flex-1 px-4 sm:px-6 py-2.5 sm:py-3 bg-cyan-400 text-white rounded-full font-medium hover:bg-cyan-500 transition text-sm sm:text-base"
              >
                Remove
              </button>
              <button 
                onClick={cancelRemove}
                className="flex-1 px-4 sm:px-6 py-2.5 sm:py-3 bg-gray-100 text-gray-700 rounded-full font-medium hover:bg-gray-200 transition text-sm sm:text-base"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}