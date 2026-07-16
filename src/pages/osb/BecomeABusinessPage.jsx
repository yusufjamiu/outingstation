import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import {
  ChevronLeft, ChevronRight, Check, Upload,
  Building2, Music, UtensilsCrossed, Palette, Camera, Mic2,
  Guitar, Car, Store, PawPrint, Sparkles, Armchair, ShieldCheck,
  Compass, Shirt, Smartphone, Wand2, BookOpen, Gem, Briefcase,
  Gift, ShoppingBasket, Cake, CupSoda, Palmtree, Scissors, SprayCan, Watch, Wrench, ShoppingBag,
} from 'lucide-react';

// ✅ Restructured into two real categories — Service Providers get hired by
// planners (requests/quotes/bookings); Event Vendors rent stands from
// organizers (apply/pay/manage stall). Values kept identical to what
// PlanEventPage.jsx and OSBDashboard.jsx already key off of, except
// 'Rental Company' → 'Ride Provider' (updated in PlanEventPage.jsx too).
const SERVICE_PROVIDER_TYPES = [
  { value: 'Event Hall', icon: Building2 },
  { value: 'DJ', icon: Music },
  { value: 'MC', icon: Mic2 },
  { value: 'Caterer', icon: UtensilsCrossed },
  { value: 'Decorator', icon: Palette },
  { value: 'Photographer', icon: Camera },
  { value: 'Musician', icon: Guitar },
  { value: 'Furniture Rental', icon: Armchair },
  { value: 'Ride Provider', icon: Car },
  { value: 'Experience Host', icon: Compass },
  { value: 'Security', icon: ShieldCheck },
  { value: 'Restaurant', icon: UtensilsCrossed },
  { value: 'Resort', icon: Palmtree },
  { value: 'Livestock Seller', icon: PawPrint },
  { value: 'Laundry Service', icon: Shirt },
  { value: 'Tailor', icon: Scissors },
  { value: 'Cobbler', icon: Wrench },
  { value: 'Footwear Seller', icon: ShoppingBag },
  { value: 'Bag & Accessories', icon: Briefcase },
  { value: 'Caftan Seller', icon: Shirt },
  { value: 'Traditional Caps', icon: Shirt },
  { value: 'Perfume Seller', icon: SprayCan },
  { value: 'Gift Vendor', icon: Gift },
  { value: 'Premium Watches', icon: Watch },
  { value: 'Jewelry', icon: Gem },
  { value: 'Food Stuffs Seller', icon: ShoppingBasket },
  { value: 'Baker', icon: Cake },
  { value: 'Beverages Seller', icon: CupSoda },
  { value: 'Other Service', icon: Sparkles },
];

const EVENT_VENDOR_TYPES = [
  { value: 'Food & Drinks', icon: UtensilsCrossed },
  { value: 'Fashion & Clothing', icon: Shirt },
  { value: 'Electronics & Gadgets', icon: Smartphone },
  { value: 'Beauty & Grooming', icon: Wand2 },
  { value: 'Books & Stationery', icon: BookOpen },
  { value: 'Accessories', icon: Gem },
  { value: 'Other Product', icon: Sparkles },
];

const NIGERIAN_STATES = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue',
  'Borno', 'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu',
  'FCT (Abuja)', 'Gombe', 'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina',
  'Kebbi', 'Kogi', 'Kwara', 'Lagos', 'Nasarawa', 'Niger', 'Ogun', 'Ondo',
  'Osun', 'Oyo', 'Plateau', 'Rivers', 'Sokoto', 'Taraba', 'Yobe', 'Zamfara',
  'Others',
];
const STEPS = ['Business Name', 'Business Type', 'Business Logo', 'Details', 'Review & Submit'];

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

function ProgressBar({ current, total }) {
  const pct = Math.round(((current + 1) / total) * 100);
  return (
    <div className="mb-6">
      <div className="flex justify-between items-center mb-2">
        <span className="text-xs font-bold text-cyan-600 uppercase tracking-wider">Step {current + 1} of {total}</span>
        <span className="text-xs text-gray-400">{STEPS[current]}</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div className="bg-gradient-to-r from-cyan-500 to-blue-600 h-2 rounded-full transition-all duration-500" style={{ width: pct + '%' }} />
      </div>
    </div>
  );
}

function StyledInput(props) {
  return <input {...props} className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-cyan-500 transition" />;
}
function StyledSelect(props) {
  return <select {...props} className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-cyan-500 transition appearance-none bg-white" />;
}
function StyledTextarea(props) {
  return <textarea {...props} className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-cyan-500 transition resize-none" />;
}

export default function BecomeABusinessPage() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const topRef = useRef(null);

  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const [businessName, setBusinessName] = useState('');
  const [businessCategory, setBusinessCategory] = useState(''); // 'Service Provider' | 'Event Vendor'
  const [businessType, setBusinessType] = useState('');
  const [otherTypeName, setOtherTypeName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [description, setDescription] = useState('');
  const [city, setCity] = useState(''); // ✅ now populated from NIGERIAN_STATES — same field name, so nothing else that reads business.city breaks
  const [customCity, setCustomCity] = useState(''); // for "Others" reveal
  const [area, setArea] = useState(''); // ✅ NEW — optional, e.g. Ikeja, Lekki, Ilorin
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [pricingInfo, setPricingInfo] = useState('');

  const scrollTop = () => { if (topRef.current) topRef.current.scrollIntoView({ behavior: 'smooth' }); };

  // ✅ FIX: navigate() must run as a side effect, not during render.
  // Calling it directly in the render body (the old code) left the page
  // blank instead of actually completing the redirect to /login.
  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
    }
  }, [currentUser, navigate]);

  if (!currentUser) {
    return null;
  }

  const canProceed = () => {
    if (step === 0) return businessName.trim().length > 0;
    if (step === 1) {
      if (!businessCategory || !businessType) return false;
      if ((businessType === 'Other Service' || businessType === 'Other Product') && !otherTypeName.trim()) return false;
      return true;
    }
    if (step === 2) return !!logoUrl;
    if (step === 3) return description.trim().length >= 20 && !!city && (city !== 'Others' || customCity.trim().length > 0) && whatsappNumber.trim().length > 0;
    return true;
  };

  const next = () => { if (canProceed()) { setStep(function (s) { return s + 1; }); scrollTop(); } };
  const back = () => { setStep(function (s) { return Math.max(0, s - 1); }); scrollTop(); };

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { alert('Please select an image file'); return; }
    if (file.size > 10 * 1024 * 1024) { alert('Image must be less than 10MB'); return; }
    try {
      setUploading(true);
      setUploadProgress(0);
      const compressed = await compressImage(file, 800, 0.85);
      const url = await uploadToCloudinary(compressed, 'businesses', setUploadProgress);
      setLogoUrl(url);
    } catch (err) {
      alert(err.message || 'Upload failed, please try again');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await addDoc(collection(db, 'businesses'), {
        ownerId: currentUser.uid,
        ownerEmail: currentUser.email || '',
        businessName: businessName.trim(),
        businessCategory: businessCategory,
        businessType: businessType,
        customTypeName: (businessType === 'Other Service' || businessType === 'Other Product') ? otherTypeName.trim() : null,
        logoUrl: logoUrl,
        description: description.trim(),
        city: city === 'Others' ? customCity.trim() : city,
        area: area.trim() || null,
        whatsappNumber: whatsappNumber.trim(),
        pricingInfo: pricingInfo.trim() || null,
        status: 'pending',
        createdAt: serverTimestamp(),
      });
      setSubmitted(true);
      scrollTop();
    } catch (err) {
      console.error('Error submitting business:', err);
      alert('Something went wrong. Please try again.');
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
          <h1 className="text-2xl font-black text-gray-900 mb-2">Business Submitted!</h1>
          <p className="text-gray-500 mb-2">
            <span className="font-bold text-gray-800">"{businessName}"</span> is under review.
          </p>
          <p className="text-xs text-gray-400 mb-8">We'll email you at <strong>{currentUser.email}</strong> once it's approved. You'll then see a Business mode switcher in your navbar.</p>
          <button onClick={function () { navigate('/dashboard'); }} className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white py-4 rounded-2xl font-bold hover:shadow-lg transition">
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
      <div className="max-w-xl mx-auto px-4 py-10">
        <div className="flex items-center gap-3 mb-6">
          {step > 0 && (
            <button onClick={back} className="w-10 h-10 rounded-xl bg-white border-2 border-gray-200 flex items-center justify-center hover:border-cyan-400 transition flex-shrink-0">
              <ChevronLeft size={18} className="text-gray-600" />
            </button>
          )}
          <div>
            <p className="text-xs text-cyan-600 font-bold uppercase tracking-wider">Become a Business</p>
            <h1 className="text-xl font-black text-gray-900">{STEPS[step]}</h1>
          </div>
        </div>

        <ProgressBar current={step} total={STEPS.length} />

        <div className="bg-white rounded-3xl border-2 border-gray-100 shadow-sm p-6 sm:p-8">

          {step === 0 && (
            <div className="space-y-5">
              <p className="text-sm text-gray-500">What's your business called?</p>
              <div>
                <label className="block text-sm font-bold text-gray-800 mb-1.5">Business Name <span className="text-red-500">*</span></label>
                <StyledInput value={businessName} onChange={function (e) { setBusinessName(e.target.value); }} placeholder="e.g. Tomi's Events & Decor" />
              </div>
              <p className="text-xs text-gray-400">You can add multiple businesses under this account later — this is just your first one.</p>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-5">
              <p className="text-sm text-gray-500">What kind of business is this?</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={function () { setBusinessCategory('Service Provider'); setBusinessType(''); }}
                  className={'text-left p-4 rounded-2xl border-2 transition ' + (businessCategory === 'Service Provider' ? 'border-cyan-500 bg-cyan-50' : 'border-gray-200 hover:border-cyan-300')}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Briefcase size={18} className={businessCategory === 'Service Provider' ? 'text-cyan-600' : 'text-gray-400'} />
                    <span className={'text-sm font-bold ' + (businessCategory === 'Service Provider' ? 'text-cyan-700' : 'text-gray-800')}>Service Provider</span>
                  </div>
                  <p className="text-xs text-gray-500">Gets hired by event planners — DJ, Caterer, Hall, Decorator, and more</p>
                </button>

                <button
                  type="button"
                  onClick={function () { setBusinessCategory('Event Vendor'); setBusinessType(''); }}
                  className={'text-left p-4 rounded-2xl border-2 transition ' + (businessCategory === 'Event Vendor' ? 'border-cyan-500 bg-cyan-50' : 'border-gray-200 hover:border-cyan-300')}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Store size={18} className={businessCategory === 'Event Vendor' ? 'text-cyan-600' : 'text-gray-400'} />
                    <span className={'text-sm font-bold ' + (businessCategory === 'Event Vendor' ? 'text-cyan-700' : 'text-gray-800')}>Event Vendor</span>
                  </div>
                  <p className="text-xs text-gray-500">Rents a stand at events — Food, Fashion, Accessories, and more</p>
                </button>
              </div>

              {businessCategory && (
                <div className="grid grid-cols-3 gap-3 pt-2">
                  {(businessCategory === 'Service Provider' ? SERVICE_PROVIDER_TYPES : EVENT_VENDOR_TYPES).map(function (t) {
                    const Icon = t.icon;
                    const selected = businessType === t.value;
                    return (
                      <button
                        key={t.value}
                        type="button"
                        onClick={function () { setBusinessType(t.value); }}
                        className={'flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition ' + (selected ? 'border-cyan-500 bg-cyan-50' : 'border-gray-200 hover:border-cyan-300')}
                      >
                        <Icon size={20} className={selected ? 'text-cyan-600' : 'text-gray-400'} />
                        <span className={'text-xs font-bold text-center ' + (selected ? 'text-cyan-700' : 'text-gray-600')}>{t.value}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {(businessType === 'Other Service' || businessType === 'Other Product') && (
                <div>
                  <label className="block text-sm font-bold text-gray-800 mb-1.5">
                    {businessType === 'Other Service' ? 'What service do you offer?' : 'What do you sell?'} <span className="text-red-500">*</span>
                  </label>
                  <StyledInput
                    value={otherTypeName}
                    onChange={function (e) { setOtherTypeName(e.target.value); }}
                    placeholder={businessType === 'Other Service' ? 'e.g. Balloon Artist, Cake Baker' : 'e.g. Handmade Jewelry, Perfumes'}
                  />
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <p className="text-sm text-gray-500">Add a logo or a photo that represents your business.</p>
              <div className="flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-2xl hover:border-cyan-400 transition">
                <div className="space-y-1 text-center w-full">
                  {logoUrl ? (
                    <div>
                      <img src={logoUrl} alt="Logo preview" className="mx-auto h-32 w-32 object-cover rounded-2xl" />
                      <button type="button" onClick={function () { setLogoUrl(''); }} className="mt-3 text-sm text-red-600 hover:text-red-700 font-medium">
                        Remove
                      </button>
                    </div>
                  ) : (
                    <div>
                      <Upload className="mx-auto h-10 w-10 text-gray-400" />
                      <div className="flex text-sm text-gray-600 justify-center mt-2">
                        <label className="cursor-pointer font-medium text-cyan-600 hover:text-cyan-500">
                          <span>Upload logo</span>
                          <input type="file" accept="image/*" onChange={handleLogoUpload} disabled={uploading} className="sr-only" />
                        </label>
                      </div>
                      <p className="text-xs text-gray-500">PNG, JPG, WEBP up to 10MB</p>
                    </div>
                  )}
                  {uploading && (
                    <div className="mt-4">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-cyan-500 h-2 rounded-full transition-all duration-300" style={{ width: uploadProgress + '%' }} />
                      </div>
                      <p className="text-xs text-gray-500 mt-2">Uploading {uploadProgress}%...</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-gray-800 mb-1.5">Description <span className="text-red-500">*</span></label>
                <StyledTextarea rows={4} value={description} onChange={function (e) { setDescription(e.target.value); }} placeholder="What do you offer? What makes your business stand out?" />
                <p className="text-xs text-gray-400 mt-1">{description.length} / 20 characters minimum</p>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-800 mb-1.5">City <span className="text-red-500">*</span></label>
                <StyledSelect value={city} onChange={function (e) { setCity(e.target.value); }}>
                  <option value="">Select a state</option>
                  {NIGERIAN_STATES.map(function (s) { return <option key={s}>{s}</option>; })}
                </StyledSelect>
                {city === 'Others' && (
                  <StyledInput
                    className="mt-2"
                    value={customCity}
                    onChange={function (e) { setCustomCity(e.target.value); }}
                    placeholder="Enter your state"
                  />
                )}
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-800 mb-1.5">Area <span className="text-gray-400 font-normal">(optional)</span></label>
                <StyledInput value={area} onChange={function (e) { setArea(e.target.value); }} placeholder="e.g. Ikeja, Lekki, Maitama, Ilorin" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-800 mb-1.5">WhatsApp Number <span className="text-red-500">*</span></label>
                <StyledInput type="tel" value={whatsappNumber} onChange={function (e) { setWhatsappNumber(e.target.value); }} placeholder="+234 800 000 0000" />
                <p className="text-xs text-gray-400 mt-1">Customers will reach you here for bookings</p>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-800 mb-1.5">Pricing Info <span className="text-gray-400 font-normal">(optional)</span></label>
                <StyledInput value={pricingInfo} onChange={function (e) { setPricingInfo(e.target.value); }} placeholder="e.g. Starting from 50,000 naira per event" />
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <p className="text-sm text-gray-500 mb-2">Review before submitting for approval.</p>
              <div className="bg-cyan-50 rounded-2xl p-5 space-y-3 border border-cyan-100">
                {logoUrl && <img src={logoUrl} alt="Logo" className="w-16 h-16 rounded-xl object-cover mb-2" />}
                {[
                  { label: 'Business Name', value: businessName },
                  { label: 'Category', value: businessCategory },
                  { label: 'Type', value: (businessType === 'Other Service' || businessType === 'Other Product') ? (otherTypeName + ' (' + businessType + ')') : businessType },
                  { label: 'City', value: city === 'Others' ? customCity : city },
                  area ? { label: 'Area', value: area } : null,
                  { label: 'WhatsApp', value: whatsappNumber },
                  pricingInfo ? { label: 'Pricing', value: pricingInfo } : null,
                  { label: 'Description', value: description },
                ].filter(Boolean).map(function (row) {
                  return (
                    <div key={row.label} className="flex items-start justify-between gap-4 text-sm">
                      <span className="text-gray-500 flex-shrink-0">{row.label}</span>
                      <span className="font-bold text-gray-900 text-right">{row.value}</span>
                    </div>
                  );
                })}
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                <p className="text-xs text-amber-700 leading-relaxed">
                  Your business will be reviewed within 24-48 hours. Once approved, you'll be able to switch between Consumer and Business mode from your navbar.
                </p>
              </div>
            </div>
          )}

        </div>

        <div className="flex gap-3 mt-6">
          {step > 0 && (
            <button onClick={back} className="flex items-center gap-2 px-6 py-3.5 border-2 border-gray-200 rounded-2xl text-sm font-bold text-gray-600 hover:bg-gray-50 transition">
              <ChevronLeft size={16} /> Back
            </button>
          )}
          {step < STEPS.length - 1 ? (
            <button
              onClick={next}
              disabled={!canProceed()}
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
              {submitting ? 'Submitting...' : 'Submit for Review'}
            </button>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}