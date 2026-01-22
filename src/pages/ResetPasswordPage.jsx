import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../firebase';
import { Lock, ArrowLeft } from 'lucide-react';
import OutingStation from '../assets/OutingStation.png';

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSendReset = async (e) => {
    e.preventDefault();

    try {
      setError('');
      setLoading(true);
      
      // Send password reset email
      await sendPasswordResetEmail(auth, email);
      
      setSuccess(true);
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        setError('No account found with this email address.');
      } else if (error.code === 'auth/invalid-email') {
        setError('Please enter a valid email address.');
      } else {
        setError('Failed to send reset email. Please try again.');
      }
    }
    setLoading(false);
  };

  const handleResend = async () => {
    try {
      setError('');
      setLoading(true);
      await sendPasswordResetEmail(auth, email);
      setError('');
    } catch (error) {
      setError('Failed to resend email. Please try again.');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Form */}
      <div className="w-full lg:w-1/2 bg-white flex items-center justify-center p-8">
        <div className="max-w-md w-full">
          {/* Logo */}
          <div className="mb-8">
            <img
              src={OutingStation}
              alt="Outing Station"
              className="h-16 w-auto mb-8"
            />
          </div>

          {/* Back to Login Link */}
          <Link 
            to="/login" 
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-8 transition-colors"
          >
            <ArrowLeft size={20} />
            <span>Back to Login</span>
          </Link>

          {/* Heading */}
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
              Reset Password
            </h1>
            {!success ? (
              <p className="text-gray-600">
                Enter your email address and we'll send you a link to reset your password.
              </p>
            ) : (
              <p className="text-gray-600">
                We've sent a password reset link to <span className="font-semibold">{email.replace(/(.{3})(.*)(@.*)/, '$1*********$3')}</span>. Please check your email and click the link to reset your password.
              </p>
            )}
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-6 text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-50 text-green-600 p-4 rounded-xl mb-6 text-sm">
              Password reset email sent successfully! Check your inbox.
            </div>
          )}

          {!success ? (
            /* Email Input Form */
            <form onSubmit={handleSendReset} className="space-y-5">
              <div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-400 focus:border-transparent outline-none bg-gray-50"
                    placeholder="Email"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-cyan-400 to-cyan-500 text-white py-4 rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-50"
              >
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>

              <p className="text-center text-gray-600 text-sm">
                Remember your password?{' '}
                <Link to="/login" className="text-cyan-500 font-semibold hover:text-cyan-600">
                  Back to Login
                </Link>
              </p>
            </form>
          ) : (
            /* Success State */
            <div className="space-y-5">
              <Link
                to="/login"
                className="w-full block text-center bg-gradient-to-r from-cyan-400 to-cyan-500 text-white py-4 rounded-xl font-semibold hover:shadow-lg transition-all"
              >
                Back to Login
              </Link>

              <p className="text-center text-gray-600 text-sm">
                Didn't receive the email?{' '}
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={loading}
                  className="text-cyan-500 font-semibold hover:text-cyan-600 disabled:opacity-50"
                >
                  {loading ? 'Sending...' : 'Resend'}
                </button>
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Right Side - Illustration */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-cyan-50 to-cyan-100 items-center justify-center p-12">
        <div className="max-w-md">
          {/* Lock with Password Illustration */}
          <svg className="w-full h-auto" viewBox="0 0 400 400" fill="none">
            {/* Lock Body */}
            <rect x="100" y="200" width="200" height="150" rx="20" fill="#67C3CC" />
            
            {/* Lock Shackle */}
            <path 
              d="M150 200 L150 150 Q150 100 200 100 Q250 100 250 150 L250 200" 
              stroke="#5FB3BD" 
              strokeWidth="30" 
              fill="none"
              strokeLinecap="round"
            />
            
            {/* Password Dots on Lock */}
            <ellipse cx="160" cy="270" rx="15" ry="15" fill="white" opacity="0.9" />
            <ellipse cx="200" cy="270" rx="15" ry="15" fill="white" opacity="0.9" />
            <ellipse cx="240" cy="270" rx="15" ry="15" fill="white" opacity="0.9" />
          </svg>
          
          <div className="text-center mt-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              Secure Password Reset
            </h2>
            <p className="text-gray-600">
              We'll help you reset your password quickly and securely
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}