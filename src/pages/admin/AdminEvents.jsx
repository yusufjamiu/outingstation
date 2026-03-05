import { useState, useEffect } from 'react';
import { Menu, Plus, Edit, Trash2, Eye } from 'lucide-react';
import { AdminSidebar } from '../../components/AdminSidebar';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase';
import { isUpcomingEvent } from '../../utils/eventFilters';

export default function AdminEvents() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterTime, setFilterTime] = useState('all'); // NEW: all, upcoming, past
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      setLoading(true);

      const snapshot = await getDocs(collection(db, 'events'));
      const eventsData = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data()
      }));

      // Sort by createdAt
      eventsData.sort((a, b) => {
        const aTime = a.createdAt?.seconds || 0;
        const bTime = b.createdAt?.seconds || 0;
        return bTime - aTime;
      });

      setEvents(eventsData);
    } catch (err) {
      console.error('Error loading events:', err);
    }

    setLoading(false);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this event?')) {
      try {
        await deleteDoc(doc(db, 'events', id));
        setEvents(events.filter(e => e.id !== id));
      } catch (err) {
        alert('Error: ' + err.message);
      }
    }
  };

  const formatSingleDate = (rawDate) => {
    if (!rawDate) return '';

    if (rawDate?.toDate) {
      return rawDate.toDate().toLocaleDateString();
    }

    if (rawDate instanceof Date) {
      return rawDate.toLocaleDateString();
    }

    return rawDate;
  };

  const formatDate = (event) => {
    if (event.date) {
      return formatSingleDate(event.date);
    }

    if (event.startDate) {
      const start = formatSingleDate(event.startDate);
      const end = formatSingleDate(event.endDate);
      return end ? `${start} → ${end}` : start;
    }

    if (event.recurringPattern) {
      return `Every ${event.recurringDay || event.recurringPattern}`;
    }

    return 'N/A';
  };

  const formatTime = (event) => {
    if (event.time) return event.time;

    if (event.dailyStartTime) {
      return `${event.dailyStartTime} - ${event.dailyEndTime || ''}`;
    }

    if (event.recurringTime) return event.recurringTime;

    return '';
  };

  const getCategory = (event) => {
    return event.category || 'N/A';
  };

  // ✅ NEW: Filter by time (upcoming/past)
  const filteredEvents = events.filter(event => {
    const matchesSearch = (event.title || '')
      .toLowerCase()
      .includes(searchQuery.toLowerCase());

    const matchesFilter =
      filterStatus === 'all' ||
      (event.status || '').toLowerCase() === filterStatus;

    // NEW: Time filter
    let matchesTime = true;
    if (filterTime === 'upcoming') {
      matchesTime = isUpcomingEvent(event);
    } else if (filterTime === 'past') {
      matchesTime = !isUpcomingEvent(event);
    }

    return matchesSearch && matchesFilter && matchesTime;
  });

  return (
    <div className="flex h-screen bg-gray-50">
      <AdminSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <main className="flex-1 overflow-auto">
        <header className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">

            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 hover:bg-gray-100 rounded-lg"
              >
                <Menu size={24} />
              </button>

              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
                  Manage Events
                </h2>
                <p className="text-sm text-gray-500">
                  {filteredEvents.length} of {events.length} events shown
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={loadEvents}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition text-sm"
              >
                Refresh
              </button>

              <button
                onClick={() => navigate('/admin/events/create')}
                className="flex items-center gap-2 px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition"
              >
                <Plus size={20} />
                <span>Create Event</span>
              </button>
            </div>
          </div>

          {/* ✅ NEW: Filters Row */}
          <div className="mt-4 flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <input
              type="text"
              placeholder="Search events..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 outline-none text-sm"
            />

            {/* Status Filter */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 outline-none text-sm"
            >
              <option value="all">All Status</option>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
            </select>

            {/* ✅ NEW: Time Filter */}
            <select
              value={filterTime}
              onChange={(e) => setFilterTime(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 outline-none text-sm bg-cyan-50"
            >
              <option value="all">All Events</option>
              <option value="upcoming">Upcoming Only</option>
              <option value="past">Past Only</option>
            </select>
          </div>
        </header>

        <div className="p-4 sm:p-6 lg:p-8">
          {loading ? (
            <div className="flex justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      {['Event', 'University', 'Category', 'Date & Time', 'Type', 'Status', 'Price', 'Actions'].map(h => (
                        <th
                          key={h}
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-200">
                    {filteredEvents.map((event) => (
                      <tr key={event.id} className="hover:bg-gray-50">

                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">
                            {event.title}
                          </div>
                          <div className="text-sm text-gray-500">
                            {event.location || 'Online'}
                          </div>
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {event.eventType === 'campus' ? (event.university || '—') : '—'}
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {getCategory(event)}
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {formatDate(event)}
                          </div>
                          <div className="text-sm text-gray-500">
                            {formatTime(event)}
                          </div>
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {event.eventType || 'regular'}
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {event.status || 'draft'}
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {event.isFree ? 'Free' : `₦${event.price || 0}`}
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <div className="flex gap-2">
                            <button
                              onClick={() => navigate(`/event/${event.id}`)}
                              className="p-2 text-blue-600"
                              title="View"
                            >
                              <Eye size={18} />
                            </button>

                            <button
                              onClick={() => navigate(`/admin/events/edit/${event.id}`)}
                              className="p-2 text-green-600"
                              title="Edit"
                            >
                              <Edit size={18} />
                            </button>

                            <button
                              onClick={() => handleDelete(event.id)}
                              className="p-2 text-red-600"
                              title="Delete"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </td>

                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {filteredEvents.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  No events found matching your filters.
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}