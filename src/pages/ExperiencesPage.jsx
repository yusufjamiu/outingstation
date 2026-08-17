// ExperiencesPage.jsx — public browse page for Experiences.
// Route: /experiences
//
// Reads straight from the top-level `experiences` collection (only
// approved, published experiences live there — pending submissions sit
// in `experience_submissions` and never show here, same separation
// events already have). No login required to browse. Tapping a card
// goes to /event/{id}, which EventDetails.jsx already resolves via its
// fourth fallback (events → businesses → shortlets → experiences).
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { Search, MapPin, Sparkles } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import SEO from '../components/SEO';

const CATEGORIES = ['All', 'Outdoor', 'Indoor', 'Food', 'Arts', 'Wellness', 'Adventure'];

const CITIES = [
  'All Cities',
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue',
  'Borno', 'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu',
  'FCT (Abuja)', 'Gombe', 'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina',
  'Kebbi', 'Kogi', 'Kwara', 'Lagos', 'Nasarawa', 'Niger', 'Ogun', 'Ondo',
  'Osun', 'Oyo', 'Plateau', 'Rivers', 'Sokoto', 'Taraba', 'Yobe', 'Zamfara',
];

const upcomingSessionCount = (exp) => {
  const sessions = exp.sessions || [];
  const today = new Date(new Date().toDateString());
  return sessions.filter(s => !s.date || new Date(s.date) >= today).length;
};

function ExperienceCard({ exp }) {
  const images = exp.images || [];
  const imageUrl = exp.imageUrl || images[0] || 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=600&q=80';
  const upcoming = upcomingSessionCount(exp);

  return (
    <Link
      to={`/event/${exp.id}`}
      className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-200 group border border-gray-100"
    >
      <div className="relative h-48 overflow-hidden">
        <img
          src={imageUrl}
          alt={exp.title}
          className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
          onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=600&q=80'; }}
        />
        <span className="absolute top-3 left-3 bg-purple-500 text-white text-xs px-3 py-1 rounded-full font-semibold flex items-center gap-1">
          <Sparkles size={11} /> {exp.category || 'Experience'}
        </span>
      </div>
      <div className="p-4">
        <h3 className="font-bold text-gray-900 mb-1 line-clamp-1 group-hover:text-purple-600 transition">{exp.title}</h3>
        <p className="text-sm text-gray-500 flex items-center gap-1 mb-2">
          <MapPin size={13} /> {exp.city || 'Nigeria'}
        </p>
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-purple-600">
            ₦{Number(exp.pricePerPerson || 0).toLocaleString()}<span className="text-gray-400 font-normal">/person</span>
          </span>
          {upcoming > 0 ? (
            <span className="text-xs bg-purple-50 text-purple-600 px-2 py-1 rounded-full font-semibold">
              {upcoming} session{upcoming !== 1 ? 's' : ''}
            </span>
          ) : (
            <span className="text-xs bg-gray-50 text-gray-400 px-2 py-1 rounded-full font-semibold">No sessions</span>
          )}
        </div>
      </div>
    </Link>
  );
}

export default function ExperiencesPage() {
  const [loading, setLoading] = useState(true);
  const [experiences, setExperiences] = useState([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [city, setCity] = useState('All Cities');

  useEffect(() => {
    (async () => {
      try {
        const snap = await getDocs(collection(db, 'experiences'));
        setExperiences(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error('Error loading experiences:', err);
      }
      setLoading(false);
    })();
  }, []);

  const filtered = experiences.filter(exp => {
    const matchesSearch = !search ||
      exp.title?.toLowerCase().includes(search.toLowerCase()) ||
      exp.city?.toLowerCase().includes(search.toLowerCase()) ||
      exp.description?.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = category === 'All' || exp.category === category;
    const matchesCity = city === 'All Cities' || exp.city === city;
    return matchesSearch && matchesCategory && matchesCity;
  });

  return (
    <>
      <SEO
        title="Experiences - OutingStation"
        description="Discover bookable experiences — paint & sip, cooking classes, hikes, workshops and more. Pick a session and book instantly."
        keywords="experiences Nigeria, paint and sip, cooking class, workshops, activities to book"
      />
      <div className="min-h-screen bg-gray-50">
        <Navbar />

        <div className="bg-gradient-to-r from-purple-600 to-pink-600 py-14 px-4">
          <div className="max-w-5xl mx-auto text-center">
            <h1 className="text-3xl sm:text-4xl font-black text-white mb-2 flex items-center justify-center gap-2">
              <Sparkles size={32} /> Experiences
            </h1>
            <p className="text-purple-100 text-sm sm:text-base">Bookable activities — pick a session, pay, and go</p>
          </div>
        </div>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Search + filters */}
          <div className="bg-white rounded-2xl shadow-sm p-4 mb-6 -mt-10 relative z-10 border border-gray-100">
            <div className="relative mb-3">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search experiences..."
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100"
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:border-purple-400"
              >
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <select
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:border-purple-400"
              >
                {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-500" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-16 h-16 bg-purple-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Sparkles size={28} className="text-purple-300" />
              </div>
              <h3 className="font-bold text-gray-800 mb-1">
                {experiences.length === 0 ? 'No experiences yet' : 'No matches found'}
              </h3>
              <p className="text-sm text-gray-400">
                {experiences.length === 0 ? "Check back soon — we're adding more experiences." : 'Try a different search or filter.'}
              </p>
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-500 mb-4">
                {filtered.length} experience{filtered.length !== 1 ? 's' : ''} found
                {city !== 'All Cities' ? ` in ${city}` : ''}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {filtered.map(exp => <ExperienceCard key={exp.id} exp={exp} />)}
              </div>
            </>
          )}
        </main>

        <Footer />
      </div>
    </>
  );
}