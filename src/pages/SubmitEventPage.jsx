// COMPLETE SubmitEventPage.jsx - WITH CLOUDINARY UPLOAD + REFERRAL CODE + VENDOR + MULTI-IMAGE
import React, { useState, useEffect } from 'react';
import { collection, addDoc, serverTimestamp, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { Gift, ShoppingBag, Plus, X, Upload } from 'lucide-react';

const VENDOR_CATEGORIES = [
  { value: 'Food & Drinks', emoji: '🍔' },
  { value: 'Fashion & Clothing', emoji: '👗' },
  { value: 'Electronics & Gadgets', emoji: '📱' },
  { value: 'Beauty & Grooming', emoji: '💄' },
  { value: 'Books & Stationery', emoji: '📚' },
  { value: 'Accessories', emoji: '💍' },
];

// ✅ Cloudinary upload — same as AdminEventForm
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
      if (xhr.status === 200) {
        const result = JSON.parse(xhr.responseText);
        resolve(result.secure_url);
      } else {
        reject(new Error(`Upload failed: ${xhr.statusText}`));
      }
    };
    xhr.onerror = () => reject(new Error('Upload failed'));
    xhr.send(data);
  });
};

// ✅ Simple compress before upload
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

// ✅ Reusable multi-image uploader component
function MultiImageUploader({ images, onAdd, onRemove, maxImages = 10, uploading, uploadProgress, folder = 'events', label = 'Photos' }) {
  const [localUploading, setLocalUploading] = useState(false);
  const [localProgress, setLocalProgress] = useState(0);

  const isUploading = uploading !== undefined ? uploading : localUploading;
  const progress = uploadProgress !== undefined ? uploadProgress : localProgress;

  const slotsLeft = maxImages - images.length;

  const handleFiles = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    const toUpload = files.slice(0, slotsLeft);
    if (toUpload.length === 0) { alert(`Maximum ${maxImages} photos allowed`); return; }

    setLocalUploading(true);
    const uploaded = [];
    for (let i = 0; i < toUpload.length; i++) {
      const file = toUpload[i];
      if (!file.type.startsWith('image/')) continue;
      if (file.size > 10 * 1024 * 1024) { alert(`${file.name} is too large. Max 10MB.`); continue; }
      try {
        setLocalProgress(Math.round(((i + 0.5) / toUpload.length) * 100));
        const compressed = await compressImage(file, 1200, 0.8);
        const url = await uploadToCloudinary(compressed, folder, (p) => {
          setLocalProgress(Math.round(((i + p / 100) / toUpload.length) * 100));
        });
        uploaded.push(url);
      } catch (err) {
        console.error('Upload error:', err);
        alert(`Failed to upload ${file.name}`);
      }
    }
    onAdd(uploaded);
    setLocalUploading(false);
    setLocalProgress(0);
    e.target.value = '';
  };

  return (
    <div>
      {/* Image Grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2 mb-3">
          {images.map((img, index) => (
            <div key={index} className="relative group">
              <img src={img} alt={`${label} ${index + 1}`}
                className={`w-full h-20 object-cover rounded-xl border-2 ${index === 0 ? 'border-cyan-400' : 'border-gray-200'}`}
                onError={(e) => { e.target.src = 'https://via.placeholder.com/80'; }} />
              {index === 0 && (
                <div className="absolute top-1 left-1 bg-cyan-500 text-white text-xs px-1.5 py-0.5 rounded-md font-semibold leading-tight">
                  Main
                </div>
              )}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 rounded-xl transition" />
              <button type="button" onClick={() => onRemove(index)}
                className="absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition shadow-md">
                <X size={10} />
              </button>
              <div className="absolute bottom-1 left-1 bg-black/50 text-white text-xs px-1 rounded opacity-0 group-hover:opacity-100 transition">
                #{index + 1}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload area */}
      {images.length < maxImages && (
        <label className={`flex flex-col items-center justify-center gap-2 px-4 py-6 border-2 border-dashed rounded-2xl cursor-pointer transition ${
          isUploading
            ? 'border-cyan-300 bg-cyan-50 opacity-70 pointer-events-none'
            : images.length === 0
              ? 'border-gray-300 hover:border-cyan-400 hover:bg-cyan-50'
              : 'border-gray-200 hover:border-cyan-400 hover:bg-cyan-50'
        }`}>
          {isUploading ? (
            <>
              <div className="w-full max-w-xs bg-gray-200 rounded-full h-2">
                <div className="bg-cyan-500 h-2 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
              </div>
              <span className="text-sm text-cyan-600 font-medium">Uploading {progress}%...</span>
            </>
          ) : images.length === 0 ? (
            <>
              <Upload size={32} className="text-gray-400" />
              <div className="text-center">
                <p className="text-sm font-semibold text-cyan-600">Click to upload {label}</p>
                <p className="text-xs text-gray-500 mt-1">PNG, JPG, WEBP up to 10MB each</p>
                <p className="text-xs text-gray-400 mt-1">Min 1 photo, max {maxImages} photos</p>
              </div>
            </>
          ) : (
            <>
              <Plus size={20} className="text-gray-400" />
              <span className="text-sm text-gray-600 font-medium">
                Add More Photos ({slotsLeft} slot{slotsLeft !== 1 ? 's' : ''} left)
              </span>
            </>
          )}
          <input type="file" accept="image/*" multiple disabled={isUploading} onChange={handleFiles} className="sr-only" />
        </label>
      )}

      {images.length >= maxImages && (
        <div className="text-center py-3 bg-gray-50 rounded-xl border border-gray-200">
          <p className="text-sm text-gray-500">✅ Maximum {maxImages} photos reached</p>
        </div>
      )}

      {images.length > 0 && (
        <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          First photo is the main image shown on cards. Hover to remove any photo.
        </p>
      )}
    </div>
  );
}

const SubmitEventPage = () => {
  const [formData, setFormData] = useState({
    organizerName: '',
    organizerEmail: '',
    organizerPhone: '',
    organizationName: '',
    referralCode: '',
    listingType: 'event',
    eventTitle: '',
    eventCategory: '',
    customCategory: '',
    eventType: 'physical',
    eventDescription: '',
    startDate: '',
    startTime: '',
    endDate: '',
    endTime: '',
    operatingHours: '',
    alwaysOpen: false,
    city: '',
    customCity: '',
    venueName: '',
    address: '',
    mapsLink: '',
    platform: '',
    webinarLink: '',
    isFree: 'yes',
    ticketPrice: '',
    wantOutingstationTicketing: 'no',
    externalTicketLink: '',
    additionalInfo: '',
    agreedToTerms: false,
    isUniversityEvent: false,
    universityName: '',
    // ✅ Vendor fields
    shopName: '',
    vendorCategory: '',
    vendorUniversity: '',
    vendorDescription: '',
    whatsappNumber: '',
  });

  // ✅ All images for all types — first image = main image
  const [eventImages, setEventImages] = useState([]);     // event/place images
  const [vendorImages, setVendorImages] = useState([]);   // vendor images

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [errors, setErrors] = useState({});
  const [showTerms, setShowTerms] = useState(false);
  const [universities, setUniversities] = useState([]);

  // ✅ Events only — no Malls or Spas
const eventCategories = [
  'Business & Tech', 'Art & Culture', 'Food & Dining',
  'Sport & Fitness', 'Education', 'Religion & Community',
  'Nightlife & Parties', 'Family & Kids Fun', 'Networking & Social',
  'Gaming & Esport', 'Music & Concerts', 'Cinema & Show',
  'Other',
];

// ✅ Places — shared + places-only
const placeCategories = [
  'Art & Culture', 'Food & Dining', 'Sport & Fitness',
  'Nightlife & Parties', 'Family & Kids Fun', 'Cinema & Show',
  'Malls', 'Spas',
  'Other',
];

  const cities = ['Lagos', 'Abuja', 'Ibadan', 'Port Harcourt', 'Others'];
  const platforms = ['Zoom', 'Google Meet', 'Microsoft Teams', 'YouTube Live', 'Instagram Live', 'LinkedIn Live', 'Twitter Space', 'Other'];

  useEffect(() => { loadUniversities(); }, []);

  const loadUniversities = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'universities'));
      const unis = snapshot.docs.map(doc => doc.data().name).filter(Boolean);
      setUniversities(unis);
    } catch (err) {
      console.error('Error loading universities:', err);
      setUniversities([
        'University of Lagos (Unilag)', 'University of Ibadan (UI)',
        'Covenant University (CU)', 'King Saud University (KSU)',
        'University of Ilorin (Unilorin)',
      ]);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const isVendor = formData.listingType === 'vendor';
  const isEvent = formData.listingType === 'event';
  const isPlace = formData.listingType === 'place';
  const isVirtual = isEvent && (formData.eventType === 'webinar' || formData.eventType === 'hybrid');
  const isPhysical = isPlace || (isEvent && (formData.eventType === 'physical' || formData.eventType === 'hybrid'));

  const validate = () => {
    const e = {};

    if (!formData.organizerName.trim()) e.organizerName = 'Name required';
    if (!formData.organizerEmail.trim()) e.organizerEmail = 'Email required';
    if (!formData.organizerPhone.trim()) e.organizerPhone = 'Phone required';

    if (isVendor) {
      if (!formData.shopName.trim()) e.shopName = 'Shop name required';
      if (!formData.vendorCategory) e.vendorCategory = 'Category required';
      if (!formData.vendorUniversity) e.vendorUniversity = 'University required';
      if (!formData.vendorDescription.trim()) e.vendorDescription = 'Description required';
      if (formData.vendorDescription.trim().length < 20) e.vendorDescription = 'Min 20 characters';
      if (!formData.whatsappNumber.trim()) e.whatsappNumber = 'WhatsApp number required';
      if (vendorImages.length === 0) e.vendorImage = 'At least 1 shop photo required';
      if (!formData.agreedToTerms) e.agreedToTerms = 'Please agree to terms';
      setErrors(e);
      return Object.keys(e).length === 0;
    }

    if (!formData.eventTitle.trim()) e.eventTitle = isPlace ? 'Place name required' : 'Event title required';
    if (!formData.eventCategory) e.eventCategory = 'Category required';
    if (formData.eventCategory === 'Other' && !formData.customCategory.trim()) e.customCategory = 'Please specify category';
    if (formData.eventDescription.length < 100) e.eventDescription = 'Min 100 characters';

    if (isEvent) {
      if (!formData.startDate) e.startDate = 'Start date required';
      if (!formData.startTime) e.startTime = 'Start time required';
      if (formData.endDate && formData.startDate) {
        const start = new Date(formData.startDate + 'T' + (formData.startTime || '00:00'));
        const end = new Date(formData.endDate + 'T' + (formData.endTime || '23:59'));
        if (end < start) e.endDate = 'End date cannot be before start date';
      }
      if (formData.eventType === 'webinar' || formData.eventType === 'hybrid') {
        if (!formData.platform.trim()) e.platform = 'Platform required';
        if (!formData.webinarLink.trim()) e.webinarLink = 'Registration link required';
      }
      if (formData.isUniversityEvent && !formData.universityName.trim()) e.universityName = 'University name required';
    }

    if (isPlace && !formData.alwaysOpen && !formData.operatingHours.trim()) e.operatingHours = 'Operating hours required (or check "Always Open")';
    if (!formData.city) e.city = 'City required';
    if (formData.city === 'Others' && !formData.customCity.trim()) e.customCity = 'Please specify city';
    if (!formData.venueName.trim()) e.venueName = isPlace ? 'Place name required' : 'Venue required';
    if (!formData.address.trim()) e.address = 'Address required';

    if (formData.isFree === 'no') {
      if (!formData.ticketPrice.trim()) e.ticketPrice = isPlace ? 'Entry fee required' : 'Price required';
      if (formData.wantOutingstationTicketing === 'no' && !formData.externalTicketLink.trim()) e.externalTicketLink = 'Ticket link required';
    }

    // ✅ Validate images — min 1
    if (eventImages.length === 0) e.eventImage = 'At least 1 image required';
    if (!formData.agreedToTerms) e.agreedToTerms = 'Please agree to terms';

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) { window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
    setIsSubmitting(true);

    try {
      if (isVendor) {
        // ✅ First image = main image, rest = additional images
        const [imageUrl = '', ...additionalImages] = vendorImages;

        await addDoc(collection(db, 'vendor_submissions'), {
          organizerName: formData.organizerName,
          organizerEmail: formData.organizerEmail,
          organizerPhone: formData.organizerPhone,
          shopName: formData.shopName,
          category: formData.vendorCategory,
          university: formData.vendorUniversity,
          description: formData.vendorDescription,
          whatsappNumber: formData.whatsappNumber,
          imageUrl,
          images: additionalImages,   // ✅ extra images
          referralCode: formData.referralCode.trim().toUpperCase() || null,
          status: 'pending',
          submittedAt: serverTimestamp(),
        });

        setSubmitSuccess(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        setIsSubmitting(false);
        return;
      }

      // ✅ Event / Place — first image = main, rest = additional
      const [imageUrl = '', ...additionalImages] = eventImages;

      const finalCategory = formData.eventCategory === 'Other' && formData.customCategory.trim()
        ? formData.customCategory.trim() : formData.eventCategory;
      const finalCity = formData.city === 'Others' && formData.customCity.trim()
        ? formData.customCity.trim() : formData.city;

      await addDoc(collection(db, 'event_submissions'), {
        organizerName: formData.organizerName,
        organizerEmail: formData.organizerEmail,
        organizerPhone: formData.organizerPhone,
        organizationName: formData.organizationName || null,
        referralCode: formData.referralCode.trim().toUpperCase() || null,
        listingType: formData.listingType,
        subCategory: formData.listingType === 'place' ? 'places' : (formData.isUniversityEvent ? 'campus' : 'events'),
        eventTitle: formData.eventTitle,
        eventCategory: finalCategory,
        eventType: formData.listingType === 'event' ? formData.eventType : 'physical',
        eventDescription: formData.eventDescription,
        startDate: formData.listingType === 'event' ? formData.startDate : null,
        startTime: formData.listingType === 'event' ? formData.startTime : null,
        endDate: formData.listingType === 'event' ? (formData.endDate || formData.startDate) : null,
        endTime: formData.listingType === 'event' ? (formData.endTime || formData.startTime) : null,
        operatingHours: formData.listingType === 'place' ? (formData.alwaysOpen ? 'Always Open' : formData.operatingHours) : null,
        alwaysOpen: formData.listingType === 'place' ? formData.alwaysOpen : false,
        city: finalCity,
        venueName: formData.venueName,
        address: formData.address,
        mapsLink: formData.mapsLink || null,
        platform: formData.platform || null,
        webinarLink: formData.webinarLink || null,
        isFree: formData.isFree === 'yes',
        ticketPrice: formData.isFree === 'yes' ? 0 : parseFloat(formData.ticketPrice) || 0,
        wantOutingstationTicketing: formData.wantOutingstationTicketing === 'yes',
        externalTicketLink: formData.externalTicketLink || null,
        imageUrl,            // ✅ main image
        images: additionalImages,  // ✅ additional images array
        additionalInfo: formData.additionalInfo || null,
        isUniversityEvent: formData.isUniversityEvent || false,
        universityName: formData.universityName || null,
        status: 'pending',
        submittedAt: serverTimestamp(),
      });

      setSubmitSuccess(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      console.error('❌ SUBMISSION ERROR:', error);
      alert('Submission failed. ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitSuccess) {
    const images = isVendor ? vendorImages : eventImages;
    return (
      <div className="min-h-screen bg-gradient-to-br from-cyan-50 to-blue-50 flex items-center justify-center px-4 py-12">
        <div className="max-w-lg w-full bg-white rounded-3xl shadow-2xl p-10 text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-3">
            {isVendor ? 'Vendor' : isPlace ? 'Place' : 'Event'} Submitted! 🎉
          </h2>
          <p className="text-gray-600 text-lg mb-2">
            <strong className="text-cyan-600">
              "{isVendor ? formData.shopName : formData.eventTitle}"
            </strong> is under review
          </p>
          {images.length > 1 && (
            <p className="text-gray-500 text-sm mb-6">
              📸 {images.length} photos submitted
            </p>
          )}
          <div className="bg-cyan-50 rounded-2xl p-6 mb-8 text-left">
            <h3 className="font-bold text-gray-900 mb-4 text-lg">📋 What Happens Next?</h3>
            <div className="space-y-3">
              <div className="flex items-start">
                <span className="text-cyan-600 font-bold mr-3">•</span>
                <span className="text-gray-700">Review within <strong>24-48 hours</strong></span>
              </div>
              <div className="flex items-start">
                <span className="text-cyan-600 font-bold mr-3">•</span>
                <span className="text-gray-700">Email updates to <strong>{formData.organizerEmail}</strong></span>
              </div>
              {isVendor && (
                <div className="flex items-start">
                  <span className="text-cyan-600 font-bold mr-3">•</span>
                  <span className="text-gray-700">Once approved, students at <strong>{formData.vendorUniversity}</strong> can find you!</span>
                </div>
              )}
              {formData.referralCode && (
                <div className="flex items-start">
                  <span className="text-cyan-600 font-bold mr-3">•</span>
                  <span className="text-gray-700"><strong className="text-green-600">Get ₦100 credits</strong> when approved!</span>
                </div>
              )}
              <div className="flex items-start">
                <span className="text-cyan-600 font-bold mr-3">•</span>
                <span className="text-gray-700">Once approved, <strong className="text-green-600">goes live!</strong></span>
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <a href="/" className="block w-full bg-gradient-to-r from-cyan-600 to-blue-600 text-white py-4 rounded-xl font-bold text-lg hover:from-cyan-700 hover:to-blue-700 transition shadow-lg">
              Back to Home
            </a>
            <button onClick={() => window.location.reload()}
              className="block w-full border-2 border-gray-300 text-gray-700 py-4 rounded-xl font-bold hover:bg-gray-50 transition">
              Submit Another {isVendor ? 'Vendor' : isPlace ? 'Place' : 'Event'}
            </button>
          </div>
          <p className="text-sm text-gray-500 mt-8">
            Questions? <a href="mailto:admin@outingstation.com" className="text-cyan-600 hover:underline font-medium">admin@outingstation.com</a>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-cyan-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">

        <div className="text-center mb-12">
          <h1 className="text-5xl md:text-6xl font-black text-gray-900 mb-4 leading-tight">
            List on<br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-600 to-blue-600">
              OutingStation
            </span>
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            List events, venues, restaurants, campus vendors — anything worth discovering!
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-12">
          {[
            { icon: '📱', title: 'Massive Reach', desc: 'Thousands daily' },
            { icon: '💰', title: '100% Free', desc: 'Zero fees' },
            { icon: '🎫', title: 'Ticketing Help', desc: 'We can help' },
            { icon: '⚡', title: 'Fast Approval', desc: '24-48 hours' },
          ].map((b, i) => (
            <div key={i} className="bg-white rounded-2xl p-4 md:p-6 shadow-lg hover:shadow-xl transition text-center">
              <div className="text-3xl md:text-4xl mb-2 md:mb-3">{b.icon}</div>
              <h3 className="font-bold text-gray-900 mb-1 text-sm md:text-base">{b.title}</h3>
              <p className="text-xs md:text-sm text-gray-600">{b.desc}</p>
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-2xl p-8 md:p-12">

          {/* SECTION 1: Your Information */}
          <div className="mb-10">
            <div className="flex items-center mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-cyan-600 to-blue-600 rounded-full flex items-center justify-center text-white font-bold mr-4">1</div>
              <h2 className="text-2xl font-black text-gray-900">Your Information</h2>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Full Name <span className="text-red-500">*</span></label>
                <input type="text" name="organizerName" value={formData.organizerName} onChange={handleChange}
                  className={`w-full px-4 py-3 border-2 ${errors.organizerName ? 'border-red-500' : 'border-gray-200'} rounded-xl focus:border-cyan-500 focus:outline-none transition`}
                  placeholder="John Doe" />
                {errors.organizerName && <p className="text-red-500 text-sm mt-1">{errors.organizerName}</p>}
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Email <span className="text-red-500">*</span></label>
                <input type="email" name="organizerEmail" value={formData.organizerEmail} onChange={handleChange}
                  className={`w-full px-4 py-3 border-2 ${errors.organizerEmail ? 'border-red-500' : 'border-gray-200'} rounded-xl focus:border-cyan-500 focus:outline-none transition`}
                  placeholder="john@example.com" />
                {errors.organizerEmail && <p className="text-red-500 text-sm mt-1">{errors.organizerEmail}</p>}
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Phone Number <span className="text-red-500">*</span></label>
                <input type="tel" name="organizerPhone" value={formData.organizerPhone} onChange={handleChange}
                  className={`w-full px-4 py-3 border-2 ${errors.organizerPhone ? 'border-red-500' : 'border-gray-200'} rounded-xl focus:border-cyan-500 focus:outline-none transition`}
                  placeholder="+234 801 234 5678" />
                {errors.organizerPhone && <p className="text-red-500 text-sm mt-1">{errors.organizerPhone}</p>}
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Organization Name</label>
                <input type="text" name="organizationName" value={formData.organizationName} onChange={handleChange}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-cyan-500 focus:outline-none transition"
                  placeholder="Company Ltd (optional)" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Your Referral Code <span className="text-gray-400 text-xs">(Optional)</span>
                </label>
                <div className="relative">
                  <Gift className="absolute left-4 top-1/2 -translate-y-1/2 text-purple-500" size={20} />
                  <input type="text" name="referralCode" value={formData.referralCode} onChange={handleChange}
                    maxLength={12}
                    className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none transition uppercase"
                    placeholder="JOHN2024" />
                </div>
                <p className="text-xs text-green-600 mt-2 font-medium flex items-center gap-1">
                  <span>💰</span><span>Earn ₦100 credits when your listing is approved!</span>
                </p>
              </div>
            </div>
          </div>

          {/* SECTION 2: Listing Details */}
          <div className="mb-10">
            <div className="flex items-center mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-cyan-600 to-blue-600 rounded-full flex items-center justify-center text-white font-bold mr-4">2</div>
              <h2 className="text-2xl font-black text-gray-900">Listing Details</h2>
            </div>

            {/* Listing type */}
            <div className="bg-gradient-to-br from-cyan-50 to-blue-50 rounded-2xl p-6 border-2 border-cyan-200 mb-6">
              <label className="block text-sm font-bold text-gray-900 mb-3">What are you listing? <span className="text-red-500">*</span></label>
              <div className="grid md:grid-cols-3 gap-4">
                {[
                  { value: 'event', icon: '🎉', label: 'Event', desc: 'Concert, festival, workshop, conference' },
                  { value: 'place', icon: '🏛️', label: 'Place/Venue', desc: 'Museum, restaurant, park, cinema' },
                  { value: 'vendor', icon: '🛒', label: 'Campus Vendor', desc: 'Food, fashion, accessories & more' },
                ].map(item => (
                  <button key={item.value} type="button"
                    onClick={() => { setFormData(prev => ({ ...prev, listingType: item.value })); setEventImages([]); setVendorImages([]); }}
                    className={`px-6 py-4 border-2 rounded-xl text-left transition ${
                      formData.listingType === item.value
                        ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white border-cyan-600 shadow-lg'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-cyan-500'
                    }`}>
                    <div className="text-3xl mb-2">{item.icon}</div>
                    <div className="font-bold text-lg">{item.label}</div>
                    <div className={`text-sm ${formData.listingType === item.value ? 'text-cyan-100' : 'text-gray-500'}`}>{item.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* VENDOR FIELDS */}
            {isVendor && (
              <div className="space-y-6">
                <div className="bg-emerald-50 border-2 border-emerald-200 rounded-2xl p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <ShoppingBag className="text-emerald-600" size={24} />
                    <h3 className="font-bold text-gray-900 text-lg">Campus Vendor Details</h3>
                  </div>
                  <p className="text-sm text-gray-600">Register your campus shop — students will find you through the OutingStation app and contact you via WhatsApp.</p>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Shop Name <span className="text-red-500">*</span></label>
                  <input type="text" name="shopName" value={formData.shopName} onChange={handleChange}
                    className={`w-full px-4 py-3 border-2 ${errors.shopName ? 'border-red-500' : 'border-gray-200'} rounded-xl focus:border-cyan-500 focus:outline-none transition`}
                    placeholder="e.g. Mama Tee Kitchen, Jay Accessories" />
                  {errors.shopName && <p className="text-red-500 text-sm mt-1">{errors.shopName}</p>}
                </div>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Vendor Category <span className="text-red-500">*</span></label>
                    <select name="vendorCategory" value={formData.vendorCategory} onChange={handleChange}
                      className={`w-full px-4 py-3 border-2 ${errors.vendorCategory ? 'border-red-500' : 'border-gray-200'} rounded-xl focus:border-cyan-500 focus:outline-none transition`}>
                      <option value="">Select category</option>
                      {VENDOR_CATEGORIES.map(cat => (
                        <option key={cat.value} value={cat.value}>{cat.emoji} {cat.value}</option>
                      ))}
                    </select>
                    {errors.vendorCategory && <p className="text-red-500 text-sm mt-1">{errors.vendorCategory}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">University / Campus <span className="text-red-500">*</span></label>
                    <select name="vendorUniversity" value={formData.vendorUniversity} onChange={handleChange}
                      className={`w-full px-4 py-3 border-2 ${errors.vendorUniversity ? 'border-red-500' : 'border-gray-200'} rounded-xl focus:border-cyan-500 focus:outline-none transition`}>
                      <option value="">Select university</option>
                      {universities.map(uni => <option key={uni} value={uni}>{uni}</option>)}
                    </select>
                    {errors.vendorUniversity && <p className="text-red-500 text-sm mt-1">{errors.vendorUniversity}</p>}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Description <span className="text-red-500">*</span></label>
                  <textarea name="vendorDescription" value={formData.vendorDescription} onChange={handleChange} rows={3}
                    className={`w-full px-4 py-3 border-2 ${errors.vendorDescription ? 'border-red-500' : 'border-gray-200'} rounded-xl focus:border-cyan-500 focus:outline-none transition`}
                    placeholder="What do you sell? e.g. Best jollof rice on campus, affordable and tasty meals daily" />
                  {errors.vendorDescription && <p className="text-red-500 text-sm mt-1">{errors.vendorDescription}</p>}
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">WhatsApp Number <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg">📱</span>
                    <input type="tel" name="whatsappNumber" value={formData.whatsappNumber} onChange={handleChange}
                      className={`w-full pl-11 pr-4 py-3 border-2 ${errors.whatsappNumber ? 'border-red-500' : 'border-gray-200'} rounded-xl focus:border-cyan-500 focus:outline-none transition`}
                      placeholder="+234 800 000 0000" />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Students will contact you directly on WhatsApp</p>
                  {errors.whatsappNumber && <p className="text-red-500 text-sm mt-1">{errors.whatsappNumber}</p>}
                </div>

                {/* ✅ Vendor multi-image upload */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">
                    Shop Photos <span className="text-red-500">*</span>
                    <span className="text-gray-400 text-xs font-normal ml-2">Min 1, max 10</span>
                  </label>
                  <p className="text-xs text-gray-500 mb-3">Show your products, shop interior, or menu. More photos = more trust from students!</p>
                  <MultiImageUploader
                    images={vendorImages}
                    onAdd={(urls) => setVendorImages(prev => [...prev, ...urls].slice(0, 10))}
                    onRemove={(index) => setVendorImages(prev => prev.filter((_, i) => i !== index))}
                    maxImages={10}
                    folder="vendors"
                    label="Shop photos"
                  />
                  {errors.vendorImage && <p className="text-red-500 text-sm mt-2">{errors.vendorImage}</p>}
                </div>
              </div>
            )}

            {/* EVENT / PLACE FIELDS */}
            {!isVendor && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">{isPlace ? 'Place Name' : 'Event Title'} <span className="text-red-500">*</span></label>
                  <input type="text" name="eventTitle" value={formData.eventTitle} onChange={handleChange}
                    className={`w-full px-4 py-3 border-2 ${errors.eventTitle ? 'border-red-500' : 'border-gray-200'} rounded-xl focus:border-cyan-500 focus:outline-none transition`}
                    placeholder={isPlace ? 'National Museum Lagos' : 'Lagos Music Festival 2026'} />
                  {errors.eventTitle && <p className="text-red-500 text-sm mt-1">{errors.eventTitle}</p>}
                </div>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Category <span className="text-red-500">*</span></label>
                    <select name="eventCategory" value={formData.eventCategory} onChange={handleChange}
                      className={`w-full px-4 py-3 border-2 ${errors.eventCategory ? 'border-red-500' : 'border-gray-200'} rounded-xl focus:border-cyan-500 focus:outline-none transition`}>
                      <option value="">Select category</option>
                      {(isPlace ? placeCategories : eventCategories).map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                    {errors.eventCategory && <p className="text-red-500 text-sm mt-1">{errors.eventCategory}</p>}
                    {formData.eventCategory === 'Other' && (
                      <div className="mt-3">
                        <input type="text" name="customCategory" value={formData.customCategory} onChange={handleChange}
                          placeholder="Please specify category"
                          className={`w-full px-4 py-3 border-2 ${errors.customCategory ? 'border-red-500' : 'border-gray-200'} rounded-xl focus:border-cyan-500 focus:outline-none transition`} />
                        {errors.customCategory && <p className="text-red-500 text-sm mt-1">{errors.customCategory}</p>}
                      </div>
                    )}
                  </div>
                  {isEvent && (
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">Event Type <span className="text-red-500">*</span></label>
                      <div className="grid grid-cols-1 gap-3">
                        {[
                          { value: 'physical', label: 'Physical (In-Person)' },
                          { value: 'webinar', label: 'Virtual (Online)' },
                          { value: 'hybrid', label: 'Hybrid (Both)' }
                        ].map(type => (
                          <button key={type.value} type="button"
                            onClick={() => setFormData(prev => ({ ...prev, eventType: type.value }))}
                            className={`px-4 py-3 border-2 rounded-xl text-sm font-bold transition ${formData.eventType === type.value ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white border-cyan-600' : 'bg-white text-gray-700 border-gray-200 hover:border-cyan-500'}`}>
                            {type.label}
                          </button>
                        ))}
                      </div>
                      <div className="mt-4 bg-blue-50 rounded-xl p-4 border-2 border-blue-200">
                        <div className="flex items-start">
                          <input type="checkbox" name="isUniversityEvent" checked={formData.isUniversityEvent} onChange={handleChange}
                            className="h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mt-0.5 mr-3" />
                          <div className="flex-1">
                            <label className="text-sm font-bold text-gray-900 cursor-pointer">🎓 This is a University/Campus Event</label>
                            <p className="text-xs text-gray-600 mt-1">Check this if your event is happening at a university campus</p>
                          </div>
                        </div>
                        {formData.isUniversityEvent && (
                          <div className="mt-3">
                            <input type="text" name="universityName" value={formData.universityName} onChange={handleChange}
                              placeholder="Enter university name (e.g., University of Lagos)"
                              className={`w-full px-4 py-3 border-2 ${errors.universityName ? 'border-red-500' : 'border-gray-200'} rounded-xl focus:border-blue-500 focus:outline-none transition`} />
                            {errors.universityName && <p className="text-red-500 text-sm mt-1">{errors.universityName}</p>}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Description <span className="text-red-500">*</span> (min 100 characters)</label>
                  <textarea name="eventDescription" value={formData.eventDescription} onChange={handleChange} rows={5}
                    className={`w-full px-4 py-3 border-2 ${errors.eventDescription ? 'border-red-500' : 'border-gray-200'} rounded-xl focus:border-cyan-500 focus:outline-none transition`}
                    placeholder={isPlace ? 'Describe this place...' : 'Describe your event...'} />
                  <div className="flex justify-between mt-1">
                    {errors.eventDescription && <p className="text-red-500 text-sm">{errors.eventDescription}</p>}
                    <p className={`text-sm ml-auto ${formData.eventDescription.length >= 100 ? 'text-green-600' : 'text-gray-500'}`}>
                      {formData.eventDescription.length}/100
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* SECTION 3: Date & Time (Events only) */}
          {isEvent && (
            <div className="mb-10">
              <div className="flex items-center mb-6">
                <div className="w-10 h-10 bg-gradient-to-br from-cyan-600 to-blue-600 rounded-full flex items-center justify-center text-white font-bold mr-4">3</div>
                <h2 className="text-2xl font-black text-gray-900">Date & Time</h2>
              </div>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Start Date <span className="text-red-500">*</span></label>
                  <input type="date" name="startDate" value={formData.startDate} onChange={handleChange}
                    className={`w-full px-4 py-3 border-2 ${errors.startDate ? 'border-red-500' : 'border-gray-200'} rounded-xl focus:border-cyan-500 focus:outline-none transition`} />
                  {errors.startDate && <p className="text-red-500 text-sm mt-1">{errors.startDate}</p>}
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Start Time <span className="text-red-500">*</span></label>
                  <input type="time" name="startTime" value={formData.startTime} onChange={handleChange}
                    className={`w-full px-4 py-3 border-2 ${errors.startTime ? 'border-red-500' : 'border-gray-200'} rounded-xl focus:border-cyan-500 focus:outline-none transition`} />
                  {errors.startTime && <p className="text-red-500 text-sm mt-1">{errors.startTime}</p>}
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">End Date</label>
                  <input type="date" name="endDate" value={formData.endDate} onChange={handleChange}
                    className={`w-full px-4 py-3 border-2 ${errors.endDate ? 'border-red-500' : 'border-gray-200'} rounded-xl focus:border-cyan-500 focus:outline-none transition`} />
                  {errors.endDate && <p className="text-red-500 text-sm mt-1">{errors.endDate}</p>}
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">End Time</label>
                  <input type="time" name="endTime" value={formData.endTime} onChange={handleChange}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-cyan-500 focus:outline-none transition" />
                </div>
              </div>
            </div>
          )}

          {/* SECTION 3: Operating Hours (Places only) */}
          {isPlace && (
            <div className="mb-10">
              <div className="flex items-center mb-6">
                <div className="w-10 h-10 bg-gradient-to-br from-cyan-600 to-blue-600 rounded-full flex items-center justify-center text-white font-bold mr-4">3</div>
                <h2 className="text-2xl font-black text-gray-900">Operating Hours</h2>
              </div>
              <div className="space-y-4">
                <div className="flex items-center mb-4">
                  <input type="checkbox" name="alwaysOpen" checked={formData.alwaysOpen} onChange={handleChange}
                    className="h-5 w-5 text-cyan-600 border-gray-300 rounded focus:ring-cyan-500 mr-3" />
                  <label className="text-sm font-bold text-gray-700">This place is always open (24/7)</label>
                </div>
                {!formData.alwaysOpen && (
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Operating Hours <span className="text-red-500">*</span></label>
                    <textarea name="operatingHours" value={formData.operatingHours} onChange={handleChange} rows={3}
                      className={`w-full px-4 py-3 border-2 ${errors.operatingHours ? 'border-red-500' : 'border-gray-200'} rounded-xl focus:border-cyan-500 focus:outline-none transition`}
                      placeholder="Mon-Fri: 9AM-5PM&#10;Sat-Sun: 10AM-8PM" />
                    {errors.operatingHours && <p className="text-red-500 text-sm mt-1">{errors.operatingHours}</p>}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SECTION 4: Location */}
          {isPhysical && (
            <div className="mb-10">
              <div className="flex items-center mb-6">
                <div className="w-10 h-10 bg-gradient-to-br from-cyan-600 to-blue-600 rounded-full flex items-center justify-center text-white font-bold mr-4">4</div>
                <h2 className="text-2xl font-black text-gray-900">Location</h2>
              </div>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">City <span className="text-red-500">*</span></label>
                  <select name="city" value={formData.city} onChange={handleChange}
                    className={`w-full px-4 py-3 border-2 ${errors.city ? 'border-red-500' : 'border-gray-200'} rounded-xl focus:border-cyan-500 focus:outline-none transition`}>
                    <option value="">Select city</option>
                    {cities.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  {errors.city && <p className="text-red-500 text-sm mt-1">{errors.city}</p>}
                  {formData.city === 'Others' && (
                    <div className="mt-3">
                      <input type="text" name="customCity" value={formData.customCity} onChange={handleChange}
                        placeholder="Enter your city"
                        className={`w-full px-4 py-3 border-2 ${errors.customCity ? 'border-red-500' : 'border-gray-200'} rounded-xl focus:border-cyan-500 focus:outline-none transition`} />
                      {errors.customCity && <p className="text-red-500 text-sm mt-1">{errors.customCity}</p>}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">{isPlace ? 'Place Name' : 'Venue Name'} <span className="text-red-500">*</span></label>
                  <input type="text" name="venueName" value={formData.venueName} onChange={handleChange}
                    className={`w-full px-4 py-3 border-2 ${errors.venueName ? 'border-red-500' : 'border-gray-200'} rounded-xl focus:border-cyan-500 focus:outline-none transition`}
                    placeholder={isPlace ? 'National Museum' : 'Eko Hotel & Suites'} />
                  {errors.venueName && <p className="text-red-500 text-sm mt-1">{errors.venueName}</p>}
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-gray-700 mb-2">Full Address <span className="text-red-500">*</span></label>
                  <input type="text" name="address" value={formData.address} onChange={handleChange}
                    className={`w-full px-4 py-3 border-2 ${errors.address ? 'border-red-500' : 'border-gray-200'} rounded-xl focus:border-cyan-500 focus:outline-none transition`}
                    placeholder="123 Main Street, Victoria Island, Lagos" />
                  {errors.address && <p className="text-red-500 text-sm mt-1">{errors.address}</p>}
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-gray-700 mb-2">Google Maps Link</label>
                  <input type="url" name="mapsLink" value={formData.mapsLink} onChange={handleChange}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-cyan-500 focus:outline-none transition"
                    placeholder="https://maps.google.com/..." />
                </div>
              </div>
            </div>
          )}

          {/* SECTION 5: Virtual Details */}
          {isVirtual && (
            <div className="mb-10">
              <div className="flex items-center mb-6">
                <div className="w-10 h-10 bg-gradient-to-br from-cyan-600 to-blue-600 rounded-full flex items-center justify-center text-white font-bold mr-4">5</div>
                <h2 className="text-2xl font-black text-gray-900">Virtual Event Details</h2>
              </div>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Platform <span className="text-red-500">*</span></label>
                  <select name="platform" value={formData.platform} onChange={handleChange}
                    className={`w-full px-4 py-3 border-2 ${errors.platform ? 'border-red-500' : 'border-gray-200'} rounded-xl focus:border-cyan-500 focus:outline-none transition`}>
                    <option value="">Select platform</option>
                    {platforms.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                  {errors.platform && <p className="text-red-500 text-sm mt-1">{errors.platform}</p>}
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Registration Link <span className="text-red-500">*</span></label>
                  <input type="url" name="webinarLink" value={formData.webinarLink} onChange={handleChange}
                    className={`w-full px-4 py-3 border-2 ${errors.webinarLink ? 'border-red-500' : 'border-gray-200'} rounded-xl focus:border-cyan-500 focus:outline-none transition`}
                    placeholder="https://zoom.us/webinar/..." />
                  {errors.webinarLink && <p className="text-red-500 text-sm mt-1">{errors.webinarLink}</p>}
                </div>
              </div>
            </div>
          )}

          {/* SECTION 6: Ticketing */}
          {!isVendor && (
            <div className="mb-10">
              <div className="flex items-center mb-6">
                <div className="w-10 h-10 bg-gradient-to-br from-cyan-600 to-blue-600 rounded-full flex items-center justify-center text-white font-bold mr-4">6</div>
                <h2 className="text-2xl font-black text-gray-900">{isPlace ? 'Entry Fee' : 'Ticketing'}</h2>
              </div>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-3">{isPlace ? 'Is entry free?' : 'Is this event free?'} <span className="text-red-500">*</span></label>
                  <div className="grid grid-cols-2 gap-4">
                    {[{ value: 'yes', label: 'Free' }, { value: 'no', label: isPlace ? 'Paid Entry' : 'Paid Event' }].map(opt => (
                      <button key={opt.value} type="button" onClick={() => setFormData(prev => ({ ...prev, isFree: opt.value }))}
                        className={`px-6 py-3 border-2 rounded-xl font-bold transition ${formData.isFree === opt.value ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white border-cyan-600' : 'bg-white text-gray-700 border-gray-200 hover:border-cyan-500'}`}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
                {formData.isFree === 'no' && (
                  <>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">{isPlace ? 'Entry Fee (₦)' : 'Ticket Price (₦)'} <span className="text-red-500">*</span></label>
                      <input type="number" name="ticketPrice" value={formData.ticketPrice} onChange={handleChange}
                        className={`w-full px-4 py-3 border-2 ${errors.ticketPrice ? 'border-red-500' : 'border-gray-200'} rounded-xl focus:border-cyan-500 focus:outline-none transition`}
                        placeholder="5000" />
                      {errors.ticketPrice && <p className="text-red-500 text-sm mt-1">{errors.ticketPrice}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-3">Do you want OutingStation to handle ticketing?</label>
                      <div className="grid grid-cols-2 gap-4">
                        {[{ value: 'yes', label: 'Yes, Please!' }, { value: 'no', label: "No, I Have My Own" }].map(opt => (
                          <button key={opt.value} type="button" onClick={() => setFormData(prev => ({ ...prev, wantOutingstationTicketing: opt.value }))}
                            className={`px-6 py-3 border-2 rounded-xl font-bold transition ${formData.wantOutingstationTicketing === opt.value ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white border-cyan-600' : 'bg-white text-gray-700 border-gray-200 hover:border-cyan-500'}`}>
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    {formData.wantOutingstationTicketing === 'no' && (
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">External Ticket Link <span className="text-red-500">*</span></label>
                        <input type="url" name="externalTicketLink" value={formData.externalTicketLink} onChange={handleChange}
                          className={`w-full px-4 py-3 border-2 ${errors.externalTicketLink ? 'border-red-500' : 'border-gray-200'} rounded-xl focus:border-cyan-500 focus:outline-none transition`}
                          placeholder="https://eventbrite.com/..." />
                        {errors.externalTicketLink && <p className="text-red-500 text-sm mt-1">{errors.externalTicketLink}</p>}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {/* ✅ SECTION 7: Images — Events & Places */}
          {!isVendor && (
            <div className="mb-10">
              <div className="flex items-center mb-6">
                <div className="w-10 h-10 bg-gradient-to-br from-cyan-600 to-blue-600 rounded-full flex items-center justify-center text-white font-bold mr-4">7</div>
                <div>
                  <h2 className="text-2xl font-black text-gray-900">{isPlace ? 'Place' : 'Event'} Photos</h2>
                  <p className="text-sm text-gray-500 mt-0.5">Min 1, max 10 photos. Users can swipe through all photos.</p>
                </div>
              </div>
              <MultiImageUploader
                images={eventImages}
                onAdd={(urls) => setEventImages(prev => [...prev, ...urls].slice(0, 10))}
                onRemove={(index) => setEventImages(prev => prev.filter((_, i) => i !== index))}
                maxImages={10}
                folder={isPlace ? 'places' : 'events'}
                label={isPlace ? 'Place photos' : 'Event photos'}
              />
              {errors.eventImage && <p className="text-red-500 text-sm mt-2">{errors.eventImage}</p>}
            </div>
          )}

          {/* SECTION 8: Additional Info */}
          {!isVendor && (
            <div className="mb-10">
              <div className="flex items-center mb-6">
                <div className="w-10 h-10 bg-gradient-to-br from-cyan-600 to-blue-600 rounded-full flex items-center justify-center text-white font-bold mr-4">8</div>
                <h2 className="text-2xl font-black text-gray-900">Additional Information</h2>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Anything else we should know?</label>
                <textarea name="additionalInfo" value={formData.additionalInfo} onChange={handleChange} rows={4}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-cyan-500 focus:outline-none transition"
                  placeholder={isPlace ? 'Accessibility info, parking details...' : 'Dress code, parking, special requirements...'} />
              </div>
            </div>
          )}

          {/* Terms & Submit */}
          <div className="border-t-2 border-gray-200 pt-8">
            <div className="flex items-start mb-6">
              <input type="checkbox" name="agreedToTerms" checked={formData.agreedToTerms} onChange={handleChange}
                className="mt-1 h-5 w-5 text-cyan-600 border-gray-300 rounded focus:ring-cyan-500" />
              <label className="ml-3 text-sm text-gray-700">
                I confirm all information is accurate and I agree to OutingStation's{' '}
                <button type="button" onClick={() => setShowTerms(true)} className="text-cyan-600 hover:underline font-medium underline">
                  Terms & Conditions
                </button>
                <span className="text-red-500"> *</span>
              </label>
            </div>
            {errors.agreedToTerms && <p className="text-red-500 text-sm mb-4">{errors.agreedToTerms}</p>}

            {/* ✅ Summary of photos before submit */}
            {((isVendor && vendorImages.length > 0) || (!isVendor && eventImages.length > 0)) && (
              <div className="mb-4 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3">
                <span className="text-2xl">📸</span>
                <p className="text-sm text-emerald-700 font-medium">
                  {isVendor ? vendorImages.length : eventImages.length} photo{(isVendor ? vendorImages.length : eventImages.length) !== 1 ? 's' : ''} ready to submit
                </p>
              </div>
            )}

            <button type="submit" disabled={isSubmitting}
              className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 text-white py-5 rounded-2xl font-black text-xl hover:from-cyan-700 hover:to-blue-700 transition shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed">
              {isSubmitting ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin h-6 w-6 mr-3" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Uploading & Submitting...
                </span>
              ) : (
                `🚀 Submit ${isVendor ? 'Vendor' : isPlace ? 'Place' : 'Event'} for Review`
              )}
            </button>
            <p className="text-center text-sm text-gray-500 mt-4">Review within 24-48 hours</p>
          </div>
        </form>

        {/* Terms Modal */}
        {showTerms && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" onClick={() => setShowTerms(false)}>
            <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="sticky top-0 bg-white border-b-2 border-gray-200 p-6 flex justify-between items-center">
                <h2 className="text-2xl font-black text-gray-900">Terms & Conditions</h2>
                <button onClick={() => setShowTerms(false)} className="text-gray-500 hover:text-gray-700 text-3xl leading-none">×</button>
              </div>
              <div className="p-6 space-y-6 text-gray-700">
                <section>
                  <h3 className="font-bold text-lg text-gray-900 mb-3">1. Submission Guidelines</h3>
                  <ul className="space-y-2 text-sm">
                    <li>• All information provided must be accurate and truthful</li>
                    <li>• You must have the legal right to use all images and content submitted</li>
                    <li>• Events, places, and vendor listings must be real and verifiable</li>
                    <li>• Submissions may be rejected if they violate our community standards</li>
                  </ul>
                </section>
                <section>
                  <h3 className="font-bold text-lg text-gray-900 mb-3">2. Review Process</h3>
                  <ul className="space-y-2 text-sm">
                    <li>• All submissions are reviewed within 24-48 hours</li>
                    <li>• OutingStation reserves the right to approve, reject, or request modifications</li>
                    <li>• We may contact you for verification or additional information</li>
                    <li>• Approved listings will be published on our platform</li>
                  </ul>
                </section>
                <section>
                  <h3 className="font-bold text-lg text-gray-900 mb-3">3. Vendor Specific Terms</h3>
                  <ul className="space-y-2 text-sm">
                    <li>• Vendors must be active students or authorized campus traders</li>
                    <li>• WhatsApp number must be active and reachable</li>
                    <li>• Vendor listings are free — OutingStation takes no commission</li>
                    <li>• OutingStation is not liable for any transactions between vendors and students</li>
                  </ul>
                </section>
                <section>
                  <h3 className="font-bold text-lg text-gray-900 mb-3">4. Content Ownership</h3>
                  <ul className="space-y-2 text-sm">
                    <li>• You retain ownership of all content you submit</li>
                    <li>• By submitting, you grant OutingStation a non-exclusive license to display your content</li>
                    <li>• You can request removal of your listing at any time</li>
                  </ul>
                </section>
                <section>
                  <h3 className="font-bold text-lg text-gray-900 mb-3">5. Contact & Support</h3>
                  <p className="text-sm">For questions: <a href="mailto:admin@outingstation.com" className="text-cyan-600 hover:underline font-medium">admin@outingstation.com</a></p>
                </section>
              </div>
              <div className="sticky bottom-0 bg-white border-t-2 border-gray-200 p-6">
                <button onClick={() => setShowTerms(false)}
                  className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 text-white py-4 rounded-xl font-bold text-lg hover:from-cyan-700 hover:to-blue-700 transition">
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SubmitEventPage;