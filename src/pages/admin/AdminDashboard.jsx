import { useState, useEffect } from 'react';
import { Menu, Calendar, Users, Eye, TrendingUp } from 'lucide-react';
import { AdminSidebar } from '../../components/AdminSidebar';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';

export default function AdminDashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [stats, setStats] = useState({
    totalEvents: 0,
    totalUsers: 0,
    publishedEvents: 0,
    freeEvents: 0
  });
  const [recentEvents, setRecentEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      // Load events
      const eventsSnap = await getDocs(collection(db, 'events'));
      const allEvents = eventsSnap.docs.map(d => ({
        id: d.id,
        ...d.data()
      }));

      // Load users
      const usersSnap = await getDocs(collection(db, 'users'));

      setStats({
        totalEvents: allEvents.length,
        totalUsers: usersSnap.size,
        publishedEvents: allEvents.filter(e => e.status === 'published').length,
        freeEvents: allEvents.filter(e => e.isFree).length
      });

      // Sort by createdAt and take first 5
      const sorted = [...allEvents]
        .sort((a, b) => {
          const aTime = a.createdAt?.seconds || 0;
          const bTime = b.createdAt?.seconds || 0;
          return bTime - aTime;
        })
        .slice(0, 5);

      setRecentEvents(sorted);
    } catch (err) {
      console.error('Error loading dashboard:', err);
    }

    setLoading(false);
  };

  // ✅ FIXED DATE FORMATTER
  const formatDate = (event) => {
    const rawDate = event.date || event.startDate;

    if (!rawDate) {
      return event.recurringPattern ? 'Recurring' : 'N/A';
    }

    // Firestore Timestamp
    if (rawDate?.toDate) {
      return rawDate.toDate().toLocaleString();
    }

    // JS Date object
    if (rawDate instanceof Date) {
      return rawDate.toLocaleString();
    }

    // Already formatted string
    return rawDate;
  };

  const statCards = [
    { label: 'Total Events', value: stats.totalEvents, icon: Calendar, color: 'bg-blue-500' },
    { label: 'Total Users', value: stats.totalUsers, icon: Users, color: 'bg-green-500' },
    { label: 'Published', value: stats.publishedEvents, icon: Eye, color: 'bg-purple-500' },
    { label: 'Free Events', value: stats.freeEvents, icon: TrendingUp, color: 'bg-orange-500' },
  ];

  return (
    <div className="flex h-screen bg-gray-50">
      <AdminSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <main className="flex-1 overflow-auto">
        <header className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 hover:bg-gray-100 rounded-lg"
            >
              <Menu size={24} />
            </button>

            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
              Dashboard Overview
            </h2>

            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">Admin</span>
              <button
                onClick={loadDashboardData}
                className="text-sm text-cyan-600 hover:text-cyan-700 font-medium"
              >
                ↻ Refresh
              </button>
            </div>
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
                {statCards.map((stat, index) => {
                  const Icon = stat.icon;
                  return (
                    <div
                      key={index}
                      className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div
                          className={`${stat.color} w-12 h-12 rounded-lg flex items-center justify-center`}
                        >
                          <Icon size={24} className="text-white" />
                        </div>
                      </div>
                      <h3 className="text-2xl font-bold text-gray-900 mb-1">
                        {stat.value}
                      </h3>
                      <p className="text-sm text-gray-600">{stat.label}</p>
                    </div>
                  );
                })}
              </div>

              {/* Recent Events Table */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                  <h3 className="text-lg font-bold text-gray-900">
                    Recent Events
                  </h3>
                  <span className="text-sm text-gray-500">
                    Live from Firestore
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        {['Event Name', 'Type', 'Status', 'Date', 'Price'].map(
                          (h) => (
                            <th
                              key={h}
                              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                            >
                              {h}
                            </th>
                          )
                        )}
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-gray-200">
                      {recentEvents.map((event) => (
                        <tr key={event.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              {event.imageUrl && (
                                <img
                                  src={event.imageUrl}
                                  alt=""
                                  className="w-10 h-10 rounded-lg object-cover"
                                  onError={(e) =>
                                    (e.target.style.display = 'none')
                                  }
                                />
                              )}

                              <div>
                                <div className="text-sm font-medium text-gray-900 line-clamp-1">
                                  {event.title}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {event.location || 'Online'}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                                event.eventType === 'campus'
                                  ? 'bg-blue-100 text-blue-700'
                                  : event.eventType === 'webinar'
                                  ? 'bg-purple-100 text-purple-700'
                                  : 'bg-gray-100 text-gray-700'
                              }`}
                            >
                              {event.eventType || 'regular'}
                            </span>
                          </td>

                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                                event.status === 'published'
                                  ? 'bg-green-100 text-green-700'
                                  : event.status === 'draft'
                                  ? 'bg-gray-100 text-gray-700'
                                  : 'bg-yellow-100 text-yellow-700'
                              }`}
                            >
                              {event.status || 'draft'}
                            </span>
                          </td>

                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {formatDate(event)}
                          </td>

                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {event.isFree ? (
                              <span className="text-green-600 font-medium">
                                Free
                              </span>
                            ) : (
                              `₦${event.price || 0}`
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {recentEvents.length === 0 && (
                    <div className="text-center py-12">
                      <p className="text-gray-500">
                        No events yet.{' '}
                        <a
                          href="#/admin/events/create"
                          className="text-cyan-500 font-medium"
                        >
                          Create your first event →
                        </a>
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
