// SubmitEventPage.jsx — Multi-step wizard with Cloudinary upload + Ticket Tiers
import React, { useState, useEffect, useRef } from 'react';
import { collection, addDoc, serverTimestamp, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { Gift, X, Upload, Plus, ChevronRight, ChevronLeft, Check, Ticket, Trash2 } from 'lucide-react';


const makeSlug = (title, id) =>
  title.toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
  + '-' + id.slice(0, 5);

// ─── Constants ────────────────────────────────────────────────────────────────

const VENDOR_CATEGORIES = [
  { value: 'Food & Drinks', emoji: '🍔' },
  { value: 'Fashion & Clothing', emoji: '👗' },
  { value: 'Electronics & Gadgets', emoji: '📱' },
  { value: 'Beauty & Grooming', emoji: '💄' },
  { value: 'Books & Stationery', emoji: '📚' },
  { value: 'Accessories', emoji: '💍' },
];

const EVENT_CATEGORIES = [
  'Business & Tech', 'Art & Culture', 'Food & Dining',
  'Sport & Fitness', 'Education', 'Religion & Community',
  'Nightlife & Parties', 'Family & Kids Fun', 'Networking & Social',
  'Gaming & Esport', 'Music & Concerts', 'Cinema & Show', 'Other',
];

const PLACE_CATEGORIES = [
  'Art & Culture', 'Food & Dining', 'Sport & Fitness',
  'Nightlife & Parties', 'Family & Kids Fun', 'Cinema & Show',
  'Malls', 'Spas', 'Other',
];

const CITIES = ['Lagos', 'Abuja', 'Ibadan', 'Port Harcourt', 'Others'];
const PLATFORMS = [
  'Zoom', 'Google Meet', 'Microsoft Teams', 'YouTube Live',
  'Instagram Live', 'LinkedIn Live', 'Twitter Space', 'Other',
];

const DEFAULT_UNIS = [
  'University of Lagos (Unilag)', 'University of Ibadan (UI)',
  'Covenant University (CU)', 'Ahmadu Bello University (ABU)',
  'University of Benin (Uniben)', 'Obafemi Awolowo University (OAU)',
  'University of Ilorin (Unilorin)', 'Lagos State University (LASU)',
];

const TIER_PRESETS = [
  { name: 'Regular', emoji: '🎫' },
  { name: 'Early Bird', emoji: '🐦' },
  { name: 'VIP', emoji: '⭐' },
  { name: 'VVIP', emoji: '👑' },
  { name: 'Table of 5', emoji: '🪑' },
  { name: 'Student', emoji: '🎓' },
  { name: 'Couple', emoji: '💑' },
];

// ─── Cloudinary helpers ───────────────────────────────────────────────────────

const uploadToCloudinary = async (file, folder = 'events', onProgress = () => {}) => {
  const data = new FormData();
  data.append('file', file);
  data.append('upload_preset', import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET);
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/image/upload`);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status === 200) resolve(JSON.parse(xhr.responseText).secure_url);
      else reject(new Error(`Upload failed: ${xhr.statusText}`));
    };
    xhr.onerror = () => reject(new Error('Upload failed'));
    xhr.send(data);
  });
};

const compressImage = async (file, maxWidth = 1200, quality = 0.8) => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, maxWidth / img.width);
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      canvas.toBlob(
        (blob) => resolve(new File([blob], file.name, { type: 'image/jpeg' })),
        'image/jpeg', quality,
      );
    };
    img.src = url;
  });
};

// ─── Multi-image uploader ─────────────────────────────────────────────────────

function MultiImageUploader({ images, onAdd, onRemove, maxImages = 10, folder = 'events', label = 'Photos', singleMode = false }) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const slotsLeft = maxImages - images.length;

  const handleFiles = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    const toUpload = singleMode ? [files[0]] : files.slice(0, slotsLeft);
    if (!toUpload.length) { alert(`Maximum ${maxImages} photos allowed`); return; }

    setUploading(true);
    const uploaded = [];
    for (let i = 0; i < toUpload.length; i++) {
      const file = toUpload[i];
      if (!file.type.startsWith('image/')) continue;
      if (file.size > 10 * 1024 * 1024) { alert(`${file.name} is too large. Max 10MB.`); continue; }
      try {
        setProgress(Math.round(((i + 0.5) / toUpload.length) * 100));
        const compressed = await compressImage(file, 1200, 0.8);
        const url = await uploadToCloudinary(compressed, folder, (p) => {
          setProgress(Math.round(((i + p / 100) / toUpload.length) * 100));
        });
        uploaded.push(url);
      } catch (err) {
        console.error('Upload error:', err);
        alert(`Failed to upload ${file.name}: ${err.message}`);
      }
    }
    onAdd(uploaded);
    setUploading(false);
    setProgress(0);
    e.target.value = '';
  };

  return (
    <div className="space-y-3">
      {images.length > 0 && (
        <div className={`grid gap-3 ${singleMode ? 'grid-cols-1' : 'grid-cols-3 sm:grid-cols-4'}`}>
          {images.map((img, i) => (
            <div key={i} className="relative group">
              <img
                src={img}
                alt={`${label} ${i + 1}`}
                className={`w-full object-cover rounded-2xl border-2 ${singleMode ? 'h-48' : 'h-24'} ${i === 0 ? 'border-cyan-400' : 'border-gray-200'}`}
              />
              {i === 0 && !singleMode && (
                <span className="absolute top-1.5 left-1.5 bg-cyan-500 text-white text-xs px-2 py-0.5 rounded-lg font-bold shadow">Main</span>
              )}
              <button
                type="button"
                onClick={() => onRemove(i)}
                className="absolute top-1.5 right-1.5 bg-red-500 hover:bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition shadow"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {images.length < maxImages && (
        <label className={`flex flex-col items-center justify-center gap-3 p-8 border-2 border-dashed rounded-2xl cursor-pointer transition ${
          uploading
            ? 'border-cyan-300 bg-cyan-50 opacity-70 pointer-events-none'
            : 'border-gray-300 hover:border-cyan-400 hover:bg-cyan-50'
        }`}>
          {uploading ? (
            <>
              <div className="w-full max-w-xs bg-gray-200 rounded-full h-2.5">
                <div className="bg-gradient-to-r from-cyan-500 to-blue-600 h-2.5 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
              </div>
              <span className="text-sm text-cyan-600 font-semibold">Uploading {progress}%...</span>
            </>
          ) : (
            <>
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-100 to-blue-100 flex items-center justify-center">
                {images.length === 0 ? <Upload size={24} className="text-cyan-600" /> : <Plus size={24} className="text-cyan-600" />}
              </div>
              <div className="text-center">
                <p className="text-sm font-bold text-cyan-600">
                  {images.length === 0 ? `Upload ${label}` : `Add more photos (${slotsLeft} left)`}
                </p>
                <p className="text-xs text-gray-400 mt-1">PNG, JPG, WEBP · max 10MB each</p>
                {!singleMode && images.length === 0 && (
                  <p className="text-xs text-gray-400">Min 1, max {maxImages} photos</p>
                )}
              </div>
            </>
          )}
          <input type="file" accept="image/*" multiple={!singleMode} disabled={uploading} onChange={handleFiles} className="sr-only" />
        </label>
      )}

      {images.length >= maxImages && (
        <div className="text-center py-3 bg-green-50 rounded-xl border border-green-200">
          <p className="text-sm text-green-600 font-semibold">✅ Maximum {maxImages} photos reached</p>
        </div>
      )}

      {!singleMode && images.length > 0 && (
        <p className="text-xs text-gray-400 flex items-center gap-1.5">
          <span>ℹ️</span> First photo is the main image shown on cards. Hover to remove.
        </p>
      )}
    </div>
  );
}

// ─── Ticket Tier Builder ──────────────────────────────────────────────────────

function TicketTierBuilder({ tiers, onChange, errors }) {
  const addTier = () => {
    if (tiers.length >= 5) return;
    onChange([...tiers, {
      id: `tier_${Date.now()}`,
      name: '',
      price: '',
      benefits: '',
      quantity: '',
      saleEndDate: '',
    }]);
  };

  const removeTier = (index) => {
    onChange(tiers.filter((_, i) => i !== index));
  };

  const updateTier = (index, field, value) => {
    const updated = tiers.map((t, i) => i === index ? { ...t, [field]: value } : t);
    onChange(updated);
  };

  const applyPreset = (index, preset) => {
    updateTier(index, 'name', preset.name);
  };

  return (
    <div className="space-y-4">
      {tiers.length === 0 && (
        <div className="text-center py-8 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
          <div className="text-4xl mb-3">🎟️</div>
          <p className="text-sm font-bold text-gray-700 mb-1">No ticket tiers yet</p>
          <p className="text-xs text-gray-400 mb-4">Add tiers like Regular, VIP, Early Bird, Table of 5</p>
          <button
            type="button"
            onClick={addTier}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-xl text-sm font-bold hover:from-cyan-700 hover:to-blue-700 transition shadow-md"
          >
            <Plus size={16} /> Add First Tier
          </button>
        </div>
      )}

      {tiers.map((tier, index) => (
        <div key={tier.id} className="border-2 border-gray-100 rounded-2xl p-5 bg-white shadow-sm">
          {/* Tier header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white text-xs font-black">
                {index + 1}
              </div>
              <span className="text-sm font-black text-gray-800">
                {tier.name || `Tier ${index + 1}`}
              </span>
              {index === 0 && (
                <span className="text-xs bg-cyan-100 text-cyan-700 px-2 py-0.5 rounded-full font-semibold">Default</span>
              )}
            </div>
            {tiers.length > 1 && (
              <button
                type="button"
                onClick={() => removeTier(index)}
                className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
              >
                <Trash2 size={15} />
              </button>
            )}
          </div>

          {/* Quick presets */}
          <div className="flex flex-wrap gap-1.5 mb-4">
            {TIER_PRESETS.map(p => (
              <button
                key={p.name}
                type="button"
                onClick={() => applyPreset(index, p)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition ${
                  tier.name === p.name
                    ? 'bg-cyan-600 text-white border-cyan-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-cyan-400'
                }`}
              >
                {p.emoji} {p.name}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Tier Name */}
            <div className="col-span-2">
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Tier Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={tier.name}
                onChange={(e) => updateTier(index, 'name', e.target.value)}
                placeholder="e.g. Regular, VIP, Early Bird"
                className={`w-full px-3 py-2.5 border-2 rounded-xl text-sm focus:outline-none transition ${
                  errors?.[`tier_${index}_name`] ? 'border-red-300 bg-red-50' : 'border-gray-200 focus:border-cyan-500'
                }`}
              />
              {errors?.[`tier_${index}_name`] && (
                <p className="text-xs text-red-500 mt-1">{errors[`tier_${index}_name`]}</p>
              )}
            </div>

            {/* Price */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Price (₦) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={tier.price}
                onChange={(e) => updateTier(index, 'price', e.target.value)}
                placeholder="5000"
                min="0"
                className={`w-full px-3 py-2.5 border-2 rounded-xl text-sm focus:outline-none transition ${
                  errors?.[`tier_${index}_price`] ? 'border-red-300 bg-red-50' : 'border-gray-200 focus:border-cyan-500'
                }`}
              />
              {errors?.[`tier_${index}_price`] && (
                <p className="text-xs text-red-500 mt-1">{errors[`tier_${index}_price`]}</p>
              )}
            </div>

            {/* Quantity */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Quantity <span className="text-gray-400">(optional)</span>
              </label>
              <input
                type="number"
                value={tier.quantity}
                onChange={(e) => updateTier(index, 'quantity', e.target.value)}
                placeholder="e.g. 100"
                min="1"
                className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-cyan-500 transition"
              />
            </div>

            {/* Benefits */}
            <div className="col-span-2">
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Benefits / Description <span className="text-gray-400">(optional)</span>
              </label>
              <input
                type="text"
                value={tier.benefits}
                onChange={(e) => updateTier(index, 'benefits', e.target.value)}
                placeholder="e.g. General admission + free drink"
                className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-cyan-500 transition"
              />
            </div>

            {/* Sale End Date */}
            <div className="col-span-2">
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Sale Ends <span className="text-gray-400">(optional — for Early Bird deadlines)</span>
              </label>
              <input
                type="date"
                value={tier.saleEndDate}
                onChange={(e) => updateTier(index, 'saleEndDate', e.target.value)}
                className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-cyan-500 transition"
              />
            </div>
          </div>
        </div>
      ))}

      {tiers.length > 0 && tiers.length < 5 && (
        <button
          type="button"
          onClick={addTier}
          className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-cyan-300 rounded-2xl text-sm font-bold text-cyan-600 hover:bg-cyan-50 hover:border-cyan-500 transition"
        >
          <Plus size={16} /> Add Another Tier ({tiers.length}/5)
        </button>
      )}

      {tiers.length >= 5 && (
        <p className="text-center text-xs text-gray-400 py-2">Maximum 5 tiers reached</p>
      )}
    </div>
  );
}

// ─── Progress bar ─────────────────────────────────────────────────────────────

function ProgressBar({ current, total }) {
  const pct = Math.round((current / total) * 100);
  return (
    <div className="mb-8">
      <div className="flex justify-between items-center mb-2">
        <span className="text-xs font-bold text-cyan-600 uppercase tracking-wider">Step {current} of {total}</span>
        <span className="text-xs text-gray-400 font-medium">{pct}% complete</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className="bg-gradient-to-r from-cyan-500 to-blue-600 h-2 rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ─── Reusable UI ──────────────────────────────────────────────────────────────

function ToggleButton({ selected, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-3 rounded-xl border-2 text-sm font-bold transition-all duration-200 ${
        selected
          ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white border-cyan-600 shadow-md'
          : 'bg-white text-gray-700 border-gray-200 hover:border-cyan-400'
      }`}
    >
      {children}
    </button>
  );
}

function FormField({ label, required, error, hint, children }) {
  return (
    <div>
      <label className="block text-sm font-bold text-gray-800 mb-1.5">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-gray-400 mt-1.5">{hint}</p>}
      {error && <p className="text-xs text-red-500 mt-1.5 font-semibold">{error}</p>}
    </div>
  );
}

function StyledInput({ error, className = '', ...props }) {
  return (
    <input
      {...props}
      className={`w-full px-4 py-3 border-2 rounded-xl text-sm focus:outline-none transition-colors ${
        error ? 'border-red-300 focus:border-red-500 bg-red-50' : 'border-gray-200 focus:border-cyan-500'
      } ${className}`}
    />
  );
}

function StyledSelect({ error, children, ...props }) {
  return (
    <select
      {...props}
      className={`w-full px-4 py-3 border-2 rounded-xl text-sm focus:outline-none transition-colors appearance-none bg-white ${
        error ? 'border-red-300 focus:border-red-500 bg-red-50' : 'border-gray-200 focus:border-cyan-500'
      }`}
    >
      {children}
    </select>
  );
}

function StyledTextarea({ error, ...props }) {
  return (
    <textarea
      {...props}
      className={`w-full px-4 py-3 border-2 rounded-xl text-sm focus:outline-none transition-colors resize-none ${
        error ? 'border-red-300 focus:border-red-500 bg-red-50' : 'border-gray-200 focus:border-cyan-500'
      }`}
    />
  );
}

function NavButtons({ onBack, onNext, nextLabel = 'Continue', isSubmitting = false }) {
  return (
    <div className="flex gap-3 mt-8">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-2 px-6 py-3.5 border-2 border-gray-200 rounded-2xl text-sm font-bold text-gray-600 hover:bg-gray-50 transition"
      >
        <ChevronLeft size={16} /> Back
      </button>
      <button
        type="button"
        onClick={onNext}
        disabled={isSubmitting}
        className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-black transition-all bg-gradient-to-r from-cyan-600 to-blue-600 text-white hover:from-cyan-700 hover:to-blue-700 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting ? (
          <>
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Submitting...
          </>
        ) : (
          <>{nextLabel} <ChevronRight size={16} /></>
        )}
      </button>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

const SubmitEventPage = () => {
  const topRef = useRef(null);
  const [listingType, setListingType] = useState('');
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [universities, setUniversities] = useState([]);
  const [showTerms, setShowTerms] = useState(false);

  const [eventImages, setEventImages] = useState([]);
  const [vendorImages, setVendorImages] = useState([]);
  const [schoolIdImage, setSchoolIdImage] = useState([]);

  // ✅ Ticket tiers state
  const [ticketTiers, setTicketTiers] = useState([]);

  const [form, setForm] = useState({
    organizerName: '', organizerEmail: '', organizerPhone: '',
    organizationName: '', referralCode: '',
    eventTitle: '', eventCategory: '', customCategory: '',
    eventType: 'physical', eventDescription: '',
    isUniversityEvent: false, universityName: '',
    startDate: '', startTime: '', endDate: '', endTime: '',
    operatingHours: '', alwaysOpen: false,
    city: '', customCity: '', venueName: '', address: '', mapsLink: '',
    platform: '', webinarLink: '',
    isFree: 'yes', ticketPrice: '',
    wantOutingstationTicketing: 'no', externalTicketLink: '',
    useTicketTiers: false,
    additionalInfo: '', agreedToTerms: false,
    shopName: '', vendorCategory: '',
    vendorUniversity: '', vendorUniversityOther: '',
    vendorDescription: '', whatsappNumber: '',
  });

  useEffect(() => {
    getDocs(collection(db, 'universities'))
      .then(snap => {
        const unis = snap.docs.map(d => d.data().name).filter(Boolean);
        setUniversities(unis.length ? unis : DEFAULT_UNIS);
      })
      .catch(() => setUniversities(DEFAULT_UNIS));
  }, []);

  const set = (key, val) => {
    setForm(p => ({ ...p, [key]: val }));
    if (errors[key]) setErrors(p => ({ ...p, [key]: '' }));
  };

  const handle = (e) => {
    const { name, value, type, checked } = e.target;
    set(name, type === 'checkbox' ? checked : value);
  };

  const scrollTop = () => topRef.current?.scrollIntoView({ behavior: 'smooth' });

  const isVendor = listingType === 'vendor';
  const isEvent  = listingType === 'event';
  const isPlace  = listingType === 'place';

  const isPureVirtual = isEvent && form.eventType === 'webinar';
  const isHybrid      = isEvent && form.eventType === 'hybrid';
  const isVirtual     = isPureVirtual || isHybrid;
  const isPhysical    = isPlace || (isEvent && (form.eventType === 'physical' || isHybrid));

  const S = (() => {
    if (isVendor) {
      return { info:1, shop:2, uniId:3, photos:4, review:5, total:5 };
    }
    if (isPlace) {
      return { info:1, details:2, hours:3, location:4, ticket:5, photos:6, review:7, total:7 };
    }
    if (isPureVirtual) {
      return { info:1, details:2, datetime:3, virtual:4, ticket:5, photos:6, review:7, total:7 };
    }
    if (isHybrid) {
      return { info:1, details:2, datetime:3, location:4, virtual:5, ticket:6, photos:7, review:8, total:8 };
    }
    return { info:1, details:2, datetime:3, location:4, ticket:5, photos:6, review:7, total:7 };
  })();

  const totalSteps = S.total;

  const stepNames = (() => {
    if (isVendor) return { 1:'Your Info', 2:'Shop Details', 3:'University & ID', 4:'Shop Photos', 5:'Review & Submit' };
    if (isPlace)  return { 1:'Your Info', 2:'Place Details', 3:'Operating Hours', 4:'Location', 5:'Entry Fee', 6:'Photos', 7:'Review & Submit' };
    if (isPureVirtual) return { 1:'Your Info', 2:'Event Details', 3:'Date & Time', 4:'Virtual Details', 5:'Ticketing', 6:'Photos', 7:'Review & Submit' };
    if (isHybrid)      return { 1:'Your Info', 2:'Event Details', 3:'Date & Time', 4:'Location', 5:'Virtual Details', 6:'Ticketing', 7:'Photos', 8:'Review & Submit' };
    return { 1:'Your Info', 2:'Event Details', 3:'Date & Time', 4:'Location', 5:'Ticketing', 6:'Photos', 7:'Review & Submit' };
  })();

  // ─── Validation ───────────────────────────────────────────────────────────

  const validateStep = (s) => {
    const e = {};

    if (s === S.info) {
      if (!form.organizerName.trim()) e.organizerName = 'Your name is required';
      if (!form.organizerEmail.trim()) e.organizerEmail = 'Email is required';
      else if (!/\S+@\S+\.\S+/.test(form.organizerEmail)) e.organizerEmail = 'Enter a valid email';
      if (!form.organizerPhone.trim()) e.organizerPhone = 'Phone number is required';
    }

    if (isVendor && s === S.shop) {
      if (!form.shopName.trim()) e.shopName = 'Shop name is required';
      if (!form.vendorCategory) e.vendorCategory = 'Select a category';
      if (!form.vendorDescription.trim()) e.vendorDescription = 'Description is required';
      if (form.vendorDescription.trim().length < 20) e.vendorDescription = 'At least 20 characters required';
      if (!form.whatsappNumber.trim()) e.whatsappNumber = 'WhatsApp number is required';
    }

    if (isVendor && s === S.uniId) {
      if (!form.vendorUniversity) e.vendorUniversity = 'Select your university';
      if (form.vendorUniversity === 'Other' && !form.vendorUniversityOther.trim()) e.vendorUniversityOther = 'Enter your university name';
      if (schoolIdImage.length === 0) e.schoolId = 'School ID / matric card photo is required';
    }

    if (isVendor && s === S.photos) {
      if (vendorImages.length === 0) e.vendorImage = 'At least 1 shop photo is required';
    }

    if (!isVendor && s === S.details) {
      if (!form.eventTitle.trim()) e.eventTitle = isPlace ? 'Place name is required' : 'Event title is required';
      if (!form.eventCategory) e.eventCategory = 'Select a category';
      if (form.eventCategory === 'Other' && !form.customCategory.trim()) e.customCategory = 'Please specify your category';
      if (form.eventDescription.length < 100) e.eventDescription = 'At least 100 characters required';
      if (isEvent && form.isUniversityEvent && !form.universityName.trim()) e.universityName = 'Enter the university name';
    }

    if (isEvent && s === S.datetime) {
      if (!form.startDate) e.startDate = 'Start date is required';
      if (!form.startTime) e.startTime = 'Start time is required';
      if (form.endDate && form.startDate) {
        const start = new Date(`${form.startDate}T${form.startTime || '00:00'}`);
        const end   = new Date(`${form.endDate}T${form.endTime || '23:59'}`);
        if (end < start) e.endDate = 'End date cannot be before start date';
      }
    }

    if (isPlace && s === S.hours) {
      if (!form.alwaysOpen && !form.operatingHours.trim()) e.operatingHours = 'Enter operating hours or check "Always Open"';
    }

    if (!isVendor && S.location && s === S.location) {
      if (!form.city) e.city = 'City is required';
      if (form.city === 'Others' && !form.customCity.trim()) e.customCity = 'Enter your city';
      if (!form.venueName.trim()) e.venueName = isPlace ? 'Place name is required' : 'Venue name is required';
      if (!form.address.trim()) e.address = 'Address is required';
    }

    if (isVirtual && S.virtual && s === S.virtual) {
      if (!form.platform) e.platform = 'Select a platform';
      if (!form.webinarLink.trim()) e.webinarLink = 'Registration link is required';
    }

    // ✅ Ticketing validation — supports tiers
    if (!isVendor && s === S.ticket && form.isFree === 'no') {
      if (isEvent && form.wantOutingstationTicketing === 'yes' && form.useTicketTiers) {
        // Validate tiers
        if (ticketTiers.length === 0) {
          e.ticketTiers = 'Add at least 1 ticket tier';
        } else {
          ticketTiers.forEach((tier, i) => {
            if (!tier.name.trim()) e[`tier_${i}_name`] = 'Tier name is required';
            if (!tier.price || isNaN(tier.price) || Number(tier.price) < 0) e[`tier_${i}_price`] = 'Valid price is required';
          });
        }
      } else {
        if (!form.ticketPrice.trim()) e.ticketPrice = isPlace ? 'Enter the entry fee' : 'Enter ticket price';
        if (isEvent && form.wantOutingstationTicketing === 'no' && !form.externalTicketLink.trim()) e.externalTicketLink = 'Ticket link is required';
        if (isPlace && !form.externalTicketLink.trim()) e.externalTicketLink = 'Ticket link is required';
      }
    }

    if (!isVendor && s === S.photos) {
      if (eventImages.length === 0) e.eventImage = 'At least 1 image is required';
    }

    if (s === S.review) {
      if (!form.agreedToTerms) e.agreedToTerms = 'Please agree to the terms to submit';
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const next = () => {
    if (!validateStep(step)) { scrollTop(); return; }
    setStep(s => s + 1);
    scrollTop();
  };

  const back = () => {
    setErrors({});
    if (step === 1) { setStep(0); setListingType(''); }
    else setStep(s => s - 1);
    scrollTop();
  };

  // ─── Submit ───────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!validateStep(step)) { scrollTop(); return; }
    setIsSubmitting(true);
    try {
      if (isVendor) {
        const [imageUrl = '', ...additionalImages] = vendorImages;
        const finalUniversity = form.vendorUniversity === 'Other' ? form.vendorUniversityOther : form.vendorUniversity;
        await addDoc(collection(db, 'vendor_submissions'), {
          organizerName: form.organizerName,
          organizerEmail: form.organizerEmail,
          organizerPhone: form.organizerPhone,
          shopName: form.shopName,
          category: form.vendorCategory,
          university: finalUniversity,
          description: form.vendorDescription,
          whatsappNumber: form.whatsappNumber,
          imageUrl,
          images: additionalImages,
          schoolIdImageUrl: schoolIdImage[0] || '',
          referralCode: form.referralCode.trim().toUpperCase() || null,
          status: 'pending',
          submittedAt: serverTimestamp(),
        });
      } else {
        const [imageUrl = '', ...additionalImages] = eventImages;
        const finalCategory = form.eventCategory === 'Other' && form.customCategory.trim()
          ? form.customCategory.trim() : form.eventCategory;
        const finalCity = form.city === 'Others' && form.customCity.trim()
          ? form.customCity.trim() : form.city;

        // ✅ Build ticket tiers data
        const hasTiers = isEvent && form.wantOutingstationTicketing === 'yes' && form.useTicketTiers && ticketTiers.length > 0;
        const tiersData = hasTiers ? ticketTiers.map((t, i) => ({
          id: `tier_${i + 1}`,
          name: t.name.trim(),
          price: parseFloat(t.price) || 0,
          benefits: t.benefits.trim() || null,
          quantity: t.quantity ? parseInt(t.quantity) : null,
          sold: 0,
          saleEndDate: t.saleEndDate || null,
        })) : [];

        await addDoc(collection(db, 'event_submissions'), {
          organizerName: form.organizerName,
          organizerEmail: form.organizerEmail,
          organizerPhone: form.organizerPhone,
          organizationName: form.organizationName || null,
          referralCode: form.referralCode.trim().toUpperCase() || null,
          listingType,
          subCategory: isPlace ? 'places' : (form.isUniversityEvent ? 'campus' : 'events'),
          eventTitle: form.eventTitle,
          eventCategory: finalCategory,
          eventType: isEvent ? form.eventType : 'physical',
          eventDescription: form.eventDescription,
          startDate: isEvent ? form.startDate : null,
          startTime: isEvent ? form.startTime : null,
          endDate: isEvent ? (form.endDate || form.startDate) : null,
          endTime: isEvent ? (form.endTime || form.startTime) : null,
          operatingHours: isPlace ? (form.alwaysOpen ? 'Always Open' : form.operatingHours) : null,
          alwaysOpen: isPlace ? form.alwaysOpen : false,
          city: finalCity,
          venueName: form.venueName,
          address: form.address,
          mapsLink: form.mapsLink || null,
          platform: form.platform || null,
          webinarLink: form.webinarLink || null,
          isFree: form.isFree === 'yes',
          // ✅ If tiers exist, use lowest tier price as base price
          ticketPrice: hasTiers
            ? Math.min(...tiersData.map(t => t.price))
            : (form.isFree === 'yes' ? 0 : parseFloat(form.ticketPrice) || 0),
          wantOutingstationTicketing: form.wantOutingstationTicketing === 'yes',
          externalTicketLink: form.externalTicketLink || null,
          // ✅ Ticket tiers
          ticketTiers: tiersData,
          hasTicketTiers: hasTiers,
          imageUrl,
          images: additionalImages,
          additionalInfo: form.additionalInfo || null,
          isUniversityEvent: form.isUniversityEvent || false,
          universityName: form.universityName || null,
          status: 'pending',
          submittedAt: serverTimestamp(),
          slug: form.eventTitle
    ? form.eventTitle.toLowerCase().trim()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
    : null,
        });
      }
      setSubmitSuccess(true);
      scrollTop();
    } catch (err) {
      console.error('Submission error:', err);
      alert('Submission failed. ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── Success screen ───────────────────────────────────────────────────────

  if (submitSuccess) {
    const title = isVendor ? form.shopName : form.eventTitle;
    const type  = isVendor ? 'Vendor' : isPlace ? 'Place' : 'Event';
    return (
      <div className="min-h-screen bg-gradient-to-br from-cyan-50 to-blue-50 flex items-center justify-center px-4 py-16">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-10 text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg">
            <Check size={36} className="text-white" />
          </div>
          <h2 className="text-2xl font-black text-gray-900 mb-2">{type} Submitted! 🎉</h2>
          <p className="text-gray-500 text-sm mb-1">
            <span className="font-bold text-gray-800">"{title}"</span> is under review
          </p>
          <p className="text-xs text-gray-400 mb-8">
            We'll email you at <strong>{form.organizerEmail}</strong> within 24–48 hours
          </p>
          <div className="bg-gradient-to-br from-cyan-50 to-blue-50 rounded-2xl p-5 mb-8 text-left space-y-3">
            {[
              '✅ Our team reviews within 24–48 hours',
              "📧 You'll get an email update on approval",
              form.referralCode ? '💰 Earn ₦100 credits when approved!' : null,
              '🚀 Once approved, you go live immediately',
            ].filter(Boolean).map((item, i) => (
              <p key={i} className="text-sm text-gray-700">{item}</p>
            ))}
          </div>
          <div className="space-y-3">
            <a href="/"
              className="block w-full bg-gradient-to-r from-cyan-600 to-blue-600 text-white py-4 rounded-2xl font-black text-base hover:from-cyan-700 hover:to-blue-700 transition shadow-lg">
              Back to Home
            </a>
            <button
              onClick={() => {
                setSubmitSuccess(false);
                setStep(0);
                setListingType('');
                setEventImages([]);
                setVendorImages([]);
                setSchoolIdImage([]);
                setTicketTiers([]);
                setForm(f => ({ ...f, agreedToTerms: false, useTicketTiers: false }));
              }}
              className="w-full border-2 border-gray-200 text-gray-700 py-4 rounded-2xl font-bold hover:bg-gray-50 transition"
            >
              Submit Another {type}
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-6">
            Questions? <a href="mailto:admin@outingstation.com" className="text-cyan-600 hover:underline">admin@outingstation.com</a>
          </p>
        </div>
      </div>
    );
  }

  // ─── Step 0: Type picker ──────────────────────────────────────────────────

  if (step === 0) {
    return (
      <div ref={topRef} className="min-h-screen bg-gradient-to-br from-gray-50 to-cyan-50 py-12 px-4">
        <div className="max-w-lg mx-auto">
          <div className="text-center mb-10">
            <h1 className="text-4xl md:text-5xl font-black text-gray-900 mb-3 leading-tight">
              List on<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-500 to-blue-600">
                OutingStation
              </span>
            </h1>
            <p className="text-gray-500 text-base">What would you like to list today?</p>
          </div>

          <div className="space-y-4 mb-10">
            {[
              { value: 'event', icon: '🎉', title: 'Event', desc: 'Concert, festival, workshop, conference, party', color: 'from-cyan-500 to-blue-600' },
              { value: 'place', icon: '🏛️', title: 'Place or Venue', desc: 'Museum, restaurant, cinema, park, spa, mall', color: 'from-purple-500 to-pink-500' },
              { value: 'vendor', icon: '🛒', title: 'Campus Vendor', desc: 'Food stall, fashion, accessories, gadgets on campus', color: 'from-emerald-500 to-cyan-500' },
            ].map(item => (
              <button
                key={item.value}
                type="button"
                onClick={() => {
                  setListingType(item.value);
                  setEventImages([]);
                  setVendorImages([]);
                  setSchoolIdImage([]);
                  setTicketTiers([]);
                  setStep(1);
                  scrollTop();
                }}
                className="w-full flex items-center gap-5 p-5 bg-white rounded-2xl border-2 border-gray-100 hover:border-cyan-400 hover:shadow-lg transition-all text-left group"
              >
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${item.color} flex items-center justify-center text-2xl flex-shrink-0 shadow-md`}>
                  {item.icon}
                </div>
                <div className="flex-1">
                  <p className="font-black text-gray-900 text-base">{item.title}</p>
                  <p className="text-sm text-gray-500 mt-0.5">{item.desc}</p>
                </div>
                <ChevronRight size={20} className="text-gray-300 group-hover:text-cyan-500 transition" />
              </button>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-3 text-center">
            {[
              { icon: '📱', label: 'Massive Reach', sub: 'Thousands daily' },
              { icon: '💰', label: '100% Free', sub: 'Zero fees' },
              { icon: '⚡', label: 'Fast Review', sub: '24–48 hours' },
            ].map((b, i) => (
              <div key={i} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                <div className="text-2xl mb-1">{b.icon}</div>
                <p className="text-xs font-bold text-gray-800">{b.label}</p>
                <p className="text-xs text-gray-400">{b.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ─── Form wizard ──────────────────────────────────────────────────────────

  const isLastStep = step === totalSteps;
  const typeLabel = isVendor ? '🛒 Campus Vendor' : isEvent ? '🎉 Event' : '🏛️ Place/Venue';
  const currentStepName = stepNames[step] || '';

  return (
    <div ref={topRef} className="min-h-screen bg-gradient-to-br from-gray-50 to-cyan-50 py-10 px-4">
      <div className="max-w-xl mx-auto">

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={back}
            className="w-10 h-10 rounded-xl bg-white border-2 border-gray-200 flex items-center justify-center hover:border-cyan-400 transition flex-shrink-0 shadow-sm"
          >
            <ChevronLeft size={18} className="text-gray-600" />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-cyan-600 font-bold uppercase tracking-wider">{typeLabel}</p>
            <p className="text-lg font-black text-gray-900 truncate">{currentStepName}</p>
          </div>
        </div>

        {/* Progress */}
        <ProgressBar current={step} total={totalSteps} />

        {/* Card */}
        <div className="bg-white rounded-3xl border-2 border-gray-100 shadow-xl p-6 sm:p-8">

          {/* ══ STEP 1: Your Info ══ */}
          {step === S.info && (
            <div className="space-y-5">
              <div className="mb-2">
                <h2 className="text-xl font-black text-gray-900">Your Information</h2>
                <p className="text-sm text-gray-400 mt-1">We'll use this to contact you about your listing</p>
              </div>
              <FormField label="Full Name" required error={errors.organizerName}>
                <StyledInput name="organizerName" value={form.organizerName} onChange={handle}
                  error={errors.organizerName} placeholder="John Doe" />
              </FormField>
              <FormField label="Email Address" required error={errors.organizerEmail}>
                <StyledInput type="email" name="organizerEmail" value={form.organizerEmail} onChange={handle}
                  error={errors.organizerEmail} placeholder="john@example.com" />
              </FormField>
              <FormField label="Phone Number" required error={errors.organizerPhone}>
                <StyledInput type="tel" name="organizerPhone" value={form.organizerPhone} onChange={handle}
                  error={errors.organizerPhone} placeholder="+234 801 234 5678" />
              </FormField>
              {!isVendor && (
                <FormField label="Organization Name" hint="Optional — company, school, or group name">
                  <StyledInput name="organizationName" value={form.organizationName} onChange={handle}
                    placeholder="Company Ltd (optional)" />
                </FormField>
              )}
              <FormField label="Referral Code" hint="💰 Have a code? Earn ₦100 credits when your listing is approved!">
                <div className="relative">
                  <Gift className="absolute left-3.5 top-1/2 -translate-y-1/2 text-purple-400" size={16} />
                  <StyledInput name="referralCode" value={form.referralCode} onChange={handle}
                    placeholder="JOHN2024" maxLength={12} className="!pl-10 uppercase tracking-widest" />
                </div>
              </FormField>
            </div>
          )}

          {/* ══ VENDOR: Shop Details ══ */}
          {isVendor && step === S.shop && (
            <div className="space-y-5">
              <div className="mb-2">
                <h2 className="text-xl font-black text-gray-900">Shop Details</h2>
                <p className="text-sm text-gray-400 mt-1">Tell students what your campus shop is about</p>
              </div>
              <FormField label="Shop Name" required error={errors.shopName}>
                <StyledInput name="shopName" value={form.shopName} onChange={handle}
                  error={errors.shopName} placeholder="e.g. Mama Tee Kitchen, Jay Accessories" />
              </FormField>
              <FormField label="Category" required error={errors.vendorCategory}>
                <StyledSelect name="vendorCategory" value={form.vendorCategory} onChange={handle} error={errors.vendorCategory}>
                  <option value="">Select a category</option>
                  {VENDOR_CATEGORIES.map(c => (
                    <option key={c.value} value={c.value}>{c.emoji} {c.value}</option>
                  ))}
                </StyledSelect>
              </FormField>
              <FormField label="Description" required error={errors.vendorDescription}
                hint={`${form.vendorDescription.length} / 20 characters minimum`}>
                <StyledTextarea name="vendorDescription" value={form.vendorDescription} onChange={handle}
                  error={errors.vendorDescription} rows={3}
                  placeholder="What do you sell? e.g. Best jollof rice on campus, affordable and tasty meals daily" />
              </FormField>
              <FormField label="WhatsApp Number" required error={errors.whatsappNumber}
                hint="Students will contact you directly on WhatsApp">
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-base leading-none">📱</span>
                  <StyledInput type="tel" name="whatsappNumber" value={form.whatsappNumber} onChange={handle}
                    error={errors.whatsappNumber} placeholder="+234 800 000 0000" className="!pl-10" />
                </div>
              </FormField>
            </div>
          )}

          {/* ══ VENDOR: University + School ID ══ */}
          {isVendor && step === S.uniId && (
            <div className="space-y-5">
              <div className="mb-2">
                <h2 className="text-xl font-black text-gray-900">University & Verification</h2>
                <p className="text-sm text-gray-400 mt-1">We verify all vendors are active campus members</p>
              </div>
              <FormField label="Your University / Campus" required error={errors.vendorUniversity}>
                <StyledSelect name="vendorUniversity" value={form.vendorUniversity} onChange={handle} error={errors.vendorUniversity}>
                  <option value="">Select your university</option>
                  {universities.map(u => <option key={u} value={u}>{u}</option>)}
                  <option value="Other">Other (not listed)</option>
                </StyledSelect>
              </FormField>
              {form.vendorUniversity === 'Other' && (
                <FormField label="University Name" required error={errors.vendorUniversityOther}>
                  <StyledInput name="vendorUniversityOther" value={form.vendorUniversityOther} onChange={handle}
                    error={errors.vendorUniversityOther} placeholder="Enter your university name" />
                </FormField>
              )}
              <div>
                <label className="block text-sm font-bold text-gray-800 mb-1.5">
                  School ID / Matric Card <span className="text-red-500">*</span>
                </label>
                <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-4 mb-3">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">🪪</span>
                    <div>
                      <p className="text-sm font-bold text-amber-800">Why we need this</p>
                      <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                        To protect students, we verify all campus vendors are active students or authorized campus traders.
                        Your ID is kept private and only used for verification — it will never be shown publicly.
                      </p>
                    </div>
                  </div>
                </div>
                <MultiImageUploader
                  images={schoolIdImage}
                  onAdd={(urls) => setSchoolIdImage([urls[0]])}
                  onRemove={() => setSchoolIdImage([])}
                  maxImages={1}
                  folder="school-ids"
                  label="School ID"
                  singleMode
                />
                {errors.schoolId && <p className="text-xs text-red-500 mt-1.5 font-semibold">{errors.schoolId}</p>}
              </div>
            </div>
          )}

          {/* ══ VENDOR: Shop Photos ══ */}
          {isVendor && step === S.photos && (
            <div className="space-y-5">
              <div className="mb-2">
                <h2 className="text-xl font-black text-gray-900">Shop Photos</h2>
                <p className="text-sm text-gray-400 mt-1">Show your products, menu or shop interior. More photos = more trust from students!</p>
              </div>
              <MultiImageUploader
                images={vendorImages}
                onAdd={(urls) => setVendorImages(p => [...p, ...urls].slice(0, 10))}
                onRemove={(i) => setVendorImages(p => p.filter((_, idx) => idx !== i))}
                maxImages={10}
                folder="vendors"
                label="Shop photos"
              />
              {errors.vendorImage && <p className="text-xs text-red-500 mt-1 font-semibold">{errors.vendorImage}</p>}
            </div>
          )}

          {/* ══ EVENT / PLACE: Details ══ */}
          {!isVendor && step === S.details && (
            <div className="space-y-5">
              <div className="mb-2">
                <h2 className="text-xl font-black text-gray-900">{isPlace ? 'Place Details' : 'Event Details'}</h2>
                <p className="text-sm text-gray-400 mt-1">Tell people what this {isPlace ? 'place' : 'event'} is about</p>
              </div>
              <FormField label={isPlace ? 'Place Name' : 'Event Title'} required error={errors.eventTitle}>
                <StyledInput name="eventTitle" value={form.eventTitle} onChange={handle}
                  error={errors.eventTitle}
                  placeholder={isPlace ? 'National Museum Lagos' : 'Lagos Music Festival 2026'} />
              </FormField>
              <FormField label="Category" required error={errors.eventCategory}>
                <StyledSelect name="eventCategory" value={form.eventCategory} onChange={handle} error={errors.eventCategory}>
                  <option value="">Select a category</option>
                  {(isPlace ? PLACE_CATEGORIES : EVENT_CATEGORIES).map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </StyledSelect>
              </FormField>
              {form.eventCategory === 'Other' && (
                <FormField label="Specify Category" required error={errors.customCategory}>
                  <StyledInput name="customCategory" value={form.customCategory} onChange={handle}
                    error={errors.customCategory} placeholder="e.g. Wellness & Yoga" />
                </FormField>
              )}
              {isEvent && (
                <FormField label="Event Type" required>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { value: 'physical', label: '📍 Physical' },
                      { value: 'webinar',  label: '💻 Virtual' },
                      { value: 'hybrid',   label: '🔀 Hybrid' },
                    ].map(t => (
                      <ToggleButton key={t.value} selected={form.eventType === t.value}
                        onClick={() => set('eventType', t.value)}>
                        {t.label}
                      </ToggleButton>
                    ))}
                  </div>
                  {isPureVirtual && (
                    <p className="text-xs text-blue-500 mt-2 font-medium">💡 Virtual events skip the location step</p>
                  )}
                </FormField>
              )}
              {isEvent && (
                <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-4">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input type="checkbox" name="isUniversityEvent" checked={form.isUniversityEvent}
                      onChange={handle} className="mt-0.5 h-4 w-4 rounded text-blue-600" />
                    <div>
                      <p className="text-sm font-bold text-gray-800">🎓 This is a University/Campus Event</p>
                      <p className="text-xs text-gray-500 mt-0.5">Check if your event is happening at a university campus</p>
                    </div>
                  </label>
                {form.isUniversityEvent && (
                    <div className="mt-3">
                      <StyledSelect name="universityName" value={form.universityName} onChange={handle}
                        error={errors.universityName}>
                        <option value="">Select your university</option>
                        {universities.map(u => <option key={u} value={u}>{u}</option>)}
                      </StyledSelect>
                      {errors.universityName && <p className="text-xs text-red-500 mt-1 font-semibold">{errors.universityName}</p>}
                    </div>
                  )}
                </div>
              )}
              <FormField label="Description" required error={errors.eventDescription}
                hint={`${form.eventDescription.length} / 100 characters minimum`}>
                <StyledTextarea name="eventDescription" value={form.eventDescription} onChange={handle}
                  error={errors.eventDescription} rows={5}
                  placeholder={isPlace ? 'Describe what visitors can expect...' : 'Describe your event — what happens, who should attend, what to expect...'} />
              </FormField>
            </div>
          )}

          {/* ══ EVENT: Date & Time ══ */}
          {isEvent && step === S.datetime && (
            <div className="space-y-5">
              <div className="mb-2">
                <h2 className="text-xl font-black text-gray-900">Date & Time</h2>
                <p className="text-sm text-gray-400 mt-1">When does your event take place?</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Start Date" required error={errors.startDate}>
                  <StyledInput type="date" name="startDate" value={form.startDate} onChange={handle} error={errors.startDate} />
                </FormField>
                <FormField label="Start Time" required error={errors.startTime}>
                  <StyledInput type="time" name="startTime" value={form.startTime} onChange={handle} error={errors.startTime} />
                </FormField>
                <FormField label="End Date" hint="Optional">
                  <StyledInput type="date" name="endDate" value={form.endDate} onChange={handle} error={errors.endDate} />
                  {errors.endDate && <p className="text-xs text-red-500 mt-1 font-semibold">{errors.endDate}</p>}
                </FormField>
                <FormField label="End Time" hint="Optional">
                  <StyledInput type="time" name="endTime" value={form.endTime} onChange={handle} />
                </FormField>
              </div>
            </div>
          )}

          {/* ══ PLACE: Operating Hours ══ */}
          {isPlace && step === S.hours && (
            <div className="space-y-5">
              <div className="mb-2">
                <h2 className="text-xl font-black text-gray-900">Operating Hours</h2>
                <p className="text-sm text-gray-400 mt-1">When is this place open to visitors?</p>
              </div>
              <div className="bg-gray-50 border-2 border-gray-200 rounded-2xl p-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" name="alwaysOpen" checked={form.alwaysOpen} onChange={handle}
                    className="h-5 w-5 rounded text-cyan-600" />
                  <span className="text-sm font-bold text-gray-800">This place is always open (24/7)</span>
                </label>
              </div>
              {!form.alwaysOpen && (
                <FormField label="Operating Hours" required error={errors.operatingHours}
                  hint="e.g. Mon–Fri: 9AM–5PM, Sat–Sun: 10AM–8PM">
                  <StyledTextarea name="operatingHours" value={form.operatingHours} onChange={handle}
                    error={errors.operatingHours} rows={3}
                    placeholder={'Mon–Fri: 9AM–5PM\nSat–Sun: 10AM–8PM'} />
                </FormField>
              )}
            </div>
          )}

          {/* ══ Location ══ */}
          {!isVendor && S.location && step === S.location && (
            <div className="space-y-5">
              <div className="mb-2">
                <h2 className="text-xl font-black text-gray-900">Location</h2>
                <p className="text-sm text-gray-400 mt-1">Where is this {isPlace ? 'place' : 'event'}?</p>
              </div>
              <FormField label="City" required error={errors.city}>
                <StyledSelect name="city" value={form.city} onChange={handle} error={errors.city}>
                  <option value="">Select a city</option>
                  {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                </StyledSelect>
              </FormField>
              {form.city === 'Others' && (
                <FormField label="Your City" required error={errors.customCity}>
                  <StyledInput name="customCity" value={form.customCity} onChange={handle}
                    error={errors.customCity} placeholder="Enter city name" />
                </FormField>
              )}
              <FormField label={isPlace ? 'Place Name' : 'Venue Name'} required error={errors.venueName}>
                <StyledInput name="venueName" value={form.venueName} onChange={handle}
                  error={errors.venueName}
                  placeholder={isPlace ? 'National Museum' : 'Eko Hotel & Suites'} />
              </FormField>
              <FormField label="Full Address" required error={errors.address}>
                <StyledInput name="address" value={form.address} onChange={handle}
                  error={errors.address} placeholder="123 Main Street, Victoria Island, Lagos" />
              </FormField>
              <FormField label="Google Maps Link" hint="Optional but recommended">
                <StyledInput type="url" name="mapsLink" value={form.mapsLink} onChange={handle}
                  placeholder="https://maps.google.com/..." />
              </FormField>
            </div>
          )}

          {/* ══ Virtual Details ══ */}
          {isVirtual && S.virtual && step === S.virtual && (
            <div className="space-y-5">
              <div className="mb-2">
                <h2 className="text-xl font-black text-gray-900">Virtual Event Details</h2>
                <p className="text-sm text-gray-400 mt-1">Where will people join your event online?</p>
              </div>
              <FormField label="Platform" required error={errors.platform}>
                <StyledSelect name="platform" value={form.platform} onChange={handle} error={errors.platform}>
                  <option value="">Select a platform</option>
                  {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
                </StyledSelect>
              </FormField>
              <FormField label="Registration / Join Link" required error={errors.webinarLink}>
                <StyledInput type="url" name="webinarLink" value={form.webinarLink} onChange={handle}
                  error={errors.webinarLink} placeholder="https://zoom.us/webinar/..." />
              </FormField>
            </div>
          )}

          {/* ══ Ticketing — WITH TIERS SUPPORT ══ */}
          {!isVendor && step === S.ticket && (
            <div className="space-y-5">
              <div className="mb-2">
                <h2 className="text-xl font-black text-gray-900">{isPlace ? 'Entry Fee' : 'Ticketing'}</h2>
                <p className="text-sm text-gray-400 mt-1">How much does it cost to {isPlace ? 'enter' : 'attend'}?</p>
              </div>

              <FormField label={isPlace ? 'Is entry free?' : 'Is this event free?'} required>
                <div className="grid grid-cols-2 gap-3">
                  <ToggleButton selected={form.isFree === 'yes'} onClick={() => set('isFree', 'yes')}>✅ Free</ToggleButton>
                  <ToggleButton selected={form.isFree === 'no'} onClick={() => set('isFree', 'no')}>
                    💳 {isPlace ? 'Paid Entry' : 'Paid Event'}
                  </ToggleButton>
                </div>
              </FormField>

              {form.isFree === 'no' && (
                <>
                  {/* OutingStation ticketing toggle */}
                  {isEvent && (
                    <FormField label="Should OutingStation handle ticketing?">
                      <div className="grid grid-cols-2 gap-3">
                        <ToggleButton selected={form.wantOutingstationTicketing === 'yes'}
                          onClick={() => set('wantOutingstationTicketing', 'yes')}>
                          🎫 Yes please!
                        </ToggleButton>
                        <ToggleButton selected={form.wantOutingstationTicketing === 'no'}
                          onClick={() => set('wantOutingstationTicketing', 'no')}>
                          🔗 I have my own
                        </ToggleButton>
                      </div>
                    </FormField>
                  )}

                  {/* ✅ TICKET TIERS SECTION — only for OutingStation ticketing */}
                  {isEvent && form.wantOutingstationTicketing === 'yes' && (
                    <div className="border-2 border-cyan-100 rounded-2xl p-5 bg-gradient-to-br from-cyan-50/50 to-blue-50/50">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <Ticket size={18} className="text-cyan-600" />
                          <div>
                            <p className="text-sm font-black text-gray-900">Multiple Ticket Tiers</p>
                            <p className="text-xs text-gray-500">Regular, VIP, Early Bird, Table of 5...</p>
                          </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={form.useTicketTiers}
                            onChange={(e) => {
                              set('useTicketTiers', e.target.checked);
                              if (e.target.checked && ticketTiers.length === 0) {
                                setTicketTiers([{
                                  id: `tier_${Date.now()}`,
                                  name: 'Regular',
                                  price: '',
                                  benefits: '',
                                  quantity: '',
                                  saleEndDate: '',
                                }]);
                              }
                            }}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-600"></div>
                        </label>
                      </div>

                      {form.useTicketTiers ? (
                        <>
                          <TicketTierBuilder
                            tiers={ticketTiers}
                            onChange={setTicketTiers}
                            errors={errors}
                          />
                          {errors.ticketTiers && (
                            <p className="text-xs text-red-500 mt-2 font-semibold">{errors.ticketTiers}</p>
                          )}
                        </>
                      ) : (
                        <div className="space-y-3">
                          <FormField label="Ticket Price (₦)" required error={errors.ticketPrice}>
                            <StyledInput type="number" name="ticketPrice" value={form.ticketPrice} onChange={handle}
                              error={errors.ticketPrice} placeholder="5000" />
                          </FormField>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Single price for non-OutingStation or place */}
                  {(!isEvent || form.wantOutingstationTicketing === 'no') && (
                    <FormField label={isPlace ? 'Entry Fee (₦)' : 'Ticket Price (₦)'} required error={errors.ticketPrice}>
                      <StyledInput type="number" name="ticketPrice" value={form.ticketPrice} onChange={handle}
                        error={errors.ticketPrice} placeholder="5000" />
                    </FormField>
                  )}

                  {/* External link */}
                  {(isEvent ? form.wantOutingstationTicketing === 'no' : true) && (
                    <FormField label="External Ticket Link" required error={errors.externalTicketLink}>
                      <StyledInput type="url" name="externalTicketLink" value={form.externalTicketLink} onChange={handle}
                        error={errors.externalTicketLink} placeholder="https://eventbrite.com/..." />
                    </FormField>
                  )}
                </>
              )}
            </div>
          )}

          {/* ══ Photos ══ */}
          {!isVendor && step === S.photos && (
            <div className="space-y-5">
              <div className="mb-2">
                <h2 className="text-xl font-black text-gray-900">{isPlace ? 'Place' : 'Event'} Photos</h2>
                <p className="text-sm text-gray-400 mt-1">Add up to 10 photos. Users can swipe through all of them.</p>
              </div>
              <MultiImageUploader
                images={eventImages}
                onAdd={(urls) => setEventImages(p => [...p, ...urls].slice(0, 10))}
                onRemove={(i) => setEventImages(p => p.filter((_, idx) => idx !== i))}
                maxImages={10}
                folder={isPlace ? 'places' : 'events'}
                label={isPlace ? 'Place photos' : 'Event photos'}
              />
              {errors.eventImage && <p className="text-xs text-red-500 mt-1 font-semibold">{errors.eventImage}</p>}
              <FormField label="Anything else we should know?" hint="Dress code, parking, accessibility... (optional)">
                <StyledTextarea name="additionalInfo" value={form.additionalInfo} onChange={handle} rows={3}
                  placeholder={isPlace ? 'Accessibility info, parking details...' : 'Dress code, parking, special requirements...'} />
              </FormField>
            </div>
          )}

          {/* ══ Review & Submit ══ */}
          {step === S.review && (
            <div className="space-y-5">
              <div className="mb-2">
                <h2 className="text-xl font-black text-gray-900">Review & Submit</h2>
                <p className="text-sm text-gray-400 mt-1">Check your details and agree to our terms</p>
              </div>

              <div className="bg-gradient-to-br from-cyan-50 to-blue-50 rounded-2xl p-5 space-y-3 border border-cyan-100">
                {[
                  { label: '👤 Name', value: form.organizerName },
                  { label: '📧 Email', value: form.organizerEmail },
                  { label: '📞 Phone', value: form.organizerPhone },
                  isVendor
                    ? { label: '🛒 Shop', value: form.shopName }
                    : { label: isPlace ? '🏛️ Place' : '🎉 Event', value: form.eventTitle },
                  { label: '📂 Category', value: isVendor ? form.vendorCategory : form.eventCategory },
                  isVendor
                    ? { label: '🎓 University', value: form.vendorUniversity === 'Other' ? form.vendorUniversityOther : form.vendorUniversity }
                    : { label: '🏙️ City', value: form.city === 'Others' ? form.customCity : form.city },
                  {
                    label: '📸 Photos',
                    value: isVendor
                      ? `${vendorImages.length} shop photo${vendorImages.length !== 1 ? 's' : ''}`
                      : `${eventImages.length} photo${eventImages.length !== 1 ? 's' : ''}`,
                  },
                  // ✅ Show ticket tiers summary
                  isEvent && form.isFree === 'no' && form.useTicketTiers && ticketTiers.length > 0
                    ? { label: '🎟️ Ticket Tiers', value: `${ticketTiers.length} tier${ticketTiers.length !== 1 ? 's' : ''}: ${ticketTiers.map(t => t.name).join(', ')}` }
                    : isEvent && form.isFree === 'no' && form.ticketPrice
                    ? { label: '💰 Ticket Price', value: `₦${Number(form.ticketPrice).toLocaleString()}` }
                    : null,
                  isVendor && schoolIdImage.length > 0 ? { label: '🪪 School ID', value: 'Uploaded ✅' } : null,
                  form.referralCode ? { label: '🎁 Referral', value: form.referralCode.toUpperCase() } : null,
                ].filter(Boolean).map(({ label, value }, i) => (
                  <div key={i} className="flex items-start justify-between gap-4 text-sm">
                    <span className="text-gray-500 flex-shrink-0">{label}</span>
                    <span className="font-bold text-gray-900 text-right">{value || '—'}</span>
                  </div>
                ))}
              </div>

              {/* ✅ Ticket tiers preview in review */}
              {isEvent && form.isFree === 'no' && form.useTicketTiers && ticketTiers.length > 0 && (
                <div className="border-2 border-cyan-100 rounded-2xl p-4">
                  <p className="text-sm font-black text-gray-800 mb-3 flex items-center gap-2">
                    <Ticket size={16} className="text-cyan-600" /> Ticket Tiers
                  </p>
                  <div className="space-y-2">
                    {ticketTiers.map((tier, i) => (
                      <div key={i} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-xl">
                        <div>
                          <p className="text-sm font-bold text-gray-800">{tier.name}</p>
                          {tier.benefits && <p className="text-xs text-gray-500">{tier.benefits}</p>}
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-black text-cyan-600">₦{Number(tier.price).toLocaleString()}</p>
                          {tier.quantity && <p className="text-xs text-gray-400">{tier.quantity} available</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className={`border-2 rounded-2xl p-4 transition ${errors.agreedToTerms ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}>
                <label className="flex items-start gap-3 cursor-pointer" onClick={() => set('agreedToTerms', !form.agreedToTerms)}>
                  <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${
                    form.agreedToTerms
                      ? 'bg-gradient-to-br from-cyan-600 to-blue-600 border-cyan-600'
                      : 'border-gray-300'
                  }`}>
                    {form.agreedToTerms && <Check size={11} className="text-white" />}
                  </div>
                  <span className="text-sm text-gray-600 leading-relaxed">
                    I confirm all information is accurate and I agree to OutingStation's{' '}
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setShowTerms(true); }}
                      className="text-cyan-600 font-bold underline"
                    >
                      Terms & Conditions
                    </button>.
                    {isVendor && ' My school ID is genuine and I am authorized to operate on campus.'}
                  </span>
                </label>
                {errors.agreedToTerms && <p className="text-xs text-red-500 mt-2 font-semibold">{errors.agreedToTerms}</p>}
              </div>

              {((isVendor && vendorImages.length > 0) || (!isVendor && eventImages.length > 0)) && (
                <div className="flex items-center gap-3 px-4 py-3 bg-green-50 border border-green-200 rounded-xl">
                  <span className="text-xl">📸</span>
                  <p className="text-sm text-green-700 font-bold">
                    {isVendor ? vendorImages.length : eventImages.length} photo{(isVendor ? vendorImages.length : eventImages.length) !== 1 ? 's' : ''} ready to submit
                  </p>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Navigation */}
        <NavButtons
          onBack={back}
          onNext={isLastStep ? handleSubmit : next}
          nextLabel={isLastStep ? `🚀 Submit ${isVendor ? 'Vendor' : isPlace ? 'Place' : 'Event'}` : 'Continue'}
          isSubmitting={isSubmitting}
        />

        <p className="text-center text-xs text-gray-400 mt-4">
          Step {step} of {totalSteps} · Review within 24–48 hours
        </p>
      </div>

      {/* Terms modal */}
      {showTerms && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowTerms(false)}>
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[80vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b-2 border-gray-100 px-8 py-5 flex justify-between items-center rounded-t-3xl">
              <h2 className="text-xl font-black text-gray-900">Terms & Conditions</h2>
              <button onClick={() => setShowTerms(false)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition">
                <X size={16} />
              </button>
            </div>
            <div className="px-8 py-6 space-y-6 text-gray-700">
              {[
                {
                  title: '1. Submission Guidelines',
                  items: [
                    'All information provided must be accurate and truthful',
                    'You must have the legal right to use all images and content submitted',
                    'Events, places, and vendor listings must be real and verifiable',
                    'Submissions may be rejected if they violate our community standards',
                  ],
                },
                {
                  title: '2. Review Process',
                  items: [
                    'All submissions are reviewed within 24–48 hours',
                    'OutingStation reserves the right to approve, reject, or request modifications',
                    'We may contact you for verification or additional information',
                    'Approved listings will be published on our platform',
                  ],
                },
                {
                  title: '3. Vendor Specific Terms',
                  items: [
                    'Vendors must be active students or authorized campus traders',
                    'School ID is required and kept strictly private for verification only',
                    'WhatsApp number must be active and reachable',
                    'Vendor listings are free — OutingStation takes no commission',
                    'OutingStation is not liable for any transactions between vendors and students',
                  ],
                },
                {
                  title: '4. Content Ownership',
                  items: [
                    'You retain ownership of all content you submit',
                    'By submitting, you grant OutingStation a non-exclusive license to display your content',
                    'You can request removal of your listing at any time',
                  ],
                },
              ].map((section, i) => (
                <section key={i}>
                  <h3 className="font-black text-gray-900 mb-3">{section.title}</h3>
                  <ul className="space-y-2">
                    {section.items.map((item, j) => (
                      <li key={j} className="flex items-start gap-2 text-sm">
                        <span className="text-cyan-500 font-bold mt-0.5">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
              <p className="text-sm">
                Questions?{' '}
                <a href="mailto:admin@outingstation.com" className="text-cyan-600 hover:underline font-bold">
                  admin@outingstation.com
                </a>
              </p>
            </div>
            <div className="sticky bottom-0 bg-white border-t-2 border-gray-100 px-8 py-5 rounded-b-3xl">
              <button onClick={() => setShowTerms(false)}
                className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 text-white py-3.5 rounded-2xl font-black hover:from-cyan-700 hover:to-blue-700 transition">
                Got it, close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubmitEventPage;