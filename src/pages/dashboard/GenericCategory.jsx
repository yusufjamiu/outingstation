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
  const [savedEventIds, setSavedEventIds] = useState([3]);
  const [activeTab, setActiveTab] = useState('events'); // events or places
  const [religionFilter, setReligionFilter] = useState('all');

  const user = {
    name: 'Saleem',
    city: 'Lagos',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=User'
  };

  const handleEventClick = (eventId) => {
    navigate(`/event/${eventId}`);
  };

  const handleSaveClick = (e, eventId) => {
    e.stopPropagation();
    
    if (savedEventIds.includes(eventId)) {
      setSavedEventIds(savedEventIds.filter(id => id !== eventId));
    } else {
      setSavedEventIds([...savedEventIds, eventId]);
    }
    // TODO: Update savedEvents in Firebase
  };

  // Category mapping
  const categoryMap = {
    'business-tech': { name: 'Business & Tech', icon: Briefcase, color: 'bg-blue-500', hasPlaces: false, isReligion: false },
    'art-culture': { name: 'Art & Culture', icon: Palette, color: 'bg-purple-500', hasPlaces: true, isReligion: false },
    'food-dining': { name: 'Food & Dining', icon: UtensilsCrossed, color: 'bg-orange-500', hasPlaces: true, isReligion: false },
    'sport-fitness': { name: 'Sport & Fitness', icon: Dumbbell, color: 'bg-green-500', hasPlaces: true, isReligion: false },
    'education-workshop': { name: 'Education & Workshop', icon: GraduationCap, color: 'bg-indigo-500', hasPlaces: false, isReligion: false },
    'religion-community': { name: 'Religion & Community', icon: HeartIcon, color: 'bg-pink-500', hasPlaces: false, isReligion: true },
    'nightlife-parties': { name: 'Nightlife & Parties', icon: Music, color: 'bg-purple-600', hasPlaces: true, isReligion: false },
    'family-kids-fun': { name: 'Family & Kids Fun', icon: Baby, color: 'bg-yellow-500', hasPlaces: true, isReligion: false },
    'networking-social': { name: 'Networking & Social', icon: Users, color: 'bg-teal-500', hasPlaces: false, isReligion: false },
    'gaming-esport': { name: 'Gaming & Esport', icon: Gamepad2, color: 'bg-red-500', hasPlaces: false, isReligion: false },
    'music-concerts': { name: 'Music & Concerts', icon: Mic2, color: 'bg-pink-600', hasPlaces: false, isReligion: false },
    'cinema-show': { name: 'Cinema & Show', icon: Tv, color: 'bg-gray-700', hasPlaces: false, isReligion: false }
  };

  const currentCategory = categoryMap[slug] || categoryMap['business-tech'];
  const CategoryIcon = currentCategory.icon;

  // Mock events
  const allEvents = [
    {
      id: 1,
      title: 'Tech Startup Pitch Night',
      date: 'Mon, Jan 12',
      time: '6:00 PM',
      location: 'Lagos, Nigeria',
      image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&q=80',
      isFree: false,
      price: '₦5,000',
      subCategory: 'events'
    },
    {
      id: 2,
      title: 'Digital Marketing Workshop',
      date: 'Tue, Jan 13',
      time: '3:00 PM',
      location: 'Abuja, Nigeria',
      image: 'https://images.unsplash.com/photo-1556761175-b413da4baf72?w=800&q=80',
      isFree: true,
      subCategory: 'events'
    },
    {
      id: 3,
      title: 'The Creative Hub',
      date: 'Always Open',
      time: '9:00 AM - 6:00 PM',
      location: 'Lagos, Nigeria',
      image: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&q=80',
      isFree: false,
      price: '₦2,000',
      subCategory: 'places'
    },
    {
      id: 4,
      title: 'AI & Machine Learning Bootcamp',
      date: 'Wed, Jan 14',
      time: '10:00 AM',
      location: 'Lagos, Nigeria',
      image: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=800&q=80',
      isFree: false,
      price: '₦15,000',
      subCategory: 'events'
    }
  ];

  const events = allEvents.filter(event => event.subCategory === activeTab);

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
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
                Discover amazing {currentCategory.name.toLowerCase()} {currentCategory.hasPlaces ? 'events & places' : 'events'} happening around you
              </p>
            </div>
          </div>

          {/* Events/Places Tabs */}
          {currentCategory.hasPlaces && (
            <div className="flex gap-2 mb-6 border-b border-gray-200">
              <button
                onClick={() => setActiveTab('events')}
                className={`px-6 py-3 font-medium transition-colors ${
                  activeTab === 'events'
                    ? 'border-b-2 border-cyan-500 text-cyan-500'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Events
              </button>
              <button
                onClick={() => setActiveTab('places')}
                className={`px-6 py-3 font-medium transition-colors ${
                  activeTab === 'places'
                    ? 'border-b-2 border-cyan-500 text-cyan-500'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Places
              </button>
            </div>
          )}

          {/* Religion Filter */}
          {currentCategory.isReligion && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Religion:</label>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setReligionFilter('all')}
                  className={`px-4 py-2 rounded-lg font-medium transition ${
                    religionFilter === 'all'
                      ? 'bg-cyan-500 text-white'
                      : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setReligionFilter('Christianity')}
                  className={`px-4 py-2 rounded-lg font-medium transition ${
                    religionFilter === 'Christianity'
                      ? 'bg-cyan-500 text-white'
                      : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Christianity
                </button>
                <button
                  onClick={() => setReligionFilter('Islam')}
                  className={`px-4 py-2 rounded-lg font-medium transition ${
                    religionFilter === 'Islam'
                      ? 'bg-cyan-500 text-white'
                      : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Islam
                </button>
                <button
                  onClick={() => setReligionFilter('Others')}
                  className={`px-4 py-2 rounded-lg font-medium transition ${
                    religionFilter === 'Others'
                      ? 'bg-cyan-500 text-white'
                      : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Others
                </button>
              </div>
            </div>
          )}

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
              <p className="text-sm sm:text-base text-gray-600 font-medium">
                {events.length} {activeTab === 'places' ? 'Places' : 'Events'} Available
              </p>
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
                  
                  <div className="absolute top-3 left-3">
                    <span className={`${currentCategory.color} text-white text-xs px-2.5 sm:px-3 py-1 rounded-full`}>
                      #{currentCategory.name}
                    </span>
                  </div>

                  <button
                    onClick={(e) => handleSaveClick(e, event.id)}
                    className="absolute top-3 right-3 w-9 h-9 sm:w-10 sm:h-10 bg-white rounded-full flex items-center justify-center hover:bg-gray-100 transition z-10"
                  >
                    <Heart
                      size={18}
                      className={`sm:w-5 sm:h-5 ${savedEventIds.includes(event.id) ? 'text-red-500 fill-red-500' : 'text-gray-600'}`}
                    />
                  </button>

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

          {/* Empty State */}
          {events.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">No {activeTab} available in this category yet.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}