import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc, arrayUnion, arrayRemove, getDoc, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { Link } from 'react-router-dom';
import {
  Search, SlidersHorizontal, X, MapPin,
  ChevronLeft, ChevronRight, Heart, Clock, UtensilsCrossed, Navigation
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const CITIES = ['All Cities', 'Lagos', 'Abuja', 'Ibadan', 'Port Harcourt', 'Others'];
const PRICES = ['All', 'Free', 'Paid'];
const RESTAURANTS_PER_PAGE = 12;

// TODO once confirmed in Firestore: delete whichever branch doesn't match your real data.
const isRestaurant = (e) =>
  e.category === 'Restaurant' ||
  e.eventCategory === 'Restaurant' ||
  e.category === 'Food & Dining' ||
  e.eventCategory === 'Food & Dining';

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
      <UtensilsCrossed size={36} className="text-cyan-400" />
    </div>
    <h3 className="text-xl font-bold text-gray-900 mb-2">No restaurants found</h3>
    <p className="text-gray-500 text-center max-w-sm mb-6">
      Try adjusting your filters, or check back later for new spots.
    </p>
    <button
      onClick={onReset}
      className="px-6 py-3 bg-cyan-500 text-white rounded-full font-medium hover:bg-cyan-600 transition"
    >
      Clear Filters
    </button>
  </div>
);

// matches ResortsPage.jsx/CampusPlaces.jsx exactly
function formatOpeningDays(days) {
  if (!days || days.length === 0) return '';
  const order = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  if (days.length === 7) return 'Every day';
  const indices = days.map(d => order.indexOf(d)).filter(i => i !== -1).sort((a, b) => a - b);
  if (indices.length === 0) return '';
  const groups = [];
  let current = [indices[0]];
  for (let i = 1; i < indices.length; i++) {
    if (indices[i] === current[current.length - 1] + 1) current.push(indices[i]);
    else { groups.push(current); current = [indices[i]]; }
  }
  groups.push(current);
  return groups.map(g => g.length === 1 ? order[g[0]] : `${order[g[0]]}-${order[g[g.length - 1]]}`).join(', ');
}

export default function RestaurantsPage() {
  const { currentUser } = useAuth();
  const [restaurants, setRestaurants] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savedEvents, setSavedEvents] = useState([]);
  const [search, setSearch] = useState('');
  const [city, setCity] = useState('All Cities');
  const [price, setPrice] = useState('All');
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);

  useEffect(() => { loadRestaurants(); }, []);
  useEffect(() => { if (currentUser) loadSaved(); }, [currentUser]);
  useEffect(() => { applyFilters(); }, [restaurants, search, city, price]);

  const loadRestaurants = async () => {
    try {
      const snap = await getDocs(collection(db, 'events'));
      const fromEvents = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        .filter(e => e.status === 'published' && e.subCategory === 'places' && isRestaurant(e));

      // Also pull approved Restaurant businesses registered through
      // OSB's "List a Place" flow, same fix as mobile's
      // restaurants_screen.dart.
      let fromBusinesses = [];
      try {
        const bizSnap = await getDocs(
          query(collection(db, 'businesses'), where('businessType', '==', 'Restaurant'), where('status', '==', 'approved'))
        );
        fromBusinesses = bizSnap.docs.map(d => {
          const biz = d.data();
          // package photos never carried over, only logoUrl.
          const packageImages = [...new Set(
            (biz.pricingTiers || []).map(t => t.image).filter(img => img)
          )];
          // card reads alwaysOpen/operatingHours (a formatted
          // string), not openingTime/closingTime/openingDays directly.
          const days = biz.openingDays || [];
          const isAlwaysOpen = days.length === 7;
          const dayLabel = formatOpeningDays(days);
          const operatingHours = (biz.openingTime && biz.closingTime)
            ? `${dayLabel ? dayLabel + ' · ' : ''}${biz.openingTime} - ${biz.closingTime}`
            : '';
          return {
            id: d.id,
            title: biz.businessName,
            description: biz.description || '',
            category: 'Restaurant',
            subCategory: 'places',
            location: biz.city || '',
            whatsappNumber: biz.whatsappNumber,
            mapsLink: biz.mapsLink || '', // ✅ NEW
            // ✅ FIXED — was hardcoded `isFree: true` regardless of what
            // the owner actually set on OSBPlaceManageScreen/registration.
            // A restaurant marked "Paid Entry — ₦2000" was showing as
            // free here no matter what.
            isFree: biz.isFree !== false,
            ticketPrice: biz.isFree === false ? (biz.price || 0) : null,
            imageUrl: biz.logoUrl,
            images: packageImages,
            status: 'published',
            alwaysOpen: isAlwaysOpen,
            operatingHours,
          };
        });
      } catch (err) {
        console.error('Error loading Restaurant businesses:', err);
      }

      const all = [...fromEvents, ...fromBusinesses]
        .sort((a, b) => (a.title || '').localeCompare(b.title || ''));
      setRestaurants(all);
    } catch (err) {
      console.error('Error loading restaurants:', err);
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
    let result = [...restaurants];
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(e =>
        e.title?.toLowerCase().includes(q) ||
        e.location?.toLowerCase().includes(q) ||
        e.address?.toLowerCase().includes(q)
      );
    }
    if (city !== 'All Cities') result = result.filter(e => e.city === city || (e.location || '').includes(city));
    if (price === 'Free') result = result.filter(e => e.isFree || e.ticketPrice === 0);
    if (price === 'Paid') result = result.filter(e => !e.isFree && e.ticketPrice > 0);
    setFiltered(result);
    setPage(1);
  };

  const resetFilters = () => {
    setSearch(''); setCity('All Cities'); setPrice('All'); setPage(1);
  };

  const totalPages = Math.ceil(filtered.length / RESTAURANTS_PER_PAGE);
  const paginated = filtered.slice((page - 1) * RESTAURANTS_PER_PAGE, page * RESTAURANTS_PER_PAGE);
  const activeFilterCount = [city !== 'All Cities', price !== 'All'].filter(Boolean).length;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="bg-white border-b border-gray-100 py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">Find A Restaurant</h1>
          <p className="text-gray-500">Places to eat and hang out, picked from around your city</p>

          <div className="mt-6 flex gap-3">
            <div className="flex-1 relative">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search restaurants by name or area..."
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

          {showFilters && (
            <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-3">
              <select value={city} onChange={e => setCity(e.target.value)}
                className="px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-cyan-500 appearance-none bg-white">
                {CITIES.map(c => <option key={c}>{c}</option>)}
              </select>
              <select value={price} onChange={e => setPrice(e.target.value)}
                className="px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-cyan-500 appearance-none bg-white">
                {PRICES.map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {!loading && (
          <div className="flex items-center justify-between mb-6">
            <p className="text-sm text-gray-500">
              {filtered.length} restaurant{filtered.length !== 1 ? 's' : ''} found
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
            : paginated.map(r => {
                const isSaved = savedEvents.includes(r.id);
                const isFree = r.isFree || r.ticketPrice === 0;
                const hours = r.alwaysOpen ? '24/7 Open' : (r.operatingHours || 'Check hours');
                return (
                  <div key={r.id} className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 group flex flex-col">
                    <div className="relative h-48 overflow-hidden flex-shrink-0">
                      <Link to={`/event/${r.id}`}>
                        <img
                          src={r.imageUrl || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=300&fit=crop'}
                          alt={r.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </Link>
                      {currentUser && (
                        <button
                          onClick={() => toggleSave(r.id)}
                          className="absolute top-3 right-3 w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow hover:scale-110 transition"
                        >
                          <Heart size={14} className={isSaved ? 'fill-red-500 text-red-500' : 'text-gray-400'} />
                        </button>
                      )}
                      <div className="absolute bottom-3 left-3">
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                          isFree ? 'bg-green-500 text-white' : 'bg-white text-gray-800'
                        }`}>
                          {isFree ? 'Free Entry' : r.ticketPrice ? `₦${Number(r.ticketPrice).toLocaleString()} entry` : 'Walk-in'}
                        </span>
                      </div>
                    </div>
                    <div className="p-4 flex flex-col flex-1">
                      <Link to={`/event/${r.id}`}>
                        <h3 className="font-bold text-gray-900 text-sm mb-2 line-clamp-2 hover:text-cyan-500 transition">
                          {r.title}
                        </h3>
                      </Link>
                      <div className="space-y-1.5 mt-auto">
                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                          <Clock size={12} className="text-cyan-400 flex-shrink-0" />
                          <span className="line-clamp-1">{hours}</span>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 text-xs text-gray-500 min-w-0">
                            <MapPin size={12} className="text-cyan-400 flex-shrink-0" />
                            <span className="line-clamp-1">{r.address || r.location || r.city || 'Lagos'}</span>
                          </div>
                          {/* ✅ NEW — only shows when the owner actually set one */}
                          {r.mapsLink && (
                            <a
                              href={r.mapsLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="flex items-center gap-1 text-xs font-semibold text-cyan-600 hover:text-cyan-700 flex-shrink-0"
                            >
                              <Navigation size={11} /> Map
                            </a>
                          )}
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