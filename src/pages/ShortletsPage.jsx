import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, serverTimestamp, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { PaystackButton } from 'react-paystack';
import {
  Search, SlidersHorizontal, X, MapPin,
  ChevronLeft, ChevronRight, Users, Home as HomeIcon,
  LogIn, LogOut,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const CITIES = ['All Cities', 'Lagos', 'Abuja', 'Ibadan', 'Port Harcourt', 'Others'];
const GUEST_OPTIONS = ['Any', '1-2', '3-4', '5+'];
const SHORTLETS_PER_PAGE = 12;

// Same platform fee as paystack-webhook.js's PLATFORM_FEE_PERCENTAGE and
// shortlet_booking_screen.dart's _kPlatformFeeRate — kept in sync across
// all three so what the guest sees matches what the webhook computes.
const PLATFORM_FEE_RATE = 0.10;

// ✅ CHANGED — listings now live in their own `shortlets` collection
// (one doc per property, owned by an agency via `agencyId`), not as
// businessType: 'Shortlet' business docs. An agency (e.g. Success Homes)
// registers once through OSB (now including a Bank Account + Government
// ID step), gets approved once, then adds as many individual property
// listings as they want from their dashboard.

// ✅ NEW — location was previously a precomputed field set at load time
// (`[area, city].join(', ')`); now that the loader just spreads the raw
// doc, this small helper does the same join wherever a location string
// is needed instead.
function locationLabel(s) {
  return [s.area, s.city].filter(Boolean).join(', ') || s.city || '';
}

// Mirrors _kCancellationInfo in shortlet_detail_screen.dart (Flutter)
// exactly, so guests see the same refund breakdown on both platforms.
const CANCELLATION_INFO = {
  flexible: {
    label: 'Flexible',
    description: '48hrs+ before check-in → 100% refund\n24–48hrs before → 50% refund\nLess than 24hrs → no refund',
  },
  moderate: {
    label: 'Moderate',
    description: '7 days+ before check-in → 100% refund\n3–7 days before → 50% refund\nLess than 3 days → no refund',
  },
  strict: {
    label: 'Strict',
    description: '14 days+ before check-in → 100% refund\nNo refund after that',
  },
};

// ✅ NEW — same lightbox pattern as RentARidePage.jsx
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

// ✅ NEW — replaces the broken /event/:id route entirely. Shows every
// field the 7-step listing form collects that was previously invisible
// anywhere on web: house rules, check-in/out times, cancellation policy
// with its real refund breakdown, landmark, and video. Full address is
// deliberately never rendered here — only the landmark hint — same
// "reveal after payment" pattern as Ride's driver contact info.
//
// Video plays inline via a plain HTML5 <video> tag — no extra package
// needed on web, unlike the Flutter side which needed a dedicated
// player screen using video_player.
function ShortletDetailModal({ shortlet: s, onClose, onZoom, onBook }) {
  const allAmenities = [...(s.amenities || []), ...(s.customAmenities || [])];
  const allHouseRules = [...(s.houseRules || []), ...(s.customHouseRules || [])];
  const cancellation = CANCELLATION_INFO[s.cancellationPolicy] || CANCELLATION_INFO.flexible;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-white flex justify-end p-3 border-b border-gray-100 z-10">
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-full transition"><X size={18} /></button>
        </div>
        <div className="p-5">
          {(s.images || []).length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-2 mb-4 -mx-1 px-1">
              {s.images.map((url, i) => (
                <div key={i} className="h-44 w-64 flex-shrink-0 bg-amber-50 rounded-2xl overflow-hidden cursor-zoom-in" onClick={() => onZoom(url)}>
                  <img src={url} alt={s.title} className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          )}

          <p className="text-lg font-black text-gray-900">{s.title}</p>
          {s.agencyName && <p className="text-sm text-gray-400 mt-1">by {s.agencyName}</p>}

          <div className="flex flex-wrap gap-2 mt-3">
            {s.propertyType && <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700">{s.propertyType}</span>}
            {s.bedrooms != null && <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-gray-50 text-gray-600">{s.bedrooms} bed{s.bedrooms === 1 ? '' : 's'}</span>}
            {s.bathrooms != null && <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-gray-50 text-gray-600">{s.bathrooms} bath{s.bathrooms === 1 ? '' : 's'}</span>}
            {s.maxGuests != null && <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-gray-50 text-gray-600">up to {s.maxGuests} guests</span>}
            {s.minNights > 1 && <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-gray-50 text-gray-600">min. {s.minNights} nights</span>}
            {locationLabel(s) && <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-gray-50 text-gray-600 flex items-center gap-1"><MapPin size={10} /> {locationLabel(s)}</span>}
          </div>

          <p className="text-xl font-black text-amber-600 mt-4">
            ₦{Number(s.pricePerNight || 0).toLocaleString()}<span className="text-sm font-medium text-gray-400">/night</span>
          </p>

          {s.description && <p className="text-sm text-gray-600 mt-3">{s.description}</p>}

          {/* ✅ FIXED — videoUrl was collected but had no way to be
              watched anywhere on web. Plays inline, no extra package. */}
          {s.videoUrl && (
            <div className="mt-4 rounded-2xl overflow-hidden bg-black">
              <video src={s.videoUrl} controls className="w-full max-h-64" />
            </div>
          )}

          {allAmenities.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Amenities</p>
              <div className="flex flex-wrap gap-2">
                {allAmenities.map(a => (
                  <span key={a} className="text-xs px-2.5 py-1 rounded-full bg-gray-50 text-gray-600">{a}</span>
                ))}
              </div>
            </div>
          )}

          {/* ✅ FIXED — house rules + check-in/out times were collected
              but never shown anywhere on either platform until now. */}
          {(allHouseRules.length > 0 || s.checkInTime || s.checkOutTime) && (
            <div className="mt-4">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">House Rules</p>
              {allHouseRules.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {allHouseRules.map(r => (
                    <span key={r} className="text-xs px-2.5 py-1 rounded-full bg-gray-50 text-gray-600">{r}</span>
                  ))}
                </div>
              )}
              {(s.checkInTime || s.checkOutTime) && (
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  {s.checkInTime && <span className="flex items-center gap-1"><LogIn size={12} /> Check-in: {s.checkInTime}</span>}
                  {s.checkOutTime && <span className="flex items-center gap-1"><LogOut size={12} /> Check-out: {s.checkOutTime}</span>}
                </div>
              )}
            </div>
          )}

          {/* ✅ FIXED — cancellation policy was chosen at listing time
              but a guest could never actually see what they were
              agreeing to before booking. */}
          <div className="mt-4">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Cancellation Policy</p>
            <div className="bg-gray-50 rounded-xl p-3.5">
              <p className="text-sm font-bold text-gray-900">{cancellation.label}</p>
              <p className="text-xs text-gray-600 mt-1.5 whitespace-pre-line leading-relaxed">{cancellation.description}</p>
            </div>
          </div>

          {/* ✅ FIXED — landmark was collected but never shown. Full
              address stays hidden until booked, same as before. */}
          {(s.landmark || s.mapsLink) && (
            <div className="mt-4 bg-gray-50 rounded-xl p-3.5">
              <p className="text-sm font-bold text-gray-900 flex items-center gap-1.5"><MapPin size={14} /> Location</p>
              {s.landmark && <p className="text-xs text-gray-600 mt-1.5">{s.landmark}</p>}
              <p className="text-xs text-gray-400 mt-1">Full address shared after booking</p>
            </div>
          )}

          {/* ✅ FIXED — was a placeholder alert(). Opens the real
              booking modal now. */}
          <button
            onClick={() => onBook(s)}
            className="mt-5 block w-full text-center text-sm font-bold text-white bg-amber-500 px-4 py-3 rounded-xl hover:bg-amber-600 transition"
          >
            Book Now
          </button>
        </div>
      </div>
    </div>
  );
}

// ✅ NEW — the actual booking flow. Date range (respecting minNights),
// live price breakdown, creates the pending bookings/ doc, then hands
// off to PaystackButton — same purchase_type: 'shortlet_booking' /
// booking_id metadata shape paystack-webhook.js's branch already expects
// (matches shortlet_booking_screen.dart's mobile flow exactly, just
// using react-paystack's client-side popup instead of the server-
// initialize + native-popup two-step mobile needs).
function ShortletBookingModal({ shortlet: s, onClose }) {
  const { currentUser } = useAuth();
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [creating, setCreating] = useState(false);
  const [pendingBooking, setPendingBooking] = useState(null); // { id, reference } once created, ready for PaystackButton
  // ✅ NEW — same fix as the mobile booking screens: the booking doc
  // previously only ever captured guestEmail, leaving the agency with no
  // reliable way to reach the guest.
  const [phone, setPhone] = useState('');

  const minNights = s.minNights || 1;
  const nights = (checkIn && checkOut) ? Math.round((new Date(checkOut) - new Date(checkIn)) / 86400000) : 0;
  const subtotal = nights > 0 ? nights * (s.pricePerNight || 0) : 0;
  const platformFee = Math.round(subtotal * PLATFORM_FEE_RATE);
  const total = subtotal + platformFee;
  const canProceed = checkIn && checkOut && nights >= minNights && phone.trim().length >= 7;

  const todayStr = new Date().toISOString().split('T')[0];
  const minCheckOut = checkIn
    ? new Date(new Date(checkIn).getTime() + minNights * 86400000).toISOString().split('T')[0]
    : todayStr;

  const handleCreateBooking = async () => {
    if (!currentUser) {
      alert('Please log in to book.');
      return;
    }
    if (!canProceed) return;
    setCreating(true);
    try {
      // ✅ Pending booking doc — same shape as shortlet_booking_screen.dart's
      // (mobile), same trust model: paymentStatus/escrowStatus start
      // exactly where the bookings/ Firestore create rule requires, and
      // only paystack-webhook.js can move them from there.
      const bookingRef = await addDoc(collection(db, 'bookings'), {
        type: 'shortlet',
        listingId: s.id,
        agencyId: s.agencyId || null,
        agencyName: s.agencyName || null,
        guestId: currentUser.uid,
        guestEmail: currentUser.email || '',
        guestName: currentUser.displayName || '',
        guestPhone: phone.trim(),
        listingTitle: s.title,
        listingImage: (s.images || [])[0] || null,
        checkInDate: new Date(checkIn),
        checkOutDate: new Date(checkOut),
        nights,
        pricePerNight: s.pricePerNight || 0,
        subtotal,
        platformFee,
        // ✅ FIXED — same double-counting bug as the mobile booking
        // screens. Owner receives the full subtotal; the platform fee is
        // what the guest pays on top, not a cut taken from the owner.
        ownerPayout: subtotal,
        amount: total,
        paymentStatus: 'pending',
        escrowStatus: 'none',
        confirmationStatus: 'pending',
        createdAt: serverTimestamp(),
      });
      const reference = `SHORTLET-${bookingRef.id}-${Date.now()}`;
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
        { display_name: 'PurchaseType', variable_name: 'purchase_type', value: 'shortlet_booking' },
        { display_name: 'BookingID', variable_name: 'booking_id', value: pendingBooking.id },
      ],
      purchase_type: 'shortlet_booking',
      booking_id: pendingBooking.id,
    },
  } : null;

  return (
    <div className="fixed inset-0 bg-black/50 z-[55] flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-md max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-white flex justify-between items-center p-4 border-b border-gray-100 z-10">
          <p className="text-sm font-bold text-gray-900">Book Your Stay</p>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-full transition"><X size={18} /></button>
        </div>
        <div className="p-5">
          <div className="flex items-center gap-3 mb-5">
            {(s.images || [])[0] && (
              <img src={s.images[0]} alt={s.title} className="w-14 h-14 rounded-xl object-cover" />
            )}
            <div>
              <p className="text-sm font-bold text-gray-900">{s.title}</p>
              <p className="text-xs text-amber-600 font-bold">₦{Number(s.pricePerNight || 0).toLocaleString()}/night</p>
            </div>
          </div>

          <label className="block text-xs font-bold text-gray-600 mb-1">Contact Phone Number *</label>
          <input
            type="tel"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder="+234 800 000 0000"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mb-4"
          />

          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Select your dates</p>
          <p className="text-xs text-gray-400 mb-3">Minimum stay: {minNights} night{minNights === 1 ? '' : 's'}</p>
          <div className="grid grid-cols-2 gap-3 mb-2">
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">Check-in</label>
              <input
                type="date"
                value={checkIn}
                min={todayStr}
                onChange={e => {
                  setCheckIn(e.target.value);
                  // push checkout out automatically if it's now invalid,
                  // same auto-adjust behavior as the mobile screen
                  if (checkOut && new Date(checkOut) < new Date(new Date(e.target.value).getTime() + minNights * 86400000)) {
                    setCheckOut('');
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">Check-out</label>
              <input
                type="date"
                value={checkOut}
                min={minCheckOut}
                disabled={!checkIn}
                onChange={e => setCheckOut(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:bg-gray-50"
              />
            </div>
          </div>
          {checkIn && checkOut && nights < minNights && (
            <p className="text-xs text-red-500 mb-2">This property requires at least {minNights} night{minNights === 1 ? '' : 's'}.</p>
          )}

          {nights > 0 && (
            <div className="mt-4 bg-gray-50 rounded-xl p-4 space-y-2">
              <div className="flex justify-between text-sm text-gray-600">
                <span>₦{Number(s.pricePerNight || 0).toLocaleString()} × {nights} night{nights === 1 ? '' : 's'}</span>
                <span>₦{subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>Service fee</span>
                <span>₦{platformFee.toLocaleString()}</span>
              </div>
              <div className="border-t border-gray-200 pt-2 flex justify-between text-sm font-bold text-gray-900">
                <span>Total</span>
                <span className="text-amber-600">₦{total.toLocaleString()}</span>
              </div>
            </div>
          )}

          {nights > 0 && (
            <p className="text-xs text-amber-700 bg-amber-50 rounded-lg p-3 mt-3">
              Your payment is held securely until you confirm check-in. The full address is shared once payment is confirmed.
            </p>
          )}

          {!pendingBooking ? (
            <button
              onClick={handleCreateBooking}
              disabled={!canProceed || creating}
              className="mt-5 w-full text-center text-sm font-bold text-white bg-amber-500 px-4 py-3 rounded-xl hover:bg-amber-600 transition disabled:opacity-50"
            >
              {creating ? 'Preparing...' : nights > 0 ? `Continue to pay ₦${total.toLocaleString()}` : 'Select dates to continue'}
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
              className="mt-5 w-full text-center text-sm font-bold text-white bg-amber-500 px-4 py-3 rounded-xl hover:bg-amber-600 transition"
            />
          )}
        </div>
      </div>
    </div>
  );
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
  const [shortlets, setShortlets] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [city, setCity] = useState('All Cities');
  const [guests, setGuests] = useState('Any');
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const [selectedShortlet, setSelectedShortlet] = useState(null);
  const [lightboxUrl, setLightboxUrl] = useState(null);
  const [bookingShortlet, setBookingShortlet] = useState(null);

  useEffect(() => { loadShortlets(); }, []);
  useEffect(() => { applyFilters(); }, [shortlets, search, city, guests]);

  const loadShortlets = async () => {
    try {
      const snap = await getDocs(
        query(collection(db, 'shortlets'), where('available', '==', true))
      );
      const all = snap.docs.map(d => {
        const l = d.data();
        // ✅ FIXED — was hand-picking a subset of fields (missing
        // houseRules, cancellationPolicy, checkInTime/checkOutTime,
        // landmark, videoUrl entirely — none of them could ever reach
        // the detail view no matter what the detail view did). Now
        // spreads the whole raw doc, same pattern as RentARidePage.jsx's
        // ride loader — nothing gets left behind as the schema grows.
        return { id: d.id, ...l };
      }).sort((a, b) => (a.title || '').localeCompare(b.title || ''));
      setShortlets(all);
    } catch (err) {
      console.error('Error loading shortlets:', err);
    }
    setLoading(false);
  };

  const applyFilters = () => {
    let result = [...shortlets];
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(s =>
        s.title?.toLowerCase().includes(q) ||
        locationLabel(s).toLowerCase().includes(q) ||
        s.agencyName?.toLowerCase().includes(q)
      );
    }
    if (city !== 'All Cities') result = result.filter(s => s.city === city || locationLabel(s).includes(city));
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
                const statLine = [
                  s.propertyType || null,
                  s.bedrooms != null ? `${s.bedrooms} bed` : null,
                  s.bathrooms != null ? `${s.bathrooms} bath` : null,
                  s.maxGuests != null ? `${s.maxGuests} guests` : null,
                ].filter(Boolean).join(' · ');
                return (
                  <div key={s.id} className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 group flex flex-col">
                    <div className="relative h-48 overflow-hidden flex-shrink-0">
                      {/* ✅ FIXED — was <Link to={`/event/${s.id}`}>, which
                          routed to a page that queries the `events`
                          collection — Shortlet listings live in their own
                          `shortlets` collection, so this almost certainly
                          404'd or rendered nothing for every listing.
                          Now opens the real detail modal below instead. */}
                      <button onClick={() => setSelectedShortlet(s)} className="block w-full h-full">
                        <img
                          src={s.images[0] || 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=400&h=300&fit=crop'}
                          alt={s.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </button>
                      {/* ✅ REMOVED — heart/save button, per request. */}
                      <div className="absolute bottom-3 left-3">
                        {/* ✅ FIXED — was ₦{s.price}{priceSuffix(s.priceType)}.
                            Every listing is per-night now. */}
                        <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-white text-gray-800">
                          ₦{Number(s.pricePerNight || 0).toLocaleString()}/night
                        </span>
                      </div>
                    </div>
                    <div className="p-4 flex flex-col flex-1">
                      <button onClick={() => setSelectedShortlet(s)} className="text-left">
                        <h3 className="font-bold text-gray-900 text-sm mb-1 line-clamp-2 hover:text-amber-600 transition">
                          {s.title}
                        </h3>
                      </button>
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
                          <span className="line-clamp-1">{locationLabel(s) || 'Lagos'}</span>
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

      {selectedShortlet && (
        <ShortletDetailModal
          shortlet={selectedShortlet}
          onClose={() => setSelectedShortlet(null)}
          onZoom={(url) => setLightboxUrl(url)}
          onBook={(shortlet) => { setBookingShortlet(shortlet); setSelectedShortlet(null); }}
        />
      )}
      {bookingShortlet && (
        <ShortletBookingModal
          shortlet={bookingShortlet}
          onClose={() => setBookingShortlet(null)}
        />
      )}
      {lightboxUrl && <ImageLightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />}
    </div>
  );
}