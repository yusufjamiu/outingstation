import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Search, Bell, Heart, Menu } from 'lucide-react';
import { 
  Briefcase, Palette, UtensilsCrossed, Dumbbell, GraduationCap, 
  Heart as HeartIcon, Music, Baby, Users, Gamepad2, Mic2, Tv 
} from 'lucide-react';
import { UserSidebar } from '../../components/UserSidebar';

export default function GenericCategory() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [savedEventIds, setSavedEventIds] = useState([3]); // Event 3 is saved by default

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
    e.stopPropagation(); // Prevent card click when saving
    
    if (savedEventIds.includes(eventId)) {
      setSavedEventIds(savedEventIds.filter(id => id !== eventId));
    } else {
      setSavedEventIds([...savedEventIds, eventId]);
    }
    // TODO: Update savedEvents in Firebase
  };

  // Category mapping
  const categoryMap = {
    'business-tech': { name: 'Business & Tech', icon: Briefcase, color: 'bg-blue-500' },
    'art-culture': { name: 'Art & Culture', icon: Palette, color: 'bg-purple-500' },
    'food-dining': { name: 'Food & Dining', icon: UtensilsCrossed, color: 'bg-orange-500' },
    'sport-fitness': { name: 'Sport & Fitness', icon: Dumbbell, color: 'bg-green-500' },
    'education-workshop': { name: 'Education & Workshop', icon: GraduationCap, color: 'bg-indigo-500' },
    'religion-community': { name: 'Religion & Community', icon: HeartIcon, color: 'bg-pink-500' },
    'nightlife-parties': { name: 'Nightlife & Parties', icon: Music, color: 'bg-purple-600' },
    'family-kids-fun': { name: 'Family & Kids Fun', icon: Baby, color: 'bg-yellow-500' },
    'networking-social': { name: 'Networking & Social', icon: Users, color: 'bg-teal-500' },
    'gaming-esport': { name: 'Gaming & Esport', icon: Gamepad2, color: 'bg-red-500' },
    'music-concerts': { name: 'Music & Concerts', icon: Mic2, color: 'bg-pink-600' },
    'cinema-show': { name: 'Cinema & Show', icon: Tv, color: 'bg-gray-700' }
  };

  const currentCategory = categoryMap[slug] || categoryMap['business-tech'];
  const CategoryIcon = currentCategory.icon;

  // Mock events - in real app, fetch from Firebase filtered by category
  const events = [
    {
      id: 1,
      title: 'Tech Startup Pitch Night',
      date: 'Mon, Jan 12',
      time: '6:00 PM',
      location: 'Lagos, Nigeria',
      image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&q=80',
      isFree: false,
      price: '₦5,000'
    },
    {
      id: 2,
      title: 'Digital Marketing Workshop',
      date: 'Tue, Jan 13',
      time: '3:00 PM',
      location: 'Abuja, Nigeria',
      image: 'https://images.unsplash.com/photo-1556761175-b413da4baf72?w=800&q=80',
      isFree: true
    },
    {
      id: 3,
      title: 'AI & Machine Learning Bootcamp',
      date: 'Wed, Jan 14',
      time: '10:00 AM',
      location: 'Lagos, Nigeria',
      image: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=800&q=80',
      isFree: false,
      price: '₦15,000'
    },
    {
      id: 4,
      title: 'Blockchain & Web3 Summit',
      date: 'Thu, Jan 15',
      time: '2:00 PM',
      location: 'Lagos, Nigeria',
      image: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=800&q=80',
      isFree: true
    },
    {
      id: 5,
      title: 'Product Design Masterclass',
      date: 'Fri, Jan 16',
      time: '5:00 PM',
      location: 'Ibadan, Nigeria',
      image: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=800&q=80',
      isFree: false,
      price: '₦8,000'
    },
    {
      id: 6,
      title: 'Cloud Computing Workshop',
      date: 'Sat, Jan 17',
      time: '11:00 AM',
      location: 'Lagos, Nigeria',
      image: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&q=80',
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
        {/* Top Bar */}
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
              <Link to="/settings">
  <img 
    src={user.avatar} 
    alt={user.name} 
    className="w-8 h-8 sm:w-10 sm:h-10 rounded-full cursor-pointer hover:ring-2 hover:ring-cyan-400 transition" 
  />
</Link>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="p-4 sm:p-6 lg:p-8">
          {/* Header */}
          <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className={`w-14 h-14 sm:w-16 sm:h-16 ${currentCategory.color} rounded-2xl flex items-center justify-center flex-shrink-0`}>
              <CategoryIcon size={28} className="sm:w-8 sm:h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">{currentCategory.name}</h1>
              <p className="text-sm sm:text-base text-gray-600">
                Discover amazing {currentCategory.name.toLowerCase()} events happening around you
              </p>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-6 sm:mb-8">
            <div className="flex-1 sm:flex-initial">
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">Date:</label>
              <select className="w-full px-3 sm:px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 outline-none text-sm">
                <option>Any</option>
                <option>Today</option>
                <option>Tomorrow</option>
                <option>This Week</option>
                <option>This Weekend</option>
                <option>This Month</option>
              </select>
            </div>

            <div className="flex-1 sm:flex-initial">
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">Location:</label>
              <select className="w-full px-3 sm:px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 outline-none text-sm">
                <option>All Cities</option>
                <option>Lagos</option>
                <option>Abuja</option>
                <option>Riyadh</option>
                <option>Jeddah</option>
              </select>
            </div>

            <div className="flex-1 sm:flex-initial">
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">Price:</label>
              <select className="w-full px-3 sm:px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 outline-none text-sm">
                <option>Any Price</option>
                <option>Free</option>
                <option>Paid</option>
              </select>
            </div>

            <div className="sm:ml-auto flex items-end">
              <p className="text-sm sm:text-base text-gray-600 font-medium">{events.length} Events Available</p>
            </div>
          </div>

          {/* Events Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 lg:gap-6">
            {events.map((event) => (
              <div 
                key={event.id} 
                onClick={() => handleEventClick(event.id)}
                className="bg-white rounded-xl overflow-hidden shadow-md hover:shadow-xl transition group cursor-pointer"
              >
                <div className="relative h-48 sm:h-56">
                  <img 
                    src={event.image} 
                    alt={event.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                  />
                  
                  {/* Category Badge */}
                  <div className="absolute top-3 left-3">
                    <span className={`${currentCategory.color} text-white text-xs px-2.5 sm:px-3 py-1 rounded-full`}>
                      #{currentCategory.name}
                    </span>
                  </div>

                  {/* Save Icon */}
                  <button
                    onClick={(e) => handleSaveClick(e, event.id)}
                    className="absolute top-3 right-3 w-9 h-9 sm:w-10 sm:h-10 bg-white rounded-full flex items-center justify-center hover:bg-gray-100 transition z-10"
                  >
                    <Heart
                      size={18}
                      className={`sm:w-5 sm:h-5 ${savedEventIds.includes(event.id) ? 'text-red-500 fill-red-500' : 'text-gray-600'}`}
                    />
                  </button>

                  {/* Price Badge */}
                  <div className="absolute bottom-3 right-3">
                    <span className={`${event.isFree ? 'bg-emerald-500' : 'bg-blue-500'} text-white text-xs px-2.5 sm:px-3 py-1 rounded-lg font-semibold`}>
                      {event.isFree ? 'Free' : event.price}
                    </span>
                  </div>
                </div>

                <div className="p-4 sm:p-5">
                  <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-3 group-hover:text-cyan-500 transition line-clamp-2">
                    {event.title}
                  </h3>
                  
                  <div className="space-y-2 text-xs sm:text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <span>📅 {event.date}</span>
                      <span>🕒 {event.time}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span>📍 {event.location}</span>
                    </div>
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