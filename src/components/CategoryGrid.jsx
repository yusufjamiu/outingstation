import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Briefcase, 
  Palette, 
  UtensilsCrossed, 
  Dumbbell, 
  GraduationCap, 
  Heart, 
  Music, 
  Baby,
  Users,
  Gamepad2,
  Mic2,
  Tv
} from 'lucide-react';

export default function CategoryGrid() {
  const categories = [
    { name: 'Business & Tech', icon: Briefcase, slug: 'business-tech' },
    { name: 'Art & Culture', icon: Palette, slug: 'art-culture' },
    { name: 'Food & Dining', icon: UtensilsCrossed, slug: 'food-dining' },
    { name: 'Sport & Fitness', icon: Dumbbell, slug: 'sport-fitness' },
    { name: 'Education & Workshop', icon: GraduationCap, slug: 'education-workshop' },
    { name: 'Religion & Community', icon: Heart, slug: 'religion-community' },
    { name: 'Nightlife & Parties', icon: Music, slug: 'nightlife-parties' },
    { name: 'Family & Kids Fun', icon: Baby, slug: 'family-kids-fun' },
    { name: 'Networking & Social', icon: Users, slug: 'networking-social' },
    { name: 'Gaming & Esport', icon: Gamepad2, slug: 'gaming-esport' },
    { name: 'Music & Concerts', icon: Mic2, slug: 'music-concerts' },
    { name: 'Cinema & Show', icon: Tv, slug: 'cinema-show' },
  ];

  return (
    <section className="bg-white py-16 md:py-24 px-4 md:px-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-3">
            Explore By Filter
          </h2>
          <p className="text-gray-500 text-base md:text-lg">
            Browse our most popular event type
          </p>
        </div>

        {/* Categories Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {categories.map((category, index) => {
            const Icon = category.icon;

            return (
              <Link
                key={index}
                to={`/events?category=${category.slug}`}
                className="bg-white border border-gray-200 rounded-2xl p-6 hover:shadow-lg transition-all duration-300 hover:border-cyan-400"
              >
                <div className="flex flex-col items-center text-center">
                  <div className="w-14 h-14 rounded-full bg-cyan-100 flex items-center justify-center mb-4">
                    <Icon size={26} className="text-cyan-400" />
                  </div>

                  <h3 className="font-semibold text-gray-900 text-sm">
                    {category.name}
                  </h3>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
