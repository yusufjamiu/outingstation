import { useState } from 'react';
import { Search, Bell, Heart, ChevronDown } from 'lucide-react';
// import { UserSidebar } from '../components/UserSidebar';

export default function WebinarEventsPage() {
  const user = {
    name: 'Saleem',
    city: 'Lagos',
    avatar: 'https://placehold.co/40x40?text=S'
  };

  const webinars = [
    {
      id: 1,
      title: 'Python/Java Basics Workshop',
      category: 'Online',
      date: 'Mon, Jan 12',
      time: '3:00 PM',
      platform: 'Google Meet',
      image: 'https://source.unsplash.com/800x600/?programming,coding',
      isFree: true
    },
    {
      id: 2,
      title: 'Tech Realm While Using AI',
      category: 'Online',
      date: 'Tue, Jan 12',
      time: '3:00 PM',
      platform: 'Twitter Space',
      image: 'https://source.unsplash.com/800x600/?technology,ai',
      isFree: true
    },
    {
      id: 3,
      title: 'Remote Leadership Summit',
      category: 'Live',
      date: 'Fri, Jan 12',
      time: '3:00 PM',
      platform: 'Zoom',
      image: 'https://source.unsplash.com/800x600/?leadership,business',
      isFree: true
    },
    {
      id: 4,
      title: '2026 Job Hunting Navigation',
      category: 'Live',
      date: 'Sat, Jan 13',
      time: '2:00 PM',
      platform: 'Google Meet',
      image: 'https://source.unsplash.com/800x600/?job,career',
      isFree: true
    },
    {
      id: 5,
      title: 'PhD Scholarship Application',
      category: 'Online',
      date: 'Sun, Jan 14',
      time: '4:00 PM',
      platform: 'Zoom',
      image: 'https://source.unsplash.com/800x600/?education,scholarship',
      isFree: true
    },
    {
      id: 6,
      title: 'Freshmen Mega Orientation',
      category: 'Online',
      date: 'Mon, Jan 15',
      time: '10:00 AM',
      platform: 'Microsoft Teams',
      image: 'https://source.unsplash.com/800x600/?students,orientation',
      isFree: true
    }
  ];

  return (
    <div className="flex h-screen bg-gray-50">
      {/* <UserSidebar activeTab="category" user={user} /> */}

      <main className="flex-1 overflow-y-auto">
        <div className="bg-white border-b border-gray-200 px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex-1 max-w-xl">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Search location, event & more"
                  className="w-full pl-12 pr-4 py-3 bg-gray-50 border-0 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                />
              </div>
            </div>

            <div className="flex items-center gap-4">
              <button className="relative p-2 hover:bg-gray-100 rounded-lg transition">
                <Bell size={24} className="text-gray-600" />
              </button>
              <img src={user.avatar} alt={user.name} className="w-10 h-10 rounded-full cursor-pointer" />
            </div>
          </div>
        </div>

        <div className="p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Webinar & Virtual Events</h1>
            <p className="text-gray-600">
              Discover online workshop, conferences, and live sessions. Connect with experts and learn new things from various parts in the world
            </p>
          </div>

          {/* Filters */}
          <div className="flex gap-4 mb-8">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date:</label>
              <select className="px-4 py-2 bg-white border border-gray-300 rounded-lg">
                <option>Any</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Topic:</label>
              <select className="px-4 py-2 bg-white border border-gray-300 rounded-lg">
                <option>All</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status:</label>
              <select className="px-4 py-2 bg-white border border-gray-300 rounded-lg">
                <option>Free</option>
              </select>
            </div>

            <div className="ml-auto flex items-end">
              <p className="text-gray-600 font-medium">30 Events Available</p>
            </div>
          </div>

          {/* Webinars Grid */}
          <div className="grid grid-cols-3 gap-6">
            {webinars.map((webinar) => (
              <div key={webinar.id} className="bg-white rounded-xl overflow-hidden shadow-md hover:shadow-xl transition group cursor-pointer">
                <div className="relative h-56">
                  <img 
                    src={webinar.image} 
                    alt={webinar.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                  />
                  
                  <div className="absolute top-3 left-3">
                    <span className={`${webinar.category === 'Live' ? 'bg-red-500' : 'bg-blue-500'} text-white text-xs px-3 py-1 rounded-full`}>
                      📹 {webinar.category}
                    </span>
                  </div>

                  <button className="absolute top-3 right-3 w-10 h-10 bg-white rounded-full flex items-center justify-center hover:bg-gray-100 transition">
                    <Heart size={20} className="text-gray-600" />
                  </button>

                  {webinar.isFree && (
                    <div className="absolute bottom-3 right-3">
                      <span className="bg-green-500 text-white text-xs px-3 py-1 rounded-full font-semibold">
                        Free
                      </span>
                    </div>
                  )}
                </div>

                <div className="p-5">
                  <h3 className="text-lg font-bold text-gray-900 mb-3 group-hover:text-primary transition">
                    {webinar.title}
                  </h3>
                  
                  <div className="space-y-2 text-sm text-gray-600 mb-4">
                    <div className="flex items-center gap-2">
                      <span>📅 {webinar.date}</span>
                      <span>🕒 {webinar.time}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-primary text-sm">📍 {webinar.platform}</span>
                    <button className="text-primary font-semibold text-sm hover:underline">
                      View →
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}