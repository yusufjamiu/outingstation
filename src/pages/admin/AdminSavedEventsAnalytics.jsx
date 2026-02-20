import { useState, useEffect } from 'react';
import { Search, Users, Calendar, TrendingUp, Eye, Download, RefreshCw, Menu } from 'lucide-react';
import { AdminSidebar } from '../../components/AdminSidebar';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';

export default function AdminSavedEventsAnalytics() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [allSavedEvents, setAllSavedEvents] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterBy, setFilterBy] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAllSavedEvents();
  }, []);

  const loadAllSavedEvents = async () => {
    try {
      setLoading(true);
      
      // Load all users
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const users = usersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Load all events
      const eventsSnapshot = await getDocs(collection(db, 'events'));
      const events = eventsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Create a map of events by ID for quick lookup
      const eventsMap = {};
      events.forEach(event => {
        eventsMap[event.id] = event;
      });

      // Compile all saved events with user and event details
      const savedEventsData = [];
      
      users.forEach(user => {
        if (Array.isArray(user.savedEvents) && user.savedEvents.length > 0) {
          user.savedEvents.forEach(eventId => {
            const event = eventsMap[eventId];
            if (event) {
              savedEventsData.push({
                userId: user.id,
                userName: user.name || 'Unknown User',
                userEmail: user.email || 'N/A',
                eventId: event.id,
                eventTitle: event.title,
                eventImage: event.imageUrl,
                eventCategory: event.category,
                savedAt: user.createdAt || new Date() // Approximation
              });
            }
          });
        }
      });

      setAllSavedEvents(savedEventsData);
      console.log('📊 Loaded', savedEventsData.length, 'saved events from Firestore');
    } catch (err) {
      console.error('Error loading saved events:', err);
    }
    setLoading(false);
  };

  // Get event statistics
  const getEventStats = () => {
    const eventSaveCount = {};
    
    allSavedEvents.forEach(saved => {
      const eventId = saved.eventId;
      if (!eventSaveCount[eventId]) {
        eventSaveCount[eventId] = {
          eventId,
          eventTitle: saved.eventTitle,
          eventImage: saved.eventImage,
          count: 0,
          users: []
        };
      }
      eventSaveCount[eventId].count++;
      eventSaveCount[eventId].users.push({
        userId: saved.userId,
        userName: saved.userName,
        userEmail: saved.userEmail
      });
    });

    return Object.values(eventSaveCount).sort((a, b) => b.count - a.count);
  };

  // Get user statistics
  const getUserStats = () => {
    const userSaveCount = {};
    
    allSavedEvents.forEach(saved => {
      const userId = saved.userId;
      if (!userSaveCount[userId]) {
        userSaveCount[userId] = {
          userId,
          userName: saved.userName,
          userEmail: saved.userEmail,
          count: 0,
          events: []
        };
      }
      userSaveCount[userId].count++;
      userSaveCount[userId].events.push({
        eventId: saved.eventId,
        eventTitle: saved.eventTitle
      });
    });

    return Object.values(userSaveCount).sort((a, b) => b.count - a.count);
  };

  // Get overall statistics
  const getTotalStats = () => {
    const uniqueUsers = new Set(allSavedEvents.map(e => e.userId)).size;
    const uniqueEvents = new Set(allSavedEvents.map(e => e.eventId)).size;
    
    return {
      totalSaves: allSavedEvents.length,
      uniqueUsers,
      uniqueEvents,
      avgSavesPerUser: uniqueUsers > 0 ? (allSavedEvents.length / uniqueUsers).toFixed(1) : 0
    };
  };

  const eventStats = getEventStats();
  const userStats = getUserStats();
  const totalStats = getTotalStats();

  // Filter data based on search
  const filteredEventStats = eventStats.filter(event =>
    event.eventTitle.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    
    let date;
    if (timestamp?.toDate) {
      date = timestamp.toDate();
    } else if (timestamp?.seconds) {
      date = new Date(timestamp.seconds * 1000);
    } else if (timestamp instanceof Date) {
      date = timestamp;
    } else {
      return 'N/A';
    }
    
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
    const headers = ['Event Title', 'Event ID', 'User Name', 'User Email', 'Category'];
    const rows = allSavedEvents.map(saved => [
      `"${saved.eventTitle}"`,
      saved.eventId,
      saved.userName,
      saved.userEmail,
      saved.eventCategory || 'N/A'
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

  return (
    <div className="flex h-screen bg-gray-50">
      <AdminSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="flex-1 overflow-auto">
        <header className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 py-4 sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 hover:bg-gray-100 rounded-lg">
              <Menu size={24} />
            </button>
            
            <div className="flex-1">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Saved Events Analytics</h2>
              <p className="text-gray-600 text-sm mt-1">Monitor user engagement and event popularity from Firestore</p>
            </div>
            
            <button onClick={loadAllSavedEvents}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition">
              <RefreshCw size={20} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </header>

        <div className="p-4 sm:p-6 lg:p-8">
          {loading ? (
            <div className="flex justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
            </div>
          ) : (
            <>
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
                      <p className="text-xs text-gray-400 mt-1">Users with saves</p>
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
                    <button onClick={() => setFilterBy('all')}
                      className={`px-4 py-2 rounded-lg font-medium transition ${
                        filterBy === 'all' ? 'bg-cyan-400 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}>
                      All Events ({allSavedEvents.length})
                    </button>
                    <button onClick={() => setFilterBy('event')}
                      className={`px-4 py-2 rounded-lg font-medium transition ${
                        filterBy === 'event' ? 'bg-cyan-400 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}>
                      By Popularity ({eventStats.length})
                    </button>
                    <button onClick={() => setFilterBy('user')}
                      className={`px-4 py-2 rounded-lg font-medium transition ${
                        filterBy === 'user' ? 'bg-cyan-400 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}>
                      By User ({userStats.length})
                    </button>
                  </div>

                  <div className="flex gap-4 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                      <input type="text" placeholder="Search events..." value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-transparent outline-none" />
                    </div>
                    <button onClick={exportToCSV} disabled={allSavedEvents.length === 0}
                      className="flex items-center gap-2 px-4 py-2 bg-cyan-400 text-white rounded-lg hover:bg-cyan-500 transition disabled:opacity-50">
                      <Download size={20} />
                      <span className="hidden sm:inline">Export</span>
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
                  <p className="text-gray-600 mb-6">Users haven't saved any events yet.</p>
                </div>
              )}

              {/* Events by Popularity */}
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
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Users</th>
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
                                {event.eventImage && (
                                  <img src={event.eventImage} alt={event.eventTitle}
                                    className="w-16 h-16 rounded-lg object-cover"
                                    onError={e => e.target.style.display='none'} />
                                )}
                                <p className="font-medium text-gray-900">{event.eventTitle}</p>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className="px-4 py-2 bg-cyan-100 text-cyan-700 rounded-full text-sm font-bold">
                                {event.count} {event.count === 1 ? 'save' : 'saves'}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-sm text-gray-600">
                                {event.users.slice(0, 3).map((u, i) => (
                                  <div key={i}>{u.userName}</div>
                                ))}
                                {event.users.length > 3 && (
                                  <div className="text-gray-400">+{event.users.length - 3} more</div>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Users by Activity */}
              {allSavedEvents.length > 0 && filterBy === 'user' && (
                <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                  <div className="p-6 border-b border-gray-200">
                    <h2 className="text-xl font-bold text-gray-900">Users by Activity</h2>
                    <p className="text-sm text-gray-500 mt-1">Most active users first</p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rank</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Saves</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Events</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {userStats.map((user, index) => (
                          <tr key={user.userId} className="hover:bg-gray-50">
                            <td className="px-6 py-4">
                              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-100 text-purple-600 font-bold">
                                #{index + 1}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div>
                                <p className="font-medium text-gray-900">{user.userName}</p>
                                <p className="text-sm text-gray-500">{user.userEmail}</p>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className="px-4 py-2 bg-purple-100 text-purple-700 rounded-full text-sm font-bold">
                                {user.count} {user.count === 1 ? 'save' : 'saves'}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-sm text-gray-600">
                                {user.events.slice(0, 2).map((e, i) => (
                                  <div key={i}>{e.eventTitle}</div>
                                ))}
                                {user.events.length > 2 && (
                                  <div className="text-gray-400">+{user.events.length - 2} more</div>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* All Saved Events */}
              {allSavedEvents.length > 0 && filterBy === 'all' && (
                <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                  <div className="p-6 border-b border-gray-200">
                    <h2 className="text-xl font-bold text-gray-900">All Saved Events</h2>
                    <p className="text-sm text-gray-500 mt-1">Complete list from Firestore</p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Event</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {allSavedEvents.map((saved, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                {saved.eventImage && (
                                  <img src={saved.eventImage} alt={saved.eventTitle}
                                    className="w-12 h-12 rounded-lg object-cover"
                                    onError={e => e.target.style.display='none'} />
                                )}
                                <p className="font-medium text-gray-900">{saved.eventTitle}</p>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-sm text-gray-600">{saved.eventCategory || 'N/A'}</span>
                            </td>
                            <td className="px-6 py-4">
                              <div>
                                <p className="font-medium text-gray-900">{saved.userName}</p>
                                <p className="text-sm text-gray-500">{saved.userEmail}</p>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}