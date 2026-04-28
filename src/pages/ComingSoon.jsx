import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Instagram, Twitter, Facebook, Linkedin, ArrowRight } from 'lucide-react';
import OutingStation from '../assets/OutingStation.png';

const LAUNCH_DATE = new Date('2026-05-05T00:00:00');

function getTimeLeft() {
  const now = new Date();
  const diff = LAUNCH_DATE - now;

  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 };

  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60)
  };
}

export default function ComingSoon() {
  const [timeLeft, setTimeLeft] = useState(getTimeLeft());
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(getTimeLeft());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return;
    // Store email in localStorage for now — connect to Firestore later
    const existing = JSON.parse(localStorage.getItem('earlyAccessEmails') || '[]');
    if (!existing.includes(email)) {
      existing.push(email);
      localStorage.setItem('earlyAccessEmails', JSON.stringify(existing));
    }
    setSubmitted(true);
  };

  const pad = (n) => String(n).padStart(2, '0');

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-white to-cyan-50 flex flex-col items-center justify-center px-4 py-12 relative overflow-hidden">

      {/* Decorative blobs */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-cyan-100 rounded-full opacity-30 blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-cyan-100 rounded-full opacity-30 blur-3xl translate-x-1/2 translate-y-1/2"></div>

      <div className="relative z-10 max-w-2xl w-full text-center">

        {/* Logo */}
        <div className="flex justify-center mb-8">
          <img src={OutingStation} alt="OutingStation" className="h-14 w-auto" />
        </div>

        {/* Headline */}
        <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4 leading-tight">
          Something exciting is <span className="text-cyan-400 italic">coming</span>
        </h1>
        <p className="text-lg text-gray-500 mb-10 leading-relaxed">
          We're putting the finishing touches on something you'll love. Be the first to know. 🚀
        </p>

        {/* Countdown */}
        <div className="grid grid-cols-4 gap-3 sm:gap-6 mb-10">
          {[
            { label: 'Days', value: timeLeft.days },
            { label: 'Hours', value: timeLeft.hours },
            { label: 'Minutes', value: timeLeft.minutes },
            { label: 'Seconds', value: timeLeft.seconds },
          ].map((item) => (
            <div key={item.label} className="bg-white rounded-2xl shadow-md border border-gray-100 p-4 sm:p-6">
              <p className="text-3xl sm:text-5xl font-bold text-cyan-500 tabular-nums">
                {pad(item.value)}
              </p>
              <p className="text-xs sm:text-sm text-gray-500 mt-1 font-medium uppercase tracking-wide">
                {item.label}
              </p>
            </div>
          ))}
        </div>

        {/* Email Capture */}
        {!submitted ? (
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 mb-8">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email for early access"
              className="flex-1 px-5 py-4 rounded-full border border-gray-200 outline-none focus:ring-2 focus:ring-cyan-400 bg-white shadow-sm text-gray-700"
            />
            <button
              type="submit"
              className="flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-400 to-cyan-500 text-white px-8 py-4 rounded-full font-semibold hover:shadow-lg transition-shadow whitespace-nowrap"
            >
              Notify Me <ArrowRight size={18} />
            </button>
          </form>
        ) : (
          <div className="mb-8 bg-cyan-50 border border-cyan-200 rounded-2xl px-6 py-4">
            <p className="text-cyan-700 font-semibold text-lg">🎉 You're on the list!</p>
            <p className="text-cyan-600 text-sm mt-1">We'll notify you the moment we launch.</p>
          </div>
        )}

        {/* Referral teaser */}
        <div className="bg-gradient-to-r from-cyan-500 to-cyan-600 rounded-2xl p-5 mb-8 text-white">
          <p className="font-bold text-lg mb-1">🎁 Launch Bonus!</p>
          <p className="text-cyan-50 text-sm leading-relaxed">
            Sign up on launch day and get <strong>₦300 free credits</strong> to use on your first purchase. Invite friends and earn even more!
          </p>
        </div>

        {/* Social Links */}
        <div className="flex justify-center gap-5">
          <a href="https://www.instagram.com/outingstation/" target="_blank" rel="noopener noreferrer"
            className="w-10 h-10 bg-white rounded-full shadow-sm border border-gray-100 flex items-center justify-center text-gray-600 hover:text-cyan-500 hover:border-cyan-300 transition-all">
            <Instagram size={18} />
          </a>
          <a href="https://x.com/OutingStation" target="_blank" rel="noopener noreferrer"
            className="w-10 h-10 bg-white rounded-full shadow-sm border border-gray-100 flex items-center justify-center text-gray-600 hover:text-cyan-500 hover:border-cyan-300 transition-all">
            <Twitter size={18} />
          </a>
          <a href="https://www.facebook.com/outingstation/" target="_blank" rel="noopener noreferrer"
            className="w-10 h-10 bg-white rounded-full shadow-sm border border-gray-100 flex items-center justify-center text-gray-600 hover:text-cyan-500 hover:border-cyan-300 transition-all">
            <Facebook size={18} />
          </a>
          <a href="https://www.linkedin.com/company/outingstation" target="_blank" rel="noopener noreferrer"
            className="w-10 h-10 bg-white rounded-full shadow-sm border border-gray-100 flex items-center justify-center text-gray-600 hover:text-cyan-500 hover:border-cyan-300 transition-all">
            <Linkedin size={18} />
          </a>
          <a href="https://www.tiktok.com/@outingstation" target="_blank" rel="noopener noreferrer"
            className="w-10 h-10 bg-white rounded-full shadow-sm border border-gray-100 flex items-center justify-center text-gray-600 hover:text-cyan-500 hover:border-cyan-300 transition-all">
             <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
              <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.75a4.85 4.85 0 0 1-1.01-.06z"/>
             </svg>
          </a>
        </div>

        <p className="text-xs text-gray-400 mt-8">
          © {new Date().getFullYear()} OutingStation Limited. All rights reserved.
        </p>

      </div>
    </div>
  );
}