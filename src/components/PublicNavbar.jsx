import { Link } from 'react-router-dom';

export default function PublicNavbar() {
  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-r from-cyan-400 to-cyan-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">O</span>
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-cyan-500 bg-clip-text text-transparent">
              OutingStation
            </span>
          </Link>

          {/* Event Management Badge */}
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-cyan-50 text-cyan-700 rounded-full text-sm font-medium">
              📊 Event Management
            </span>
          </div>
        </div>
      </div>
    </nav>
  );
}