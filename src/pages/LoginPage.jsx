import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, Eye, EyeOff, ArrowLeft, Phone, MapPin } from 'lucide-react';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { sendWelcomeMessage } from '../services/whatsappService';
import Event from './../assets/event.jpg';
import Connectwithpeople from './../assets/Connectwithpeople.JPG';
import GetNotified from './../assets/GetNotified.JPG';

// ✅ NEW — same list used everywhere else city is collected (SignupPage,
// Settings, BecomeABusinessPage). Needed here now because Google login
// can create a brand-new account just as easily as Google signup can.
const NIGERIAN_STATES = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue',
  'Borno', 'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu',
  'FCT (Abuja)', 'Gombe', 'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina',
  'Kebbi', 'Kogi', 'Kwara', 'Lagos', 'Nasarawa', 'Niger', 'Ogun', 'Ondo',
  'Osun', 'Oyo', 'Plateau', 'Rivers', 'Sokoto', 'Taraba', 'Yobe', 'Zamfara',
  'Others',
];

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const { login, loginWithGoogle, currentUser } = useAuth();
  const navigate = useNavigate();

  // ✅ NEW — Firebase's Google sign-in doesn't distinguish "login" from
  // "signup": tapping this button with no existing account silently
  // creates one (via AuthContext's ensureUserDocument), with an empty
  // city and no phone collected at all — unlike SignupPage.jsx's Google
  // button, which already handles this case. This screen now does too.
  const [showOnboardingModal, setShowOnboardingModal] = useState(false);
  const [onboardingUserId, setOnboardingUserId] = useState(null);
  const [onboardingCity, setOnboardingCity] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [savingOnboarding, setSavingOnboarding] = useState(false);

  useEffect(() => {
    if (currentUser && !showOnboardingModal) navigate('/');
  }, [currentUser, navigate, showOnboardingModal]);

  const carouselImages = [
    {
      image: Event,
      title: 'Discover Events',
      description: 'Browse curated lists filtered by date, category or vibe to find your perfect match.'
    },
    {
      image: Connectwithpeople,
      title: 'Connect with Community',
      description: 'Join thousands of event-goers and make unforgettable memories.'
    },
    {
      image: GetNotified,
      title: 'Never Miss Out',
      description: 'Get notified about the latest events happening around you.'
    }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % carouselImages.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const validatePhone = (phone) => {
    const trimmedPhone = phone.trim();
    if (!trimmedPhone) return 'Phone number is required';
    const cleanPhone = trimmedPhone.replace(/[\s\-()]/g, '');
    if (cleanPhone.startsWith('+234')) {
      if (cleanPhone.length !== 14) return 'Phone number must be 10 digits after +234';
    } else if (cleanPhone.startsWith('234')) {
      if (cleanPhone.length !== 13) return 'Phone number must be 10 digits after 234';
    } else {
      if (cleanPhone.length < 10 || cleanPhone.length > 11) return 'Phone number must be 10-11 digits';
    }
    return null;
  };

  // ✅ Create welcome notification — same as SignupPage.jsx, since a new
  // account created via this button never went through that flow otherwise
  const createWelcomeNotification = async (userId) => {
    try {
      await setDoc(doc(db, 'notifications', `welcome_${userId}`), {
        userId: userId,
        type: 'welcome',
        title: 'Welcome to OutingStation! 🎉',
        message: 'Start discovering amazing events and places in your city.',
        read: false,
        createdAt: serverTimestamp()
      });
    } catch (err) {
      console.error('Error creating welcome notification:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setError('');
      setLoading(true);
      await login(email, password);
      navigate('/');
    } catch (err) {
      console.error('❌ Login error:', err);
      if (
        err.code === 'auth/user-not-found' ||
        err.code === 'auth/wrong-password' ||
        err.code === 'auth/invalid-credential'
      ) {
        setError('Invalid email or password. Please try again.');
      } else if (err.code === 'auth/too-many-requests') {
        setError('Too many failed attempts. Please try again later.');
      } else {
        setError('Failed to login. Please try again.');
      }
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setError('');
      setLoading(true);
      const result = await loginWithGoogle();

      const isNewUser = result?.additionalUserInfo?.isNewUser;
      const userId = result?.user?.uid;

      if (isNewUser && userId) {
        await createWelcomeNotification(userId);
        setOnboardingUserId(userId);
        setLoading(false);
        setShowOnboardingModal(true);
      } else {
        navigate('/');
      }
    } catch (err) {
      console.error('❌ Google login error:', err);
      setError('Failed to sign in with Google. Please try again.');
      setLoading(false);
    }
  };

  // ✅ Save phone + city from the onboarding modal — same pattern as
  // SignupPage.jsx's savePhoneNumber
  const saveOnboardingInfo = async () => {
    const phoneValidationError = validatePhone(phoneNumber);
    if (phoneValidationError) {
      setPhoneError(phoneValidationError);
      return false;
    }

    try {
      setSavingOnboarding(true);
      setPhoneError('');

      let formattedPhone = phoneNumber.trim();
      if (!formattedPhone.startsWith('+234') && !formattedPhone.startsWith('234')) {
        formattedPhone = formattedPhone.replace(/^0/, '');
        formattedPhone = '+234' + formattedPhone;
      }

      const userRef = doc(db, 'users', onboardingUserId);
      await setDoc(userRef, {
        phone: formattedPhone,
        ...(onboardingCity ? { city: onboardingCity } : {}),
      }, { merge: true });

      await sendWelcomeMessage({ phone: formattedPhone, name: currentUser?.displayName || 'there' });

      setSavingOnboarding(false);
      setShowOnboardingModal(false);
      return true;
    } catch (error) {
      console.error('❌ Error saving onboarding info:', error);
      setPhoneError('Failed to save. Please try again.');
      setSavingOnboarding(false);
      return false;
    }
  };

  return (
    <div className="min-h-screen flex">

      {/* Left Side - Form */}
      <div className="w-full lg:w-1/2 bg-white flex items-center justify-center p-8">
        <div className="max-w-md w-full">

          <Link to="/" className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-8 transition-colors">
            <ArrowLeft size={20} />
            <span>Back to Website</span>
          </Link>

          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
              Welcome to <span className="text-cyan-400">OutingStation!</span>
            </h1>
            <p className="text-gray-600">Login to continue having an amazing experience</p>
          </div>

          {/* Social Login Buttons */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="flex items-center justify-center gap-2 bg-white border-2 border-gray-200 rounded-xl py-3 hover:border-gray-300 hover:bg-gray-50 transition-all disabled:opacity-50"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <span className="font-medium text-gray-700">Google</span>
            </button>
            <button
              disabled
              className="flex items-center justify-center gap-2 bg-white border-2 border-gray-200 rounded-xl py-3 opacity-40 cursor-not-allowed"
              title="Apple Sign-In available on mobile app"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
              </svg>
              <span className="font-medium text-gray-700">Apple</span>
            </button>
          </div>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-500">Or continue with email</span>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-xl mb-6 text-sm">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                <Mail className="text-gray-400" size={20} />
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-11 pr-4 py-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-400 focus:border-transparent outline-none bg-gray-50"
                placeholder="Email address"
              />
            </div>

            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                <Lock className="text-gray-400" size={20} />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-11 pr-12 py-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-400 focus:border-transparent outline-none bg-gray-50"
                placeholder="Password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-cyan-500 focus:ring-cyan-400" />
                <span className="text-sm text-gray-600">Remember me</span>
              </label>
              <Link to="/forgot-password" className="text-sm text-cyan-500 hover:text-cyan-600 font-medium">
                Forgot Password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-cyan-400 to-cyan-500 text-white py-4 rounded-xl font-semibold hover:shadow-lg hover:from-cyan-500 hover:to-cyan-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Logging in...
                </span>
              ) : 'Login'}
            </button>
          </form>

          <p className="mt-8 text-center text-gray-600 text-sm">
            Don't have an account?{' '}
            <Link to="/signup" className="text-cyan-500 font-semibold hover:text-cyan-600">Sign up now</Link>
          </p>

        </div>
      </div>

      {/* Right Side - Carousel */}
      <div className="hidden lg:block lg:w-1/2 relative bg-gray-900 overflow-hidden">
        {carouselImages.map((slide, index) => (
          <div
            key={index}
            className={'absolute inset-0 transition-opacity duration-1000 ' + (index === currentSlide ? 'opacity-100' : 'opacity-0')}
          >
            <img src={slide.image} alt={slide.title} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent"></div>
            <div className="absolute bottom-20 left-0 right-0 text-center text-white px-12">
              <h2 className="text-3xl font-bold mb-4">{slide.title}</h2>
              <p className="text-lg text-gray-200 leading-relaxed">{slide.description}</p>
            </div>
          </div>
        ))}
        <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-2 z-10">
          {carouselImages.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={'h-2 rounded-full transition-all duration-300 ' + (index === currentSlide ? 'bg-white w-8' : 'bg-white/50 w-2')}
            />
          ))}
        </div>
      </div>

      {/* ✅ NEW — Onboarding modal for accounts created via this Google
          button (Firebase doesn't distinguish login from signup) */}
      {showOnboardingModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome! One More Step 📱</h2>
            <p className="text-gray-600 mb-6">
              Add your phone number for WhatsApp updates, and your city so we can show you events happening near you.
            </p>

            {phoneError && (
              <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-lg mb-4 text-sm">
                {phoneError}
              </div>
            )}

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">City <span className="text-gray-400 font-normal">(optional)</span></label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                  <MapPin className="text-gray-400" size={18} />
                </div>
                <select
                  value={onboardingCity}
                  onChange={(e) => setOnboardingCity(e.target.value)}
                  className="w-full pl-11 pr-4 py-3.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-400 focus:border-transparent outline-none bg-gray-50 appearance-none"
                >
                  <option value="">Select your city</option>
                  {NIGERIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone Number</label>
              <div className="flex items-center border border-gray-200 rounded-xl focus-within:ring-2 focus-within:ring-cyan-400">
                <div className="pl-4 pr-3 flex items-center gap-2 border-r border-gray-200 py-4 flex-shrink-0">
                  <Phone className="text-gray-400" size={20} />
                  <span className="text-gray-600 font-medium">+234</span>
                </div>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => {
                    setPhoneNumber(e.target.value);
                    if (phoneError) setPhoneError('');
                  }}
                  onInput={(e) => {
                    let value = e.target.value.replace(/^0/, '');
                    value = value.replace(/[^0-9]/g, '');
                    e.target.value = value;
                  }}
                  pattern="[0-9]{10,11}"
                  maxLength={11}
                  placeholder="801 234 5678"
                  className="flex-1 px-4 py-4 outline-none bg-transparent rounded-r-xl"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={async () => {
                  const success = await saveOnboardingInfo();
                  if (success) navigate('/');
                }}
                disabled={savingOnboarding || !phoneNumber}
                className="flex-1 bg-gradient-to-r from-cyan-400 to-cyan-500 text-white py-3 rounded-xl font-semibold hover:shadow-lg transition disabled:opacity-50"
              >
                {savingOnboarding ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Saving...
                  </span>
                ) : 'Continue'}
              </button>
              <button
                onClick={() => { setShowOnboardingModal(false); navigate('/'); }}
                disabled={savingOnboarding}
                className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition disabled:opacity-50"
              >
                Skip
              </button>
            </div>

            <p className="text-xs text-gray-500 text-center mt-4">
              💡 You can add your phone number and city later in Settings
            </p>
          </div>
        </div>
      )}

    </div>
  );
}