import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { collection, addDoc, getDocs, query, where, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import {
  Cake, Heart, Award, Church, Landmark, Mic2, PartyPopper, BookOpen, Sparkles,
  ChevronLeft, ChevronRight, Check, Building2, MapPin, Palette, UtensilsCrossed,
  Music, Users, Camera, Car, ListPlus, X, Beef, Plus,
} from 'lucide-react';

const EVENT_TYPES = [
  { value: 'birthday', label: 'Birthday', icon: Cake },
  { value: 'wedding', label: 'Wedding', icon: Heart },
  { value: 'graduation', label: 'Graduation', icon: Award },
  { value: 'religious', label: 'Religious Event', icon: Church },
  { value: 'corporate', label: 'Corporate Event', icon: Landmark },
  { value: 'concert', label: 'Concert', icon: Mic2 },
  { value: 'party', label: 'Party', icon: PartyPopper },
  { value: 'seminar', label: 'Seminar', icon: BookOpen },
  { value: 'other', label: 'Other', icon: Sparkles },
];

const STATES = ['Lagos', 'Abuja', 'Ibadan', 'Port Harcourt', 'Others'];
const BUDGET_RANGES = ['Under ₦200k', '₦200k - ₦500k', '₦500k - ₦1M', '₦1M - ₦3M', 'Above ₦3M'];
const DECOR_STYLES = ['Elegant / Classy', 'Colorful / Vibrant', 'Minimalist', 'Traditional', 'Rustic', 'Not sure yet'];
const MENU_TYPES = ['Nigerian Buffet', 'Small Chops', 'Continental', 'Mixed', 'Not sure yet'];
const DJ_GENRES = ['Afrobeats', 'Amapiano', 'Hip-Hop / R&B', 'Highlife / Old School', 'Mixed / DJ\'s Choice'];
const MC_LANGUAGES = ['English', 'Yoruba', 'Igbo', 'Hausa', 'Pidgin', 'Mixed'];
const VEHICLE_TYPES = ['Car', 'SUV', 'Bus', 'Van', 'Not sure yet'];

const STEPS = [
  'Event Type', 'Event Details', 'Venue', 'Rentals', 'Decorator',
  'Catering', 'Livestock', 'Supplies', 'DJ', 'MC', 'Photography', 'Transportation', 'Other Service', 'Review & Submit',
];

// ✅ Gift Vendor / Food Stuffs Seller / Baker / Beverages Seller — combined
// into one repeatable step rather than 4 near-identical ones
const SUPPLY_TYPES = ['Gift Vendor', 'Food Stuffs Seller', 'Baker', 'Beverages Seller'];

function ProgressBar({ current, total }) {
  const pct = Math.round((current / (total - 1)) * 100);
  return (
    <div className="mb-6">
      <div className="flex justify-between items-center mb-2">
        <span className="text-xs font-bold text-cyan-600 uppercase tracking-wider">Step {current + 1} of {total}</span>
        <span className="text-xs text-gray-400">{STEPS[current]}</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div className="bg-gradient-to-r from-cyan-500 to-blue-600 h-2 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function SkipToggle({ skipped, onToggle, label = 'this service' }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl border-2 mb-5 transition ${
        skipped ? 'border-gray-200 bg-gray-50' : 'border-cyan-200 bg-cyan-50'
      }`}
    >
      <span className={`text-sm font-bold ${skipped ? 'text-gray-500' : 'text-cyan-700'}`}>
        {skipped ? `Skipping ${label}` : `Including ${label}`}
      </span>
      <span className={`text-xs font-bold px-3 py-1 rounded-full ${skipped ? 'bg-white text-gray-500 border border-gray-200' : 'bg-cyan-500 text-white'}`}>
        {skipped ? 'Skipped — tap to include' : 'Included — tap to skip'}
      </span>
    </button>
  );
}

function StyledSelect(props) {
  return (
    <select {...props}
      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-cyan-500 transition appearance-none bg-white" />
  );
}

function StyledInput(props) {
  return (
    <input {...props}
      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-cyan-500 transition" />
  );
}

// ✅ Optional reference image upload for Supplies requests (e.g. "I want a
// cake that looks like this" for a Baker)
const uploadReferenceImage = async (file) => {
  const data = new FormData();
  data.append('file', file);
  data.append('upload_preset', import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET);
  const res = await fetch('https://api.cloudinary.com/v1_1/' + import.meta.env.VITE_CLOUDINARY_CLOUD_NAME + '/image/upload', {
    method: 'POST', body: data,
  });
  const json = await res.json();
  return json.secure_url;
};

function ChipPicker({ options, value, onChange }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(opt => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={`px-4 py-2 rounded-full text-sm font-medium border-2 transition ${
            value === opt ? 'bg-cyan-500 text-white border-cyan-500' : 'bg-white text-gray-700 border-gray-200 hover:border-cyan-400'
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

// ✅ Maps each hybrid wizard category to the matching business type in Firestore
const CATEGORY_BUSINESS_TYPE = {
  rentals: 'Furniture Rental',
  decorator: 'Decorator',
  catering: 'Caterer',
  dj: 'DJ',
  mc: 'MC',
  photography: 'Photographer',
  transportation: 'Ride Provider',
  otherService: 'Other Service',
};

function ModeToggle({ mode, onChange }) {
  return (
    <div className="grid grid-cols-2 gap-2 mb-4">
      <button
        type="button"
        onClick={() => onChange('choose')}
        className={`py-2.5 rounded-xl border-2 text-sm font-bold transition ${
          mode === 'choose' ? 'border-cyan-500 bg-cyan-50 text-cyan-700' : 'border-gray-200 text-gray-600'
        }`}
      >
        Request a Business
      </button>
      <button
        type="button"
        onClick={() => onChange('request')}
        className={`py-2.5 rounded-xl border-2 text-sm font-bold transition ${
          mode === 'request' ? 'border-cyan-500 bg-cyan-50 text-cyan-700' : 'border-gray-200 text-gray-600'
        }`}
      >
        Post an Offer
      </button>
    </div>
  );
}

// ✅ Shared browse-and-pick list, reused across Decorator/Catering/DJ/MC/Photography/Transportation
function BusinessPickerList({ businesses, state, setState }) {
  if (businesses === undefined) {
    return <p className="text-center py-6 text-sm text-gray-400">Loading businesses...</p>;
  }
  if (businesses.length === 0) {
    return <p className="text-center py-6 text-sm text-gray-400">No approved businesses yet for this service. Try posting an offer instead.</p>;
  }
  return (
    <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
      {businesses.map(biz => {
        const packages = (biz.pricingTiers && biz.pricingTiers.length > 0)
          ? biz.pricingTiers
          : (biz.hourlyPackages || []).map(p => ({ id: p.id, name: `${p.hours} hrs`, price: p.price, description: p.description }));
        return (
          <div key={biz.id} className="border-2 border-gray-200 rounded-xl p-3">
            <p className="text-sm font-bold text-gray-900 mb-2">{biz.businessName}</p>
            {biz.description && <p className="text-xs text-gray-500 mb-2">{biz.description}</p>}
            {packages.length === 0 ? (
              <p className="text-xs text-gray-400">No pricing listed yet</p>
            ) : (
              <div className="space-y-1.5">
                {packages.map(pkg => {
                  const selected = state.selectedBusinessId === biz.id && state.selectedPackageName === pkg.name;
                  return (
                    <button
                      key={pkg.id || pkg.name}
                      type="button"
                      onClick={() => setState(p => ({
                        ...p,
                        selectedBusinessId: biz.id,
                        selectedBusinessName: biz.businessName,
                        selectedPackageName: pkg.name,
                        selectedPackagePrice: pkg.price,
                      }))}
                      className={`w-full flex items-start gap-2.5 p-2.5 rounded-lg border-2 text-left transition ${
                        selected ? 'border-cyan-500 bg-cyan-50' : 'border-gray-100 hover:border-cyan-300'
                      }`}
                    >
                      {pkg.image && <img src={pkg.image} alt="" className="w-12 h-12 rounded-md object-cover flex-shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-medium text-gray-700">{pkg.name}</span>
                          <span className="text-xs font-bold text-cyan-600 flex-shrink-0">₦{Number(pkg.price).toLocaleString()}</span>
                        </div>
                        {pkg.description && <p className="text-[11px] text-gray-500 mt-0.5">{pkg.description}</p>}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
      {(state.selectedBusinessId) && (
        <>
          <p className="text-xs text-gray-400 text-center pt-1">
            This sends a request to the business — they'll confirm availability before it's booked.
          </p>
          <p className="text-[11px] text-amber-600 text-center bg-amber-50 border border-amber-100 rounded-lg py-1.5 px-2">
            Note: any transaction with this business happens outside OutingStation. We're not responsible for what's agreed or paid off-platform.
          </p>
        </>
      )}
    </div>
  );
}

export default function PlanEventPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { currentUser, userProfile } = useAuth();
  const topRef = useRef(null);

  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [halls, setHalls] = useState([]);
  const [loadingHalls, setLoadingHalls] = useState(false);

  const [eventType, setEventType] = useState(searchParams.get('type') || '');
  const [eventTypeOther, setEventTypeOther] = useState('');

  const [details, setDetails] = useState({ eventName: '', eventDate: '', estimatedGuests: '', budget: '', city: '', area: '', state: '' });
  const [stateOption, setStateOption] = useState('');

  const [venue, setVenue] = useState({ skipped: false, mode: 'hall', hallId: '', hallName: '', ownLocation: '' });
  const [rentals, setRentals] = useState({ skipped: false, mode: 'request', chairs: '', tables: '', tents: '', notes: '', budget: '', deadline: '', selectedBusinessId: '', selectedBusinessName: '', selectedPackageName: '', selectedPackagePrice: 0 });
  const [decorator, setDecorator] = useState({ skipped: false, mode: 'request', style: '', budget: '', deadline: '', selectedBusinessId: '', selectedBusinessName: '', selectedPackageName: '', selectedPackagePrice: 0 });
  const [catering, setCatering] = useState({ skipped: false, mode: 'request', menuType: '', budget: '', deadline: '', selectedBusinessId: '', selectedBusinessName: '', selectedPackageName: '', selectedPackagePrice: 0 });
  const [livestock, setLivestock] = useState({ skipped: true, items: [] }); // default skipped — most events won't need this
  const [animalSellers, setAnimalSellers] = useState([]);
  const [loadingSellers, setLoadingSellers] = useState(false);
  const [dj, setDj] = useState({ skipped: false, mode: 'request', hours: '', genre: '', budget: '', deadline: '', selectedBusinessId: '', selectedBusinessName: '', selectedPackageName: '', selectedPackagePrice: 0 });
  const [mc, setMc] = useState({ skipped: false, mode: 'request', language: '', style: '', budget: '', deadline: '', selectedBusinessId: '', selectedBusinessName: '', selectedPackageName: '', selectedPackagePrice: 0 });
  const [photography, setPhotography] = useState({ skipped: false, mode: 'request', hours: '', style: '', budget: '', deadline: '', selectedBusinessId: '', selectedBusinessName: '', selectedPackageName: '', selectedPackagePrice: 0 });
  const [transportation, setTransportation] = useState({ skipped: false, mode: 'request', vehicleType: '', withDriver: true, notes: '', budget: '', deadline: '', selectedBusinessId: '', selectedBusinessName: '', selectedPackageName: '', selectedPackagePrice: 0 });
  const [otherServices, setOtherServices] = useState([]); // repeatable — each entry is its own request/offer
  const [supplies, setSupplies] = useState([]); // repeatable — Gift Vendor / Food Stuffs / Baker / Beverages
  const [supplyBusinesses, setSupplyBusinesses] = useState({}); // cached per business type
  const [categoryBusinesses, setCategoryBusinesses] = useState({});

  useEffect(() => {
    if (!currentUser) navigate('/login');
  }, [currentUser, navigate]);

  // ✅ FIX: without this, clicking a different Plan Event type while already
  // on /plan-event does nothing — React Router updates the URL but doesn't
  // remount the page, so the useState initial value never re-reads it.
  useEffect(() => {
    const t = searchParams.get('type');
    if (t && t !== eventType) {
      setEventType(t);
      setStep(0);
    }
  }, [searchParams]);

  useEffect(() => {
    if (step === 2 && venue.mode === 'hall' && halls.length === 0) {
      loadHalls();
    }
  }, [step, venue.mode]);

  useEffect(() => {
    if (step === 6 && animalSellers.length === 0) {
      loadAnimalSellers();
    }
  }, [step]);

  const loadAnimalSellers = async () => {
    setLoadingSellers(true);
    try {
      const snap = await getDocs(
        query(collection(db, 'businesses'), where('businessType', '==', 'Livestock Seller'), where('status', '==', 'approved'))
      );
      setAnimalSellers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error('Error loading animal sellers:', err);
    }
    setLoadingSellers(false);
  };

  const loadCategoryBusinesses = async (category) => {
    if (categoryBusinesses[category]) return; // already loaded
    const businessType = CATEGORY_BUSINESS_TYPE[category];
    try {
      const snap = await getDocs(
        query(collection(db, 'businesses'), where('businessType', '==', businessType), where('status', '==', 'approved'))
      );
      setCategoryBusinesses(prev => ({ ...prev, [category]: snap.docs.map(d => ({ id: d.id, ...d.data() })) }));
    } catch (err) {
      console.error(`Error loading ${category} businesses:`, err);
      setCategoryBusinesses(prev => ({ ...prev, [category]: [] }));
    }
  };

  // ✅ Supplies (Gift Vendor / Food Stuffs Seller / Baker / Beverages Seller)
  // — each entry can be a different business type, so this caches by the
  // exact businessType string rather than the fixed category-key map above.
  const loadSupplyBusinesses = async (businessType) => {
    if (supplyBusinesses[businessType]) return;
    try {
      const snap = await getDocs(
        query(collection(db, 'businesses'), where('businessType', '==', businessType), where('status', '==', 'approved'))
      );
      setSupplyBusinesses(prev => ({ ...prev, [businessType]: snap.docs.map(d => ({ id: d.id, ...d.data() })) }));
    } catch (err) {
      console.error(`Error loading ${businessType} businesses:`, err);
      setSupplyBusinesses(prev => ({ ...prev, [businessType]: [] }));
    }
  };

  const loadHalls = async () => {
    setLoadingHalls(true);
    try {
      const snap = await getDocs(collection(db, 'events'));
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        .filter(e => e.status === 'published' && e.subCategory === 'places' &&
          (e.category === 'Halls' || e.category === 'Halls & Venues'))
        .slice(0, 30);
      setHalls(all);
    } catch (err) {
      console.error('Error loading halls:', err);
    }
    setLoadingHalls(false);
  };

  const scrollTop = () => topRef.current?.scrollIntoView({ behavior: 'smooth' });

  const next = () => { setStep(s => Math.min(s + 1, STEPS.length - 1)); scrollTop(); };
  const back = () => { setStep(s => Math.max(s - 1, 0)); scrollTop(); };

  // ✅ Explicit Skip button — sets that category's skipped flag (so it's
  // never counted as unresolved later) and moves on. Repeatable steps
  // (Supplies, Other Service) have no single skip flag — skipping them just
  // means nothing gets added, which is already their natural empty state.
  const handleSkip = () => {
    const skipMap = {
      2: () => setVenue(p => ({ ...p, skipped: true })),
      3: () => setRentals(p => ({ ...p, skipped: true })),
      4: () => setDecorator(p => ({ ...p, skipped: true })),
      5: () => setCatering(p => ({ ...p, skipped: true })),
      6: () => setLivestock(p => ({ ...p, skipped: true })),
      8: () => setDj(p => ({ ...p, skipped: true })),
      9: () => setMc(p => ({ ...p, skipped: true })),
      10: () => setPhotography(p => ({ ...p, skipped: true })),
      11: () => setTransportation(p => ({ ...p, skipped: true })),
    };
    if (skipMap[step]) skipMap[step]();
    next();
  };

  const canProceedStep0 = eventType && (eventType !== 'other' || eventTypeOther.trim());
  const canProceedStep1 = details.eventName.trim() && details.eventDate && details.estimatedGuests && details.state;

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const planRef = await addDoc(collection(db, 'event_plans'), {
        userId: currentUser.uid,
        userName: userProfile?.name || currentUser.displayName || '',
        userEmail: currentUser.email || '',
        eventType: eventType === 'other' ? eventTypeOther.trim() : eventType,
        eventName: details.eventName.trim(),
        eventDate: details.eventDate,
        estimatedGuests: Number(details.estimatedGuests) || 0,
        budget: details.budget || null,
        city: details.city,
            area: details.area || null,
            state: details.state || null,
        venue: venue.skipped ? null : {
          mode: venue.mode,
          hallId: venue.mode === 'hall' ? venue.hallId || null : null,
          hallName: venue.mode === 'hall' ? venue.hallName || null : null,
          ownLocation: venue.mode === 'own' ? venue.ownLocation.trim() : null,
        },
        rentals: rentals.skipped ? null : {
          mode: rentals.mode,
          chairs: Number(rentals.chairs) || 0,
          tables: Number(rentals.tables) || 0,
          tents: Number(rentals.tents) || 0,
          notes: rentals.notes.trim() || null,
          budget: rentals.budget || null,
          selectedBusinessId: rentals.mode === 'choose' ? rentals.selectedBusinessId || null : null,
          selectedBusinessName: rentals.mode === 'choose' ? rentals.selectedBusinessName || null : null,
          selectedPackageName: rentals.mode === 'choose' ? rentals.selectedPackageName || null : null,
          selectedPackagePrice: rentals.mode === 'choose' ? rentals.selectedPackagePrice || 0 : null,
        },
        decorator: decorator.skipped ? null : {
          mode: decorator.mode, style: decorator.style || null, budget: decorator.budget || null,
          selectedBusinessId: decorator.mode === 'choose' ? decorator.selectedBusinessId || null : null,
          selectedBusinessName: decorator.mode === 'choose' ? decorator.selectedBusinessName || null : null,
          selectedPackageName: decorator.mode === 'choose' ? decorator.selectedPackageName || null : null,
          selectedPackagePrice: decorator.mode === 'choose' ? decorator.selectedPackagePrice || 0 : null,
        },
        catering: catering.skipped ? null : {
          mode: catering.mode, menuType: catering.menuType || null, budget: catering.budget || null,
          selectedBusinessId: catering.mode === 'choose' ? catering.selectedBusinessId || null : null,
          selectedBusinessName: catering.mode === 'choose' ? catering.selectedBusinessName || null : null,
          selectedPackageName: catering.mode === 'choose' ? catering.selectedPackageName || null : null,
          selectedPackagePrice: catering.mode === 'choose' ? catering.selectedPackagePrice || 0 : null,
        },
        livestock: livestock.skipped ? null : {
          items: livestock.items.map(i => ({
            sellerId: i.sellerId, sellerName: i.sellerName,
            tierName: i.tierName, price: i.price, quantity: i.quantity,
          })),
        },
        dj: dj.skipped ? null : {
          mode: dj.mode, hours: dj.hours || null, genre: dj.genre || null, budget: dj.budget || null,
          selectedBusinessId: dj.mode === 'choose' ? dj.selectedBusinessId || null : null,
          selectedBusinessName: dj.mode === 'choose' ? dj.selectedBusinessName || null : null,
          selectedPackageName: dj.mode === 'choose' ? dj.selectedPackageName || null : null,
          selectedPackagePrice: dj.mode === 'choose' ? dj.selectedPackagePrice || 0 : null,
        },
        mc: mc.skipped ? null : {
          mode: mc.mode, language: mc.language || null, style: mc.style.trim() || null, budget: mc.budget || null,
          selectedBusinessId: mc.mode === 'choose' ? mc.selectedBusinessId || null : null,
          selectedBusinessName: mc.mode === 'choose' ? mc.selectedBusinessName || null : null,
          selectedPackageName: mc.mode === 'choose' ? mc.selectedPackageName || null : null,
          selectedPackagePrice: mc.mode === 'choose' ? mc.selectedPackagePrice || 0 : null,
        },
        photography: photography.skipped ? null : {
          mode: photography.mode, hours: photography.hours || null, style: photography.style.trim() || null, budget: photography.budget || null,
          selectedBusinessId: photography.mode === 'choose' ? photography.selectedBusinessId || null : null,
          selectedBusinessName: photography.mode === 'choose' ? photography.selectedBusinessName || null : null,
          selectedPackageName: photography.mode === 'choose' ? photography.selectedPackageName || null : null,
          selectedPackagePrice: photography.mode === 'choose' ? photography.selectedPackagePrice || 0 : null,
        },
        transportation: transportation.skipped ? null : {
          mode: transportation.mode,
          vehicleType: transportation.vehicleType || null,
          withDriver: transportation.withDriver,
          notes: transportation.notes.trim() || null,
          budget: transportation.budget || null,
          selectedBusinessId: transportation.mode === 'choose' ? transportation.selectedBusinessId || null : null,
          selectedBusinessName: transportation.mode === 'choose' ? transportation.selectedBusinessName || null : null,
          selectedPackageName: transportation.mode === 'choose' ? transportation.selectedPackageName || null : null,
          selectedPackagePrice: transportation.mode === 'choose' ? transportation.selectedPackagePrice || 0 : null,
        },
        otherServices: otherServices.length === 0 ? null : otherServices.map(e => ({
          mode: e.mode,
          description: e.description.trim() || null,
          budget: e.budget || null,
          selectedBusinessId: e.mode === 'choose' ? e.selectedBusinessId || null : null,
          selectedBusinessName: e.mode === 'choose' ? e.selectedBusinessName || null : null,
          selectedPackageName: e.mode === 'choose' ? e.selectedPackageName || null : null,
          selectedPackagePrice: e.mode === 'choose' ? e.selectedPackagePrice || 0 : null,
        })),
        supplies: supplies.length === 0 ? null : supplies.map(e => ({
          type: e.type, mode: e.mode,
          description: e.description.trim() || null,
          budget: e.budget || null,
          referenceImage: e.referenceImage || null,
          selectedBusinessId: e.mode === 'choose' ? e.selectedBusinessId || null : null,
          selectedBusinessName: e.mode === 'choose' ? e.selectedBusinessName || null : null,
          selectedPackageName: e.mode === 'choose' ? e.selectedPackageName || null : null,
          selectedPackagePrice: e.mode === 'choose' ? e.selectedPackagePrice || 0 : null,
        })),
        status: 'pending',
        createdAt: serverTimestamp(),
      });

      // ✅ Post a serviceRequests doc for each hybrid category the planner chose
      // "request" mode on — matching businesses can browse and accept these
      // from their OSB dashboard.
      const hybridCategories = [
        { key: 'rentals', state: rentals, details: [rentals.chairs && `${rentals.chairs} chairs`, rentals.tables && `${rentals.tables} tables`, rentals.tents && `${rentals.tents} tents`, rentals.notes].filter(Boolean).join(' · ') || null },
        { key: 'decorator', state: decorator, details: decorator.style || null },
        { key: 'catering', state: catering, details: catering.menuType || null },
        { key: 'dj', state: dj, details: [dj.genre, dj.hours ? `${dj.hours} hrs` : null].filter(Boolean).join(' · ') || null },
        { key: 'mc', state: mc, details: [mc.language, mc.style].filter(Boolean).join(' · ') || null },
        { key: 'photography', state: photography, details: [photography.hours ? `${photography.hours} hrs` : null, photography.style].filter(Boolean).join(' · ') || null },
        { key: 'transportation', state: transportation, details: [transportation.vehicleType, transportation.withDriver ? 'with driver' : 'self-drive', transportation.notes].filter(Boolean).join(' · ') || null },
      ];

      // ✅ Both modes now create a serviceRequests doc — 'direct' for a specific
      // chosen business (they must Accept/Decline, not an instant booking
      // anymore), 'open' for a broadcast offer any matching business can quote on.
      for (const cat of hybridCategories) {
        if (cat.state.skipped) continue;

        if (cat.state.mode === 'choose' && cat.state.selectedBusinessId) {
          await addDoc(collection(db, 'serviceRequests'), {
            requestType: 'direct',
            eventPlanId: planRef.id,
            plannerUserId: currentUser.uid,
            plannerName: userProfile?.name || currentUser.displayName || '',
            plannerEmail: currentUser.email || '',
            category: CATEGORY_BUSINESS_TYPE[cat.key],
            eventName: details.eventName.trim(),
            eventDate: details.eventDate,
            city: details.city,
            area: details.area || null,
            state: details.state || null,
            targetBusinessId: cat.state.selectedBusinessId,
            targetBusinessName: cat.state.selectedBusinessName,
            packageName: cat.state.selectedPackageName,
            packagePrice: cat.state.selectedPackagePrice,
            budget: null,
            deadline: null,
            details: cat.details,
            status: 'pending',
            acceptedByBusinessId: null,
            acceptedByBusinessName: null,
            createdAt: serverTimestamp(),
          });
        } else if (cat.state.mode === 'request') {
          await addDoc(collection(db, 'serviceRequests'), {
            requestType: 'open',
            eventPlanId: planRef.id,
            plannerUserId: currentUser.uid,
            plannerName: userProfile?.name || currentUser.displayName || '',
            plannerEmail: currentUser.email || '',
            category: CATEGORY_BUSINESS_TYPE[cat.key],
            eventName: details.eventName.trim(),
            eventDate: details.eventDate,
            city: details.city,
            area: details.area || null,
            state: details.state || null,
            targetBusinessId: null,
            targetBusinessName: null,
            budget: Number(cat.state.budget) || 0,
            deadline: cat.state.deadline || null,
            details: cat.details,
            status: 'open',
            acceptedByBusinessId: null,
            acceptedByBusinessName: null,
            createdAt: serverTimestamp(),
          });
        }
      }

      // ✅ Other Service is repeatable — one serviceRequests doc per entry,
      // each independently accepted/declined or quoted, not tied to a single
      // category slot like the fixed 6 above.
      for (const entry of otherServices) {
        if (entry.mode === 'choose' && entry.selectedBusinessId) {
          await addDoc(collection(db, 'serviceRequests'), {
            requestType: 'direct',
            eventPlanId: planRef.id,
            plannerUserId: currentUser.uid,
            plannerName: userProfile?.name || currentUser.displayName || '',
            plannerEmail: currentUser.email || '',
            category: 'Other Service',
            eventName: details.eventName.trim(),
            eventDate: details.eventDate,
            city: details.city,
            area: details.area || null,
            state: details.state || null,
            targetBusinessId: entry.selectedBusinessId,
            targetBusinessName: entry.selectedBusinessName,
            packageName: entry.selectedPackageName,
            packagePrice: entry.selectedPackagePrice,
            budget: null,
            deadline: null,
            details: entry.description || null,
            status: 'pending',
            acceptedByBusinessId: null,
            acceptedByBusinessName: null,
            createdAt: serverTimestamp(),
          });
        } else if (entry.mode === 'request' && entry.description.trim()) {
          await addDoc(collection(db, 'serviceRequests'), {
            requestType: 'open',
            eventPlanId: planRef.id,
            plannerUserId: currentUser.uid,
            plannerName: userProfile?.name || currentUser.displayName || '',
            plannerEmail: currentUser.email || '',
            category: 'Other Service',
            eventName: details.eventName.trim(),
            eventDate: details.eventDate,
            city: details.city,
            area: details.area || null,
            state: details.state || null,
            targetBusinessId: null,
            targetBusinessName: null,
            budget: Number(entry.budget) || 0,
            deadline: entry.deadline || null,
            details: entry.description.trim(),
            status: 'open',
            acceptedByBusinessId: null,
            acceptedByBusinessName: null,
            createdAt: serverTimestamp(),
          });
        }
      }

      // ✅ Supplies (Gift Vendor / Food Stuffs Seller / Baker / Beverages
      // Seller) — same direct/open pattern, plus an optional reference image
      // so the business can see what's being asked for.
      for (const entry of supplies) {
        if (!entry.type) continue;
        if (entry.mode === 'choose' && entry.selectedBusinessId) {
          await addDoc(collection(db, 'serviceRequests'), {
            requestType: 'direct',
            eventPlanId: planRef.id,
            plannerUserId: currentUser.uid,
            plannerName: userProfile?.name || currentUser.displayName || '',
            plannerEmail: currentUser.email || '',
            category: entry.type,
            eventName: details.eventName.trim(),
            eventDate: details.eventDate,
            city: details.city,
            area: details.area || null,
            state: details.state || null,
            targetBusinessId: entry.selectedBusinessId,
            targetBusinessName: entry.selectedBusinessName,
            packageName: entry.selectedPackageName,
            packagePrice: entry.selectedPackagePrice,
            budget: null,
            deadline: null,
            details: entry.description || null,
            referenceImage: entry.referenceImage || null,
            status: 'pending',
            acceptedByBusinessId: null,
            acceptedByBusinessName: null,
            createdAt: serverTimestamp(),
          });
        } else if (entry.mode === 'request' && entry.description.trim()) {
          await addDoc(collection(db, 'serviceRequests'), {
            requestType: 'open',
            eventPlanId: planRef.id,
            plannerUserId: currentUser.uid,
            plannerName: userProfile?.name || currentUser.displayName || '',
            plannerEmail: currentUser.email || '',
            category: entry.type,
            eventName: details.eventName.trim(),
            eventDate: details.eventDate,
            city: details.city,
            area: details.area || null,
            state: details.state || null,
            targetBusinessId: null,
            targetBusinessName: null,
            budget: Number(entry.budget) || 0,
            deadline: entry.deadline || null,
            details: entry.description.trim(),
            referenceImage: entry.referenceImage || null,
            status: 'open',
            acceptedByBusinessId: null,
            acceptedByBusinessName: null,
            createdAt: serverTimestamp(),
          });
        }
      }

      setSubmitted(true);
      scrollTop();
    } catch (err) {
      console.error('Error submitting plan:', err);
      alert('Something went wrong submitting your plan. Please try again.');
    }
    setSubmitting(false);
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-lg mx-auto px-4 py-20 text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg">
            <Check size={36} className="text-white" />
          </div>
          <h1 className="text-2xl font-black text-gray-900 mb-2">Your Plan Is In! 🎉</h1>
          <p className="text-gray-500 mb-8">
            Businesses you requested directly will confirm or decline your request. For anything posted as an open offer, matching businesses can respond with their own quote.
            We'll reach out at <strong>{currentUser?.email}</strong> with next steps.
          </p>
          <button
            onClick={() => navigate('/dashboard')}
            className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white py-4 rounded-2xl font-bold hover:shadow-lg transition"
          >
            Go to Dashboard
          </button>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div ref={topRef} className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-2xl mx-auto px-4 py-10">
        <div className="flex items-center gap-3 mb-6">
          {step > 0 && (
            <button onClick={back} className="w-10 h-10 rounded-xl bg-white border-2 border-gray-200 flex items-center justify-center hover:border-cyan-400 transition flex-shrink-0">
              <ChevronLeft size={18} className="text-gray-600" />
            </button>
          )}
          <div>
            <p className="text-xs text-cyan-600 font-bold uppercase tracking-wider">Plan My Event</p>
            <h1 className="text-xl font-black text-gray-900">{STEPS[step]}</h1>
          </div>
        </div>

        <ProgressBar current={step} total={STEPS.length} />

        <div className="bg-white rounded-3xl border-2 border-gray-100 shadow-sm p-6 sm:p-8">

          {/* Step 0: Event Type */}
          {step === 0 && (
            <div className="space-y-5">
              <p className="text-sm text-gray-500">What are you planning?</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {EVENT_TYPES.map(t => {
                  const Icon = t.icon;
                  const selected = eventType === t.value;
                  return (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setEventType(t.value)}
                      className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition ${
                        selected ? 'border-cyan-500 bg-cyan-50' : 'border-gray-200 hover:border-cyan-300'
                      }`}
                    >
                      <Icon size={22} className={selected ? 'text-cyan-600' : 'text-gray-400'} />
                      <span className={`text-xs font-bold ${selected ? 'text-cyan-700' : 'text-gray-600'}`}>{t.label}</span>
                    </button>
                  );
                })}
              </div>
              {eventType === 'other' && (
                <StyledInput value={eventTypeOther} onChange={e => setEventTypeOther(e.target.value)} placeholder="Tell us what kind of event" />
              )}
            </div>
          )}

          {/* Step 1: Event Details */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-gray-800 mb-1.5">Event Name <span className="text-red-500">*</span></label>
                <StyledInput value={details.eventName} onChange={e => setDetails(p => ({ ...p, eventName: e.target.value }))} placeholder="e.g. Tomi's 25th Birthday" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-800 mb-1.5">Event Date <span className="text-red-500">*</span></label>
                <StyledInput type="date" value={details.eventDate} onChange={e => setDetails(p => ({ ...p, eventDate: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-800 mb-1.5">Estimated Guests <span className="text-red-500">*</span></label>
                <StyledInput type="number" min="1" value={details.estimatedGuests} onChange={e => setDetails(p => ({ ...p, estimatedGuests: e.target.value }))} placeholder="e.g. 100" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-800 mb-1.5">State <span className="text-red-500">*</span></label>
                <StyledSelect
                  value={stateOption}
                  onChange={e => {
                    const val = e.target.value;
                    setStateOption(val);
                    setDetails(p => ({ ...p, state: val === 'Others' ? '' : val }));
                  }}
                >
                  <option value="">Select a state</option>
                  {STATES.map(s => <option key={s}>{s}</option>)}
                </StyledSelect>
                {stateOption === 'Others' && (
                  <StyledInput
                    className="mt-2"
                    value={details.state}
                    onChange={e => setDetails(p => ({ ...p, state: e.target.value }))}
                    placeholder="Enter your state"
                  />
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-bold text-gray-800 mb-1.5">City <span className="text-gray-400 font-normal">(optional)</span></label>
                  <StyledInput value={details.city} onChange={e => setDetails(p => ({ ...p, city: e.target.value }))} placeholder="e.g. Lekki, Wuse" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-800 mb-1.5">Area <span className="text-gray-400 font-normal">(optional)</span></label>
                  <StyledInput value={details.area} onChange={e => setDetails(p => ({ ...p, area: e.target.value }))} placeholder="e.g. bus stop" />
                </div>
              </div>
              <p className="text-xs text-gray-400">Area and City help businesses judge distance more precisely when reviewing your requests.</p>
              <div>
                <label className="block text-sm font-bold text-gray-800 mb-1.5">Overall Budget <span className="text-gray-400 font-normal">(optional)</span></label>
                <StyledSelect value={details.budget} onChange={e => setDetails(p => ({ ...p, budget: e.target.value }))}>
                  <option value="">Prefer not to say</option>
                  {BUDGET_RANGES.map(b => <option key={b}>{b}</option>)}
                </StyledSelect>
              </div>
            </div>
          )}

          {/* Step 2: Venue */}
          {step === 2 && (
            <div className="space-y-5">
              <SkipToggle skipped={venue.skipped} onToggle={() => setVenue(p => ({ ...p, skipped: !p.skipped }))} label="a venue" />
              {!venue.skipped && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <button type="button" onClick={() => setVenue(p => ({ ...p, mode: 'hall' }))}
                      className={`p-4 rounded-2xl border-2 text-sm font-bold flex flex-col items-center gap-2 transition ${venue.mode === 'hall' ? 'border-cyan-500 bg-cyan-50 text-cyan-700' : 'border-gray-200 text-gray-600'}`}>
                      <Building2 size={20} /> Pick a Hall
                    </button>
                    <button type="button" onClick={() => setVenue(p => ({ ...p, mode: 'own' }))}
                      className={`p-4 rounded-2xl border-2 text-sm font-bold flex flex-col items-center gap-2 transition ${venue.mode === 'own' ? 'border-cyan-500 bg-cyan-50 text-cyan-700' : 'border-gray-200 text-gray-600'}`}>
                      <MapPin size={20} /> My Own Location
                    </button>
                  </div>

                  {venue.mode === 'hall' && (
                    <div>
                      {loadingHalls ? (
                        <div className="text-center py-8 text-sm text-gray-400">Loading halls...</div>
                      ) : halls.length === 0 ? (
                        <div className="text-center py-8 text-sm text-gray-400">No halls listed yet. Try your own location instead.</div>
                      ) : (
                        <div className="grid grid-cols-2 gap-3 max-h-80 overflow-y-auto pr-1">
                          {halls.map(h => (
                            <button
                              key={h.id}
                              type="button"
                              onClick={() => setVenue(p => ({ ...p, hallId: h.id, hallName: h.title }))}
                              className={`text-left rounded-2xl overflow-hidden border-2 transition ${venue.hallId === h.id ? 'border-cyan-500' : 'border-gray-200 hover:border-cyan-300'}`}
                            >
                              <div className="h-20 bg-gray-100">
                                <img src={h.imageUrl || 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=300&h=200&fit=crop'} alt={h.title} className="w-full h-full object-cover" />
                              </div>
                              <div className="p-2">
                                <p className="text-xs font-bold text-gray-800 line-clamp-1">{h.title}</p>
                                <p className="text-[10px] text-gray-400 line-clamp-1">{h.location || h.city}</p>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {venue.mode === 'own' && (
                    <div>
                      <label className="block text-sm font-bold text-gray-800 mb-1.5">Location / Address</label>
                      <StyledInput value={venue.ownLocation} onChange={e => setVenue(p => ({ ...p, ownLocation: e.target.value }))} placeholder="e.g. Home address, compound, church hall" />
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Step 3: Rentals */}
          {step === 3 && (
            <div className="space-y-5">
              <SkipToggle skipped={rentals.skipped} onToggle={() => setRentals(p => ({ ...p, skipped: !p.skipped }))} label="furniture rentals" />
              {!rentals.skipped && (
                <>
                  <ModeToggle mode={rentals.mode} onChange={(m) => { setRentals(p => ({ ...p, mode: m })); if (m === 'choose') loadCategoryBusinesses('rentals'); }} />
                  {rentals.mode === 'choose' ? (
                    <BusinessPickerList businesses={categoryBusinesses.rentals} state={rentals} setState={setRentals} />
                  ) : (
                    <>
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-gray-600 mb-1">Chairs</label>
                          <StyledInput type="number" min="0" value={rentals.chairs} onChange={e => setRentals(p => ({ ...p, chairs: e.target.value }))} placeholder="0" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-600 mb-1">Tables</label>
                          <StyledInput type="number" min="0" value={rentals.tables} onChange={e => setRentals(p => ({ ...p, tables: e.target.value }))} placeholder="0" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-600 mb-1">Tents</label>
                          <StyledInput type="number" min="0" value={rentals.tents} onChange={e => setRentals(p => ({ ...p, tents: e.target.value }))} placeholder="0" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-800 mb-1.5">Anything else? <span className="text-gray-400 font-normal">(optional)</span></label>
                        <StyledInput value={rentals.notes} onChange={e => setRentals(p => ({ ...p, notes: e.target.value }))} placeholder="e.g. Canopy, generator, sound system" />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-800 mb-1.5">Your Budget <span className="text-gray-400 font-normal">(optional)</span></label>
                        <StyledInput type="number" min="0" value={rentals.budget} onChange={e => setRentals(p => ({ ...p, budget: e.target.value }))} placeholder="State your amount, e.g. 60000" />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-800 mb-1.5">Response Deadline <span className="text-gray-400 font-normal">(optional)</span></label>
                        <StyledInput type="date" value={rentals.deadline} onChange={e => setRentals(p => ({ ...p, deadline: e.target.value }))} />
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          )}

          {/* Step 4: Decorator */}
          {step === 4 && (
            <div className="space-y-5">
              <SkipToggle skipped={decorator.skipped} onToggle={() => setDecorator(p => ({ ...p, skipped: !p.skipped }))} label="a decorator" />
              {!decorator.skipped && (
                <>
                  <ModeToggle mode={decorator.mode} onChange={(m) => { setDecorator(p => ({ ...p, mode: m })); if (m === 'choose') loadCategoryBusinesses('decorator'); }} />
                  {decorator.mode === 'choose' ? (
                    <BusinessPickerList businesses={categoryBusinesses.decorator} state={decorator} setState={setDecorator} />
                  ) : (
                    <>
                      <div>
                        <label className="block text-sm font-bold text-gray-800 mb-1.5 flex items-center gap-2"><Palette size={16} className="text-cyan-500" /> Style Preference</label>
                        <ChipPicker options={DECOR_STYLES} value={decorator.style} onChange={v => setDecorator(p => ({ ...p, style: v }))} />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-800 mb-1.5">Your Budget <span className="text-gray-400 font-normal">(optional)</span></label>
                        <StyledInput type="number" min="0" value={decorator.budget} onChange={e => setDecorator(p => ({ ...p, budget: e.target.value }))} placeholder="State your amount, e.g. 100000" />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-800 mb-1.5">Response Deadline <span className="text-gray-400 font-normal">(optional)</span></label>
                        <StyledInput type="date" value={decorator.deadline} onChange={e => setDecorator(p => ({ ...p, deadline: e.target.value }))} />
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          )}

          {/* Step 5: Catering */}
          {step === 5 && (
            <div className="space-y-5">
              <SkipToggle skipped={catering.skipped} onToggle={() => setCatering(p => ({ ...p, skipped: !p.skipped }))} label="catering" />
              {!catering.skipped && (
                <>
                  <ModeToggle mode={catering.mode} onChange={(m) => { setCatering(p => ({ ...p, mode: m })); if (m === 'choose') loadCategoryBusinesses('catering'); }} />
                  {catering.mode === 'choose' ? (
                    <BusinessPickerList businesses={categoryBusinesses.catering} state={catering} setState={setCatering} />
                  ) : (
                    <>
                      <div>
                        <label className="block text-sm font-bold text-gray-800 mb-1.5 flex items-center gap-2"><UtensilsCrossed size={16} className="text-cyan-500" /> Menu Type</label>
                        <ChipPicker options={MENU_TYPES} value={catering.menuType} onChange={v => setCatering(p => ({ ...p, menuType: v }))} />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-800 mb-1.5">Your Budget <span className="text-gray-400 font-normal">(optional)</span></label>
                        <StyledInput type="number" min="0" value={catering.budget} onChange={e => setCatering(p => ({ ...p, budget: e.target.value }))} placeholder="State your amount, e.g. 200000" />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-800 mb-1.5">Response Deadline <span className="text-gray-400 font-normal">(optional)</span></label>
                        <StyledInput type="date" value={catering.deadline} onChange={e => setCatering(p => ({ ...p, deadline: e.target.value }))} />
                      </div>
                      <p className="text-xs text-gray-400">Guest count will be shared with caterers from your event details ({details.estimatedGuests || '—'} guests).</p>
                    </>
                  )}
                </>
              )}
            </div>
          )}

          {/* Step 6: Livestock */}
          {step === 6 && (
            <div className="space-y-5">
              <SkipToggle skipped={livestock.skipped} onToggle={() => setLivestock(p => ({ ...p, skipped: !p.skipped }))} label="livestock for your party" />
              {!livestock.skipped && (
                <>
                  {loadingSellers ? (
                    <div className="text-center py-8 text-sm text-gray-400">Loading available sellers...</div>
                  ) : animalSellers.length === 0 ? (
                    <div className="text-center py-8 text-sm text-gray-400">
                      No animal sellers listed yet in your area. Check back later — we'll notify you once one's available.
                    </div>
                  ) : (
                    <div className="space-y-4 max-h-96 overflow-y-auto pr-1">
                      {animalSellers.map(seller => (
                        <div key={seller.id} className="border-2 border-gray-200 rounded-2xl p-4">
                          <p className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">
                            <Beef size={16} className="text-cyan-500" /> {seller.businessName}
                          </p>
                          {(seller.pricingTiers || []).length === 0 ? (
                            <p className="text-xs text-gray-400">No pricing listed yet</p>
                          ) : (
                            <div className="space-y-2">
                              {seller.pricingTiers.map(tier => {
                                const existing = livestock.items.find(i => i.sellerId === seller.id && i.tierName === tier.name);
                                const qty = existing?.quantity || 0;
                                const setQty = (newQty) => {
                                  setLivestock(p => {
                                    const filtered = p.items.filter(i => !(i.sellerId === seller.id && i.tierName === tier.name));
                                    if (newQty <= 0) return { ...p, items: filtered };
                                    return {
                                      ...p,
                                      items: [...filtered, { sellerId: seller.id, sellerName: seller.businessName, tierName: tier.name, price: tier.price, quantity: newQty }],
                                    };
                                  });
                                };
                                return (
                                  <div key={tier.id || tier.name} className="flex items-center justify-between bg-gray-50 rounded-xl p-3">
                                    <div>
                                      <p className="text-sm font-medium text-gray-800">{tier.name}</p>
                                      <p className="text-xs text-gray-500">₦{Number(tier.price).toLocaleString()} each</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <button type="button" onClick={() => setQty(Math.max(0, qty - 1))} className="w-7 h-7 rounded-full border border-gray-300 flex items-center justify-center text-gray-500 hover:border-cyan-400">−</button>
                                      <span className="w-6 text-center text-sm font-bold">{qty}</span>
                                      <button type="button" onClick={() => setQty(qty + 1)} className="w-7 h-7 rounded-full border border-gray-300 flex items-center justify-center text-gray-500 hover:border-cyan-400">+</button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  {livestock.items.length > 0 && (
                    <div className="bg-cyan-50 rounded-xl p-3 border border-cyan-100">
                      <p className="text-xs font-bold text-cyan-700 mb-1">Selected:</p>
                      {livestock.items.map((i, idx) => (
                        <p key={idx} className="text-xs text-gray-600">{i.quantity}x {i.tierName} — {i.sellerName} (₦{(i.price * i.quantity).toLocaleString()})</p>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Step 7: Supplies (Gift Vendor / Food Stuffs / Baker / Beverages) */}
          {step === 7 && (
            <div className="space-y-5">
              <p className="text-sm text-gray-500">Need a gift vendor, food stuffs, a baker, or drinks for your event? Add as many as you like.</p>

              {supplies.map((entry, idx) => (
                <div key={entry.id} className="border-2 border-gray-200 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Supply {idx + 1}</span>
                    <button
                      type="button"
                      onClick={() => setSupplies(prev => prev.filter((_, i) => i !== idx))}
                      className="text-red-400 hover:text-red-600 text-xs font-semibold"
                    >
                      Remove
                    </button>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1.5">What kind?</label>
                    <div className="grid grid-cols-2 gap-2">
                      {SUPPLY_TYPES.map(t => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setSupplies(prev => prev.map((e, i) => i === idx ? { ...e, type: t } : e))}
                          className={`px-3 py-2 rounded-xl border-2 text-xs font-bold transition ${
                            entry.type === t ? 'border-cyan-500 bg-cyan-50 text-cyan-700' : 'border-gray-200 text-gray-600'
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>

                  {entry.type && (
                    <>
                      <ModeToggle
                        mode={entry.mode}
                        onChange={(m) => {
                          setSupplies(prev => prev.map((e, i) => i === idx ? { ...e, mode: m } : e));
                          if (m === 'choose') loadSupplyBusinesses(entry.type);
                        }}
                      />

                      {entry.mode === 'choose' ? (
                        <BusinessPickerList
                          businesses={supplyBusinesses[entry.type]}
                          state={entry}
                          setState={(updater) => setSupplies(prev => prev.map((e, i) => i === idx ? updater(e) : e))}
                        />
                      ) : (
                        <>
                          <div>
                            <label className="block text-sm font-bold text-gray-800 mb-1.5">What do you need? <span className="text-red-500">*</span></label>
                            <textarea
                              value={entry.description}
                              onChange={e => setSupplies(prev => prev.map((en, i) => i === idx ? { ...en, description: e.target.value } : en))}
                              placeholder="e.g. 2-tier vanilla cake for 50 guests, birthday theme"
                              rows={2}
                              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-cyan-500 transition resize-none"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-bold text-gray-800 mb-1.5">Reference Photo <span className="text-gray-400 font-normal">(optional)</span></label>
                            {entry.referenceImage ? (
                              <div className="relative w-24">
                                <img src={entry.referenceImage} alt="" className="w-24 h-24 rounded-xl object-cover border-2 border-gray-200" />
                                <button
                                  type="button"
                                  onClick={() => setSupplies(prev => prev.map((en, i) => i === idx ? { ...en, referenceImage: '' } : en))}
                                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs"
                                >×</button>
                              </div>
                            ) : (
                              <label className="w-24 h-24 rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:border-cyan-400 transition gap-1">
                                {entry.uploading ? (
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-cyan-500" />
                                ) : (
                                  <span className="text-xs text-gray-400">Upload</span>
                                )}
                                <input
                                  type="file" accept="image/*" className="sr-only"
                                  onChange={async (e) => {
                                    const file = e.target.files[0];
                                    if (!file) return;
                                    setSupplies(prev => prev.map((en, i) => i === idx ? { ...en, uploading: true } : en));
                                    try {
                                      const url = await uploadReferenceImage(file);
                                      setSupplies(prev => prev.map((en, i) => i === idx ? { ...en, referenceImage: url, uploading: false } : en));
                                    } catch (err) {
                                      console.error('Reference image upload failed:', err);
                                      setSupplies(prev => prev.map((en, i) => i === idx ? { ...en, uploading: false } : en));
                                    }
                                  }}
                                />
                              </label>
                            )}
                            <p className="text-xs text-gray-400 mt-1">The business will see this photo when reviewing your request.</p>
                          </div>

                          <div>
                            <label className="block text-sm font-bold text-gray-800 mb-1.5">Your Budget <span className="text-gray-400 font-normal">(optional)</span></label>
                            <StyledInput type="number" min="0" value={entry.budget} onChange={e => setSupplies(prev => prev.map((en, i) => i === idx ? { ...en, budget: e.target.value } : en))} placeholder="State your amount, e.g. 15000" />
                          </div>
                          <div>
                            <label className="block text-sm font-bold text-gray-800 mb-1.5">Response Deadline <span className="text-gray-400 font-normal">(optional)</span></label>
                            <StyledInput type="date" value={entry.deadline} onChange={e => setSupplies(prev => prev.map((en, i) => i === idx ? { ...en, deadline: e.target.value } : en))} />
                          </div>
                        </>
                      )}
                    </>
                  )}
                </div>
              ))}

              <button
                type="button"
                onClick={() => setSupplies(prev => [...prev, {
                  id: `supply_${Date.now()}`, type: '', mode: 'request', description: '', budget: '', deadline: '',
                  referenceImage: '', uploading: false,
                  selectedBusinessId: '', selectedBusinessName: '', selectedPackageName: '', selectedPackagePrice: 0,
                }])}
                className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-cyan-300 rounded-xl text-sm font-semibold text-cyan-600 hover:bg-cyan-50 transition"
              >
                <Plus size={16} /> Add a Supply
              </button>
            </div>
          )}

          {/* Step 8: DJ */}
          {step === 8 && (
            <div className="space-y-5">
              <SkipToggle skipped={dj.skipped} onToggle={() => setDj(p => ({ ...p, skipped: !p.skipped }))} label="a DJ" />
              {!dj.skipped && (
                <>
                  <ModeToggle mode={dj.mode} onChange={(m) => { setDj(p => ({ ...p, mode: m })); if (m === 'choose') loadCategoryBusinesses('dj'); }} />
                  {dj.mode === 'choose' ? (
                    <BusinessPickerList businesses={categoryBusinesses.dj} state={dj} setState={setDj} />
                  ) : (
                    <>
                      <div>
                        <label className="block text-sm font-bold text-gray-800 mb-1.5 flex items-center gap-2"><Music size={16} className="text-cyan-500" /> Hours Needed</label>
                        <StyledInput type="number" min="1" value={dj.hours} onChange={e => setDj(p => ({ ...p, hours: e.target.value }))} placeholder="e.g. 4" />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-800 mb-1.5">Music Genre</label>
                        <ChipPicker options={DJ_GENRES} value={dj.genre} onChange={v => setDj(p => ({ ...p, genre: v }))} />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-800 mb-1.5">Your Budget <span className="text-gray-400 font-normal">(optional)</span></label>
                        <StyledInput type="number" min="0" value={dj.budget} onChange={e => setDj(p => ({ ...p, budget: e.target.value }))} placeholder="State your amount, e.g. 50000" />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-800 mb-1.5">Response Deadline <span className="text-gray-400 font-normal">(optional)</span></label>
                        <StyledInput type="date" value={dj.deadline} onChange={e => setDj(p => ({ ...p, deadline: e.target.value }))} />
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          )}

          {/* Step 8: MC */}
          {step === 9 && (
            <div className="space-y-5">
              <SkipToggle skipped={mc.skipped} onToggle={() => setMc(p => ({ ...p, skipped: !p.skipped }))} label="an MC" />
              {!mc.skipped && (
                <>
                  <ModeToggle mode={mc.mode} onChange={(m) => { setMc(p => ({ ...p, mode: m })); if (m === 'choose') loadCategoryBusinesses('mc'); }} />
                  {mc.mode === 'choose' ? (
                    <BusinessPickerList businesses={categoryBusinesses.mc} state={mc} setState={setMc} />
                  ) : (
                    <>
                      <div>
                        <label className="block text-sm font-bold text-gray-800 mb-1.5 flex items-center gap-2"><Users size={16} className="text-cyan-500" /> Preferred Language</label>
                        <ChipPicker options={MC_LANGUAGES} value={mc.language} onChange={v => setMc(p => ({ ...p, language: v }))} />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-800 mb-1.5">Style <span className="text-gray-400 font-normal">(optional)</span></label>
                        <StyledInput value={mc.style} onChange={e => setMc(p => ({ ...p, style: e.target.value }))} placeholder="e.g. High energy, formal, comedic" />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-800 mb-1.5">Your Budget <span className="text-gray-400 font-normal">(optional)</span></label>
                        <StyledInput type="number" min="0" value={mc.budget} onChange={e => setMc(p => ({ ...p, budget: e.target.value }))} placeholder="State your amount, e.g. 40000" />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-800 mb-1.5">Response Deadline <span className="text-gray-400 font-normal">(optional)</span></label>
                        <StyledInput type="date" value={mc.deadline} onChange={e => setMc(p => ({ ...p, deadline: e.target.value }))} />
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          )}

          {/* Step 9: Photography */}
          {step === 10 && (
            <div className="space-y-5">
              <SkipToggle skipped={photography.skipped} onToggle={() => setPhotography(p => ({ ...p, skipped: !p.skipped }))} label="a photographer / videographer" />
              {!photography.skipped && (
                <>
                  <ModeToggle mode={photography.mode} onChange={(m) => { setPhotography(p => ({ ...p, mode: m })); if (m === 'choose') loadCategoryBusinesses('photography'); }} />
                  {photography.mode === 'choose' ? (
                    <BusinessPickerList businesses={categoryBusinesses.photography} state={photography} setState={setPhotography} />
                  ) : (
                    <>
                      <div>
                        <label className="block text-sm font-bold text-gray-800 mb-1.5 flex items-center gap-2"><Camera size={16} className="text-cyan-500" /> Hours Needed</label>
                        <StyledInput type="number" min="1" value={photography.hours} onChange={e => setPhotography(p => ({ ...p, hours: e.target.value }))} placeholder="e.g. 5" />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-800 mb-1.5">Style <span className="text-gray-400 font-normal">(optional)</span></label>
                        <StyledInput value={photography.style} onChange={e => setPhotography(p => ({ ...p, style: e.target.value }))} placeholder="e.g. Candid, traditional, cinematic video" />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-800 mb-1.5">Your Budget <span className="text-gray-400 font-normal">(optional)</span></label>
                        <StyledInput type="number" min="0" value={photography.budget} onChange={e => setPhotography(p => ({ ...p, budget: e.target.value }))} placeholder="State your amount, e.g. 80000" />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-800 mb-1.5">Response Deadline <span className="text-gray-400 font-normal">(optional)</span></label>
                        <StyledInput type="date" value={photography.deadline} onChange={e => setPhotography(p => ({ ...p, deadline: e.target.value }))} />
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          )}

          {/* Step 10: Transportation */}
          {step === 11 && (
            <div className="space-y-5">
              <SkipToggle skipped={transportation.skipped} onToggle={() => setTransportation(p => ({ ...p, skipped: !p.skipped }))} label="transportation" />
              {!transportation.skipped && (
                <>
                  <ModeToggle mode={transportation.mode} onChange={(m) => { setTransportation(p => ({ ...p, mode: m })); if (m === 'choose') loadCategoryBusinesses('transportation'); }} />
                  {transportation.mode === 'choose' ? (
                    <BusinessPickerList businesses={categoryBusinesses.transportation} state={transportation} setState={setTransportation} />
                  ) : (
                    <>
                      <div>
                        <label className="block text-sm font-bold text-gray-800 mb-1.5 flex items-center gap-2"><Car size={16} className="text-cyan-500" /> Vehicle Type</label>
                        <ChipPicker options={VEHICLE_TYPES} value={transportation.vehicleType} onChange={v => setTransportation(p => ({ ...p, vehicleType: v }))} />
                      </div>
                      <label className="flex items-center gap-2">
                        <input type="checkbox" checked={transportation.withDriver} onChange={e => setTransportation(p => ({ ...p, withDriver: e.target.checked }))} className="w-4 h-4 text-cyan-500 rounded" />
                        <span className="text-sm text-gray-700">I need a driver</span>
                      </label>
                      <div>
                        <label className="block text-sm font-bold text-gray-800 mb-1.5">Notes <span className="text-gray-400 font-normal">(optional)</span></label>
                        <StyledInput value={transportation.notes} onChange={e => setTransportation(p => ({ ...p, notes: e.target.value }))} placeholder="e.g. Airport pickup, guest shuttle" />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-800 mb-1.5">Your Budget <span className="text-gray-400 font-normal">(optional)</span></label>
                        <StyledInput type="number" min="0" value={transportation.budget} onChange={e => setTransportation(p => ({ ...p, budget: e.target.value }))} placeholder="State your amount, e.g. 30000" />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-800 mb-1.5">Response Deadline <span className="text-gray-400 font-normal">(optional)</span></label>
                        <StyledInput type="date" value={transportation.deadline} onChange={e => setTransportation(p => ({ ...p, deadline: e.target.value }))} />
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          )}

          {/* Step 11: Other Service (repeatable) */}
          {step === 12 && (
            <div className="space-y-5">
              <p className="text-sm text-gray-500">Need anything not covered above? Add as many as you like — each becomes its own request.</p>

              {otherServices.map((entry, idx) => (
                <div key={entry.id} className="border-2 border-gray-200 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Service {idx + 1}</span>
                    <button
                      type="button"
                      onClick={() => setOtherServices(prev => prev.filter((_, i) => i !== idx))}
                      className="text-red-400 hover:text-red-600 text-xs font-semibold"
                    >
                      Remove
                    </button>
                  </div>

                  <ModeToggle
                    mode={entry.mode}
                    onChange={(m) => {
                      setOtherServices(prev => prev.map((e, i) => i === idx ? { ...e, mode: m } : e));
                      if (m === 'choose') loadCategoryBusinesses('otherService');
                    }}
                  />

                  {entry.mode === 'choose' ? (
                    <BusinessPickerList
                      businesses={categoryBusinesses.otherService}
                      state={entry}
                      setState={(updater) => setOtherServices(prev => prev.map((e, i) => i === idx ? updater(e) : e))}
                    />
                  ) : (
                    <>
                      <div>
                        <label className="block text-sm font-bold text-gray-800 mb-1.5">What do you need? <span className="text-red-500">*</span></label>
                        <textarea
                          value={entry.description}
                          onChange={e => setOtherServices(prev => prev.map((en, i) => i === idx ? { ...en, description: e.target.value } : en))}
                          placeholder="e.g. Balloon artist, cake baker, magician, makeup for guests"
                          rows={2}
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-cyan-500 transition resize-none"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-800 mb-1.5">Your Budget <span className="text-gray-400 font-normal">(optional)</span></label>
                        <StyledInput type="number" min="0" value={entry.budget} onChange={e => setOtherServices(prev => prev.map((en, i) => i === idx ? { ...en, budget: e.target.value } : en))} placeholder="State your amount, e.g. 25000" />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-800 mb-1.5">Response Deadline <span className="text-gray-400 font-normal">(optional)</span></label>
                        <StyledInput type="date" value={entry.deadline} onChange={e => setOtherServices(prev => prev.map((en, i) => i === idx ? { ...en, deadline: e.target.value } : en))} />
                      </div>
                    </>
                  )}
                </div>
              ))}

              <button
                type="button"
                onClick={() => setOtherServices(prev => [...prev, {
                  id: `other_${Date.now()}`, mode: 'request', description: '', budget: '', deadline: '',
                  selectedBusinessId: '', selectedBusinessName: '', selectedPackageName: '', selectedPackagePrice: 0,
                }])}
                className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-cyan-300 rounded-xl text-sm font-semibold text-cyan-600 hover:bg-cyan-50 transition"
              >
                <Plus size={16} /> Add Another Service
              </button>
            </div>
          )}

          {/* Step 12: Review */}
          {step === 13 && (
            <div className="space-y-4">
              <p className="text-sm text-gray-500 mb-2">Review your event plan before submitting.</p>
              <div className="bg-cyan-50 rounded-2xl p-4 space-y-2 border border-cyan-100">
                <ReviewRow label="Event" value={`${EVENT_TYPES.find(t => t.value === eventType)?.label || eventTypeOther} — ${details.eventName}`} />
                <ReviewRow label="Date" value={details.eventDate} />
                <ReviewRow label="Guests" value={details.estimatedGuests} />
                <ReviewRow label="State" value={details.state} />
                {details.city && <ReviewRow label="City" value={details.city} />}
                {details.area && <ReviewRow label="Area" value={details.area} />}
                {details.budget && <ReviewRow label="Budget" value={details.budget} />}
              </div>
              {[
                { skipped: venue.skipped, label: 'Venue', value: venue.mode === 'hall' ? (venue.hallName || 'Hall — not selected') : (venue.ownLocation || 'Own location') },
                { skipped: rentals.skipped, label: 'Rentals', value: rentals.mode === 'choose' ? (rentals.selectedBusinessName ? `Requested: ${rentals.selectedBusinessName} — ${rentals.selectedPackageName}` : 'No business selected') : `Offer posted · ${rentals.chairs || 0} chairs, ${rentals.tables || 0} tables, ${rentals.tents || 0} tents${rentals.budget ? ` · ₦${Number(rentals.budget).toLocaleString()}` : ''}` },
                { skipped: decorator.skipped, label: 'Decorator', value: decorator.mode === 'choose' ? (decorator.selectedBusinessName ? `Requested: ${decorator.selectedBusinessName} — ${decorator.selectedPackageName}` : 'No business selected') : `Offer posted · ${decorator.style || 'no style set'}${decorator.budget ? ` · ₦${Number(decorator.budget).toLocaleString()}` : ''}` },
                { skipped: catering.skipped, label: 'Catering', value: catering.mode === 'choose' ? (catering.selectedBusinessName ? `Requested: ${catering.selectedBusinessName} — ${catering.selectedPackageName}` : 'No business selected') : `Offer posted · ${catering.menuType || 'no menu set'}${catering.budget ? ` · ₦${Number(catering.budget).toLocaleString()}` : ''}` },
                { skipped: livestock.skipped, label: 'Livestock', value: livestock.items.length > 0 ? `${livestock.items.length} item type(s) selected` : 'No preference set' },
                { skipped: dj.skipped, label: 'DJ', value: dj.mode === 'choose' ? (dj.selectedBusinessName ? `Requested: ${dj.selectedBusinessName} — ${dj.selectedPackageName}` : 'No business selected') : `Offer posted · ${dj.genre || 'no genre set'}${dj.budget ? ` · ₦${Number(dj.budget).toLocaleString()}` : ''}` },
                { skipped: mc.skipped, label: 'MC', value: mc.mode === 'choose' ? (mc.selectedBusinessName ? `Requested: ${mc.selectedBusinessName} — ${mc.selectedPackageName}` : 'No business selected') : `Offer posted · ${mc.language || 'no language set'}${mc.budget ? ` · ₦${Number(mc.budget).toLocaleString()}` : ''}` },
                { skipped: photography.skipped, label: 'Photography', value: photography.mode === 'choose' ? (photography.selectedBusinessName ? `Requested: ${photography.selectedBusinessName} — ${photography.selectedPackageName}` : 'No business selected') : `Offer posted · ${photography.style || 'no style set'}${photography.budget ? ` · ₦${Number(photography.budget).toLocaleString()}` : ''}` },
                { skipped: transportation.skipped, label: 'Transportation', value: transportation.mode === 'choose' ? (transportation.selectedBusinessName ? `Requested: ${transportation.selectedBusinessName} — ${transportation.selectedPackageName}` : 'No business selected') : `Offer posted · ${transportation.vehicleType || 'no vehicle set'}${transportation.budget ? ` · ₦${Number(transportation.budget).toLocaleString()}` : ''}` },
              ].map(row => (
                <div key={row.label} className={`flex items-center justify-between px-4 py-3 rounded-xl border ${row.skipped ? 'border-gray-100 bg-gray-50' : 'border-gray-200'}`}>
                  <span className="text-sm font-bold text-gray-700">{row.label}</span>
                  <span className={`text-xs ${row.skipped ? 'text-gray-400 italic' : 'text-gray-600'}`}>{row.skipped ? 'Skipped' : row.value}</span>
                </div>
              ))}
              {otherServices.length > 0 && otherServices.map((entry, idx) => (
                <div key={entry.id} className="flex items-center justify-between px-4 py-3 rounded-xl border border-gray-200">
                  <span className="text-sm font-bold text-gray-700">Other Service {otherServices.length > 1 ? idx + 1 : ''}</span>
                  <span className="text-xs text-gray-600">
                    {entry.mode === 'choose'
                      ? (entry.selectedBusinessName ? `Requested: ${entry.selectedBusinessName} — ${entry.selectedPackageName}` : 'No business selected')
                      : `Offer posted · ${entry.description || 'no description set'}${entry.budget ? ` · ₦${Number(entry.budget).toLocaleString()}` : ''}`}
                  </span>
                </div>
              ))}
              {supplies.length > 0 && supplies.filter(e => e.type).map((entry, idx) => (
                <div key={entry.id} className="flex items-center justify-between px-4 py-3 rounded-xl border border-gray-200">
                  <span className="text-sm font-bold text-gray-700">{entry.type}</span>
                  <span className="text-xs text-gray-600">
                    {entry.mode === 'choose'
                      ? (entry.selectedBusinessName ? `Requested: ${entry.selectedBusinessName} — ${entry.selectedPackageName}` : 'No business selected')
                      : `Offer posted · ${entry.description || 'no description set'}${entry.budget ? ` · ₦${Number(entry.budget).toLocaleString()}` : ''}${entry.referenceImage ? ' · 📷 photo attached' : ''}`}
                  </span>
                </div>
              ))}
              <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl p-3 mt-4">
                <ListPlus size={16} className="text-blue-500 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-blue-700 leading-relaxed">Businesses you requested directly will need to confirm availability. For anything posted as an open offer, matching businesses can respond with their own quote — check "My Events" to see responses.</p>
              </div>
            </div>
          )}

        </div>

        {/* Nav buttons */}
        <div className="flex gap-3 mt-6">
          {step > 0 && (
            <button onClick={back} className="flex items-center gap-2 px-6 py-3.5 border-2 border-gray-200 rounded-2xl text-sm font-bold text-gray-600 hover:bg-gray-50 transition">
              <ChevronLeft size={16} /> Back
            </button>
          )}
          {step >= 2 && step <= 12 && (
            <button onClick={handleSkip} className="px-6 py-3.5 border-2 border-gray-200 rounded-2xl text-sm font-bold text-gray-500 hover:bg-gray-50 transition">
              Skip
            </button>
          )}
          {step < STEPS.length - 1 ? (
            <button
              onClick={next}
              disabled={(step === 0 && !canProceedStep0) || (step === 1 && !canProceedStep1)}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-black bg-gradient-to-r from-cyan-600 to-blue-600 text-white hover:from-cyan-700 hover:to-blue-700 shadow-lg disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              Continue <ChevronRight size={16} />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-black bg-gradient-to-r from-cyan-600 to-blue-600 text-white hover:from-cyan-700 hover:to-blue-700 shadow-lg disabled:opacity-50 transition"
            >
              {submitting ? 'Submitting...' : '🚀 Submit My Plan'}
            </button>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
}

function ReviewRow({ label, value }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="font-bold text-gray-900">{value || '—'}</span>
    </div>
  );
}