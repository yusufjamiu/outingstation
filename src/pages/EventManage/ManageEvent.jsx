import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { 
  Calendar, Clock, MapPin, Users, Download, CheckCircle, XCircle,
  Ticket, Mail, Phone, Search, Filter, AlertCircle
} from 'lucide-react';
import { collection, query, where, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import { formatEventDateFull, formatEventTime } from '../../utils/dateTimeHelpers';

export default function ManageEvent() {
  const { manageKey } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // all, checked-in, not-checked-in
  const [stats, setStats] = useState({
    totalSold: 0,
    totalCheckedIn: 0,
    totalRevenue: 0
  });

  useEffect(() => {
    loadEventAndTickets();
  }, [manageKey]);

  const loadEventAndTickets = async () => {
    try {
      setLoading(true);

      // Find event by manageKey
      const eventsRef = collection(db, 'events');
      const q = query(eventsRef, where('manageKey', '==', manageKey));
      const eventsSnapshot = await getDocs(q);

      if (eventsSnapshot.empty) {
        toast.error('Invalid or expired management link');
        navigate('/');
        return;
      }

      const eventDoc = eventsSnapshot.docs[0];
      const eventData = { id: eventDoc.id, ...eventDoc.data() };
      setEvent(eventData);

      // Load tickets for this event
      const ticketsRef = collection(db, 'tickets');
      const ticketsQuery = query(ticketsRef, where('eventId', '==', eventDoc.id));
      const ticketsSnapshot = await getDocs(ticketsQuery);

      const ticketsData = ticketsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setTickets(ticketsData);

      // Calculate stats
      const totalSold = ticketsData.reduce((sum, ticket) => sum + (ticket.quantity || 1), 0);
      const totalCheckedIn = ticketsData.filter(t => t.checkedIn).reduce((sum, ticket) => sum + (ticket.quantity || 1), 0);
      const totalRevenue = ticketsData.reduce((sum, ticket) => sum + (ticket.totalPaid || 0), 0);

      setStats({ totalSold, totalCheckedIn, totalRevenue });

    } catch (err) {
      console.error('Error loading event:', err);
      toast.error('Failed to load event data');
    }
    setLoading(false);
  };

  const handleCheckIn = async (ticketId, currentStatus) => {
    try {
      const ticketRef = doc(db, 'tickets', ticketId);
      await updateDoc(ticketRef, {
        checkedIn: !currentStatus
      });

      // Update local state
      setTickets(prev => prev.map(ticket => 
        ticket.id === ticketId 
          ? { ...ticket, checkedIn: !currentStatus }
          : ticket
      ));

      // Update stats
      setStats(prev => ({
        ...prev,
        totalCheckedIn: currentStatus 
          ? prev.totalCheckedIn - 1 
          : prev.totalCheckedIn + 1
      }));

      toast.success(currentStatus ? 'Checked out' : '✅ Checked in!');
    } catch (err) {
      console.error('Error updating check-in:', err);
      toast.error('Failed to update check-in status');
    }
  };

  const exportToCSV = () => {
    const headers = ['Ticket ID', 'Buyer Name', 'Email', 'Quantity', 'Total Paid', 'Purchase Date', 'Checked In'];
    const rows = filteredTickets.map(ticket => [
      ticket.ticketId,
      ticket.buyerName,
      ticket.buyerEmail,
      ticket.quantity || 1,
      `₦${ticket.totalPaid?.toLocaleString()}`,
      new Date(ticket.purchasedAt?.seconds * 1000).toLocaleDateString(),
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
    a.download = `${event.title}-attendees-${Date.now()}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast.success('✅ Attendee list exported!');
  };

  // Filter tickets
  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = 
      ticket.buyerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.buyerEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.ticketId?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFilter = 
      filterStatus === 'all' ||
      (filterStatus === 'checked-in' && ticket.checkedIn) ||
      (filterStatus === 'not-checked-in' && !ticket.checkedIn);

    return matchesSearch && matchesFilter;
  });

  if (loading) {
    return (
      <>
        <div className="min-h-screen bg-gray-50">
          <Navbar />
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
          </div>
          <Footer />
        </div>
      </>
    );
  }

  if (!event) {
    return (
      <>
        <div className="min-h-screen bg-gray-50">
          <Navbar />
          <div className="max-w-4xl mx-auto px-4 py-20 text-center">
            <AlertCircle size={64} className="mx-auto text-red-500 mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Invalid Management Link</h1>
            <p className="text-gray-600 mb-6">This link is invalid or has expired.</p>
            <button 
              onClick={() => navigate('/')}
              className="px-6 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600"
            >
              Go Home
            </button>
          </div>
          <Footer />
        </div>
      </>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gray-50">
        <Navbar />

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Event Header */}
          <div className="bg-white rounded-xl p-6 shadow-sm mb-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">{event.title}</h1>
                <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <Calendar size={16} />
                    <span>{formatEventDateFull(event)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock size={16} />
                    <span>{formatEventTime(event)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin size={16} />
                    <span>{event.location}</span>
                  </div>
                </div>
              </div>
              <button
                onClick={exportToCSV}
                className="flex items-center gap-2 px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition"
              >
                <Download size={20} />
                Export CSV
              </button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <Ticket className="text-cyan-500" size={24} />
                <p className="text-sm text-gray-600">Total Sold</p>
              </div>
              <p className="text-3xl font-bold text-gray-900">{stats.totalSold}</p>
              <p className="text-xs text-gray-500 mt-1">
                out of {event.ticketsAvailable} available
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <CheckCircle className="text-green-500" size={24} />
                <p className="text-sm text-gray-600">Checked In</p>
              </div>
              <p className="text-3xl font-bold text-gray-900">{stats.totalCheckedIn}</p>
              <p className="text-xs text-gray-500 mt-1">
                {stats.totalSold > 0 ? Math.round((stats.totalCheckedIn / stats.totalSold) * 100) : 0}% attendance
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <Users className="text-purple-500" size={24} />
                <p className="text-sm text-gray-600">Attendees</p>
              </div>
              <p className="text-3xl font-bold text-gray-900">{tickets.length}</p>
              <p className="text-xs text-gray-500 mt-1">
                unique buyers
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">💰</span>
                <p className="text-sm text-gray-600">Revenue</p>
              </div>
              <p className="text-3xl font-bold text-gray-900">₦{stats.totalRevenue.toLocaleString()}</p>
              <p className="text-xs text-gray-500 mt-1">
                total collected
              </p>
            </div>
          </div>

          {/* Search and Filter */}
          <div className="bg-white rounded-xl p-6 shadow-sm mb-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Search by name, email, or ticket ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-transparent"
                />
              </div>
              <div className="flex items-center gap-2">
                <Filter size={20} className="text-gray-400" />
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-transparent"
                >
                  <option value="all">All Tickets</option>
                  <option value="checked-in">Checked In</option>
                  <option value="not-checked-in">Not Checked In</option>
                </select>
              </div>
            </div>
          </div>

          {/* Tickets List */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ticket ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Buyer Info
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Quantity
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Purchase Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredTickets.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                        {searchTerm || filterStatus !== 'all' 
                          ? 'No tickets match your search' 
                          : 'No tickets sold yet'}
                      </td>
                    </tr>
                  ) : (
                    filteredTickets.map((ticket) => (
                      <tr key={ticket.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-mono font-semibold text-cyan-600">
                            {ticket.ticketId}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div>
                            <p className="text-sm font-medium text-gray-900">{ticket.buyerName}</p>
                            <div className="flex items-center gap-1 text-xs text-gray-500">
                              <Mail size={12} />
                              <span>{ticket.buyerEmail}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-semibold text-gray-900">
                            {ticket.quantity || 1}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-semibold text-gray-900">
                            ₦{ticket.totalPaid?.toLocaleString()}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {ticket.purchasedAt?.seconds 
                            ? new Date(ticket.purchasedAt.seconds * 1000).toLocaleDateString()
                            : 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {ticket.checkedIn ? (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                              <CheckCircle size={14} />
                              Checked In
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800">
                              <XCircle size={14} />
                              Not Checked In
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => handleCheckIn(ticket.id, ticket.checkedIn)}
                            className={`px-4 py-2 rounded-lg font-medium text-sm transition ${
                              ticket.checkedIn
                                ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                : 'bg-cyan-500 text-white hover:bg-cyan-600'
                            }`}
                          >
                            {ticket.checkedIn ? 'Undo' : 'Check In'}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Footer Info */}
          <div className="mt-6 bg-blue-50 rounded-xl p-4 border border-blue-200">
            <p className="text-sm text-blue-800">
              💡 <strong>Tip:</strong> Use the search bar to quickly find attendees at the door. 
              Click "Check In" to mark their arrival. Export the full list anytime!
            </p>
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
}