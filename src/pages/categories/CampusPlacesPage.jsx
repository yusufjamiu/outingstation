import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, MapPin } from 'lucide-react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";

const placeSubCategories = [
  { name: 'All', icon: '🏛️' },
  { name: 'Library', icon: '📚' },
  { name: 'Auditorium', icon: '🎭' },
  { name: 'Cafeteria', icon: '🍽️' },
  { name: 'Campus Market', icon: '🛒' },
  { name: 'Shortlets', icon: '🏠' },
  { name: 'Chapel / Mosque', icon: '🕌' },
  { name: 'Gym', icon: '💪' },
  { name: 'Computer Lab', icon: '💻' },
];

export default function CampusPlacesPage() {
  const navigate = useNavigate();

  const [selectedUniversity, setSelectedUniversity] = useState('All Universities');
  const [selectedSubCategory, setSelectedSubCategory] = useState('All');
  const [showUniversityDropdown, setShowUniversityDropdown] = useState(false);
  const [universities, setUniversities] = useState(['All Universities']);
  const [universityImages, setUniversityImages] = useState({});
  const [allPlaces, setAllPlaces] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCampusPlaces();
  }, []);

  const loadCampusPlaces = async () => {
    try {
      setLoading(true);

      const uniSnapshot = await getDocs(collection(db, 'universities'));
      const uniImagesMap = {};
      const uniList = ['All Universities'];

      uniSnapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.name && data.imageUrl) {
          uniImagesMap[data.name] = data.imageUrl;
          uniList.push(data.name);
        }
      });

      setUniversityImages(uniImagesMap);

      const snapshot = await getDocs(collection(db, 'events'));
      const places = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(e =>
          e.subCategory === 'places' &&
          e.eventType === 'campus' && // ✅ campus only
          e.status === 'published'
        );

      places.forEach(place => {
        if (place.university && !uniList.includes(place.university)) {
          uniList.push(place.university);
        }
      });

      setUniversities(uniList);
      setAllPlaces(places);
    } catch (err) {
      console.error('Error loading campus places:', err);
    }
    setLoading(false);
  };

  const filteredPlaces = allPlaces.filter(place => {
    const uniMatch = selectedUniversity === 'All Universities' || place.university === selectedUniversity;
    const subMatch = selectedSubCategory === 'All' || place.campusSubCategory === selectedSubCategory;
    return uniMatch && subMatch;
  });

  const getUniversityBannerImage = () => {
    if (selectedUniversity === 'All Universities') {
      return 'https://images.unsplash.com/photo-1562774053-701939374585?w=1200&q=80';
    }
    return universityImages[selectedUniversity] || 'https://images.unsplash.com/photo-1562774053-701939374585?w=1200&q=80';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">

        {/* Header */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Campus Places</h1>
            <p className="text-sm sm:text-base text-gray-600">
              Libraries, auditoriums, cafeterias and more on campus.
            </p>
          </div>

          {/* University Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowUniversityDropdown(!showUniversityDropdown)}
              className="w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-3 bg-white border border-gray-300 rounded-lg flex items-center gap-2 hover:border-cyan-400 transition text-sm sm:text-base"
            >
              <MapPin size={16} className="text-cyan-500" />
              <span className="font-medium">{selectedUniversity}</span>
              <ChevronDown size={20} className={`transition-transform ${showUniversityDropdown ? 'rotate-180' : ''}`} />
            </button>

            {showUniversityDropdown && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowUniversityDropdown(false)}></div>
                <div className="absolute right-0 mt-2 w-72 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                  <div className="p-2 max-h-80 overflow-y-auto">
                    {universities.map((uni, index) => (
                      <button
                        key={index}
                        onClick={() => {
                          setSelectedUniversity(uni);
                          setSelectedSubCategory('All');
                          setShowUniversityDropdown(false);
                        }}
                        className={`w-full text-left px-4 py-3 hover:bg-gray-100 rounded-lg transition text-sm ${
                          selectedUniversity === uni ? 'bg-cyan-50 text-cyan-600 font-medium' : ''
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

        {/* Banner */}
        <div className="relative rounded-2xl overflow-hidden mb-6 shadow-lg">
          <img
            src={getUniversityBannerImage()}
            alt={selectedUniversity}
            className="w-full h-48 sm:h-64 object-cover"
            onError={(e) => {
              e.target.src = 'https://images.unsplash.com/photo-1562774053-701939374585?w=1200&q=80';
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-transparent"></div>
          <div className="absolute bottom-4 sm:bottom-6 left-4 sm:left-6 text-white">
            <div className="bg-purple-500 text-white text-xs px-3 py-1 rounded-full inline-block mb-2">
              🏛️ Campus Spots
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold mb-1">
              {selectedUniversity === 'All Universities' ? 'Select a Campus' : selectedUniversity}
            </h2>
            <p className="text-sm sm:text-base text-white/80">
              {selectedUniversity === 'All Universities'
                ? 'Choose a university from the dropdown above'
                : `${filteredPlaces.length} place${filteredPlaces.length !== 1 ? 's' : ''} available`}
            </p>
          </div>
        </div>

        {/* SubCategory Filter */}
        <div className="flex gap-2 flex-wrap mb-6">
          {placeSubCategories.map((sub) => (
            <button
              key={sub.name}
              onClick={() => setSelectedSubCategory(sub.name)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                selectedSubCategory === sub.name
                  ? 'bg-cyan-500 text-white'
                  : 'bg-white text-gray-600 border border-gray-200 hover:border-cyan-400'
              }`}
            >
              {sub.icon} {sub.name}
            </button>
          ))}
        </div>

        {/* Results */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-cyan-500"></div>
          </div>
        ) : selectedUniversity === 'All Universities' ? (
          // ✅ No uni selected
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🏛️</div>
            <p className="text-gray-700 text-lg font-semibold mb-2">
              Select a campus to explore places
            </p>
            <p className="text-gray-500 text-sm">
              Use the dropdown above to choose a university
            </p>
          </div>
        ) : filteredPlaces.length > 0 ? (
          // ✅ Show results
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {filteredPlaces.map((place) => (
              <div
                key={place.id}
                onClick={() => navigate(`/event/${place.id}`)}
                className="bg-white rounded-xl overflow-hidden shadow-md hover:shadow-xl transition group cursor-pointer"
              >
                <div className="relative h-48">
                  <img
                    src={place.imageUrl || 'https://images.unsplash.com/photo-1562774053-701939374585?w=800'}
                    alt={place.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                  />
                  <div className="absolute top-3 left-3">
                    <span className="bg-purple-500 text-white text-xs px-3 py-1 rounded-full">
                      {place.campusSubCategory || 'Campus Place'}
                    </span>
                  </div>
                  {place.isFree && (
                    <div className="absolute bottom-3 right-3">
                      <span className="bg-emerald-500 text-white text-xs px-3 py-1 rounded-lg font-semibold">
                        Free Entry
                      </span>
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="text-base font-bold text-gray-900 mb-2 group-hover:text-cyan-500 transition line-clamp-2">
                    {place.title}
                  </h3>
                  <div className="space-y-1.5 text-sm text-gray-600">
                    {place.university && (
                      <div className="flex items-center gap-2">
                        <span>🏛️ {place.university}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <MapPin size={14} className="text-cyan-500" />
                      <span>{place.location || 'Campus'}</span>
                    </div>
                    {place.openingTime && place.closingTime && (
                      <div className="flex items-center gap-2">
                        <span>🕐 {place.openingTime} - {place.closingTime}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          // ✅ Uni selected but no results
          <div className="text-center py-20">
            <div className="text-6xl mb-4">😔</div>
            <p className="text-gray-700 text-lg font-semibold mb-2">
              {selectedSubCategory !== 'All'
                ? `${selectedSubCategory} not available for ${selectedUniversity}`
                : `No places found for ${selectedUniversity}`}
            </p>
            <p className="text-gray-500 text-sm">
              {selectedSubCategory !== 'All'
                ? 'Try selecting a different type'
                : 'Places will appear here once added for this campus'}
            </p>
          </div>
        )}

      </main>

      <Footer />
    </div>
  );
}