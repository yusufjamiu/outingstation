import { useState } from 'react';
import { Link, useNavigate, useOutletContext } from 'react-router-dom';
import { Video, School, GraduationCap, Briefcase, Palette, UtensilsCrossed, Dumbbell,
  Heart as HeartIcon, Music, Baby, Users, Gamepad2, Mic2, Tv } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function CategoryBrowse() {
  const navigate = useNavigate();
  const { currentUser, userProfile } = useAuth();
  
  // ✅ Get searchQuery from parent UserLayout (not used but available)
  const { searchQuery } = useOutletContext();

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
      title: 'Business & Tech',
      description: 'Discover amazing business & tech events happening around you.',
      icon: Briefcase,
      color: 'bg-blue-100 text-blue-600',
      link: '/dashboard/category/Business & Tech'
    },
    {
      title: 'Art & Culture',
      description: 'Discover amazing Art & Culture events happening around you.',
      icon: Palette,
      color: 'bg-purple-100 text-purple-600',
      link: '/dashboard/category/Art & Culture'
    },
    {
      title: 'Food & Dining',
      description: 'Discover amazing food & dining events happening around you.',
      icon: UtensilsCrossed,
      color: 'bg-orange-100 text-orange-600',
      link: '/dashboard/category/Food & Dining'
    },
    {
      title: 'Sport & Fitness',
      description: 'Discover amazing sport & fitness events happening around you.',
      icon: Dumbbell,
      color: 'bg-green-100 text-green-600',
      link: '/dashboard/category/Sport & Fitness'
    },
    {
      title: 'Religion & Community',
      description: 'Discover amazing religion & community events happening around you.',
      icon: HeartIcon,
      color: 'bg-pink-100 text-pink-600',
      link: '/dashboard/category/Religion & Community'
    },
    {
      title: 'Nightlife & Parties',
      description: 'Discover amazing nightlife & party events happening around you.',
      icon: Music,
      color: 'bg-purple-100 text-purple-600',
      link: '/dashboard/category/Nightlife & Parties'
    },
    {
      title: 'Family & Kids Fun',
      description: 'Discover amazing family & kids events happening around you.',
      icon: Baby,
      color: 'bg-yellow-100 text-yellow-600',
      link: '/dashboard/category/Family & Kids Fun'
    },
    {
      title: 'Networking & Social',
      description: 'Discover amazing networking & social events happening around you.',
      icon: Users,
      color: 'bg-teal-100 text-teal-600',
      link: '/dashboard/category/Networking & Social'
    },
    {
      title: 'Gaming & Esport',
      description: 'Discover amazing gaming & esport events happening around you.',
      icon: Gamepad2,
      color: 'bg-red-100 text-red-600',
      link: '/dashboard/category/Gaming & Esport'
    },
    {
      title: 'Music & Concerts',
      description: 'Discover amazing music & concert events happening around you.',
      icon: Mic2,
      color: 'bg-pink-100 text-pink-600',
      link: '/dashboard/category/Music & Concerts'
    },
    {
      title: 'Cinema & Show',
      description: 'Discover amazing cinema & show events happening around you.',
      icon: Tv,
      color: 'bg-gray-100 text-gray-600',
      link: '/dashboard/category/Cinema & Show'
    },
    {
      title: 'Education',
      description: 'Discover amazing education events happening around you.',
      icon: GraduationCap,
      color: 'bg-indigo-100 text-indigo-600',
      link: '/dashboard/category/Education'
    }
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Browse by Category</h1>
        <p className="text-sm sm:text-base text-gray-600">Select a category to start exploring</p>
      </div>

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
  );
}