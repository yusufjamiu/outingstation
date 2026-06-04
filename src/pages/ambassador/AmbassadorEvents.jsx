import { useState, useEffect } from 'react';
import { Menu, Plus, Edit, Trash2, Eye, Bell, AlertTriangle, Layers } from 'lucide-react';
import { AmbassadorSidebar } from '../../components/AmbassadorSidebar';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import { isUpcomingEvent } from '../../utils/eventFilters';
import NotifyUsersModal from '../../components/NotifyUsersModal';

export default function AmbassadorEvents() {
  const navigate = useNavigate();
  const { userProfile } = useAuth();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterTime, setFilterTime] = useState('all');
  const [events, setEvents] = useState([]);
  const [universities, setUniversities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNotifyModal, setShowNotifyModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);

  const assignedIds = userProfile?.assignedCampuses || [];
  const myCampuses = universities.filter(u => assignedIds.includes(u.id));
  const myCampusNames = myCampuses.map(u => u.name).filter(Boolean);

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    try {
      setLoading(true);
      const [eventsSnap, uniSnap] = await Promise.all([
        getDocs(collection(db, 'events')),
        getDocs(collection(db, 'universities')),
      ]);
      const eventsData = eventsSnap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(e => e.subCategory !== 'places');
      eventsData.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setEvents(eventsData);
      setUniversities(uniSnap.docs.map(d => ({ id: d.id, ...d.data() })));
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

  const handleNotifyUpdate = (event) => {
    setSelectedEvent(event);
    setShowNotifyModal(true);
  };

  const formatSingleDate = (rawDate) => {
    if (!rawDate) return '';
    if (rawDate?.toDate) return rawDate.toDate().toLocaleDateString();
    if (rawDate instanceof Date) return rawDate.toLocaleDateString();
    return rawDate;
  };

  const formatDate = (event) => {
    if (event.date) return formatSingleDate(event.date);
    if (event.startDate) {
      const start = formatSingleDate(event.startDate);
      const end = formatSingleDate(event.endDate);
      return end ? `${start} → ${end}` : start;
    }
    if (event.recurringPattern) return `Every ${event.recurringDay || event.recurringPattern}`;
    return 'N/A';
  };

  const formatTime = (event) => {
    if (event.time) return event.time;
    if (event.dailyStartTime) return `${event.dailyStartTime} - ${event.dailyEndTime || ''}`;
    if (event.recurringTime) return event.recurringTime;
    return '';
  };

  const myEvents = events.filter(e => e.university && myCampusNames.includes(e.university));

  const filteredEvents = myEvents.filter(event => {
    const matchesSearch = (event.title || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' || (event.status || '').toLowerCase() === filterStatus;
    let matchesTime = true;
    if (filterTime === 'upcoming') matchesTime = isUpcomingEvent(event);
    else if (filterTime === 'past') matchesTime = !isUpcomingEvent(event);
    return matchesSearch && matchesStatus && matchesTime;
  });

  const noCampus = !loading && myCampuses.length === 0;

  return (
    <div className="flex h-screen bg-gray-50">
      <AmbassadorSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="flex-1 overflow-auto">
        <header className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 hover:bg-gray-100 rounded-lg">
                <Menu size={24} />
              </button>
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900">My Events</h2>
                <p className="text-sm text-gray-500">
                  {myCampusNames.length > 0 ? myCampusNames.join(', ') : 'No campus assigned'} · {filteredEvents.length} shown
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={loadAll} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition text-sm">
                Refresh
              </button>
              <button
                onClick={() => navigate('/ambassador/events/create')}
                disabled={noCampus}
                className="flex items-center gap-2 px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition text-sm font-medium disabled:opacity-50"
              >
                <Plus size={18} />
                Create Event
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="mt-4 flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              placeholder="Search events..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 outline-none text-sm"
            />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 outline-none text-sm"
            >
              <option value="all">All Status</option>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
            </select>
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
          ) : noCampus ? (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 flex items-start gap-3">
              <AlertTriangle className="text-amber-500 flex-shrink-0" size={22} />
              <div>
                <p className="font-semibold text-amber-800">No campus assigned yet</p>
                <p className="text-sm text-amber-700">Ask your admin to assign you a campus. Once you have one, you can create and manage its events here.</p>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      {['Event', 'Category', 'Date & Time', 'Status', 'Price', 'Actions'].map(h => (
                        <th key={h} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredEvents.map((event) => (
                      <tr key={event.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <img
                              src={event.imageUrl || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=100'}
                              alt={event.title}
                              className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                              onError={(e) => e.target.src = 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=100'}
                            />
                            <div>
                              <div className="text-sm font-medium text-gray-900 line-clamp-1">{event.title}</div>
                              <div className="text-xs text-gray-500">{event.location || 'Online'}</div>
                              {event.university && (
                                <div className="text-xs text-teal-600">🎓 {event.university}</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {event.category || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{formatDate(event)}</div>
                          <div className="text-xs text-gray-500">{formatTime(event)}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                            event.status === 'published' ? 'bg-emerald-100 text-emerald-700' :
                            event.status === 'draft' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {event.status || 'draft'}
                          </span>
                        </td>

                        {/* ✅ Price column — shows tier badge if event has tiers */}
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {event.isFree ? (
                            <span className="text-emerald-600 font-medium">Free</span>
                          ) : event.hasTicketTiers && event.ticketTiers?.length > 0 ? (
                            <div className="flex flex-col gap-1">
                              <span className="inline-flex items-center gap-1 text-xs bg-cyan-100 text-cyan-700 px-2 py-0.5 rounded-full font-semibold">
                                <Layers size={10} />
                                {event.ticketTiers.length} Tiers
                              </span>
                              <span className="text-xs text-gray-400">
                                from ₦{Math.min(...event.ticketTiers.map(t => t.price)).toLocaleString()}
                              </span>
                            </div>
                          ) : (
                            <span>₦{(event.ticketPrice || event.price || 0).toLocaleString()}</span>
                          )}
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <div className="flex gap-1">
                            <button onClick={() => navigate(`/event/${event.id}`)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition" title="View">
                              <Eye size={16} />
                            </button>
                            <button onClick={() => navigate(`/ambassador/events/edit/${event.id}`)} className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition" title="Edit">
                              <Edit size={16} />
                            </button>
                            <button onClick={() => handleNotifyUpdate(event)} className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition" title="Notify Users">
                              <Bell size={16} />
                            </button>
                            <button onClick={() => handleDelete(event.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition" title="Delete">
                              <Trash2 size={16} />
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
                  No events yet for your campus. Click "Create Event" to add one.
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {showNotifyModal && selectedEvent && (
        <NotifyUsersModal
          event={selectedEvent}
          notificationType="update"
          onClose={() => { setShowNotifyModal(false); setSelectedEvent(null); }}
        />
      )}
    </div>
  );
}