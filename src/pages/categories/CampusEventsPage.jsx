import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Bell, Heart, ChevronDown } from 'lucide-react';
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";

export default function CampusEventsPage() {
  const [selectedUniversity, setSelectedUniversity] = useState('University of Lagos');
  const [showUniversityDropdown, setShowUniversityDropdown] = useState(false);
  const navigate = useNavigate();
  
  // Auth - will come from context later
  const currentUser = null; // Set to true to test logged in state

  const universities = [
    'University of Lagos (Unilag)',
    'King Saud University (KSU)',
    'University of Ibadan (UI)',
    'University of Ghana (Legon)',
    'Covenant University (CU)',
    'University of Ilorin (Unilorin)'
  ];

  const handleSaveClick = (eventId) => {
    if (!currentUser) {
      navigate('/login');
      return;
    }
    // Save to Firebase
    console.log('Saved event:', eventId);
  };

  const handleEventClick = (eventId) => {
    navigate(`/event/${eventId}`);
  };

  const events = [
    {
      id: 1,
      title: 'Freshmen Mega Orientation',
      category: 'Unilag',
      date: 'Mon, Jan 12',
      time: '3:00 PM',
      image: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800&q=80',
      isFree: true,
      isSaved: false
    },
    {
      id: 2,
      title: 'Inaugural Lecture: AI Future',
      category: 'Academic',
      date: 'Tue, Jan 12',
      time: '3:00 PM',
      image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&q=80',
      isFree: true,
      isSaved: false
    },
    {
      id: 3,
      title: 'Varsity vs Alumni Game',
      category: 'Sports',
      date: 'Fri, Jan 12',
      time: '3:00 PM',
      image: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800&q=80',
      isFree: true,
      isSaved: true
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Header with University Selector */}
        <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Campus Events</h1>
            <p className="text-sm sm:text-base text-gray-600">
              Discover events happening in your university and campuses around you.
            </p>
          </div>
          
          {/* University Dropdown */}
          <div className="relative">
            <button 
              onClick={() => setShowUniversityDropdown(!showUniversityDropdown)}
              className="w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-3 bg-white border border-gray-300 rounded-lg flex items-center justify-between sm:justify-start gap-2 hover:border-cyan-400 transition text-sm sm:text-base"
            >
              <span className="font-medium">Select University</span>
              <ChevronDown size={20} className={`transition-transform ${showUniversityDropdown ? 'rotate-180' : ''}`} />
            </button>

            {showUniversityDropdown && (
              <>
                {/* Backdrop for mobile */}
                <div 
                  className="fixed inset-0 bg-black/20 z-40 sm:hidden"
                  onClick={() => setShowUniversityDropdown(false)}
                ></div>
                
                <div className="absolute right-0 mt-2 w-full sm:w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                  <div className="p-2 max-h-80 overflow-y-auto">
                    {universities.map((uni, index) => (
                      <button
                        key={index}
                        onClick={() => {
                          setSelectedUniversity(uni);
                          setShowUniversityDropdown(false);
                        }}
                        className={`w-full text-left px-4 py-3 hover:bg-gray-100 rounded-lg transition text-sm sm:text-base ${
                          selectedUniversity === uni ? 'bg-cyan-50 text-cyan-600' : ''
                        }`}
                      >
                        {uni}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* University Banner */}
        <div className="relative rounded-xl sm:rounded-2xl overflow-hidden mb-6 sm:mb-8 shadow-lg">
          <img 
            src="https://images.unsplash.com/photo-1562774053-701939374585?w=1200&q=80"
            alt={selectedUniversity}
            className="w-full h-48 sm:h-64 lg:h-80 object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-transparent"></div>
          
          <div className="absolute bottom-4 sm:bottom-6 lg:bottom-8 left-4 sm:left-6 lg:left-8 text-white">
            <div className="bg-cyan-400 text-white text-xs sm:text-sm px-2.5 sm:px-3 py-1 rounded-full inline-block mb-2 sm:mb-3">
              Featured University
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-1 sm:mb-2">{selectedUniversity}</h2>
            <p className="flex items-center gap-2 text-sm sm:text-base lg:text-lg">
              📍 Lagos, Nigeria
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-6 sm:mb-8">
          <div className="flex-1 sm:flex-initial">
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">Date:</label>
            <select className="w-full px-3 sm:px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 outline-none text-sm">
              <option>Any</option>
              <option>Today</option>
              <option>This Week</option>
              <option>This Month</option>
            </select>
          </div>

          <div className="flex-1 sm:flex-initial">
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">Status:</label>
            <select className="w-full px-3 sm:px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 outline-none text-sm">
              <option>All</option>
              <option>Free</option>
              <option>Paid</option>
            </select>
          </div>

          <div className="flex-1 sm:flex-initial">
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">Location:</label>
            <select className="w-full px-3 sm:px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 outline-none text-sm">
              <option>On-Campus</option>
              <option>Off-Campus</option>
            </select>
          </div>

          <div className="sm:ml-auto flex items-end">
            <p className="text-sm sm:text-base text-gray-600 font-medium">{events.length} Events Available</p>
          </div>
        </div>

        {/* Events Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 lg:gap-6">
          {events.map((event) => (
            <div 
              key={event.id} 
              onClick={() => handleEventClick(event.id)}
              className="bg-white rounded-xl overflow-hidden shadow-md hover:shadow-xl transition group cursor-pointer"
            >
              <div className="relative h-48 sm:h-56">
                <img 
                  src={event.image} 
                  alt={event.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                />
                
                {/* Category Badge */}
                <div className="absolute top-3 left-3">
                  <span className="bg-blue-500 text-white text-xs px-2.5 sm:px-3 py-1 rounded-full">
                    #{event.category}
                  </span>
                </div>

                {/* Save Icon - with login check */}
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSaveClick(event.id);
                  }}
                  className="absolute top-3 right-3 w-9 h-9 sm:w-10 sm:h-10 bg-white rounded-full flex items-center justify-center hover:bg-gray-100 transition z-10"
                >
                  <Heart 
                    size={18}
                    className={`sm:w-5 sm:h-5 ${event.isSaved ? 'text-red-500 fill-red-500' : 'text-gray-600'}`}
                  />
                </button>

                {event.isFree && (
                  <div className="absolute bottom-3 right-3">
                    <span className="bg-emerald-500 text-white text-xs px-2.5 sm:px-3 py-1 rounded-lg font-semibold">
                      Free
                    </span>
                  </div>
                )}
              </div>

              <div className="p-4 sm:p-5">
                <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-3 group-hover:text-cyan-500 transition line-clamp-2">
                  {event.title}
                </h3>
                
                <div className="space-y-2 text-xs sm:text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <span>📅 {event.date}</span>
                    <span>🕒 {event.time}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      <Footer />
    </div>
  );
}