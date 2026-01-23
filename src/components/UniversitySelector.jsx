import React from 'react';
import { Link } from 'react-router-dom';
import { Search, MapPin, ArrowRight, School } from 'lucide-react';

const UniversitySelector = () => {
  const universities = [
    {
      name: 'University of Lagos (Unilag)',
      location: 'Lagos, Nigeria.',
      iconColor: 'bg-blue-100 text-blue-600',
      slug: 'university-of-lagos-unilag'
    },
    {
      name: 'King Saud University (KSU)',
      location: 'Riyadh, Saudi Arabia.',
      iconColor: 'bg-green-100 text-green-600',
      slug: 'king-saud-university-ksu'
    },
    {
      name: 'University of Ibadan (UI)',
      location: 'Ibadan, Nigeria.',
      iconColor: 'bg-yellow-100 text-yellow-600',
      slug: 'university-of-ibadan-ui'
    },
    {
      name: 'University of Ghana (Legon)',
      location: 'Accra, Ghana.',
      iconColor: 'bg-purple-100 text-purple-600',
      slug: 'university-of-ghana-legon'
    },
    {
      name: 'Covenant University (CU)',
      location: 'Ota, Nigeria.',
      iconColor: 'bg-red-100 text-red-600',
      slug: 'covenant-university-cu'
    },
    {
      name: 'University of Ilorin (Unilorin)',
      location: 'Ilorin, Nigeria.',
      iconColor: 'bg-indigo-100 text-indigo-600',
      slug: 'university-of-ilorin-unilorin'
    }
  ];

  return (
    <section className="bg-white py-16 md:py-24 px-4 md:px-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-3">
            Find Your Campus
          </h2>
          <p className="text-gray-500 text-base md:text-lg">
            Select your university to browse upcoming event instantly
          </p>
        </div>

        {/* Search Bar */}
        <div className="mb-12">
          <div className="relative">
            <Search className="absolute left-6 top-1/2 transform -translate-y-1/2 text-gray-400" size={24} />
            <input
              type="text"
              placeholder="Search university e.g (Unilag, KSU, Legon)"
              className="w-full pl-16 pr-6 py-4 bg-gray-100 rounded-full text-gray-700 placeholder-gray-400 outline-none focus:ring-2 focus:ring-cyan-400 transition-all"
            />
          </div>
        </div>

        {/* Universities Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-12">
          {universities.map((university, index) => (
            <Link
              key={index}
              to={`/university/${university.slug}`}
              className="bg-white border border-gray-200 rounded-2xl p-6 hover:shadow-lg hover:border-cyan-400 transition-all duration-300 group"
            >
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 md:w-14 md:h-14 rounded-full ${university.iconColor} flex items-center justify-center flex-shrink-0`}>
                  <School size={24} />
                </div>
                <div className="text-left">
                  <h3 className="font-semibold text-gray-900 text-base md:text-lg mb-1">
                    {university.name}
                  </h3>
                  <div className="flex items-center gap-1 text-gray-500 text-sm">
                    <MapPin size={16} />
                    <span>{university.location}</span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Browse All Button */}
        <div className="text-center">
          <Link 
            to="/campus-events"
            className="inline-flex items-center gap-2 text-gray-600 font-medium hover:text-cyan-500 transition-colors group"
          >
            Browse all universities
            <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>
    </section>
  );
};

export default UniversitySelector;