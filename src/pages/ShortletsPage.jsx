import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc, arrayUnion, arrayRemove, getDoc, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { Link } from 'react-router-dom';
import {
  Search, SlidersHorizontal, X, MapPin,
  ChevronLeft, ChevronRight, Heart, Users, Home as HomeIcon
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const CITIES = ['All Cities', 'Lagos', 'Abuja', 'Ibadan', 'Port Harcourt', 'Others'];
const GUEST_OPTIONS = ['Any', '1-2', '3-4', '5+'];
const SHORTLETS_PER_PAGE = 12;

// ✅ CHANGED — listings now live in their own `shortlets` collection
// (one doc per property, owned by an agency via `agencyId`), not as
// businessType: 'Shortlet' business docs. An agency (e.g. Success Homes)
// registers once through OSB, gets approved once, then adds as many
// individual property listings as they want from their dashboard.
function priceSuffix(type) {
  if (type === 'hour') return '/hour';
  if (type === 'day') return '/day';
  return '/night';
}

const SkeletonCard = () => (
  <div className="bg-white rounded-2xl overflow-hidden shadow-sm animate-pulse">
    <div className="h-48 bg-gray-200" />
    <div className="p-4 space-y-3">
      <div className="h-4 bg-gray-200 rounded-full w-3/4" />
      <div className="h-3 bg-gray-200 rounded-full w-1/2" />
      <div className="h-3 bg-gray-200 rounded-full w-2/3" />
    </div>
  </div>
);

const EmptyState = ({ onReset }) => (
  <div className="col-span-full flex flex-col items-center justify-center py-20 px-4">
    <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mb-4">
      <HomeIcon size={36} className="text-amber-400" />
    </div>
    <h3 className="text-xl font-bold text-gray-900 mb-2">No shortlets found</h3>
    <p className="text-gray-500 text-center max-w-sm mb-6">
      Try adjusting your filters, or check back later for new listings.
    </p>
    <button
      onClick={onReset}
      className="px-6 py-3 bg-amber-500 text-white rounded-full font-medium hover:bg-amber-600 transition"
    >
      Clear Filters
    </button>
  </div>
);

function guestsMatch(maxGuests, range) {
  if (range === 'Any') return true;
  const g = Number(maxGuests || 0);
  if (range === '1-2') return g >= 1 && g <= 2;
  if (range === '3-4') return g >= 3 && g <= 4;
  if (range === '5+') return g >= 5;
  return true;
}

export default function ShortletsPage() {
  const { currentUser } = useAuth();
  const [shortlets, setShortlets] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savedEvents, setSavedEvents] = useState([]);
  const [search, setSearch] = useState('');
  const [city, setCity] = useState('All Cities');
  const [guests, setGuests] = useState('Any');
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);

  useEffect(() => { loadShortlets(); }, []);
  useEffect(() => { if (currentUser) loadSaved(); }, [currentUser]);
  useEffect(() => { applyFilters(); }, [shortlets, search, city, guests]);

  const loadShortlets = async () => {
    try {
      const snap = await getDocs(
        query(collection(db, 'shortlets'), where('available', '==', true))
      );
      const all = snap.docs.map(d => {
        const l = d.data();
        return {
          id: d.id,
          title: l.title,
          description: l.description || '',
          location: [l.area, l.city].filter(Boolean).join(', '),
          city: l.city || '',
          whatsappNumber: l.whatsappNumber,
          mapsLink: l.mapsLink || '',
          images: l.images || [],
          agencyName: l.agencyName || '',
          priceType: l.priceType || 'night',
          price: l.price || 0,
          minHours: l.minHours,
          maxGuests: l.maxGuests,
          bedrooms: l.bedrooms,
          bathrooms: l.bathrooms,
          amenities: l.amenities || [],
        };
      }).sort((a, b) => (a.title || '').localeCompare(b.title || ''));
      setShortlets(all);
    } catch (err) {
      console.error('Error loading shortlets:', err);
    }
    setLoading(false);
  };

  const loadSaved = async () => {
    try {
      const snap = await getDoc(doc(db, 'users', currentUser.uid));
      setSavedEvents(snap.data()?.savedEvents || []);
    } catch (err) { console.error(err); }
  };

  const toggleSave = async (id) => {
    if (!currentUser) return;
    const isSaved = savedEvents.includes(id);
    setSavedEvents(prev => isSaved ? prev.filter(x => x !== id) : [...prev, id]);
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), {
        savedEvents: isSaved ? arrayRemove(id) : arrayUnion(id),
      });
    } catch (err) { console.error(err); }
  };

  const applyFilters = () => {
    let result = [...shortlets];
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(s =>
        s.title?.toLowerCase().includes(q) ||
        s.location?.toLowerCase().includes(q) ||
        s.agencyName?.toLowerCase().includes(q)
      );
    }
    if (city !== 'All Cities') result = result.filter(s => s.city === city || (s.location || '').includes(city));
    if (guests !== 'Any') result = result.filter(s => guestsMatch(s.maxGuests, guests));
    setFiltered(result);
    setPage(1);
  };

  const resetFilters = () => {
    setSearch(''); setCity('All Cities'); setGuests('Any'); setPage(1);
  };

  const totalPages = Math.ceil(filtered.length / SHORTLETS_PER_PAGE);
  const paginated = filtered.slice((page - 1) * SHORTLETS_PER_PAGE, page * SHORTLETS_PER_PAGE);
  const activeFilterCount = [city !== 'All Cities', guests !== 'Any'].filter(Boolean).length;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="bg-white border-b border-gray-100 py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">Get a Shortlet</h1>
          <p className="text-gray-500">Short-term stays for your next trip, picked from around your city</p>

          <div className="mt-6 flex gap-3">
            <div className="flex-1 relative">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search shortlets by name, area, or agency..."
                className="w-full pl-11 pr-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-amber-500 transition"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-3 rounded-xl border-2 text-sm font-medium transition ${
                showFilters || activeFilterCount > 0
                  ? 'border-amber-500 bg-amber-50 text-amber-600'
                  : 'border-gray-200 text-gray-700 hover:border-amber-400'
              }`}
            >
              <SlidersHorizontal size={16} />
              Filters
              {activeFilterCount > 0 && (
                <span className="bg-amber-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>

          {showFilters && (
            <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-3">
              <select value={city} onChange={e => setCity(e.target.value)}
                className="px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-amber-500 appearance-none bg-white">
                {CITIES.map(c => <option key={c}>{c}</option>)}
              </select>
              <select value={guests} onChange={e => setGuests(e.target.value)}
                className="px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-amber-500 appearance-none bg-white">
                {GUEST_OPTIONS.map(g => <option key={g}>{g === 'Any' ? 'Any guests' : `${g} guests`}</option>)}
              </select>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {!loading && (
          <div className="flex items-center justify-between mb-6">
            <p className="text-sm text-gray-500">
              {filtered.length} shortlet{filtered.length !== 1 ? 's' : ''} found
            </p>
            {activeFilterCount > 0 && (
              <button onClick={resetFilters} className="flex items-center gap-1 text-sm text-red-500 hover:text-red-600">
                <X size={14} /> Clear filters
              </button>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
          {loading
            ? [...Array(8)].map((_, i) => <SkeletonCard key={i} />)
            : paginated.length === 0
            ? <EmptyState onReset={resetFilters} />
            : paginated.map(s => {
                const isSaved = savedEvents.includes(s.id);
                const statLine = [
                  s.bedrooms != null ? `${s.bedrooms} bed` : null,
                  s.bathrooms != null ? `${s.bathrooms} bath` : null,
                  s.maxGuests != null ? `${s.maxGuests} guests` : null,
                ].filter(Boolean).join(' · ');
                return (
                  <div key={s.id} className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 group flex flex-col">
                    <div className="relative h-48 overflow-hidden flex-shrink-0">
                      <Link to={`/event/${s.id}`}>
                        <img
                          src={s.images[0] || 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=400&h=300&fit=crop'}
                          alt={s.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </Link>
                      {currentUser && (
                        <button
                          onClick={() => toggleSave(s.id)}
                          className="absolute top-3 right-3 w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow hover:scale-110 transition"
                        >
                          <Heart size={14} className={isSaved ? 'fill-red-500 text-red-500' : 'text-gray-400'} />
                        </button>
                      )}
                      <div className="absolute bottom-3 left-3">
                        <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-white text-gray-800">
                          ₦{Number(s.price || 0).toLocaleString()}{priceSuffix(s.priceType)}
                        </span>
                      </div>
                    </div>
                    <div className="p-4 flex flex-col flex-1">
                      <Link to={`/event/${s.id}`}>
                        <h3 className="font-bold text-gray-900 text-sm mb-1 line-clamp-2 hover:text-amber-600 transition">
                          {s.title}
                        </h3>
                      </Link>
                      {s.agencyName && (
                        <p className="text-xs text-gray-400 mb-2">by {s.agencyName}</p>
                      )}
                      <div className="space-y-1.5 mt-auto">
                        {statLine && (
                          <div className="flex items-center gap-1.5 text-xs text-gray-500">
                            <Users size={12} className="text-amber-400 flex-shrink-0" />
                            <span className="line-clamp-1">{statLine}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                          <MapPin size={12} className="text-amber-400 flex-shrink-0" />
                          <span className="line-clamp-1">{s.location || 'Lagos'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
          }
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-10">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="w-10 h-10 rounded-xl border-2 border-gray-200 flex items-center justify-center disabled:opacity-40 hover:border-amber-400 transition"
            >
              <ChevronLeft size={16} />
            </button>
            {[...Array(totalPages)].map((_, i) => (
              <button
                key={i}
                onClick={() => setPage(i + 1)}
                className={`w-10 h-10 rounded-xl text-sm font-bold transition ${
                  page === i + 1
                    ? 'bg-amber-500 text-white border-2 border-amber-500'
                    : 'border-2 border-gray-200 text-gray-600 hover:border-amber-400'
                }`}
              >
                {i + 1}
              </button>
            ))}
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="w-10 h-10 rounded-xl border-2 border-gray-200 flex items-center justify-center disabled:opacity-40 hover:border-amber-400 transition"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}