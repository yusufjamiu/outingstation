import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Bell, Menu, Video, School, ShoppingBag, Briefcase, Palette, UtensilsCrossed, Dumbbell,
  Heart as HeartIcon, Music, Baby, Users, Gamepad2, Mic2, Tv } from 'lucide-react';
import { UserSidebar } from '../../components/UserSidebar';

export default function CategoryBrowse() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  const user = {
    name: 'Saleem',
    city: 'Lagos',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=User'
  };

  const mainCategories = [
    {
      title: 'Campus Event',
      description: 'Discover events happening in your university and campuses around you.',
      icon: School,
      color: 'bg-blue-100 text-blue-600',
      link: '/dashboard/uni-events'
    },
    {
      title: 'Webinar & Virtual Event',
      description: 'Join online webinars, workshops and immersive virtual experiences.',
      icon: Video,
      color: 'bg-purple-100 text-purple-600',
      link: '/dashboard/web-events'
    },
    {
      title: 'Shopping & Outing',
      description: 'Find local malls, favorite hangouts, cinemas and outing spots.',
      icon: ShoppingBag,
      color: 'bg-pink-100 text-pink-600',
      link: '/dashboard/shopping-events'
    },
    {
      title: 'Business & Tech',
      description: 'Discover amazing business & tech events happening around you.',
      icon: Briefcase,
      color: 'bg-blue-100 text-blue-600',
      link: '/dashboard/category/business-tech'
    },
    {
      title: 'Art & Culture',
      description: 'Discover amazing Art & Culture events happening around you.',
      icon: Palette,
      color: 'bg-purple-100 text-purple-600',
      link: '/dashboard/category/art-culture'
    },
    {
      title: 'Food & Dining',
      description: 'Discover amazing food & dining events happening around you.',
      icon: UtensilsCrossed,
      color: 'bg-orange-100 text-orange-600',
      link: '/dashboard/category/food-dining'
    },
    {
      title: 'Sport & Fitness',
      description: 'Discover amazing sport & fitness events happening around you.',
      icon: Dumbbell,
      color: 'bg-green-100 text-green-600',
      link: '/dashboard/category/sport-fitness'
    },
    {
      title: 'Religion & Community',
      description: 'Discover amazing religion & community events happening around you.',
      icon: HeartIcon,
      color: 'bg-pink-100 text-pink-600',
      link: '/dashboard/category/religion-community'
    },
    {
      title: 'Nightlife & Parties',
      description: 'Discover amazing nightlife & party events happening around you.',
      icon: Music,
      color: 'bg-purple-100 text-purple-600',
      link: '/dashboard/category/nightlife-parties'
    },
    {
      title: 'Family & Kids Fun',
      description: 'Discover amazing family & kids events happening around you.',
      icon: Baby,
      color: 'bg-yellow-100 text-yellow-600',
      link: '/dashboard/category/family-kids-fun'
    },
    {
      title: 'Networking & Social',
      description: 'Discover amazing networking & social events happening around you.',
      icon: Users,
      color: 'bg-teal-100 text-teal-600',
      link: '/dashboard/category/networking-social'
    },
    {
      title: 'Gaming & Esport',
      description: 'Discover amazing gaming & esport events happening around you.',
      icon: Gamepad2,
      color: 'bg-red-100 text-red-600',
      link: '/dashboard/category/gaming-esport'
    },
    {
      title: 'Music & Concerts',
      description: 'Discover amazing music & concert events happening around you.',
      icon: Mic2,
      color: 'bg-pink-100 text-pink-600',
      link: '/dashboard/category/music-concerts'
    },
    {
      title: 'Cinema & Show',
      description: 'Discover amazing cinema & show events happening around you.',
      icon: Tv,
      color: 'bg-gray-100 text-gray-600',
      link: '/dashboard/category/cinema-show'
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

        {/* Content */}
        <div className="p-4 sm:p-6 lg:p-8">
          <div className="mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Browse by Category</h1>
            <p className="text-sm sm:text-base text-gray-600">Select a category to start exploring</p>
          </div>

          {/* Category Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
            {mainCategories.map((category, index) => {
              const Icon = category.icon;
              return (
                <Link 
                  key={index}
                  to={category.link}
                  className="bg-white border border-gray-200 rounded-xl sm:rounded-2xl p-4 sm:p-6 hover:shadow-lg hover:border-cyan-400 transition group"
                >
                  <div className={`w-12 h-12 sm:w-14 sm:h-14 ${category.color} rounded-full flex items-center justify-center mb-3 sm:mb-4`}>
                    <Icon size={24} className="sm:w-7 sm:h-7" />
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-1.5 sm:mb-2 group-hover:text-cyan-500 transition line-clamp-1">
                    {category.title}
                  </h3>
                  <p className="text-gray-600 text-xs sm:text-sm mb-3 sm:mb-4 line-clamp-2">
                    {category.description}
                  </p>
                  <button className="text-cyan-500 text-xs sm:text-sm font-semibold flex items-center gap-1 sm:gap-2 group-hover:gap-2 sm:group-hover:gap-3 transition-all">
                    View All Events →
                  </button>
                </Link>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}