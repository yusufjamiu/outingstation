import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Clock, Video, ArrowRight } from 'lucide-react';

const WebinarSection = () => {
  const webinars = [
    {
      id: 1,
      title: 'Future of Web3 in Africa',
      image: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=400&h=300&fit=crop',
      type: 'Online',
      typeIcon: 'dot',
      date: 'Jan 12',
      time: '3:00 PM (WAT)'
    },
    {
      id: 2,
      title: 'Digital Marketing 101',
      image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=300&fit=crop',
      type: 'Online',
      typeIcon: 'dot',
      date: 'Jan 12',
      time: '3:00 PM (WAT)'
    },
    {
      id: 3,
      title: 'Cooking Masterclass Live',
      image: 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=400&h=300&fit=crop',
      type: 'Live',
      typeIcon: 'video',
      date: 'Jan 12',
      time: '3:00 PM (WAT)'
    },
    {
      id: 4,
      title: 'Modern AI Learning',
      image: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=400&h=300&fit=crop',
      type: 'Online',
      typeIcon: 'dot',
      date: 'Jan 12',
      time: '3:00 PM (WAT)'
    },
    {
      id: 5,
      title: 'Navigating Public Speaking',
      image: 'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=400&h=300&fit=crop',
      type: 'Live',
      typeIcon: 'video',
      date: 'Jan 12',
      time: '3:00 PM (WAT)'
    },
    {
      id: 6,
      title: 'Modern AI Learning',
      image: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=400&h=300&fit=crop',
      type: 'Online',
      typeIcon: 'dot',
      date: 'Jan 12',
      time: '3:00 PM (WAT)'
    },
    {
      id: 7,
      title: 'Digital Marketing 101',
      image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=300&fit=crop',
      type: 'Online',
      typeIcon: 'dot',
      date: 'Jan 12',
      time: '3:00 PM (WAT)'
    },
    {
      id: 8,
      title: 'Cooking Masterclass Live',
      image: 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=400&h=300&fit=crop',
      type: 'Live',
      typeIcon: 'video',
      date: 'Jan 12',
      time: '3:00 PM (WAT)'
    }
  ];

  return (
    <section className="bg-gray-300 py-16 md:py-24 px-4 md:px-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-start mb-12">
          <div>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-3">
              Webinar & Virtual Events
            </h2>
            <p className="text-gray-500 text-base md:text-lg">
              Connect from anywhere with industry experts & communities.
            </p>
          </div>
          <Link 
            to="/events?category=webinar"
            className="hidden md:flex items-center gap-2 text-cyan-500 font-medium hover:text-cyan-600 transition-colors group"
          >
            View All Webinars
            <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {/* Webinars Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {webinars.map((webinar) => (
            <div
              key={webinar.id}
              className="bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 group"
            >
              {/* Image */}
              <div className="relative h-48 overflow-hidden">
                <img 
                  src={webinar.image} 
                  alt={webinar.title}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                />
                {/* Type Badge */}
                <div className="absolute top-3 left-3">
                  <div className="flex items-center gap-2 bg-white px-3 py-1 rounded-full">
                    {webinar.typeIcon === 'video' ? (
                      <Video className="text-cyan-500" size={14} />
                    ) : (
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    )}
                    <span className="text-cyan-500 text-xs font-semibold">
                      {webinar.type}
                    </span>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-5">
                <h3 className="font-bold text-gray-900 text-lg mb-4 line-clamp-2">
                  {webinar.title}
                </h3>

                {/* Date & Time */}
                <div className="flex items-center gap-4 mb-4 text-gray-600 text-sm">
                  <div className="flex items-center gap-1">
                    <Calendar size={16} />
                    <span>{webinar.date}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock size={16} />
                    <span>{webinar.time}</span>
                  </div>
                </div>

                {/* Join Button */}
                <button className="w-full bg-cyan-50 text-cyan-500 py-3 rounded-xl font-medium hover:bg-cyan-100 transition-colors">
                  Join
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Mobile View All Link */}
        <div className="text-center md:hidden">
          <Link 
            to="/events?category=webinar"
            className="inline-flex items-center gap-2 text-cyan-500 font-medium hover:text-cyan-600 transition-colors group"
          >
            View All Webinars
            <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>
    </section>
  );
};

export default WebinarSection;