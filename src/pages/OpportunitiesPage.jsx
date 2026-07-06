import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc, arrayUnion, arrayRemove, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Link } from 'react-router-dom';
import {
  Search, SlidersHorizontal, X, MapPin,
  ChevronLeft, ChevronRight, Heart, Calendar, Briefcase,
  GraduationCap, Trophy, HeartHandshake, Video
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const TYPES = [
  { label: 'All', value: 'All', icon: Briefcase },
  { label: 'Internship', value: 'Internship', icon: Briefcase },
  { label: 'Scholarship', value: 'Scholarship', icon: GraduationCap },
  { label: 'Competition', value: 'Competition', icon: Trophy },
  { label: 'Career Event', value: 'Career Event', icon: Briefcase },
  { label: 'Volunteering', value: 'Volunteering', icon: HeartHandshake },
];

const CITIES = ['All Cities', 'Lagos', 'Abuja', 'Ibadan', 'Port Harcourt', 'Others', 'Online'];
const OPPORTUNITIES_PER_PAGE = 12;

const SkeletonCard = () => (
  <div className="bg-white rounded-2xl overflow-hidden shadow-sm animate-pulse">
    <div className="h-40 bg-gray-200" />
    <div className="p-4 space-y-3">
      <div className="h-4 bg-gray-200 rounded-full w-3/4" />
      <div className="h-3 bg-gray-200 rounded-full w-1/2" />
      <div className="h-3 bg-gray-200 rounded-full w-2/3" />
    </div>
  </div>
);

const EmptyState = ({ onReset, hasFilters }) => (
  <div className="col-span-full flex flex-col items-center justify-center py-20 px-4">
    <div className="w-20 h-20 bg-cyan-50 rounded-full flex items-center justify-center mb-4">
      <Briefcase size={36} className="text-cyan-400" />
    </div>
    <h3 className="text-xl font-bold text-gray-900 mb-2">No opportunities found</h3>
    <p className="text-gray-500 text-center max-w-sm mb-6">
      {hasFilters
        ? 'Try adjusting your filters, or check back soon.'
        : "We're adding internships, scholarships, and more soon. Check back shortly."}
    </p>
    {hasFilters && (
      <button
        onClick={onReset}
        className="px-6 py-3 bg-cyan-500 text-white rounded-full font-medium hover:bg-cyan-600 transition"
      >
        Clear Filters
      </button>
    )}
  </div>
);

export default function OpportunitiesPage() {
  const { currentUser } = useAuth();
  const [items, setItems] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savedEvents, setSavedEvents] = useState([]);
  const [search, setSearch] = useState('');
  const [type, setType] = useState('All');
  const [city, setCity] = useState('All Cities');
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);

  useEffect(() => { loadOpportunities(); }, []);
  useEffect(() => { if (currentUser) loadSaved(); }, [currentUser]);
  useEffect(() => { applyFilters(); }, [items, search, type, city]);

  const loadOpportunities = async () => {
    try {
      const snap = await getDocs(collection(db, 'events'));
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        .filter(e => e.status === 'published' && e.subCategory === 'opportunities')
        .sort((a, b) => {
          const da = a.deadline?.toDate ? a.deadline.toDate() : new Date(a.deadline || a.date || 0);
          const db_ = b.deadline?.toDate ? b.deadline.toDate() : new Date(b.deadline || b.date || 0);
          return da - db_;
        });
      setItems(all);
    } catch (err) {
      console.error('Error loading opportunities:', err);
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
    let result = [...items];
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(e =>
        e.title?.toLowerCase().includes(q) ||
        e.description?.toLowerCase().includes(q) ||
        e.organizationName?.toLowerCase().includes(q)
      );
    }
    if (type !== 'All') result = result.filter(e => e.opportunityType === type);
    if (city !== 'All Cities') result = result.filter(e => e.location === city || e.city === city);
    setFiltered(result);
    setPage(1);
  };

  const resetFilters = () => {
    setSearch(''); setType('All'); setCity('All Cities'); setPage(1);
  };

  const totalPages = Math.ceil(filtered.length / OPPORTUNITIES_PER_PAGE);
  const paginated = filtered.slice((page - 1) * OPPORTUNITIES_PER_PAGE, page * OPPORTUNITIES_PER_PAGE);
  const activeFilterCount = [type !== 'All', city !== 'All Cities'].filter(Boolean).length;

  const formatDeadline = (e) => {
    const d = e.deadline?.toDate ? e.deadline.toDate() : (e.deadline ? new Date(e.deadline) : null);
    if (!d) return 'Rolling deadline';
    return 'Deadline: ' + d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="bg-white border-b border-gray-100 py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mb-2">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">Opportunities</h1>
              <p className="text-gray-500">Internships, scholarships, competitions and more</p>
            </div>
            <Link
              to="/webinar-events"
              className="inline-flex items-center gap-2 text-sm font-medium text-cyan-600 hover:text-cyan-700 transition"
            >
              <Video size={16} />
              Looking for webinars? Browse here
            </Link>
          </div>

          {/* Type chips */}
          <div className="mt-6 flex flex-wrap gap-2">
            {TYPES.map(t => {
              const Icon = t.icon;
              const isActive = type === t.value;
              return (
                <button
                  key={t.value}
                  onClick={() => setType(t.value)}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold transition ${
                    isActive
                      ? 'bg-cyan-500 text-white shadow-sm'
                      : 'bg-gray-50 text-gray-600 border border-gray-200 hover:border-cyan-400'
                  }`}
                >
                  <Icon size={13} />
                  {t.label}
                </button>
              );
            })}
          </div>

          <div className="mt-4 flex gap-3">
            <div className="flex-1 relative">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search opportunities..."
                className="w-full pl-11 pr-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-cyan-500 transition"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-3 rounded-xl border-2 text-sm font-medium transition ${
                showFilters || city !== 'All Cities'
                  ? 'border-cyan-500 bg-cyan-50 text-cyan-600'
                  : 'border-gray-200 text-gray-700 hover:border-cyan-400'
              }`}
            >
              <SlidersHorizontal size={16} />
              City
            </button>
          </div>

          {showFilters && (
            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
              <select value={city} onChange={e => setCity(e.target.value)}
                className="px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-cyan-500 appearance-none bg-white">
                {CITIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {!loading && (
          <div className="flex items-center justify-between mb-6">
            <p className="text-sm text-gray-500">
              {filtered.length} opportunit{filtered.length !== 1 ? 'ies' : 'y'} found
            </p>
            {activeFilterCount > 0 && (
              <button onClick={resetFilters} className="flex items-center gap-1 text-sm text-red-500 hover:text-red-600">
                <X size={14} /> Clear filters
              </button>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {loading
            ? [...Array(6)].map((_, i) => <SkeletonCard key={i} />)
            : paginated.length === 0
            ? <EmptyState onReset={resetFilters} hasFilters={activeFilterCount > 0 || !!search} />
            : paginated.map(item => {
                const isSaved = savedEvents.includes(item.id);
                return (
                  <div key={item.id} className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 group flex flex-col">
                    <div className="relative h-40 overflow-hidden flex-shrink-0">
                      <Link to={`/e/${item.slug || item.id}`}>
                        <img
                          src={item.imageUrl || 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=400&h=300&fit=crop'}
                          alt={item.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </Link>
                      {currentUser && (
                        <button
                          onClick={() => toggleSave(item.id)}
                          className="absolute top-3 right-3 w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow hover:scale-110 transition"
                        >
                          <Heart size={14} className={isSaved ? 'fill-red-500 text-red-500' : 'text-gray-400'} />
                        </button>
                      )}
                      {item.opportunityType && (
                        <div className="absolute top-3 left-3">
                          <span className="bg-cyan-500 text-white text-xs px-2.5 py-1 rounded-full font-semibold">
                            {item.opportunityType}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="p-4 flex flex-col flex-1">
                      <Link to={`/e/${item.slug || item.id}`}>
                        <h3 className="font-bold text-gray-900 text-sm mb-1.5 line-clamp-2 hover:text-cyan-500 transition">
                          {item.title}
                        </h3>
                      </Link>
                      {item.organizationName && (
                        <p className="text-xs text-gray-500 mb-2 line-clamp-1">{item.organizationName}</p>
                      )}
                      <div className="space-y-1.5 mt-auto">
                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                          <Calendar size={12} className="text-cyan-400 flex-shrink-0" />
                          <span>{formatDeadline(item)}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                          <MapPin size={12} className="text-cyan-400 flex-shrink-0" />
                          <span className="line-clamp-1">
                            {item.locationType === 'Remote' ? 'Remote' :
                             item.locationType === 'International' ? (item.country || 'International') :
                             (item.location || item.city || 'Online')}
                          </span>
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