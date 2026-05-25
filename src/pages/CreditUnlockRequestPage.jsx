import { useState, useEffect } from 'react';
import { collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { CheckCircle, Youtube, Facebook } from 'lucide-react';

// ─── Real brand SVG logos ─────────────────────────────────────────────────

const InstagramIcon = ({ size = 20, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <defs>
      <linearGradient id="ig-grad" x1="0%" y1="100%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#F58529" />
        <stop offset="50%" stopColor="#DD2A7B" />
        <stop offset="100%" stopColor="#515BD4" />
      </linearGradient>
    </defs>
    <rect x="2" y="2" width="20" height="20" rx="6" ry="6" stroke="url(#ig-grad)" strokeWidth="2" fill="none" />
    <circle cx="12" cy="12" r="4.5" stroke="url(#ig-grad)" strokeWidth="2" fill="none" />
    <circle cx="17.5" cy="6.5" r="1.2" fill="url(#ig-grad)" />
  </svg>
);

const InstagramIconWhite = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <rect x="2" y="2" width="20" height="20" rx="6" ry="6" stroke="white" strokeWidth="2" fill="none" />
    <circle cx="12" cy="12" r="4.5" stroke="white" strokeWidth="2" fill="none" />
    <circle cx="17.5" cy="6.5" r="1.2" fill="white" />
  </svg>
);

const XIcon = ({ size = 20, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L2.25 2.25h6.907l4.262 5.632zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const TikTokIcon = ({ size = 20, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.95a8.16 8.16 0 004.77 1.52V7.02a4.85 4.85 0 01-1-.33z" />
  </svg>
);

const LinkedInIcon = ({ size = 20, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
  </svg>
);

// ─── Platform config ──────────────────────────────────────────────────────

const SOCIAL_HANDLES = [
  {
    id: 'instagram',
    name: 'Instagram',
    Icon: InstagramIcon,
    IconWhite: InstagramIconWhite,
    colorClass: 'text-pink-500',
    bg: 'bg-pink-50 border-pink-200',
    iconBg: 'bg-pink-50',
    selectedBg: 'bg-gradient-to-br from-orange-400 via-pink-500 to-purple-600',
    handle: '@outingstation',
    link: 'https://instagram.com/outingstation',
    placeholder: 'Your Instagram username e.g @johndoe',
  },
  {
    id: 'twitter',
    name: 'X (Twitter)',
    Icon: XIcon,
    IconWhite: XIcon,
    colorClass: 'text-black',
    bg: 'bg-gray-100 border-gray-300',
    iconBg: 'bg-gray-100',
    selectedBg: 'bg-black',
    handle: '@outingstation',
    link: 'https://x.com/outingstation',
    placeholder: 'Your X username e.g @johndoe',
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    Icon: TikTokIcon,
    IconWhite: TikTokIcon,
    colorClass: 'text-black',
    bg: 'bg-gray-50 border-gray-200',
    iconBg: 'bg-gray-50',
    selectedBg: 'bg-black',
    handle: '@outingstation',
    link: 'https://tiktok.com/@outingstation',
    placeholder: 'Your TikTok username e.g @johndoe',
  },
  {
    id: 'facebook',
    name: 'Facebook',
    Icon: Facebook,
    IconWhite: Facebook,
    colorClass: 'text-blue-600',
    bg: 'bg-blue-50 border-blue-200',
    iconBg: 'bg-blue-50',
    selectedBg: 'bg-blue-600',
    handle: 'OutingStation',
    link: 'https://facebook.com/outingstation',
    placeholder: 'Your Facebook name or profile link',
  },
  {
    id: 'youtube',
    name: 'YouTube',
    Icon: Youtube,
    IconWhite: Youtube,
    colorClass: 'text-red-500',
    bg: 'bg-red-50 border-red-200',
    iconBg: 'bg-red-50',
    selectedBg: 'bg-red-500',
    handle: 'OutingStation',
    link: 'https://youtube.com/@outingstation',
    placeholder: 'Your YouTube channel name or link',
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    Icon: LinkedInIcon,
    IconWhite: LinkedInIcon,
    colorClass: 'text-blue-700',
    bg: 'bg-blue-50 border-blue-300',
    iconBg: 'bg-blue-50',
    selectedBg: 'bg-[#0A66C2]',
    handle: 'outingstation',
    link: 'https://linkedin.com/company/outingstation',
    placeholder: 'Your LinkedIn profile name or URL',
  },
];

const MIN_FOLLOWS_REQUIRED = 3;

// ─── Page ─────────────────────────────────────────────────────────────────

export default function CreditUnlockRequestPage() {
  const { currentUser, userProfile } = useAuth();
  const [step, setStep] = useState(1);
  const [selectedPlatforms, setSelectedPlatforms] = useState({});
  const [usernames, setUsernames] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [alreadyRequested, setAlreadyRequested] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState({});

  const selectedCount = Object.keys(selectedPlatforms).filter(k => selectedPlatforms[k]).length;
  const canProceed = selectedCount >= MIN_FOLLOWS_REQUIRED;

  useEffect(() => {
    checkExistingRequest();
  }, [currentUser]);

  const checkExistingRequest = async () => {
    if (!currentUser) { setLoading(false); return; }
    try {
      const q = query(
        collection(db, 'creditUnlockRequests'),
        where('userId', '==', currentUser.uid),
        where('status', 'in', ['pending', 'approved'])
      );
      const snap = await getDocs(q);
      if (!snap.empty) setAlreadyRequested(true);
    } catch (err) {
      console.error('Error checking request:', err);
    }
    setLoading(false);
  };

  const togglePlatform = (platformId) => {
    setSelectedPlatforms(prev => ({ ...prev, [platformId]: !prev[platformId] }));
    setErrors(prev => ({ ...prev, [platformId]: '' }));
  };

  const handleUsernameChange = (platformId, value) => {
    setUsernames(prev => ({ ...prev, [platformId]: value }));
    setErrors(prev => ({ ...prev, [platformId]: '' }));
  };

  const validateStep2 = () => {
    const newErrors = {};
    let valid = true;
    SOCIAL_HANDLES.forEach(platform => {
      if (selectedPlatforms[platform.id]) {
        if (!usernames[platform.id]?.trim()) {
          newErrors[platform.id] = `Please enter your ${platform.name} username`;
          valid = false;
        }
      }
    });
    setErrors(newErrors);
    return valid;
  };

  const handleSubmit = async () => {
    if (!validateStep2()) return;
    setSubmitting(true);
    try {
      const followedPlatforms = SOCIAL_HANDLES
        .filter(p => selectedPlatforms[p.id])
        .map(p => ({
          platform: p.id,
          platformName: p.name,
          username: usernames[p.id]?.trim(),
          handle: p.handle,
        }));

      await addDoc(collection(db, 'creditUnlockRequests'), {
        userId: currentUser.uid,
        userName: userProfile?.name || currentUser.displayName || 'Unknown',
        userEmail: currentUser.email,
        followedPlatforms,
        totalPlatformsFollowed: followedPlatforms.length,
        status: 'pending',
        submittedAt: serverTimestamp(),
        reviewedAt: null,
        reviewedBy: null,
        reviewNote: null,
      });

      setStep(3);
    } catch (err) {
      console.error('Error submitting request:', err);
      alert('Submission failed. Please try again.');
    }
    setSubmitting(false);
  };

  // ─── Loading ───────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-cyan-500" />
        </div>
        <Footer />
      </div>
    );
  }

  // ─── Not logged in ─────────────────────────────────────────────────────

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-lg mx-auto px-4 py-20 text-center">
          <div className="text-6xl mb-6">🔒</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">Login Required</h1>
          <p className="text-gray-600 mb-6">You need to be logged in to request credit unlock.</p>
          <a href="/login" className="inline-block bg-cyan-500 text-white px-6 py-3 rounded-xl font-semibold hover:bg-cyan-600 transition">
            Login
          </a>
        </div>
        <Footer />
      </div>
    );
  }

  // ─── Already requested ─────────────────────────────────────────────────

  if (alreadyRequested) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-lg mx-auto px-4 py-20 text-center">
          <div className="w-20 h-20 bg-cyan-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={40} className="text-cyan-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">Request Already Submitted</h1>
          <p className="text-gray-600 mb-2">
            You've already submitted a credit unlock request. Our team is reviewing it.
          </p>
          <p className="text-sm text-gray-400 mb-8">
            Review typically takes 15–30 days. We'll notify you by email when it's done.
          </p>
          <a href="/dashboard" className="inline-block bg-cyan-500 text-white px-6 py-3 rounded-xl font-semibold hover:bg-cyan-600 transition">
            Back to Dashboard
          </a>
        </div>
        <Footer />
      </div>
    );
  }

  // ─── Step 3: Success ───────────────────────────────────────────────────

  if (step === 3) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-lg mx-auto px-4 py-20 text-center">
          <div className="w-24 h-24 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
            <CheckCircle size={48} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-3">Request Submitted! 🎉</h1>
          <p className="text-gray-600 mb-2 text-lg">
            Thank you for following OutingStation on social media!
          </p>
          <p className="text-gray-500 mb-8 text-sm">
            Our team will review your request within <strong>15–30 days</strong>.
            You'll receive an email at <strong>{currentUser.email}</strong> once your credits are unlocked.
          </p>
          <div className="bg-cyan-50 border border-cyan-200 rounded-2xl p-6 mb-8 text-left">
            <h3 className="font-bold text-gray-900 mb-3">📋 What happens next?</h3>
            <div className="space-y-2 text-sm text-gray-700">
              <p>✅ We verify your follows on each platform</p>
              <p>✅ Admin approves your request</p>
              <p>✅ Your credits get unlocked automatically</p>
              <p>✅ You receive an email confirmation</p>
            </div>
          </div>
          <a href="/dashboard" className="inline-block bg-gradient-to-r from-cyan-500 to-blue-600 text-white px-8 py-3 rounded-xl font-bold hover:shadow-lg transition">
            Back to Dashboard
          </a>
        </div>
        <Footer />
      </div>
    );
  }

  // ─── Step 1 & 2 ────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-2xl mx-auto px-4 py-10">

        {/* Header */}
        <div className="text-center mb-10">
          <div className="text-5xl mb-4">🔓</div>
          <h1 className="text-3xl font-bold text-gray-900 mb-3">Unlock Your Credits</h1>
          <p className="text-gray-600 max-w-md mx-auto">
            Follow OutingStation on at least <strong>{MIN_FOLLOWS_REQUIRED} social platforms</strong> to request a credit unlock.
          </p>
        </div>

        {/* Progress steps */}
        <div className="flex items-center justify-center gap-3 mb-4">
          {[1, 2].map(s => (
            <div key={s} className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition ${
                step >= s ? 'bg-cyan-500 text-white' : 'bg-gray-200 text-gray-500'
              }`}>
                {step > s ? '✓' : s}
              </div>
              {s < 2 && <div className={`w-16 h-1 rounded ${step > s ? 'bg-cyan-500' : 'bg-gray-200'}`} />}
            </div>
          ))}
        </div>
        <div className="flex justify-center gap-16 mb-8 text-xs text-gray-500">
          <span className={step >= 1 ? 'text-cyan-600 font-semibold' : ''}>Follow & Select</span>
          <span className={step >= 2 ? 'text-cyan-600 font-semibold' : ''}>Enter Usernames</span>
        </div>

        {/* ── STEP 1 ── */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
              <p className="text-sm text-amber-800 font-medium">
                👆 First, follow OutingStation on at least {MIN_FOLLOWS_REQUIRED} platforms below, then check the ones you've followed.
              </p>
            </div>

            {SOCIAL_HANDLES.map(platform => {
              const { Icon, IconWhite } = platform;
              const isSelected = selectedPlatforms[platform.id];

              return (
                <div
                  key={platform.id}
                  className={`border-2 rounded-2xl p-4 transition-all ${
                    isSelected
                      ? 'border-cyan-500 bg-cyan-50'
                      : `border bg-white ${platform.bg}`
                  }`}
                >
                  {/* Row 1: icon + name + checkbox */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Platform icon */}
                      <div className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center ${
                        isSelected ? platform.selectedBg : platform.iconBg
                      }`}>
                        {isSelected
                          ? <IconWhite size={20} className="text-white" />
                          : <Icon size={20} className={platform.colorClass} />
                        }
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-gray-900 text-sm leading-tight">{platform.name}</p>
                        <p className="text-xs text-gray-500 truncate">{platform.handle}</p>
                      </div>
                    </div>

                    {/* Checkbox */}
                    <button
                      onClick={() => togglePlatform(platform.id)}
                      className={`w-7 h-7 shrink-0 rounded-full border-2 flex items-center justify-center transition ml-3 ${
                        isSelected
                          ? 'bg-cyan-500 border-cyan-500'
                          : 'border-gray-300 bg-white'
                      }`}
                    >
                      {isSelected && (
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                          <path d="M20 6L9 17l-5-5" />
                        </svg>
                      )}
                    </button>
                  </div>

                  {/* Row 2: Follow button */}
                  <a
                    href={platform.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full text-center text-sm bg-white border border-gray-300 text-gray-700 px-3 py-2 rounded-lg hover:border-cyan-400 hover:text-cyan-600 transition font-medium"
                  >
                    Follow {platform.name} →
                  </a>
                </div>
              );
            })}

            <div className="pt-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-gray-600">
                  Selected:{' '}
                  <span className={`font-bold ${canProceed ? 'text-cyan-600' : 'text-orange-500'}`}>
                    {selectedCount} / {MIN_FOLLOWS_REQUIRED} minimum
                  </span>
                </p>
                {canProceed && (
                  <span className="text-xs text-emerald-600 font-semibold">✅ Ready</span>
                )}
              </div>
              <button
                onClick={() => canProceed && setStep(2)}
                disabled={!canProceed}
                className={`w-full py-4 rounded-2xl font-bold text-lg transition ${
                  canProceed
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:shadow-lg'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                {canProceed ? 'Continue →' : `Follow at least ${MIN_FOLLOWS_REQUIRED} platforms to continue`}
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 2 ── */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
              <p className="text-sm text-blue-800 font-medium">
                📝 Enter your username on each platform you followed so we can verify your follows.
              </p>
            </div>

            {SOCIAL_HANDLES.filter(p => selectedPlatforms[p.id]).map(platform => {
              const { Icon, IconWhite } = platform;
              return (
                <div key={platform.id} className="border-2 border-cyan-200 rounded-2xl p-4 bg-cyan-50">
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center ${platform.selectedBg}`}>
                      <IconWhite size={20} className="text-white" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-gray-900 text-sm">{platform.name}</p>
                      <p className="text-xs text-gray-500 truncate">Following: {platform.handle}</p>
                    </div>
                  </div>
                  <input
                    type="text"
                    value={usernames[platform.id] || ''}
                    onChange={(e) => handleUsernameChange(platform.id, e.target.value)}
                    placeholder={platform.placeholder}
                    className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-2 focus:ring-cyan-400 outline-none text-sm ${
                      errors[platform.id] ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-white'
                    }`}
                  />
                  {errors[platform.id] && (
                    <p className="text-red-500 text-xs mt-1">{errors[platform.id]}</p>
                  )}
                </div>
              );
            })}

            {/* Summary */}
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
              <p className="text-sm font-semibold text-gray-700 mb-2">📋 Request Summary:</p>
              <p className="text-xs text-gray-600">User: <strong>{userProfile?.name || currentUser.email}</strong></p>
              <p className="text-xs text-gray-600">Platforms followed: <strong>{selectedCount}</strong></p>
              <p className="text-xs text-gray-500 mt-2">⏱ Review time: <strong>15–30 days</strong></p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setStep(1)}
                className="flex-1 py-3 rounded-xl border-2 border-gray-200 text-gray-700 font-semibold hover:bg-gray-50 transition"
              >
                ← Back
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold hover:shadow-lg transition disabled:opacity-50"
              >
                {submitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Submitting...
                  </span>
                ) : 'Submit Request 🚀'}
              </button>
            </div>

            <p className="text-xs text-center text-gray-400 pb-4">
              By submitting, you confirm that you have genuinely followed OutingStation on the selected platforms.
              False submissions will result in permanent credit ban.
            </p>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}