import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc, arrayUnion, arrayRemove, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Link } from 'react-router-dom';
import {
  Search, SlidersHorizontal, X, Calendar, MapPin,
  ChevronLeft, ChevronRight, Heart, Tag
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const CITIES = ['All Cities', 'Lagos', 'Abuja', 'Ibadan', 'Port Harcourt', 'Others'];
const KNOWN_CITIES = ['Lagos', 'Abuja', 'Ibadan', 'Port Harcourt'];
const CATEGORIES = [
  'All', 'Business & Tech', 'Art & Culture', 'Food & Dining',
  'Sport & Fitness', 'Education', 'Religion & Community',
  'Nightlife & Parties', 'Family & Kids Fun', 'Networking & Social',
  'Gaming & Esport', 'Music & Concerts', 'Cinema & Show', 'Other',
];
const PRICES = ['All', 'Free', 'Paid'];
const EVENTS_PER_PAGE = 12;

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
      <Calendar size={36} className="text-cyan-400" />
    </div>
    <h3 className="text-xl font-bold text-gray-900 mb-2">No events found</h3>
    <p className="text-gray-500 text-center max-w-sm mb-6">
      Try adjusting your filters or check back later for new events.
    </p>
    <button
      onClick={onReset}
      className="px-6 py-3 bg-cyan-500 text-white rounded-full font-medium hover:bg-cyan-600 transition"
    >
      Clear Filters
    </button>
  </div>
);

export default function EventsPage() {
  const { currentUser } = useAuth();
  const [events, setEvents] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savedEvents, setSavedEvents] = useState([]);
  const [search, setSearch] = useState('');
  const [city, setCity] = useState('All Cities');
  const [customCity, setCustomCity] = useState('');
  const [category, setCategory] = useState('All');
  const [price, setPrice] = useState('All');
  const [date, setDate] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);

  useEffect(() => { loadEvents(); }, []);
  useEffect(() => { if (currentUser) loadSaved(); }, [currentUser]);
  useEffect(() => { applyFilters(); }, [events, search, city, customCity, category, price, date]);

  const loadEvents = async () => {
    try {
      const snap = await getDocs(collection(db, 'events'));
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        .filter(e =>
          e.status === 'published' &&
          e.subCategory !== 'places' &&
          e.eventType !== 'webinar' &&
          e.eventType !== 'campus'
        )
        .map(e => ({
          ...e,
          _date: e.date?.toDate ? e.date.toDate() : new Date(e.date),
        }))
        .filter(e => e._date >= new Date(new Date().setHours(0, 0, 0, 0)))
        .sort((a, b) => a._date - b._date);
      setEvents(all);
    } catch (err) {
      console.error('Error loading events:', err);
    }
    setLoading(false);
  };

  const loadSaved = async () => {
    try {
      const snap = await getDoc(doc(db, 'users', currentUser.uid));
      setSavedEvents(snap.data()?.savedEvents || []);
    } catch (err) { console.error(err); }
  };

  const toggleSave = async (eventId) => {
    if (!currentUser) return;
    const isSaved = savedEvents.includes(eventId);
    setSavedEvents(prev => isSaved ? prev.filter(id => id !== eventId) : [...prev, eventId]);
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), {
        savedEvents: isSaved ? arrayRemove(eventId) : arrayUnion(eventId),
      });
    } catch (err) { console.error(err); }
  };

  const applyFilters = () => {
    let result = [...events];
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(e =>
        e.title?.toLowerCase().includes(q) ||
        e.location?.toLowerCase().includes(q) ||
        e.category?.toLowerCase().includes(q)
      );
    }
    if (city !== 'All Cities') {
      if (city === 'Others') {
        if (customCity.trim()) {
          const q = customCity.toLowerCase();
          result = result.filter(e => e.city?.toLowerCase().includes(q));
        } else {
          result = result.filter(e => e.city && !KNOWN_CITIES.includes(e.city));
        }
      } else {
        result = result.filter(e => e.city === city);
      }
    }
    if (category !== 'All') result = result.filter(e => e.category === category || e.eventCategory === category);
    if (price === 'Free') result = result.filter(e => {
      const hasTicketing = e.ticketingOption === 'external' || e.hasOutingStationTicketing === true || e.ticketingEnabled === true;
      const hasPrice = (typeof e.ticketPrice === 'number' && e.ticketPrice > 0) || (typeof e.price === 'number' && e.price > 0);
      return !hasTicketing && !hasPrice && e.isFree === true;
    });
    if (price === 'Paid') result = result.filter(e => {
      const hasTicketing = e.ticketingOption === 'external' || e.hasOutingStationTicketing === true || e.ticketingEnabled === true;
      const hasPrice = (typeof e.ticketPrice === 'number' && e.ticketPrice > 0) || (typeof e.price === 'number' && e.price > 0);
      return hasTicketing || hasPrice || e.isFree !== true;
    });
    if (date) {
      const selected = new Date(date);
      result = result.filter(e => e._date?.toDateString() === selected.toDateString());
    }
    setFiltered(result);
    setPage(1);
  };

  const resetFilters = () => {
    setSearch(''); setCity('All Cities'); setCustomCity(''); setCategory('All');
    setPrice('All'); setDate(''); setPage(1);
  };

  const totalPages = Math.ceil(filtered.length / EVENTS_PER_PAGE);
  const paginated = filtered.slice((page - 1) * EVENTS_PER_PAGE, page * EVENTS_PER_PAGE);
  const activeFilterCount = [city !== 'All Cities', category !== 'All', price !== 'All', date].filter(Boolean).length;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      {/* Header */}
      <div className="bg-white border-b border-gray-100 py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">Discover Events</h1>
          <p className="text-gray-500">Concerts, festivals, workshops and more happening around you</p>

          {/* Search */}
          <div className="mt-6 flex gap-3">
            <div className="flex-1 relative">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search events..."
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
            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
              <select value={city} onChange={e => { setCity(e.target.value); if (e.target.value !== 'Others') setCustomCity(''); }}
                className="px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-cyan-500 appearance-none bg-white">
                {CITIES.map(c => <option key={c}>{c}</option>)}
              </select>
              {city === 'Others' && (
                <input
                  type="text"
                  value={customCity}
                  onChange={e => setCustomCity(e.target.value)}
                  placeholder="Enter city name..."
                  className="px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-cyan-500"
                />
              )}
              <select value={category} onChange={e => setCategory(e.target.value)}
                className="px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-cyan-500 appearance-none bg-white">
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
              <select value={price} onChange={e => setPrice(e.target.value)}
                className="px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-cyan-500 appearance-none bg-white">
                {PRICES.map(p => <option key={p}>{p}</option>)}
              </select>
              <input type="date" value={date} onChange={e => setDate(e.target.value)}
                className="px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-cyan-500" />
            </div>
          )}
        </div>
      </div>

      {/* Results */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {!loading && (
          <div className="flex items-center justify-between mb-6">
            <p className="text-sm text-gray-500">
              {filtered.length} event{filtered.length !== 1 ? 's' : ''} found
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
            : paginated.map(event => {
                const isSaved = savedEvents.includes(event.id);
                const dateLabel = event._date?.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                // Free = Free (no ticketing, no price on file). If a price WAS set,
                // always show it — regardless of whether the ticketing flags happen
                // to be set on this particular record. Only fall back to "Get Ticket"
                // when there's ticketing but truly no price, and "Paid" as a last resort.
                const hasTicketing =
                  event.ticketingOption === 'external' ||
                  event.hasOutingStationTicketing === true ||
                  event.ticketingEnabled === true;
                const priceValue =
                  typeof event.ticketPrice === 'number' && event.ticketPrice > 0
                    ? event.ticketPrice
                    : (typeof event.price === 'number' && event.price > 0 ? event.price : null);
                let priceLabel = 'Paid';
                let isFree = false;
                if (priceValue !== null) {
                  priceLabel = `₦${Number(priceValue).toLocaleString()}`;
                } else if (hasTicketing) {
                  priceLabel = 'Get Ticket';
                } else if (event.isFree === true) {
                  priceLabel = 'Free';
                  isFree = true;
                }
                return (
                  <div key={event.id} className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 group flex flex-col">
                    <div className="relative h-48 overflow-hidden flex-shrink-0">
                      <Link to={`/event/${event.id}`}>
                        <img
                          src={event.imageUrl || 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=400&h=300&fit=crop'}
                          alt={event.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </Link>
                      {currentUser && (
                        <button
                          onClick={() => toggleSave(event.id)}
                          className="absolute top-3 right-3 w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow hover:scale-110 transition"
                        >
                          <Heart size={14} className={isSaved ? 'fill-red-500 text-red-500' : 'text-gray-400'} />
                        </button>
                      )}
                      <div className="absolute bottom-3 left-3">
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                          isFree ? 'bg-green-500 text-white' : 'bg-white text-gray-800'
                        }`}>
                          {priceLabel}
                        </span>
                      </div>
                    </div>
                    <div className="p-4 flex flex-col flex-1">
                      <Link to={`/event/${event.id}`}>
                        <h3 className="font-bold text-gray-900 text-sm mb-2 line-clamp-2 hover:text-cyan-500 transition">
                          {event.title}
                        </h3>
                      </Link>
                      <div className="space-y-1.5 mt-auto">
                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                          <Calendar size={12} className="text-cyan-400 flex-shrink-0" />
                          <span>{dateLabel}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                          <MapPin size={12} className="text-cyan-400 flex-shrink-0" />
                          <span className="line-clamp-1">{event.location || event.city || 'Lagos'}</span>
                        </div>
                        {(event.category || event.eventCategory) && (
                          <div className="flex items-center gap-1.5 text-xs text-gray-500">
                            <Tag size={12} className="text-cyan-400 flex-shrink-0" />
                            <span>{event.category || event.eventCategory}</span>
                          </div>
                        )}
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