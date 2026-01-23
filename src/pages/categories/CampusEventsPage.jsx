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

  const events = [
    {
      id: 1,
      title: 'Freshmen Mega Orientation',
      category: 'Unilag',
      date: 'Mon, Jan 12',
      time: '3:00 PM',
      image: 'https://source.unsplash.com/800x600/?university,students',
      isFree: true,
      isSaved: false
    },
    {
      id: 2,
      title: 'Inaugural Lecture : AI Future',
      category: 'Fitness',
      date: 'Tue, Jan 12',
      time: '3:00 PM',
      image: 'https://source.unsplash.com/800x600/?lecture,technology',
      isFree: true,
      isSaved: false
    },
    {
      id: 3,
      title: 'Varsity vs Alumni Game',
      category: 'Unilag',
      date: 'Fri, Jan 12',
      time: '3:00 PM',
      image: 'https://source.unsplash.com/800x600/?basketball,sports',
      isFree: true,
      isSaved: true
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-7xl mx-auto px-8 py-8">
        {/* Header with University Selector */}
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Campus Events</h1>
            <p className="text-gray-600">
              Discover events happening in your university and campuses around you.
            </p>
          </div>
          
          {/* University Dropdown */}
          <div className="relative">
            <button 
              onClick={() => setShowUniversityDropdown(!showUniversityDropdown)}
              className="px-6 py-3 bg-white border border-gray-300 rounded-lg flex items-center gap-2 hover:border-primary transition"
            >
              <span className="font-medium">Select University</span>
              <ChevronDown size={20} />
            </button>

            {showUniversityDropdown && (
              <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                <div className="p-2">
                  {universities.map((uni, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        setSelectedUniversity(uni);
                        setShowUniversityDropdown(false);
                      }}
                      className="w-full text-left px-4 py-3 hover:bg-gray-100 rounded-lg transition"
                    >
                      {uni}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* University Banner */}
        <div className="relative rounded-2xl overflow-hidden mb-8 shadow-lg">
          <img 
            src="https://source.unsplash.com/1200x400/?university,campus"
            alt="University of Lagos"
            className="w-full h-80 object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-transparent"></div>
          
          <div className="absolute bottom-8 left-8 text-white">
            <div className="bg-primary text-white text-sm px-3 py-1 rounded-full inline-block mb-3">
              Featured University
            </div>
            <h2 className="text-4xl font-bold mb-2">{selectedUniversity}</h2>
            <p className="flex items-center gap-2 text-lg">
              📍 Lagos, Nigeria
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-4 mb-8">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Date:</label>
            <select className="px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none">
              <option>Any</option>
              <option>Today</option>
              <option>This Week</option>
              <option>This Month</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status:</label>
            <select className="px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none">
              <option>All</option>
              <option>Free</option>
              <option>Paid</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Location:</label>
            <select className="px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none">
              <option>On-Campus</option>
              <option>Off-Campus</option>
            </select>
          </div>

          <div className="ml-auto flex items-end">
            <p className="text-gray-600 font-medium">{events.length} Events Available</p>
          </div>
        </div>

        {/* Events Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((event) => (
            <div key={event.id} className="bg-white rounded-xl overflow-hidden shadow-md hover:shadow-xl transition group cursor-pointer">
              <div className="relative h-56">
                <img 
                  src={event.image} 
                  alt={event.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                />
                
                {/* Category Badge */}
                <div className="absolute top-3 left-3">
                  <span className="bg-blue-500 text-white text-xs px-3 py-1 rounded-full">
                    #{event.category}
                  </span>
                </div>

                {/* Save Icon - with login check */}
                <button 
                  onClick={() => handleSaveClick(event.id)}
                  className="absolute top-3 right-3 w-10 h-10 bg-white rounded-full flex items-center justify-center hover:bg-gray-100 transition"
                >
                  <Heart 
                    size={20} 
                    className={event.isSaved ? 'text-red-500 fill-red-500' : 'text-gray-600'} 
                  />
                </button>

                {event.isFree && (
                  <div className="absolute bottom-3 right-3">
                    <span className="bg-green-500 text-white text-xs px-3 py-1 rounded-full font-semibold">
                      Free
                    </span>
                  </div>
                )}
              </div>

              <div className="p-5">
                <h3 className="text-lg font-bold text-gray-900 mb-3 group-hover:text-primary transition">
                  {event.title}
                </h3>
                
                <div className="space-y-2 text-sm text-gray-600">
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