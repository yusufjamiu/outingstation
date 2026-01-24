import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Bell, Heart, Menu } from 'lucide-react';
import { UserSidebar } from '../../components/UserSidebar';

export default function WebinarEvents() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [savedEventIds, setSavedEventIds] = useState([]);

  const user = {
    name: 'Saleem',
    city: 'Lagos',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=User'
  };

  // Click handler to navigate to event details
  const handleEventClick = (eventId) => {
    navigate(`/event/${eventId}`);
  };

  // Save/unsave event handler
  const handleSaveClick = (e, eventId) => {
    e.stopPropagation();
    
    if (savedEventIds.includes(eventId)) {
      setSavedEventIds(savedEventIds.filter(id => id !== eventId));
    } else {
      setSavedEventIds([...savedEventIds, eventId]);
    }
  };

  const webinars = [
    {
      id: 1,
      title: 'Python/Java Basics Workshop',
      category: 'Online',
      date: 'Mon, Jan 12',
      time: '3:00 PM',
      platform: 'Google Meet',
      image: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800&q=80',
      isFree: true
    },
    {
      id: 2,
      title: 'Tech Realm While Using AI',
      category: 'Online',
      date: 'Tue, Jan 12',
      time: '3:00 PM',
      platform: 'Twitter Space',
      image: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=800&q=80',
      isFree: true
    },
    {
      id: 3,
      title: 'Remote Leadership Summit',
      category: 'Live',
      date: 'Fri, Jan 12',
      time: '3:00 PM',
      platform: 'Zoom',
      image: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&q=80',
      isFree: true
    },
    {
      id: 4,
      title: '2026 Job Hunting Navigation',
      category: 'Live',
      date: 'Sat, Jan 13',
      time: '2:00 PM',
      platform: 'Google Meet',
      image: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&q=80',
      isFree: true
    },
    {
      id: 5,
      title: 'PhD Scholarship Application',
      category: 'Online',
      date: 'Sun, Jan 14',
      time: '4:00 PM',
      platform: 'Zoom',
      image: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800&q=80',
      isFree: true
    },
    {
      id: 6,
      title: 'Freshmen Mega Orientation',
      category: 'Online',
      date: 'Mon, Jan 15',
      time: '10:00 AM',
      platform: 'Microsoft Teams',
      image: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=800&q=80',
      isFree: true
    }
  ];

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* User Sidebar */}
      <UserSidebar 
        activeTab="category" 
        user={user}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <main className="flex-1 overflow-y-auto">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 py-4 sticky top-0 z-30">
          <div className="flex items-center justify-between">
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
                  placeholder="Search location, event & more"
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

        <div className="p-4 sm:p-6 lg:p-8">
          <div className="mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Webinar & Virtual Events</h1>
            <p className="text-sm sm:text-base text-gray-600">
              Discover online workshop, conferences, and live sessions. Connect with experts and learn new things from various parts in the world
            </p>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-6 sm:mb-8">
            <div className="flex-1 sm:flex-initial">
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">Date:</label>
              <select className="w-full px-3 sm:px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 outline-none text-sm">
                <option>Any</option>
                <option>Today</option>
                <option>This Week</option>
                <option>This Month</option>
              </select>
            </div>

            <div className="flex-1 sm:flex-initial">
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">Topic:</label>
              <select className="w-full px-3 sm:px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 outline-none text-sm">
                <option>All</option>
                <option>Technology</option>
                <option>Business</option>
                <option>Education</option>
              </select>
            </div>

            <div className="flex-1 sm:flex-initial">
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">Status:</label>
              <select className="w-full px-3 sm:px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 outline-none text-sm">
                <option>All</option>
                <option>Free</option>
                <option>Paid</option>
              </select>
            </div>

            <div className="sm:ml-auto flex items-end">
              <p className="text-sm sm:text-base text-gray-600 font-medium">{webinars.length} Events Available</p>
            </div>
          </div>

          {/* Webinars Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 lg:gap-6">
            {webinars.map((webinar) => (
              <div 
                key={webinar.id}
                onClick={() => handleEventClick(webinar.id)}
                className="bg-white rounded-xl overflow-hidden shadow-md hover:shadow-xl transition group cursor-pointer"
              >
                <div className="relative h-48 sm:h-56">
                  <img 
                    src={webinar.image} 
                    alt={webinar.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                  />
                  
                  <div className="absolute top-3 left-3">
                    <span className={`${webinar.category === 'Live' ? 'bg-red-500' : 'bg-blue-500'} text-white text-xs px-2.5 sm:px-3 py-1 rounded-full`}>
                      📹 {webinar.category}
                    </span>
                  </div>

                  <button 
                    onClick={(e) => handleSaveClick(e, webinar.id)}
                    className="absolute top-3 right-3 w-9 h-9 sm:w-10 sm:h-10 bg-white rounded-full flex items-center justify-center hover:bg-gray-100 transition z-10"
                  >
                    <Heart 
                      size={18}
                      className={`sm:w-5 sm:h-5 ${savedEventIds.includes(webinar.id) ? 'text-red-500 fill-red-500' : 'text-gray-600'}`}
                    />
                  </button>

                  {webinar.isFree && (
                    <div className="absolute bottom-3 right-3">
                      <span className="bg-emerald-500 text-white text-xs px-2.5 sm:px-3 py-1 rounded-lg font-semibold">
                        Free
                      </span>
                    </div>
                  )}
                </div>

                <div className="p-4 sm:p-5">
                  <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-3 group-hover:text-cyan-500 transition line-clamp-2">
                    {webinar.title}
                  </h3>
                  
                  <div className="space-y-2 text-xs sm:text-sm text-gray-600 mb-4">
                    <div className="flex items-center gap-2">
                      <span>📅 {webinar.date}</span>
                      <span>🕒 {webinar.time}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-cyan-500 text-xs sm:text-sm">📍 {webinar.platform}</span>
                    <button className="text-cyan-500 font-semibold text-xs sm:text-sm hover:underline">
                      View →
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}