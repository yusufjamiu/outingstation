import { useState, useEffect } from 'react';
import { Search, Users, Calendar, TrendingUp, Eye, Download, RefreshCw, Menu } from 'lucide-react';
import { AdminSidebar } from '../../components/AdminSidebar';

export default function AdminSavedEventsAnalytics() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [allSavedEvents, setAllSavedEvents] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterBy, setFilterBy] = useState('all'); // 'all', 'event', 'user'

  useEffect(() => {
    loadAllSavedEvents();
    
    // Refresh every 2 seconds to show real-time updates
    const interval = setInterval(loadAllSavedEvents, 2000);
    return () => clearInterval(interval);
  }, []);

  // Load saved events from localStorage (simulating database)
  const loadAllSavedEvents = () => {
    const savedEventsJSON = localStorage.getItem('savedEvents');
    
    if (savedEventsJSON) {
      const events = JSON.parse(savedEventsJSON);
      
      // Add mock user data to each event for demo
      const eventsWithUsers = events.map(event => ({
        ...event,
        userId: 'user123', // Mock user ID
        userName: 'Test User', // Mock user name
        userEmail: 'test@example.com', // Mock user email
        savedAt: new Date().toISOString() // Mock timestamp
      }));
      
      setAllSavedEvents(eventsWithUsers);
      console.log('📊 Admin Dashboard: Loaded', eventsWithUsers.length, 'saved events');
    } else {
      setAllSavedEvents([]);
    }
  };

  // Get event statistics
  const getEventStats = () => {
    const eventSaveCount = {};
    
    allSavedEvents.forEach(saved => {
      const eventId = saved.id;
      if (!eventSaveCount[eventId]) {
        eventSaveCount[eventId] = {
          eventId,
          eventTitle: saved.title,
          eventImage: saved.imageUrl,
          count: 0,
          users: []
        };
      }
      eventSaveCount[eventId].count++;
      eventSaveCount[eventId].users.push({
        userId: saved.userId,
        userName: saved.userName,
        userEmail: saved.userEmail,
        savedAt: saved.savedAt
      });
    });

    return Object.values(eventSaveCount).sort((a, b) => b.count - a.count);
  };

  // Get user statistics (mock - all events from same user for demo)
  const getUserStats = () => {
    return [{
      userId: 'user123',
      userName: 'Test User',
      userEmail: 'test@example.com',
      count: allSavedEvents.length,
      events: allSavedEvents.map(e => ({
        eventId: e.id,
        eventTitle: e.title,
        savedAt: new Date().toISOString()
      }))
    }];
  };

  // Get overall statistics
  const getTotalStats = () => {
    const uniqueUsers = 1; // For demo, only 1 user
    const uniqueEvents = new Set(allSavedEvents.map(e => e.id)).size;
    
    return {
      totalSaves: allSavedEvents.length,
      uniqueUsers,
      uniqueEvents,
      avgSavesPerUser: allSavedEvents.length
    };
  };

  const eventStats = getEventStats();
  const userStats = getUserStats();
  const totalStats = getTotalStats();

  // Filter data based on search
  const filteredEventStats = eventStats.filter(event =>
    event.eventTitle.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Export to CSV
  const exportToCSV = () => {
    const headers = ['Event Title', 'Event ID', 'User Name', 'User Email', 'Saved At'];
    const rows = allSavedEvents.map(event => [
      event.title,
      event.id,
      event.userName,
      event.userEmail,
      formatDate(event.savedAt)
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `saved-events-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    
    console.log('📥 Exported', allSavedEvents.length, 'saved events to CSV');
  };

  // Clear all saved events (for testing)
  const clearAllSaves = () => {
    if (window.confirm('⚠️ Are you sure you want to clear ALL saved events? This cannot be undone!')) {
      localStorage.removeItem('savedEvents');
      setAllSavedEvents([]);
      console.log('🗑️ Admin: Cleared all saved events');
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <AdminSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="flex-1 overflow-auto">
        {/* Top Bar */}
        <header className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 py-4 sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <button 
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 hover:bg-gray-100 rounded-lg"
            >
              <Menu size={24} />
            </button>
            
            <div className="flex-1">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
                Saved Events Analytics
                <span className="text-sm font-normal text-gray-500 ml-3">
                  (Demo Mode - LocalStorage)
                </span>
              </h2>
              <p className="text-gray-600 text-sm mt-1">Monitor user engagement and event popularity in real-time</p>
            </div>
            
            <button
              onClick={loadAllSavedEvents}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
            >
              <RefreshCw size={20} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </header>

        {/* Content */}
        <div className="p-4 sm:p-6 lg:p-8">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-xl p-6 shadow-sm border-2 border-cyan-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm">Total Saves</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{totalStats.totalSaves}</p>
                  <p className="text-xs text-gray-400 mt-1">All saved events</p>
                </div>
                <div className="w-12 h-12 bg-cyan-100 rounded-full flex items-center justify-center">
                  <Calendar className="text-cyan-500" size={24} />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border-2 border-purple-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm">Active Users</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{totalStats.uniqueUsers}</p>
                  <p className="text-xs text-gray-400 mt-1">Demo: 1 test user</p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                  <Users className="text-purple-500" size={24} />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border-2 border-green-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm">Unique Events</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{totalStats.uniqueEvents}</p>
                  <p className="text-xs text-gray-400 mt-1">Different events saved</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <TrendingUp className="text-green-500" size={24} />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border-2 border-orange-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm">Avg per User</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{totalStats.avgSavesPerUser}</p>
                  <p className="text-xs text-gray-400 mt-1">Saves per user</p>
                </div>
                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                  <Eye className="text-orange-500" size={24} />
                </div>
              </div>
            </div>
          </div>

          {/* Filters and Actions */}
          <div className="bg-white rounded-xl p-6 shadow-sm mb-8">
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
              <div className="flex gap-4">
                <button
                  onClick={() => setFilterBy('all')}
                  className={`px-4 py-2 rounded-lg font-medium transition ${
                    filterBy === 'all'
                      ? 'bg-cyan-400 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  All Events ({allSavedEvents.length})
                </button>
                <button
                  onClick={() => setFilterBy('event')}
                  className={`px-4 py-2 rounded-lg font-medium transition ${
                    filterBy === 'event'
                      ? 'bg-cyan-400 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  By Popularity ({eventStats.length})
                </button>
              </div>

              <div className="flex gap-4 w-full md:w-auto">
                <div className="relative flex-1 md:w-64">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="text"
                    placeholder="Search events..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-transparent outline-none"
                  />
                </div>
                <button
                  onClick={exportToCSV}
                  disabled={allSavedEvents.length === 0}
                  className="flex items-center gap-2 px-4 py-2 bg-cyan-400 text-white rounded-lg hover:bg-cyan-500 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Download size={20} />
                  <span className="hidden sm:inline">Export</span>
                </button>
                <button
                  onClick={clearAllSaves}
                  className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition"
                >
                  Clear All
                </button>
              </div>
            </div>
          </div>

          {/* Empty State */}
          {allSavedEvents.length === 0 && (
            <div className="bg-white rounded-xl shadow-sm p-12 text-center">
              <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Calendar className="text-gray-400" size={40} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">No Saved Events Yet</h3>
              <p className="text-gray-600 mb-6">
                Users haven't saved any events yet. Go save some events to see them appear here!
              </p>
              <button
                onClick={() => window.location.href = '/#/events'}
                className="px-6 py-3 bg-cyan-400 text-white rounded-lg hover:bg-cyan-500 transition"
              >
                Browse Events
              </button>
            </div>
          )}

          {/* Data Tables */}
          {allSavedEvents.length > 0 && filterBy === 'event' && (
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900">Events by Popularity</h2>
                <p className="text-sm text-gray-500 mt-1">Most saved events first</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rank</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Event</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Saves</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Event ID</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredEventStats.map((event, index) => (
                      <tr key={event.eventId} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-cyan-100 text-cyan-600 font-bold">
                            #{index + 1}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <img
                              src={event.eventImage}
                              alt={event.eventTitle}
                              className="w-16 h-16 rounded-lg object-cover"
                            />
                            <div>
                              <p className="font-medium text-gray-900">{event.eventTitle}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-4 py-2 bg-cyan-100 text-cyan-700 rounded-full text-sm font-bold">
                            {event.count} {event.count === 1 ? 'save' : 'saves'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-gray-500 font-mono">
                            {event.eventId}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {allSavedEvents.length > 0 && filterBy === 'all' && (
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900">All Saved Events</h2>
                <p className="text-sm text-gray-500 mt-1">Complete list of user saves</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Event</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Event ID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Saved At</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {allSavedEvents.map((saved, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <img
                              src={saved.imageUrl}
                              alt={saved.title}
                              className="w-12 h-12 rounded-lg object-cover"
                            />
                            <div>
                              <p className="font-medium text-gray-900">{saved.title}</p>
                              <p className="text-xs text-gray-500">{saved.category}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-gray-500 font-mono">
                            {saved.id}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-medium text-gray-900">{saved.userName}</p>
                            <p className="text-sm text-gray-500">{saved.userEmail}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-gray-600">{formatDate(saved.savedAt)}</p>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}