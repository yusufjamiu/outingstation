import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../firebase';
import { Mail, CheckCircle, ArrowLeft, AlertCircle } from 'lucide-react';
import OutingStation from '../assets/OutingStation.png';

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const navigate = useNavigate();

  const handleSendReset = async (e) => {
    e.preventDefault();

    // ✅ Basic email validation before sending
    if (!email.includes('@') || !email.includes('.')) {
      setError('Please enter a valid email address.');
      return;
    }

    try {
      setError('');
      setLoading(true);
      
      // ✅ Send password reset email
      // Note: Firebase returns success even if email doesn't exist (security feature)
      await sendPasswordResetEmail(auth, email);
      
      setSuccess(true);
    } catch (error) {
      // ✅ Handle actual Firebase errors (network issues, invalid format, etc.)
      if (error.code === 'auth/invalid-email') {
        setError('Please enter a valid email address.');
      } else if (error.code === 'auth/too-many-requests') {
        setError('Too many attempts. Please try again later.');
      } else {
        setError('Failed to send reset email. Please check your internet connection.');
      }
    }
    setLoading(false);
  };

  const handleResend = async () => {
    try {
      setError('');
      setResendSuccess(false);
      setLoading(true);
      
      await sendPasswordResetEmail(auth, email);
      
      setResendSuccess(true);
      
      setTimeout(() => {
        setResendSuccess(false);
      }, 5000);
      
    } catch (error) {
      setError('Failed to resend email. Please try again.');
    }
    setLoading(false);
  };

  const maskEmail = (email) => {
    if (!email) return '';
    const [username, domain] = email.split('@');
    if (!username || !domain) return email;
    
    const visibleChars = 3;
    const maskedUsername = username.length > visibleChars 
      ? username.substring(0, visibleChars) + '***' 
      : username;
    
    return `${maskedUsername}@${domain}`;
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left Side - Form */}
      <div className="w-full lg:w-1/2 bg-white flex items-center justify-center p-6 sm:p-8 lg:p-12">
        <div className="max-w-md w-full">
          {/* Back Button */}
          <button 
            onClick={() => navigate('/login')}
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 group transition-all"
          >
            <div className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-all group-hover:-translate-x-1">
              <ArrowLeft size={20} />
            </div>
            <span className="font-medium text-sm sm:text-base">Back to Login</span>
          </button>

          {/* Logo */}
          <Link to="/" className="inline-block mb-8">
            <img
              src={OutingStation}
              alt="Outing Station"
              className="h-12 sm:h-16 w-auto"
            />
          </Link>

          {/* Heading */}
          <div className="mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-3">
              Reset Password
            </h1>
            {!success ? (
              <p className="text-sm sm:text-base text-gray-600">
                Enter your email address and we'll send you a link to reset your password.
              </p>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle size={24} className="flex-shrink-0" />
                  <p className="font-semibold text-sm sm:text-base">Reset Link Sent!</p>
                </div>
                <p className="text-sm sm:text-base text-gray-600">
                  If an account exists for{' '}
                  <span className="font-semibold text-gray-900">{maskEmail(email)}</span>,
                  you'll receive a password reset link shortly.
                </p>
              </div>
            )}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-3 sm:p-4 rounded-xl mb-4 sm:mb-6 text-xs sm:text-sm">
              <div className="flex items-start gap-2">
                <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium mb-1">Error</p>
                  <p>{error}</p>
                </div>
              </div>
            </div>
          )}

          {resendSuccess && (
            <div className="bg-green-50 border border-green-200 text-green-700 p-3 sm:p-4 rounded-xl mb-4 sm:mb-6 text-xs sm:text-sm animate-fadeIn">
              <div className="flex items-center gap-2">
                <CheckCircle size={18} className="flex-shrink-0" />
                <div>
                  <p className="font-medium">Email Resent!</p>
                  <p className="text-xs mt-1">Check your inbox for the new reset link.</p>
                </div>
              </div>
            </div>
          )}

          {!success ? (
            /* Email Input Form */
            <form onSubmit={handleSendReset} className="space-y-4 sm:space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 sm:pl-12 pr-4 py-3 sm:py-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-400 focus:border-transparent outline-none bg-gray-50 text-sm sm:text-base transition"
                    placeholder="Enter your email"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-cyan-400 to-cyan-500 text-white py-3 sm:py-4 rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Sending...
                  </span>
                ) : (
                  'Send Reset Link'
                )}
              </button>

              <p className="text-center text-gray-600 text-xs sm:text-sm pt-2">
                Remember your password?{' '}
                <Link to="/login" className="text-cyan-500 font-semibold hover:text-cyan-600 transition">
                  Sign in instead
                </Link>
              </p>
            </form>
          ) : (
            /* Success State */
            <div className="space-y-4 sm:space-y-5">
              {/* ✅ UPDATED: Better messaging about email verification */}
              <div className="bg-cyan-50 border border-cyan-200 rounded-xl p-4 sm:p-6">
                <div className="w-16 h-16 bg-cyan-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Mail size={32} className="text-cyan-500" />
                </div>
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2 text-center">
                  Check Your Email
                </h3>
                <p className="text-xs sm:text-sm text-gray-600 text-center mb-4">
                  If an account exists for this email, you'll receive a password reset link within a few minutes.
                </p>
                
                {/* ✅ ADDED: Security notice */}
                <div className="bg-white rounded-lg p-3 border border-cyan-100">
                  <div className="flex items-start gap-2">
                    <AlertCircle size={16} className="text-cyan-600 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-gray-600">
                      <span className="font-medium text-gray-900">Security Note:</span> For your protection, we don't reveal whether an email is registered.
                    </p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => navigate('/login')}
                className="w-full bg-gradient-to-r from-cyan-400 to-cyan-500 text-white py-3 sm:py-4 rounded-xl font-semibold hover:shadow-lg transition-all text-sm sm:text-base"
              >
                Back to Login
              </button>

              <div className="text-center space-y-2">
                <p className="text-xs sm:text-sm text-gray-600">
                  Didn't receive the email?
                </p>
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={loading}
                  className="text-xs sm:text-sm text-cyan-500 font-semibold hover:text-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed transition inline-flex items-center gap-1"
                >
                  {loading ? (
                    <>
                      <div className="w-3 h-3 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
                      Sending...
                    </>
                  ) : (
                    'Resend Email'
                  )}
                </button>
              </div>

              {/* ✅ UPDATED: Better tips including account verification */}
              <div className="bg-gray-50 rounded-xl p-4 sm:p-5 mt-4">
                <p className="text-xs sm:text-sm font-medium text-gray-900 mb-3">
                  📧 Not receiving the email? Try these:
                </p>
                <ul className="text-xs sm:text-sm text-gray-600 space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="text-cyan-500 font-bold">•</span>
                    <span><span className="font-medium text-gray-900">Check spam/junk folder</span> - Reset emails sometimes end up there</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-cyan-500 font-bold">•</span>
                    <span><span className="font-medium text-gray-900">Verify email address</span> - Make sure you entered the correct email</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-cyan-500 font-bold">•</span>
                    <span><span className="font-medium text-gray-900">Wait a few minutes</span> - Email delivery can take up to 5 minutes</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-cyan-500 font-bold">•</span>
                    <span><span className="font-medium text-gray-900">No account?</span> If you don't have an account with this email, <Link to="/signup" className="text-cyan-500 hover:text-cyan-600 font-semibold">sign up here</Link></span>
                  </li>
                </ul>
              </div>
            </div>
          )}

          {/* Help Text */}
          <div className="mt-6 sm:mt-8 text-center">
            <p className="text-xs sm:text-sm text-gray-500">
              Need help?{' '}
              <Link to="/contact" className="text-cyan-500 hover:text-cyan-600 font-medium">
                Contact Support
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Right Side - Illustration */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-cyan-50 via-cyan-100 to-cyan-50 items-center justify-center p-12 relative overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute top-20 right-20 w-64 h-64 bg-cyan-200 rounded-full opacity-20 blur-3xl"></div>
        <div className="absolute bottom-20 left-20 w-80 h-80 bg-cyan-300 rounded-full opacity-20 blur-3xl"></div>
        
        <div className="max-w-md relative z-10">
          {/* Lock with Email Illustration */}
          <svg className="w-full h-auto mb-8" viewBox="0 0 400 400" fill="none">
            {/* Email Envelope */}
            <rect x="80" y="140" width="240" height="160" rx="15" fill="#67C3CC" />
            <path 
              d="M80 160 L200 240 L320 160" 
              stroke="#5FB3BD" 
              strokeWidth="15" 
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            
            {/* Lock Icon on Envelope */}
            <circle cx="200" cy="220" r="35" fill="white" opacity="0.95" />
            <rect x="185" y="225" width="30" height="25" rx="5" fill="#67C3CC" />
            <path 
              d="M190 225 L190 215 Q190 205 200 205 Q210 205 210 215 L210 225" 
              stroke="#67C3CC" 
              strokeWidth="5" 
              fill="none"
              strokeLinecap="round"
            />
          </svg>
          
          <div className="text-center">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-3">
              Secure Password Reset
            </h2>
            <p className="text-base md:text-lg text-gray-600 mb-6">
              We'll help you reset your password quickly and securely
            </p>
            
            {/* Features */}
            <div className="bg-white rounded-2xl p-6 shadow-lg text-left space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-cyan-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-cyan-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">Instant Email</p>
                  <p className="text-xs text-gray-600">Receive reset link within seconds</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-cyan-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-cyan-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">Secure Process</p>
                  <p className="text-xs text-gray-600">Encrypted and protected</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-cyan-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-cyan-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">Privacy First</p>
                  <p className="text-xs text-gray-600">Your account info stays protected</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}