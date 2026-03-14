import React from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { Target, Users, Zap, Heart, ArrowRight } from 'lucide-react';

export default function AboutUs() {
  const values = [
    {
      icon: <Target size={32} />,
      title: 'Simple & Accessible',
      description: 'We believe discovering events should be easy for everyone, whether you\'re exploring or organizing.'
    },
    {
      icon: <Users size={32} />,
      title: 'Community First',
      description: 'We connect people with experiences that matter, building vibrant communities around shared interests.'
    },
    {
      icon: <Zap size={32} />,
      title: 'Fast & Reliable',
      description: 'Find what you need quickly with smart filters, real-time updates, and location-based search.'
    },
    {
      icon: <Heart size={32} />,
      title: 'Made for You',
      description: 'From students to professionals, families to hobbyists - OutingStation serves everyone.'
    }
  ];

  const stats = [
    { number: '1000+', label: 'Events Listed' },
    { number: '50+', label: 'Cities Covered' },
    { number: '10,000+', label: 'Happy Users' },
    { number: '500+', label: 'Organizers' }
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
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
              About <span className="text-cyan-400">OutingStation</span>
            </h1>
            <p className="text-lg sm:text-xl text-white/90 max-w-2xl">
              Connecting people with experiences that matter
            </p>
          </div>
        </div>
      </div>

      {/* Mission Statement */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-8 text-center">
            Our Mission
          </h2>
          
          <div className="space-y-6 text-base sm:text-lg text-gray-700 leading-relaxed">
            <p>
              OutingStation is an event discovery platform that helps people find events, webinars, and experiences happening around them and helps event organizers reach the right audience effortlessly.
            </p>
            <p>
              From tech meetups and university events to workshops, cultural gatherings, and online webinars, OutingStation brings everything into one simple, location-based platform.
            </p>
            <p>
              Our goal is to make discovering what's happening around you easy, fast, and enjoyable — while giving organizers a simple way to promote their events to a wider audience. Whether you're a student, professional, family, or community member, OutingStation helps you stay connected to experiences that matter.
            </p>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="bg-gradient-to-r from-cyan-400 to-cyan-500 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-2">
                  {stat.number}
                </div>
                <div className="text-sm sm:text-base text-white/90 font-medium">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Our Values */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="text-3xl sm:text-4xl font-bold text-center text-gray-900 mb-12">
          What We Stand For
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {values.map((value, index) => (
            <div 
              key={index}
              className="bg-white rounded-2xl p-8 border border-gray-200 hover:shadow-lg transition"
            >
              <div className="w-16 h-16 bg-cyan-100 rounded-full flex items-center justify-center text-cyan-500 mb-6">
                {value.icon}
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                {value.title}
              </h3>
              <p className="text-gray-600 leading-relaxed">
                {value.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Story Section */}
      <div className="bg-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-8 text-center">
              Our Story
            </h2>
            
            <div className="space-y-6 text-base sm:text-lg text-gray-700 leading-relaxed">
              <p>
                OutingStation was born from a simple observation: finding events in your city shouldn't be difficult. Whether you're a student looking for campus activities, a professional seeking networking opportunities, or a family searching for weekend fun, the information is scattered across multiple platforms.
              </p>
              <p>
                We built OutingStation to solve this problem. By bringing together events from all categories - tech, culture, education, nightlife, sports, and more - into one location-based platform, we make it easy for anyone to discover what's happening near them.
              </p>
              <p>
                For organizers, OutingStation provides a straightforward way to reach their target audience. No complicated tools, no excessive fees - just a simple platform to publish events and connect with people who are actively searching for experiences like yours.
              </p>
              <p>
                Today, OutingStation serves thousands of users across multiple cities, helping them discover events and helping organizers fill seats. We're just getting started, and we're excited to grow with communities around the world.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gray-900 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
            Ready to Explore?
          </h2>
          <p className="text-lg text-gray-300 mb-8 max-w-2xl mx-auto">
            Join thousands of users discovering amazing events or start promoting your own events today.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/events"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-cyan-400 text-white rounded-full font-semibold hover:bg-cyan-500 transition shadow-lg hover:shadow-xl"
            >
              Browse Events
              <ArrowRight size={20} />
            </Link>
            <Link
              to="/how-it-works"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-gray-900 rounded-full font-semibold hover:bg-gray-100 transition shadow-lg hover:shadow-xl"
            >
              Learn How It Works
            </Link>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}