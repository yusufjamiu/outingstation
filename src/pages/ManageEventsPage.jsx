import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { Calendar, Ticket, ExternalLink } from 'lucide-react';

export default function ManageEventsPage() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) { navigate('/login'); return; }
    loadEvents();
  }, [currentUser]);

  const loadEvents = async () => {
    setLoading(true);
    try {
      // Primary match: events created while logged into this account.
      const byOwnerSnap = await getDocs(query(
        collection(db, 'events'),
        where('createdBy', '==', currentUser.uid),
        where('ticketingOption', '==', 'outingstation')
      ));
      const byOwner = byOwnerSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      // ✅ Fallback: events submitted while logged OUT (createdBy stayed as the
      // 'admin_approved' placeholder), matched instead by the organizer email
      // used on the submission. Read-only — no claiming/writing needed here.
      let byEmail = [];
      if (currentUser.email) {
        const byEmailSnap = await getDocs(query(
          collection(db, 'events'),
          where('organizerEmail', '==', currentUser.email),
          where('ticketingOption', '==', 'outingstation')
        ));
        byEmail = byEmailSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      }

      // Merge and dedupe by id
      const merged = [...byOwner];
      byEmail.forEach(e => { if (!merged.some(m => m.id === e.id)) merged.push(e); });

      setEvents(merged);
    } catch (err) {
      console.error('Error loading events:', err);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 py-10">
        <div className="mb-6">
          <p className="text-xs text-cyan-600 font-bold uppercase tracking-wider">Business</p>
          <h1 className="text-2xl font-black text-gray-900">Manage Events</h1>
          <p className="text-sm text-gray-500 mt-1">Your ticketed events, ticket sales, and vendor stands — all in one place.</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-cyan-500" />
          </div>
        ) : events.length === 0 ? (
          <div className="bg-white rounded-3xl border-2 border-gray-100 p-8 text-center">
            <div className="w-16 h-16 bg-cyan-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Calendar size={28} className="text-cyan-500" />
            </div>
            <h2 className="text-lg font-black text-gray-900 mb-2">No ticketed events yet</h2>
            <p className="text-sm text-gray-500 mb-1">
              Only events created with OutingStation Ticketing while logged into this account show up here.
            </p>
            <p className="text-xs text-gray-400">
              Create one from the admin panel, or via <button onClick={() => navigate('/create')} className="text-cyan-600 underline">List on OutingStation</button>.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {events.map(ev => (
              <button
                key={ev.id}
                onClick={() => navigate(`/manage/${ev.manageKey}`)}
                className="w-full text-left bg-white border-2 border-gray-100 rounded-2xl p-5 hover:border-cyan-300 transition flex items-center justify-between gap-4"
              >
                <div>
                  <p className="font-bold text-gray-900">{ev.title}</p>
                  <p className="text-xs text-gray-500 flex items-center gap-1.5 mt-1">
                    <Ticket size={12} /> {ev.ticketsSold || 0} sold {ev.ticketsAvailable ? `of ${ev.ticketsAvailable}` : ''}
                  </p>
                </div>
                <ExternalLink size={16} className="text-gray-300 flex-shrink-0" />
              </button>
            ))}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}