import React, { useState, useEffect, useRef } from 'react';
import { PaystackButton } from 'react-paystack';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { collection, query, where, getDocs, doc, updateDoc, addDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import OSBSidebar from '../../components/OSBSidebar';
import SwitchingOverlay from '../../components/SwitchingOverlay';
import {
  Store, Clock, Tag, CheckCircle2, Clock as ClockIcon, XCircle, Inbox, MapPin,
  Upload, Plus, Trash2, LayoutDashboard, User, ClipboardList, MessageSquare,
  Ticket, Star, Wallet, Settings, Tent, FileCheck, Menu, BadgeCheck, Lock,
  Car, CalendarCheck, Phone,
} from 'lucide-react';

const HOURLY_TYPES = ['DJ', 'MC', 'Musician', 'Photographer'];
const MAX_ITEMS = 10;
// Fallback list — businessCategory alone isn't reliable on older docs
// saved before that field existed, so this infers from businessType instead.
const SERVICE_PROVIDER_TYPE_VALUES = [
  'Event Hall', 'DJ', 'MC', 'Caterer', 'Decorator', 'Photographer', 'Musician',
  'Furniture Rental', 'Ride Provider', 'Security',
  'Restaurant', 'Livestock Seller', 'Gift Vendor', 'Food Stuffs Seller',
  'Baker', 'Beverages Seller', 'Other Service',
];
const NIGERIAN_STATES = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue',
  'Borno', 'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu',
  'FCT (Abuja)', 'Gombe', 'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina',
  'Kebbi', 'Kogi', 'Kwara', 'Lagos', 'Nasarawa', 'Niger', 'Ogun', 'Ondo',
  'Osun', 'Oyo', 'Plateau', 'Rivers', 'Sokoto', 'Taraba', 'Yobe', 'Zamfara',
  'Others',
];

const SERVICE_PROVIDER_NAV = [
  { key: 'overview', label: 'Overview', icon: LayoutDashboard },
  { key: 'profile', label: 'My Profile & Services', icon: User },
  { key: 'requests', label: 'Requests', icon: ClipboardList },
  { key: 'offers', label: 'Open Offers', icon: Inbox },
  { key: 'quotes', label: 'My Quotes', icon: MessageSquare },
  { key: 'events', label: 'My Events', icon: Ticket, comingSoon: true },
  { key: 'reviews', label: 'Reviews', icon: Star, comingSoon: true },
  { key: 'earnings', label: 'Earnings', icon: Wallet, comingSoon: true },
  { key: 'verification', label: 'Verification', icon: FileCheck },
  { key: 'settings', label: 'Settings', icon: Settings },
];

const EVENT_VENDOR_NAV = [
  { key: 'overview', label: 'Overview', icon: LayoutDashboard },
  { key: 'shop', label: 'Shop Profile', icon: Store },
  { key: 'findstands', label: 'Find Stands', icon: Tent },
  { key: 'applications', label: 'My Applications', icon: FileCheck },
  { key: 'active', label: 'Active Stands', icon: CheckCircle2 },
  { key: 'reviews', label: 'Reviews', icon: Star, comingSoon: true },
  { key: 'transactions', label: 'Transactions', icon: Wallet },
  { key: 'verification', label: 'Verification', icon: BadgeCheck },
  { key: 'settings', label: 'Settings', icon: Settings },
];

// Shortlet is registered as businessCategory: 'Service Provider'
// (same as DJ/Caterer/Baker), so without its own nav it would silently fall
// into SERVICE_PROVIDER_NAV — Requests/Open Offers/My Quotes, a
// marketplace-quote flow that makes no sense for a shortlet agency.
// "My Listings" replaces that with the actual job: adding and managing
// individual properties. Verification/Settings are unchanged from the
// generic business-level sections already built for every business type.
const SHORTLET_NAV = [
  { key: 'overview', label: 'Overview', icon: LayoutDashboard },
  { key: 'listings', label: 'My Listings', icon: MapPin },
  // ✅ NEW — owner had zero way to see incoming bookings anywhere on
  // web until now, same gap just closed on the Flutter side
  // (osb_bookings_screen.dart).
  { key: 'bookings', label: 'Bookings', icon: CalendarCheck },
  { key: 'verification', label: 'Verification', icon: FileCheck },
  { key: 'settings', label: 'Settings', icon: Settings },
];

// ✅ NEW — Ride Provider gets the same treatment Shortlet already has:
// without its own nav it would silently fall into SERVICE_PROVIDER_NAV
// (Requests/Open Offers/My Quotes), the exact wrong marketplace-quote
// flow flagged as a bug earlier. "My Vehicles" replaces that with the
// actual job here: adding vehicles and tracking each one's verification
// status. Unlike Shortlet, there's no separate per-listing "available"
// toggle exposed as the primary action — availability is gated by
// admin-controlled `status` first (see the three-state pill in the
// listings section below), matching osb_ride_manage_screen.dart on mobile.
const RIDE_NAV = [
  { key: 'overview', label: 'Overview', icon: LayoutDashboard },
  { key: 'vehicles', label: 'My Vehicles', icon: Car },
  // ✅ NEW — same addition as SHORTLET_NAV above. Matters even more here
  // since this is also where a Ride agency assigns a driver to a paid
  // booking.
  { key: 'bookings', label: 'Bookings', icon: CalendarCheck },
  { key: 'verification', label: 'Verification', icon: FileCheck },
  { key: 'settings', label: 'Settings', icon: Settings },
];

// fixed checklist, matching osb_shortlet_manage_screen.dart on
// mobile exactly, so a listing added on one platform shows identical
// amenities on the other.
const SHORTLET_AMENITIES = [
  'WiFi', 'AC', 'Kitchen', 'Washing Machine', 'Netflix/TV', 'Generator',
  'Parking', 'Security', 'Swimming Pool', 'Gym',
];

// ✅ NEW — matches the mobile form's property-type chips exactly, so a
// listing created here shows the same value there and vice versa.
const SHORTLET_PROPERTY_TYPES = [
  'Studio', '1 Bedroom', '2 Bedroom', '3 Bedroom', 'Self Contain', 'Duplex', 'Villa',
];

// ✅ NEW — matches osb_ride_manage_screen.dart's constants exactly, so a
// vehicle added on one platform shows identically on the other.
const RIDE_VEHICLE_TYPES = ['Car', 'SUV', 'Bus (mini)', 'Bus (full)', 'Van', 'Jet'];
const RIDE_FEATURES = ['AC', 'Music system', 'Clean interior', 'Luggage space', 'Reclining seats', 'USB charging', 'WiFi'];
const RIDE_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const RIDE_INSURANCE_STATUSES = ['Fully insured', 'Third-party only', 'Not insured'];

const EMPTY_RIDE_FORM = {
  title: '', vehicleType: 'Car', year: '', capacity: '', color: '',
  images: [], videoUrl: null,
  description: '', features: [],
  priceType: 'trip', pricePerTrip: '', pricePerHour: '', minHours: '',
  city: '', customCity: '', areasCovered: '', availableDays: [], availableStartTime: '', availableEndTime: '',
  plateNumber: '', insuranceStatus: RIDE_INSURANCE_STATUSES[0],
  available: true,
};

// ✅ FIXED — priceType removed. The mobile form (osb_shortlet_manage_screen.dart)
// no longer writes priceType/price at all — every listing is priced per
// night via a single pricePerNight field, since that's all the spec
// calls for. This form previously wrote the old fields; left as-is, any
// listing created HERE (on web) would show ₦0 on both browse screens
// (ShortletsPage.jsx, shortlets_screen.dart) now that they read
// pricePerNight instead. propertyType added to match the mobile form's
// Step 1 field, which this web form didn't have at all before.
//
// ⚠️ STILL MISSING relative to the mobile form's full 7-step spec:
// minNights, houseRules/checkInTime/checkOutTime, cancellationPolicy,
// fullAddress (separate hidden field)/landmark, and video upload. This
// patch only fixes the pricing field mismatch so nothing breaks — full
// parity with the mobile form's other new fields is a separate,
// larger follow-up for this web form specifically.
const EMPTY_LISTING_FORM = {
  title: '', propertyType: '', description: '', images: [], videoUrl: null,
  pricePerNight: '',
  bedrooms: '', bathrooms: '', maxGuests: '',
  amenities: [], city: '', customCity: '', area: '',
  mapsLink: '', whatsappNumber: '', available: true,
};

// ✅ NEW — video upload, mirroring uploadToCloudinary below but posting
// to Cloudinary's /video/upload endpoint (no compression step — that's
// an image-only concern). Used for the Ride vehicle walkthrough video;
// no equivalent existed on web before since this modal had no video
// upload UI at all until now.
const uploadVideoToCloudinary = async (file, folder) => {
  const data = new FormData();
  data.append('file', file);
  data.append('upload_preset', import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET);
  data.append('folder', folder);
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', 'https://api.cloudinary.com/v1_1/' + import.meta.env.VITE_CLOUDINARY_CLOUD_NAME + '/video/upload');
    xhr.onload = function () {
      if (xhr.status === 200) resolve(JSON.parse(xhr.responseText).secure_url);
      else reject(new Error('Video upload failed: ' + xhr.statusText));
    };
    xhr.onerror = function () { reject(new Error('Video upload failed')); };
    xhr.send(data);
  });
};

const uploadToCloudinary = async (file, folder, onProgress) => {
  const data = new FormData();
  data.append('file', file);
  data.append('upload_preset', import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET);
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', 'https://api.cloudinary.com/v1_1/' + import.meta.env.VITE_CLOUDINARY_CLOUD_NAME + '/image/upload');
    xhr.upload.onprogress = function (e) { if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100)); };
    xhr.onload = function () {
      if (xhr.status === 200) resolve(JSON.parse(xhr.responseText).secure_url);
      else reject(new Error('Upload failed: ' + xhr.statusText));
    };
    xhr.onerror = function () { reject(new Error('Upload failed')); };
    xhr.send(data);
  });
};

const compressImage = async (file, maxWidth, quality) => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = function () {
      const scale = Math.min(1, maxWidth / img.width);
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      canvas.toBlob(function (blob) { resolve(new File([blob], file.name, { type: 'image/jpeg' })); }, 'image/jpeg', quality);
    };
    img.src = url;
  });
};

function ImageUploadSlot({ imageUrl, onUploaded, folder }) {
  const [uploading, setUploading] = useState(false);
  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file || !file.type.startsWith('image/')) return;
    setUploading(true);
    try {
      const compressed = await compressImage(file, 800, 0.85);
      const url = await uploadToCloudinary(compressed, folder, () => {});
      onUploaded(url);
    } catch (err) { console.error(err); }
    setUploading(false);
  };
  return imageUrl ? (
    <div className="relative">
      <img src={imageUrl} alt="" className="w-16 h-16 rounded-lg object-cover border border-gray-200" />
      <button type="button" onClick={() => onUploaded('')} className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">×</button>
    </div>
  ) : (
    <label className="w-16 h-16 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:border-cyan-400 transition flex-shrink-0">
      {uploading ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-cyan-500" /> : <Upload size={16} className="text-gray-400" />}
      <input type="file" accept="image/*" onChange={handleFile} disabled={uploading} className="sr-only" />
    </label>
  );
}

// multi-image uploader for Shortlet listing galleries / Ride vehicle
// galleries. ImageUploadSlot above only replaces a single image; a
// listing needs several photos, so this appends to an array instead and
// renders one removable thumbnail per image plus a trailing add-slot.
function GalleryUploadRow({ images, onChange, folder }) {
  const [uploading, setUploading] = useState(false);
  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file || !file.type.startsWith('image/')) return;
    setUploading(true);
    try {
      const compressed = await compressImage(file, 1000, 0.85);
      const url = await uploadToCloudinary(compressed, folder, () => {});
      onChange([...images, url]);
    } catch (err) { console.error(err); }
    setUploading(false);
    e.target.value = '';
  };
  return (
    <div className="flex flex-wrap gap-2">
      {images.map((url, i) => (
        <div key={i} className="relative">
          <img src={url} alt="" className="w-16 h-16 rounded-lg object-cover border border-gray-200" />
          <button type="button" onClick={() => onChange(images.filter((_, idx) => idx !== i))}
            className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">×</button>
        </div>
      ))}
      <label className="w-16 h-16 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:border-cyan-400 transition flex-shrink-0">
        {uploading ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-cyan-500" /> : <Upload size={16} className="text-gray-400" />}
        <input type="file" accept="image/*" onChange={handleFile} disabled={uploading} className="sr-only" />
      </label>
    </div>
  );
}

// ✅ NEW — single walkthrough-video upload box, shared by both Shortlet
// (Max 2 min/50MB) and Ride (Max 1 min/30MB) — maxBytes is a prop so
// each caller enforces its own spec limit rather than one hardcoded
// value silently applying to both.
const RIDE_MAX_VIDEO_BYTES = 30 * 1024 * 1024;

function VideoUploadBox({ url, onChange, folder, maxBytes = RIDE_MAX_VIDEO_BYTES }) {
  const [uploading, setUploading] = useState(false);
  const maxMb = Math.round(maxBytes / (1024 * 1024));
  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file || !file.type.startsWith('video/')) return;
    if (file.size > maxBytes) {
      alert(`Video must be under ${maxMb}MB. Please choose a shorter or lower-quality clip.`);
      e.target.value = '';
      return;
    }
    setUploading(true);
    try {
      const uploadedUrl = await uploadVideoToCloudinary(file, folder);
      onChange(uploadedUrl);
    } catch (err) {
      console.error(err);
      alert('Video upload failed. Please try again.');
    }
    setUploading(false);
    e.target.value = '';
  };
  return (
    <label className="block w-full border-2 border-dashed border-cyan-300 rounded-2xl py-6 px-4 text-center cursor-pointer hover:border-cyan-400 transition">
      {uploading ? (
        <div className="flex flex-col items-center gap-2">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-cyan-500" />
          <span className="text-xs text-gray-500">Uploading...</span>
        </div>
      ) : url ? (
        <div className="flex flex-col items-center gap-2">
          <CheckCircle2 size={22} className="text-emerald-500" />
          <span className="text-xs font-bold text-emerald-600">Video added</span>
          <button type="button" onClick={(e) => { e.preventDefault(); onChange(null); }} className="text-xs text-red-500 hover:text-red-600 font-medium">Remove</button>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-1.5">
          <Upload size={22} className="text-gray-400" />
          <span className="text-xs font-bold text-cyan-600">Upload video</span>
        </div>
      )}
      <input type="file" accept="video/*" onChange={handleFile} disabled={uploading} className="sr-only" />
    </label>
  );
}

function ComingSoon({ label }) {
  return (
    <div className="bg-white rounded-3xl border-2 border-gray-100 p-10 text-center">
      <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
        <Star size={22} className="text-gray-300" />
      </div>
      <h3 className="font-bold text-gray-800 mb-1">{label} — Coming Soon</h3>
      <p className="text-sm text-gray-400">This isn't built yet. Nothing to see here for now.</p>
    </div>
  );
}

// small status label for a single verification document
function VerifyStatusPill({ status }) {
  const config = {
    pending: { label: 'Under Review', color: 'bg-amber-100 text-amber-700' },
    approved: { label: 'Approved', color: 'bg-emerald-100 text-emerald-700' },
    rejected: { label: 'Rejected', color: 'bg-red-100 text-red-600' },
  }[status] || { label: 'Not Uploaded', color: 'bg-gray-100 text-gray-500' };
  return <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${config.color}`}>{config.label}</span>;
}

// ✅ NEW — three-state pill for a ride listing, matching
// osb_ride_manage_screen.dart's mobile equivalent exactly: pending
// admin review, approved+live, approved+hidden, or rejected (with a
// reason shown underneath if admin left one). Owner never controls this
// directly — it only ever reflects what AdminRideVerification.jsx set.
// ✅ SIMPLIFIED — no more three-state verification pill. Drivers aren't
// attached to a vehicle at all anymore (picked per booking, not tied to
// a listing), so there's no per-vehicle admin review left to reflect —
// a ride listing now behaves exactly like a Shortlet listing: just
// Available or Hidden, owner-controlled, no admin gate.
function RideAvailabilityPill({ available }) {
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${
      available ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
    }`}>
      {available ? <CheckCircle2 size={11} /> : <ClockIcon size={11} />}
      {available ? 'Available' : 'Hidden'}
    </span>
  );
}

function StatCard({ label, value, icon: Icon }) {
  return (
    <div className="bg-white rounded-2xl border-2 border-gray-100 p-5">
      <div className="flex items-center gap-2 mb-2">
        <Icon size={16} className="text-cyan-500" />
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</p>
      </div>
      <p className="text-2xl font-black text-gray-900">{value}</p>
    </div>
  );
}

export default function OSBDashboard() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { currentUser } = useAuth();

  const [businesses, setBusinesses] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [switchingBusiness, setSwitchingBusiness] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('overview');

  const [pricingTiers, setPricingTiers] = useState([]);
  const [hourlyPackages, setHourlyPackages] = useState([]);
  const [savingPricing, setSavingPricing] = useState(false);

  // Direct requests (targeted at this business — Accept/Decline)
  const [directRequests, setDirectRequests] = useState([]);
  const [loadingDirect, setLoadingDirect] = useState(false);
  const [respondingId, setRespondingId] = useState('');

  // Open offers (browsable — submit a quote)
  const [openOffers, setOpenOffers] = useState([]);
  const [loadingOffers, setLoadingOffers] = useState(false);
  const [quotingOfferId, setQuotingOfferId] = useState('');
  const [quoteForm, setQuoteForm] = useState({ price: '', message: '' });

  // My quotes (submitted by this business)
  const [myQuotes, setMyQuotes] = useState([]);
  const [loadingQuotes, setLoadingQuotes] = useState(false);

  const [standEvents, setStandEvents] = useState([]);
  const [loadingStandEvents, setLoadingStandEvents] = useState(false);

  const [myApplications, setMyApplications] = useState([]);
  const [loadingApplications, setLoadingApplications] = useState(false);

  const [settingsForm, setSettingsForm] = useState(null);
  const [savingSettings, setSavingSettings] = useState(false);

  // Shortlet "My Listings"
  const [shortletListings, setShortletListings] = useState([]);
  const [loadingListings, setLoadingListings] = useState(false);
  const [listingModalOpen, setListingModalOpen] = useState(false);
  const [editingListingId, setEditingListingId] = useState(null);
  const [listingForm, setListingForm] = useState(EMPTY_LISTING_FORM);
  const [savingListing, setSavingListing] = useState(false);

  // ✅ NEW — Ride Provider "My Vehicles", mirroring the Shortlet state
  // shape immediately above.
  const [rideListings, setRideListings] = useState([]);
  const [loadingRides, setLoadingRides] = useState(false);
  const [rideModalOpen, setRideModalOpen] = useState(false);
  const [editingRideId, setEditingRideId] = useState(null);
  const [rideForm, setRideForm] = useState(EMPTY_RIDE_FORM);
  const [savingRide, setSavingRide] = useState(false);

  // ✅ NEW — Bookings, shared by both Shortlet and Ride agencies. Same
  // owner-side visibility gap closed here as osb_bookings_screen.dart on
  // mobile — an owner previously had zero way to see a booking for their
  // own listing anywhere on web.
  const [bookings, setBookings] = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [assigningDriverFor, setAssigningDriverFor] = useState(null); // booking id currently being assigned
  const [driverNameInput, setDriverNameInput] = useState('');
  const [driverPhoneInput, setDriverPhoneInput] = useState('');

  useEffect(() => {
    if (!currentUser) { navigate('/login'); return; }
    loadBusinesses();
  }, [currentUser]);

  const loadBusinesses = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(query(collection(db, 'businesses'), where('ownerId', '==', currentUser.uid)));
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setBusinesses(list);
      if (list.length > 0) {
        // honor ?business={id} from the URL (set when navigating here
        // from the Navbar's account dropdown) — previously this always
        // defaulted to list[0], ignoring which business was actually clicked.
        const requestedId = searchParams.get('business');
        const target = (requestedId && list.some(b => b.id === requestedId)) ? requestedId : list[0].id;
        // first arrival now plays the same "Switching to..." overlay
        // as any later switch, instead of skipping it. Safe this time because
        // `loading` stays true (see onDone below) until the switch actually
        // completes — the dashboard never gets a chance to render with no
        // business selected yet, which is what caused the earlier crash.
        selectBusiness(target, list, false, () => setLoading(false));
      } else {
        setLoading(false);
      }
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  const switchTimeoutRef = useRef(null);

  const selectBusiness = (id, list = businesses, immediate = false, onDone = null) => {
    const b = list.find(x => x.id === id);
    if (!b) { if (onDone) onDone(); return; }

    // Cancel any switch already in flight. Without this, clicking a
    // second business before the first one's 900ms transition finishes let
    // both timeouts fire — the earlier one could overwrite the later one's
    // selection after the fact, making the switch look like it "didn't work."
    if (switchTimeoutRef.current) {
      clearTimeout(switchTimeoutRef.current);
      switchTimeoutRef.current = null;
    }

    const applySwitch = () => {
      setSelectedId(id);
      setActiveSection('overview');
      setPricingTiers(b?.pricingTiers || []);
      setHourlyPackages(b?.hourlyPackages || []);
      setSettingsForm(b ? {
        businessName: b.businessName || '', description: b.description || '',
        city: b.city || '', area: b.area || '', whatsappNumber: b.whatsappNumber || '',
        pricingInfo: b.pricingInfo || '', logoUrl: b.logoUrl || '',
      } : null);
    };

    if (immediate) {
      applySwitch();
      if (onDone) onDone();
      return;
    }

    setSwitchingBusiness(b);
    switchTimeoutRef.current = setTimeout(() => {
      applySwitch();
      setSwitchingBusiness(null);
      switchTimeoutRef.current = null;
      if (onDone) onDone();
    }, 900);
  };

  const selectedBusiness = businesses.find(b => b.id === selectedId);
  const isServiceProvider = selectedBusiness?.businessCategory === 'Service Provider' ||
    (!selectedBusiness?.businessCategory && SERVICE_PROVIDER_TYPE_VALUES.includes(selectedBusiness?.businessType));
  // Shortlet carries businessCategory: 'Service Provider' too, so
  // it needs its own check ahead of the generic marketplace nav/loaders.
  const isShortletAgency = selectedBusiness?.businessType === 'Shortlet';
  // ✅ NEW — same reasoning as isShortletAgency above: Ride Provider ALSO
  // carries businessCategory: 'Service Provider' (it lives in the same
  // type grid as DJ/Caterer/Baker), so it needs its own check ahead of
  // the generic marketplace nav/loaders too, or it silently falls into
  // the wrong Requests/Open Offers/My Quotes flow.
  const isRideAgency = selectedBusiness?.businessType === 'Ride Provider';
  const isEventVendor = selectedBusiness && !isServiceProvider && !isShortletAgency && !isRideAgency;
  const isHourly = selectedBusiness && HOURLY_TYPES.includes(selectedBusiness.businessType);
  const NAV_ITEMS = isShortletAgency ? SHORTLET_NAV
    : isRideAgency ? RIDE_NAV
    : isServiceProvider ? SERVICE_PROVIDER_NAV
    : EVENT_VENDOR_NAV;

  useEffect(() => {
    if (selectedBusiness && selectedBusiness.status === 'approved' && isServiceProvider && !isShortletAgency && !isRideAgency) {
      loadDirectRequests(selectedBusiness);
      loadOpenOffers(selectedBusiness);
      loadMyQuotes(selectedBusiness);
    } else {
      setDirectRequests([]); setOpenOffers([]); setMyQuotes([]);
    }
    // listings load whenever the selected business is a Shortlet
    // agency, independent of the approval-gated loaders above (an owner
    // can start adding listings the moment they're approved, same as
    // every other business type gets to use its own dashboard).
    if (selectedBusiness && selectedBusiness.status === 'approved' && isShortletAgency) {
      loadShortletListings(selectedBusiness);
    } else {
      setShortletListings([]);
    }
    // Same pattern as Shortlet: vehicles load once the AGENCY is
    // approved. No per-vehicle status to distinguish anymore — vehicles
    // go live immediately, same as Shortlet listings.
    if (selectedBusiness && selectedBusiness.status === 'approved' && isRideAgency) {
      loadRideListings(selectedBusiness);
    } else {
      setRideListings([]);
    }
  }, [selectedId, businesses]);

  const loadDirectRequests = async (business) => {
    setLoadingDirect(true);
    try {
      const snap = await getDocs(query(
        collection(db, 'serviceRequests'),
        where('requestType', '==', 'direct'),
        where('targetBusinessId', '==', business.id)
      ));
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setDirectRequests(list);
    } catch (err) {
      console.error(err);
    }
    setLoadingDirect(false);
  };

  const respondToDirectRequest = async (requestId, decision) => {
    setRespondingId(requestId);
    try {
      await updateDoc(doc(db, 'serviceRequests', requestId), { status: decision });
      setDirectRequests(prev => prev.map(r => r.id === requestId ? { ...r, status: decision } : r));
    } catch (err) {
      console.error(err);
      alert('Failed to respond to request. Please try again.');
    }
    setRespondingId('');
  };

  const loadOpenOffers = async (business) => {
    setLoadingOffers(true);
    try {
      const snap = await getDocs(query(
        collection(db, 'serviceRequests'),
        where('requestType', '==', 'open'),
        where('category', '==', business.businessType),
        where('status', '==', 'open')
      ));
      const now = new Date();
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        .filter(r => !business.city || !r.city || r.city === business.city)
        .filter(r => !r.deadline || new Date(r.deadline) >= now);
      setOpenOffers(list);
    } catch (err) {
      console.error(err);
    }
    setLoadingOffers(false);
  };

  const submitQuote = async (offer) => {
    if (!quoteForm.price) { alert('Please enter your quoted price'); return; }
    setQuotingOfferId(offer.id + '_submitting');
    try {
      await addDoc(collection(db, 'serviceQuotes'), {
        requestId: offer.id,
        eventPlanId: offer.eventPlanId,
        plannerUserId: offer.plannerUserId,
        plannerEmail: offer.plannerEmail || null,
        businessId: selectedBusiness.id,
        businessName: selectedBusiness.businessName,
        category: offer.category,
        eventName: offer.eventName,
        city: offer.city,
        quotedPrice: Number(quoteForm.price),
        message: quoteForm.message.trim() || null,
        status: 'pending',
        createdAt: serverTimestamp(),
      });
      setQuotingOfferId('');
      setQuoteForm({ price: '', message: '' });
      loadMyQuotes(selectedBusiness);
      alert('Quote submitted! You can track its status under My Quotes.');
    } catch (err) {
      console.error(err);
      alert('Failed to submit quote. Please try again.');
    }
    setQuotingOfferId('');
  };

  const loadMyQuotes = async (business) => {
    setLoadingQuotes(true);
    try {
      const snap = await getDocs(query(collection(db, 'serviceQuotes'), where('businessId', '==', business.id)));
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setMyQuotes(list);
    } catch (err) {
      console.error(err);
    }
    setLoadingQuotes(false);
  };

  // ─── Shortlet "My Listings" ─────────────────────────────────────────
  // Listings live in a top-level `shortlets` collection (one doc per
  // property), keyed by agencyId back to this business doc — not a field
  // on the business itself. Mirrors osb_shortlet_manage_screen.dart on
  // mobile: agency approved once, then adds unlimited listings, each
  // going live instantly (no per-property admin approval).
  const loadShortletListings = async (business) => {
    setLoadingListings(true);
    try {
      const snap = await getDocs(query(collection(db, 'shortlets'), where('agencyId', '==', business.id)));
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setShortletListings(list);
    } catch (err) {
      console.error(err);
    }
    setLoadingListings(false);
  };

  const openAddListing = () => {
    setEditingListingId(null);
    setListingForm(EMPTY_LISTING_FORM);
    setListingModalOpen(true);
  };

  const openEditListing = (listing) => {
    setEditingListingId(listing.id);
    const knownCity = NIGERIAN_STATES.includes(listing.city);
    setListingForm({
      title: listing.title || '', propertyType: listing.propertyType || '', description: listing.description || '', images: listing.images || [],
      videoUrl: listing.videoUrl || null,
      // ✅ FIXED — was priceType/price/minHours. Reads pricePerNight now;
      // a listing saved before this change (still on the old schema)
      // will show an empty price field here until re-saved.
      pricePerNight: listing.pricePerNight ?? '',
      bedrooms: listing.bedrooms ?? '', bathrooms: listing.bathrooms ?? '', maxGuests: listing.maxGuests ?? '',
      amenities: listing.amenities || [],
      city: knownCity ? listing.city : (listing.city ? 'Others' : ''),
      customCity: knownCity ? '' : (listing.city || ''),
      area: listing.area || '', mapsLink: listing.mapsLink || '',
      whatsappNumber: listing.whatsappNumber || '', available: listing.available !== false,
    });
    setListingModalOpen(true);
  };

  const closeListingModal = () => { setListingModalOpen(false); setEditingListingId(null); };

  const toggleListingAmenity = (a) => {
    setListingForm(p => ({
      ...p,
      amenities: p.amenities.includes(a) ? p.amenities.filter(x => x !== a) : [...p.amenities, a],
    }));
  };

  // ✅ FIXED — checks pricePerNight !== '' instead of the removed price field.
  const listingFormValid = listingForm.title.trim() && listingForm.description.trim().length >= 20 &&
    listingForm.pricePerNight !== '' && listingForm.city && listingForm.whatsappNumber.trim() && listingForm.images.length >= 2;

  const saveListing = async () => {
    if (!selectedBusiness || !listingFormValid) return;
    setSavingListing(true);
    try {
      const resolvedCity = listingForm.city === 'Others' ? (listingForm.customCity || '').trim() : listingForm.city;
      const payload = {
        agencyId: selectedBusiness.id,
        agencyName: selectedBusiness.businessName,
        ownerId: currentUser.uid,
        title: listingForm.title.trim(),
        propertyType: listingForm.propertyType || null,
        description: listingForm.description.trim(),
        images: listingForm.images,
        videoUrl: listingForm.videoUrl,
        // ✅ FIXED — was priceType/price/minHours. Single pricePerNight
        // field now, matching the mobile form's rebuilt schema exactly.
        pricePerNight: Number(listingForm.pricePerNight) || 0,
        bedrooms: listingForm.bedrooms !== '' ? Number(listingForm.bedrooms) : null,
        bathrooms: listingForm.bathrooms !== '' ? Number(listingForm.bathrooms) : null,
        maxGuests: listingForm.maxGuests !== '' ? Number(listingForm.maxGuests) : null,
        amenities: listingForm.amenities,
        city: resolvedCity,
        area: listingForm.area.trim() || null,
        mapsLink: listingForm.mapsLink.trim() || null,
        whatsappNumber: listingForm.whatsappNumber.trim(),
        available: listingForm.available,
      };

      if (editingListingId) {
        await updateDoc(doc(db, 'shortlets', editingListingId), payload);
        setShortletListings(prev => prev.map(l => l.id === editingListingId ? { ...l, ...payload } : l));
      } else {
        const docRef = await addDoc(collection(db, 'shortlets'), { ...payload, createdAt: serverTimestamp() });
        setShortletListings(prev => [{ id: docRef.id, ...payload }, ...prev]);
      }
      closeListingModal();
    } catch (err) {
      console.error(err);
      alert('Failed to save listing. Please try again.');
    }
    setSavingListing(false);
  };

  const toggleListingAvailable = async (listing) => {
    const newValue = !(listing.available !== false);
    try {
      await updateDoc(doc(db, 'shortlets', listing.id), { available: newValue });
      setShortletListings(prev => prev.map(l => l.id === listing.id ? { ...l, available: newValue } : l));
    } catch (err) {
      console.error(err);
    }
  };

  const deleteListing = async (listing) => {
    if (!window.confirm(`Delete "${listing.title}"? This can't be undone.`)) return;
    try {
      await deleteDoc(doc(db, 'shortlets', listing.id));
      setShortletListings(prev => prev.filter(l => l.id !== listing.id));
    } catch (err) {
      console.error(err);
      alert('Failed to delete listing. Please try again.');
    }
  };

  // ─── Ride Provider "My Vehicles" ─────────────────────────────────────
  // ✅ SIMPLIFIED — behaves exactly like the Shortlet listings block
  // immediately above now: agency approved once, then every vehicle
  // added goes live instantly, no per-vehicle admin review. Earlier
  // drafts forced a new vehicle into status: 'pending_verification' /
  // available: false pending a driver's-license check — that gate was
  // removed since drivers aren't attached to a vehicle listing at all
  // anymore (assigned per booking instead, see bookings/ in
  // firestore.rules), and OutingStation's actual liability boundary is
  // the agency itself, not each individual driver.
  const loadRideListings = async (business) => {
    setLoadingRides(true);
    try {
      const snap = await getDocs(query(collection(db, 'rides'), where('agencyId', '==', business.id)));
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setRideListings(list);
    } catch (err) {
      console.error(err);
    }
    setLoadingRides(false);
  };

  const openAddRide = () => {
    setEditingRideId(null);
    setRideForm(EMPTY_RIDE_FORM);
    setRideModalOpen(true);
  };

  const openEditRide = (ride) => {
    setEditingRideId(ride.id);
    const knownCity = NIGERIAN_STATES.includes(ride.city);
    setRideForm({
      title: ride.title || '', vehicleType: ride.vehicleType || 'Car', year: ride.year ?? '', capacity: ride.capacity ?? '', color: ride.color || '',
      images: ride.images || [], videoUrl: ride.videoUrl || null,
      description: ride.description || '', features: ride.features || [],
      priceType: ride.priceType || 'trip',
      pricePerTrip: ride.pricePerTrip ?? '', pricePerHour: ride.pricePerHour ?? '', minHours: ride.minHours ?? '',
      city: knownCity ? ride.city : (ride.city ? 'Others' : ''),
      customCity: knownCity ? '' : (ride.city || ''),
      areasCovered: ride.areasCovered || '', availableDays: ride.availableDays || [],
      availableStartTime: ride.availableStartTime || '', availableEndTime: ride.availableEndTime || '',
      plateNumber: ride.plateNumber || '', insuranceStatus: ride.insuranceStatus || RIDE_INSURANCE_STATUSES[0],
      available: ride.available !== false,
    });
    setRideModalOpen(true);
  };

  const closeRideModal = () => { setRideModalOpen(false); setEditingRideId(null); };

  const toggleRideFeature = (f) => {
    setRideForm(p => ({
      ...p,
      features: p.features.includes(f) ? p.features.filter(x => x !== f) : [...p.features, f],
    }));
  };

  const toggleRideDay = (d) => {
    setRideForm(p => ({
      ...p,
      availableDays: p.availableDays.includes(d) ? p.availableDays.filter(x => x !== d) : [...p.availableDays, d],
    }));
  };

  const rideFormValid = rideForm.title.trim() &&
    rideForm.description.trim().length >= 20 &&
    rideForm.capacity !== '' &&
    (rideForm.priceType !== 'trip' || rideForm.pricePerTrip !== '') &&
    (rideForm.priceType !== 'hour' || rideForm.pricePerHour !== '') &&
    (rideForm.priceType !== 'both' || (rideForm.pricePerTrip !== '' && rideForm.pricePerHour !== '')) &&
    rideForm.city &&
    rideForm.images.length >= 3 &&
    rideForm.plateNumber.trim();

  const saveRide = async () => {
    if (!selectedBusiness || !rideFormValid) return;
    setSavingRide(true);
    try {
      const resolvedCity = rideForm.city === 'Others' ? (rideForm.customCity || '').trim() : rideForm.city;
      const payload = {
        agencyId: selectedBusiness.id,
        agencyName: selectedBusiness.businessName,
        ownerId: currentUser.uid,
        title: rideForm.title.trim(),
        vehicleType: rideForm.vehicleType,
        year: rideForm.year !== '' ? Number(rideForm.year) : null,
        capacity: Number(rideForm.capacity) || 0,
        color: rideForm.color.trim() || null,
        images: rideForm.images,
        videoUrl: rideForm.videoUrl,
        description: rideForm.description.trim(),
        features: rideForm.features,
        priceType: rideForm.priceType,
        pricePerTrip: (rideForm.priceType === 'trip' || rideForm.priceType === 'both') ? (Number(rideForm.pricePerTrip) || 0) : null,
        pricePerHour: (rideForm.priceType === 'hour' || rideForm.priceType === 'both') ? (Number(rideForm.pricePerHour) || 0) : null,
        minHours: (rideForm.priceType === 'hour' || rideForm.priceType === 'both') && rideForm.minHours !== '' ? Number(rideForm.minHours) : null,
        city: resolvedCity,
        areasCovered: rideForm.areasCovered.trim() || null,
        availableDays: rideForm.availableDays,
        availableStartTime: rideForm.availableStartTime.trim() || null,
        availableEndTime: rideForm.availableEndTime.trim() || null,
        plateNumber: rideForm.plateNumber.trim(),
        insuranceStatus: rideForm.insuranceStatus,
        available: rideForm.available,
      };

      // ✅ SIMPLIFIED — no more forced status: 'pending_verification' /
      // available: false on create. Drivers aren't tied to a vehicle
      // listing at all anymore (assigned per booking instead — see
      // bookings/ in firestore.rules), so there's no per-vehicle admin
      // check left to gate on. A new vehicle now goes live the moment
      // it's saved, exactly like a Shortlet listing.
      if (editingRideId) {
        await updateDoc(doc(db, 'rides', editingRideId), payload);
        setRideListings(prev => prev.map(r => r.id === editingRideId ? { ...r, ...payload } : r));
      } else {
        const docRef = await addDoc(collection(db, 'rides'), {
          ...payload,
          createdAt: serverTimestamp(),
        });
        setRideListings(prev => [{ id: docRef.id, ...payload }, ...prev]);
      }
      closeRideModal();
    } catch (err) {
      console.error(err);
      alert('Failed to save vehicle. Please try again.');
    }
    setSavingRide(false);
  };

  const deleteRide = async (ride) => {
    if (!window.confirm(`Delete "${ride.title}"? This can't be undone.`)) return;
    try {
      await deleteDoc(doc(db, 'rides', ride.id));
      setRideListings(prev => prev.filter(r => r.id !== ride.id));
    } catch (err) {
      console.error(err);
      alert('Failed to delete vehicle. Please try again.');
    }
  };

  useEffect(() => {
    if (selectedBusiness && selectedBusiness.status === 'approved' && isEventVendor && activeSection === 'findstands') {
      loadStandEvents();
    }
  }, [selectedId, activeSection]);

  // ✅ NEW — mirrors the pattern immediately above. Fires whenever the
  // Bookings tab is opened for an approved Shortlet or Ride agency.
  useEffect(() => {
    if (selectedBusiness && selectedBusiness.status === 'approved' && (isShortletAgency || isRideAgency) && activeSection === 'bookings') {
      loadBookings();
    }
  }, [selectedId, activeSection]);

  const loadBookings = async () => {
    setLoadingBookings(true);
    try {
      const snap = await getDocs(query(collection(db, 'bookings'), where('agencyId', '==', selectedBusiness.id)));
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        // paid bookings first — the ones that actually matter day to day
        .sort((a, b) => (a.paymentStatus === 'paid' ? 0 : 1) - (b.paymentStatus === 'paid' ? 0 : 1));
      setBookings(list);
    } catch (err) {
      console.error(err);
    }
    setLoadingBookings(false);
  };

  // ✅ Matches the bookings/ Firestore rule's agency-driver-assignment
  // clause exactly: only these three fields, verified via the business
  // doc's ownerId — same as osb_bookings_screen.dart's _assignDriver on
  // mobile.
  const saveDriverAssignment = async (bookingId) => {
    if (!driverNameInput.trim() || !driverPhoneInput.trim()) {
      alert('Please enter both driver name and phone.');
      return;
    }
    try {
      await updateDoc(doc(db, 'bookings', bookingId), {
        assignedDriverName: driverNameInput.trim(),
        assignedDriverPhone: driverPhoneInput.trim(),
        driverAssignedAt: serverTimestamp(),
      });
      const updatedBooking = bookings.find(b => b.id === bookingId);
      setBookings(prev => prev.map(b => b.id === bookingId
        ? { ...b, assignedDriverName: driverNameInput.trim(), assignedDriverPhone: driverPhoneInput.trim() }
        : b));
      setAssigningDriverFor(null);

      // ✅ NEW — same "actually tell the guest" fix as
      // osb_bookings_screen.dart's mobile equivalent. Fire-and-forget.
      // ✅ FIXED — was calling the now-removed
      // /api/notify-driver-assigned (merged into /api/notify to stay
      // under Vercel's 12-function Hobby limit). No naming collision.
      if (updatedBooking?.guestEmail) {
        fetch('https://www.outingstation.com/api/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'driver_assigned',
            guestEmail: updatedBooking.guestEmail,
            listingTitle: updatedBooking.listingTitle,
            driverName: driverNameInput.trim(),
            driverPhone: driverPhoneInput.trim(),
          }),
        }).catch(err => console.error('notify (driver_assigned) failed:', err));
      }

      setDriverNameInput('');
      setDriverPhoneInput('');
    } catch (err) {
      console.error(err);
      alert('Failed to assign driver. Please try again.');
    }
  };

  const loadStandEvents = async () => {
    setLoadingStandEvents(true);
    try {
      const snap = await getDocs(query(collection(db, 'events'), where('vendorStandsEnabled', '==', true)));
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        .filter(e => (e.vendorStands || []).some(s => (s.filled || 0) < s.quantityAvailable));
      setStandEvents(list);
    } catch (err) {
      console.error(err);
    }
    setLoadingStandEvents(false);
  };

  useEffect(() => {
    if (currentUser && isEventVendor) {
      loadMyApplications();
    }
  }, [currentUser, selectedId]);

  const loadMyApplications = async () => {
    setLoadingApplications(true);
    try {
      const snap = await getDocs(query(collection(db, 'standApplications'), where('buyerEmail', '==', currentUser.email)));
      setMyApplications(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error(err);
    }
    setLoadingApplications(false);
  };

  const addTier = () => { if (pricingTiers.length < MAX_ITEMS) setPricingTiers(p => [...p, { id: `tier_${Date.now()}`, name: '', price: '', description: '', image: '' }]); };
  const updateTier = (id, field, value) => setPricingTiers(p => p.map(t => t.id === id ? { ...t, [field]: value } : t));
  const removeTier = (id) => setPricingTiers(p => p.filter(t => t.id !== id));
  const addPackage = () => { if (hourlyPackages.length < MAX_ITEMS) setHourlyPackages(p => [...p, { id: `pkg_${Date.now()}`, hours: '', price: '', description: '' }]); };
  const updatePackage = (id, field, value) => setHourlyPackages(p => p.map(x => x.id === id ? { ...x, [field]: value } : x));
  const removePackage = (id) => setHourlyPackages(p => p.filter(x => x.id !== id));

  const handleSavePricing = async () => {
    if (!selectedBusiness) return;
    setSavingPricing(true);
    try {
      const updateData = isHourly
        ? { hourlyPackages: hourlyPackages.map(p => ({ ...p, hours: Number(p.hours) || 0, price: Number(p.price) || 0 })) }
        : { pricingTiers: pricingTiers.map(t => ({ ...t, price: Number(t.price) || 0 })) };
      await updateDoc(doc(db, 'businesses', selectedBusiness.id), updateData);
      setBusinesses(prev => prev.map(b => b.id === selectedBusiness.id ? { ...b, ...updateData } : b));
    } catch (err) {
      console.error(err);
      alert('Failed to save pricing.');
    }
    setSavingPricing(false);
  };

  // submits a Gov ID or CAC upload for review. Always writes
  // status:'pending' — matches the Firestore rule exactly, which only
  // lets the owner submit as pending, never self-approve.
  const submitVerificationDoc = async (type, url) => {
    if (!selectedBusiness) return;
    const field = type === 'gov' ? 'govIdUrl' : 'cacUrl';
    const statusField = type === 'gov' ? 'govIdStatus' : 'cacStatus';
    try {
      await updateDoc(doc(db, 'businesses', selectedBusiness.id), {
        [field]: url,
        [statusField]: 'pending',
      });
      setBusinesses(prev => prev.map(b => b.id === selectedBusiness.id ? { ...b, [field]: url, [statusField]: 'pending' } : b));
    } catch (err) {
      console.error('Error submitting verification doc:', err);
      alert('Failed to submit. Please try again.');
    }
  };

  const handleSaveSettings = async () => {
    if (!selectedBusiness || !settingsForm) return;
    setSavingSettings(true);
    try {
      // Resolve "Others" to the actual typed state, and don't persist
      // the temporary customCity field itself
      const { customCity, ...formToSave } = settingsForm;
      const resolvedCity = settingsForm.city === 'Others' ? (customCity || '').trim() : settingsForm.city;
      const payload = { ...formToSave, city: resolvedCity };

      await updateDoc(doc(db, 'businesses', selectedBusiness.id), payload);
      setBusinesses(prev => prev.map(b => b.id === selectedBusiness.id ? { ...b, ...payload } : b));
    } catch (err) {
      console.error(err);
      alert('Failed to save settings.');
    }
    setSavingSettings(false);
  };

  if (loading) {
    if (switchingBusiness) {
      return (
        <SwitchingOverlay
          business={switchingBusiness}
          category={
            switchingBusiness?.businessCategory === 'Service Provider' || SERVICE_PROVIDER_TYPE_VALUES.includes(switchingBusiness?.businessType)
              ? 'Service Provider'
              : 'Event Vendor'
          }
        />
      );
    }
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-cyan-500" />
      </div>
    );
  }

  if (businesses.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-lg mx-auto px-4 text-center">
          <div className="w-16 h-16 bg-cyan-50 rounded-2xl flex items-center justify-center mx-auto mb-4"><Store size={28} className="text-cyan-500" /></div>
          <h1 className="text-xl font-black text-gray-900 mb-2">No Business Registered Yet</h1>
          <p className="text-sm text-gray-500 mb-6">List your business to start managing pricing and receiving bookings.</p>
          <button onClick={() => navigate('/business/register')} className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white px-6 py-3 rounded-2xl font-bold hover:shadow-lg transition">List Your Business</button>
          <button onClick={() => navigate('/')} className="block mx-auto mt-4 text-sm text-gray-400 hover:text-gray-600 transition">← Back to OutingStation</button>
        </div>
      </div>
    );
  }

  const isPending = selectedBusiness?.status === 'pending';
  const isRejected = selectedBusiness?.status === 'rejected';

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <SwitchingOverlay
        business={switchingBusiness}
        category={
          switchingBusiness?.businessCategory === 'Service Provider' || SERVICE_PROVIDER_TYPE_VALUES.includes(switchingBusiness?.businessType)
            ? 'Service Provider'
            : 'Event Vendor'
        }
      />
      <OSBSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        businesses={businesses}
        selectedId={selectedId}
        onSelectBusiness={(id) => { selectBusiness(id); setSidebarOpen(false); }}
        navItems={NAV_ITEMS}
        activeSection={activeSection}
        onSelectSection={setActiveSection}
        selectedBusiness={selectedBusiness}
        badgeCounts={{
          // Live counts, not stored notifications — these shrink naturally
          // as the business acts on each item, no "mark as read" needed.
          requests: directRequests.filter(r => r.status === 'pending').length,
          offers: openOffers.filter(o => !myQuotes.some(q => q.requestId === o.id)).length,
          applications: myApplications.filter(a => a.organizerApprovalStatus === 'approved' && a.paymentStatus !== 'paid').length,
        }}
      />

      <div className="flex-1 min-w-0 flex flex-col">
        {/* Mobile header */}
        <header className="lg:hidden bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 sticky top-0 z-30">
          <button onClick={() => setSidebarOpen(true)} className="p-2 hover:bg-gray-100 rounded-lg">
            <Menu size={22} />
          </button>
          <span className="font-bold text-gray-900 truncate">{selectedBusiness?.businessName}</span>
        </header>

        <div className="flex-1 max-w-4xl w-full mx-auto px-4 py-8">
          {isPending ? (
            <div className="bg-white rounded-3xl border-2 border-gray-100 p-8 text-center">
              <ClockIcon size={32} className="text-amber-500 mx-auto mb-3" />
              <h2 className="font-bold text-gray-900 mb-1">Awaiting Approval</h2>
              <p className="text-sm text-gray-500">Your dashboard unlocks once "{selectedBusiness?.businessName}" is approved (usually within 24–48 hours).</p>
            </div>
          ) : isRejected ? (
            <div className="bg-white rounded-3xl border-2 border-gray-100 p-8 text-center">
              <XCircle size={32} className="text-red-500 mx-auto mb-3" />
              <h2 className="font-bold text-gray-900 mb-1">This business wasn't approved</h2>
              <p className="text-sm text-gray-500">Contact admin@outingstation.com for details.</p>
            </div>
          ) : (
            <>
              {activeSection === 'overview' && (
                <div className="space-y-4">
                  <h2 className="text-xl font-black text-gray-900">{selectedBusiness?.businessName} — Overview</h2>
                  {isShortletAgency ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      <StatCard label="Listings" value={shortletListings.length} icon={MapPin} />
                      <StatCard label="Available Now" value={shortletListings.filter(l => l.available !== false).length} icon={CheckCircle2} />
                      <StatCard label="Hidden" value={shortletListings.filter(l => l.available === false).length} icon={Clock} />
                    </div>
                  ) : isRideAgency ? (
                    // ✅ SIMPLIFIED — same shape as Shortlet's Overview
                    // stats now, since a ride listing has no verification
                    // stage left to distinguish — just Vehicles/Available/Hidden.
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      <StatCard label="Vehicles" value={rideListings.length} icon={Car} />
                      <StatCard label="Available Now" value={rideListings.filter(r => r.available !== false).length} icon={CheckCircle2} />
                      <StatCard label="Hidden" value={rideListings.filter(r => r.available === false).length} icon={Clock} />
                    </div>
                  ) : isServiceProvider ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      <StatCard label="Pricing Packages" value={isHourly ? hourlyPackages.length : pricingTiers.length} icon={Tag} />
                      <StatCard label="Pending Requests" value={directRequests.filter(r => r.status === 'pending').length} icon={Inbox} />
                      <StatCard label="Open Offers Nearby" value={openOffers.length} icon={ClipboardList} />
                      <StatCard label="My Quotes" value={myQuotes.length} icon={MessageSquare} />
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      <StatCard label="Events With Stands" value={standEvents.length} icon={Tent} />
                      <StatCard label="Applications" value={myApplications.length} icon={FileCheck} />
                      <StatCard label="Active Stands" value={myApplications.filter(a => a.organizerApprovalStatus === 'approved' && a.paymentStatus === 'paid').length} icon={CheckCircle2} />
                    </div>
                  )}
                </div>
              )}

              {activeSection === 'listings' && isShortletAgency && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-gray-800 text-lg">My Listings</h3>
                    <button onClick={openAddListing}
                      className="flex items-center gap-2 bg-gradient-to-r from-cyan-600 to-blue-600 text-white px-4 py-2.5 rounded-2xl font-bold text-sm hover:from-cyan-700 hover:to-blue-700 transition">
                      <Plus size={16} /> Add Listing
                    </button>
                  </div>

                  {loadingListings ? (
                    <p className="text-sm text-gray-400">Loading...</p>
                  ) : shortletListings.length === 0 ? (
                    <div className="bg-white rounded-3xl border-2 border-gray-100 p-10 text-center">
                      <div className="w-14 h-14 bg-cyan-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <MapPin size={22} className="text-cyan-400" />
                      </div>
                      <h4 className="font-bold text-gray-800 mb-1">No listings yet</h4>
                      <p className="text-sm text-gray-400">Add your first shortlet property to start getting bookings.</p>
                    </div>
                  ) : (
                    <div className="grid sm:grid-cols-2 gap-4">
                      {shortletListings.map(listing => {
                        const available = listing.available !== false;
                        return (
                          <div key={listing.id} className="bg-white rounded-2xl border-2 border-gray-100 overflow-hidden">
                            <div className="flex gap-3 p-3">
                              <img
                                src={(listing.images || [])[0] || 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=200&h=200&fit=crop'}
                                alt={listing.title}
                                className="w-20 h-20 rounded-xl object-cover flex-shrink-0"
                              />
                              <div className="flex-1 min-w-0">
                                <p className="font-bold text-gray-900 text-sm truncate">{listing.title}</p>
                                {/* ✅ FIXED — was ₦{price}{priceSuffix}. Single
                                    pricePerNight field now; propertyType shown
                                    alongside since the form now collects it. */}
                                <p className="text-xs text-gray-500 mt-0.5">
                                  ₦{Number(listing.pricePerNight || 0).toLocaleString()}/night
                                  {listing.propertyType ? ` · ${listing.propertyType}` : ''} · {listing.city}
                                </p>
                                <button onClick={() => toggleListingAvailable(listing)}
                                  className={`mt-2 inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${
                                    available ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
                                  }`}>
                                  {available ? <CheckCircle2 size={11} /> : <ClockIcon size={11} />}
                                  {available ? 'Available' : 'Hidden'}
                                </button>
                              </div>
                            </div>
                            <div className="flex border-t border-gray-100">
                              <button onClick={() => openEditListing(listing)}
                                className="flex-1 py-2.5 text-xs font-bold text-cyan-600 hover:bg-cyan-50 transition">Edit</button>
                              <button onClick={() => deleteListing(listing)}
                                className="flex-1 py-2.5 text-xs font-bold text-red-500 hover:bg-red-50 transition border-l border-gray-100">Delete</button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ✅ NEW — "My Vehicles" section, mirroring the Shortlet
                  "My Listings" block above but with the three-state
                  status pill instead of a simple toggle, and the
                  rejection reason surfaced when present. Unlike Shortlet,
                  the owner has no "hide/show" action here at all — that's
                  entirely admin-controlled via `available`. */}
              {activeSection === 'vehicles' && isRideAgency && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-gray-800 text-lg">My Vehicles</h3>
                    <button onClick={openAddRide}
                      className="flex items-center gap-2 bg-gradient-to-r from-cyan-600 to-blue-600 text-white px-4 py-2.5 rounded-2xl font-bold text-sm hover:from-cyan-700 hover:to-blue-700 transition">
                      <Plus size={16} /> Add Vehicle
                    </button>
                  </div>

                  {loadingRides ? (
                    <p className="text-sm text-gray-400">Loading...</p>
                  ) : rideListings.length === 0 ? (
                    <div className="bg-white rounded-3xl border-2 border-gray-100 p-10 text-center">
                      <div className="w-14 h-14 bg-cyan-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <Car size={22} className="text-cyan-400" />
                      </div>
                      <h4 className="font-bold text-gray-800 mb-1">No vehicles yet</h4>
                      <p className="text-sm text-gray-400">Add your first vehicle to start getting bookings. Each one goes through a quick verification before it's bookable.</p>
                    </div>
                  ) : (
                    <div className="grid sm:grid-cols-2 gap-4">
                      {rideListings.map(ride => {
                        const priceLine = ride.priceType === 'both'
                          ? `₦${Number(ride.pricePerTrip || 0).toLocaleString()}/trip · ₦${Number(ride.pricePerHour || 0).toLocaleString()}/hour`
                          : ride.priceType === 'hour'
                          ? `₦${Number(ride.pricePerHour || 0).toLocaleString()}/hour`
                          : `₦${Number(ride.pricePerTrip || 0).toLocaleString()}/trip`;
                        return (
                          <div key={ride.id} className="bg-white rounded-2xl border-2 border-gray-100 overflow-hidden">
                            <div className="flex gap-3 p-3">
                              <img
                                src={(ride.images || [])[0] || 'https://images.unsplash.com/photo-1502877338535-766e1452684a?w=200&h=200&fit=crop'}
                                alt={ride.title}
                                className="w-20 h-20 rounded-xl object-cover flex-shrink-0"
                              />
                              <div className="flex-1 min-w-0">
                                <p className="font-bold text-gray-900 text-sm truncate">{ride.title}</p>
                                <p className="text-xs text-gray-500 mt-0.5">{priceLine} · {ride.city}</p>
                                <div className="mt-2">
                                  <RideAvailabilityPill available={ride.available !== false} />
                                </div>
                              </div>
                            </div>
                            <div className="flex border-t border-gray-100">
                              <button onClick={() => openEditRide(ride)}
                                className="flex-1 py-2.5 text-xs font-bold text-cyan-600 hover:bg-cyan-50 transition">Edit</button>
                              <button onClick={() => deleteRide(ride)}
                                className="flex-1 py-2.5 text-xs font-bold text-red-500 hover:bg-red-50 transition border-l border-gray-100">Delete</button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ✅ NEW — Bookings section, shared by Shortlet and Ride.
                  Same owner-side visibility closed here as
                  osb_bookings_screen.dart on mobile. */}
              {activeSection === 'bookings' && (isShortletAgency || isRideAgency) && (
                <div className="space-y-4">
                  <h3 className="font-bold text-gray-800 text-lg">Bookings</h3>

                  {loadingBookings ? (
                    <p className="text-sm text-gray-400">Loading...</p>
                  ) : bookings.length === 0 ? (
                    <div className="bg-white rounded-3xl border-2 border-gray-100 p-10 text-center">
                      <div className="w-14 h-14 bg-cyan-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <CalendarCheck size={22} className="text-cyan-400" />
                      </div>
                      <h4 className="font-bold text-gray-800 mb-1">No bookings yet</h4>
                      <p className="text-sm text-gray-400">Bookings for your listings will show up here.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {bookings.map(b => {
                        const isPaid = b.paymentStatus === 'paid';
                        const needsDriver = isRideAgency && isPaid && !b.assignedDriverName;
                        const statusConfig = b.disputeStatus === 'reported'
                          ? { label: 'Disputed', color: 'bg-red-100 text-red-600' }
                          : !isPaid
                          ? { label: 'Awaiting Payment', color: 'bg-amber-100 text-amber-700' }
                          : b.confirmationStatus === 'confirmed'
                          ? { label: 'Completed', color: 'bg-emerald-100 text-emerald-700' }
                          : { label: 'Held in Escrow', color: 'bg-blue-100 text-blue-700' };
                        const subtitle = isShortletAgency
                          ? (b.checkInDate && b.checkOutDate
                              ? `${b.checkInDate.toDate().toLocaleDateString()} → ${b.checkOutDate.toDate().toLocaleDateString()}`
                              : 'Dates unavailable')
                          : (b.tripDateTime ? b.tripDateTime.toDate().toLocaleDateString() : 'Trip date unavailable');

                        return (
                          <div key={b.id} className="bg-white rounded-2xl border-2 border-gray-100 p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="font-bold text-gray-900 text-sm truncate">{b.listingTitle}</p>
                                <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>
                                {/* ✅ FIXED — was only ever showing
                                    guestEmail, with no way for an owner
                                    to actually call/WhatsApp the guest. */}
                                <p className="text-xs text-gray-400 mt-0.5">
                                  {[b.guestName, b.guestPhone, b.guestEmail].filter(Boolean).join(' · ')}
                                </p>
                              </div>
                              <span className={`text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0 ${statusConfig.color}`}>{statusConfig.label}</span>
                            </div>

                            <div className="flex items-center gap-4 mt-3 text-xs">
                              <span className="text-gray-500">Guest paid: <strong className="text-gray-700">₦{Number(b.amount || 0).toLocaleString()}</strong></span>
                              <span className="text-cyan-600 font-bold">You get: ₦{Number(b.ownerPayout || 0).toLocaleString()}</span>
                            </div>

                            {isRideAgency && isPaid && (
                              <div className="mt-3 pt-3 border-t border-gray-100">
                                {b.assignedDriverName ? (
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <Phone size={13} className="text-gray-400" />
                                      <span className="text-xs text-gray-700">{b.assignedDriverName} · {b.assignedDriverPhone}</span>
                                    </div>
                                    <button
                                      onClick={() => { setAssigningDriverFor(b.id); setDriverNameInput(b.assignedDriverName || ''); setDriverPhoneInput(b.assignedDriverPhone || ''); }}
                                      className="text-xs font-bold text-cyan-600 hover:text-cyan-700"
                                    >
                                      Change
                                    </button>
                                  </div>
                                ) : assigningDriverFor === b.id ? (
                                  <div className="space-y-2">
                                    <input type="text" placeholder="Driver name" value={driverNameInput} onChange={e => setDriverNameInput(e.target.value)}
                                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                                    <input type="tel" placeholder="Driver phone" value={driverPhoneInput} onChange={e => setDriverPhoneInput(e.target.value)}
                                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                                    <div className="flex gap-2">
                                      <button onClick={() => saveDriverAssignment(b.id)} className="flex-1 bg-cyan-500 text-white py-1.5 rounded-lg text-xs font-bold hover:bg-cyan-600 transition">Save</button>
                                      <button onClick={() => setAssigningDriverFor(null)} className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-600">Cancel</button>
                                    </div>
                                  </div>
                                ) : needsDriver ? (
                                  <button
                                    onClick={() => { setAssigningDriverFor(b.id); setDriverNameInput(''); setDriverPhoneInput(''); }}
                                    className="flex items-center gap-2 text-xs font-bold text-orange-600 bg-orange-50 px-3 py-2 rounded-lg hover:bg-orange-100 transition"
                                  >
                                    Assign a driver
                                  </button>
                                ) : null}
                              </div>
                            )}

                            {b.disputeStatus === 'reported' && (
                              <div className="mt-3 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                                <p className="text-xs text-red-600"><strong>Issue reported:</strong> {b.disputeReason}</p>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {activeSection === 'profile' && isServiceProvider && (
                <div className="bg-white rounded-3xl border-2 border-gray-100 p-6">
                  {isHourly ? (
                    <>
                      <div className="flex items-center gap-2 mb-4"><Clock size={18} className="text-cyan-500" /><h3 className="font-bold text-gray-800">Hourly Packages</h3><span className="text-xs text-gray-400">({hourlyPackages.length}/{MAX_ITEMS})</span></div>
                      <div className="space-y-3 mb-4">
                        {hourlyPackages.map(pkg => (
                          <div key={pkg.id} className="border-2 border-gray-100 rounded-xl p-4">
                            <div className="grid grid-cols-2 gap-3 mb-2">
                              <input type="number" placeholder="Hours" value={pkg.hours} onChange={e => updatePackage(pkg.id, 'hours', e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                              <input type="number" placeholder="Price (₦)" value={pkg.price} onChange={e => updatePackage(pkg.id, 'price', e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                            </div>
                            <div className="flex gap-2 items-center">
                              <input type="text" placeholder="What's included" value={pkg.description} onChange={e => updatePackage(pkg.id, 'description', e.target.value)} className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                              <button onClick={() => removePackage(pkg.id)} className="p-2 text-red-400 hover:text-red-600"><Trash2 size={16} /></button>
                            </div>
                          </div>
                        ))}
                      </div>
                      {hourlyPackages.length < MAX_ITEMS && <button onClick={addPackage} className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-cyan-300 rounded-xl text-sm font-semibold text-cyan-600 hover:bg-cyan-50 transition mb-6"><Plus size={16} /> Add Package</button>}
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 mb-4"><Tag size={18} className="text-cyan-500" /><h3 className="font-bold text-gray-800">Pricing Packages</h3><span className="text-xs text-gray-400">({pricingTiers.length}/{MAX_ITEMS})</span></div>
                      <div className="space-y-3 mb-4">
                        {pricingTiers.map(tier => (
                          <div key={tier.id} className="border-2 border-gray-100 rounded-xl p-4">
                            <div className="flex gap-3 mb-2">
                              <ImageUploadSlot imageUrl={tier.image} onUploaded={url => updateTier(tier.id, 'image', url)} folder="business-pricing" />
                              <div className="flex-1 grid grid-cols-2 gap-2">
                                <input type="text" placeholder="Package name" value={tier.name} onChange={e => updateTier(tier.id, 'name', e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm col-span-2" />
                                <input type="number" placeholder="Price (₦)" value={tier.price} onChange={e => updateTier(tier.id, 'price', e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm col-span-2" />
                              </div>
                            </div>
                            <div className="flex gap-2 items-center">
                              <input type="text" placeholder="What's included" value={tier.description} onChange={e => updateTier(tier.id, 'description', e.target.value)} className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                              <button onClick={() => removeTier(tier.id)} className="p-2 text-red-400 hover:text-red-600"><Trash2 size={16} /></button>
                            </div>
                          </div>
                        ))}
                      </div>
                      {pricingTiers.length < MAX_ITEMS && <button onClick={addTier} className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-cyan-300 rounded-xl text-sm font-semibold text-cyan-600 hover:bg-cyan-50 transition mb-6"><Plus size={16} /> Add Package</button>}
                    </>
                  )}
                  <button onClick={handleSavePricing} disabled={savingPricing} className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 text-white py-3.5 rounded-2xl font-black hover:from-cyan-700 hover:to-blue-700 transition disabled:opacity-50">
                    {savingPricing ? 'Saving...' : 'Save Pricing'}
                  </button>
                </div>
              )}

              {activeSection === 'requests' && isServiceProvider && (
                <div className="bg-white rounded-3xl border-2 border-gray-100 p-6">
                  <div className="flex items-center gap-2 mb-4"><ClipboardList size={18} className="text-cyan-500" /><h3 className="font-bold text-gray-800">Requests</h3></div>
                  <p className="text-xs text-gray-400 mb-4">Planners who specifically chose your business. Accept if you're available, or decline so they can pick someone else.</p>
                  {loadingDirect ? <p className="text-sm text-gray-400">Loading...</p> : directRequests.length === 0 ? (
                    <p className="text-sm text-gray-400">No requests yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {directRequests.map(req => (
                        <div key={req.id} className="border-2 border-gray-100 rounded-xl p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-bold text-gray-900">{req.eventName || 'Event'}</p>
                              <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5"><MapPin size={11} /> {[req.area, req.city, req.state].filter(Boolean).join(', ')} {req.eventDate ? `· ${req.eventDate}` : ''}</p>
                              {req.packageName && <p className="text-sm font-bold text-cyan-600 mt-1">{req.packageName} — ₦{Number(req.packagePrice || 0).toLocaleString()}</p>}
                              {req.details && <p className="text-xs text-gray-500 mt-1">{req.details}</p>}
                              {req.referenceImage && (
                                <img src={req.referenceImage} alt="Reference" className="w-16 h-16 rounded-lg object-cover mt-2 border border-gray-200" />
                              )}
                            </div>
                            {req.status === 'pending' ? (
                              <div className="flex gap-2 flex-shrink-0">
                                <button onClick={() => respondToDirectRequest(req.id, 'accepted')} disabled={respondingId === req.id}
                                  className="bg-emerald-500 text-white px-3 py-2 rounded-xl text-sm font-bold hover:bg-emerald-600 transition disabled:opacity-50">
                                  Accept
                                </button>
                                <button onClick={() => respondToDirectRequest(req.id, 'declined')} disabled={respondingId === req.id}
                                  className="bg-gray-100 text-gray-600 px-3 py-2 rounded-xl text-sm font-bold hover:bg-gray-200 transition disabled:opacity-50">
                                  Decline
                                </button>
                              </div>
                            ) : (
                              <span className={`text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0 ${req.status === 'accepted' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
                                {req.status === 'accepted' ? 'Accepted' : 'Declined'}
                              </span>
                            )}
                          </div>
                          {req.status === 'accepted' && req.plannerEmail && (
                            <div className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-2.5 py-1.5 mt-2">
                              <span className="font-bold">{req.plannerName || 'Planner'}:</span>
                              <span>{req.plannerEmail}</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeSection === 'offers' && isServiceProvider && (
                <div className="bg-white rounded-3xl border-2 border-gray-100 p-6">
                  <div className="flex items-center gap-2 mb-4"><Inbox size={18} className="text-cyan-500" /><h3 className="font-bold text-gray-800">Open Offers</h3></div>
                  <p className="text-xs text-gray-400 mb-4">Open to any matching business in your city. Submit a quote — the planner reviews all quotes and picks one.</p>
                  {loadingOffers ? <p className="text-sm text-gray-400">Loading...</p> : openOffers.length === 0 ? (
                    <p className="text-sm text-gray-400">No open offers for {selectedBusiness.businessType} right now.</p>
                  ) : (
                    <div className="space-y-3">
                      {openOffers.map(offer => {
                        const alreadyQuoted = myQuotes.some(q => q.requestId === offer.id);
                        return (
                          <div key={offer.id} className="border-2 border-gray-100 rounded-xl p-4">
                            <p className="text-sm font-bold text-gray-900">{offer.eventName || 'Event'}</p>
                            <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5"><MapPin size={11} /> {[offer.area, offer.city, offer.state].filter(Boolean).join(', ')} {offer.eventDate ? `· ${offer.eventDate}` : ''}</p>
                            {offer.details && <p className="text-xs text-gray-500 mt-1">{offer.details}</p>}
                            {offer.referenceImage && (
                              <img src={offer.referenceImage} alt="Reference" className="w-16 h-16 rounded-lg object-cover mt-2 border border-gray-200" />
                            )}
                            <p className="text-sm font-bold text-cyan-600 mt-1">Budget: ₦{Number(offer.budget || 0).toLocaleString()}</p>
                            {offer.deadline && <p className="text-xs text-orange-500 mt-0.5">Responses close {offer.deadline}</p>}

                            {alreadyQuoted ? (
                              <p className="text-xs text-emerald-600 font-semibold mt-3">✓ You've already submitted a quote — check My Quotes</p>
                            ) : quotingOfferId === offer.id ? (
                              <div className="mt-3 space-y-2 border-t border-gray-100 pt-3">
                                <input type="number" placeholder="Your price (₦)" value={quoteForm.price}
                                  onChange={e => setQuoteForm(p => ({ ...p, price: e.target.value }))}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                                <textarea placeholder="Optional message (why they should pick you)" rows={2} value={quoteForm.message}
                                  onChange={e => setQuoteForm(p => ({ ...p, message: e.target.value }))}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none" />
                                <div className="flex gap-2">
                                  <button onClick={() => submitQuote(offer)} className="flex-1 bg-cyan-500 text-white py-2 rounded-lg text-sm font-bold hover:bg-cyan-600 transition">
                                    Submit Quote
                                  </button>
                                  <button onClick={() => { setQuotingOfferId(''); setQuoteForm({ price: '', message: '' }); }} className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600">
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <button onClick={() => setQuotingOfferId(offer.id)} className="mt-3 bg-cyan-500 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-cyan-600 transition">
                                Submit a Quote
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {activeSection === 'quotes' && isServiceProvider && (
                <div className="bg-white rounded-3xl border-2 border-gray-100 p-6">
                  <div className="flex items-center gap-2 mb-4"><MessageSquare size={18} className="text-cyan-500" /><h3 className="font-bold text-gray-800">My Quotes</h3></div>
                  {loadingQuotes ? <p className="text-sm text-gray-400">Loading...</p> : myQuotes.length === 0 ? (
                    <p className="text-sm text-gray-400">You haven't submitted any quotes yet. Check Open Offers.</p>
                  ) : (
                    <div className="space-y-2">
                      {myQuotes.map(q => (
                        <div key={q.id} className="bg-gray-50 rounded-xl p-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-bold text-gray-800">{q.eventName}</p>
                              <p className="text-xs text-gray-500">₦{Number(q.quotedPrice).toLocaleString()} · {q.city}</p>
                            </div>
                            <span className={`text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0 ${
                              q.status === 'accepted' ? 'bg-emerald-100 text-emerald-700' : q.status === 'declined' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-700'
                            }`}>
                              {q.status === 'accepted' ? 'Accepted' : q.status === 'declined' ? 'Not Chosen' : 'Pending'}
                            </span>
                          </div>
                          {q.status === 'accepted' && q.plannerEmail && (
                            <div className="flex items-center gap-1.5 text-xs text-emerald-700 bg-white border border-emerald-100 rounded-lg px-2.5 py-1.5 mt-2">
                              <span className="font-bold">Planner:</span>
                              <span>{q.plannerEmail}</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeSection === 'shop' && isEventVendor && settingsForm && (
                <div className="bg-white rounded-3xl border-2 border-gray-100 p-6 space-y-4">
                  <h3 className="font-bold text-gray-800 mb-2">Shop Profile</h3>
                  <div className="flex items-center gap-4">
                    <ImageUploadSlot imageUrl={settingsForm.logoUrl} onUploaded={url => setSettingsForm(p => ({ ...p, logoUrl: url }))} folder="businesses" />
                    <p className="text-xs text-gray-400">Shop photo</p>
                  </div>
                  <div><label className="block text-xs font-bold text-gray-600 mb-1">Shop Name</label><input type="text" value={settingsForm.businessName} onChange={e => setSettingsForm(p => ({ ...p, businessName: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" /></div>
                  <div><label className="block text-xs font-bold text-gray-600 mb-1">What you sell</label><textarea rows={3} value={settingsForm.description} onChange={e => setSettingsForm(p => ({ ...p, description: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none" /></div>
                  <button onClick={handleSaveSettings} disabled={savingSettings} className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 text-white py-3 rounded-2xl font-black hover:from-cyan-700 hover:to-blue-700 transition disabled:opacity-50">{savingSettings ? 'Saving...' : 'Save Shop Profile'}</button>
                </div>
              )}

              {activeSection === 'findstands' && isEventVendor && (
                <div className="bg-white rounded-3xl border-2 border-gray-100 p-6">
                  <div className="flex items-center gap-2 mb-4"><Tent size={18} className="text-cyan-500" /><h3 className="font-bold text-gray-800">Events With Open Stands</h3></div>
                  {loadingStandEvents ? <p className="text-sm text-gray-400">Loading...</p> : standEvents.length === 0 ? (
                    <p className="text-sm text-gray-400">No events with open stands right now. Check back soon.</p>
                  ) : (
                    <div className="space-y-3">
                      {standEvents.map(ev => (
                        <button key={ev.id} onClick={() => navigate(ev.slug ? `/e/${ev.slug}` : `/event/${ev.id}`)} className="w-full text-left border-2 border-gray-100 rounded-xl p-4 hover:border-cyan-300 transition">
                          <p className="text-sm font-bold text-gray-900">{ev.title}</p>
                          <p className="text-xs text-gray-500 flex items-center gap-1 mt-1"><MapPin size={11} /> {ev.location || ev.city}</p>
                          <p className="text-xs text-cyan-600 font-semibold mt-1">
                            {(ev.vendorStands || []).filter(s => (s.filled || 0) < s.quantityAvailable).length} stand type(s) available — view event to apply
                          </p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeSection === 'applications' && isEventVendor && (
                <div className="bg-white rounded-3xl border-2 border-gray-100 p-6">
                  <h3 className="font-bold text-gray-800 mb-1">My Applications</h3>
                  <p className="text-xs text-gray-400 mb-4">Once an organizer approves your application, pay here to secure the stand.</p>
                  {loadingApplications ? <p className="text-sm text-gray-400">Loading...</p> : myApplications.length === 0 ? (
                    <p className="text-sm text-gray-400">You haven't applied for any stands yet. Try Find Stands.</p>
                  ) : (
                    <div className="space-y-3">
                      {myApplications.map(app => {
                        const needsPayment = app.organizerApprovalStatus === 'approved' && app.paymentStatus !== 'paid';
                        const paystackConfig = needsPayment ? {
                          reference: `STAND-PAY-${app.id}-${Date.now()}`,
                          email: currentUser.email,
                          amount: (app.standPrice || 0) * 100,
                          publicKey: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY,
                          metadata: {
                            custom_fields: [
                              { display_name: 'PurchaseType', variable_name: 'purchase_type', value: 'vendor_stand' },
                              { display_name: 'ApplicationID', variable_name: 'application_id', value: app.id },
                              { display_name: 'EID', variable_name: 'eid', value: app.eventId },
                              { display_name: 'StandID', variable_name: 'stand_id', value: app.standId },
                            ],
                            purchase_type: 'vendor_stand',
                            application_id: app.id,
                          },
                        } : null;

                        return (
                          <div key={app.id} className="bg-gray-50 rounded-xl p-3">
                            <div className="flex items-center justify-between mb-1">
                              <div>
                                <p className="text-sm font-bold text-gray-800">{app.eventTitle}</p>
                                <p className="text-xs text-gray-500">{app.standName} · ₦{Number(app.standPrice || 0).toLocaleString()}</p>
                              </div>
                              <span className={`text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0 ${
                                app.organizerApprovalStatus === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                                app.organizerApprovalStatus === 'rejected' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-700'
                              }`}>
                                {app.organizerApprovalStatus === 'approved' ? 'Approved' : app.organizerApprovalStatus === 'rejected' ? 'Rejected' : 'Pending'}
                              </span>
                            </div>

                            {needsPayment && (
                              <div className="mt-2 pt-2 border-t border-gray-200">
                                <p className="text-xs text-amber-700 font-semibold mb-2">⚠️ No refunds after payment. Pay only if you're sure.</p>
                                <PaystackButton
                                  {...paystackConfig}
                                  text={`Pay ₦${Number(app.standPrice || 0).toLocaleString()}`}
                                  onSuccess={() => { alert('Payment successful! Your stand will show as paid shortly.'); loadMyApplications(); }}
                                  onClose={() => {}}
                                  className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white py-2.5 rounded-xl text-sm font-bold hover:shadow-lg transition"
                                />
                              </div>
                            )}
                            {app.organizerApprovalStatus === 'approved' && app.paymentStatus === 'paid' && (
                              <p className="text-xs text-cyan-600 font-bold mt-1">✓ Paid — stand secured</p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {activeSection === 'active' && isEventVendor && (
                <div className="bg-white rounded-3xl border-2 border-gray-100 p-6">
                  <h3 className="font-bold text-gray-800 mb-4">Active Stands</h3>
                  {myApplications.filter(a => a.organizerApprovalStatus === 'approved' && a.paymentStatus === 'paid').length === 0 ? (
                    <p className="text-sm text-gray-400">No paid, confirmed stands yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {myApplications.filter(a => a.organizerApprovalStatus === 'approved' && a.paymentStatus === 'paid').map(app => (
                        <div key={app.id} className="flex items-center justify-between bg-emerald-50 rounded-xl p-3 border border-emerald-100">
                          <div><p className="text-sm font-bold text-gray-800">{app.eventTitle}</p><p className="text-xs text-gray-500">{app.standName}</p></div>
                          <CheckCircle2 size={16} className="text-emerald-500" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeSection === 'transactions' && isEventVendor && (
                <div className="bg-white rounded-3xl border-2 border-gray-100 p-6">
                  <h3 className="font-bold text-gray-800 mb-4">Transactions</h3>
                  {myApplications.filter(a => a.paymentStatus === 'paid').length === 0 ? <p className="text-sm text-gray-400">No paid transactions yet.</p> : (
                    <div className="space-y-2">
                      {myApplications.filter(a => a.paymentStatus === 'paid').map(app => (
                        <div key={app.id} className="flex items-center justify-between border-b border-gray-100 py-2.5">
                          <div><p className="text-sm text-gray-800">{app.eventTitle} — {app.standName}</p><p className="text-xs text-gray-400">{app.paymentReference}</p></div>
                          <span className="text-sm font-bold text-cyan-600">₦{Number(app.amountPaid || 0).toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeSection === 'verification' && selectedBusiness && (
                <div className="bg-white rounded-3xl border-2 border-gray-100 p-6">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-gray-800">Verification</h3>
                    {selectedBusiness.govIdStatus === 'approved' && selectedBusiness.cacStatus === 'approved' && (
                      <BadgeCheck size={16} className="text-amber-500" />
                    )}
                    {selectedBusiness.govIdStatus === 'approved' && selectedBusiness.cacStatus !== 'approved' && (
                      <BadgeCheck size={16} className="text-blue-500" />
                    )}
                    {selectedBusiness.cacStatus === 'approved' && selectedBusiness.govIdStatus !== 'approved' && (
                      <BadgeCheck size={16} className="text-emerald-500" />
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mb-6">Upload your documents to earn a verification badge customers can see.</p>

                  {/* Gov ID */}
                  <div className="border-2 border-gray-100 rounded-2xl p-4 mb-4">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-bold text-sm text-gray-800">Government ID</p>
                      <VerifyStatusPill status={selectedBusiness.govIdStatus} />
                    </div>
                    <p className="text-xs text-gray-400 mb-3">Approved earns the blue tick.</p>
                    {(selectedBusiness.govIdStatus === 'none' || !selectedBusiness.govIdStatus || selectedBusiness.govIdStatus === 'rejected') ? (
                      <ImageUploadSlot
                        imageUrl={selectedBusiness.govIdStatus === 'rejected' ? '' : selectedBusiness.govIdUrl}
                        onUploaded={url => submitVerificationDoc('gov', url)}
                        folder="business-verification"
                      />
                    ) : (
                      selectedBusiness.govIdUrl && (
                        <img src={selectedBusiness.govIdUrl} alt="Gov ID" className="w-24 h-24 rounded-xl object-cover border border-gray-200" />
                      )
                    )}
                  </div>

                  {/* CAC */}
                  <div className="border-2 border-gray-100 rounded-2xl p-4">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-bold text-sm text-gray-800">CAC Registration</p>
                      <VerifyStatusPill status={selectedBusiness.cacStatus} />
                    </div>
                    <p className="text-xs text-gray-400 mb-3">Approved earns the green tick. Both approved earns gold.</p>
                    {(selectedBusiness.cacStatus === 'none' || !selectedBusiness.cacStatus || selectedBusiness.cacStatus === 'rejected') ? (
                      <ImageUploadSlot
                        imageUrl={selectedBusiness.cacStatus === 'rejected' ? '' : selectedBusiness.cacUrl}
                        onUploaded={url => submitVerificationDoc('cac', url)}
                        folder="business-verification"
                      />
                    ) : (
                      selectedBusiness.cacUrl && (
                        <img src={selectedBusiness.cacUrl} alt="CAC" className="w-24 h-24 rounded-xl object-cover border border-gray-200" />
                      )
                    )}
                  </div>
                </div>
              )}

              {activeSection === 'settings' && settingsForm && (
                <div className="bg-white rounded-3xl border-2 border-gray-100 p-6 space-y-4">
                  <h3 className="font-bold text-gray-800 mb-2">Business Settings</h3>
                  <div className="flex items-center gap-4">
                    <ImageUploadSlot imageUrl={settingsForm.logoUrl} onUploaded={url => setSettingsForm(p => ({ ...p, logoUrl: url }))} folder="businesses" />
                    <p className="text-xs text-gray-400">Logo / photo</p>
                  </div>
                  <div><label className="block text-xs font-bold text-gray-600 mb-1">Business Name</label><input type="text" value={settingsForm.businessName} onChange={e => setSettingsForm(p => ({ ...p, businessName: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" /></div>
                  <div><label className="block text-xs font-bold text-gray-600 mb-1">Description</label><textarea rows={3} value={settingsForm.description} onChange={e => setSettingsForm(p => ({ ...p, description: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none" /></div>
                  <div><label className="block text-xs font-bold text-gray-600 mb-1">City</label>
                    <select value={settingsForm.city} onChange={e => setSettingsForm(p => ({ ...p, city: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white">
                      <option value="">Select a state</option>
                      {NIGERIAN_STATES.map(s => <option key={s}>{s}</option>)}
                    </select>
                    {settingsForm.city === 'Others' && (
                      <input type="text" value={settingsForm.customCity || ''} onChange={e => setSettingsForm(p => ({ ...p, customCity: e.target.value }))} placeholder="Enter your state" className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                    )}
                  </div>
                  <div><label className="block text-xs font-bold text-gray-600 mb-1">Area <span className="text-gray-400 font-normal">(optional)</span></label>
                    <input type="text" value={settingsForm.area || ''} onChange={e => setSettingsForm(p => ({ ...p, area: e.target.value }))} placeholder="e.g. Ikeja, Lekki, Maitama, Ilorin" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                  </div>
                  <div><label className="block text-xs font-bold text-gray-600 mb-1">WhatsApp Number</label><input type="tel" value={settingsForm.whatsappNumber} onChange={e => setSettingsForm(p => ({ ...p, whatsappNumber: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" /></div>
                  <div><label className="block text-xs font-bold text-gray-600 mb-1">Pricing Info (short text)</label><input type="text" value={settingsForm.pricingInfo} onChange={e => setSettingsForm(p => ({ ...p, pricingInfo: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" /></div>
                  <button onClick={handleSaveSettings} disabled={savingSettings} className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 text-white py-3 rounded-2xl font-black hover:from-cyan-700 hover:to-blue-700 transition disabled:opacity-50">{savingSettings ? 'Saving...' : 'Save Settings'}</button>
                </div>
              )}

              {['events', 'reviews', 'earnings'].includes(activeSection) && isServiceProvider && (
                <ComingSoon label={NAV_ITEMS.find(i => i.key === activeSection)?.label} />
              )}
              {['reviews'].includes(activeSection) && isEventVendor && (
                <ComingSoon label={NAV_ITEMS.find(i => i.key === activeSection)?.label} />
              )}
            </>
          )}
        </div>
      </div>

      {/* Add/Edit Shortlet Listing modal */}
      {listingModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={closeListingModal}>
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-black text-lg text-gray-900">{editingListingId ? 'Edit Listing' : 'New Listing'}</h3>
              <button onClick={closeListingModal} className="p-2 hover:bg-gray-100 rounded-full">
                <XCircle size={20} className="text-gray-400" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Property Name *</label>
                <input type="text" value={listingForm.title} onChange={e => setListingForm(p => ({ ...p, title: e.target.value }))}
                  placeholder="e.g. Cozy 2BR in Lekki Phase 1" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              </div>

              {/* ✅ NEW — property type, matching the mobile form's Step 1 field */}
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-2">Property Type</label>
                <div className="flex flex-wrap gap-2">
                  {SHORTLET_PROPERTY_TYPES.map(t => (
                    <button key={t} type="button" onClick={() => setListingForm(p => ({ ...p, propertyType: t }))}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold border-2 transition ${
                        listingForm.propertyType === t ? 'border-cyan-500 bg-cyan-500 text-white' : 'border-gray-200 text-gray-600'
                      }`}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Photos (min. 2) *</label>
                <GalleryUploadRow images={listingForm.images} onChange={imgs => setListingForm(p => ({ ...p, images: imgs }))} folder="shortlets" />
              </div>

              {/* ✅ NEW — was missing on web entirely; already existed on
                  the mobile form (Step 7 — Media). Matches the spec's
                  "Video (optional): Walkthrough video, Max 2 minutes,
                  50MB" — the more generous limit for Shortlet vs Ride's
                  tighter 1 min/30MB interior-only clip. */}
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5">Walkthrough Video (optional)</label>
                <p className="text-[11px] text-gray-400 mb-2">Max 2 minutes, 50MB</p>
                <VideoUploadBox url={listingForm.videoUrl} onChange={url => setListingForm(p => ({ ...p, videoUrl: url }))} folder="shortlets" maxBytes={50 * 1024 * 1024} />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Description *</label>
                <textarea rows={3} value={listingForm.description} onChange={e => setListingForm(p => ({ ...p, description: e.target.value }))}
                  placeholder="What makes this property stand out?" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none" />
                <p className="text-xs text-gray-400 mt-1">{listingForm.description.length} / 20 characters minimum</p>
              </div>

              {/* ✅ FIXED — was a 3-button Per Night/Per Hour/Per Day
                  toggle plus separate price+minHours fields. Single price
                  field now, since every listing is per-night only. */}
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Price per Night (₦) *</label>
                <input type="number" value={listingForm.pricePerNight} onChange={e => setListingForm(p => ({ ...p, pricePerNight: e.target.value }))}
                  placeholder="35000" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">Bedrooms</label>
                  <input type="number" value={listingForm.bedrooms} onChange={e => setListingForm(p => ({ ...p, bedrooms: e.target.value }))}
                    placeholder="2" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">Bathrooms</label>
                  <input type="number" value={listingForm.bathrooms} onChange={e => setListingForm(p => ({ ...p, bathrooms: e.target.value }))}
                    placeholder="2" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">Max guests</label>
                  <input type="number" value={listingForm.maxGuests} onChange={e => setListingForm(p => ({ ...p, maxGuests: e.target.value }))}
                    placeholder="4" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-2">Amenities</label>
                <div className="flex flex-wrap gap-2">
                  {SHORTLET_AMENITIES.map(a => (
                    <button key={a} type="button" onClick={() => toggleListingAmenity(a)}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold border-2 transition ${
                        listingForm.amenities.includes(a) ? 'border-cyan-500 bg-cyan-500 text-white' : 'border-gray-200 text-gray-600'
                      }`}>
                      {a}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">State *</label>
                <select value={listingForm.city} onChange={e => setListingForm(p => ({ ...p, city: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white">
                  <option value="">Select a state</option>
                  {NIGERIAN_STATES.map(s => <option key={s}>{s}</option>)}
                </select>
                {listingForm.city === 'Others' && (
                  <input type="text" value={listingForm.customCity} onChange={e => setListingForm(p => ({ ...p, customCity: e.target.value }))}
                    placeholder="Enter your state" className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Area</label>
                <input type="text" value={listingForm.area} onChange={e => setListingForm(p => ({ ...p, area: e.target.value }))}
                  placeholder="e.g. Lekki Phase 1" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">WhatsApp Number *</label>
                <input type="tel" value={listingForm.whatsappNumber} onChange={e => setListingForm(p => ({ ...p, whatsappNumber: e.target.value }))}
                  placeholder="+234 800 000 0000" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                <p className="text-xs text-gray-400 mt-1">Guests will reach you here to book</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Google Maps Link</label>
                <input type="url" value={listingForm.mapsLink} onChange={e => setListingForm(p => ({ ...p, mapsLink: e.target.value }))}
                  placeholder="https://maps.google.com/..." className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              </div>

              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={listingForm.available} onChange={e => setListingForm(p => ({ ...p, available: e.target.checked }))}
                  className="w-4 h-4 accent-cyan-500" />
                <span className="text-sm font-bold text-gray-800">Available for booking</span>
              </label>
              <p className="text-xs text-gray-400 -mt-3">Turn off to hide this listing without deleting it — e.g. fully booked for a while.</p>

              <button onClick={saveListing} disabled={!listingFormValid || savingListing}
                className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 text-white py-3.5 rounded-2xl font-black hover:from-cyan-700 hover:to-blue-700 transition disabled:opacity-50">
                {savingListing ? 'Saving...' : (editingListingId ? 'Save Changes' : 'Publish Listing')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ✅ NEW — Add/Edit Ride Vehicle modal, mirroring the Shortlet
          modal above's structure but with vehicle + driver + pricing
          fields matching osb_ride_manage_screen.dart exactly. */}
      {rideModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={closeRideModal}>
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-black text-lg text-gray-900">{editingRideId ? 'Edit Vehicle' : 'New Vehicle'}</h3>
              <button onClick={closeRideModal} className="p-2 hover:bg-gray-100 rounded-full">
                <XCircle size={20} className="text-gray-400" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Vehicle Name / Model *</label>
                <input type="text" value={rideForm.title} onChange={e => setRideForm(p => ({ ...p, title: e.target.value }))}
                  placeholder="e.g. Toyota Hiace Bus" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-2">Vehicle Type *</label>
                <div className="flex flex-wrap gap-2">
                  {RIDE_VEHICLE_TYPES.map(t => (
                    <button key={t} type="button" onClick={() => setRideForm(p => ({ ...p, vehicleType: t }))}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold border-2 transition ${
                        rideForm.vehicleType === t ? 'border-cyan-500 bg-cyan-500 text-white' : 'border-gray-200 text-gray-600'
                      }`}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">Year</label>
                  <input type="number" value={rideForm.year} onChange={e => setRideForm(p => ({ ...p, year: e.target.value }))}
                    placeholder="2020" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">Capacity *</label>
                  <input type="number" value={rideForm.capacity} onChange={e => setRideForm(p => ({ ...p, capacity: e.target.value }))}
                    placeholder="14" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">Color</label>
                  <input type="text" value={rideForm.color} onChange={e => setRideForm(p => ({ ...p, color: e.target.value }))}
                    placeholder="White" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Photos (min. 3 — front, interior, back) *</label>
                <GalleryUploadRow images={rideForm.images} onChange={imgs => setRideForm(p => ({ ...p, images: imgs }))} folder="rides" />
              </div>

              {/* ✅ NEW — walkthrough video, matching the vehicle spec's
                  Media step. Placed right after Photos, same as the
                  mobile form's ordering. */}
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5">Interior Walkthrough Video (optional)</label>
                <p className="text-[11px] text-gray-400 mb-2">Max 1 minute, 30MB</p>
                <VideoUploadBox url={rideForm.videoUrl} onChange={url => setRideForm(p => ({ ...p, videoUrl: url }))} folder="rides" />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Description *</label>
                <textarea rows={3} value={rideForm.description} onChange={e => setRideForm(p => ({ ...p, description: e.target.value }))}
                  placeholder="What makes this vehicle a good pick?" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none" />
                <p className="text-xs text-gray-400 mt-1">{rideForm.description.length} / 20 characters minimum</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-2">Features</label>
                <div className="flex flex-wrap gap-2">
                  {RIDE_FEATURES.map(f => (
                    <button key={f} type="button" onClick={() => toggleRideFeature(f)}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold border-2 transition ${
                        rideForm.features.includes(f) ? 'border-cyan-500 bg-cyan-500 text-white' : 'border-gray-200 text-gray-600'
                      }`}>
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-2">How is this vehicle priced? *</label>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {[['trip', 'Per Trip'], ['hour', 'Per Hour'], ['both', 'Both']].map(([value, label]) => (
                    <button key={value} type="button" onClick={() => setRideForm(p => ({ ...p, priceType: value }))}
                      className={`py-2 rounded-xl text-xs font-bold border-2 transition ${
                        rideForm.priceType === value ? 'border-cyan-500 bg-cyan-50 text-cyan-700' : 'border-gray-200 text-gray-500'
                      }`}>
                      {label}
                    </button>
                  ))}
                </div>
                {(rideForm.priceType === 'trip' || rideForm.priceType === 'both') && (
                  <div className="mb-3">
                    <label className="block text-xs font-bold text-gray-600 mb-1">Price per Trip (₦) *</label>
                    <input type="number" value={rideForm.pricePerTrip} onChange={e => setRideForm(p => ({ ...p, pricePerTrip: e.target.value }))}
                      placeholder="45000" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                  </div>
                )}
                {(rideForm.priceType === 'hour' || rideForm.priceType === 'both') && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-gray-600 mb-1">Price per Hour (₦) *</label>
                      <input type="number" value={rideForm.pricePerHour} onChange={e => setRideForm(p => ({ ...p, pricePerHour: e.target.value }))}
                        placeholder="10000" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-600 mb-1">Min. Hours</label>
                      <input type="number" value={rideForm.minHours} onChange={e => setRideForm(p => ({ ...p, minHours: e.target.value }))}
                        placeholder="3" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">State *</label>
                <select value={rideForm.city} onChange={e => setRideForm(p => ({ ...p, city: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white">
                  <option value="">Select a state</option>
                  {NIGERIAN_STATES.map(s => <option key={s}>{s}</option>)}
                </select>
                {rideForm.city === 'Others' && (
                  <input type="text" value={rideForm.customCity} onChange={e => setRideForm(p => ({ ...p, customCity: e.target.value }))}
                    placeholder="Enter your state" className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Areas Covered</label>
                <input type="text" value={rideForm.areasCovered} onChange={e => setRideForm(p => ({ ...p, areasCovered: e.target.value }))}
                  placeholder="e.g. Lekki, Ikeja, Airport runs" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-2">Available Days</label>
                <div className="flex flex-wrap gap-2">
                  {RIDE_DAYS.map(d => (
                    <button key={d} type="button" onClick={() => toggleRideDay(d)}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold border-2 transition ${
                        rideForm.availableDays.includes(d) ? 'border-cyan-500 bg-cyan-500 text-white' : 'border-gray-200 text-gray-600'
                      }`}>
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">Available From</label>
                  <input type="text" value={rideForm.availableStartTime} onChange={e => setRideForm(p => ({ ...p, availableStartTime: e.target.value }))}
                    placeholder="6:00 AM" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">Available Until</label>
                  <input type="text" value={rideForm.availableEndTime} onChange={e => setRideForm(p => ({ ...p, availableEndTime: e.target.value }))}
                    placeholder="10:00 PM" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                </div>
              </div>

              <div className="border-t border-gray-100 pt-4 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">Plate Number *</label>
                  <input type="text" value={rideForm.plateNumber} onChange={e => setRideForm(p => ({ ...p, plateNumber: e.target.value }))}
                    placeholder="ABC-123-XY" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                  <p className="text-xs text-gray-400 mt-1">Hidden from guests until they book</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">Insurance Status *</label>
                  <select value={rideForm.insuranceStatus} onChange={e => setRideForm(p => ({ ...p, insuranceStatus: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white">
                    {RIDE_INSURANCE_STATUSES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={rideForm.available} onChange={e => setRideForm(p => ({ ...p, available: e.target.checked }))}
                  className="w-4 h-4 accent-cyan-500" />
                <span className="text-sm font-bold text-gray-800">Available for booking</span>
              </label>
              <p className="text-xs text-gray-400 -mt-3">Turn off to hide this listing without deleting it — e.g. undergoing maintenance.</p>

              <button onClick={saveRide} disabled={!rideFormValid || savingRide}
                className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 text-white py-3.5 rounded-2xl font-black hover:from-cyan-700 hover:to-blue-700 transition disabled:opacity-50">
                {savingRide ? 'Saving...' : (editingRideId ? 'Save Changes' : 'Publish Listing')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}