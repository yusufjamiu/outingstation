// SubmitExperiencePage.jsx — public Experience submission wizard.
// Route this at /create-experience. Mirrors SubmitEventPage.jsx exactly:
// no login and no business/account required to submit — organizer
// contact info is collected directly in the form (Step 1), and every
// submission goes to admin for individual review, same as events.
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import {
  X, Upload, Plus, ChevronRight, ChevronLeft, Check, Trash2,
  Building2, Phone, Ticket, MapPin, Calendar, Repeat,
} from 'lucide-react';

// ─── Constants ────────────────────────────────────────────────────────────

const NIGERIAN_BANKS = [
  'Access Bank', 'Citibank', 'Ecobank', 'Fidelity Bank', 'First Bank',
  'First City Monument Bank (FCMB)', 'Globus Bank', 'Guaranty Trust Bank (GTBank)',
  'Heritage Bank', 'Jaiz Bank', 'Keystone Bank', 'Kuda Bank', 'Moniepoint',
  'Opay', 'Palmpay', 'Polaris Bank', 'Providus Bank', 'Stanbic IBTC Bank',
  'Standard Chartered Bank', 'Sterling Bank', 'SunTrust Bank', 'Taj Bank',
  'Union Bank', 'United Bank for Africa (UBA)', 'Unity Bank',
  'Wema Bank', 'Zenith Bank', 'Other',
];

const EXPERIENCE_CATEGORIES = [
  { value: 'Outdoor', emoji: '🌳' },
  { value: 'Indoor', emoji: '🏠' },
  { value: 'Food', emoji: '🍽️' },
  { value: 'Arts', emoji: '🎨' },
  { value: 'Wellness', emoji: '🧘' },
  { value: 'Adventure', emoji: '🧗' },
];

const CITIES = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue',
  'Borno', 'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu',
  'FCT (Abuja)', 'Gombe', 'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina',
  'Kebbi', 'Kogi', 'Kwara', 'Lagos', 'Nasarawa', 'Niger', 'Ogun', 'Ondo',
  'Osun', 'Oyo', 'Plateau', 'Rivers', 'Sokoto', 'Taraba', 'Yobe', 'Zamfara',
  'Others',
];

// ─── Cloudinary helpers (same pattern as SubmitEventPage) ─────────────────

const uploadToCloudinary = async (file, folder = 'experiences', onProgress = () => {}) => {
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
      canvas.toBlob((blob) => resolve(new File([blob], file.name, { type: 'image/jpeg' })), 'image/jpeg', quality);
    };
    img.src = url;
  });
};

function MultiImageUploader({ images, onAdd, onRemove, maxImages = 10 }) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const slotsLeft = maxImages - images.length;

  const handleFiles = async (e) => {
    const files = Array.from(e.target.files).slice(0, slotsLeft);
    if (!files.length) return;
    setUploading(true);
    const uploaded = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith('image/')) continue;
      if (file.size > 10 * 1024 * 1024) { alert(`${file.name} is too large. Max 10MB.`); continue; }
      try {
        setProgress(Math.round(((i + 0.5) / files.length) * 100));
        const compressed = await compressImage(file);
        const url = await uploadToCloudinary(compressed, 'experiences', (p) => {
          setProgress(Math.round(((i + p / 100) / files.length) * 100));
        });
        uploaded.push(url);
      } catch (err) {
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
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
          {images.map((img, i) => (
            <div key={i} className="relative group">
              <img src={img} alt={`Photo ${i + 1}`} className={`w-full h-24 object-cover rounded-2xl border-2 ${i === 0 ? 'border-cyan-400' : 'border-gray-200'}`} />
              {i === 0 && <span className="absolute top-1.5 left-1.5 bg-cyan-500 text-white text-xs px-2 py-0.5 rounded-lg font-bold shadow">Main</span>}
              <button type="button" onClick={() => onRemove(i)} className="absolute top-1.5 right-1.5 bg-red-500 hover:bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition shadow">
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
      {images.length < maxImages && (
        <label className={`flex flex-col items-center justify-center gap-3 p-8 border-2 border-dashed rounded-2xl cursor-pointer transition ${uploading ? 'border-cyan-300 bg-cyan-50 opacity-70 pointer-events-none' : 'border-gray-300 hover:border-cyan-400 hover:bg-cyan-50'}`}>
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
                <p className="text-sm font-bold text-cyan-600">{images.length === 0 ? 'Upload Photos' : `Add more (${slotsLeft} left)`}</p>
                <p className="text-xs text-gray-400 mt-1">PNG, JPG, WEBP · max 10MB each</p>
                {images.length === 0 && <p className="text-xs text-gray-400">Min 3, max {maxImages} photos</p>}
              </div>
            </>
          )}
          <input type="file" accept="image/*" multiple disabled={uploading} onChange={handleFiles} className="sr-only" />
        </label>
      )}
    </div>
  );
}

// ─── Dynamic list builder (What's Included / What to Bring) ───────────────

function ItemListBuilder({ items, onChange, placeholder }) {
  const [draft, setDraft] = useState('');
  const addItem = () => {
    if (!draft.trim()) return;
    onChange([...items, draft.trim()]);
    setDraft('');
  };
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          type="text" value={draft} onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addItem(); } }}
          placeholder={placeholder}
          className="flex-1 px-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-cyan-500 transition"
        />
        <button type="button" onClick={addItem} className="px-4 py-2.5 bg-cyan-600 text-white rounded-xl font-bold hover:bg-cyan-700 transition">
          <Plus size={16} />
        </button>
      </div>
      {items.length > 0 && (
        <div className="space-y-1.5">
          {items.map((item, i) => (
            <div key={i} className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2">
              <span className="text-sm text-gray-700">{item}</span>
              <button type="button" onClick={() => onChange(items.filter((_, idx) => idx !== i))} className="text-red-400 hover:text-red-600">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Sessions builder ───────────────────────────────────────────────────────

function SessionsBuilder({ sessions, onChange, errors }) {
  const addSession = () => {
    onChange([...sessions, { id: `session_${Date.now()}`, date: '', time: '', totalSpots: '' }]);
  };
  const removeSession = (index) => onChange(sessions.filter((_, i) => i !== index));
  const updateSession = (index, field, value) => onChange(sessions.map((s, i) => i === index ? { ...s, [field]: value } : s));

  return (
    <div className="space-y-3">
      {sessions.length === 0 && (
        <div className="text-center py-8 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
          <div className="text-4xl mb-3">📅</div>
          <p className="text-sm font-bold text-gray-700 mb-1">No sessions yet</p>
          <p className="text-xs text-gray-400 mb-4">Add at least one date, time, and spot count</p>
          <button type="button" onClick={addSession}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-xl text-sm font-bold hover:from-cyan-700 hover:to-blue-700 transition shadow-md">
            <Plus size={16} /> Add First Session
          </button>
        </div>
      )}
      {sessions.map((s, index) => (
        <div key={s.id} className="border-2 border-gray-100 rounded-2xl p-4 bg-white shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white text-xs font-black">{index + 1}</div>
              <span className="text-sm font-black text-gray-800">Session {index + 1}</span>
            </div>
            <button type="button" onClick={() => removeSession(index)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition">
              <Trash2 size={15} />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Date</label>
              <input type="date" value={s.date} onChange={(e) => updateSession(index, 'date', e.target.value)}
                className={`w-full px-3 py-2.5 border-2 rounded-xl text-sm focus:outline-none transition ${errors?.[`session_${index}_date`] ? 'border-red-300 bg-red-50' : 'border-gray-200 focus:border-cyan-500'}`} />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Time</label>
              <input type="time" value={s.time} onChange={(e) => updateSession(index, 'time', e.target.value)}
                className={`w-full px-3 py-2.5 border-2 rounded-xl text-sm focus:outline-none transition ${errors?.[`session_${index}_time`] ? 'border-red-300 bg-red-50' : 'border-gray-200 focus:border-cyan-500'}`} />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Total Spots</label>
              <input type="number" min="1" value={s.totalSpots} onChange={(e) => updateSession(index, 'totalSpots', e.target.value)}
                placeholder="20"
                className={`w-full px-3 py-2.5 border-2 rounded-xl text-sm focus:outline-none transition ${errors?.[`session_${index}_spots`] ? 'border-red-300 bg-red-50' : 'border-gray-200 focus:border-cyan-500'}`} />
            </div>
          </div>
        </div>
      ))}
      {sessions.length > 0 && (
        <button type="button" onClick={addSession}
          className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-cyan-300 rounded-2xl text-sm font-bold text-cyan-600 hover:bg-cyan-50 hover:border-cyan-500 transition">
          <Plus size={16} /> Add Another Session
        </button>
      )}
    </div>
  );
}

// ─── Reusable UI (same look as SubmitEventPage) ────────────────────────────

function ToggleButton({ selected, onClick, children }) {
  return (
    <button type="button" onClick={onClick}
      className={`px-4 py-3 rounded-xl border-2 text-sm font-bold transition-all duration-200 ${selected ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white border-cyan-600 shadow-md' : 'bg-white text-gray-700 border-gray-200 hover:border-cyan-400'}`}>
      {children}
    </button>
  );
}
function FormField({ label, required, error, hint, children }) {
  return (
    <div>
      <label className="block text-sm font-bold text-gray-800 mb-1.5">{label} {required && <span className="text-red-500">*</span>}</label>
      {children}
      {hint && !error && <p className="text-xs text-gray-400 mt-1.5">{hint}</p>}
      {error && <p className="text-xs text-red-500 mt-1.5 font-semibold">{error}</p>}
    </div>
  );
}
function StyledInput({ error, className = '', ...props }) {
  return <input {...props} className={`w-full px-4 py-3 border-2 rounded-xl text-sm focus:outline-none transition-colors ${error ? 'border-red-300 focus:border-red-500 bg-red-50' : 'border-gray-200 focus:border-cyan-500'} ${className}`} />;
}
function StyledSelect({ error, children, ...props }) {
  return <select {...props} className={`w-full px-4 py-3 border-2 rounded-xl text-sm focus:outline-none transition-colors appearance-none bg-white ${error ? 'border-red-300 focus:border-red-500 bg-red-50' : 'border-gray-200 focus:border-cyan-500'}`}>{children}</select>;
}
function StyledTextarea({ error, ...props }) {
  return <textarea {...props} className={`w-full px-4 py-3 border-2 rounded-xl text-sm focus:outline-none transition-colors resize-none ${error ? 'border-red-300 focus:border-red-500 bg-red-50' : 'border-gray-200 focus:border-cyan-500'}`} />;
}
function ProgressBar({ current, total }) {
  const pct = Math.round((current / total) * 100);
  return (
    <div className="mb-8">
      <div className="flex justify-between items-center mb-2">
        <span className="text-xs font-bold text-cyan-600 uppercase tracking-wider">Step {current} of {total}</span>
        <span className="text-xs text-gray-400 font-medium">{pct}% complete</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div className="bg-gradient-to-r from-cyan-500 to-blue-600 h-2 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
function NavButtons({ onBack, onNext, nextLabel = 'Continue', isSubmitting = false }) {
  return (
    <div className="flex gap-3 mt-8">
      <button type="button" onClick={onBack} className="flex items-center gap-2 px-6 py-3.5 border-2 border-gray-200 rounded-2xl text-sm font-bold text-gray-600 hover:bg-gray-50 transition">
        <ChevronLeft size={16} /> Back
      </button>
      <button type="button" onClick={onNext} disabled={isSubmitting}
        className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-black transition-all bg-gradient-to-r from-cyan-600 to-blue-600 text-white hover:from-cyan-700 hover:to-blue-700 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed">
        {isSubmitting ? (
          <>
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Submitting...
          </>
        ) : (<>{nextLabel} <ChevronRight size={16} /></>)}
      </button>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

const STEPS = { info: 1, details: 2, pricing: 3, sessions: 4, location: 5, booking: 6, photos: 7, review: 8 };
const TOTAL_STEPS = 8;
const STEP_NAMES = {
  1: 'Your Info', 2: 'Experience Details', 3: 'Pricing', 4: 'Sessions',
  5: 'Location', 6: 'Booking Method', 7: 'Photos', 8: 'Review & Submit',
};

export default function SubmitExperiencePage() {
  const topRef = useRef(null);
  const navigate = useNavigate();
  const { currentUser, userProfile } = useAuth();
  const [step, setStep] = useState(1);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [images, setImages] = useState([]);
  const [included, setIncluded] = useState([]);
  const [toBring, setToBring] = useState([]);
  const [sessions, setSessions] = useState([]);

  const [form, setForm] = useState({
    organizerName: userProfile?.name || currentUser?.displayName || '',
    organizerEmail: currentUser?.email || '',
    organizerPhone: '',
    organizationName: '',
    title: '', category: '', description: '',
    pricePerPerson: '', minGuests: '1', maxGuests: '10',
    recurring: false, recurringPattern: '',
    city: '', customCity: '', address: '', mapsLink: '',
    bookingMethod: 'outingstation', // 'outingstation' | 'contact'
    accountName: '', accountNumber: '', bankName: '',
    agreedToTerms: false,
  });

  const set = (key, val) => {
    setForm(p => ({ ...p, [key]: val }));
    if (errors[key]) setErrors(p => ({ ...p, [key]: '' }));
  };
  const handle = (e) => {
    const { name, value, type, checked } = e.target;
    set(name, type === 'checkbox' ? checked : value);
  };
  const scrollTop = () => topRef.current?.scrollIntoView({ behavior: 'smooth' });

  const validateStep = (s) => {
    const e = {};
    if (s === STEPS.info) {
      if (!form.organizerName.trim()) e.organizerName = 'Your name is required';
      if (!form.organizerEmail.trim()) e.organizerEmail = 'Email is required';
      else if (!/\S+@\S+\.\S+/.test(form.organizerEmail)) e.organizerEmail = 'Enter a valid email';
      if (!form.organizerPhone.trim()) e.organizerPhone = 'Phone number is required';
    }
    if (s === STEPS.details) {
      if (!form.title.trim()) e.title = 'Experience title is required';
      if (!form.category) e.category = 'Select a category';
      if (form.description.trim().length < 30) e.description = 'At least 30 characters required';
    }
    if (s === STEPS.pricing) {
      if (!form.pricePerPerson || parseFloat(form.pricePerPerson) <= 0) e.pricePerPerson = 'Enter a valid price';
      if (!form.minGuests || parseInt(form.minGuests) < 1) e.minGuests = 'Minimum 1 guest';
      if (!form.maxGuests || parseInt(form.maxGuests) < parseInt(form.minGuests || 1)) e.maxGuests = 'Max must be ≥ min guests';
    }
    if (s === STEPS.sessions) {
      if (sessions.length === 0) e.sessions = 'Add at least one session';
      sessions.forEach((sess, i) => {
        if (!sess.date) e[`session_${i}_date`] = 'Date required';
        if (!sess.time) e[`session_${i}_time`] = 'Time required';
        if (!sess.totalSpots || parseInt(sess.totalSpots) < 1) e[`session_${i}_spots`] = 'Spots required';
      });
      if (form.recurring && !form.recurringPattern.trim()) e.recurringPattern = 'Describe the recurring pattern';
    }
    if (s === STEPS.location) {
      if (!form.city) e.city = 'City is required';
      if (form.city === 'Others' && !form.customCity.trim()) e.customCity = 'Enter your city';
      if (!form.address.trim()) e.address = 'Address is required';
    }
    if (s === STEPS.booking) {
      if (form.bookingMethod === 'outingstation') {
        if (!form.accountName.trim()) e.accountName = 'Account name is required';
        if (!form.accountNumber.trim()) e.accountNumber = 'Account number is required';
        else if (!/^\d{10}$/.test(form.accountNumber.trim())) e.accountNumber = 'Enter a valid 10-digit account number';
        if (!form.bankName) e.bankName = 'Select your bank';
      }
    }
    if (s === STEPS.photos) {
      if (images.length < 3) e.images = 'At least 3 photos are required';
    }
    if (s === STEPS.review) {
      if (!form.agreedToTerms) e.agreedToTerms = 'Please agree to the terms to submit';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const next = () => { if (!validateStep(step)) { scrollTop(); return; } setStep(s => s + 1); scrollTop(); };
  const back = () => { setErrors({}); setStep(s => Math.max(1, s - 1)); scrollTop(); };

  const handleSubmit = async () => {
    if (!validateStep(step)) { scrollTop(); return; }
    setIsSubmitting(true);
    try {
      const finalCity = form.city === 'Others' && form.customCity.trim() ? form.customCity.trim() : form.city;
      await addDoc(collection(db, 'experience_submissions'), {
        organizerName: form.organizerName, organizerEmail: form.organizerEmail,
        organizerPhone: form.organizerPhone, organizationName: form.organizationName || null,
        title: form.title, category: form.category, description: form.description,
        included, toBring,
        pricePerPerson: parseFloat(form.pricePerPerson) || 0,
        minGuests: parseInt(form.minGuests) || 1,
        maxGuests: parseInt(form.maxGuests) || 1,
        sessions: sessions.map((s, i) => ({ id: s.id || `session_${i + 1}`, date: s.date, time: s.time, totalSpots: parseInt(s.totalSpots) || 0 })),
        recurring: form.recurring, recurringPattern: form.recurring ? form.recurringPattern.trim() : null,
        city: finalCity, address: form.address, mapsLink: form.mapsLink || null,
        bookingMethod: form.bookingMethod,
        bankAccount: form.bookingMethod === 'outingstation' ? {
          accountName: form.accountName.trim(), accountNumber: form.accountNumber.trim(), bankName: form.bankName,
        } : null,
        imageUrl: images[0] || '', images: images.slice(1),
        status: 'pending', submittedAt: serverTimestamp(),
        // Same as events: ownerId is optional, set only if the person
        // happened to be logged in — no business/account requirement to
        // submit at all, matching SubmitEventPage.jsx exactly.
        ownerId: currentUser?.uid || null,
      });
      setSubmitSuccess(true);
      scrollTop();
    } catch (err) {
      console.error('Submission error:', err);
      alert('Submission failed. ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cyan-50 to-blue-50 flex items-center justify-center px-4 py-16">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-10 text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg">
            <Check size={36} className="text-white" />
          </div>
          <h2 className="text-2xl font-black text-gray-900 mb-2">Experience Submitted! 🎉</h2>
          <p className="text-gray-500 text-sm mb-1"><span className="font-bold text-gray-800">"{form.title}"</span> is under review</p>
          <p className="text-xs text-gray-400 mb-8">We'll email you at <strong>{form.organizerEmail}</strong> within 24–48 hours</p>
          <div className="space-y-3">
            <a href="/" className="block w-full bg-gradient-to-r from-cyan-600 to-blue-600 text-white py-4 rounded-2xl font-black text-base hover:from-cyan-700 hover:to-blue-700 transition shadow-lg">
              Back to Home
            </a>
          </div>
        </div>
      </div>
    );
  }

  const isLastStep = step === TOTAL_STEPS;

  return (
    <div ref={topRef} className="min-h-screen bg-gradient-to-br from-gray-50 to-cyan-50 py-10 px-4">
      <div className="max-w-xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          {/* No OSB dependency anymore — just goes back in history,
              same as landing here straight from SubmitEventPage.jsx's
              type picker (which routes here via /create-experience). */}
          <button onClick={() => step === 1 ? navigate(-1) : back()} className="w-10 h-10 rounded-xl bg-white border-2 border-gray-200 flex items-center justify-center hover:border-cyan-400 transition flex-shrink-0 shadow-sm">
            <ChevronLeft size={18} className="text-gray-600" />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-cyan-600 font-bold uppercase tracking-wider">✨ Experience</p>
            <p className="text-lg font-black text-gray-900 truncate">{STEP_NAMES[step]}</p>
          </div>
        </div>

        <ProgressBar current={step} total={TOTAL_STEPS} />

        <div className="bg-white rounded-3xl border-2 border-gray-100 shadow-xl p-6 sm:p-8">

          {step === STEPS.info && (
            <div className="space-y-5">
              <div className="mb-2"><h2 className="text-xl font-black text-gray-900">Your Information</h2><p className="text-sm text-gray-400 mt-1">We'll use this to contact you about your listing</p></div>
              <FormField label="Full Name" required error={errors.organizerName}>
                <StyledInput name="organizerName" value={form.organizerName} onChange={handle} error={errors.organizerName} placeholder="John Doe" />
              </FormField>
              <FormField label="Email Address" required error={errors.organizerEmail}>
                <StyledInput type="email" name="organizerEmail" value={form.organizerEmail} onChange={handle} error={errors.organizerEmail} placeholder="john@example.com" />
              </FormField>
              <FormField label="Phone Number" required error={errors.organizerPhone}>
                <StyledInput type="tel" name="organizerPhone" value={form.organizerPhone} onChange={handle} error={errors.organizerPhone} placeholder="+234 801 234 5678" />
              </FormField>
              <FormField label="Organization Name" hint="Optional — company or brand name">
                <StyledInput name="organizationName" value={form.organizationName} onChange={handle} placeholder="Company Ltd (optional)" />
              </FormField>
            </div>
          )}

          {step === STEPS.details && (
            <div className="space-y-5">
              <div className="mb-2"><h2 className="text-xl font-black text-gray-900">Experience Details</h2><p className="text-sm text-gray-400 mt-1">Tell people what this experience is about</p></div>
              <FormField label="Experience Title" required error={errors.title}>
                <StyledInput name="title" value={form.title} onChange={handle} error={errors.title} placeholder="e.g. Paint & Sip Lagos" />
              </FormField>
              <FormField label="Category" required error={errors.category}>
                <StyledSelect name="category" value={form.category} onChange={handle} error={errors.category}>
                  <option value="">Select a category</option>
                  {EXPERIENCE_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.emoji} {c.value}</option>)}
                </StyledSelect>
              </FormField>
              <FormField label="Description" required error={errors.description} hint={`${form.description.length} / 30 characters minimum`}>
                <StyledTextarea name="description" value={form.description} onChange={handle} error={errors.description} rows={4} placeholder="What happens during this experience, who it's for..." />
              </FormField>
              <FormField label="What's Included" hint="Optional — add items one at a time (e.g. All materials, 1 drink, instructor)">
                <ItemListBuilder items={included} onChange={setIncluded} placeholder="e.g. All painting materials" />
              </FormField>
              <FormField label="What to Bring" hint="Optional — add items one at a time (e.g. Comfortable shoes)">
                <ItemListBuilder items={toBring} onChange={setToBring} placeholder="e.g. Comfortable clothing" />
              </FormField>
            </div>
          )}

          {step === STEPS.pricing && (
            <div className="space-y-5">
              <div className="mb-2"><h2 className="text-xl font-black text-gray-900">Pricing</h2><p className="text-sm text-gray-400 mt-1">How much per person, and group size limits</p></div>
              <FormField label="Price per Person (₦)" required error={errors.pricePerPerson}>
                <StyledInput type="number" name="pricePerPerson" value={form.pricePerPerson} onChange={handle} error={errors.pricePerPerson} placeholder="8500" />
              </FormField>
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Min Guests / Booking" required error={errors.minGuests}>
                  <StyledInput type="number" min="1" name="minGuests" value={form.minGuests} onChange={handle} error={errors.minGuests} />
                </FormField>
                <FormField label="Max Guests / Booking" required error={errors.maxGuests}>
                  <StyledInput type="number" min="1" name="maxGuests" value={form.maxGuests} onChange={handle} error={errors.maxGuests} />
                </FormField>
              </div>
            </div>
          )}

          {step === STEPS.sessions && (
            <div className="space-y-5">
              <div className="mb-2"><h2 className="text-xl font-black text-gray-900">Sessions</h2><p className="text-sm text-gray-400 mt-1">When can people book this experience?</p></div>
              <SessionsBuilder sessions={sessions} onChange={setSessions} errors={errors} />
              {errors.sessions && <p className="text-xs text-red-500 font-semibold">{errors.sessions}</p>}
              <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" name="recurring" checked={form.recurring} onChange={handle} className="mt-0.5 h-4 w-4 rounded text-blue-600" />
                  <div>
                    <p className="text-sm font-bold text-gray-800 flex items-center gap-1.5"><Repeat size={14} /> This experience repeats regularly</p>
                    <p className="text-xs text-gray-500 mt-0.5">e.g. "Every Friday 7PM" — helps guests know it's ongoing. You'll still add individual sessions above (and more later from your dashboard).</p>
                  </div>
                </label>
                {form.recurring && (
                  <div className="mt-3">
                    <StyledInput name="recurringPattern" value={form.recurringPattern} onChange={handle} error={errors.recurringPattern} placeholder="e.g. Every Friday 7PM" />
                    {errors.recurringPattern && <p className="text-xs text-red-500 mt-1 font-semibold">{errors.recurringPattern}</p>}
                  </div>
                )}
              </div>
            </div>
          )}

          {step === STEPS.location && (
            <div className="space-y-5">
              <div className="mb-2"><h2 className="text-xl font-black text-gray-900">Location</h2><p className="text-sm text-gray-400 mt-1">Where does this experience take place?</p></div>
              <FormField label="City" required error={errors.city}>
                <StyledSelect name="city" value={form.city} onChange={handle} error={errors.city}>
                  <option value="">Select a city</option>
                  {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                </StyledSelect>
              </FormField>
              {form.city === 'Others' && (
                <FormField label="Your City" required error={errors.customCity}>
                  <StyledInput name="customCity" value={form.customCity} onChange={handle} error={errors.customCity} placeholder="Enter city name" />
                </FormField>
              )}
              <FormField label="Full Address" required error={errors.address}>
                <StyledInput name="address" value={form.address} onChange={handle} error={errors.address} placeholder="123 Main Street, Victoria Island, Lagos" />
              </FormField>
              <FormField label="Google Maps Link" hint="Optional but recommended">
                <StyledInput type="url" name="mapsLink" value={form.mapsLink} onChange={handle} placeholder="https://maps.google.com/..." />
              </FormField>
            </div>
          )}

          {step === STEPS.booking && (
            <div className="space-y-5">
              <div className="mb-2"><h2 className="text-xl font-black text-gray-900">Booking Method</h2><p className="text-sm text-gray-400 mt-1">How will guests book a session?</p></div>
              <div className="grid grid-cols-1 gap-3">
                <ToggleButton selected={form.bookingMethod === 'outingstation'} onClick={() => set('bookingMethod', 'outingstation')}>
                  <div className="flex items-center gap-2"><Ticket size={16} /> OutingStation Booking — we handle payment via Paystack, QR check-in, and payout to you</div>
                </ToggleButton>
                <ToggleButton selected={form.bookingMethod === 'contact'} onClick={() => set('bookingMethod', 'contact')}>
                  <div className="flex items-center gap-2"><Phone size={16} /> Contact Host — guests reach you directly, no online payment</div>
                </ToggleButton>
              </div>

              {form.bookingMethod === 'outingstation' && (
                <div className="border-2 border-emerald-100 rounded-2xl p-5 bg-gradient-to-br from-emerald-50/50 to-cyan-50/50 space-y-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Building2 size={18} className="text-emerald-600" />
                    <div>
                      <p className="text-sm font-black text-gray-900">Remittance Account</p>
                      <p className="text-xs text-gray-500">Where we'll send your payout within 48hrs after each session</p>
                    </div>
                  </div>
                  <FormField label="Account Name" required error={errors.accountName}>
                    <StyledInput name="accountName" value={form.accountName} onChange={handle} error={errors.accountName} placeholder="John Doe" />
                  </FormField>
                  <FormField label="Account Number" required error={errors.accountNumber}>
                    <StyledInput name="accountNumber" value={form.accountNumber} onChange={handle} error={errors.accountNumber} placeholder="0123456789" maxLength={10} inputMode="numeric" />
                  </FormField>
                  <FormField label="Bank Name" required error={errors.bankName}>
                    <StyledSelect name="bankName" value={form.bankName} onChange={handle} error={errors.bankName}>
                      <option value="">Select your bank</option>
                      {NIGERIAN_BANKS.map(b => <option key={b} value={b}>{b}</option>)}
                    </StyledSelect>
                  </FormField>
                </div>
              )}

              {form.bookingMethod === 'contact' && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <p className="text-sm text-blue-700">Guests will see your phone number and can reach out directly to book. No online payment or QR check-in for this experience.</p>
                </div>
              )}
            </div>
          )}

          {step === STEPS.photos && (
            <div className="space-y-5">
              <div className="mb-2"><h2 className="text-xl font-black text-gray-900">Photos</h2><p className="text-sm text-gray-400 mt-1">Add 3–10 photos. Users can swipe through all of them.</p></div>
              <MultiImageUploader images={images} onAdd={(urls) => setImages(p => [...p, ...urls].slice(0, 10))} onRemove={(i) => setImages(p => p.filter((_, idx) => idx !== i))} maxImages={10} />
              {errors.images && <p className="text-xs text-red-500 mt-1 font-semibold">{errors.images}</p>}
            </div>
          )}

          {step === STEPS.review && (
            <div className="space-y-5">
              <div className="mb-2"><h2 className="text-xl font-black text-gray-900">Review & Submit</h2><p className="text-sm text-gray-400 mt-1">Check your details and agree to our terms</p></div>
              <div className="bg-gradient-to-br from-cyan-50 to-blue-50 rounded-2xl p-5 space-y-3 border border-cyan-100">
                {[
                  { label: '👤 Name', value: form.organizerName },
                  { label: '✨ Title', value: form.title },
                  { label: '📂 Category', value: form.category },
                  { label: '💰 Price', value: `₦${Number(form.pricePerPerson || 0).toLocaleString()} / person` },
                  { label: '👥 Group Size', value: `${form.minGuests}–${form.maxGuests} guests` },
                  { label: '📅 Sessions', value: `${sessions.length} session${sessions.length !== 1 ? 's' : ''}` },
                  { label: '🏙️ City', value: form.city === 'Others' ? form.customCity : form.city },
                  { label: '🎟️ Booking', value: form.bookingMethod === 'outingstation' ? 'OutingStation Booking' : 'Contact Host' },
                  { label: '📸 Photos', value: `${images.length} photo${images.length !== 1 ? 's' : ''}` },
                ].map(({ label, value }, i) => (
                  <div key={i} className="flex items-start justify-between gap-4 text-sm">
                    <span className="text-gray-500 flex-shrink-0">{label}</span>
                    <span className="font-bold text-gray-900 text-right">{value || '—'}</span>
                  </div>
                ))}
              </div>

              <div className={`border-2 rounded-2xl p-4 transition ${errors.agreedToTerms ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}>
                <label className="flex items-start gap-3 cursor-pointer" onClick={() => set('agreedToTerms', !form.agreedToTerms)}>
                  <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${form.agreedToTerms ? 'bg-gradient-to-br from-cyan-600 to-blue-600 border-cyan-600' : 'border-gray-300'}`}>
                    {form.agreedToTerms && <Check size={11} className="text-white" />}
                  </div>
                  <span className="text-sm text-gray-600 leading-relaxed">
                    I confirm all information is accurate and I agree to OutingStation's Terms & Conditions.
                  </span>
                </label>
                {errors.agreedToTerms && <p className="text-xs text-red-500 mt-2 font-semibold">{errors.agreedToTerms}</p>}
              </div>
            </div>
          )}

        </div>

        <NavButtons onBack={back} onNext={isLastStep ? handleSubmit : next}
          nextLabel={isLastStep ? '🚀 Submit Experience' : 'Continue'} isSubmitting={isSubmitting} />

        <p className="text-center text-xs text-gray-400 mt-4">Step {step} of {TOTAL_STEPS} · Review within 24–48 hours</p>
      </div>
    </div>
  );
}