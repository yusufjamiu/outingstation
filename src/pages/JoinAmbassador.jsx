import { useState, useEffect, useRef } from 'react';
import { collection, addDoc, getDocs, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import OutingStation from '../assets/OutingStation.png';

const FOUNDER_MESSAGE = `OutingStation is building the platform that makes discovering events, experiences, and places effortless.

We're looking for ambitious students and young professionals who want to be part of a fast-growing brand from an early stage.

As an OutingStation Ambassador, you'll represent the brand on your campus and in your community, earn rewards based on performance, gain real-world marketing experience, and work directly with a team building something meaningful.

This isn't just another ambassador program. It's an opportunity to grow your network, develop valuable skills, and contribute to a product designed to reshape how people discover things to do.

If you're proactive, connected, and excited about building the future of experiences, we'd love to hear from you.

— Yusuf Jamiu
Founder & CEO, OutingStation`;

const REACH_OPTIONS = ['Less than 50', '50–100', '100–500', '500–1,000', '1,000+'];

const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

// ── Typewriter Intro ─────────────────────────────────────────────────────────
function TypewriterIntro({ onDone }) {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);
  const idx = useRef(0);

  useEffect(() => {
    const interval = setInterval(() => {
      if (idx.current < FOUNDER_MESSAGE.length) {
        setDisplayed(FOUNDER_MESSAGE.slice(0, idx.current + 1));
        idx.current++;
      } else {
        clearInterval(interval);
        setTimeout(() => setDone(true), 400);
      }
    }, 18);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-white to-cyan-50 flex items-center justify-center px-4 py-12">
      <div className="max-w-xl w-full">
        <div className="flex justify-center mb-8">
          <img src={OutingStation} alt="OutingStation" className="h-10 w-auto" />
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-8 text-center">
          Join the Movement 🚀
        </h1>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8 min-h-[260px]">
          <p className="text-gray-700 leading-relaxed whitespace-pre-line text-sm sm:text-base">
            {displayed}
            {!done && <span className="inline-block w-0.5 h-4 bg-cyan-500 ml-0.5 animate-pulse align-middle" />}
          </p>
        </div>
        {done && (
          <button
            onClick={onDone}
            className="mt-6 w-full py-4 rounded-2xl bg-gradient-to-r from-cyan-400 to-cyan-500 text-white font-bold text-lg hover:shadow-lg transition animate-fade-in"
          >
            Let's Go →
          </button>
        )}
      </div>
    </div>
  );
}

// ── Main Form ────────────────────────────────────────────────────────────────
export default function JoinAmbassador() {
  const [showIntro, setShowIntro] = useState(true);
  const [step, setStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [universities, setUniversities] = useState([]);

  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    accountEmail: '',
    ambassadorType: '',
    state: '',
    city: '',
    university: '',
    customUniversity: '',
    department: '',
    level: '',
    isContentCreator: '',
    socialHandle: '',
    followerCount: '',
    reach: '',
    availability: '',
    whyJoin: '',
    referredBy: '',
    photoFile: null,
    photoPreview: null,
    photoUrl: '',
    // ID
    idType: '',
    idNumber: '',
    idImageFile: null,
    idImagePreview: null,
    idImageUrl: '',
    // Bank
    bankName: '',
    accountNumber: '',
    accountName: '',
  });

  const [errors, setErrors] = useState({});

  // Fetch universities from Firestore
  useEffect(() => {
    const fetchUniversities = async () => {
      try {
        const snap = await getDocs(collection(db, 'universities'));
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        setUniversities(list);
      } catch (e) {
        console.error('Error fetching universities:', e);
      }
    };
    fetchUniversities();
  }, []);

  const update = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const handlePhoto = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => update('photoPreview', ev.target.result);
    reader.readAsDataURL(file);
    update('photoFile', file);
  };

  const handleIdImage = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => update('idImagePreview', ev.target.result);
    reader.readAsDataURL(file);
    update('idImageFile', file);
  };

  const uploadToCloudinary = async (file) => {
    const data = new FormData();
    data.append('file', file);
    data.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    data.append('folder', 'ambassador_photos');
    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, { method: 'POST', body: data });
    const json = await res.json();
    return json.secure_url;
  };

  const validateStep1 = () => {
    const e = {};
    if (!form.fullName.trim()) e.fullName = 'Full name is required';
    if (!form.email.trim()) e.email = 'Email is required';
    if (!form.phone.trim()) e.phone = 'Phone number is required';
    if (!form.accountEmail.trim()) e.accountEmail = 'Your OutingStation account email is required';
    if (!form.ambassadorType) e.ambassadorType = 'Please select a role';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateStep2 = () => {
    const e = {};
    if (form.ambassadorType === 'campus') {
      if (!form.university) e.university = 'Please select your university';
      if (form.university === 'Other' && !form.customUniversity.trim()) e.customUniversity = 'Please enter your university name';
      if (!form.department.trim()) e.department = 'Department is required';
      if (!form.level.trim()) e.level = 'Level is required';
    } else {
      if (!form.state.trim()) e.state = 'State is required';
      if (!form.city.trim()) e.city = 'City is required';
    }
    if (!form.reach) e.reach = 'Please select your reach';
    if (!form.availability) e.availability = 'Please select availability';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateStep3 = () => {
    const e = {};
    if (!form.whyJoin.trim()) e.whyJoin = 'Please tell us why you want to join';
    if (!form.idType) e.idType = 'Please select an ID type';
    if (!form.idNumber.trim()) e.idNumber = 'ID number is required';
    if (!form.bankName.trim()) e.bankName = 'Bank name is required';
    if (!form.accountNumber.trim()) e.accountNumber = 'Account number is required';
    if (!form.accountName.trim()) e.accountName = 'Account name is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const nextStep = () => {
    if (step === 1 && validateStep1()) setStep(2);
    else if (step === 2 && validateStep2()) setStep(3);
  };

  const handleSubmit = async () => {
    if (!validateStep3()) return;
    setLoading(true);
    try {
      let photoUrl = '';
      if (form.photoFile) {
        photoUrl = await uploadToCloudinary(form.photoFile);
      }

      let idImageUrl = '';
      if (form.idImageFile) {
        idImageUrl = await uploadToCloudinary(form.idImageFile);
      }

      const universityName = form.university === 'Other'
        ? form.customUniversity
        : form.university;

      await addDoc(collection(db, 'ambassadorApplications'), {
        fullName: form.fullName,
        email: form.email,
        phone: form.phone,
        accountEmail: form.accountEmail,
        ambassadorType: form.ambassadorType,
        state: form.state,
        city: form.city,
        university: universityName,
        department: form.department,
        level: form.level,
        isContentCreator: form.isContentCreator,
        socialHandle: form.socialHandle,
        followerCount: form.followerCount,
        reach: form.reach,
        availability: form.availability,
        whyJoin: form.whyJoin,
        referredBy: form.referredBy,
        photoUrl,
        idType: form.idType,
        idNumber: form.idNumber,
        idImageUrl,
        bankName: form.bankName,
        accountNumber: form.accountNumber,
        accountName: form.accountName,
        status: 'pending',
        createdAt: serverTimestamp(),
      });
      setSubmitted(true);
    } catch (err) {
      console.error('Error submitting:', err);
    }
    setLoading(false);
  };

  // ── Intro screen
  if (showIntro) return <TypewriterIntro onDone={() => setShowIntro(false)} />;

  // ── Success screen
  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-white to-cyan-50 flex items-center justify-center px-4 py-12">
        <div className="max-w-md w-full text-center">
          <div className="w-20 h-20 bg-cyan-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-3">Application Received! 🎉</h2>
          <p className="text-gray-500 mb-2">Thank you for applying to be an OutingStation Ambassador.</p>
          <p className="text-gray-500 mb-8">We'll review your application and get back to you within <strong>48 hours</strong>.</p>
          <div className="bg-cyan-50 border border-cyan-200 rounded-2xl p-5 text-left mb-8">
            <p className="font-semibold text-cyan-800 mb-2">What happens next?</p>
            <ul className="text-cyan-700 text-sm space-y-2">
              <li>✓ We'll review your application</li>
              <li>✓ You'll receive a confirmation email</li>
              <li>✓ If approved, we'll send your Ambassador Kit</li>
              <li>✓ Your badge will appear on the OutingStation app</li>
            </ul>
          </div>
          <a href="https://www.outingstation.com"
            className="inline-block bg-cyan-500 text-white px-8 py-3 rounded-full font-semibold hover:bg-cyan-600 transition">
            Back to OutingStation
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-white to-cyan-50 px-4 py-10">
      <div className="max-w-lg mx-auto">

        {/* Logo */}
        <div className="flex justify-center mb-6">
          <img src={OutingStation} alt="OutingStation" className="h-9 w-auto" />
        </div>

        {/* Progress */}
        <div className="flex items-center mb-2">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center flex-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 transition-all ${
                step >= s ? 'bg-cyan-500 text-white' : 'bg-gray-200 text-gray-400'
              }`}>{s}</div>
              {s < 3 && <div className={`flex-1 h-1 mx-2 rounded transition-all ${step > s ? 'bg-cyan-500' : 'bg-gray-200'}`} />}
            </div>
          ))}
        </div>
        <div className="flex justify-between text-[10px] text-gray-400 mb-6 px-0.5">
          <span>Personal Info</span>
          <span className="text-center">Ambassador Details</span>
          <span className="text-right">About You</span>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">

          {/* ── STEP 1 ── */}
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-gray-900 mb-5">Personal Information</h2>

              {/* Photo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Profile Photo</label>
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {form.photoPreview ? (
                      <img src={form.photoPreview} alt="preview" className="w-full h-full object-cover" />
                    ) : (
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                        <circle cx="12" cy="7" r="4"/>
                      </svg>
                    )}
                  </div>
                  <label className="cursor-pointer bg-gray-50 border border-gray-200 text-gray-600 px-4 py-2 rounded-lg text-sm hover:bg-gray-100 transition">
                    Upload Photo
                    <input type="file" accept="image/*" onChange={handlePhoto} className="hidden" />
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                <input value={form.fullName} onChange={e => update('fullName', e.target.value)}
                  placeholder="Your full name"
                  className={`w-full px-4 py-3 rounded-xl border text-sm ${errors.fullName ? 'border-red-400' : 'border-gray-200'} focus:ring-2 focus:ring-cyan-400 focus:border-transparent outline-none`} />
                {errors.fullName && <p className="text-red-500 text-xs mt-1">{errors.fullName}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email Address *</label>
                <input type="email" value={form.email} onChange={e => update('email', e.target.value)}
                  placeholder="your@email.com"
                  className={`w-full px-4 py-3 rounded-xl border text-sm ${errors.email ? 'border-red-400' : 'border-gray-200'} focus:ring-2 focus:ring-cyan-400 outline-none`} />
                {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number *</label>
                <input type="tel" value={form.phone} onChange={e => update('phone', e.target.value)}
                  placeholder="+234 800 000 0000"
                  className={`w-full px-4 py-3 rounded-xl border text-sm ${errors.phone ? 'border-red-400' : 'border-gray-200'} focus:ring-2 focus:ring-cyan-400 outline-none`} />
                {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">OutingStation Account Email *</label>
                <input type="email" value={form.accountEmail} onChange={e => update('accountEmail', e.target.value)}
                  placeholder="Email you used to sign up on OutingStation"
                  className={`w-full px-4 py-3 rounded-xl border text-sm ${errors.accountEmail ? 'border-red-400' : 'border-gray-200'} focus:ring-2 focus:ring-cyan-400 outline-none`} />
                {errors.accountEmail && <p className="text-red-500 text-xs mt-1">{errors.accountEmail}</p>}
                <p className="text-xs text-gray-400 mt-1">
                  Don't have an account?{' '}
                  <a href="https://www.outingstation.com" className="text-cyan-500 hover:underline">Sign up first →</a>
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Ambassador Role *</label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: 'city', label: '🏙️ City Ambassador', desc: 'Represent OutingStation in your city' },
                    { value: 'campus', label: '🎓 Campus Ambassador', desc: 'Represent OutingStation on your campus' },
                  ].map(opt => (
                    <button key={opt.value} type="button"
                      onClick={() => update('ambassadorType', opt.value)}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${
                        form.ambassadorType === opt.value ? 'border-cyan-500 bg-cyan-50' : 'border-gray-200 hover:border-cyan-300'
                      }`}>
                      <p className="font-semibold text-gray-900 text-sm">{opt.label}</p>
                      <p className="text-xs text-gray-500 mt-1">{opt.desc}</p>
                    </button>
                  ))}
                </div>
                {errors.ambassadorType && <p className="text-red-500 text-xs mt-1">{errors.ambassadorType}</p>}
              </div>
            </div>
          )}

          {/* ── STEP 2 ── */}
          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-gray-900 mb-5">
                {form.ambassadorType === 'campus' ? 'Campus Details' : 'Location Details'}
              </h2>

              {form.ambassadorType === 'campus' ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">University *</label>
                    <select value={form.university} onChange={e => update('university', e.target.value)}
                      className={`w-full px-4 py-3 rounded-xl border text-sm ${errors.university ? 'border-red-400' : 'border-gray-200'} focus:ring-2 focus:ring-cyan-400 outline-none bg-white`}>
                      <option value="">Select your university</option>
                      {universities.map(u => (
                        <option key={u.id} value={u.name}>{u.name}</option>
                      ))}
                      <option value="Other">Other</option>
                    </select>
                    {errors.university && <p className="text-red-500 text-xs mt-1">{errors.university}</p>}
                  </div>

                  {form.university === 'Other' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">University Name *</label>
                      <input value={form.customUniversity} onChange={e => update('customUniversity', e.target.value)}
                        placeholder="Enter your university name"
                        className={`w-full px-4 py-3 rounded-xl border text-sm ${errors.customUniversity ? 'border-red-400' : 'border-gray-200'} focus:ring-2 focus:ring-cyan-400 outline-none`} />
                      {errors.customUniversity && <p className="text-red-500 text-xs mt-1">{errors.customUniversity}</p>}
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Department *</label>
                    <input value={form.department} onChange={e => update('department', e.target.value)}
                      placeholder="e.g. Computer Science"
                      className={`w-full px-4 py-3 rounded-xl border text-sm ${errors.department ? 'border-red-400' : 'border-gray-200'} focus:ring-2 focus:ring-cyan-400 outline-none`} />
                    {errors.department && <p className="text-red-500 text-xs mt-1">{errors.department}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Level / Year *</label>
                    <input value={form.level} onChange={e => update('level', e.target.value)}
                      placeholder="e.g. 300 Level"
                      className={`w-full px-4 py-3 rounded-xl border text-sm ${errors.level ? 'border-red-400' : 'border-gray-200'} focus:ring-2 focus:ring-cyan-400 outline-none`} />
                    {errors.level && <p className="text-red-500 text-xs mt-1">{errors.level}</p>}
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">State *</label>
                    <input value={form.state} onChange={e => update('state', e.target.value)}
                      placeholder="e.g. Lagos"
                      className={`w-full px-4 py-3 rounded-xl border text-sm ${errors.state ? 'border-red-400' : 'border-gray-200'} focus:ring-2 focus:ring-cyan-400 outline-none`} />
                    {errors.state && <p className="text-red-500 text-xs mt-1">{errors.state}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">City *</label>
                    <input value={form.city} onChange={e => update('city', e.target.value)}
                      placeholder="e.g. Ikeja"
                      className={`w-full px-4 py-3 rounded-xl border text-sm ${errors.city ? 'border-red-400' : 'border-gray-200'} focus:ring-2 focus:ring-cyan-400 outline-none`} />
                    {errors.city && <p className="text-red-500 text-xs mt-1">{errors.city}</p>}
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">How many people can you reach? *</label>
                <div className="flex flex-wrap gap-2">
                  {REACH_OPTIONS.map(opt => (
                    <button key={opt} type="button" onClick={() => update('reach', opt)}
                      className={`px-3 py-1.5 rounded-full text-xs border-2 transition-all ${
                        form.reach === opt
                          ? 'border-cyan-500 bg-cyan-50 text-cyan-700 font-semibold'
                          : 'border-gray-200 text-gray-600 hover:border-cyan-300'
                      }`}>{opt}</button>
                  ))}
                </div>
                {errors.reach && <p className="text-red-500 text-xs mt-1">{errors.reach}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Availability *</label>
                <div className="grid grid-cols-2 gap-3">
                  {['Part time', 'Full time'].map(opt => (
                    <button key={opt} type="button" onClick={() => update('availability', opt)}
                      className={`p-3 rounded-xl border-2 text-sm font-medium transition-all ${
                        form.availability === opt
                          ? 'border-cyan-500 bg-cyan-50 text-cyan-700'
                          : 'border-gray-200 text-gray-600 hover:border-cyan-300'
                      }`}>{opt}</button>
                  ))}
                </div>
                {errors.availability && <p className="text-red-500 text-xs mt-1">{errors.availability}</p>}
              </div>
            </div>
          )}

          {/* ── STEP 3 ── */}
          {step === 3 && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-gray-900 mb-5">About You</h2>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Are you a content creator?</label>
                <div className="grid grid-cols-2 gap-3">
                  {['Yes', 'No'].map(opt => (
                    <button key={opt} type="button" onClick={() => update('isContentCreator', opt)}
                      className={`p-3 rounded-xl border-2 text-sm font-medium transition-all ${
                        form.isContentCreator === opt
                          ? 'border-cyan-500 bg-cyan-50 text-cyan-700'
                          : 'border-gray-200 text-gray-600 hover:border-cyan-300'
                      }`}>{opt}</button>
                  ))}
                </div>
              </div>

              {form.isContentCreator === 'Yes' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">TikTok / Instagram Handle</label>
                    <input value={form.socialHandle} onChange={e => update('socialHandle', e.target.value)}
                      placeholder="@yourhandle"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-cyan-400 outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Follower Count</label>
                    <input value={form.followerCount} onChange={e => update('followerCount', e.target.value)}
                      placeholder="e.g. 5,000"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-cyan-400 outline-none" />
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Why do you want to be an OutingStation Ambassador? *
                </label>
                <textarea value={form.whyJoin} onChange={e => update('whyJoin', e.target.value)}
                  placeholder="Tell us what drives you and why you're the right fit..."
                  rows={4}
                  className={`w-full px-4 py-3 rounded-xl border text-sm ${errors.whyJoin ? 'border-red-400' : 'border-gray-200'} focus:ring-2 focus:ring-cyan-400 outline-none resize-none`} />
                {errors.whyJoin && <p className="text-red-500 text-xs mt-1">{errors.whyJoin}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Were you referred by someone? <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input value={form.referredBy} onChange={e => update('referredBy', e.target.value)}
                  placeholder="Enter their name or referral code"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-cyan-400 outline-none" />
              </div>

              {/* ── ID Verification ── */}
              <div className="pt-2">
                <p className="text-sm font-bold text-gray-800 mb-3">ID Verification</p>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">ID Type *</label>
                  <div className="flex flex-wrap gap-2">
                    {form.ambassadorType === 'campus'
                      ? ['School ID'].map(opt => (
                          <button key={opt} type="button" onClick={() => update('idType', opt)}
                            className={`px-3 py-1.5 rounded-full text-xs border-2 transition-all ${
                              form.idType === opt ? 'border-cyan-500 bg-cyan-50 text-cyan-700 font-semibold' : 'border-gray-200 text-gray-600 hover:border-cyan-300'
                            }`}>{opt}</button>
                        ))
                      : ['NIN', "Driver's License", 'International Passport'].map(opt => (
                          <button key={opt} type="button" onClick={() => update('idType', opt)}
                            className={`px-3 py-1.5 rounded-full text-xs border-2 transition-all ${
                              form.idType === opt ? 'border-cyan-500 bg-cyan-50 text-cyan-700 font-semibold' : 'border-gray-200 text-gray-600 hover:border-cyan-300'
                            }`}>{opt}</button>
                        ))
                    }
                  </div>
                  {errors.idType && <p className="text-red-500 text-xs mt-1">{errors.idType}</p>}
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">ID Number *</label>
                  <input value={form.idNumber} onChange={e => update('idNumber', e.target.value)}
                    placeholder={form.ambassadorType === 'campus' ? 'e.g. STU/2024/001' : 'Enter your ID number'}
                    className={`w-full px-4 py-3 rounded-xl border text-sm ${errors.idNumber ? 'border-red-400' : 'border-gray-200'} focus:ring-2 focus:ring-cyan-400 outline-none`} />
                  {errors.idNumber && <p className="text-red-500 text-xs mt-1">{errors.idNumber}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Upload ID Image</label>
                  <div className="flex items-center gap-4">
                    {form.idImagePreview && (
                      <img src={form.idImagePreview} alt="ID preview"
                        className="w-20 h-14 object-cover rounded-lg border border-gray-200 flex-shrink-0" />
                    )}
                    <label className="cursor-pointer bg-gray-50 border-2 border-dashed border-gray-200 text-gray-600 px-4 py-3 rounded-xl text-sm hover:bg-gray-100 transition flex items-center gap-2">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                        <polyline points="17 8 12 3 7 8"/>
                        <line x1="12" y1="3" x2="12" y2="15"/>
                      </svg>
                      {form.idImagePreview ? 'Change Image' : 'Upload ID Image'}
                      <input type="file" accept="image/*" onChange={handleIdImage} className="hidden" />
                    </label>
                  </div>
                </div>
              </div>

              {/* ── Bank Details ── */}
              <div className="pt-2">
                <p className="text-sm font-bold text-gray-800 mb-3">Bank Details</p>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Bank Name *</label>
                    <input value={form.bankName} onChange={e => update('bankName', e.target.value)}
                      placeholder="e.g. First Bank, GTBank"
                      className={`w-full px-4 py-3 rounded-xl border text-sm ${errors.bankName ? 'border-red-400' : 'border-gray-200'} focus:ring-2 focus:ring-cyan-400 outline-none`} />
                    {errors.bankName && <p className="text-red-500 text-xs mt-1">{errors.bankName}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Account Number *</label>
                    <input value={form.accountNumber} onChange={e => update('accountNumber', e.target.value.replace(/\D/g, '').slice(0, 10))}
                      placeholder="10-digit account number"
                      className={`w-full px-4 py-3 rounded-xl border text-sm ${errors.accountNumber ? 'border-red-400' : 'border-gray-200'} focus:ring-2 focus:ring-cyan-400 outline-none`} />
                    {errors.accountNumber && <p className="text-red-500 text-xs mt-1">{errors.accountNumber}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Account Name *</label>
                    <input value={form.accountName} onChange={e => update('accountName', e.target.value)}
                      placeholder="Name on your bank account"
                      className={`w-full px-4 py-3 rounded-xl border text-sm ${errors.accountName ? 'border-red-400' : 'border-gray-200'} focus:ring-2 focus:ring-cyan-400 outline-none`} />
                    {errors.accountName && <p className="text-red-500 text-xs mt-1">{errors.accountName}</p>}
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* Navigation */}
          <div className="flex gap-3 mt-7">
            {step > 1 && (
              <button onClick={() => setStep(step - 1)}
                className="flex-1 py-3 rounded-xl border-2 border-gray-200 text-gray-600 text-sm font-semibold hover:border-gray-300 transition">
                ← Back
              </button>
            )}
            {step < 3 ? (
              <button onClick={nextStep}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-cyan-400 to-cyan-500 text-white text-sm font-semibold hover:shadow-lg transition">
                Continue →
              </button>
            ) : (
              <button onClick={handleSubmit} disabled={loading}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-cyan-400 to-cyan-500 text-white text-sm font-semibold hover:shadow-lg transition disabled:opacity-60">
                {loading ? 'Submitting...' : 'Submit Application 🚀'}
              </button>
            )}
          </div>
        </div>

        <p className="text-xs text-gray-400 text-center mt-6">
          © {new Date().getFullYear()} OutingStation Limited. All rights reserved.
        </p>
      </div>
    </div>
  );
}