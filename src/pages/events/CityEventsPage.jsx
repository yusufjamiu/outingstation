import { useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../firebase';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import EventCard from '../../components/EventCard';

export default function CityEventsPage() {
  const { city } = useParams();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCityEvents();
  }, [city]);

  const loadCityEvents = async () => {
    try {
      // Get ALL published events first
      const eventsRef = collection(db, 'events');
      const q = query(eventsRef, where('status', '==', 'published'));
      
      const snapshot = await getDocs(q);
      const allEvents = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Filter by city in JavaScript (case-insensitive, partial match)
      const cityLower = city.toLowerCase();
      const filtered = allEvents.filter(event => 
        event.location?.toLowerCase().includes(cityLower)
      );
      
      setEvents(filtered);
    } catch (err) {
      console.error('Error loading city events:', err);
    }
    setLoading(false);
  };

  const cityName = city.charAt(0).toUpperCase() + city.slice(1);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">
            Events in {cityName}
          </h1>
          <p className="text-gray-600">
            Discover amazing events happening in {cityName}
          </p>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="text-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading events...</p>
          </div>
        ) : events.length === 0 ? (
          /* Empty State */
          <div className="text-center py-20">
            <div className="text-gray-400 mb-4">
              <svg className="w-24 h-24 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No events found in {cityName}
            </h3>
            <p className="text-gray-600 mb-6">
              Check back later for new events in this city
            </p>
          </div>
        ) : (
          /* Events Grid */
          <>
            <div className="mb-6">
              <p className="text-gray-600">
                Found {events.length} event{events.length !== 1 ? 's' : ''} in {cityName}
              </p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {events.map(event => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          </>
        )}
      </div>
      
      <Footer />
    </div>
  );
}