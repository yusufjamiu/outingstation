import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc, arrayUnion, arrayRemove, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Link } from 'react-router-dom';
import {
  Search, SlidersHorizontal, X, MapPin,
  ChevronLeft, ChevronRight, Heart, Users, Car, Settings2, UserCheck, BadgeCheck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

// ✅ UPDATED — gold > green > blue, matching the confirmed order used
// everywhere else (CAC is a stronger trust signal than Gov ID for a
// marketplace/rental context specifically)
function VerificationTick({ govIdStatus, cacStatus }) {
  const govApproved = govIdStatus === 'approved';
  const cacApproved = cacStatus === 'approved';
  if (govApproved && cacApproved) return <BadgeCheck size={14} className="text-amber-500 flex-shrink-0 inline ml-1" />;
  if (cacApproved) return <BadgeCheck size={14} className="text-emerald-500 flex-shrink-0 inline ml-1" />;
  if (govApproved) return <BadgeCheck size={14} className="text-blue-500 flex-shrink-0 inline ml-1" />;
  return null;
}

// ✅ NEW — same lightbox pattern as MarketplaceCategoryPage.jsx
function ImageLightbox({ url, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/90 z-[60] flex items-center justify-center p-4" onClick={onClose}>
      <button onClick={onClose} className="absolute top-4 right-4 text-white p-2 hover:bg-white/10 rounded-full transition">
        <X size={28} />
      </button>
      <img src={url} alt="" className="max-w-full max-h-full object-contain rounded-lg" onClick={e => e.stopPropagation()} />
    </div>
  );
}

// ✅ NEW — business-derived ride listings had no detail view or click
// handler at all before. This is what clicking one now opens.
function RideDetailModal({ ride, onClose, onZoom }) {
  const whatsapp = (ride.whatsappNumber || '').replace(/[^0-9]/g, '');
  const message = encodeURIComponent(`Hi, I'm interested in "${ride.title}" on OutingStation.`);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-md" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-white flex justify-end p-3 border-b border-gray-100">
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-full transition"><X size={18} /></button>
        </div>
        <div className="p-5">
          {ride.imageUrl && (
            <div className="h-44 bg-cyan-50 rounded-2xl overflow-hidden flex items-center justify-center mb-4 cursor-zoom-in" onClick={() => onZoom(ride.imageUrl)}>
              <img src={ride.imageUrl} alt={ride.title} className="w-full h-full object-cover" />
            </div>
          )}
          <p className="text-lg font-black text-gray-900">
            {ride.title} <VerificationTick govIdStatus={ride.govIdStatus} cacStatus={ride.cacStatus} />
          </p>
          {ride.city && <p className="text-sm text-gray-400 mt-1">{ride.city}</p>}
          <p className="text-xl font-black text-cyan-600 mt-2">
            {ride.pricePerDay ? `₦${Number(ride.pricePerDay).toLocaleString()}` : 'Price on request'}
          </p>
          {ride.withDriver !== null && (
            <p className="text-xs font-bold text-gray-500 mt-1">{ride.withDriver ? '🚗 With Driver' : '🔑 Self-Drive'}</p>
          )}
          {ride.description && <p className="text-sm text-gray-600 mt-3">{ride.description}</p>}
          {whatsapp && (
            <a
              href={`https://wa.me/${whatsapp}?text=${message}`}
              target="_blank" rel="noreferrer"
              className="mt-5 block text-center text-sm font-bold text-white bg-emerald-500 px-4 py-3 rounded-xl hover:bg-emerald-600 transition"
            >
              Contact on WhatsApp
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

const CITIES = ['All Cities', 'Lagos', 'Abuja', 'Ibadan', 'Port Harcourt', 'Others'];
const VEHICLE_TYPES = ['All Types', 'Car', 'SUV', 'Bus', 'Van'];
const DRIVER_OPTIONS = ['Any', 'With Driver', 'Self-Drive'];
const VEHICLES_PER_PAGE = 12;

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

const EmptyState = ({ hasFilters, onReset }) => (
  <div className="col-span-full flex flex-col items-center justify-center py-20 px-4">
    <div className="w-20 h-20 bg-cyan-50 rounded-full flex items-center justify-center mb-4">
      <Car size={36} className="text-cyan-400" />
    </div>
    <h3 className="text-xl font-bold text-gray-900 mb-2">
      {hasFilters ? 'No vehicles match those filters' : 'No vehicles listed yet'}
    </h3>
    <p className="text-gray-500 text-center max-w-sm mb-6">
      {hasFilters
        ? 'Try adjusting your filters.'
        : "Rental businesses are onboarding soon — check back shortly for cars and buses you can hire."}
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

export default function RentARidePage() {
  const { currentUser } = useAuth();
  const [vehicles, setVehicles] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savedEvents, setSavedEvents] = useState([]);
  const [search, setSearch] = useState('');
  const [city, setCity] = useState('All Cities');
  const [vehicleType, setVehicleType] = useState('All Types');
  const [driverOption, setDriverOption] = useState('Any');
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  // ✅ NEW — business-derived listings had no click handler or detail
  // view at all before. This state drives the new detail modal.
  const [selectedRide, setSelectedRide] = useState(null);
  const [lightboxUrl, setLightboxUrl] = useState(null);

  useEffect(() => { loadVehicles(); }, []);
  useEffect(() => { if (currentUser) loadSaved(); }, [currentUser]);
  useEffect(() => { applyFilters(); }, [vehicles, search, city, vehicleType, driverOption]);

  const loadVehicles = async () => {
    try {
      const snap = await getDocs(collection(db, 'vehicles'));
      const fromVehicles = snap.docs.map(d => ({ id: d.id, source: 'vehicle', ...d.data() }))
        .filter(v => v.status === 'published');

      // ✅ NEW: also pull real approved "Ride Provider" businesses — their
      // pricing packages become listings here too, not just the (currently
      // empty) vehicles collection reserved for future dedicated listings.
      const bizSnap = await getDocs(collection(db, 'businesses'));
      const fromBusinesses = [];
      bizSnap.docs.forEach(d => {
        const biz = d.data();
        if (biz.businessType !== 'Ride Provider' || biz.status !== 'approved') return;
        const packages = biz.pricingTiers?.length > 0 ? biz.pricingTiers : (biz.hourlyPackages || []);
        packages.forEach((pkg, i) => {
          fromBusinesses.push({
            id: `${d.id}_${pkg.id || i}`,
            source: 'business',
            businessId: d.id,
            title: `${pkg.name || `${pkg.hours} hrs`} — ${biz.businessName}`,
            imageUrl: pkg.image || biz.logoUrl || null,
            pricePerDay: pkg.price,
            city: biz.city,
            whatsappNumber: biz.whatsappNumber,
            description: pkg.description || biz.description || null,
            withDriver: typeof pkg.withDriver === 'boolean' ? pkg.withDriver : null,
            // ✅ NEW — carried over for the verification tick
            govIdStatus: biz.govIdStatus || null,
            cacStatus: biz.cacStatus || null,
          });
        });
      });

      const all = [...fromVehicles, ...fromBusinesses].sort((a, b) => (a.title || '').localeCompare(b.title || ''));
      setVehicles(all);
    } catch (err) {
      console.error('Error loading vehicles:', err);
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
    let result = [...vehicles];
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(v =>
        v.title?.toLowerCase().includes(q) ||
        v.city?.toLowerCase().includes(q)
      );
    }
    if (city !== 'All Cities') result = result.filter(v => v.city === city);
    if (vehicleType !== 'All Types') result = result.filter(v => v.vehicleType === vehicleType);
    if (driverOption === 'With Driver') result = result.filter(v => v.withDriver === true);
    if (driverOption === 'Self-Drive') result = result.filter(v => v.withDriver === false);
    setFiltered(result);
    setPage(1);
  };

  const resetFilters = () => {
    setSearch(''); setCity('All Cities'); setVehicleType('All Types'); setDriverOption('Any'); setPage(1);
  };

  const totalPages = Math.ceil(filtered.length / VEHICLES_PER_PAGE);
  const paginated = filtered.slice((page - 1) * VEHICLES_PER_PAGE, page * VEHICLES_PER_PAGE);
  const activeFilterCount = [city !== 'All Cities', vehicleType !== 'All Types', driverOption !== 'Any'].filter(Boolean).length;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="bg-white border-b border-gray-100 py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">Rent A Ride</h1>
          <p className="text-gray-500">Cars and buses for hire, listed by rental businesses near you</p>

          <div className="mt-6 flex gap-3">
            <div className="flex-1 relative">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by vehicle or city..."
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
              <select value={vehicleType} onChange={e => setVehicleType(e.target.value)}
                className="px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-cyan-500 appearance-none bg-white">
                {VEHICLE_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
              <select value={driverOption} onChange={e => setDriverOption(e.target.value)}
                className="px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-cyan-500 appearance-none bg-white">
                {DRIVER_OPTIONS.map(d => <option key={d}>{d}</option>)}
              </select>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {!loading && (
          <div className="flex items-center justify-between mb-6">
            <p className="text-sm text-gray-500">
              {filtered.length} vehicle{filtered.length !== 1 ? 's' : ''} found
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
            ? <EmptyState hasFilters={activeFilterCount > 0 || !!search} onReset={resetFilters} />
            : paginated.map(v => {
                const isSaved = savedEvents.includes(v.id);
                const isBusiness = v.source === 'business';
                return (
                  <div key={v.id} className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 group flex flex-col">
                    <div className="relative h-48 overflow-hidden flex-shrink-0">
                      {isBusiness ? (
                        <img
                          src={v.imageUrl || 'https://images.unsplash.com/photo-1502877338535-766e1452684a?w=400&h=300&fit=crop'}
                          alt={v.title}
                          onClick={() => setSelectedRide(v)}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 cursor-pointer"
                        />
                      ) : (
                        <Link to={`/vehicle/${v.id}`}>
                          <img
                            src={v.imageUrl || 'https://images.unsplash.com/photo-1502877338535-766e1452684a?w=400&h=300&fit=crop'}
                            alt={v.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        </Link>
                      )}
                      {currentUser && !isBusiness && (
                        <button
                          onClick={() => toggleSave(v.id)}
                          className="absolute top-3 right-3 w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow hover:scale-110 transition"
                        >
                          <Heart size={14} className={isSaved ? 'fill-red-500 text-red-500' : 'text-gray-400'} />
                        </button>
                      )}
                      {v.vehicleType && (
                        <div className="absolute top-3 left-3">
                          <span className="bg-cyan-500 text-white text-xs px-2.5 py-1 rounded-full font-semibold">
                            {v.vehicleType}
                          </span>
                        </div>
                      )}
                      <div className="absolute bottom-3 left-3">
                        <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-white text-gray-800">
                          {v.pricePerDay ? `₦${Number(v.pricePerDay).toLocaleString()}` : 'Price on request'}
                        </span>
                      </div>
                    </div>
                    <div className="p-4 flex flex-col flex-1">
                      {isBusiness ? (
                        <h3
                          onClick={() => setSelectedRide(v)}
                          className="font-bold text-gray-900 text-sm mb-2 line-clamp-2 cursor-pointer hover:text-cyan-600 transition"
                        >
                          {v.title} <VerificationTick govIdStatus={v.govIdStatus} cacStatus={v.cacStatus} />
                        </h3>
                      ) : (
                        <Link to={`/vehicle/${v.id}`}>
                          <h3 className="font-bold text-gray-900 text-sm mb-2 line-clamp-2 hover:text-cyan-500 transition">
                            {v.title}
                          </h3>
                        </Link>
                      )}
                      <div className="space-y-1.5 mt-auto">
                        {v.capacity && (
                          <div className="flex items-center gap-1.5 text-xs text-gray-500">
                            <Users size={12} className="text-cyan-400 flex-shrink-0" />
                            <span>{v.capacity} seats</span>
                          </div>
                        )}
                        {!isBusiness && (
                          <div className="flex items-center gap-1.5 text-xs text-gray-500">
                            <UserCheck size={12} className="text-cyan-400 flex-shrink-0" />
                            <span>{v.withDriver ? 'With driver' : 'Self-drive'}</span>
                          </div>
                        )}
                        {isBusiness && v.withDriver !== null && (
                          <div className="flex items-center gap-1.5 text-xs text-gray-500">
                            <UserCheck size={12} className="text-cyan-400 flex-shrink-0" />
                            <span>{v.withDriver ? 'With driver' : 'Self-drive'}</span>
                          </div>
                        )}
                        {v.transmission && (
                          <div className="flex items-center gap-1.5 text-xs text-gray-500">
                            <Settings2 size={12} className="text-cyan-400 flex-shrink-0" />
                            <span>{v.transmission}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                          <MapPin size={12} className="text-cyan-400 flex-shrink-0" />
                          <span className="line-clamp-1">{v.city || 'Lagos'}</span>
                        </div>
                        {isBusiness && v.description && (
                          <p className="text-xs text-gray-500 pt-1 line-clamp-2">{v.description}</p>
                        )}
                        {isBusiness && v.whatsappNumber && (
                          <a
                            href={`https://wa.me/${v.whatsappNumber.replace(/[^0-9]/g, '')}`}
                            target="_blank" rel="noopener noreferrer"
                            className="block mt-2 text-center bg-emerald-500 text-white text-xs font-bold py-2 rounded-lg hover:bg-emerald-600 transition"
                          >
                            Contact on WhatsApp
                          </a>
                        )}
                        {isBusiness && (
                          <p className="text-[10px] text-gray-400 text-center pt-1">
                            Transactions with this business happen outside OutingStation — we're not responsible for what's agreed off-platform.
                          </p>
                        )}
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

      {selectedRide && (
        <RideDetailModal
          ride={selectedRide}
          onClose={() => setSelectedRide(null)}
          onZoom={(url) => setLightboxUrl(url)}
        />
      )}
      {lightboxUrl && <ImageLightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />}
    </div>
  );
}