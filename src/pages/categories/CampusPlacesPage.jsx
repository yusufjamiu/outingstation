import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, MapPin, ArrowLeft, MessageCircle, Flag, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { collection, getDocs, doc, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";

const placeSubCategories = [
  { name: 'All', icon: '🏛️' },
  { name: 'Library', icon: '📚' },
  { name: 'Auditorium', icon: '🎭' },
  { name: 'Cafeteria', icon: '🍽️' },
  { name: 'Vendors', icon: '🛒' },
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

const REPORT_REASONS = [
  { value: 'inactive', label: '🚫 Shop no longer exists / closed' },
  { value: 'scam', label: '⚠️ Scam / Fraud' },
  { value: 'wrong_contact', label: '📱 Wrong WhatsApp number' },
  { value: 'wrong_location', label: '📍 Wrong university / location' },
  { value: 'fake', label: '🤥 Fake listing' },
  { value: 'other', label: '💬 Other reason' },
];

// ✅ Image Carousel Component
function ImageCarousel({ images, alt }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showFull, setShowFull] = useState(false);

  if (!images || images.length === 0) return null;

  const prev = (e) => {
    e?.stopPropagation();
    setCurrentIndex(i => (i - 1 + images.length) % images.length);
  };

  const next = (e) => {
    e?.stopPropagation();
    setCurrentIndex(i => (i + 1) % images.length);
  };

  return (
    <>
      <div className="relative h-48 group" onClick={() => setShowFull(true)}>
        <img
          src={images[currentIndex]}
          alt={alt}
          className="w-full h-full object-cover cursor-zoom-in group-hover:scale-105 transition duration-300"
          onError={(e) => e.target.src = 'https://images.unsplash.com/photo-1562774053-701939374585?w=800'}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent pointer-events-none" />

        {images.length > 1 && (
          <div className="absolute top-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1 z-10">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="white">
              <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
            </svg>
            {currentIndex + 1}/{images.length}
          </div>
        )}

        {images.length > 1 && (
          <>
            <button onClick={prev} className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition z-10">
              <ChevronLeft size={14} />
            </button>
            <button onClick={next} className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition z-10">
              <ChevronRight size={14} />
            </button>
          </>
        )}

        {images.length > 1 && (
          <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1 z-10">
            {images.map((_, i) => (
              <button
                key={i}
                onClick={(e) => { e.stopPropagation(); setCurrentIndex(i); }}
                className={`rounded-full transition-all ${i === currentIndex ? 'w-4 h-1.5 bg-white' : 'w-1.5 h-1.5 bg-white/50'}`}
              />
            ))}
          </div>
        )}
      </div>

      {showFull && (
        <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center" onClick={() => setShowFull(false)}>
          <button onClick={() => setShowFull(false)} className="absolute top-4 right-4 text-white bg-white/20 p-2 rounded-full z-10">
            <X size={20} />
          </button>
          <div className="absolute top-4 left-1/2 -translate-x-1/2 text-white text-sm bg-white/20 px-3 py-1 rounded-full">
            {currentIndex + 1} / {images.length}
          </div>
          <img
            src={images[currentIndex]}
            alt={alt}
            className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
          {images.length > 1 && (
            <>
              <button onClick={prev} className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/30 text-white p-3 rounded-full">
                <ChevronLeft size={20} />
              </button>
              <button onClick={next} className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/30 text-white p-3 rounded-full">
                <ChevronRight size={20} />
              </button>
            </>
          )}
          {images.length > 1 && (
            <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2 px-4">
              {images.map((img, i) => (
                <button
                  key={i}
                  onClick={(e) => { e.stopPropagation(); setCurrentIndex(i); }}
                  className={`w-12 h-9 rounded-md overflow-hidden border-2 transition-all ${i === currentIndex ? 'border-cyan-400 scale-110' : 'border-white/30 opacity-50 hover:opacity-100'}`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}

// ✅ Report Vendor Modal
function ReportVendorModal({ vendor, onClose }) {
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!reason) { alert('Please select a reason'); return; }
    setSubmitting(true);
    try {
      await addDoc(collection(db, 'vendor_reports'), {
        vendorId: vendor.id,
        shopName: vendor.shopName,
        university: vendor.university,
        reason,
        details: details.trim() || null,
        reportedAt: serverTimestamp(),
        status: 'pending',
      });
      await updateDoc(doc(db, 'vendors', vendor.id), {
        reportCount: (vendor.reportCount || 0) + 1,
      });
      setSubmitted(true);
    } catch (err) {
      console.error('Error submitting report:', err);
      alert('Failed to submit report. Please try again.');
    }
    setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 sticky top-0 bg-white z-10 rounded-t-3xl">
          <h3 className="font-bold text-gray-900 text-lg">
            {submitted ? '✅ Report Submitted' : '🚩 Report Vendor'}
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition">
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        {submitted ? (
          <div className="p-6 text-center">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5">
                <path d="M20 6L9 17l-5-5"/>
              </svg>
            </div>
            <h4 className="font-bold text-gray-900 text-lg mb-2">Thank you!</h4>
            <p className="text-gray-500 text-sm mb-6">
              Your report about <strong>{vendor.shopName}</strong> has been submitted. Our team will review it within 24 hours.
            </p>
            <button onClick={onClose} className="w-full py-3 bg-cyan-500 text-white rounded-xl font-semibold hover:bg-cyan-600 transition">
              Done
            </button>
          </div>
        ) : (
          <div className="p-5">
            <div className="bg-gray-50 rounded-xl p-3 mb-4 flex items-center gap-3">
              <img
                src={vendor.imageUrl || 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=100'}
                alt={vendor.shopName}
                className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                onError={(e) => e.target.src = 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=100'}
              />
              <div>
                <p className="font-semibold text-gray-900 text-sm">{vendor.shopName}</p>
                <p className="text-xs text-gray-500">🏛️ {vendor.university}</p>
              </div>
            </div>

            <p className="text-sm font-medium text-gray-700 mb-3">What's the issue?</p>
            <div className="space-y-2 mb-4">
              {REPORT_REASONS.map((r) => (
                <button
                  key={r.value}
                  onClick={() => setReason(r.value)}
                  className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition border-2 ${
                    reason === r.value
                      ? 'border-red-400 bg-red-50 text-red-700'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>

            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Additional details (optional)..."
              rows={3}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:border-red-400 focus:outline-none resize-none mb-4"
            />

            <button
              onClick={handleSubmit}
              disabled={!reason || submitting}
              className="w-full py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  Submitting...
                </>
              ) : '🚩 Submit Report'}
            </button>
            <p className="text-xs text-gray-400 text-center mt-3">
              Reports are reviewed within 24 hours. False reports may result in account restrictions.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

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
  const [showVendorCategories, setShowVendorCategories] = useState(false);
  const [selectedVendorCategory, setSelectedVendorCategory] = useState(null);
  const [reportingVendor, setReportingVendor] = useState(null);

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

      const uniSnapshot = await getDocs(collection(db, 'universities'));
      const uniImagesMap = {};
      const uniList = ['All Universities'];

      uniSnapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.name) {
          uniList.push(data.name);
          if (data.imageUrl) uniImagesMap[data.name] = data.imageUrl;
        }
      });

      setUniversityImages(uniImagesMap);
      setUniversities(uniList);

      const snapshot = await getDocs(collection(db, 'events'));
      const places = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(e => e.subCategory === 'places' && e.eventType === 'campus' && e.status === 'published');

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

  // ✅ Get all images for a place/vendor
  const getAllImages = (item) => {
    const all = [];
    if (item.imageUrl) all.push(item.imageUrl);
    if (item.images && Array.isArray(item.images)) {
      item.images.forEach(img => { if (img && !all.includes(img)) all.push(img); });
    }
    return all.slice(0, 10);
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
    if (selectedUniversity === 'All Universities') return 'https://images.unsplash.com/photo-1562774053-701939374585?w=1200&q=80';
    return universityImages[selectedUniversity] || 'https://images.unsplash.com/photo-1562774053-701939374585?w=1200&q=80';
  };

  const handleWhatsApp = (number) => {
    const cleaned = number.replace(/\D/g, '');
    window.open(`https://wa.me/${cleaned}`, '_blank');
  };

  const renderVendorCategories = () => (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => { setSelectedSubCategory('All'); setShowVendorCategories(false); }} className="p-2 hover:bg-gray-100 rounded-lg transition">
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
                <p className="text-white text-xs font-medium">{cat.count} vendor{cat.count !== 1 ? 's' : ''}</p>
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
        <button onClick={() => setSelectedVendorCategory(null)} className="p-2 hover:bg-gray-100 rounded-lg transition">
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
          <p className="text-gray-700 text-lg font-semibold mb-2">No {selectedVendorCategory} vendors yet</p>
          <p className="text-gray-500 text-sm">
            {selectedUniversity === 'All Universities' ? 'Check back soon!' : `No vendors in this category at ${selectedUniversity} yet`}
          </p>
          <button onClick={() => setSelectedVendorCategory(null)}
            className="mt-4 px-6 py-2 bg-cyan-500 text-white rounded-lg text-sm font-medium hover:bg-cyan-600 transition">
            Browse Other Categories
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {filteredVendors.map((vendor) => {
            const vendorImages = getAllImages(vendor);
            return (
              <div key={vendor.id} className="bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition group">

                {/* ✅ Multi-image carousel */}
                <div className="relative">
                  <ImageCarousel images={vendorImages} alt={vendor.shopName} />
                  <div className="absolute top-3 left-3 z-10">
                    <span className="bg-white/90 backdrop-blur-sm text-cyan-600 text-xs px-3 py-1 rounded-full font-semibold">
                      {VENDOR_CATEGORIES.find(c => c.name === vendor.category)?.emoji} {vendor.category}
                    </span>
                  </div>
                  {vendor.reportCount > 0 && (
                    <div className="absolute top-3 right-3 z-10 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full font-medium">
                      🚩 {vendor.reportCount}
                    </div>
                  )}
                </div>

                <div className="p-4">
                  <h3 className="font-bold text-gray-900 text-base mb-1 group-hover:text-cyan-500 transition">
                    {vendor.shopName}
                  </h3>
                  <p className="text-sm text-gray-500 mb-3 line-clamp-2">{vendor.description}</p>
                  {vendor.university && (
                    <p className="text-xs text-gray-400 mb-3">🏛️ {vendor.university}</p>
                  )}
                  <button
                    onClick={() => handleWhatsApp(vendor.whatsappNumber)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-sm font-semibold transition mb-2"
                  >
                    <MessageCircle size={16} />
                    Chat on WhatsApp
                  </button>

                  {/* ✅ Report button */}
                  <button
                    onClick={() => setReportingVendor(vendor)}
                    className="w-full flex items-center justify-center gap-1.5 py-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl text-xs font-medium transition border border-red-100 hover:border-red-200"
                  >
                    <Flag size={12} />
                    Report this vendor
                  </button>
                </div>
              </div>
            );
          })}
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
            <p className="text-sm sm:text-base text-gray-600">Libraries, auditoriums, cafeterias and more on campus.</p>
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
            onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1562774053-701939374585?w=1200&q=80'; }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-transparent"></div>
          <div className="absolute bottom-4 sm:bottom-6 left-4 sm:left-6 text-white">
            <div className="bg-purple-500 text-white text-xs px-3 py-1 rounded-full inline-block mb-2">🏛️ Campus Spots</div>
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
            <p className="text-gray-700 text-lg font-semibold mb-2">Select a campus to explore places</p>
            <p className="text-gray-500 text-sm">Use the dropdown above to choose a university</p>
          </div>

        ) : showVendorCategories && !selectedVendorCategory ? (
          renderVendorCategories()

        ) : showVendorCategories && selectedVendorCategory ? (
          renderVendorList()

        ) : filteredPlaces.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {filteredPlaces.map((place) => {
              const placeImages = getAllImages(place);
              return (
                <div
                  key={place.id}
                  onClick={() => navigate(`/event/${place.id}`)}
                  className="bg-white rounded-xl overflow-hidden shadow-md hover:shadow-xl transition group cursor-pointer"
                >
                  {/* ✅ Multi-image carousel */}
                  <div className="relative" onClick={(e) => e.stopPropagation()}>
                    <ImageCarousel images={placeImages} alt={place.title} />
                    <div className="absolute top-3 left-3 z-10">
                      <span className="bg-purple-500 text-white text-xs px-3 py-1 rounded-full">
                        {place.campusSubCategory || 'Campus Place'}
                      </span>
                    </div>
                    {place.isFree && (
                      <div className="absolute bottom-3 right-3 z-10">
                        <span className="bg-emerald-500 text-white text-xs px-3 py-1 rounded-lg font-semibold">Free Entry</span>
                      </div>
                    )}
                  </div>

                  <div className="p-4">
                    <h3 className="text-base font-bold text-gray-900 mb-2 group-hover:text-cyan-500 transition line-clamp-2">
                      {place.title}
                    </h3>
                    <div className="space-y-1.5 text-sm text-gray-600">
                      {place.university && (
                        <div className="flex items-center gap-2"><span>🏛️ {place.university}</span></div>
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
              );
            })}
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
              {selectedSubCategory !== 'All' ? 'Try selecting a different type' : 'Places will appear here once added for this campus'}
            </p>
            {selectedSubCategory !== 'All' && (
              <button onClick={() => setSelectedSubCategory('All')}
                className="mt-4 px-6 py-2 bg-cyan-500 text-white rounded-lg text-sm font-medium hover:bg-cyan-600 transition">
                View All Places
              </button>
            )}
          </div>
        )}

      </main>

      <Footer />

      {/* ✅ Report modal */}
      {reportingVendor && (
        <ReportVendorModal vendor={reportingVendor} onClose={() => setReportingVendor(null)} />
      )}
    </div>
  );
}