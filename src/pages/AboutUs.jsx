import React from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { Search, FileText, Bookmark, Plus, MapPin, Compass, PartyPopper, ArrowRight } from 'lucide-react';

export default function AboutUs() {
  const howItWorksSteps = [
    {
      icon: <Search size={24} />,
      title: 'Discover Events',
      description: 'Visit OutingStation and browse events without creating an account.',
      features: [
        'Search by city (Lagos, Riyadh, Jeddah, Abuja)',
        'Filter by category, date, or price',
        'Explore in-person events, university activities, and webinars'
      ]
    },
    {
      icon: <FileText size={24} />,
      title: 'View Event Details',
      description: 'Click on any event to see:',
      features: [
        'Full description',
        'Date and time',
        'Location with map directions',
        'Price (free or paid)',
        'Organizer information'
      ]
    },
    {
      icon: <Bookmark size={24} />,
      title: 'Save Events',
      description: 'Create a free account to:',
      features: [
        'Save events for later',
        'Keep track of events you\'re interested in',
        'Access your saved events anytime'
      ]
    },
    {
      icon: <Plus size={24} />,
      title: 'Create & Promote Events',
      description: 'Create a free account to:',
      features: [
        'Create and publish events easily',
        'Upload images and descriptions',
        'Reach users searching by city and category'
      ]
    }
  ];

  const processSteps = [
    {
      number: 1,
      icon: <MapPin size={32} />,
      title: 'Choose Your City',
      description: 'Select from our network of vibrant locations, to find exactly what\'s happening near you.'
    },
    {
      number: 2,
      icon: <Compass size={32} />,
      title: 'Discover Events',
      description: 'Browse curated lists filtered by date, category or vibe to find your perfect match.'
    },
    {
      number: 3,
      icon: <PartyPopper size={32} />,
      title: 'Attend and Enjoy!',
      description: 'Get your registration done instantly, head out and make unforgettable memories with friends.'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      {/* Hero Section with Image */}
      <div className="relative h-64 sm:h-80 lg:h-96 overflow-hidden">
        <img 
          src="https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1200&h=400&fit=crop"
          alt="About OutingStation"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/40 to-transparent"></div>
        <div className="absolute inset-0 flex items-center">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white">
              About <span className="text-cyan-400">OutingStation</span>
            </h1>
          </div>
        </div>
      </div>

      {/* Mission Statement */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-4xl">
          <p className="text-base sm:text-lg text-gray-700 leading-relaxed mb-4">
            OutingStation is an event discovery platform that helps people find events, webinars, and experiences happening around them and helps event organizers reach the right audience effortlessly.
          </p>
          <p className="text-base sm:text-lg text-gray-700 leading-relaxed mb-4">
            From tech meetups and university events to workshops, cultural gatherings, and online webinars, OutingStation brings everything into one simple, location-based platform.
          </p>
          <p className="text-base sm:text-lg text-gray-700 leading-relaxed">
            Our goal is to make discovering what's happening around you easy, fast, and enjoyable — while giving organizers a simple way to promote their events to a wider audience. Whether you're a student, professional, family, or community member, OutingStation helps you stay connected to experiences that matter.
          </p>
        </div>
      </div>

      {/* How It Works Section */}
      <div className="bg-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-bold text-center text-gray-900 mb-12">
            How It Works
          </h2>

          {/* Feature Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 mb-16">
            {howItWorksSteps.map((step, index) => (
              <div 
                key={index}
                className="bg-gray-50 rounded-2xl p-6 sm:p-8 border border-gray-200 hover:shadow-lg transition"
              >
                {/* Icon */}
                <div className="w-12 h-12 bg-cyan-100 rounded-full flex items-center justify-center text-cyan-500 mb-4">
                  {step.icon}
                </div>

                {/* Title */}
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  {step.title}
                </h3>

                {/* Description */}
                <p className="text-gray-600 mb-4">
                  {step.description}
                </p>

                {/* Features List */}
                <ul className="space-y-2">
                  {step.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-gray-700">
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></span>
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Process Steps */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12 relative">
            {/* Connector Line - Desktop Only */}
            <div className="hidden md:block absolute top-16 left-0 right-0 h-0.5 bg-gray-200 -z-10"></div>

            {processSteps.map((step, index) => (
              <div key={index} className="relative">
                {/* Step Number Circle */}
                <div className="flex justify-center mb-6">
                  <div className="relative">
                    <div className="w-16 h-16 bg-white border-4 border-cyan-400 rounded-full flex items-center justify-center shadow-lg">
                      <span className="text-2xl font-bold text-cyan-500">{step.number}</span>
                    </div>
                  </div>
                </div>

                {/* Icon Circle */}
                <div className="flex justify-center mb-6">
                  <div className="w-20 h-20 bg-cyan-100 rounded-full flex items-center justify-center text-cyan-500">
                    {step.icon}
                  </div>
                </div>

                {/* Content */}
                <div className="text-center">
                  <h3 className="text-xl font-bold text-gray-900 mb-3">
                    {step.title}
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* CTA Button */}
          <div className="flex justify-center mt-12">
            <Link
              to="/signup"
              className="inline-flex items-center gap-2 px-8 py-4 bg-cyan-400 text-white rounded-full font-semibold hover:bg-cyan-500 transition shadow-lg hover:shadow-xl"
            >
              Get Started Now
              <ArrowRight size={20} />
            </Link>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}