import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  updateDoc,
  orderBy 
} from 'firebase/firestore';
import { db } from '../../firebase';
import toast from 'react-hot-toast';
import { 
  Ticket, 
  DollarSign, 
  TrendingUp, 
  Calendar,
  Copy,
  RefreshCw,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Download,
  CheckCircle,
  Users,
  Menu
} from 'lucide-react';
import { formatEventDateFull } from '../../utils/dateTimeHelpers';
import { AdminSidebar } from '../../components/AdminSidebar';

export default function AdminTickets() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState([]);
  const [expandedEvent, setExpandedEvent] = useState(null);
  const [eventFilter, setEventFilter] = useState('recent'); // ← NEW: recent, archived, all
  const [stats, setStats] = useState({
    totalEvents: 0,
    totalTicketsSold: 0,
    totalRevenue: 0,
    serviceFees: 0,
    paystackFees: 0,
    organizerRevenue: 0
  });

  useEffect(() => {
    loadTicketedEvents();
  }, []);

  const loadTicketedEvents = async () => {
    try {
      setLoading(true);

      // Get all events with OutingStation ticketing
      const eventsRef = collection(db, 'events');
      const q = query(
        eventsRef, 
        where('hasOutingStationTicketing', '==', true)
        // ✅ REMOVED orderBy - will sort manually after fetching
      );
      const eventsSnapshot = await getDocs(q);

      const eventsData = await Promise.all(
        eventsSnapshot.docs.map(async (eventDoc) => {
          const eventData = { id: eventDoc.id, ...eventDoc.data() };

          // Get tickets for this event
          const ticketsRef = collection(db, 'tickets');
          const ticketsQuery = query(ticketsRef, where('eventId', '==', eventDoc.id));
          const ticketsSnapshot = await getDocs(ticketsQuery);

          const ticketsData = ticketsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));

          // Calculate event stats
          const ticketsSold = ticketsData.reduce((sum, t) => sum + (t.quantity || 1), 0);
          const checkedIn = ticketsData.filter(t => t.checkedIn).reduce((sum, t) => sum + (t.quantity || 1), 0);
          
          // Revenue breakdown
          const organizerRevenue = ticketsData.reduce((sum, t) => {
            return sum + ((t.ticketPrice || 0) * (t.quantity || 1));
          }, 0);

          const serviceFees = ticketsData.reduce((sum, t) => {
            return sum + ((t.serviceFee || 0) * (t.quantity || 1));
          }, 0);

          const paystackFees = ticketsData.reduce((sum, t) => {
            return sum + ((t.paystackFee || 0) * (t.quantity || 1));
          }, 0);

          const totalRevenue = organizerRevenue + serviceFees + paystackFees;

          return {
            ...eventData,
            ticketsSold,
            checkedIn,
            organizerRevenue,
            serviceFees,
            paystackFees,
            totalRevenue,
            ticketsData
          };
        })
      );

      setEvents(eventsData);

      // ✅ Sort events manually by date (most recent first)
      eventsData.sort((a, b) => {
        const getDate = (event) => {
          if (event.date?.seconds) return event.date.seconds;
          if (event.startDate?.seconds) return event.startDate.seconds;
          if (event.endDate?.seconds) return event.endDate.seconds;
          return 0;
        };
        return getDate(b) - getDate(a); // Descending order
      });

      // Calculate overall stats
      const overallStats = eventsData.reduce((acc, event) => ({
        totalEvents: acc.totalEvents + 1,
        totalTicketsSold: acc.totalTicketsSold + event.ticketsSold,
        totalRevenue: acc.totalRevenue + event.totalRevenue,
        serviceFees: acc.serviceFees + event.serviceFees,
        paystackFees: acc.paystackFees + event.paystackFees,
        organizerRevenue: acc.organizerRevenue + event.organizerRevenue
      }), {
        totalEvents: 0,
        totalTicketsSold: 0,
        totalRevenue: 0,
        serviceFees: 0,
        paystackFees: 0,
        organizerRevenue: 0
      });

      setStats(overallStats);

    } catch (err) {
      console.error('Error loading ticketed events:', err);
      toast.error('Failed to load ticketed events');
    }
    setLoading(false);
  };

  const copyManageLink = (manageKey) => {
    const link = `${window.location.origin}/manage/${manageKey}`;
    navigator.clipboard.writeText(link);
    toast.success('📋 Manage link copied!');
  };

  const regenerateManageKey = async (eventId) => {
    if (!confirm('Are you sure? This will invalidate the old link and anyone using it will lose access.')) {
      return;
    }

    try {
      const newManageKey = Array.from({length: 32}, () => 
        Math.floor(Math.random() * 16).toString(16)
      ).join('');

      const eventRef = doc(db, 'events', eventId);
      await updateDoc(eventRef, {
        manageKey: newManageKey
      });

      // Update local state
      setEvents(prev => prev.map(event => 
        event.id === eventId 
          ? { ...event, manageKey: newManageKey }
          : event
      ));

      toast.success('✅ New manage link generated!');
    } catch (err) {
      console.error('Error regenerating manage key:', err);
      toast.error('Failed to regenerate manage link');
    }
  };

  const toggleEventDetails = (eventId) => {
    setExpandedEvent(expandedEvent === eventId ? null : eventId);
  };

  const exportEventCSV = (event) => {
    const headers = ['Ticket ID', 'Buyer Name', 'Email', 'Phone', 'Quantity', 'Ticket Price', 'Service Fee', 'Paystack Fee', 'Total Paid', 'Purchase Date', 'Checked In'];
    const rows = event.ticketsData.map(ticket => [
      ticket.ticketId,
      ticket.buyerName,
      ticket.buyerEmail,
      ticket.buyerPhone || 'N/A', // ✅ ADDED: Phone number column
      ticket.quantity || 1,
      `₦${((ticket.ticketPrice || 0) * (ticket.quantity || 1)).toLocaleString()}`,
      `₦${((ticket.serviceFee || 0) * (ticket.quantity || 1)).toLocaleString()}`,
      `₦${((ticket.paystackFee || 0) * (ticket.quantity || 1)).toLocaleString()}`,
      `₦${ticket.totalPaid?.toLocaleString()}`,
      ticket.purchasedAt?.seconds 
        ? new Date(ticket.purchasedAt.seconds * 1000).toLocaleDateString()
        : 'N/A',
      ticket.checkedIn ? 'Yes' : 'No'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${event.title}-admin-export-${Date.now()}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast.success('✅ Admin export downloaded!');
  };

  // ✅ FILTER EVENTS BY DATE
  const getFilteredEvents = () => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));

    return events.filter(event => {
      // Get event date (try different fields)
      let eventDate = null;
      
      if (event.endDate?.seconds) {
        eventDate = new Date(event.endDate.seconds * 1000);
      } else if (event.startDate?.seconds) {
        eventDate = new Date(event.startDate.seconds * 1000);
      } else if (event.date?.seconds) {
        eventDate = new Date(event.date.seconds * 1000);
      }

      if (!eventDate) return true; // Show if no date found

      if (eventFilter === 'recent') {
        // Show upcoming events + events from last 30 days
        return eventDate >= thirtyDaysAgo;
      } else if (eventFilter === 'archived') {
        // Show events older than 30 days
        return eventDate < thirtyDaysAgo;
      } else {
        // Show all events
        return true;
      }
    });
  };

  const filteredEvents = getFilteredEvents();

  return (
    <div className="flex h-screen bg-gray-50">
      <AdminSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <main className="flex-1 overflow-auto">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setSidebarOpen(true)} 
                className="lg:hidden p-2 hover:bg-gray-100 rounded-lg"
              >
                <Menu size={24} />
              </button>
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Ticketing Dashboard</h2>
                <p className="text-sm text-gray-500">Manage all events with OutingStation ticketing</p>
              </div>
            </div>
            <button 
              onClick={loadTicketedEvents} 
              className="text-sm text-cyan-600 hover:text-cyan-700 font-medium"
            >
              ↻ Refresh
            </button>
          </div>
        </header>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
          </div>
        ) : (
          <div className="p-4 sm:p-6 lg:p-8">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                <div className="flex items-center gap-3 mb-2">
                  <Calendar className="text-cyan-500" size={24} />
                  <p className="text-sm text-gray-600">Ticketed Events</p>
                </div>
                <p className="text-3xl font-bold text-gray-900">{stats.totalEvents}</p>
                <p className="text-xs text-gray-500 mt-1">with OutingStation ticketing</p>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                <div className="flex items-center gap-3 mb-2">
                  <Ticket className="text-purple-500" size={24} />
                  <p className="text-sm text-gray-600">Tickets Sold</p>
                </div>
                <p className="text-3xl font-bold text-gray-900">{stats.totalTicketsSold.toLocaleString()}</p>
                <p className="text-xs text-gray-500 mt-1">across all events</p>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                <div className="flex items-center gap-3 mb-2">
                  <TrendingUp className="text-green-500" size={24} />
                  <p className="text-sm text-gray-600">Your Revenue</p>
                </div>
                <p className="text-3xl font-bold text-gray-900">₦{stats.serviceFees.toLocaleString()}</p>
                <p className="text-xs text-gray-500 mt-1">service fees collected</p>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                <div className="flex items-center gap-3 mb-2">
                  <DollarSign className="text-blue-500" size={24} />
                  <p className="text-sm text-gray-600">Total Revenue</p>
                </div>
                <p className="text-3xl font-bold text-gray-900">₦{stats.totalRevenue.toLocaleString()}</p>
                <p className="text-xs text-gray-500 mt-1">all fees included</p>
              </div>
            </div>

            {/* Revenue Breakdown Card */}
            <div className="bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl p-6 shadow-lg mb-8 text-white">
              <h2 className="text-xl font-bold mb-4">💰 Revenue Breakdown</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                  <p className="text-sm text-white/80 mb-1">Organizers Get</p>
                  <p className="text-2xl font-bold">₦{stats.organizerRevenue.toLocaleString()}</p>
                  <p className="text-xs text-white/70 mt-1">Ticket sales only</p>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                  <p className="text-sm text-white/80 mb-1">OutingStation Gets</p>
                  <p className="text-2xl font-bold">₦{stats.serviceFees.toLocaleString()}</p>
                  <p className="text-xs text-white/70 mt-1">Service fees</p>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                  <p className="text-sm text-white/80 mb-1">Paystack Gets</p>
                  <p className="text-2xl font-bold">₦{stats.paystackFees.toLocaleString()}</p>
                  <p className="text-xs text-white/70 mt-1">Payment processing</p>
                </div>
              </div>
            </div>

            {/* Events List */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">All Ticketed Events</h2>
                
                {/* ✅ FILTER DROPDOWN */}
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-600">Show:</label>
                  <select
                    value={eventFilter}
                    onChange={(e) => setEventFilter(e.target.value)}
                    className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-cyan-400 focus:border-transparent outline-none"
                  >
                    <option value="recent">📅 Upcoming & Recent</option>
                    <option value="archived">📦 Archived (30+ days old)</option>
                    <option value="all">📊 All Events</option>
                  </select>
                </div>
              </div>

              {filteredEvents.length === 0 ? (
                <div className="px-6 py-12 text-center text-gray-500">
                  <Ticket size={48} className="mx-auto mb-4 text-gray-300" />
                  <p>
                    {eventFilter === 'recent' && 'No upcoming or recent events with ticketing'}
                    {eventFilter === 'archived' && 'No archived events'}
                    {eventFilter === 'all' && 'No events with OutingStation ticketing yet'}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {filteredEvents.map((event) => (
                    <div key={event.id} className="hover:bg-gray-50 transition">
                      {/* Event Row */}
                      <div className="px-6 py-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-lg font-semibold text-gray-900">{event.title}</h3>
                              <span className="px-2 py-1 bg-cyan-100 text-cyan-700 rounded text-xs font-medium">
                                {event.ticketsSold} / {event.ticketsAvailable} sold
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                              <span>{formatEventDateFull(event)}</span>
                              <span>•</span>
                              <span>{event.location}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="text-right mr-4">
                              <p className="text-sm text-gray-600">Total Revenue</p>
                              <p className="text-xl font-bold text-gray-900">₦{event.totalRevenue.toLocaleString()}</p>
                            </div>
                            <button
                              onClick={() => toggleEventDetails(event.id)}
                              className="p-2 hover:bg-gray-100 rounded-lg transition"
                            >
                              {expandedEvent === event.id ? (
                                <ChevronUp size={20} className="text-gray-600" />
                              ) : (
                                <ChevronDown size={20} className="text-gray-600" />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Expanded Details */}
                      {expandedEvent === event.id && (
                        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                          {/* Stats Grid */}
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                            <div className="bg-white rounded-lg p-4 shadow-sm">
                              <div className="flex items-center gap-2 mb-2">
                                <Ticket size={18} className="text-cyan-500" />
                                <p className="text-xs text-gray-600">Tickets Sold</p>
                              </div>
                              <p className="text-2xl font-bold text-gray-900">{event.ticketsSold}</p>
                            </div>

                            <div className="bg-white rounded-lg p-4 shadow-sm">
                              <div className="flex items-center gap-2 mb-2">
                                <CheckCircle size={18} className="text-green-500" />
                                <p className="text-xs text-gray-600">Checked In</p>
                              </div>
                              <p className="text-2xl font-bold text-gray-900">{event.checkedIn}</p>
                              <p className="text-xs text-gray-500">
                                {event.ticketsSold > 0 ? Math.round((event.checkedIn / event.ticketsSold) * 100) : 0}% attendance
                              </p>
                            </div>

                            <div className="bg-white rounded-lg p-4 shadow-sm">
                              <div className="flex items-center gap-2 mb-2">
                                <Users size={18} className="text-purple-500" />
                                <p className="text-xs text-gray-600">Buyers</p>
                              </div>
                              <p className="text-2xl font-bold text-gray-900">{event.ticketsData.length}</p>
                            </div>

                            <div className="bg-white rounded-lg p-4 shadow-sm">
                              <div className="flex items-center gap-2 mb-2">
                                <TrendingUp size={18} className="text-green-500" />
                                <p className="text-xs text-gray-600">Service Fees</p>
                              </div>
                              <p className="text-2xl font-bold text-gray-900">₦{event.serviceFees.toLocaleString()}</p>
                            </div>
                          </div>

                          {/* Revenue Breakdown */}
                          <div className="bg-white rounded-lg p-4 shadow-sm mb-4">
                            <h4 className="font-semibold text-gray-900 mb-3">Revenue Breakdown</h4>
                            <div className="space-y-2">
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Organizer Revenue (Ticket Sales)</span>
                                <span className="font-semibold text-gray-900">₦{event.organizerRevenue.toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-600">OutingStation Service Fees</span>
                                <span className="font-semibold text-green-600">₦{event.serviceFees.toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Paystack Fees</span>
                                <span className="font-semibold text-gray-900">₦{event.paystackFees.toLocaleString()}</span>
                              </div>
                              <div className="pt-2 border-t border-gray-200 flex justify-between">
                                <span className="font-semibold text-gray-900">Total Revenue</span>
                                <span className="font-bold text-gray-900">₦{event.totalRevenue.toLocaleString()}</span>
                              </div>
                            </div>
                          </div>

                          {/* Manage Link */}
                          <div className="bg-white rounded-lg p-4 shadow-sm mb-4">
                            <h4 className="font-semibold text-gray-900 mb-3">Event Management Link</h4>
                            <div className="flex items-center gap-2 flex-wrap">
                              <input
                                type="text"
                                value={`${window.location.origin}/manage/${event.manageKey}`}
                                readOnly
                                className="flex-1 min-w-[200px] px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm font-mono text-gray-700"
                              />
                              <button
                                onClick={() => copyManageLink(event.manageKey)}
                                className="px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition flex items-center gap-2"
                              >
                                <Copy size={16} />
                                Copy
                              </button>
                              <a
                                href={`/manage/${event.manageKey}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition flex items-center gap-2"
                              >
                                <ExternalLink size={16} />
                                Open
                              </a>
                              <button
                                onClick={() => regenerateManageKey(event.id)}
                                className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition flex items-center gap-2"
                              >
                                <RefreshCw size={16} />
                                Regenerate
                              </button>
                            </div>
                            <p className="text-xs text-gray-500 mt-2">
                              ⚠️ Share this link with event organizers. They can check-in attendees without logging in.
                            </p>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-3 flex-wrap">
                            <button
                              onClick={() => exportEventCSV(event)}
                              className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition"
                            >
                              <Download size={18} />
                              Export Full Report
                            </button>
                            <Link
                              to={`/admin/events/edit/${event.id}`}
                              className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
                            >
                              Edit Event
                            </Link>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}