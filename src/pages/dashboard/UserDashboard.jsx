import { useState } from 'react';
import { Search, Bell, Heart, ChevronRight, Calendar, Clock, MapPin, Menu } from 'lucide-react';
import { UserSidebar } from "../../components/UserSidebar";

export default function UserDashboard() {
  const [activeCategory, setActiveCategory] = useState('All');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  const user = {
    name: 'Saleem',
    city: 'Lagos',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Saleem'
  };

  const categories = [
    'All',
    'Business & Tech',
    'Art & Culture',
    'Food & Dinning',
    'Sports',
    'Education',
    'Family & Fun kid',
    'Night Life & Parties',
    'Religion'
  ];

  const trendingEvents = [
    {
      id: 1,
      title: 'Tech Meet Up 2026',
      date: 'Jan 12',
      time: '3:00 PM (WAT)',
      location: 'Ibadan, Nigeria.',
      category: 'Tech',
      image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&q=80',
      featured: true
    },
    {
      id: 2,
      title: 'Ibadan MidMonth Marathon',
      date: 'Fri, Jan 12',
      time: '3:00 PM',
      location: 'Ibadan, Nigeria.',
      category: 'Fitness',
      image: 'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=600&q=80',
      free: true
    },
    {
      id: 3,
      title: 'Ilorin Emirate 2026',
      date: 'Fri, Jan 12',
      time: '',
      location: 'Ibadan, Nigeria.',
      category: 'Culture',
      image: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=600&q=80'
    }
  ];

  const pickedEvents = [
    {
      id: 4,
      title: 'Osogbo Horse Racing: Polo',
      category: 'Sports',
      image: 'https://images.unsplash.com/photo-1519315901367-f34ff9154487?w=400&q=80',
      free: true
    },
    {
      id: 5,
      title: 'Family Outing & Kid Fun',
      category: 'Free',
      image: 'https://images.unsplash.com/photo-1511895426328-dc8714191300?w=400&q=80',
      free: true
    },
    {
      id: 6,
      title: 'Eid-Fitr Outing & Picnic',
      category: 'Free',
      image: 'https://images.unsplash.com/photo-1577985043696-3d9b3c39e0e0?w=400&q=80',
      free: true
    },
    {
      id: 7,
      title: 'Veggies cookathon Record Breaking',
      category: 'Food',
      image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&q=80',
      free: true
    }
  ];

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <UserSidebar 
        activeTab="home" 
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
                  placeholder="Search location, events & more"
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
          {/* Greeting */}
          <div className="mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Good day, {user.name}!</h1>
            <p className="text-sm sm:text-base text-gray-600 mt-1">
              Here's what is happening in <span className="font-semibold">{user.city}</span> today.
            </p>
          </div>

          {/* Category Pills */}
          <div className="flex gap-2 mb-8 overflow-x-auto pb-2 scrollbar-hide">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setActiveCategory(category)}
                className={`px-4 sm:px-5 py-2 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap transition ${
                  activeCategory === category
                    ? 'bg-cyan-400 text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:border-gray-400'
                }`}
              >
                {category}
              </button>
            ))}
          </div>

          {/* Trending This Week */}
          <section className="mb-10">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-5">Trending This Week</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
              {/* Featured Large Card */}
              <div className="md:col-span-1 relative group cursor-pointer">
                <div className="relative h-64 sm:h-80 rounded-xl overflow-hidden">
                  <img 
                    src={trendingEvents[0].image} 
                    alt={trendingEvents[0].title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"></div>
                  
                  <button className="absolute top-3 sm:top-4 right-3 sm:right-4 p-1.5 sm:p-2 bg-white rounded-full hover:bg-gray-100">
                    <Heart size={16} className="sm:w-5 sm:h-5 text-gray-700" />
                  </button>

                  <span className="absolute top-3 sm:top-4 left-3 sm:left-4 px-2.5 sm:px-3 py-1 bg-white/90 rounded-full text-xs font-semibold text-cyan-500">
                    #{trendingEvents[0].category}
                  </span>

                  <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-5 text-white">
                    <h3 className="text-lg sm:text-2xl font-bold mb-2 sm:mb-3">{trendingEvents[0].title}</h3>
                    <div className="flex items-center gap-3 sm:gap-4 text-xs sm:text-sm mb-2 sm:mb-3">
                      <div className="flex items-center gap-1.5">
                        <Calendar size={14} className="sm:w-4 sm:h-4" />
                        <span>{trendingEvents[0].date}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock size={14} className="sm:w-4 sm:h-4" />
                        <span>{trendingEvents[0].time}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs sm:text-sm">
                        <MapPin size={14} className="sm:w-4 sm:h-4" />
                        <span className="line-clamp-1">{trendingEvents[0].location}</span>
                      </div>
                      <button className="hidden sm:flex px-3 sm:px-4 py-1.5 bg-white text-gray-900 rounded-lg text-xs sm:text-sm font-medium hover:bg-gray-100 items-center gap-1">
                        View Details
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Two Medium Cards */}
              {trendingEvents.slice(1).map((event) => (
                <div key={event.id} className="relative group cursor-pointer">
                  <div className="relative h-64 sm:h-80 rounded-xl overflow-hidden">
                    <img 
                      src={event.image} 
                      alt={event.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                    
                    <button className="absolute top-3 sm:top-4 right-3 sm:right-4 p-1.5 sm:p-2 bg-white rounded-full hover:bg-gray-100">
                      <Heart size={16} className="sm:w-5 sm:h-5 text-gray-700" />
                    </button>

                    <span className="absolute top-3 sm:top-4 left-3 sm:left-4 px-2.5 sm:px-3 py-1 bg-white/90 rounded-full text-xs font-semibold text-cyan-500">
                      #{event.category}
                    </span>

                    {event.free && (
                      <span className="absolute top-12 sm:top-14 right-3 sm:right-4 px-2.5 sm:px-3 py-1 bg-emerald-500 text-white rounded-lg text-xs font-semibold">
                        Free
                      </span>
                    )}

                    <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4 text-white">
                      <h3 className="text-base sm:text-lg font-bold mb-2">{event.title}</h3>
                      <div className="flex items-center gap-1.5 text-xs mb-2">
                        <Calendar size={12} className="sm:w-3.5 sm:h-3.5" />
                        <span>{event.date}</span>
                        {event.time && (
                          <>
                            <Clock size={12} className="sm:w-3.5 sm:h-3.5 ml-2" />
                            <span>{event.time}</span>
                          </>
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs">
                          <MapPin size={12} className="sm:w-3.5 sm:h-3.5" />
                          <span className="line-clamp-1">{event.location}</span>
                        </div>
                        <button className="text-cyan-400 text-xs font-medium hover:text-cyan-300 flex items-center gap-1">
                          View
                          <ChevronRight size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Picked For You */}
          <section>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-5">Picked For You</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
              {pickedEvents.map((event) => (
                <div key={event.id} className="relative group cursor-pointer">
                  <div className="relative h-40 sm:h-48 rounded-xl overflow-hidden">
                    <img 
                      src={event.image} 
                      alt={event.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent"></div>
                    
                    <button className="absolute top-2 sm:top-3 right-2 sm:right-3 p-1 sm:p-1.5 bg-white rounded-full hover:bg-gray-100">
                      <Heart size={14} className="sm:w-4 sm:h-4 text-gray-700" />
                    </button>

                    <span className="absolute top-2 sm:top-3 left-2 sm:left-3 px-2 sm:px-2.5 py-0.5 sm:py-1 bg-white/90 rounded-full text-xs font-semibold text-amber-500">
                      {event.category}
                    </span>

                    {event.free && (
                      <span className="absolute bottom-10 sm:bottom-12 right-2 sm:right-3 px-2 sm:px-2.5 py-0.5 sm:py-1 bg-emerald-500 text-white rounded-lg text-xs font-semibold">
                        Free
                      </span>
                    )}

                    <div className="absolute bottom-0 left-0 right-0 p-2 sm:p-3 text-white">
                      <h3 className="text-xs sm:text-sm font-bold line-clamp-2">{event.title}</h3>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}