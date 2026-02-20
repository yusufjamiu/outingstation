import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, X, User, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import OutingStation from '../assets/OutingStation.png';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
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

  // Display name: from Firestore profile or Firebase Auth
  const displayName = userProfile?.name || currentUser?.displayName || 'User';
  const avatarUrl = userProfile?.photoURL || currentUser?.photoURL ||
    `https://api.dicebear.com/7.x/avataaars/svg?seed=${displayName}`;

  return (
    <nav className="bg-white shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">

          {/* Logo */}
          <Link to="/" className="flex items-center">
            <img src={OutingStation} alt="Outing Station" className="h-12 w-auto" />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <Link to="/" className="text-gray-700 hover:text-cyan-500 transition">Home</Link>
            <Link to="/events" className="text-gray-700 hover:text-cyan-500 transition">Events</Link>
            <Link to="/about" className="text-gray-700 hover:text-cyan-500 transition">About</Link>

            {currentUser ? (
              <>
                <Link
                  to="/dashboard"
                  className="flex items-center gap-2 text-gray-700 hover:text-cyan-500 transition"
                >
                  <img
                    src={avatarUrl}
                    alt={displayName}
                    className="w-8 h-8 rounded-full"
                  />
                  <span>{displayName.split(' ')[0]}</span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="text-gray-700 hover:text-red-500 transition flex items-center gap-2"
                >
                  <LogOut size={18} />
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/login">
                  <button className="text-gray-700 hover:text-cyan-500 transition px-4 py-2">
                    Login
                  </button>
                </Link>
                <Link to="/signup">
                  <button className="bg-gradient-to-r from-cyan-400 to-cyan-500 text-white px-6 py-2 rounded-lg font-medium hover:shadow-lg transition-shadow">
                    Get Started
                  </button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <button onClick={() => setIsOpen(!isOpen)} className="md:hidden text-gray-700">
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <div className="md:hidden pb-4 space-y-3">
            <Link to="/" onClick={() => setIsOpen(false)} className="block text-gray-700 hover:text-cyan-500 transition py-2">Home</Link>
            <Link to="/events" onClick={() => setIsOpen(false)} className="block text-gray-700 hover:text-cyan-500 transition py-2">Events</Link>
            <Link to="/about" onClick={() => setIsOpen(false)} className="block text-gray-700 hover:text-cyan-500 transition py-2">About</Link>

            {currentUser ? (
              <>
                <Link to="/dashboard" onClick={() => setIsOpen(false)} className="flex items-center gap-2 text-gray-700 hover:text-cyan-500 transition py-2">
                  <User size={18} />
                  Dashboard
                </Link>
                <button
                  onClick={() => { handleLogout(); setIsOpen(false); }}
                  className="block w-full text-left text-gray-700 hover:text-red-500 transition py-2"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/login" onClick={() => setIsOpen(false)} className="block text-gray-700 hover:text-cyan-500 transition py-2">Login</Link>
                <Link to="/signup" onClick={() => setIsOpen(false)} className="block bg-gradient-to-r from-cyan-400 to-cyan-500 text-white px-6 py-2 rounded-lg text-center">Get Started</Link>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}