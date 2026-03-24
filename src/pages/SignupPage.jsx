import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, User, Eye, EyeOff, ArrowLeft, MapPin, Phone } from 'lucide-react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import Create from './../assets/Create.jpg'
import Image2 from './../assets/SignUp2.JPG'
import Connected from './../assets/Connected.JPG'

export default function SignupPage() {
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', city: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const { signup, loginWithGoogle, currentUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (currentUser) navigate('/dashboard');
  }, [currentUser, navigate]);

  const carouselImages = [
    { image: Create, title: 'Join OutingStation', description: 'Create an account and start discovering amazing events near you.' },
    { image: Image2, title: 'Save Your Favorites', description: 'Bookmark events you love and never miss out again.' },
    { image: Connected, title: 'Stay Connected', description: 'Get personalized recommendations based on your interests.' }
  ];

  useEffect(() => {
    const timer = setInterval(() => setCurrentSlide(p => (p + 1) % carouselImages.length), 5000);
    return () => clearInterval(timer);
  }, []);

  // ✅ Create welcome notification for new users
  const createWelcomeNotification = async (userId) => {
    try {
      await addDoc(collection(db, 'notifications'), {
        userId: userId,
        title: "🎉 Welcome to OutingStation!",
        message: "Discover amazing events happening around Lagos. Tap the bell icon anytime to stay updated!",
        type: "welcome",
        read: false,
        createdAt: serverTimestamp()
      });
      console.log('✅ Welcome notification created for user:', userId);
    } catch (error) {
      console.error('❌ Error creating welcome notification:', error);
    }
  };

  // ✅ VALIDATION FUNCTIONS
  const validateName = (name) => {
    const trimmedName = name.trim();
    
    if (!trimmedName) {
      return 'Name is required';
    }
    
    if (trimmedName.length < 2) {
      return 'Name must be at least 2 characters';
    }
    if (trimmedName.length > 50) {
      return 'Name must be less than 50 characters';
    }
    
    const nameRegex = /^[a-zA-Z\s'-]+$/;
    if (!nameRegex.test(trimmedName)) {
      return 'Name can only contain letters, spaces, hyphens, and apostrophes';
    }
    
    const alphaCount = trimmedName.replace(/[^a-zA-Z]/g, '').length;
    if (alphaCount < 2) {
      return 'Name must contain at least 2 letters';
    }
    
    return null;
  };

  const validateCity = (city) => {
    const trimmedCity = city.trim();
    
    if (!trimmedCity) {
      return null; // City is optional
    }
    
    if (trimmedCity.length < 2) {
      return 'City must be at least 2 characters';
    }
    if (trimmedCity.length > 100) {
      return 'City must be less than 100 characters';
    }
    
    const cityRegex = /^[a-zA-Z\s,'-]+$/;
    if (!cityRegex.test(trimmedCity)) {
      return 'City can only contain letters, spaces, commas, and hyphens';
    }
    
    return null;
  };

  const validatePhone = (phone) => {
    const trimmedPhone = phone.trim();
    
    if (!trimmedPhone) {
      return null; // Phone is optional
    }
    
    // Remove spaces, dashes, parentheses
    const cleanPhone = trimmedPhone.replace(/[\s\-()]/g, '');
    
    // Allow + at start for international format
    const phoneRegex = /^\+?[0-9]{10,15}$/;
    if (!phoneRegex.test(cleanPhone)) {
      return 'Please enter a valid phone number (10-15 digits)';
    }
    
    return null;
  };

  const validatePassword = (password) => {
    if (password.length < 8) {
      return 'Password must be at least 8 characters';
    }
    if (password.length > 128) {
      return 'Password must be less than 128 characters';
    }
    
    if (!/[A-Z]/.test(password)) {
      return 'Password must contain at least one uppercase letter';
    }
    
    if (!/[a-z]/.test(password)) {
      return 'Password must contain at least one lowercase letter';
    }
    
    if (!/[0-9]/.test(password)) {
      return 'Password must contain at least one number';
    }
    
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      return 'Password must contain at least one special character (!@#$%^&*...)';
    }
    
    return null;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if ((name === 'name' || name === 'city') && value.startsWith(' ')) {
      return;
    }
    
    setFormData({ ...formData, [name]: value });
    
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Trim all fields
    const trimmedData = {
      name: formData.name.trim(),
      email: formData.email.trim(),
      phone: formData.phone.trim(),
      city: formData.city.trim(),
      password: formData.password,
      confirmPassword: formData.confirmPassword
    };
    
    // Validate name
    const nameError = validateName(trimmedData.name);
    if (nameError) {
      return setError(nameError);
    }
    
    // Validate phone (if provided)
    if (trimmedData.phone) {
      const phoneError = validatePhone(trimmedData.phone);
      if (phoneError) {
        return setError(phoneError);
      }
    }
    
    // Validate city (if provided)
    if (trimmedData.city) {
      const cityError = validateCity(trimmedData.city);
      if (cityError) {
        return setError(cityError);
      }
    }
    
    // Validate email
    if (!trimmedData.email) {
      return setError('Email is required');
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedData.email)) {
      return setError('Please enter a valid email address');
    }
    
    // Validate password
    const passwordError = validatePassword(trimmedData.password);
    if (passwordError) {
      return setError(passwordError);
    }
    
    // Check password match
    if (trimmedData.password !== trimmedData.confirmPassword) {
      return setError('Passwords do not match');
    }
    
    try {
      setError('');
      setLoading(true);
      
      // ✅ UPDATED: Pass phone number to signup
      const userCredential = await signup(
        trimmedData.email, 
        trimmedData.password, 
        trimmedData.name, 
        trimmedData.city, 
        trimmedData.phone
      );
      
      // ✅ Create welcome notification
      if (userCredential && userCredential.user) {
        await createWelcomeNotification(userCredential.user.uid);
      }
      
      navigate('/dashboard');
    } catch (err) {
      if (err.code === 'auth/email-already-in-use') {
        setError('An account with this email already exists.');
      } else if (err.code === 'auth/weak-password') {
        setError('Password is too weak. Please use a stronger password.');
      } else if (err.code === 'auth/invalid-email') {
        setError('Please enter a valid email address.');
      } else {
        setError('Failed to create account. Please try again.');
      }
    }
    setLoading(false);
  };

  const handleGoogleSignup = async () => {
    try {
      setError('');
      setLoading(true);
      
      const userCredential = await loginWithGoogle();
      
      // ✅ Create welcome notification for Google signup
      if (userCredential && userCredential.user) {
        await createWelcomeNotification(userCredential.user.uid);
      }
      
      navigate('/dashboard');
    } catch (err) {
      setError('Failed to sign up with Google. Please try again.');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Form */}
      <div className="w-full lg:w-1/2 bg-white flex items-center justify-center p-8 overflow-y-auto">
        <div className="max-w-md w-full py-4">
          <Link to="/" className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-8 transition-colors">
            <ArrowLeft size={20} /><span>Back to Website</span>
          </Link>

          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">Create Account</h1>
            <p className="text-gray-600">Join thousands discovering amazing events</p>
          </div>

          {/* Social Buttons */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <button onClick={handleGoogleSignup} disabled={loading}
              className="flex items-center justify-center gap-2 bg-white border-2 border-gray-200 rounded-xl py-3 hover:border-gray-300 hover:bg-gray-50 transition-all disabled:opacity-50">
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <span className="font-medium text-gray-700">Google</span>
            </button>
            <button disabled className="flex items-center justify-center gap-2 bg-white border-2 border-gray-200 rounded-xl py-3 opacity-40 cursor-not-allowed">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
              </svg>
              <span className="font-medium text-gray-700">Apple</span>
            </button>
          </div>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200"></div></div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-500">Or sign up with email</span>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-xl mb-6 text-sm">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input 
                type="text" 
                name="name" 
                required 
                value={formData.name} 
                onChange={handleChange}
                minLength={2}
                maxLength={50}
                className="w-full pl-12 pr-4 py-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-400 focus:border-transparent outline-none bg-gray-50"
                placeholder="Full Name (letters only)" 
              />
              <p className="text-xs text-gray-500 mt-1 ml-1">2-50 characters, letters only</p>
            </div>

            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input 
                type="email" 
                name="email" 
                required 
                value={formData.email} 
                onChange={handleChange}
                className="w-full pl-12 pr-4 py-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-400 focus:border-transparent outline-none bg-gray-50"
                placeholder="Email address" 
              />
            </div>

            {/* ✅ ADDED: Phone number field */}
            <div className="relative">
              <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input 
                type="tel" 
                name="phone" 
                value={formData.phone} 
                onChange={handleChange}
                maxLength={20}
                className="w-full pl-12 pr-4 py-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-400 focus:border-transparent outline-none bg-gray-50"
                placeholder="Phone number (Optional)" 
              />
            </div>

            <div className="relative">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input 
                type="text" 
                name="city" 
                value={formData.city} 
                onChange={handleChange}
                maxLength={100}
                className="w-full pl-12 pr-4 py-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-400 focus:border-transparent outline-none bg-gray-50"
                placeholder="Your city (e.g. Lagos, Nigeria) - Optional" 
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input 
                type={showPassword ? 'text' : 'password'} 
                name="password" 
                required 
                value={formData.password} 
                onChange={handleChange}
                minLength={8}
                maxLength={128}
                className="w-full pl-12 pr-12 py-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-400 focus:border-transparent outline-none bg-gray-50"
                placeholder="Password" 
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
              <p className="text-xs text-gray-500 mt-1 ml-1">
                Min 8 chars: uppercase, lowercase, number, special char
              </p>
            </div>

            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input 
                type={showConfirmPassword ? 'text' : 'password'} 
                name="confirmPassword" 
                required 
                value={formData.confirmPassword} 
                onChange={handleChange}
                minLength={8}
                maxLength={128}
                className="w-full pl-12 pr-12 py-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-400 focus:border-transparent outline-none bg-gray-50"
                placeholder="Confirm password" 
              />
              <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            <p className="text-xs text-gray-500">
              By creating an account you agree to our{' '}
              <Link to="/terms" className="text-cyan-500 hover:underline">Terms of Service</Link> and{' '}
              <Link to="/privacy" className="text-cyan-500 hover:underline">Privacy Policy</Link>.
            </p>

            <button type="submit" disabled={loading}
              className="w-full bg-gradient-to-r from-cyan-400 to-cyan-500 text-white py-4 rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed">
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Creating account...
                </span>
              ) : 'Create Account'}
            </button>
          </form>

          <p className="mt-6 text-center text-gray-600 text-sm">
            Already have an account?{' '}
            <Link to="/login" className="text-cyan-500 font-semibold hover:text-cyan-600">Log in</Link>
          </p>
        </div>
      </div>

      {/* Right Side - Carousel */}
      <div className="hidden lg:block lg:w-1/2 relative bg-gray-900 overflow-hidden">
        {carouselImages.map((slide, index) => (
          <div key={index} className={`absolute inset-0 transition-opacity duration-1000 ${index === currentSlide ? 'opacity-100' : 'opacity-0'}`}>
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
            <button key={index} onClick={() => setCurrentSlide(index)}
              className={`h-2 rounded-full transition-all duration-300 ${index === currentSlide ? 'bg-white w-8' : 'bg-white/50 w-2'}`} />
          ))}
        </div>
      </div>
    </div>
  );
}