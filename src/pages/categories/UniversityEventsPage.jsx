import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ChevronDown, Search } from "lucide-react";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";

const universityMap = {
  "university-of-lagos-unilag": "University of Lagos (Unilag)",
  "king-saud-university-ksu": "King Saud University (KSU)",
  "university-of-ibadan-ui": "University of Ibadan (UI)",
  "university-of-ghana-legon": "University of Ghana (Legon)",
  "covenant-university-cu": "Covenant University (CU)",
  "university-of-ilorin-unilorin": "University of Ilorin (Unilorin)",
};

export default function UniversityEventsPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const [selectedUniversity, setSelectedUniversity] = useState("All Universities");
  const [showDropdown, setShowDropdown] = useState(false);

  const universities = Object.values(universityMap);

  const handleEventClick = (eventId) => {
    navigate(`/event/${eventId}`);
  };

  const events = [
    {
      id: 1,
      title: "Freshmen Mega Orientation",
      university: "University of Lagos (Unilag)",
      date: "Jan 12",
      image: "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800&q=80",
    },
    {
      id: 2,
      title: "AI Future Conference",
      university: "King Saud University (KSU)",
      date: "Jan 18",
      image: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&q=80",
    },
    {
      id: 3,
      title: "Sports Fiesta",
      university: "University of Lagos (Unilag)",
      date: "Jan 20",
      image: "https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800&q=80",
    },
  ];

  // ✅ Read university from URL
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const slug = params.get("university");

    if (slug && universityMap[slug]) {
      setSelectedUniversity(universityMap[slug]);
    }
  }, [location.search]);

  const filteredEvents =
    selectedUniversity === "All Universities"
      ? events
      : events.filter(e => e.university === selectedUniversity);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Header with University Filter */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">University Events</h1>

          {/* University Dropdown */}
          <div className="relative w-full sm:w-auto">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="w-full sm:w-auto bg-white border border-gray-300 px-4 sm:px-5 py-2.5 rounded-lg flex items-center justify-between gap-2 hover:border-cyan-400 transition text-sm sm:text-base"
            >
              <span className="truncate">{selectedUniversity}</span>
              <ChevronDown size={20} className={`flex-shrink-0 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
            </button>

            {showDropdown && (
              <>
                {/* Backdrop for mobile */}
                <div 
                  className="fixed inset-0 bg-black/20 z-40"
                  onClick={() => setShowDropdown(false)}
                ></div>

                {/* Dropdown positioned from top */}
                <div className="absolute top-full right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg w-full sm:w-80 max-h-80 overflow-y-auto z-50">
                  <div className="p-2">
                    <button
                      onClick={() => {
                        setSelectedUniversity("All Universities");
                        setShowDropdown(false);
                        navigate(`/campus-events`);
                      }}
                      className={`block w-full text-left px-4 py-3 hover:bg-gray-100 rounded-lg transition text-sm sm:text-base ${
                        selectedUniversity === "All Universities" ? 'bg-cyan-50 text-cyan-600' : ''
                      }`}
                    >
                      All Universities
                    </button>
                    {universities.map((uni, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          setSelectedUniversity(uni);
                          setShowDropdown(false);

                          const slug = Object.keys(universityMap).find(
                            key => universityMap[key] === uni
                          );

                          navigate(`/campus-events?university=${slug}`);
                        }}
                        className={`block w-full text-left px-4 py-3 hover:bg-gray-100 rounded-lg transition text-sm sm:text-base ${
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

        {/* Events Grid or Empty State */}
        {filteredEvents.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 lg:gap-6">
            {filteredEvents.map(event => (
              <div 
                key={event.id} 
                onClick={() => handleEventClick(event.id)}
                className="bg-white rounded-xl shadow-md hover:shadow-xl transition cursor-pointer group"
              >
                <img
                  src={event.image}
                  className="h-48 sm:h-56 w-full object-cover rounded-t-xl group-hover:scale-105 transition duration-300"
                  alt={event.title}
                />
                <div className="p-4 sm:p-5">
                  <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-2 group-hover:text-cyan-500 transition">
                    {event.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-500 mb-1">{event.university}</p>
                  <p className="text-xs sm:text-sm text-gray-600">📅 {event.date}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center min-h-[400px] sm:min-h-[500px]">
            <div className="text-center max-w-md px-4">
              <div className="mb-6 flex justify-center">
                <div className="w-24 h-24 sm:w-32 sm:h-32 bg-gray-100 rounded-full flex items-center justify-center">
                  <Search size={40} className="sm:w-12 sm:h-12 text-gray-400" strokeWidth={1.5} />
                </div>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2 sm:mb-3">No Events Available</h2>
              <p className="text-sm sm:text-base text-gray-500 mb-6 sm:mb-8">
                There are currently no events available for <span className="font-semibold">{selectedUniversity}</span>. Check back later or select a different university.
              </p>
              <button 
                onClick={() => {
                  setSelectedUniversity("All Universities");
                  navigate('/campus-events');
                }}
                className="px-6 sm:px-8 py-2.5 sm:py-3 bg-cyan-400 text-white rounded-full font-medium hover:bg-cyan-500 transition text-sm sm:text-base"
              >
                View All Universities
              </button>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}