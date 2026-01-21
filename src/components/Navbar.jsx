import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, X, User, LogOut, Plus } from 'lucide-react';
import OutingStation from '../assets/OutingStation.png';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  
  // Temporarily hardcoded - no backend
  const currentUser = null; // Change to true to test logged-in state

  const handleLogout = () => {
    // Temporary logout handler
    navigate('/');
  };

  return (
    <nav className="bg-white shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          
          {/* Logo */}
          <Link to="/" className="flex items-center">
  <img
    src={OutingStation}
    alt="Outing Station"
    className="h-12 w-auto"
  />
</Link>


          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <Link to="/" className="text-gray-700 hover:text-primary transition">Home</Link>
            <Link to="/events" className="text-gray-700 hover:text-primary transition">Events</Link>
            <Link to="/about" className="text-gray-700 hover:text-primary transition">About</Link>
            
            {currentUser ? (
              <>
                <Link to="/profile" className="text-gray-700 hover:text-primary transition flex items-center gap-2">
                  <User size={18} />
                  Profile
                </Link>
                <Link to="/create-event">
                  <button className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark transition">
                    <Plus size={18} />
                    Create Event
                  </button>
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
                  <button className="text-gray-700 hover:text-primary transition px-4 py-2">
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
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden text-gray-700"
          >
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <div className="md:hidden pb-4 space-y-3">
            <Link to="/" className="block text-gray-700 hover:text-primary transition py-2">Home</Link>
            <Link to="/events" className="block text-gray-700 hover:text-primary transition py-2">Events</Link>
            <Link to="/about" className="block text-gray-700 hover:text-primary transition py-2">About</Link>
            
            {currentUser ? (
              <>
                <Link to="/profile" className="block text-gray-700 hover:text-primary transition py-2">Profile</Link>
                <Link to="/create-event" className="block text-gray-700 hover:text-primary transition py-2">Create Event</Link>
                <button 
                  onClick={handleLogout}
                  className="block w-full text-left text-gray-700 hover:text-red-500 transition py-2"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="block text-gray-700 hover:text-primary transition py-2">Login</Link>
                <Link to="/signup" className="block bg-primary text-white px-6 py-2 rounded-lg text-center">Get Started</Link>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}