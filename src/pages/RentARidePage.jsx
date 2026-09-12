import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { collection, getDocs, doc, updateDoc, arrayUnion, arrayRemove, getDoc, addDoc, serverTimestamp, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { PaystackButton } from 'react-paystack';
import {
  Search, SlidersHorizontal, X, MapPin,
  ChevronLeft, ChevronRight, Heart, Users, Car, ShieldCheck, PlayCircle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

// Same platform fee as paystack-webhook.js's PLATFORM_FEE_PERCENTAGE and
// ride_booking_screen.dart's _kPlatformFeeRate — kept in sync across all
// three so what the guest sees matches what the webhook computes.
const PLATFORM_FEE_RATE = 0.10;

// ✅ REBUILT — this page used to derive listings from two sources: an
// empty `vehicles` collection reserved for a feature that was never
// built, and approved Ride Provider businesses' `pricingTiers` array (a
// generic-marketplace hack). Neither ever queried the `rides` collection,
// so every vehicle added through OSBDashboard.jsx's "My Vehicles" tab
// was invisible here until now.
//
// Now queries `rides` directly, filtered to available == true. There's
// no separate per-vehicle status — the trust boundary is the AGENCY
// itself (approved once at registration, including bank details +
// Government ID), same model as Shortlet.
//
// ✅ SIMPLIFIED — no driver profile shown pre-booking. Drivers aren't
// attached to a vehicle listing at all — they're picked per booking
// based on availability, and the agency assigns one only after a guest
// pays; the guest sees it in My Bookings. The detail modal shows agency
// contact context and a "driver details shared after booking" note.

const CITIES = ['All Cities', 'Lagos', 'Abuja', 'Ibadan', 'Port Harcourt', 'Others'];
const VEHICLE_TYPES = ['All Types', 'Car', 'SUV', 'Bus (mini)', 'Bus (full)', 'Van', 'Jet'];
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
        : "Ride agencies are onboarding soon — check back shortly for verified vehicles you can book."}
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

// ✅ FIXED — previously returned only the trip amount when priceType ===
// 'both', with suffix hardcoded to "/trip · /hour" regardless — a guest
// would see e.g. "₦45,000/trip · /hour" with the hourly amount silently
// missing, even though it's saved in Firestore. Now returns a single
// pre-formatted label with both amounts correctly paired to their own
// unit when both are set.
function priceLabel(v) {
  if (v.priceType === 'both') {
    return `₦${Number(v.pricePerTrip || 0).toLocaleString()}/trip · ₦${Number(v.pricePerHour || 0).toLocaleString()}/hour`;
  }
  if (v.priceType === 'hour') return `₦${Number(v.pricePerHour || 0).toLocaleString()}/hour`;
  return `₦${Number(v.pricePerTrip || 0).toLocaleString()}/trip`;
}

// ✅ NEW — same lightbox pattern as MarketplaceCategoryPage.jsx / ShortletsPage.jsx
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

// ✅ SIMPLIFIED — no driver profile shown pre-booking. Drivers aren't
// attached to a vehicle listing at all — they're picked per booking
// based on availability, and the agency assigns one (name + phone) only
// after a guest has paid; the guest then sees it in My Bookings. This
// modal shows agency contact context and a "driver details shared after
// booking" note instead of a driver card.
function RideDetailModal({ ride, onClose, onZoom, onBook }) {
  const price = priceLabel(ride);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-white flex justify-end p-3 border-b border-gray-100 z-10">
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-full transition"><X size={18} /></button>
        </div>
        <div className="p-5">
          {ride.images?.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-2 mb-4 -mx-1 px-1">
              {ride.images.map((url, i) => (
                <div key={i} className="h-40 w-56 flex-shrink-0 bg-cyan-50 rounded-2xl overflow-hidden cursor-zoom-in" onClick={() => onZoom(url)}>
                  <img src={url} alt={ride.title} className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          )}

          <p className="text-lg font-black text-gray-900">{ride.title}</p>
          <p className="text-sm text-gray-400 mt-1">{ride.agencyName}</p>

          <div className="flex flex-wrap gap-2 mt-3">
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-cyan-50 text-cyan-700">{ride.vehicleType}</span>
            {ride.year && <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-gray-50 text-gray-600">{ride.year}</span>}
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-gray-50 text-gray-600">{ride.capacity} seats</span>
            {ride.color && <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-gray-50 text-gray-600">{ride.color}</span>}
            {ride.city && <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-gray-50 text-gray-600 flex items-center gap-1"><MapPin size={10} /> {ride.city}</span>}
            {/* ✅ FIXED — areasCovered was collected by the form and
                stored in Firestore but never shown anywhere on the
                detail view. */}
            {ride.areasCovered && <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-gray-50 text-gray-600 flex items-center gap-1"><MapPin size={10} /> {ride.areasCovered}</span>}
          </div>

          <p className="text-xl font-black text-cyan-600 mt-4">
            {price}
          </p>

          {ride.description && <p className="text-sm text-gray-600 mt-3">{ride.description}</p>}

          {/* ✅ FIXED — videoUrl was collected and stored but had no way
              to actually watch it. Opens in a new tab rather than
              embedding a player, since this codebase has no video
              player component to draw on yet. */}
          {ride.videoUrl && (
            <a
              href={ride.videoUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-cyan-600 bg-cyan-50 px-3.5 py-2 rounded-xl hover:bg-cyan-100 transition"
            >
              <PlayCircle size={16} /> Watch interior walkthrough
            </a>
          )}

          {(ride.features || []).length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Features</p>
              <div className="flex flex-wrap gap-2">
                {ride.features.map(f => (
                  <span key={f} className="text-xs px-2.5 py-1 rounded-full bg-gray-50 text-gray-600">{f}</span>
                ))}
              </div>
            </div>
          )}

          {/* ── Agency contact / driver note ── */}
          <div className="mt-5 bg-gray-50 rounded-2xl p-4 flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-cyan-50 flex items-center justify-center flex-shrink-0">
              <Users size={18} className="text-cyan-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-900 truncate">{ride.agencyName || 'Agency'}</p>
              <p className="text-xs text-gray-500 mt-0.5">Driver details shared after booking</p>
            </div>
          </div>
          {ride.insuranceStatus && (
            <div className="flex items-center gap-1.5 mt-2.5 ml-1">
              <ShieldCheck size={13} className={ride.insuranceStatus === 'Fully insured' ? 'text-emerald-500' : 'text-gray-400'} />
              <span className="text-xs text-gray-500">{ride.insuranceStatus}</span>
            </div>
          )}

          {/* ✅ FIXED — was a placeholder alert(). Opens the real
              booking modal now. */}
          <button
            onClick={() => onBook(ride)}
            className="mt-5 block w-full text-center text-sm font-bold text-white bg-cyan-500 px-4 py-3 rounded-xl hover:bg-cyan-600 transition"
          >
            Book Now
          </button>
        </div>
      </div>
    </div>
  );
}

// ✅ NEW — the actual booking flow. Date + time, a trip/hour toggle when
// the vehicle supports both, live price breakdown, creates the pending
// bookings/ doc, then hands off to PaystackButton — same shape as
// ShortletBookingModal above and ride_booking_screen.dart's mobile flow.
function RideBookingModal({ ride: r, onClose }) {
  const { currentUser } = useAuth();
  const supportsTrip = r.priceType === 'trip' || r.priceType === 'both';
  const supportsHour = r.priceType === 'hour' || r.priceType === 'both';
  const [bookingMode, setBookingMode] = useState(supportsTrip ? 'trip' : 'hour');
  const [tripDate, setTripDate] = useState('');
  const [tripTime, setTripTime] = useState('');
  const [hours, setHours] = useState(r.minHours || 1);
  const [creating, setCreating] = useState(false);
  const [pendingBooking, setPendingBooking] = useState(null);
  // ✅ NEW — same fix as everywhere else in this pass.
  const [phone, setPhone] = useState('');

  const minHours = r.minHours || 1;
  const subtotal = bookingMode === 'trip' ? (r.pricePerTrip || 0) : (r.pricePerHour || 0) * hours;
  const platformFee = Math.round(subtotal * PLATFORM_FEE_RATE);
  const total = subtotal + platformFee;
  const canProceed = tripDate && tripTime && (bookingMode !== 'hour' || hours >= minHours) && phone.trim().length >= 7;
  const todayStr = new Date().toISOString().split('T')[0];

  // ⚠️ ASSUMPTION — same as ride_booking_screen.dart's mobile
  // equivalent: a 'trip' mode booking (flat price, no explicit duration
  // captured) is treated as blocking the vehicle for this many hours
  // for overlap-checking purposes only. An 'hour' mode booking uses its
  // own real, stored `hours` value instead.
  const DEFAULT_TRIP_BLOCK_HOURS = 3;

  // ✅ NEW — Layer 1 of the double-booking fix, same reasoning as the
  // mobile equivalent.
  const checkTimeSlotAvailable = async (newStart) => {
    const newEnd = new Date(newStart.getTime() + (bookingMode === 'hour' ? hours : DEFAULT_TRIP_BLOCK_HOURS) * 60 * 60 * 1000);
    try {
      const snap = await getDocs(query(
        collection(db, 'bookings'),
        where('listingId', '==', r.id),
        where('paymentStatus', '==', 'paid')
      ));
      for (const docSnap of snap.docs) {
        const existing = docSnap.data();
        if (existing.confirmationStatus === 'cancelled') continue;
        const existingStart = existing.tripDateTime?.toDate();
        if (!existingStart) continue;
        const existingHours = existing.bookingMode === 'hour' ? (existing.hours || 1) : DEFAULT_TRIP_BLOCK_HOURS;
        const existingEnd = new Date(existingStart.getTime() + existingHours * 60 * 60 * 1000);
        if (newStart < existingEnd && newEnd > existingStart) {
          return false; // genuine overlap found
        }
      }
      return true;
    } catch (err) {
      console.error('Error checking time slot availability:', err);
      return false;
    }
  };

  const handleCreateBooking = async () => {
    if (!currentUser) {
      alert('Please log in to book.');
      return;
    }
    if (!canProceed) return;
    setCreating(true);

    const tripDateTime = new Date(`${tripDate}T${tripTime}`);
    const available = await checkTimeSlotAvailable(tripDateTime);
    if (!available) {
      alert('This time slot is no longer available. Please choose a different time.');
      setCreating(false);
      return;
    }

    try {
      const bookingRef = await addDoc(collection(db, 'bookings'), {
        type: 'ride',
        listingId: r.id,
        agencyId: r.agencyId || null,
        agencyName: r.agencyName || null,
        guestId: currentUser.uid,
        guestEmail: currentUser.email || '',
        guestName: currentUser.displayName || '',
        guestPhone: phone.trim(),
        listingTitle: r.title,
        listingImage: (r.images || [])[0] || null,
        vehicleType: r.vehicleType || null,
        bookingMode,
        tripDateTime,
        hours: bookingMode === 'hour' ? hours : null,
        pricePerTrip: bookingMode === 'trip' ? (r.pricePerTrip || 0) : null,
        pricePerHour: bookingMode === 'hour' ? (r.pricePerHour || 0) : null,
        subtotal,
        platformFee,
        // ✅ FIXED — same double-counting bug as everywhere else. Owner
        // receives the full subtotal; the fee is what the guest pays on top.
        ownerPayout: subtotal,
        amount: total,
        paymentStatus: 'pending',
        escrowStatus: 'none',
        confirmationStatus: 'pending',
        createdAt: serverTimestamp(),
      });
      const reference = `RIDE-${bookingRef.id}-${Date.now()}`;
      setPendingBooking({ id: bookingRef.id, reference });
    } catch (err) {
      console.error('Error creating booking:', err);
      alert('Something went wrong. Please try again.');
    }
    setCreating(false);
  };

  const paystackConfig = pendingBooking ? {
    reference: pendingBooking.reference,
    email: currentUser?.email || '',
    amount: total * 100,
    publicKey: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY,
    metadata: {
      custom_fields: [
        { display_name: 'PurchaseType', variable_name: 'purchase_type', value: 'ride_booking' },
        { display_name: 'BookingID', variable_name: 'booking_id', value: pendingBooking.id },
      ],
      purchase_type: 'ride_booking',
      booking_id: pendingBooking.id,
    },
  } : null;

  return (
    <div className="fixed inset-0 bg-black/50 z-[55] flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-md max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-white flex justify-between items-center p-4 border-b border-gray-100 z-10">
          <p className="text-sm font-bold text-gray-900">Book Your Ride</p>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-full transition"><X size={18} /></button>
        </div>
        <div className="p-5">
          <div className="flex items-center gap-3 mb-5">
            {(r.images || [])[0] && (
              <img src={r.images[0]} alt={r.title} className="w-14 h-14 rounded-xl object-cover" />
            )}
            <div>
              <p className="text-sm font-bold text-gray-900">{r.title}</p>
              <p className="text-xs text-gray-400">{r.agencyName}</p>
            </div>
          </div>

          {r.priceType === 'both' && (
            <div className="grid grid-cols-2 gap-2 mb-4">
              <button
                onClick={() => setBookingMode('trip')}
                className={`py-2.5 rounded-lg text-xs font-bold border-2 transition ${bookingMode === 'trip' ? 'border-cyan-500 bg-cyan-50 text-cyan-700' : 'border-gray-200 text-gray-500'}`}
              >
                Per Trip · ₦{Number(r.pricePerTrip || 0).toLocaleString()}
              </button>
              <button
                onClick={() => setBookingMode('hour')}
                className={`py-2.5 rounded-lg text-xs font-bold border-2 transition ${bookingMode === 'hour' ? 'border-cyan-500 bg-cyan-50 text-cyan-700' : 'border-gray-200 text-gray-500'}`}
              >
                Per Hour · ₦{Number(r.pricePerHour || 0).toLocaleString()}/hr
              </button>
            </div>
          )}

          <label className="block text-xs font-bold text-gray-600 mb-1">Contact Phone Number *</label>
          <input
            type="tel"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder="+234 800 000 0000"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mb-4"
          />

          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Trip Date & Time</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">Date</label>
              <input type="date" value={tripDate} min={todayStr} onChange={e => setTripDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">{bookingMode === 'hour' ? 'Start Time' : 'Pickup Time'}</label>
              <input type="time" value={tripTime} onChange={e => setTripTime(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            </div>
          </div>

          {bookingMode === 'hour' && (
            <div className="mt-3">
              <label className="block text-xs font-bold text-gray-600 mb-1">Duration (hours) — min. {minHours}</label>
              <input type="number" min={minHours} value={hours} onChange={e => setHours(Number(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              {hours > 0 && hours < minHours && (
                <p className="text-xs text-red-500 mt-1">This vehicle requires at least {minHours} hour{minHours === 1 ? '' : 's'}.</p>
              )}
            </div>
          )}

          {subtotal > 0 && (
            <div className="mt-4 bg-gray-50 rounded-xl p-4 space-y-2">
              <div className="flex justify-between text-sm text-gray-600">
                <span>{bookingMode === 'trip' ? 'Trip fare' : `₦${Number(r.pricePerHour || 0).toLocaleString()} × ${hours} hour${hours === 1 ? '' : 's'}`}</span>
                <span>₦{subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>Service fee</span>
                <span>₦{platformFee.toLocaleString()}</span>
              </div>
              <div className="border-t border-gray-200 pt-2 flex justify-between text-sm font-bold text-gray-900">
                <span>Total</span>
                <span className="text-cyan-600">₦{total.toLocaleString()}</span>
              </div>
            </div>
          )}

          {subtotal > 0 && (
            <p className="text-xs text-blue-700 bg-blue-50 rounded-lg p-3 mt-3">
              Your payment is held securely until your trip is confirmed. Driver details are shared once your booking is paid for.
            </p>
          )}

          {!pendingBooking ? (
            <button
              onClick={handleCreateBooking}
              disabled={!canProceed || creating}
              className="mt-5 w-full text-center text-sm font-bold text-white bg-cyan-500 px-4 py-3 rounded-xl hover:bg-cyan-600 transition disabled:opacity-50"
            >
              {creating ? 'Preparing...' : canProceed ? `Continue to pay ₦${total.toLocaleString()}` : 'Select date & time to continue'}
            </button>
          ) : (
            <PaystackButton
              {...paystackConfig}
              text={`Pay ₦${total.toLocaleString()}`}
              onSuccess={() => {
                alert('Payment received! Your booking is being confirmed.');
                onClose();
              }}
              onClose={() => setPendingBooking(null)}
              className="mt-5 w-full text-center text-sm font-bold text-white bg-cyan-500 px-4 py-3 rounded-xl hover:bg-cyan-600 transition"
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default function RentARidePage() {
  // ✅ NEW — same slug+id extraction as ShortletsPage.jsx's equivalent.
  const { id: urlId } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [vehicles, setVehicles] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savedEvents, setSavedEvents] = useState([]);
  const [search, setSearch] = useState('');
  const [city, setCity] = useState('All Cities');
  const [vehicleType, setVehicleType] = useState('All Types');
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const [selectedRide, setSelectedRide] = useState(null);
  const [lightboxUrl, setLightboxUrl] = useState(null);
  const [bookingRide, setBookingRide] = useState(null);

  // ✅ NEW — same "avoid ugly raw ID in the link" fix as
  // ShortletsPage.jsx's equivalent, for both shared AND regular
  // browsing links.
  const slugify = (str) => (str || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

  // ✅ NEW — same real deep-linking fix as ShortletsPage.jsx's
  // equivalent. Opening a listing updates the URL to a real, shareable
  // link without changing the existing modal-based browsing at all.
  const openRide = (v) => {
    setSelectedRide(v);
    navigate(`/rent-a-ride/${slugify(v.title)}-${v.id}`);
  };
  const closeRide = () => {
    setSelectedRide(null);
    navigate('/rent-a-ride');
  };

  useEffect(() => { loadVehicles(); }, []);
  useEffect(() => { if (currentUser) loadSaved(); }, [currentUser]);
  useEffect(() => { applyFilters(); }, [vehicles, search, city, vehicleType]);

  // ✅ CHANGED — same shareCode-based lookup fix as ShortletsPage.jsx's
  // equivalent.
  useEffect(() => {
    if (!urlId) { setSelectedRide(null); return; }
    const shareCode = urlId.includes('-') ? urlId.split('-').pop() : urlId;
    const alreadyLoaded = vehicles.find(v => v.shareCode === shareCode);
    if (alreadyLoaded) {
      setSelectedRide(alreadyLoaded);
      return;
    }
    (async () => {
      try {
        const snap = await getDocs(query(collection(db, 'rides'), where('shareCode', '==', shareCode)));
        if (!snap.empty) {
          const docSnap = snap.docs[0];
          setSelectedRide({ id: docSnap.id, ...docSnap.data() });
        }
      } catch (err) {
        console.error('Error fetching shared ride:', err);
      }
    })();
  }, [urlId, vehicles]);

  // ✅ FIXED — was querying `vehicles` (empty, unused) plus flattening
  // approved Ride Provider businesses' pricingTiers. Now queries `rides`
  // directly, filtered to available == true. There's no separate
  // per-vehicle status — the trust gate is the agency itself (already
  // approved at registration), same model as shortlets/.
  const loadVehicles = async () => {
    try {
      const snap = await getDocs(query(
        collection(db, 'rides'),
        where('available', '==', true)
      ));
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (a.title || '').localeCompare(b.title || ''));
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
        v.agencyName?.toLowerCase().includes(q) ||
        v.city?.toLowerCase().includes(q)
      );
    }
    if (city !== 'All Cities') result = result.filter(v => v.city === city);
    if (vehicleType !== 'All Types') result = result.filter(v => v.vehicleType === vehicleType);
    setFiltered(result);
    setPage(1);
  };

  const resetFilters = () => {
    setSearch(''); setCity('All Cities'); setVehicleType('All Types'); setPage(1);
  };

  const totalPages = Math.ceil(filtered.length / VEHICLES_PER_PAGE);
  const paginated = filtered.slice((page - 1) * VEHICLES_PER_PAGE, page * VEHICLES_PER_PAGE);
  const activeFilterCount = [city !== 'All Cities', vehicleType !== 'All Types'].filter(Boolean).length;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="bg-white border-b border-gray-100 py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">Rent A Ride</h1>
          <p className="text-gray-500">Verified vehicles, listed by ride agencies near you</p>

          <div className="mt-6 flex gap-3">
            <div className="flex-1 relative">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by vehicle, provider, or city..."
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
                const price = priceLabel(v);
                return (
                  <div key={v.id} className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 group flex flex-col">
                    <div className="relative h-48 overflow-hidden flex-shrink-0">
                      <img
                        src={(v.images || [])[0] || 'https://images.unsplash.com/photo-1502877338535-766e1452684a?w=400&h=300&fit=crop'}
                        alt={v.title}
                        onClick={() => openRide(v)}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 cursor-pointer"
                      />
                      {currentUser && (
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
                        <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-white text-gray-800">
                          {price}
                        </span>
                      </div>
                    </div>
                    <div className="p-4 flex flex-col flex-1">
                      <h3
                        onClick={() => openRide(v)}
                        className="font-bold text-gray-900 text-sm mb-2 line-clamp-2 cursor-pointer hover:text-cyan-600 transition"
                      >
                        {v.title}
                      </h3>
                      <div className="space-y-1.5 mt-auto">
                        {v.capacity != null && (
                          <div className="flex items-center gap-1.5 text-xs text-gray-500">
                            <Users size={12} className="text-cyan-400 flex-shrink-0" />
                            <span>{v.capacity} seats</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                          <MapPin size={12} className="text-cyan-400 flex-shrink-0" />
                          <span className="line-clamp-1">{v.city || 'Lagos'}</span>
                        </div>
                        <p className="text-xs text-gray-400 line-clamp-1">{v.agencyName}</p>
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
          onClose={() => closeRide()}
          onZoom={(url) => setLightboxUrl(url)}
          onBook={(ride) => { setBookingRide(ride); setSelectedRide(null); }}
        />
      )}
      {bookingRide && (
        <RideBookingModal
          ride={bookingRide}
          onClose={() => setBookingRide(null)}
        />
      )}
      {lightboxUrl && <ImageLightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />}
    </div>
  );
}