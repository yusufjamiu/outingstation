import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../firebase';
import { Lock, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import OutingStation from '../assets/OutingStation.png';

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // 1 = enter email, 2 = enter OTP & new password
  const navigate = useNavigate();

  const handleSendOTP = async (e) => {
    e.preventDefault();

    try {
      setError('');
      setSuccess('');
      setLoading(true);
      
      // Send password reset email
      await sendPasswordResetEmail(auth, email);
      
      setSuccess(`We've sent an OTP to ${email.replace(/(.{3})(.*)(@.*)/, '$1*********$3')}, kindly input it along your new password below.`);
      setStep(2);
    } catch (error) {
      setError('Failed to send reset email: ' + error.message);
    }
    setLoading(false);
  };

  const handleReset = async (e) => {
    e.preventDefault();
    
    // Note: Firebase doesn't use OTP for password reset in the traditional way
    // This is a UI representation. In reality, users click the link in their email
    // For a real OTP system, you'd need a custom backend
    
    setError('Please check your email and click the password reset link to complete the process.');
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
            {step === 1 ? (
              <p className="text-gray-600">
                Enter your email address and we'll send you a code to reset your password.
              </p>
            ) : (
              <p className="text-gray-600">
                {success}
              </p>
            )}
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-6 text-sm">
              {error}
            </div>
          )}

          {step === 1 ? (
            /* Step 1: Enter Email */
            <form onSubmit={handleSendOTP} className="space-y-5">
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
                {loading ? 'Sending...' : 'Send Reset Code'}
              </button>

              <p className="text-center text-gray-600 text-sm">
                Remember your password?{' '}
                <Link to="/login" className="text-cyan-500 font-semibold hover:text-cyan-600">
                  Back to Login
                </Link>
              </p>
            </form>
          ) : (
            /* Step 2: Enter OTP & New Password */
            <form onSubmit={handleReset} className="space-y-5">
              <div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full pl-12 pr-12 py-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-400 focus:border-transparent outline-none bg-gray-50"
                    placeholder="New Password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              <div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="text"
                    required
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-400 focus:border-transparent outline-none bg-gray-50"
                    placeholder="OTP"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-cyan-400 to-cyan-500 text-white py-4 rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-50"
              >
                {loading ? 'Resetting...' : 'Reset'}
              </button>

              <p className="text-center text-gray-600 text-sm">
                Didn't receive a code?{' '}
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-cyan-500 font-semibold hover:text-cyan-600"
                >
                  Resend
                </button>
              </p>
            </form>
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