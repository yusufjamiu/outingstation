import React, { useEffect, useRef, useState } from 'react';
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
  const [visibleCards, setVisibleCards] = useState([]);
  const cardRefs = useRef([]);

  const categories = [
    { name: 'Business & Tech', icon: Briefcase, slug: 'business-tech', bg: 'bg-blue-50', iconBg: 'bg-blue-100', iconColor: 'text-blue-500', hoverBorder: 'hover:border-blue-400', hoverBg: 'hover:bg-blue-50' },
    { name: 'Art & Culture', icon: Palette, slug: 'art-culture', bg: 'bg-pink-50', iconBg: 'bg-pink-100', iconColor: 'text-pink-500', hoverBorder: 'hover:border-pink-400', hoverBg: 'hover:bg-pink-50' },
    { name: 'Food & Dining', icon: UtensilsCrossed, slug: 'food-dining', bg: 'bg-orange-50', iconBg: 'bg-orange-100', iconColor: 'text-orange-500', hoverBorder: 'hover:border-orange-400', hoverBg: 'hover:bg-orange-50' },
    { name: 'Sport & Fitness', icon: Dumbbell, slug: 'sport-fitness', bg: 'bg-green-50', iconBg: 'bg-green-100', iconColor: 'text-green-500', hoverBorder: 'hover:border-green-400', hoverBg: 'hover:bg-green-50' },
    { name: 'Education & Workshop', icon: GraduationCap, slug: 'education-workshop', bg: 'bg-yellow-50', iconBg: 'bg-yellow-100', iconColor: 'text-yellow-500', hoverBorder: 'hover:border-yellow-400', hoverBg: 'hover:bg-yellow-50' },
    { name: 'Religion & Community', icon: Heart, slug: 'religion-community', bg: 'bg-red-50', iconBg: 'bg-red-100', iconColor: 'text-red-500', hoverBorder: 'hover:border-red-400', hoverBg: 'hover:bg-red-50' },
    { name: 'Nightlife & Parties', icon: Music, slug: 'nightlife-parties', bg: 'bg-purple-50', iconBg: 'bg-purple-100', iconColor: 'text-purple-500', hoverBorder: 'hover:border-purple-400', hoverBg: 'hover:bg-purple-50' },
    { name: 'Family & Kids Fun', icon: Baby, slug: 'family-kids-fun', bg: 'bg-cyan-50', iconBg: 'bg-cyan-100', iconColor: 'text-cyan-500', hoverBorder: 'hover:border-cyan-400', hoverBg: 'hover:bg-cyan-50' },
    { name: 'Networking & Social', icon: Users, slug: 'networking-social', bg: 'bg-teal-50', iconBg: 'bg-teal-100', iconColor: 'text-teal-500', hoverBorder: 'hover:border-teal-400', hoverBg: 'hover:bg-teal-50' },
    { name: 'Gaming & Esport', icon: Gamepad2, slug: 'gaming-esport', bg: 'bg-indigo-50', iconBg: 'bg-indigo-100', iconColor: 'text-indigo-500', hoverBorder: 'hover:border-indigo-400', hoverBg: 'hover:bg-indigo-50' },
    { name: 'Music & Concerts', icon: Mic2, slug: 'music-concerts', bg: 'bg-rose-50', iconBg: 'bg-rose-100', iconColor: 'text-rose-500', hoverBorder: 'hover:border-rose-400', hoverBg: 'hover:bg-rose-50' },
    { name: 'Cinema & Show', icon: Tv, slug: 'cinema-show', bg: 'bg-amber-50', iconBg: 'bg-amber-100', iconColor: 'text-amber-500', hoverBorder: 'hover:border-amber-400', hoverBg: 'hover:bg-amber-50' },
  ];

  useEffect(() => {
    const observers = cardRefs.current.map((el, i) => {
      if (!el) return null;
      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setTimeout(() => {
              setVisibleCards(prev => {
                if (prev.includes(i)) return prev;
                return [...prev, i];
              });
            }, i * 80);
          } else {
            setVisibleCards(prev => prev.filter(v => v !== i));
          }
        },
        { threshold: 0.15 }
      );
      obs.observe(el);
      return obs;
    });
    return () => observers.forEach(o => o && o.disconnect());
  }, []);

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
            const isVisible = visibleCards.includes(index);

            return (
              <Link
                key={index}
                ref={el => cardRefs.current[index] = el}
                to={`/category/${category.slug}`}
                className={`
                  group border border-gray-200 rounded-2xl p-6
                  transition-all duration-300
                  ${category.hoverBorder} ${category.hoverBg}
                  hover:shadow-lg hover:-translate-y-1
                  ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}
                `}
                style={{ transitionDuration: isVisible ? '500ms' : '300ms' }}
              >
                <div className="flex flex-col items-center text-center">
                  <div className={`w-14 h-14 rounded-full ${category.iconBg} flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-110`}>
                    <Icon size={26} className={category.iconColor} />
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