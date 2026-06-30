import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, X, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import OutingStation from '../assets/OutingStation.png';
import googlePlayBadge from '../assets/google-play.png';
import appStoreBadge from '../assets/app-store.svg';

const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.outingstation&pcampaignid=web_share';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [showAppModal, setShowAppModal] = useState(false);
  const navigate = useNavigate();
  const { currentUser, userProfile, logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  const displayName = userProfile?.name || currentUser?.displayName || 'User';
  const avatarUrl =
    userProfile?.avatar ||
    userProfile?.photoURL ||
    currentUser?.photoURL ||
    'https://ui-avatars.com/api/?name=' + encodeURIComponent(displayName) + '&background=22D3EE&color=fff&size=128';

  const fallbackAvatar = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(displayName) + '&background=22D3EE&color=fff&size=128';

  return (
    <nav className="bg-white shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        <div className="relative flex items-center h-16">

          {/* Logo - pinned left */}
          <Link to="/" className="flex items-center absolute left-0">
            <img src={OutingStation} alt="Outing Station" className="h-12 w-auto" />
          </Link>

          {/* Desktop: truly centered nav links */}
          <div className="hidden md:flex flex-1 justify-center items-center space-x-8">
            <Link to="/" className="text-gray-700 hover:text-cyan-500 transition">Home</Link>
            <Link to="/events" className="text-gray-700 hover:text-cyan-500 transition">Events</Link>
            <Link to="/about" className="text-gray-700 hover:text-cyan-500 transition">About</Link>
          </div>

          {/* Desktop Right - pinned right */}
          <div className="hidden md:flex items-center space-x-3 absolute right-0">
            <button
              onClick={() => setShowAppModal(true)}
              className="border border-gray-800 text-gray-800 px-4 py-2 rounded-full font-medium hover:bg-gray-100 transition text-sm"
            >
              Get the App
            </button>
            {currentUser && (
              <div className="flex items-center space-x-3">
                <Link to="/dashboard" className="flex items-center gap-2 text-gray-700 hover:text-cyan-500 transition">
                  <img src={avatarUrl} alt={displayName} className="w-8 h-8 rounded-full object-cover border-2 border-gray-200" onError={(e) => { e.target.onerror = null; e.target.src = fallbackAvatar; }} />
                  <span>{displayName.split(' ')[0]}</span>
                </Link>
                <button onClick={handleLogout} className="text-gray-700 hover:text-red-500 transition flex items-center gap-2">
                  <LogOut size={18} />
                  Logout
                </button>
              </div>
            )}
            {!currentUser && (
              <div className="flex items-center space-x-3">
                <Link to="/login" className="text-gray-700 hover:text-cyan-500 transition px-4 py-2">Login</Link>
                <Link to="/signup" className="bg-gradient-to-r from-cyan-400 to-cyan-500 text-white px-6 py-2 rounded-lg font-medium hover:shadow-lg transition-shadow">Get Started</Link>
              </div>
            )}
          </div>

          {/* Mobile Right - pinned right */}
          <div className="md:hidden flex items-center gap-3 absolute right-0">
            <button
              onClick={() => setShowAppModal(true)}
              className="border border-gray-800 text-gray-800 px-3 py-1.5 rounded-full font-medium text-sm hover:bg-gray-100 transition"
            >
              Get the App
            </button>
            <button onClick={() => setIsOpen(!isOpen)} className="text-gray-700">
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>

        </div>

        {/* Mobile Dropdown */}
        {isOpen && (
          <div className="md:hidden pb-4 space-y-3">
            <Link to="/" onClick={() => setIsOpen(false)} className="block text-gray-700 hover:text-cyan-500 transition py-2">Home</Link>
            <Link to="/events" onClick={() => setIsOpen(false)} className="block text-gray-700 hover:text-cyan-500 transition py-2">Events</Link>
            <Link to="/about" onClick={() => setIsOpen(false)} className="block text-gray-700 hover:text-cyan-500 transition py-2">About</Link>
            {currentUser && (
              <div className="space-y-3">
                <Link to="/dashboard" onClick={() => setIsOpen(false)} className="flex items-center gap-3 text-gray-700 hover:text-cyan-500 transition py-2">
                  <img src={avatarUrl} alt={displayName} className="w-8 h-8 rounded-full object-cover border-2 border-gray-200" onError={(e) => { e.target.onerror = null; e.target.src = fallbackAvatar; }} />
                  <span>{displayName}</span>
                </Link>
                <button onClick={() => { handleLogout(); setIsOpen(false); }} className="flex items-center gap-2 w-full text-left text-gray-700 hover:text-red-500 transition py-2">
                  <LogOut size={18} />
                  Logout
                </button>
              </div>
            )}
            {!currentUser && (
              <div className="space-y-3">
                <Link to="/login" onClick={() => setIsOpen(false)} className="block text-gray-700 hover:text-cyan-500 transition py-2">Login</Link>
                <Link to="/signup" onClick={() => setIsOpen(false)} className="block bg-gradient-to-r from-cyan-400 to-cyan-500 text-white px-6 py-2 rounded-lg text-center">Get Started</Link>
              </div>
            )}
          </div>
        )}

      </div>

      {/* ── Get the App Modal ─────────────────────────────────────────── */}
      {showAppModal && (
        <div
          className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4"
          onClick={() => setShowAppModal(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-sm w-full p-6 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowAppModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition"
            >
              <X size={20} />
            </button>

            <div className="text-center mb-6">
              <img src={OutingStation} alt="OutingStation" className="h-12 w-auto mx-auto mb-3" />
              <h3 className="text-xl font-bold text-gray-900">Get the OutingStation App</h3>
              <p className="text-sm text-gray-500 mt-1">One App. Many Experiences.</p>
            </div>

            <div className="space-y-3">
              {/* Google Play */}
              <a
                href={PLAY_STORE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center w-full bg-gray-900 rounded-xl px-4 py-2 hover:bg-gray-800 transition"
              >
                <img src={googlePlayBadge} alt="Get it on Google Play" className="h-20 w-auto" />
              </a>

              {/* Apple App Store — Coming Soon */}
              <div className="flex items-center justify-center w-full bg-gray-100 rounded-xl px-4 py-3 cursor-not-allowed relative">
                <img src={appStoreBadge} alt="Download on the App Store" className="h-10 w-auto opacity-40 grayscale" />
                <span className="absolute -top-2 -right-2 text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-1 rounded-full whitespace-nowrap shadow-sm border border-amber-200">
                  99% Ready
                </span>
              </div>
            </div>

            <p className="text-xs text-gray-400 text-center mt-5">
              iOS is in final review — we'll be live very soon! 🚀
            </p>
          </div>
        </div>
      )}
    </nav>
  );
}