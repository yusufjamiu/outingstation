import React, { useState, useEffect } from 'react';
import {
  collection, getDocs, doc, updateDoc,
  arrayUnion, arrayRemove, getDoc
} from 'firebase/firestore';
import { db } from '../firebase';
import { Link } from 'react-router-dom';
import {
  Search, SlidersHorizontal, X, Calendar, MapPin,
  ChevronLeft, ChevronRight, Heart, Tag, GraduationCap,
  Store, Clock
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

// ─── Constants ────────────────────────────────────────────────────────────────

const TABS = ['All', 'Events', 'Places', 'Vendors'];

const EVENT_CATEGORIES = [
  'All', 'Lectures & Seminars', 'Competitions', 'Social Events',
  'Religious Programs', 'Sports Events', 'Career & Opportunities',
  'Cultural Events', 'Other',
];

const PLACE_CATEGORIES = [
  'All', 'Cafeteria', 'Food Vendors', 'Library', 'Auditorium',
  'Faculty Building', 'Health Center', 'Sport Center', 'Hostel',
  'Chapel / Mosque', 'Admin Block', 'Market', 'Other',
];

const VENDOR_CATEGORIES = [
  'All', 'Food & Drinks', 'Fashion & Clothing', 'Electronics & Gadgets',
  'Beauty & Grooming', 'Books & Stationery', 'Accessories', 'Other',
];

const DEFAULT_UNIS = [
  'University of Lagos (Unilag)', 'University of Ibadan (UI)',
  'Covenant University (CU)', 'Ahmadu Bello University (ABU)',
  'University of Benin (Uniben)', 'Obafemi Awolowo University (OAU)',
  'University of Ilorin (Unilorin)', 'Lagos State University (LASU)',
];

const PRICES = ['All', 'Free', 'Paid'];
const PER_PAGE = 12;

// ─── Skeleton ─────────────────────────────────────────────────────────────────

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

// ─── Empty State ──────────────────────────────────────────────────────────────

const EmptyState = ({ tab, onReset }) => (
  <div className="col-span-full flex flex-col items-center justify-center py-20 px-4">
    <div className="w-20 h-20 bg-cyan-50 rounded-full flex items-center justify-center mb-4">
      <GraduationCap size={36} className="text-cyan-400" />
    </div>
    <h3 className="text-xl font-bold text-gray-900 mb-2">
      No campus {tab.toLowerCase()} found
    </h3>
    <p className="text-gray-500 text-center max-w-sm mb-6">
      Try adjusting your filters or check back later.
    </p>
    <button
      onClick={onReset}
      className="px-6 py-3 bg-cyan-500 text-white rounded-full font-medium hover:bg-cyan-600 transition"
    >
      Clear Filters
    </button>
  </div>
);

// ─── Event Card ───────────────────────────────────────────────────────────────

const EventCard = ({ event, isSaved, onToggleSave, currentUser }) => {
  // If a price WAS entered (ticketPrice or price), always show it — only fall
  // back to "Get Tickets" for external ticketing when there's truly no price on file.
  const isExternalTicketing = event.ticketingOption === 'external';
  const priceValue =
    typeof event.ticketPrice === 'number' && event.ticketPrice > 0
      ? event.ticketPrice
      : (typeof event.price === 'number' && event.price > 0 ? event.price : null);
  const hasSetPrice = priceValue !== null;
  const isFree = !isExternalTicketing && !hasSetPrice && (event.isFree || event.ticketPrice === 0);
  const dateLabel = event._date?.toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric'
  });
  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 group flex flex-col">
      <div className="relative h-48 overflow-hidden flex-shrink-0">
        <Link to={`/event/${event.id}`}>
          <img
            src={event.imageUrl || 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=400&h=300&fit=crop'}
            alt={event.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        </Link>
        {currentUser && (
          <button
            onClick={() => onToggleSave(event.id)}
            className="absolute top-3 right-3 w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow hover:scale-110 transition"
          >
            <Heart size={14} className={isSaved ? 'fill-red-500 text-red-500' : 'text-gray-400'} />
          </button>
        )}
        <div className="absolute bottom-3 left-3">
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${isFree ? 'bg-green-500 text-white' : 'bg-white text-gray-800'}`}>
            {hasSetPrice ? `₦${Number(priceValue).toLocaleString()}` : isExternalTicketing ? 'Get Tickets' : isFree ? 'Free' : 'Paid'}
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
            <span>{dateLabel || 'TBD'}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <MapPin size={12} className="text-cyan-400 flex-shrink-0" />
            <span className="line-clamp-1">{event.universityName || event.location || event.city || 'Campus'}</span>
          </div>
          {(event.category || event.eventCategory) && (
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <Tag size={12} className="text-cyan-400 flex-shrink-0" />
              <span>{event.category || event.eventCategory || 'Campus Event'}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Place Card ───────────────────────────────────────────────────────────────

const PlaceCard = ({ place, isSaved, onToggleSave, currentUser }) => {
  const isExternalTicketing = place.ticketingOption === 'external';
  const priceValue =
    typeof place.ticketPrice === 'number' && place.ticketPrice > 0
      ? place.ticketPrice
      : (typeof place.price === 'number' && place.price > 0 ? place.price : null);
  const hasSetPrice = priceValue !== null;
  const isFree = !isExternalTicketing && !hasSetPrice && (place.isFree || place.ticketPrice === 0);
  const hours = place.alwaysOpen ? '24/7 Open' : (place.openingTime && place.closingTime ? `${place.openingTime} – ${place.closingTime}` : place.operatingHours || 'Check hours');
  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 group flex flex-col">
      <div className="relative h-48 overflow-hidden flex-shrink-0">
        <Link to={`/event/${place.id}`}>
          <img
            src={place.imageUrl || 'https://images.unsplash.com/photo-1562774053-701939374585?w=400&h=300&fit=crop'}
            alt={place.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        </Link>
        {currentUser && (
          <button
            onClick={() => onToggleSave(place.id)}
            className="absolute top-3 right-3 w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow hover:scale-110 transition"
          >
            <Heart size={14} className={isSaved ? 'fill-red-500 text-red-500' : 'text-gray-400'} />
          </button>
        )}
        <div className="absolute bottom-3 left-3">
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${isFree ? 'bg-green-500 text-white' : 'bg-white text-gray-800'}`}>
            {hasSetPrice ? `₦${Number(priceValue).toLocaleString()} entry` : isExternalTicketing ? 'Get Tickets' : isFree ? 'Free Entry' : 'Paid Entry'}
          </span>
        </div>
      </div>
      <div className="p-4 flex flex-col flex-1">
        <Link to={`/event/${place.id}`}>
          <h3 className="font-bold text-gray-900 text-sm mb-2 line-clamp-2 hover:text-cyan-500 transition">
            {place.title}
          </h3>
        </Link>
        <div className="space-y-1.5 mt-auto">
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <Clock size={12} className="text-cyan-400 flex-shrink-0" />
            <span className="line-clamp-1">{hours}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <MapPin size={12} className="text-cyan-400 flex-shrink-0" />
            <span className="line-clamp-1">{place.address || place.university || place.location || 'Campus'}</span>
          </div>
          {(place.category || place.eventCategory) && (
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <Tag size={12} className="text-cyan-400 flex-shrink-0" />
              <span>{place.campusSubCategory || place.category || place.eventCategory}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Vendor Card ──────────────────────────────────────────────────────────────
// Vendors live in their own collection and don't have a standalone details page
// in this app (see CampusPlacesPage's renderVendorList — same pattern: no link,
// just the shop info and a direct WhatsApp action).

const VendorCard = ({ vendor }) => (
  <div className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 group flex flex-col">
    <div className="relative h-48 overflow-hidden flex-shrink-0">
      <img
        src={vendor.imageUrl || 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=300&fit=crop'}
        alt={vendor.shopName}
        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
      />
      <div className="absolute top-3 left-3">
        <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-purple-500 text-white">
          Vendor
        </span>
      </div>
    </div>
    <div className="p-4 flex flex-col flex-1">
      <h3 className="font-bold text-gray-900 text-sm mb-2 line-clamp-2">
        {vendor.shopName}
      </h3>
      <div className="space-y-1.5 mt-auto">
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <Store size={12} className="text-cyan-400 flex-shrink-0" />
          <span>{vendor.category || 'Campus Vendor'}</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <GraduationCap size={12} className="text-cyan-400 flex-shrink-0" />
          <span className="line-clamp-1">{vendor.university || 'Campus'}</span>
        </div>
        {vendor.whatsappNumber && (
          <a
            href={`https://wa.me/${vendor.whatsappNumber.replace(/\D/g, '')}`}
            target="_blank"
            rel="noreferrer"
            className="mt-2 w-full flex items-center justify-center gap-2 bg-green-500 text-white text-xs font-bold py-2.5 rounded-xl hover:bg-green-600 transition"
          >
            WhatsApp Vendor
          </a>
        )}
      </div>
    </div>
  </div>
);

// ─── Pagination ───────────────────────────────────────────────────────────────

const Pagination = ({ page, totalPages, setPage }) => (
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
);

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CampusPage() {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState('All');
  const [events, setEvents] = useState([]);
  const [places, setPlaces] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savedEvents, setSavedEvents] = useState([]);
  const [universities, setUniversities] = useState(['All Universities', ...DEFAULT_UNIS]);
  const [search, setSearch] = useState('');
  const [university, setUniversity] = useState('All Universities');
  const [category, setCategory] = useState('All');
  const [price, setPrice] = useState('All');
  const [date, setDate] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);

  useEffect(() => { loadAll(); loadUniversities(); }, []);
  useEffect(() => { if (currentUser) loadSaved(); }, [currentUser]);
  useEffect(() => { applyFilters(); }, [events, places, vendors, activeTab, search, university, category, price, date]);

  const loadUniversities = async () => {
    try {
      const snap = await getDocs(collection(db, 'universities'));
      const unis = snap.docs.map(d => d.data().name).filter(Boolean);
      if (unis.length) setUniversities(['All Universities', ...unis]);
    } catch (err) {
      console.error('Error loading universities:', err);
    }
  };

  const loadAll = async () => {
    // ✅ Fetch events and vendors separately so one failure doesn't kill both
    try {
      const eventsSnap = await getDocs(collection(db, 'events'));
      const allDocs = eventsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      const campusEvents = allDocs
        .filter(e => e.status === 'published' && e.eventType === 'campus' && e.subCategory !== 'places')
        .map(e => ({
          ...e,
          _date: e.date?.toDate ? e.date.toDate() : new Date(e.date),
          _type: 'event',
        }))
        .sort((a, b) => a._date - b._date);

      const campusPlaces = allDocs
        .filter(e => e.status === 'published' && e.eventType === 'campus' && e.subCategory === 'places')
        .map(e => ({ ...e, _type: 'place' }))
        .sort((a, b) => (a.title || '').localeCompare(b.title || ''));

      setEvents(campusEvents);
      setPlaces(campusPlaces);
    } catch (err) {
      console.error('Error loading campus events/places:', err);
    }

    // ✅ Vendors fetched separately — failure won't affect events/places
    // Fixed: was reading from 'vendor_submissions' (status === 'approved'), which is
    // just the submission record and never gets updated when a vendor is later
    // deleted/deactivated. The live vendor list lives in 'vendors' (status === 'active'),
    // matching CampusPlacesPage — so deleted vendors now correctly disappear here too.
    try {
      const vendorsSnap = await getDocs(collection(db, 'vendors'));
      const campusVendors = vendorsSnap.docs
        .map(d => ({ id: d.id, ...d.data(), _type: 'vendor' }))
        .filter(v => v.status === 'active');
      setVendors(campusVendors);
    } catch (err) {
      console.error('Error loading vendors:', err);
      // Vendors silently fail — events and places still show
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
    // ✅ Start with the right pool based on active tab
    let evPool = activeTab === 'All' || activeTab === 'Events' ? [...events] : [];
    let plPool = activeTab === 'All' || activeTab === 'Places' ? [...places] : [];
    let vnPool = activeTab === 'All' || activeTab === 'Vendors' ? [...vendors] : [];

    // ✅ University filter — matches working CampusPlacesPage pattern
    if (university !== 'All Universities') {
      evPool = evPool.filter(e => e.university === university);
      plPool = plPool.filter(e => e.university === university);
      vnPool = vnPool.filter(v => v.university === university);
    }

    // ✅ Category filter — each type uses its own field
    if (category !== 'All') {
      evPool = evPool.filter(e => e.category === category || e.eventCategory === category);
      plPool = plPool.filter(e => e.campusSubCategory === category); // ← key fix
      vnPool = vnPool.filter(v => v.category === category);
    }

    // ✅ Price filter
    if (price !== 'All') {
      if (price === 'Free') {
        evPool = evPool.filter(e => e.isFree || e.price === 0 || e.ticketPrice === 0);
        plPool = plPool.filter(e => e.isFree || e.price === 0 || e.ticketPrice === 0);
      }
      if (price === 'Paid') {
        evPool = evPool.filter(e => !e.isFree && (e.price > 0 || e.ticketPrice > 0));
        plPool = plPool.filter(e => !e.isFree && (e.price > 0 || e.ticketPrice > 0));
      }
    }

    // ✅ Date filter — events only
    if (date) {
      const selected = new Date(date);
      evPool = evPool.filter(e => e._date?.toDateString() === selected.toDateString());
    }

    // ✅ Search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      const match = (item) =>
        (item.title || item.shopName || '').toLowerCase().includes(q) ||
        (item.university || '').toLowerCase().includes(q) ||
        (item.location || item.address || '').toLowerCase().includes(q) ||
        (item.category || item.eventCategory || item.campusSubCategory || '').toLowerCase().includes(q);
      evPool = evPool.filter(match);
      plPool = plPool.filter(match);
      vnPool = vnPool.filter(match);
    }

    setFiltered([...evPool, ...plPool, ...vnPool]);
    setPage(1);
  };

  const resetFilters = () => {
    setSearch(''); setUniversity('All Universities');
    setCategory('All'); setPrice('All'); setDate(''); setPage(1);
  };

  const getCategoryOptions = () => {
    if (activeTab === 'Events') return EVENT_CATEGORIES;
    if (activeTab === 'Places') return PLACE_CATEGORIES;
    if (activeTab === 'Vendors') return VENDOR_CATEGORIES;
    return ['All'];
  };

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const activeFilterCount = [
    university !== 'All Universities', category !== 'All', price !== 'All', date
  ].filter(Boolean).length;

  const tabCount = (tab) => {
    if (tab === 'All') return events.length + places.length + vendors.length;
    if (tab === 'Events') return events.length;
    if (tab === 'Places') return places.length;
    if (tab === 'Vendors') return vendors.length;
    return 0;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      {/* Header */}
      <div className="bg-white border-b border-gray-100 py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-xl flex items-center justify-center">
              <GraduationCap size={22} className="text-white" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900">Campus Life</h1>
          </div>
          <p className="text-gray-500 ml-13">
            Events, places, vendors and everything happening on and off campus
          </p>

          {/* Search */}
          <div className="mt-6 flex gap-3">
            <div className="flex-1 relative">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search campus events, places, vendors..."
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
              <select value={university} onChange={e => setUniversity(e.target.value)}
                className="px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-cyan-500 appearance-none bg-white">
                {universities.map(u => <option key={u}>{u}</option>)}
              </select>
              {activeTab !== 'All' && (
                <select value={category} onChange={e => setCategory(e.target.value)}
                  className="px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-cyan-500 appearance-none bg-white">
                  {getCategoryOptions().map(c => <option key={c}>{c}</option>)}
                </select>
              )}
              {activeTab !== 'Vendors' && (
                <select value={price} onChange={e => setPrice(e.target.value)}
                  className="px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-cyan-500 appearance-none bg-white">
                  {PRICES.map(p => <option key={p}>{p}</option>)}
                </select>
              )}
              {(activeTab === 'Events' || activeTab === 'All') && (
                <input type="date" value={date} onChange={e => setDate(e.target.value)}
                  className="px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-cyan-500" />
              )}
            </div>
          )}

          {/* Tabs */}
          <div className="mt-6 flex gap-2 overflow-x-auto pb-1">
            {TABS.map(tab => (
              <button
                key={tab}
                onClick={() => { setActiveTab(tab); setCategory('All'); setPage(1); }}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition ${
                  activeTab === tab
                    ? 'bg-cyan-500 text-white shadow-md'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {tab}
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
                  activeTab === tab ? 'bg-white/20 text-white' : 'bg-white text-gray-500'
                }`}>
                  {tabCount(tab)}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {!loading && (
          <div className="flex items-center justify-between mb-6">
            <p className="text-sm text-gray-500">
              {filtered.length} result{filtered.length !== 1 ? 's' : ''} found
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
            ? <EmptyState tab={activeTab} onReset={resetFilters} />
            : paginated.map(item => {
                if (item._type === 'event') {
                  return (
                    <EventCard
                      key={item.id}
                      event={item}
                      isSaved={savedEvents.includes(item.id)}
                      onToggleSave={toggleSave}
                      currentUser={currentUser}
                    />
                  );
                }
                if (item._type === 'place') {
                  return (
                    <PlaceCard
                      key={item.id}
                      place={item}
                      isSaved={savedEvents.includes(item.id)}
                      onToggleSave={toggleSave}
                      currentUser={currentUser}
                    />
                  );
                }
                if (item._type === 'vendor') {
                  return <VendorCard key={item.id} vendor={item} />;
                }
                return null;
              })
          }
        </div>

        {totalPages > 1 && (
          <Pagination page={page} totalPages={totalPages} setPage={setPage} />
        )}
      </div>

      <Footer />
    </div>
  );
}