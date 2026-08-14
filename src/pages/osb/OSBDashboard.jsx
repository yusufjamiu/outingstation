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
} from 'lucide-react';

const HOURLY_TYPES = ['DJ', 'MC', 'Musician', 'Photographer'];
const MAX_ITEMS = 10;
// ✅ Fallback list — businessCategory alone isn't reliable on older docs
// saved before that field existed, so this infers from businessType instead.
const SERVICE_PROVIDER_TYPE_VALUES = [
  'Event Hall', 'DJ', 'MC', 'Caterer', 'Decorator', 'Photographer', 'Musician',
  'Furniture Rental', 'Ride Provider', 'Experience Host', 'Security',
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

// ✅ NEW — Shortlet is registered as businessCategory: 'Service Provider'
// (same as DJ/Caterer), so without its own nav it would silently fall
// into SERVICE_PROVIDER_NAV — Requests/Open Offers/My Quotes, a
// marketplace-quote flow that makes no sense for a shortlet agency.
// "My Listings" replaces that with the actual job: adding and managing
// individual properties. Verification/Settings are unchanged from the
// generic business-level sections already built for every business type.
const SHORTLET_NAV = [
  { key: 'overview', label: 'Overview', icon: LayoutDashboard },
  { key: 'listings', label: 'My Listings', icon: MapPin },
  { key: 'verification', label: 'Verification', icon: FileCheck },
  { key: 'settings', label: 'Settings', icon: Settings },
];

// ✅ NEW — fixed checklist, matching osb_shortlet_manage_screen.dart on
// mobile exactly, so a listing added on one platform shows identical
// amenities on the other.
const SHORTLET_AMENITIES = [
  'Kitchen', 'Washing Machine', 'WiFi', 'AC', 'Generator', 'Pool',
  'Parking', 'TV / Netflix', 'Security', 'Water Heater', 'Pet Friendly', 'Workspace',
];

const EMPTY_LISTING_FORM = {
  title: '', description: '', images: [],
  priceType: 'night', price: '', minHours: '',
  bedrooms: '', bathrooms: '', maxGuests: '',
  amenities: [], city: '', customCity: '', area: '',
  mapsLink: '', whatsappNumber: '', available: true,
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

// ✅ NEW — multi-image uploader for Shortlet listing galleries.
// ImageUploadSlot above only replaces a single image; a listing needs
// several photos, so this appends to an array instead and renders one
// removable thumbnail per image plus a trailing add-slot.
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

// ✅ NEW — small status label for a single verification document
function VerifyStatusPill({ status }) {
  const config = {
    pending: { label: 'Under Review', color: 'bg-amber-100 text-amber-700' },
    approved: { label: 'Approved', color: 'bg-emerald-100 text-emerald-700' },
    rejected: { label: 'Rejected', color: 'bg-red-100 text-red-600' },
  }[status] || { label: 'Not Uploaded', color: 'bg-gray-100 text-gray-500' };
  return <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${config.color}`}>{config.label}</span>;
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

  // ✅ Direct requests (targeted at this business — Accept/Decline)
  const [directRequests, setDirectRequests] = useState([]);
  const [loadingDirect, setLoadingDirect] = useState(false);
  const [respondingId, setRespondingId] = useState('');

  // ✅ Open offers (browsable — submit a quote)
  const [openOffers, setOpenOffers] = useState([]);
  const [loadingOffers, setLoadingOffers] = useState(false);
  const [quotingOfferId, setQuotingOfferId] = useState('');
  const [quoteForm, setQuoteForm] = useState({ price: '', message: '' });

  // ✅ My quotes (submitted by this business)
  const [myQuotes, setMyQuotes] = useState([]);
  const [loadingQuotes, setLoadingQuotes] = useState(false);

  const [standEvents, setStandEvents] = useState([]);
  const [loadingStandEvents, setLoadingStandEvents] = useState(false);

  const [myApplications, setMyApplications] = useState([]);
  const [loadingApplications, setLoadingApplications] = useState(false);

  const [settingsForm, setSettingsForm] = useState(null);
  const [savingSettings, setSavingSettings] = useState(false);

  // ✅ NEW — Shortlet "My Listings"
  const [shortletListings, setShortletListings] = useState([]);
  const [loadingListings, setLoadingListings] = useState(false);
  const [listingModalOpen, setListingModalOpen] = useState(false);
  const [editingListingId, setEditingListingId] = useState(null);
  const [listingForm, setListingForm] = useState(EMPTY_LISTING_FORM);
  const [savingListing, setSavingListing] = useState(false);

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
        // ✅ FIX: honor ?business={id} from the URL (set when navigating here
        // from the Navbar's account dropdown) — previously this always
        // defaulted to list[0], ignoring which business was actually clicked.
        const requestedId = searchParams.get('business');
        const target = (requestedId && list.some(b => b.id === requestedId)) ? requestedId : list[0].id;
        // ✅ FIX: first arrival now plays the same "Switching to..." overlay
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

    // ✅ Cancel any switch already in flight. Without this, clicking a
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
  // ✅ NEW — Shortlet carries businessCategory: 'Service Provider' too, so
  // it needs its own check ahead of the generic marketplace nav/loaders.
  const isShortletAgency = selectedBusiness?.businessType === 'Shortlet';
  const isEventVendor = selectedBusiness && !isServiceProvider;
  const isHourly = selectedBusiness && HOURLY_TYPES.includes(selectedBusiness.businessType);
  const NAV_ITEMS = isShortletAgency ? SHORTLET_NAV : isServiceProvider ? SERVICE_PROVIDER_NAV : EVENT_VENDOR_NAV;

  useEffect(() => {
    if (selectedBusiness && selectedBusiness.status === 'approved' && isServiceProvider && !isShortletAgency) {
      loadDirectRequests(selectedBusiness);
      loadOpenOffers(selectedBusiness);
      loadMyQuotes(selectedBusiness);
    } else {
      setDirectRequests([]); setOpenOffers([]); setMyQuotes([]);
    }
    // ✅ NEW — listings load whenever the selected business is a Shortlet
    // agency, independent of the approval-gated loaders above (an owner
    // can start adding listings the moment they're approved, same as
    // every other business type gets to use its own dashboard).
    if (selectedBusiness && selectedBusiness.status === 'approved' && isShortletAgency) {
      loadShortletListings(selectedBusiness);
    } else {
      setShortletListings([]);
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
      title: listing.title || '', description: listing.description || '', images: listing.images || [],
      priceType: listing.priceType || 'night', price: listing.price ?? '', minHours: listing.minHours ?? '',
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

  const listingFormValid = listingForm.title.trim() && listingForm.description.trim().length >= 20 &&
    listingForm.price !== '' && listingForm.city && listingForm.whatsappNumber.trim() && listingForm.images.length >= 2;

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
        description: listingForm.description.trim(),
        images: listingForm.images,
        priceType: listingForm.priceType,
        price: Number(listingForm.price) || 0,
        minHours: listingForm.priceType === 'hour' && listingForm.minHours ? Number(listingForm.minHours) : null,
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

  useEffect(() => {
    if (selectedBusiness && selectedBusiness.status === 'approved' && isEventVendor && activeSection === 'findstands') {
      loadStandEvents();
    }
  }, [selectedId, activeSection]);

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

  // ✅ NEW — submits a Gov ID or CAC upload for review. Always writes
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
      // ✅ Resolve "Others" to the actual typed state, and don't persist
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
          // ✅ Live counts, not stored notifications — these shrink naturally
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
                        const priceSuffix = listing.priceType === 'hour' ? '/hour' : listing.priceType === 'day' ? '/day' : '/night';
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
                                <p className="text-xs text-gray-500 mt-0.5">₦{Number(listing.price || 0).toLocaleString()}{priceSuffix} · {listing.city}</p>
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
                            {selectedBusiness.businessType === 'Ride Provider' && (
                              <div className="flex gap-2 mt-2">
                                {['With Driver', 'Self-Drive'].map(opt => (
                                  <button
                                    key={opt}
                                    type="button"
                                    onClick={() => updateTier(tier.id, 'withDriver', opt === 'With Driver')}
                                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold border-2 transition ${
                                      tier.withDriver === (opt === 'With Driver') ? 'border-cyan-500 bg-cyan-50 text-cyan-700' : 'border-gray-200 text-gray-500'
                                    }`}
                                  >
                                    {opt}
                                  </button>
                                ))}
                              </div>
                            )}
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

      {/* ✅ NEW — Add/Edit Shortlet Listing modal */}
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

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Photos (min. 2) *</label>
                <GalleryUploadRow images={listingForm.images} onChange={imgs => setListingForm(p => ({ ...p, images: imgs }))} folder="shortlets" />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Description *</label>
                <textarea rows={3} value={listingForm.description} onChange={e => setListingForm(p => ({ ...p, description: e.target.value }))}
                  placeholder="What makes this property stand out?" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none" />
                <p className="text-xs text-gray-400 mt-1">{listingForm.description.length} / 20 characters minimum</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">How is this property priced? *</label>
                <div className="grid grid-cols-3 gap-2">
                  {[['night', 'Per Night'], ['hour', 'Per Hour'], ['day', 'Per Day']].map(([value, label]) => (
                    <button key={value} type="button" onClick={() => setListingForm(p => ({ ...p, priceType: value }))}
                      className={`py-2.5 rounded-xl text-sm font-bold border-2 transition ${
                        listingForm.priceType === value ? 'border-cyan-500 bg-cyan-50 text-cyan-700' : 'border-gray-200 text-gray-500'
                      }`}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">Price (₦) *</label>
                  <input type="number" value={listingForm.price} onChange={e => setListingForm(p => ({ ...p, price: e.target.value }))}
                    placeholder="35000" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                </div>
                {listingForm.priceType === 'hour' && (
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1">Min. hours</label>
                    <input type="number" value={listingForm.minHours} onChange={e => setListingForm(p => ({ ...p, minHours: e.target.value }))}
                      placeholder="2" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                  </div>
                )}
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
    </div>
  );
}