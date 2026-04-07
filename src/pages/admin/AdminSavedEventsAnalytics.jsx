import { useState, useEffect } from 'react';
import { Search, Users, Calendar, TrendingUp, Eye, Download, RefreshCw, Menu, Mail, ChevronDown, ChevronUp, Phone } from 'lucide-react';
import { AdminSidebar } from '../../components/AdminSidebar';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';

export default function AdminSavedEventsAnalytics() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [allSavedEvents, setAllSavedEvents] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterBy, setFilterBy] = useState('upcoming'); // upcoming, archived, all
  const [loading, setLoading] = useState(true);
  const [expandedEvent, setExpandedEvent] = useState(null);

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
                userPhone: user.phone || 'N/A',
                eventId: event.id,
                eventTitle: event.title,
                eventImage: event.imageUrl,
                eventCategory: event.category,
                eventDate: event.date || event.startDate,
                eventLocation: event.location,
                savedAt: user.createdAt || new Date()
              });
            }
          });
        }
      });

      setAllSavedEvents(savedEventsData);
      console.log('📊 Loaded', savedEventsData.length, 'saved events from Firestore');
    } catch (err) {
      console.error('Error loading saved events:', err);
      toast.error('Failed to load saved events');
    }
    setLoading(false);
  };

  // Check if event is archived (1 day after event date)
  const isEventArchived = (eventDate) => {
    if (!eventDate) return false;
    
    const date = eventDate.seconds ? new Date(eventDate.seconds * 1000) : new Date(eventDate);
    const oneDayAfter = new Date(date);
    oneDayAfter.setDate(oneDayAfter.getDate() + 1);
    
    return new Date() > oneDayAfter;
  };

  // Get event statistics with phone numbers
  const getEventStats = () => {
    const eventSaveCount = {};
    
    allSavedEvents.forEach(saved => {
      const eventId = saved.eventId;
      if (!eventSaveCount[eventId]) {
        eventSaveCount[eventId] = {
          eventId,
          eventTitle: saved.eventTitle,
          eventImage: saved.eventImage,
          eventDate: saved.eventDate,
          eventLocation: saved.eventLocation,
          eventCategory: saved.eventCategory,
          count: 0,
          users: [],
          isArchived: isEventArchived(saved.eventDate)
        };
      }
      eventSaveCount[eventId].count++;
      eventSaveCount[eventId].users.push({
        userId: saved.userId,
        userName: saved.userName,
        userEmail: saved.userEmail,
        userPhone: saved.userPhone
      });
    });

    // Sort by event date (closest first)
    return Object.values(eventSaveCount).sort((a, b) => {
      const dateA = a.eventDate?.seconds ? new Date(a.eventDate.seconds * 1000) : new Date(a.eventDate || 0);
      const dateB = b.eventDate?.seconds ? new Date(b.eventDate.seconds * 1000) : new Date(b.eventDate || 0);
      return dateA - dateB; // Ascending (closest first)
    });
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
  const totalStats = getTotalStats();

  // Filter events by status
  const getFilteredEvents = () => {
    if (filterBy === 'upcoming') {
      return eventStats.filter(e => !e.isArchived);
    } else if (filterBy === 'archived') {
      return eventStats.filter(e => e.isArchived);
    }
    return eventStats;
  };

  // Filter by search term
  const filteredEventStats = getFilteredEvents().filter(event =>
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
      year: 'numeric'
    });
  };

  // Send email reminder to all users who saved this event
  const sendEmailReminder = async (event) => {
    if (!confirm(`Send email reminder to ${event.users.length} users who saved "${event.eventTitle}"?`)) {
      return;
    }

    try {
      const loadingToast = toast.loading(`📧 Sending emails to ${event.users.length} users...`);

      const response = await fetch('/api/send-bulk-reminder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: event.eventId,
          eventTitle: event.eventTitle,
          eventDate: formatDate(event.eventDate),
          eventLocation: event.eventLocation,
          users: event.users
        })
      });

      const result = await response.json();
      toast.dismiss(loadingToast);

      if (result.success) {
        toast.success(`✅ Emails sent to ${result.sent} users!`, { duration: 5000 });
        if (result.failed > 0) {
          toast(`⚠️ ${result.failed} emails failed`, { icon: '⚠️' });
        }
      } else {
        toast.error('Failed to send emails');
      }
    } catch (err) {
      console.error('Error sending emails:', err);
      toast.error('Failed to send email reminders');
    }
  };

  // Export event users to CSV
  const exportEventToCSV = (event) => {
    const headers = ['Name', 'Email', 'Phone'];
    const rows = event.users.map(user => [
      user.userName,
      user.userEmail,
      user.userPhone
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${event.eventTitle}-saved-users-${Date.now()}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast.success('✅ CSV exported!');
  };

  // Export event users to Excel
  const exportEventToExcel = (event) => {
    const data = event.users.map(user => ({
      'Name': user.userName,
      'Email': user.userEmail,
      'Phone': user.userPhone
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Users');

    XLSX.writeFile(workbook, `${event.eventTitle}-saved-users-${Date.now()}.xlsx`);
    toast.success('✅ Excel exported!');
  };

  // Export all to CSV
  const exportAllToCSV = () => {
    const headers = ['Event Title', 'Event ID', 'User Name', 'User Email', 'User Phone', 'Category', 'Event Date'];
    const rows = allSavedEvents.map(saved => [
      `"${saved.eventTitle}"`,
      saved.eventId,
      saved.userName,
      saved.userEmail,
      saved.userPhone,
      saved.eventCategory || 'N/A',
      formatDate(saved.eventDate)
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `all-saved-events-${Date.now()}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast.success('✅ All data exported to CSV!');
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
              <p className="text-gray-600 text-sm mt-1">Monitor user engagement and send reminders</p>
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
                    <button onClick={() => setFilterBy('upcoming')}
                      className={`px-4 py-2 rounded-lg font-medium transition ${
                        filterBy === 'upcoming' ? 'bg-cyan-400 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}>
                      📅 Upcoming ({eventStats.filter(e => !e.isArchived).length})
                    </button>
                    <button onClick={() => setFilterBy('archived')}
                      className={`px-4 py-2 rounded-lg font-medium transition ${
                        filterBy === 'archived' ? 'bg-cyan-400 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}>
                      📦 Archived ({eventStats.filter(e => e.isArchived).length})
                    </button>
                    <button onClick={() => setFilterBy('all')}
                      className={`px-4 py-2 rounded-lg font-medium transition ${
                        filterBy === 'all' ? 'bg-cyan-400 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}>
                      📊 All ({eventStats.length})
                    </button>
                  </div>

                  <div className="flex gap-4 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                      <input type="text" placeholder="Search events..." value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-transparent outline-none" />
                    </div>
                    <button onClick={exportAllToCSV} disabled={allSavedEvents.length === 0}
                      className="flex items-center gap-2 px-4 py-2 bg-cyan-400 text-white rounded-lg hover:bg-cyan-500 transition disabled:opacity-50">
                      <Download size={20} />
                      <span className="hidden sm:inline">Export All</span>
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

              {/* Events List */}
              {filteredEventStats.length > 0 && (
                <div className="space-y-4">
                  {filteredEventStats.map((event) => (
                    <div key={event.eventId} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                      {/* Event Header */}
                      <div className="p-6 flex items-center justify-between hover:bg-gray-50 cursor-pointer"
                        onClick={() => setExpandedEvent(expandedEvent === event.eventId ? null : event.eventId)}>
                        <div className="flex items-center gap-4 flex-1">
                          {event.eventImage && (
                            <img src={event.eventImage} alt={event.eventTitle}
                              className="w-20 h-20 rounded-lg object-cover"
                              onError={e => e.target.style.display='none'} />
                          )}
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="text-lg font-bold text-gray-900">{event.eventTitle}</h3>
                              {event.isArchived && (
                                <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs font-medium">
                                  ARCHIVED
                                </span>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                              <span>📅 {formatDate(event.eventDate)}</span>
                              <span>📍 {event.eventLocation}</span>
                              <span className="px-2 py-0.5 bg-cyan-100 text-cyan-700 rounded text-xs font-semibold">
                                {event.count} {event.count === 1 ? 'save' : 'saves'}
                              </span>
                            </div>
                          </div>
                        </div>
                        <button className="p-2">
                          {expandedEvent === event.eventId ? (
                            <ChevronUp size={20} className="text-gray-600" />
                          ) : (
                            <ChevronDown size={20} className="text-gray-600" />
                          )}
                        </button>
                      </div>

                      {/* Expanded Content */}
                      {expandedEvent === event.eventId && (
                        <div className="border-t border-gray-200 p-6 bg-gray-50">
                          {/* Actions */}
                          <div className="flex flex-wrap gap-3 mb-6">
                            <button
                              onClick={() => sendEmailReminder(event)}
                              className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
                            >
                              <Mail size={18} />
                              Send Email Reminder
                            </button>
                            <button
                              onClick={() => exportEventToCSV(event)}
                              className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition"
                            >
                              <Download size={18} />
                              Export CSV
                            </button>
                            <button
                              onClick={() => exportEventToExcel(event)}
                              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                            >
                              <Download size={18} />
                              Export Excel
                            </button>
                          </div>

                          {/* Users Table */}
                          <div className="bg-white rounded-lg overflow-hidden">
                            <div className="p-4 border-b border-gray-200">
                              <h4 className="font-semibold text-gray-900">Users who saved this event ({event.users.length})</h4>
                            </div>
                            <div className="overflow-x-auto">
                              <table className="w-full">
                                <thead className="bg-gray-50">
                                  <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                  {event.users.map((user, index) => (
                                    <tr key={index} className="hover:bg-gray-50">
                                      <td className="px-6 py-4 text-sm text-gray-900">{index + 1}</td>
                                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{user.userName}</td>
                                      <td className="px-6 py-4 text-sm text-gray-600">{user.userEmail}</td>
                                      <td className="px-6 py-4 text-sm text-gray-600">{user.userPhone}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {filteredEventStats.length === 0 && allSavedEvents.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm p-12 text-center">
                  <p className="text-gray-600">No events match your search</p>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}