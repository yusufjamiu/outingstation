import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { AmbassadorSidebar } from '../../components/AmbassadorSidebar';
import { Menu, Calendar, MapPin } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function CityAmbassadorCreate() {
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-gray-50">
      <AmbassadorSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="flex-1 overflow-auto">
        <header className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 py-4 sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 hover:bg-gray-100 rounded-lg">
              <Menu size={24} />
            </button>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Create</h2>
              <p className="text-sm text-gray-500">
                Submit an event or place in {userProfile?.city || 'your city'} for review
              </p>
            </div>
          </div>
        </header>

        <div className="p-4 sm:p-6 lg:p-8 max-w-2xl">

          <p className="text-gray-600 mb-6">What would you like to add to OutingStation?</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Event card */}
            <button
              onClick={() => navigate('/create')}
              className="bg-white border-2 border-gray-200 hover:border-cyan-400 rounded-2xl p-8 text-left transition group"
            >
              <div className="w-14 h-14 bg-cyan-50 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-cyan-100 transition">
                <Calendar size={28} className="text-cyan-500" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-1">Event</h3>
              <p className="text-sm text-gray-500">
                Submit a concert, festival, meetup, or any event happening in {userProfile?.city || 'your city'}.
              </p>
            </button>

            {/* Place card */}
            <button
              onClick={() => navigate('/create')}
              className="bg-white border-2 border-gray-200 hover:border-purple-400 rounded-2xl p-8 text-left transition group"
            >
              <div className="w-14 h-14 bg-purple-50 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-purple-100 transition">
                <MapPin size={28} className="text-purple-500" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-1">Place</h3>
              <p className="text-sm text-gray-500">
                Submit a restaurant, park, bar, museum or any cool spot in {userProfile?.city || 'your city'}.
              </p>
            </button>
          </div>

          <div className="mt-6 bg-cyan-50 border border-cyan-200 rounded-xl p-4">
            <p className="text-sm text-cyan-700">
              ℹ️ All submissions go through our review process before going live. We typically review within <strong>24–48 hours</strong>.
            </p>
          </div>

        </div>
      </main>
    </div>
  );
}