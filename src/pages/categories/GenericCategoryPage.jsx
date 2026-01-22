import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Search, Bell, Heart, ChevronDown } from 'lucide-react';
import { 
  Briefcase, Palette, UtensilsCrossed, Dumbbell, GraduationCap, 
  Heart as HeartIcon, Music, Baby, Users, Gamepad2, Mic2, Tv 
} from 'lucide-react';
// import { UserSidebar } from '../../components/UserSidebar';

export default function GenericCategoryPage() {
  const { slug } = useParams();
  const navigate = useNavigate();

  // ❗ auth will come from context later
  const currentUser = null; // user not logged in

  const user = {
    name: 'Saleem',
    city: 'Lagos',
    avatar: 'https://placehold.co/40x40?text=S'
  };

  const handleSaveClick = (eventId) => {
    if (!currentUser) {
      navigate('/login');
      return;
    }

    // later: save to favorites
    console.log('Saved event:', eventId);
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
      image: 'https://source.unsplash.com/800x600/?business,startup',
      isFree: false,
      price: '₦5,000',
      isSaved: false
    },
    {
      id: 2,
      title: 'Digital Marketing Workshop',
      date: 'Tue, Jan 13',
      time: '3:00 PM',
      location: 'Abuja, Nigeria',
      image: 'https://source.unsplash.com/800x600/?marketing,digital',
      isFree: true,
      isSaved: false
    },
    {
      id: 3,
      title: 'AI & Machine Learning Bootcamp',
      date: 'Wed, Jan 14',
      time: '10:00 AM',
      location: 'Lagos, Nigeria',
      image: 'https://source.unsplash.com/800x600/?ai,technology',
      isFree: false,
      price: '₦15,000',
      isSaved: true
    },
    {
      id: 4,
      title: 'Blockchain & Web3 Summit',
      date: 'Thu, Jan 15',
      time: '2:00 PM',
      location: 'Lagos, Nigeria',
      image: 'https://source.unsplash.com/800x600/?blockchain,crypto',
      isFree: true,
      isSaved: false
    },
    {
      id: 5,
      title: 'Product Design Masterclass',
      date: 'Fri, Jan 16',
      time: '5:00 PM',
      location: 'Ibadan, Nigeria',
      image: 'https://source.unsplash.com/800x600/?design,product',
      isFree: false,
      price: '₦8,000',
      isSaved: false
    },
    {
      id: 6,
      title: 'Cloud Computing Workshop',
      date: 'Sat, Jan 17',
      time: '11:00 AM',
      location: 'Lagos, Nigeria',
      image: 'https://source.unsplash.com/800x600/?cloud,computing',
      isFree: true,
      isSaved: false
    }
  ];

  return (
    <div className="flex h-screen bg-gray-50">
      {/* <UserSidebar activeTab="category" user={user} /> */}

      <main className="flex-1 overflow-y-auto">
        {/* Top Bar */}
        <div className="bg-white border-b border-gray-200 px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex-1 max-w-xl">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Search location, event & more"
                  className="w-full pl-12 pr-4 py-3 bg-gray-50 border-0 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                />
              </div>
            </div>

            <div className="flex items-center gap-4">
              <button className="relative p-2 hover:bg-gray-100 rounded-lg transition">
                <Bell size={24} className="text-gray-600" />
              </button>
              <img src={user.avatar} alt={user.name} className="w-10 h-10 rounded-full cursor-pointer" />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-8">
          {/* Header */}
          <div className="mb-8 flex items-center gap-4">
            <div className={`w-16 h-16 ${currentCategory.color} rounded-2xl flex items-center justify-center`}>
              <CategoryIcon size={32} className="text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-1">{currentCategory.name}</h1>
              <p className="text-gray-600">
                Discover amazing {currentCategory.name.toLowerCase()} events happening around you
              </p>
            </div>
          </div>

          {/* Filters */}
          <div className="flex gap-4 mb-8">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date:</label>
              <select className="px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none">
                <option>Any</option>
                <option>Today</option>
                <option>Tomorrow</option>
                <option>This Week</option>
                <option>This Weekend</option>
                <option>This Month</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Location:</label>
              <select className="px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none">
                <option>All Cities</option>
                <option>Lagos</option>
                <option>Abuja</option>
                <option>Riyadh</option>
                <option>Jeddah</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Price:</label>
              <select className="px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none">
                <option>Any Price</option>
                <option>Free</option>
                <option>Paid</option>
              </select>
            </div>

            <div className="ml-auto flex items-end">
              <p className="text-gray-600 font-medium">{events.length} Events Available</p>
            </div>
          </div>

          {/* Events Grid */}
          <div className="grid grid-cols-3 gap-6">
            {events.map((event) => (
              <div key={event.id} className="bg-white rounded-xl overflow-hidden shadow-md hover:shadow-xl transition group cursor-pointer">
                <div className="relative h-56">
                  <img 
                    src={event.image} 
                    alt={event.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                  />
                  
                  {/* Category Badge */}
                  <div className="absolute top-3 left-3">
                    <span className={`${currentCategory.color} text-white text-xs px-3 py-1 rounded-full`}>
                      #{currentCategory.name}
                    </span>
                  </div>

                  {/* Save Icon */}
                  <button
                    onClick={() => handleSaveClick(event.id)}
                    className="absolute top-3 right-3 w-10 h-10 bg-white rounded-full flex items-center justify-center"
                  >
                    <Heart
                      size={20}
                      className={event.isSaved ? 'text-red-500 fill-red-500' : 'text-gray-600'}
                    />
                  </button>

                  {/* Price Badge */}
                  <div className="absolute bottom-3 right-3">
                    <span className={`${event.isFree ? 'bg-green-500' : 'bg-blue-500'} text-white text-xs px-3 py-1 rounded-full font-semibold`}>
                      {event.isFree ? 'Free' : event.price}
                    </span>
                  </div>
                </div>

                <div className="p-5">
                  <h3 className="text-lg font-bold text-gray-900 mb-3 group-hover:text-primary transition line-clamp-2">
                    {event.title}
                  </h3>
                  
                  <div className="space-y-2 text-sm text-gray-600">
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