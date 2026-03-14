import React from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { Search, FileText, Bookmark, Plus, MapPin, Compass, PartyPopper, ArrowRight, Check } from 'lucide-react';

export default function HowItWorks() {
  const userSteps = [
    {
      icon: <Search size={28} />,
      title: 'Discover Events',
      description: 'Visit OutingStation and browse events without creating an account.',
      features: [
        'Search by city (Lagos, Riyadh, Jeddah, Abuja)',
        'Filter by category, date, or price',
        'Explore in-person events, university activities, and webinars'
      ],
      color: 'bg-blue-500'
    },
    {
      icon: <FileText size={28} />,
      title: 'View Event Details',
      description: 'Click on any event to see:',
      features: [
        'Full description',
        'Date and time',
        'Location with map directions',
        'Price (free or paid)',
        'Organizer information'
      ],
      color: 'bg-purple-500'
    },
    {
      icon: <Bookmark size={28} />,
      title: 'Save Events',
      description: 'Create a free account to:',
      features: [
        'Save events for later',
        'Keep track of events you\'re interested in',
        'Access your saved events anytime'
      ],
      color: 'bg-pink-500'
    },
    {
      icon: <Plus size={28} />,
      title: 'Create & Promote Events',
      description: 'Become an organizer to:',
      features: [
        'Create and publish events easily',
        'Upload images and descriptions',
        'Reach users searching by city and category'
      ],
      color: 'bg-emerald-500'
    }
  ];

  const processSteps = [
    {
      number: 1,
      icon: <MapPin size={40} />,
      title: 'Choose Your City',
      description: 'Select from our network of vibrant locations to find exactly what\'s happening near you.',
      tips: [
        'Browse all cities or search for yours',
        'See events specific to your location',
        'Discover local experiences'
      ]
    },
    {
      number: 2,
      icon: <Compass size={40} />,
      title: 'Discover Events',
      description: 'Browse curated lists filtered by date, category or vibe to find your perfect match.',
      tips: [
        'Filter by category (tech, culture, nightlife, etc.)',
        'Sort by date, price, or popularity',
        'Save interesting events for later'
      ]
    },
    {
      number: 3,
      icon: <PartyPopper size={40} />,
      title: 'Attend and Enjoy!',
      description: 'Get your registration done instantly, head out and make unforgettable memories.',
      tips: [
        'Register directly through event links',
        'Get directions via Google Maps',
        'Share events with friends'
      ]
    }
  ];

  const organizerSteps = [
    {
      step: 1,
      title: 'Sign Up',
      description: 'Create a free account in seconds'
    },
    {
      step: 2,
      title: 'Create Event',
      description: 'Fill in event details, upload images, set pricing'
    },
    {
      step: 3,
      title: 'Publish',
      description: 'Make your event visible to thousands of users'
    },
    {
      step: 4,
      title: 'Reach Audience',
      description: 'Users discover your event through search and categories'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      {/* Hero Section */}
      <div className="relative bg-gradient-to-r from-cyan-400 to-cyan-500 py-16 sm:py-20 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6">
              How <span className="text-gray-900">OutingStation</span> Works
            </h1>
            <p className="text-lg sm:text-xl text-white/90 max-w-3xl mx-auto">
              Whether you're discovering events or organizing your own, OutingStation makes it simple and straightforward
            </p>
          </div>
        </div>
      </div>

      {/* For Users Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            For Event Seekers
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Find and attend amazing events in just a few steps
          </p>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
          {userSteps.map((step, index) => (
            <div 
              key={index}
              className="bg-white rounded-2xl p-6 sm:p-8 border border-gray-200 hover:shadow-xl transition"
            >
              {/* Icon */}
              <div className={`w-14 h-14 ${step.color} rounded-2xl flex items-center justify-center text-white mb-4`}>
                {step.icon}
              </div>

              {/* Title */}
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3">
                {step.title}
              </h3>

              {/* Description */}
              <p className="text-gray-600 mb-4">
                {step.description}
              </p>

              {/* Features List */}
              <ul className="space-y-2">
                {step.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-3 text-gray-700">
                    <Check size={20} className="text-emerald-500 flex-shrink-0 mt-0.5" />
                    <span className="text-sm sm:text-base">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Process Steps */}
      <div className="bg-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Your Journey to Great Events
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Three simple steps from discovery to unforgettable experiences
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12 relative">
            {/* Connector Line - Desktop Only */}
            <div className="hidden lg:block absolute top-20 left-0 right-0 h-1 bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 -z-10"></div>

            {processSteps.map((step, index) => (
              <div key={index} className="relative">
                {/* Step Number Circle */}
                <div className="flex justify-center mb-6">
                  <div className="relative z-10">
                    <div className="w-20 h-20 bg-white border-4 border-cyan-400 rounded-full flex items-center justify-center shadow-lg">
                      <span className="text-3xl font-bold text-cyan-500">{step.number}</span>
                    </div>
                  </div>
                </div>

                {/* Icon Circle */}
                <div className="flex justify-center mb-6">
                  <div className="w-24 h-24 bg-gradient-to-br from-cyan-100 to-cyan-50 rounded-2xl flex items-center justify-center text-cyan-500">
                    {step.icon}
                  </div>
                </div>

                {/* Content */}
                <div className="text-center">
                  <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3">
                    {step.title}
                  </h3>
                  <p className="text-gray-600 leading-relaxed mb-4">
                    {step.description}
                  </p>

                  {/* Tips */}
                  <div className="bg-gray-50 rounded-xl p-4 text-left">
                    <ul className="space-y-2">
                      {step.tips.map((tip, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                          <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full mt-2 flex-shrink-0"></span>
                          <span>{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* For Organizers Section */}
      <div className="bg-gray-900 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              For Event Organizers
            </h2>
            <p className="text-lg text-gray-300 max-w-2xl mx-auto">
              Reach thousands of potential attendees with ease
            </p>
          </div>

          {/* Organizer Steps */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {organizerSteps.map((item, index) => (
              <div 
                key={index}
                className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 hover:bg-white/20 transition"
              >
                <div className="w-12 h-12 bg-cyan-400 rounded-full flex items-center justify-center text-white font-bold text-xl mb-4">
                  {item.step}
                </div>
                <h3 className="text-lg font-bold text-white mb-2">
                  {item.title}
                </h3>
                <p className="text-gray-300 text-sm">
                  {item.description}
                </p>
              </div>
            ))}
          </div>

          {/* Benefits */}
          <div className="mt-12 bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
            <h3 className="text-2xl font-bold text-white mb-6 text-center">
              Why Organizers Choose OutingStation
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-cyan-400 text-4xl font-bold mb-2">Free</div>
                <p className="text-gray-300">Create unlimited events at no cost</p>
              </div>
              <div className="text-center">
                <div className="text-cyan-400 text-4xl font-bold mb-2">Simple</div>
                <p className="text-gray-300">Publish events in under 5 minutes</p>
              </div>
              <div className="text-center">
                <div className="text-cyan-400 text-4xl font-bold mb-2">Effective</div>
                <p className="text-gray-300">Reach users actively searching</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-r from-cyan-400 to-cyan-500 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
            Ready to Get Started?
          </h2>
          <p className="text-lg text-white/90 mb-8 max-w-2xl mx-auto">
            Join thousands discovering and creating amazing events every day
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/events"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-gray-900 rounded-full font-semibold hover:bg-gray-100 transition shadow-lg hover:shadow-xl"
            >
              Browse Events
              <ArrowRight size={20} />
            </Link>
            <Link
              to="/signup"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-gray-900 text-white rounded-full font-semibold hover:bg-gray-800 transition shadow-lg hover:shadow-xl"
            >
              Create Account
              <ArrowRight size={20} />
            </Link>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}