import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import EventCard from './EventCard';
import ilorinDurbar from '../assets/ilorinDurbar.jpg'
import osogboDev from '../assets/osogboDev.jpg'

const FeaturedEvents = () => {
  const events = [
    {
      id: 1,
      title: 'Global Startup Summit 2026',
      imageUrl: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=400&h=300&fit=crop',
      category: 'Tech',
      isFree: true,
      date: new Date('2026-01-12'),
      time: '3:00 PM (WAT)',
      location: 'Lagos',
      city: 'Nigeria'
    },
    {
      id: 2,
      title: 'Veggies Cookathon Breaking Record',
      imageUrl: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&h=300&fit=crop',
      category: 'Food',
      isFree: true,
      date: new Date('2026-01-12'),
      time: '3:00 PM (WAT)',
      location: 'Lagos',
      city: 'Nigeria'
    },
    {
      id: 3,
      title: 'Largest Yoga Fitness Training',
      imageUrl: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400&h=300&fit=crop',
      category: 'Fitness',
      isFree: false,
      date: new Date('2026-01-12'),
      time: '3:00 PM (WAT)',
      location: 'Accra',
      city: 'Ghana'
    },
    {
      id: 4,
      title: 'Ibadan MidMonth Marathon',
      imageUrl: 'https://images.unsplash.com/photo-1452626038306-9aae5e071dd3?w=400&h=300&fit=crop',
      category: 'Fitness',
      isFree: true,
      date: new Date('2026-01-12'),
      time: '3:00 PM (WAT)',
      location: 'Ibadan',
      city: 'Nigeria'
    },
    {
      id: 5,
      title: 'Ilorin Emirate Durbar 2026',
      imageUrl: ilorinDurbar,
      category: 'Culture',
      isFree: true,
      date: new Date('2026-01-12'),
      time: '3:00 PM (WAT)',
      location: 'Ilorin',
      city: 'Nigeria'
    },
    {
      id: 6,
      title: 'Osogbo Devs Hackathon',
      imageUrl: osogboDev,
      category: 'Tech',
      isFree: false,
      date: new Date('2026-01-12'),
      time: '3:00 PM (WAT)',
      location: 'Osogbo',
      city: 'Nigeria'
    },
    {
      id: 7,
      title: 'Global Startup Summit 2026',
      imageUrl: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=400&h=300&fit=crop',
      category: 'Tech',
      isFree: true,
      date: new Date('2026-01-12'),
      time: '3:00 PM (WAT)',
      location: 'Lagos',
      city: 'Nigeria'
    },
    {
      id: 8,
      title: 'Veggies Cookathon Breaking Record',
      imageUrl: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&h=300&fit=crop',
      category: 'Food',
      isFree: true,
      date: new Date('2026-01-12'),
      time: '3:00 PM (WAT)',
      location: 'Lagos',
      city: 'Nigeria'
    }
  ];

  return (
    <section className="bg-gradient-to-br from-gray-100 to-gray-50 py-16 md:py-24 px-4 md:px-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-3">
            Featured & Trending Events
          </h2>
          <p className="text-gray-500 text-base md:text-lg">
            Discover what's happening around you this week
          </p>
        </div>

        {/* Events Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {events.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>

        {/* View More Button */}
        <div className="text-center">
          <Link 
            to="/events"
            className="inline-flex items-center gap-2 bg-white text-gray-700 px-8 py-4 rounded-full font-medium shadow-lg hover:shadow-xl transition-all group"
          >
            View More Events
            <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>
    </section>
  );
};

export default FeaturedEvents;