import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Video, Briefcase, Palette, UtensilsCrossed, Dumbbell,
  Heart as HeartIcon, Music, Baby, Users, Gamepad2, Mic2, Tv, GraduationCap,
  ChevronRight } from 'lucide-react';
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import campusImg from '../../assets/campus1.jpg';
import campusPlacesImg from '../../assets/campus_places.jpg';

export default function CategoryBrowsePage() {
  const [activeTab, setActiveTab] = useState('events');

  const eventCategories = [
    { title: 'Business & Tech', icon: Briefcase, bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-100', link: '/category/business-tech' },
    { title: 'Art & Culture', icon: Palette, bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-100', link: '/category/art-culture' },
    { title: 'Food & Dining', icon: UtensilsCrossed, bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-100', link: '/category/food-dining' },
    { title: 'Education', icon: GraduationCap, bg: 'bg-indigo-50', text: 'text-indigo-600', border: 'border-indigo-100', link: '/category/education' },
    { title: 'Sport & Fitness', icon: Dumbbell, bg: 'bg-green-50', text: 'text-green-600', border: 'border-green-100', link: '/category/sport-fitness' },
    { title: 'Religion & Community', icon: HeartIcon, bg: 'bg-pink-50', text: 'text-pink-600', border: 'border-pink-100', link: '/category/religion-community' },
    { title: 'Nightlife & Parties', icon: Music, bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-100', link: '/category/nightlife-parties' },
    { title: 'Family & Kids Fun', icon: Baby, bg: 'bg-yellow-50', text: 'text-yellow-600', border: 'border-yellow-100', link: '/category/family-kids-fun' },
    { title: 'Networking & Social', icon: Users, bg: 'bg-teal-50', text: 'text-teal-600', border: 'border-teal-100', link: '/category/networking-social' },
    { title: 'Gaming & Esport', icon: Gamepad2, bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-100', link: '/category/gaming-esport' },
    { title: 'Music & Concerts', icon: Mic2, bg: 'bg-pink-50', text: 'text-pink-600', border: 'border-pink-100', link: '/category/music-concerts' },
    { title: 'Cinema & Show', icon: Tv, bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-100', link: '/category/cinema-show' },
  ];

  const placeCategories = [
    { title: 'Art & Culture', icon: Palette, bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-100', link: '/category/art-culture?places=true' },
    { title: 'Food & Dining', icon: UtensilsCrossed, bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-100', link: '/category/food-dining?places=true' },
    { title: 'Sport & Fitness', icon: Dumbbell, bg: 'bg-green-50', text: 'text-green-600', border: 'border-green-100', link: '/category/sport-fitness?places=true' },
    { title: 'Nightlife & Parties', icon: Music, bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-100', link: '/category/nightlife-parties?places=true' },
    { title: 'Family & Kids Fun', icon: Baby, bg: 'bg-yellow-50', text: 'text-yellow-600', border: 'border-yellow-100', link: '/category/family-kids-fun?places=true' },
    { title: 'Cinema & Show', icon: Tv, bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-100', link: '/category/cinema-show?places=true' },
  ];

  const categories = activeTab === 'events' ? eventCategories : placeCategories;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-12">

        {/* Header */}
        <div className="mb-4 sm:mb-6">
          <h1 className="text-2xl sm:text-4xl font-bold text-gray-900 mb-1 sm:mb-2">
            Browse by Category
          </h1>
          <p className="text-gray-500 text-xs sm:text-base">
            Explore events and places across all categories
          </p>
        </div>

        {/* ✅ Tab Switcher */}
        <div className="flex gap-2 mb-5 sm:mb-8">
          <button
            onClick={() => setActiveTab('events')}
            className={`px-4 sm:px-6 py-2 rounded-full font-semibold text-xs sm:text-sm transition ${
              activeTab === 'events'
                ? 'bg-cyan-500 text-white'
                : 'bg-white text-gray-600 border border-gray-200 hover:border-cyan-400'
            }`}
          >
            Events
          </button>
          <button
            onClick={() => setActiveTab('places')}
            className={`px-4 sm:px-6 py-2 rounded-full font-semibold text-xs sm:text-sm transition ${
              activeTab === 'places'
                ? 'bg-cyan-500 text-white'
                : 'bg-white text-gray-600 border border-gray-200 hover:border-cyan-400'
            }`}
          >
            Places
          </button>
        </div>

        {/* ✅ Webinar Banner — Events tab only */}
        {activeTab === 'events' && (
          <Link
            to="/webinar-events"
            className="block mb-5 sm:mb-8 rounded-xl sm:rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition group"
          >
            <div
              className="relative w-full h-24 sm:h-40 flex items-center"
              style={{ background: 'linear-gradient(135deg, #1E3A5F 0%, #0F2340 100%)' }}
            >
              <div className="absolute right-4 top-1/2 -translate-y-1/2 w-20 h-20 sm:w-32 sm:h-32 rounded-full bg-white/5"></div>
              <div className="relative z-10 flex items-center gap-3 sm:gap-6 px-4 sm:px-8 w-full">
                <div className="bg-white/10 rounded-xl p-2 sm:p-4 flex-shrink-0">
                  <Video size={20} className="text-white sm:w-9 sm:h-9" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-cyan-400 text-xs font-bold uppercase tracking-wider mb-0.5">
                    Featured
                  </div>
                  <h3 className="text-white font-bold text-sm sm:text-2xl leading-tight truncate">
                    Webinars & Virtual Events
                  </h3>
                  <p className="text-white/70 text-xs line-clamp-1 hidden sm:block">
                    Join online webinars, workshops and immersive virtual experiences
                  </p>
                </div>
                <div className="flex-shrink-0 animate-pulse">
                  <div className="flex items-center gap-1 bg-white/10 px-2.5 sm:px-5 py-1.5 sm:py-2.5 rounded-full">
                    <span className="text-white font-semibold text-xs sm:text-sm whitespace-nowrap">
                      Explore →
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </Link>
        )}

        {/* ✅ Categories Grid */}
        <div className="mb-5 sm:mb-8">
          <h2 className="text-sm sm:text-base font-bold text-gray-700 mb-3">
            All {activeTab === 'events' ? 'Event' : 'Place'} Categories
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
            {categories.map((category, index) => {
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
        </div>

        {/* ✅ Campus Events Banner — bottom, events tab */}
        {activeTab === 'events' && (
          <Link
            to="/campus-events"
            className="block rounded-xl sm:rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition group"
          >
            <div className="relative w-full h-36 sm:h-52">
              <img
                src={campusImg}
                alt="Campus Events"
                className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-black/80 to-black/30" />
              <div className="absolute inset-0 flex items-center justify-between px-4 sm:px-8">
                <div className="flex-1 min-w-0 pr-3">
                  <div className="inline-block bg-cyan-500 text-white text-xs font-bold px-2.5 py-1 rounded-full mb-1.5 sm:mb-3">
                    🎓 Campus
                  </div>
                  <h3 className="text-white font-bold text-base sm:text-3xl mb-1 leading-tight">
                    Campus Events
                  </h3>
                  <p className="text-white/80 text-xs sm:text-base line-clamp-1 sm:line-clamp-2">
                    Discover events in universities and campuses around you
                  </p>
                </div>
                <div className="flex-shrink-0 animate-pulse">
                  <div className="flex items-center gap-1 bg-white/20 px-2.5 sm:px-5 py-1.5 sm:py-2.5 rounded-full">
                    <span className="text-white font-semibold text-xs sm:text-sm whitespace-nowrap">
                      Explore →
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </Link>
        )}

        {/* ✅ Campus Places Banner — bottom, places tab */}
        {activeTab === 'places' && (
          <Link
            to="/campus-places"
            className="block rounded-xl sm:rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition group"
          >
            <div className="relative w-full h-36 sm:h-52">
              <img
                src={campusPlacesImg}
                alt="Campus Places"
                className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-black/80 to-black/30" />
              <div className="absolute inset-0 flex items-center justify-between px-4 sm:px-8">
                <div className="flex-1 min-w-0 pr-3">
                  <div className="inline-block bg-purple-500 text-white text-xs font-bold px-2.5 py-1 rounded-full mb-1.5 sm:mb-3">
                    🏛️ Campus Spots
                  </div>
                  <h3 className="text-white font-bold text-base sm:text-3xl mb-1 leading-tight">
                    Campus Places
                  </h3>
                  <p className="text-white/80 text-xs sm:text-base line-clamp-1 sm:line-clamp-2">
                    Libraries, auditoriums, cafeterias & more on campus
                  </p>
                </div>
                <div className="flex-shrink-0 animate-pulse">
                  <div className="flex items-center gap-1 bg-white/20 px-2.5 sm:px-5 py-1.5 sm:py-2.5 rounded-full">
                    <span className="text-white font-semibold text-xs sm:text-sm whitespace-nowrap">
                      Explore →
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </Link>
        )}

      </main>

      <Footer />
    </div>
  );
}