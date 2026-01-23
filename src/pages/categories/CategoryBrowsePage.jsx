import { Link } from 'react-router-dom';
import { Video, School, ShoppingBag, Briefcase, Palette, UtensilsCrossed, Dumbbell,
  Heart as HeartIcon, Music, Baby, Users, Gamepad2, Mic2, Tv } from 'lucide-react';
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";

export default function CategoryBrowsePage() {
  const mainCategories = [
    {
      title: 'Campus Event',
      description: 'Discover events happening in your university and campuses around you.',
      icon: School,
      color: 'bg-blue-100 text-blue-600',
      link: '/campus-events'
    },
    {
      title: 'Webinar & Virtual Event',
      description: 'Join online webinars, workshops and immersive virtual experiences.',
      icon: Video,
      color: 'bg-purple-100 text-purple-600',
      link: '/webinar-events'
    },
    {
      title: 'Shopping & Outing',
      description: 'Find local malls, favorite hangouts, cinemas and outing spots.',
      icon: ShoppingBag,
      color: 'bg-pink-100 text-pink-600',
      link: '/shopping-events'
    },
    {
      title: 'Business & Tech',
      description: 'Discover amazing business & tech events happening around you.',
      icon: Briefcase,
      color: 'bg-blue-100 text-blue-600',
      link: '/category/business-tech'
    },
    {
      title: 'Art & Culture',
      description: 'Discover amazing Art & Culture events happening around you.',
      icon: Palette,
      color: 'bg-purple-100 text-purple-600',
      link: '/category/art-culture'
    },
    {
      title: 'Food & Dining',
      description: 'Discover amazing food & dining events happening around you.',
      icon: UtensilsCrossed,
      color: 'bg-orange-100 text-orange-600',
      link: '/category/food-dining'
    },
    {
      title: 'Sport & Fitness',
      description: 'Discover amazing sport & fitness events happening around you.',
      icon: Dumbbell,
      color: 'bg-green-100 text-green-600',
      link: '/category/sport-fitness'
    },
    {
      title: 'Religion & Community',
      description: 'Discover amazing religion & community events happening around you.',
      icon: HeartIcon,
      color: 'bg-pink-100 text-pink-600',
      link: '/category/religion-community'
    },
    {
      title: 'Nightlife & Parties',
      description: 'Discover amazing nightlife & party events happening around you.',
      icon: Music,
      color: 'bg-purple-100 text-purple-600',
      link: '/category/nightlife-parties'
    },
    {
      title: 'Family & Kids Fun',
      description: 'Discover amazing family & kids events happening around you.',
      icon: Baby,
      color: 'bg-yellow-100 text-yellow-600',
      link: '/category/family-kids-fun'
    },
    {
      title: 'Networking & Social',
      description: 'Discover amazing networking & social events happening around you.',
      icon: Users,
      color: 'bg-teal-100 text-teal-600',
      link: '/category/networking-social'
    },
    {
      title: 'Gaming & Esport',
      description: 'Discover amazing gaming & esport events happening around you.',
      icon: Gamepad2,
      color: 'bg-red-100 text-red-600',
      link: '/category/gaming-esport'
    },
    {
      title: 'Music & Concerts',
      description: 'Discover amazing music & concert events happening around you.',
      icon: Mic2,
      color: 'bg-pink-100 text-pink-600',
      link: '/category/music-concerts'
    },
    {
      title: 'Cinema & Show',
      description: 'Discover amazing cinema & show events happening around you.',
      icon: Tv,
      color: 'bg-gray-100 text-gray-600',
      link: '/category/cinema-show'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Header - Centered */}
        <div className="text-center mb-8 sm:mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">Browse by Category</h1>
          <p className="text-gray-600 text-sm sm:text-base max-w-2xl mx-auto">
            Select a category to start exploring amazing events happening around you
          </p>
        </div>

        {/* Category Cards Grid - Responsive */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
          {mainCategories.map((category, index) => {
            const Icon = category.icon;
            return (
              <Link 
                key={index}
                to={category.link}
                className="bg-white border border-gray-200 rounded-2xl p-6 sm:p-8 hover:shadow-lg hover:border-primary transition group"
              >
                <div className={`w-14 h-14 sm:w-16 sm:h-16 ${category.color} rounded-full flex items-center justify-center mb-4 sm:mb-6`}>
                  <Icon size={28} className="sm:w-8 sm:h-8" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2 sm:mb-3 group-hover:text-primary transition">
                  {category.title}
                </h3>
                <p className="text-gray-600 text-sm sm:text-base mb-4 sm:mb-6 line-clamp-2">
                  {category.description}
                </p>
                <button className="text-primary text-sm sm:text-base font-semibold flex items-center gap-2 group-hover:gap-3 transition-all">
                  View All Events →
                </button>
              </Link>
            );
          })}
        </div>
      </main>

      <Footer />
    </div>
  );
}