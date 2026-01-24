import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ChevronDown } from "lucide-react";
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

  const events = [
    {
      id: 1,
      title: "Freshmen Mega Orientation",
      university: "University of Lagos (Unilag)",
      date: "Jan 12",
      image: "https://source.unsplash.com/800x600/?campus",
    },
    {
      id: 2,
      title: "AI Future Conference",
      university: "King Saud University (KSU)",
      date: "Jan 18",
      image: "https://source.unsplash.com/800x600/?technology",
    },
    {
      id: 3,
      title: "Sports Fiesta",
      university: "University of Lagos (Unilag)",
      date: "Jan 20",
      image: "https://source.unsplash.com/800x600/?sports",
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
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-7xl mx-auto px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">University Events</h1>

          <div className="relative">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="bg-white border px-5 py-2 rounded-lg flex items-center gap-2"
            >
              {selectedUniversity}
              <ChevronDown />
            </button>

            {showDropdown && (
              <div className="absolute right-0 mt-2 bg-white border rounded-lg shadow w-72 z-10">
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
                    className="block w-full text-left px-4 py-3 hover:bg-gray-100"
                  >
                    {uni}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* EVENTS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {filteredEvents.map(event => (
            <div key={event.id} className="bg-white rounded-xl shadow">
              <img
                src={event.image}
                className="h-48 w-full object-cover rounded-t-xl"
                alt={event.title}
              />
              <div className="p-4">
                <h3 className="font-bold">{event.title}</h3>
                <p className="text-sm text-gray-500">{event.university}</p>
                <p className="text-sm">{event.date}</p>
              </div>
            </div>
          ))}
        </div>
      </main>

      <Footer />
    </div>
  );
}
