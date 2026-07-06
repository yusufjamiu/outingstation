import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc, arrayUnion, arrayRemove, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Link } from 'react-router-dom';
import {
  Search, SlidersHorizontal, X, MapPin,
  ChevronLeft, ChevronRight, Heart, Users, Building2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const CITIES = ['All Cities', 'Lagos', 'Abuja', 'Ibadan', 'Port Harcourt', 'Others'];
const CAPACITIES = ['Any Capacity', 'Up to 100', '100 - 300', '300 - 500', '500+'];
const PRICES = ['All', 'Under ₦100k', '₦100k - ₦500k', 'Above ₦500k'];
const HALLS_PER_PAGE = 12;

const matchesCapacity = (cap, filter) => {
  if (filter === 'Any Capacity') return true;
  const c = Number(cap) || 0;
  if (filter === 'Up to 100') return c <= 100;
  if (filter === '100 - 300') return c > 100 && c <= 300;
  if (filter === '300 - 500') return c > 300 && c <= 500;
  if (filter === '500+') return c > 500;
  return true;
};

const matchesPrice = (price, filter) => {
  if (filter === 'All') return true;
  const p = Number(price) || 0;
  if (filter === 'Under ₦100k') return p < 100000;
  if (filter === '₦100k - ₦500k') return p >= 100000 && p <= 500000;
  if (filter === 'Above ₦500k') return p > 500000;
  return true;
};

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
    <div className="w-20 h-20 bg-cyan-50 rounded-full flex items-center justify-center mb-4">
      <Building2 size={36} className="text-cyan-400" />
    </div>
    <h3 className="text-xl font-bold text-gray-900 mb-2">No halls found</h3>
    <p className="text-gray-500 text-center max-w-sm mb-6">
      Try adjusting your filters, or check back later as more venues are added.
    </p>
    <button
      onClick={onReset}
      className="px-6 py-3 bg-cyan-500 text-white rounded-full font-medium hover:bg-cyan-600 transition"
    >
      Clear Filters
    </button>
  </div>
);

export default function HallsPage() {
  const { currentUser } = useAuth();
  const [halls, setHalls] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savedEvents, setSavedEvents] = useState([]);
  const [search, setSearch] = useState('');
  const [city, setCity] = useState('All Cities');
  const [capacity, setCapacity] = useState('Any Capacity');
  const [price, setPrice] = useState('All');
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);

  useEffect(() => { loadHalls(); }, []);
  useEffect(() => { if (currentUser) loadSaved(); }, [currentUser]);
  useEffect(() => { applyFilters(); }, [halls, search, city, capacity, price]);

  const loadHalls = async () => {
    try {
      const snap = await getDocs(collection(db, 'events'));
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        .filter(e =>
          e.status === 'published' &&
          e.subCategory === 'places' &&
          (e.category === 'Halls' || e.category === 'Halls & Venues' ||
           e.eventCategory === 'Halls' || e.eventCategory === 'Halls & Venues')
        )
        .sort((a, b) => (a.title || '').localeCompare(b.title || ''));
      setHalls(all);
    } catch (err) {
      console.error('Error loading halls:', err);
    }
    setLoading(false);
  };

  const loadSaved = async () => {
    try {
      const snap = await getDoc(doc(db, 'users', currentUser.uid));
      setSavedEvents(snap.data()?.savedEvents || []);
    } catch (err) { console.error(err); }
  };

  const toggleSave = async (hallId) => {
    if (!currentUser) return;
    const isSaved = savedEvents.includes(hallId);
    setSavedEvents(prev => isSaved ? prev.filter(id => id !== hallId) : [...prev, hallId]);
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), {
        savedEvents: isSaved ? arrayRemove(hallId) : arrayUnion(hallId),
      });
    } catch (err) { console.error(err); }
  };

  const applyFilters = () => {
    let result = [...halls];
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(e =>
        e.title?.toLowerCase().includes(q) ||
        e.location?.toLowerCase().includes(q) ||
        e.address?.toLowerCase().includes(q)
      );
    }
    if (city !== 'All Cities') result = result.filter(e => e.city === city || (e.location || '').includes(city));
    result = result.filter(e => matchesCapacity(e.capacity, capacity));
    result = result.filter(e => e.isFree || matchesPrice(e.ticketPrice, price));
    setFiltered(result);
    setPage(1);
  };

  const resetFilters = () => {
    setSearch(''); setCity('All Cities'); setCapacity('Any Capacity'); setPrice('All'); setPage(1);
  };

  const totalPages = Math.ceil(filtered.length / HALLS_PER_PAGE);
  const paginated = filtered.slice((page - 1) * HALLS_PER_PAGE, page * HALLS_PER_PAGE);
  const activeFilterCount = [city !== 'All Cities', capacity !== 'Any Capacity', price !== 'All'].filter(Boolean).length;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      {/* Header */}
      <div className="bg-white border-b border-gray-100 py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">Find A Hall</h1>
          <p className="text-gray-500">Event centers and venues you can book for your next event</p>

          {/* Search */}
          <div className="mt-6 flex gap-3">
            <div className="flex-1 relative">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search halls by name or area..."
                className="w-full pl-11 pr-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-cyan-500 transition"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-3 rounded-xl border-2 text-sm font-medium transition ${
                showFilters || activeFilterCount > 0
                  ? 'border-cyan-500 bg-cyan-50 text-cyan-600'
                  : 'border-gray-200 text-gray-700 hover:border-cyan-400'
              }`}
            >
              <SlidersHorizontal size={16} />
              Filters
              {activeFilterCount > 0 && (
                <span className="bg-cyan-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>

          {/* Filters */}
          {showFilters && (
            <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-3">
              <select value={city} onChange={e => setCity(e.target.value)}
                className="px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-cyan-500 appearance-none bg-white">
                {CITIES.map(c => <option key={c}>{c}</option>)}
              </select>
              <select value={capacity} onChange={e => setCapacity(e.target.value)}
                className="px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-cyan-500 appearance-none bg-white">
                {CAPACITIES.map(c => <option key={c}>{c}</option>)}
              </select>
              <select value={price} onChange={e => setPrice(e.target.value)}
                className="px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-cyan-500 appearance-none bg-white">
                {PRICES.map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Results */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {!loading && (
          <div className="flex items-center justify-between mb-6">
            <p className="text-sm text-gray-500">
              {filtered.length} hall{filtered.length !== 1 ? 's' : ''} found
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
            : paginated.map(hall => {
                const isSaved = savedEvents.includes(hall.id);
                const hallPrice = hall.ticketPrice;
                return (
                  <div key={hall.id} className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 group flex flex-col">
                    <div className="relative h-48 overflow-hidden flex-shrink-0">
                      <Link to={`/e/${hall.slug || hall.id}`}>
                        <img
                          src={hall.imageUrl || 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=400&h=300&fit=crop'}
                          alt={hall.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </Link>
                      {currentUser && (
                        <button
                          onClick={() => toggleSave(hall.id)}
                          className="absolute top-3 right-3 w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow hover:scale-110 transition"
                        >
                          <Heart size={14} className={isSaved ? 'fill-red-500 text-red-500' : 'text-gray-400'} />
                        </button>
                      )}
                      <div className="absolute bottom-3 left-3">
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${hall.isFree ? 'bg-emerald-500 text-white' : 'bg-white text-gray-800'}`}>
                          {hall.isFree ? 'Free Entry' : hallPrice ? `₦${Number(hallPrice).toLocaleString()} / booking` : 'Price on request'}
                        </span>
                      </div>
                    </div>
                    <div className="p-4 flex flex-col flex-1">
                      <Link to={`/e/${hall.slug || hall.id}`}>
                        <h3 className="font-bold text-gray-900 text-sm mb-2 line-clamp-2 hover:text-cyan-500 transition">
                          {hall.title}
                        </h3>
                      </Link>
                      <div className="space-y-1.5 mt-auto">
                        {hall.capacity && (
                          <div className="flex items-center gap-1.5 text-xs text-gray-500">
                            <Users size={12} className="text-cyan-400 flex-shrink-0" />
                            <span>Up to {hall.capacity} guests</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                          <MapPin size={12} className="text-cyan-400 flex-shrink-0" />
                          <span className="line-clamp-1">{hall.address || hall.location || hall.city || 'Lagos'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
          }
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-10">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="w-10 h-10 rounded-xl border-2 border-gray-200 flex items-center justify-center disabled:opacity-40 hover:border-cyan-400 transition"
            >
              <ChevronLeft size={16} />
            </button>
            {[...Array(totalPages)].map((_, i) => (
              <button
                key={i}
                onClick={() => setPage(i + 1)}
                className={`w-10 h-10 rounded-xl text-sm font-bold transition ${
                  page === i + 1
                    ? 'bg-cyan-500 text-white border-2 border-cyan-500'
                    : 'border-2 border-gray-200 text-gray-600 hover:border-cyan-400'
                }`}
              >
                {i + 1}
              </button>
            ))}
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="w-10 h-10 rounded-xl border-2 border-gray-200 flex items-center justify-center disabled:opacity-40 hover:border-cyan-400 transition"
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