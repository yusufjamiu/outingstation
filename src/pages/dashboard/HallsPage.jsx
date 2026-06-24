import { useState, useEffect } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { Heart, MapPin, Users, Phone, Clock, ChevronDown } from 'lucide-react';

const NIGERIAN_CITIES = [
  'All Cities',
  'Lagos', 'Abuja', 'Port Harcourt', 'Ibadan', 'Kano',
  'Benin City', 'Enugu', 'Calabar', 'Kaduna', 'Jos',
  'Uyo', 'Owerri', 'Asaba', 'Warri', 'Ilorin',
  'Abeokuta', 'Osogbo', 'Akure', 'Ado-Ekiti', 'Yenagoa',
];

export default function HallsPage() {
  const navigate = useNavigate();
  const { currentUser, userProfile } = useAuth();
  const { searchQuery } = useOutletContext();

  const [halls, setHalls]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [selectedCity, setSelectedCity] = useState('All Cities');
  const [savedIds, setSavedIds]     = useState([]);
  const [showAllCities, setShowAllCities] = useState(false);

  const VISIBLE_CITIES = showAllCities ? NIGERIAN_CITIES : NIGERIAN_CITIES.slice(0, 8);

  useEffect(() => {
    loadHalls();
    loadSaved();
  }, [currentUser]);

  const loadHalls = async () => {
    try {
      setLoading(true);
      const snap = await getDocs(collection(db, 'events'));
      const all = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(e =>
          e.status === 'published' &&
          e.subCategory === 'places' &&
          (e.category === 'Halls' || e.category === 'Halls & Venues')
        );
      setHalls(all);
    } catch (err) {
      console.error('Error loading halls:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadSaved = async () => {
    if (!currentUser) return;
    try {
      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      if (userDoc.exists()) setSavedIds(userDoc.data().savedEvents || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSave = async (e, id) => {
    e.stopPropagation();
    if (!currentUser) { navigate('/login'); return; }
    const isSaved = savedIds.includes(id);
    try {
      const ref = doc(db, 'users', currentUser.uid);
      if (isSaved) {
        await updateDoc(ref, { savedEvents: arrayRemove(id) });
        setSavedIds(prev => prev.filter(x => x !== id));
      } else {
        await updateDoc(ref, { savedEvents: arrayUnion(id) });
        setSavedIds(prev => [...prev, id]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // ✅ Filter by selected city + search query
  const displayed = halls.filter(h => {
    const loc = (h.location || '').toLowerCase();
    const cityMatch = selectedCity === 'All Cities' || loc.includes(selectedCity.toLowerCase());
    const searchMatch = !searchQuery?.trim() ||
      h.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      h.location?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      h.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return cityMatch && searchMatch;
  });

  const getImage = (h) => h.imageUrl || (h.images && h.images[0]) ||
    'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&q=80';

  return (
    <div className="p-4 sm:p-6 lg:p-8">

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-2">
          <div className="w-14 h-14 bg-gradient-to-br from-cyan-500 to-teal-500 rounded-2xl flex items-center justify-center flex-shrink-0">
            <span className="text-2xl">🏛️</span>
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Halls & Venues</h1>
            <p className="text-sm text-gray-500">Event halls, conference centres & venues across Nigeria</p>
          </div>
        </div>
      </div>

      {/* City filter chips */}
      <div className="mb-6 bg-white rounded-2xl border border-gray-100 p-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Filter by City</p>
        <div className="flex flex-wrap gap-2">
          {VISIBLE_CITIES.map(city => (
            <button
              key={city}
              onClick={() => setSelectedCity(city)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                selectedCity === city
                  ? 'bg-cyan-500 text-white shadow-sm'
                  : 'bg-gray-50 text-gray-600 border border-gray-200 hover:border-cyan-400'
              }`}
            >
              {city}
            </button>
          ))}
          <button
            onClick={() => setShowAllCities(v => !v)}
            className="px-3 py-1.5 rounded-full text-xs font-semibold text-cyan-600 border border-cyan-200 hover:bg-cyan-50 transition flex items-center gap-1"
          >
            {showAllCities ? 'Show less' : `+${NIGERIAN_CITIES.length - 8} more`}
            <ChevronDown size={12} className={`transition-transform ${showAllCities ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {/* Count */}
      <p className="text-sm text-gray-500 font-medium mb-4">
        {displayed.length} hall{displayed.length !== 1 ? 's' : ''} found
        {selectedCity !== 'All Cities' && ` in ${selectedCity}`}
        {searchQuery && ` for "${searchQuery}"`}
      </p>

      {/* Grid */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-cyan-500" />
        </div>
      ) : displayed.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">🏛️</span>
          </div>
          <p className="text-gray-700 text-lg font-medium mb-2">
            No halls found {selectedCity !== 'All Cities' ? `in ${selectedCity}` : ''}
          </p>
          <p className="text-gray-400 text-sm mb-6">
            {selectedCity !== 'All Cities'
              ? 'Try selecting a different city or view all cities.'
              : 'Check back soon — we\'re adding more venues daily!'}
          </p>
          {selectedCity !== 'All Cities' && (
            <button
              onClick={() => setSelectedCity('All Cities')}
              className="px-6 py-2.5 bg-cyan-500 text-white rounded-xl font-semibold text-sm hover:bg-cyan-600 transition"
            >
              View All Cities
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {displayed.map(hall => {
            const isSaved = savedIds.includes(hall.id);
            return (
              <div
                key={hall.id}
                onClick={() => navigate(`/event/${hall.id}`)}
                className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg border border-gray-100 transition-all cursor-pointer group"
              >
                {/* Image */}
                <div className="relative h-48">
                  <img
                    src={getImage(hall)}
                    alt={hall.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                  />
                  {/* City badge */}
                  <div className="absolute top-3 left-3">
                    <span className="bg-cyan-500 text-white text-xs px-2.5 py-1 rounded-full font-semibold flex items-center gap-1">
                      <MapPin size={10} /> {(hall.location || '').split(',')[0].trim() || 'Nigeria'}
                    </span>
                  </div>
                  {/* Save button */}
                  <button
                    onClick={(e) => handleSave(e, hall.id)}
                    className="absolute top-3 right-3 w-9 h-9 bg-white rounded-full flex items-center justify-center hover:bg-gray-100 transition shadow-sm"
                  >
                    <Heart
                      size={16}
                      className={isSaved ? 'text-red-500 fill-red-500' : 'text-gray-400'}
                    />
                  </button>
                  {/* Free badge */}
                  {hall.isFree && (
                    <div className="absolute bottom-3 right-3">
                      <span className="bg-emerald-500 text-white text-xs px-2.5 py-1 rounded-lg font-semibold">
                        Free Entry
                      </span>
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="p-4">
                  <h3 className="font-bold text-gray-900 text-base mb-1 group-hover:text-cyan-600 transition line-clamp-2">
                    {hall.title}
                  </h3>
                  {hall.description && (
                    <p className="text-xs text-gray-500 mb-3 line-clamp-2">{hall.description}</p>
                  )}
                  <div className="space-y-1.5 text-xs text-gray-500">
                    <div className="flex items-center gap-1.5">
                      <MapPin size={12} className="text-cyan-500 flex-shrink-0" />
                      <span className="truncate">{hall.address || hall.location || 'Nigeria'}</span>
                    </div>
                    {(hall.openingTime || hall.closingTime) && (
                      <div className="flex items-center gap-1.5">
                        <Clock size={12} className="text-cyan-500 flex-shrink-0" />
                        <span>
                          {hall.openingTime && hall.closingTime
                            ? `${hall.openingTime} – ${hall.closingTime}`
                            : hall.openingTime || hall.closingTime}
                        </span>
                      </div>
                    )}
                    {hall.capacity && (
                      <div className="flex items-center gap-1.5">
                        <Users size={12} className="text-cyan-500 flex-shrink-0" />
                        <span>Capacity: {hall.capacity}</span>
                      </div>
                    )}
                    {hall.organizerPhone && (
                      <div className="flex items-center gap-1.5">
                        <Phone size={12} className="text-cyan-500 flex-shrink-0" />
                        <span>{hall.organizerPhone}</span>
                      </div>
                    )}
                  </div>

                  {/* Price */}
                  {!hall.isFree && hall.ticketPrice > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <span className="text-cyan-600 font-bold text-sm">
                        ₦{Number(hall.ticketPrice).toLocaleString()}
                        <span className="text-gray-400 font-normal text-xs"> / booking</span>
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}