import { useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { Video, Briefcase, Palette, UtensilsCrossed, Dumbbell,
  Heart as HeartIcon, Music, Baby, Users, Gamepad2, Mic2, Tv, GraduationCap,
  ShoppingBag, Sparkles } from 'lucide-react';
import campusImg from '../../assets/campus1.jpg';
import campusPlacesImg from '../../assets/campus_places.jpg';

export default function CategoryBrowse() {
  const { searchQuery } = useOutletContext();
  const [activeTab, setActiveTab] = useState('events');

  const eventCategories = [
    { title: 'Business & Tech', icon: Briefcase, bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-100', link: '/dashboard/category/Business & Tech' },
    { title: 'Art & Culture', icon: Palette, bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-100', link: '/dashboard/category/Art & Culture' },
    { title: 'Food & Dining', icon: UtensilsCrossed, bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-100', link: '/dashboard/category/Food & Dining' },
    { title: 'Education', icon: GraduationCap, bg: 'bg-indigo-50', text: 'text-indigo-600', border: 'border-indigo-100', link: '/dashboard/category/Education' },
    { title: 'Sport & Fitness', icon: Dumbbell, bg: 'bg-green-50', text: 'text-green-600', border: 'border-green-100', link: '/dashboard/category/Sport & Fitness' },
    { title: 'Religion & Community', icon: HeartIcon, bg: 'bg-pink-50', text: 'text-pink-600', border: 'border-pink-100', link: '/dashboard/category/Religion & Community' },
    { title: 'Nightlife & Parties', icon: Music, bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-100', link: '/dashboard/category/Nightlife & Parties' },
    { title: 'Family & Kids Fun', icon: Baby, bg: 'bg-yellow-50', text: 'text-yellow-600', border: 'border-yellow-100', link: '/dashboard/category/Family & Kids Fun' },
    { title: 'Networking & Social', icon: Users, bg: 'bg-teal-50', text: 'text-teal-600', border: 'border-teal-100', link: '/dashboard/category/Networking & Social' },
    { title: 'Gaming & Esport', icon: Gamepad2, bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-100', link: '/dashboard/category/Gaming & Esport' },
    { title: 'Music & Concerts', icon: Mic2, bg: 'bg-pink-50', text: 'text-pink-600', border: 'border-pink-100', link: '/dashboard/category/Music & Concerts' },
    { title: 'Cinema & Show', icon: Tv, bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-100', link: '/dashboard/category/Cinema & Show' },
  ];

  const placeCategories = [
    { title: 'Art & Culture', icon: Palette, bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-100', link: '/dashboard/category/Art & Culture?places=true' },
    { title: 'Food & Dining', icon: UtensilsCrossed, bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-100', link: '/dashboard/category/Food & Dining?places=true' },
    { title: 'Sport & Fitness', icon: Dumbbell, bg: 'bg-green-50', text: 'text-green-600', border: 'border-green-100', link: '/dashboard/category/Sport & Fitness?places=true' },
    { title: 'Nightlife & Parties', icon: Music, bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-100', link: '/dashboard/category/Nightlife & Parties?places=true' },
    { title: 'Family & Kids Fun', icon: Baby, bg: 'bg-yellow-50', text: 'text-yellow-600', border: 'border-yellow-100', link: '/dashboard/category/Family & Kids Fun?places=true' },
    { title: 'Cinema & Show', icon: Tv, bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-100', link: '/dashboard/category/Cinema & Show?places=true' },
    // ✅ Places only
    { title: 'Malls', icon: ShoppingBag, bg: 'bg-sky-50', text: 'text-sky-600', border: 'border-sky-100', link: '/dashboard/category/Malls?places=true' },
    { title: 'Spas', icon: Sparkles, bg: 'bg-pink-50', text: 'text-pink-400', border: 'border-pink-100', link: '/dashboard/category/Spas?places=true' },
  ];

  const categories = activeTab === 'events' ? eventCategories : placeCategories;

  const filteredCategories = searchQuery
    ? categories.filter(c => c.title.toLowerCase().includes(searchQuery.toLowerCase()))
    : categories;

  return (
    <div className="p-3 sm:p-6 lg:p-8">

      <div className="mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-3xl font-bold text-gray-900 mb-1">Browse by Category</h1>
        <p className="text-gray-500 text-xs sm:text-sm">Explore events and places across all categories</p>
      </div>

      {!searchQuery && (
        <div className="flex gap-2 mb-4 sm:mb-6">
          <button
            onClick={() => setActiveTab('events')}
            className={`px-4 sm:px-6 py-2 rounded-full font-semibold text-xs sm:text-sm transition ${
              activeTab === 'events' ? 'bg-cyan-500 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:border-cyan-400'
            }`}
          >
            Events
          </button>
          <button
            onClick={() => setActiveTab('places')}
            className={`px-4 sm:px-6 py-2 rounded-full font-semibold text-xs sm:text-sm transition ${
              activeTab === 'places' ? 'bg-cyan-500 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:border-cyan-400'
            }`}
          >
            Places
          </button>
        </div>
      )}

      {activeTab === 'events' && !searchQuery && (
        <Link
          to="/dashboard/web-events"
          className="block mb-4 sm:mb-6 rounded-xl sm:rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition group"
        >
          <div
            className="relative w-full h-24 sm:h-40 flex items-center"
            style={{ background: 'linear-gradient(135deg, #1E3A5F 0%, #0F2340 100%)' }}
          >
            <div className="absolute right-4 top-1/2 -translate-y-1/2 w-20 h-20 sm:w-28 sm:h-28 rounded-full bg-white/5"></div>
            <div className="relative z-10 flex items-center gap-3 sm:gap-5 px-4 sm:px-6 w-full">
              <div className="bg-white/10 rounded-xl p-2 sm:p-3 flex-shrink-0">
                <Video size={20} className="text-white sm:w-7 sm:h-7" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-cyan-400 text-xs font-bold uppercase tracking-wider mb-0.5">Featured</div>
                <h3 className="text-white font-bold text-sm sm:text-xl leading-tight truncate">Webinars & Virtual Events</h3>
                <p className="text-white/70 text-xs line-clamp-1 hidden sm:block">Join online webinars, workshops and virtual experiences</p>
              </div>
              <div className="flex-shrink-0 animate-pulse">
                <div className="flex items-center gap-1 bg-white/10 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-full">
                  <span className="text-white font-semibold text-xs whitespace-nowrap">Explore →</span>
                </div>
              </div>
            </div>
          </div>
        </Link>
      )}

      <div className="mb-4 sm:mb-6">
        <h2 className="text-sm font-bold text-gray-700 mb-2 sm:mb-3">
          {searchQuery ? `Results for "${searchQuery}"` : `All ${activeTab === 'events' ? 'Event' : 'Place'} Categories`}
        </h2>
        {filteredCategories.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-sm">No categories found for "{searchQuery}"</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
            {filteredCategories.map((category, index) => {
              const Icon = category.icon;
              return (
                <Link
                  key={index}
                  to={category.link}
                  className={`bg-white border ${category.border} rounded-xl p-2.5 sm:p-4 flex items-center gap-2 sm:gap-3 hover:shadow-md hover:border-cyan-400 transition group overflow-hidden`}
                >
                  <div className={`${category.bg} ${category.text} rounded-lg p-1.5 sm:p-2.5 flex-shrink-0`}>
                    <Icon size={14} className="sm:w-5 sm:h-5" />
                  </div>
                  <span className="font-semibold text-gray-800 text-xs sm:text-sm group-hover:text-cyan-600 transition leading-tight flex-1 line-clamp-2">
                    {category.title}
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {activeTab === 'events' && !searchQuery && (
        <Link to="/dashboard/uni-events" className="block rounded-xl sm:rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition group">
          <div className="relative w-full h-36 sm:h-52">
            <img src={campusImg} alt="Campus Events" className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/80 to-black/30" />
            <div className="absolute inset-0 flex items-center justify-between px-4 sm:px-8">
              <div className="flex-1 min-w-0 pr-3">
                <div className="inline-block bg-cyan-500 text-white text-xs font-bold px-2.5 py-1 rounded-full mb-1.5 sm:mb-3">🎓 Campus</div>
                <h3 className="text-white font-bold text-base sm:text-3xl mb-1 leading-tight">Campus Events</h3>
                <p className="text-white/80 text-xs sm:text-base line-clamp-1 sm:line-clamp-2">Discover events in universities and campuses around you</p>
              </div>
              <div className="flex-shrink-0 animate-pulse">
                <div className="flex items-center gap-1 bg-white/20 px-2.5 sm:px-5 py-1.5 sm:py-2.5 rounded-full">
                  <span className="text-white font-semibold text-xs sm:text-sm whitespace-nowrap">Explore →</span>
                </div>
              </div>
            </div>
          </div>
        </Link>
      )}

      {activeTab === 'places' && !searchQuery && (
        <Link to="/dashboard/campus-places" className="block rounded-xl sm:rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition group">
          <div className="relative w-full h-36 sm:h-52">
            <img src={campusPlacesImg} alt="Campus Places" className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/80 to-black/30" />
            <div className="absolute inset-0 flex items-center justify-between px-4 sm:px-8">
              <div className="flex-1 min-w-0 pr-3">
                <div className="inline-block bg-purple-500 text-white text-xs font-bold px-2.5 py-1 rounded-full mb-1.5 sm:mb-3">🏛️ Campus Spots</div>
                <h3 className="text-white font-bold text-base sm:text-3xl mb-1 leading-tight">Campus Places</h3>
                <p className="text-white/80 text-xs sm:text-base line-clamp-1 sm:line-clamp-2">Libraries, auditoriums, cafeterias & more on campus</p>
              </div>
              <div className="flex-shrink-0 animate-pulse">
                <div className="flex items-center gap-1 bg-white/20 px-2.5 sm:px-5 py-1.5 sm:py-2.5 rounded-full">
                  <span className="text-white font-semibold text-xs sm:text-sm whitespace-nowrap">Explore →</span>
                </div>
              </div>
            </div>
          </div>
        </Link>
      )}

    </div>
  );
}