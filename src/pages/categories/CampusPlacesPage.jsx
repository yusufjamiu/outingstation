import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, MapPin, ArrowLeft, MessageCircle } from 'lucide-react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";

const placeSubCategories = [
  { name: 'All', icon: '🏛️' },
  { name: 'Library', icon: '📚' },
  { name: 'Auditorium', icon: '🎭' },
  { name: 'Cafeteria', icon: '🍽️' },
  { name: 'Vendors', icon: '🛒' }, // ✅ Renamed
  { name: 'Shortlets', icon: '🏠' },
  { name: 'Chapel / Mosque', icon: '🕌' },
  { name: 'Gym', icon: '💪' },
  { name: 'Computer Lab', icon: '💻' },
];

const VENDOR_CATEGORIES = [
  { name: 'Food & Drinks', emoji: '🍔', color: 'from-orange-400 to-red-400' },
  { name: 'Fashion & Clothing', emoji: '👗', color: 'from-pink-400 to-rose-400' },
  { name: 'Electronics & Gadgets', emoji: '📱', color: 'from-blue-400 to-cyan-400' },
  { name: 'Beauty & Grooming', emoji: '💄', color: 'from-purple-400 to-pink-400' },
  { name: 'Books & Stationery', emoji: '📚', color: 'from-emerald-400 to-green-400' },
  { name: 'Accessories', emoji: '💍', color: 'from-yellow-400 to-amber-400' },
];

export default function CampusPlacesPage() {
  const navigate = useNavigate();

  const [selectedUniversity, setSelectedUniversity] = useState('All Universities');
  const [selectedSubCategory, setSelectedSubCategory] = useState('All');
  const [showUniversityDropdown, setShowUniversityDropdown] = useState(false);
  const [universities, setUniversities] = useState(['All Universities']);
  const [universityImages, setUniversityImages] = useState({});
  const [allPlaces, setAllPlaces] = useState([]);
  const [allVendors, setAllVendors] = useState([]);
  const [loading, setLoading] = useState(true);

  // ✅ Vendor state
  const [showVendorCategories, setShowVendorCategories] = useState(false);
  const [selectedVendorCategory, setSelectedVendorCategory] = useState(null);

  useEffect(() => {
    loadCampusPlaces();
  }, []);

  useEffect(() => {
    if (selectedSubCategory === 'Vendors') {
      setShowVendorCategories(true);
      setSelectedVendorCategory(null);
    } else {
      setShowVendorCategories(false);
      setSelectedVendorCategory(null);
    }
  }, [selectedSubCategory]);

  const loadCampusPlaces = async () => {
    try {
      setLoading(true);

      // ✅ Load ALL universities regardless of image
      const uniSnapshot = await getDocs(collection(db, 'universities'));
      const uniImagesMap = {};
      const uniList = ['All Universities'];

      uniSnapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.name) {
          uniList.push(data.name);
          if (data.imageUrl) {
            uniImagesMap[data.name] = data.imageUrl;
          }
        }
      });

      setUniversityImages(uniImagesMap);
      setUniversities(uniList);

      // ✅ Load campus places
      const snapshot = await getDocs(collection(db, 'events'));
      const places = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(e =>
          e.subCategory === 'places' &&
          e.eventType === 'campus' &&
          e.status === 'published'
        );

      // ✅ Load vendors
      const vendorSnapshot = await getDocs(collection(db, 'vendors'));
      const vendors = vendorSnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(v => v.status === 'active');

      setAllPlaces(places);
      setAllVendors(vendors);
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

  const filteredVendors = allVendors.filter(vendor => {
    const uniMatch = selectedUniversity === 'All Universities' || vendor.university === selectedUniversity;
    const catMatch = !selectedVendorCategory || vendor.category === selectedVendorCategory;
    return uniMatch && catMatch;
  });

  const vendorCategoriesWithCount = VENDOR_CATEGORIES.map(cat => ({
    ...cat,
    count: allVendors.filter(v =>
      v.category === cat.name &&
      (selectedUniversity === 'All Universities' || v.university === selectedUniversity)
    ).length
  }));

  const getUniversityBannerImage = () => {
    if (selectedUniversity === 'All Universities') {
      return 'https://images.unsplash.com/photo-1562774053-701939374585?w=1200&q=80';
    }
    return universityImages[selectedUniversity] ||
      'https://images.unsplash.com/photo-1562774053-701939374585?w=1200&q=80';
  };

  const handleWhatsApp = (number) => {
    const cleaned = number.replace(/\D/g, '');
    window.open(`https://wa.me/${cleaned}`, '_blank');
  };

  const renderVendorCategories = () => (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => {
            setSelectedSubCategory('All');
            setShowVendorCategories(false);
          }}
          className="p-2 hover:bg-gray-100 rounded-lg transition"
        >
          <ArrowLeft size={20} className="text-gray-600" />
        </button>
        <div>
          <h2 className="text-xl font-bold text-gray-900">Campus Vendors</h2>
          <p className="text-sm text-gray-500">
            {selectedUniversity === 'All Universities' ? 'All universities' : selectedUniversity}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {vendorCategoriesWithCount.map((cat) => (
          <button
            key={cat.name}
            onClick={() => setSelectedVendorCategory(cat.name)}
            className="relative group overflow-hidden rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
          >
            <div className={`bg-gradient-to-br ${cat.color} p-6 text-center min-h-[130px] flex flex-col items-center justify-center`}>
              <div className="text-5xl mb-3">{cat.emoji}</div>
              <p className="text-white font-bold text-sm leading-tight">{cat.name}</p>
              <div className="mt-2 bg-white/20 rounded-full px-3 py-0.5">
                <p className="text-white text-xs font-medium">
                  {cat.count} vendor{cat.count !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );

  const renderVendorList = () => (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => setSelectedVendorCategory(null)}
          className="p-2 hover:bg-gray-100 rounded-lg transition"
        >
          <ArrowLeft size={20} className="text-gray-600" />
        </button>
        <div>
          <h2 className="text-xl font-bold text-gray-900">
            {VENDOR_CATEGORIES.find(c => c.name === selectedVendorCategory)?.emoji} {selectedVendorCategory}
          </h2>
          <p className="text-sm text-gray-500">
            {filteredVendors.length} vendor{filteredVendors.length !== 1 ? 's' : ''} available
          </p>
        </div>
      </div>

      {filteredVendors.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-6xl mb-4">😔</div>
          <p className="text-gray-700 text-lg font-semibold mb-2">
            No {selectedVendorCategory} vendors yet
          </p>
          <p className="text-gray-500 text-sm">
            {selectedUniversity === 'All Universities'
              ? 'Check back soon!'
              : `No vendors in this category at ${selectedUniversity} yet`}
          </p>
          <button
            onClick={() => setSelectedVendorCategory(null)}
            className="mt-4 px-6 py-2 bg-cyan-500 text-white rounded-lg text-sm font-medium hover:bg-cyan-600 transition"
          >
            Browse Other Categories
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {filteredVendors.map((vendor) => (
            <div
              key={vendor.id}
              className="bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition group"
            >
              <div className="relative h-48">
                <img
                  src={vendor.imageUrl || 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=400'}
                  alt={vendor.shopName}
                  className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                  onError={(e) => e.target.src = 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=400'}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                <div className="absolute top-3 left-3">
                  <span className="bg-white/90 backdrop-blur-sm text-cyan-600 text-xs px-3 py-1 rounded-full font-semibold">
                    {VENDOR_CATEGORIES.find(c => c.name === vendor.category)?.emoji} {vendor.category}
                  </span>
                </div>
              </div>

              <div className="p-4">
                <h3 className="font-bold text-gray-900 text-base mb-1 group-hover:text-cyan-500 transition">
                  {vendor.shopName}
                </h3>
                <p className="text-sm text-gray-500 mb-3 line-clamp-2">
                  {vendor.description}
                </p>
                {vendor.university && (
                  <p className="text-xs text-gray-400 mb-3">
                    🏛️ {vendor.university}
                  </p>
                )}
                <button
                  onClick={() => handleWhatsApp(vendor.whatsappNumber)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-sm font-semibold transition"
                >
                  <MessageCircle size={16} />
                  Chat on WhatsApp
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

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
                          setShowVendorCategories(false);
                          setSelectedVendorCategory(null);
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

        {/* SubCategory Filter — hide when viewing vendor list */}
        {!selectedVendorCategory && (
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
        )}

        {/* Results */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-cyan-500"></div>
          </div>

        ) : selectedUniversity === 'All Universities' ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🏛️</div>
            <p className="text-gray-700 text-lg font-semibold mb-2">
              Select a campus to explore places
            </p>
            <p className="text-gray-500 text-sm">
              Use the dropdown above to choose a university
            </p>
          </div>

        ) : showVendorCategories && !selectedVendorCategory ? (
          renderVendorCategories()

        ) : showVendorCategories && selectedVendorCategory ? (
          renderVendorList()

        ) : filteredPlaces.length > 0 ? (
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
          <div className="text-center py-20">
            <div className="text-6xl mb-4">😔</div>
            <p className="text-gray-700 text-lg font-semibold mb-2">
              {selectedSubCategory !== 'All'
                ? `No ${selectedSubCategory} available at ${selectedUniversity} yet`
                : `No places found for ${selectedUniversity}`}
            </p>
            <p className="text-gray-500 text-sm">
              {selectedSubCategory !== 'All'
                ? 'Try selecting a different type'
                : 'Places will appear here once added for this campus'}
            </p>
            {selectedSubCategory !== 'All' && (
              <button
                onClick={() => setSelectedSubCategory('All')}
                className="mt-4 px-6 py-2 bg-cyan-500 text-white rounded-lg text-sm font-medium hover:bg-cyan-600 transition"
              >
                View All Places
              </button>
            )}
          </div>
        )}

      </main>

      <Footer />
    </div>
  );
}