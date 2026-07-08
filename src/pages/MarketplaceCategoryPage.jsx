import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { Search, MapPin, ArrowLeft } from 'lucide-react';
import { MARKETPLACE_SECTIONS } from './MarketplacePage';

const CITIES = ['Lagos', 'Abuja', 'Ibadan', 'Ilorin', 'Port Harcourt', 'Kano', 'Enugu', 'Others'];

function BusinessCard({ biz }) {
  const packages = biz.pricingTiers?.length ? biz.pricingTiers : (biz.hourlyPackages || []).map(p => ({ name: `${p.hours} hrs`, price: p.price, image: null }));
  const minPrice = packages.length ? Math.min(...packages.map(p => p.price || 0)) : 0;
  const heroImage = packages.find(p => p.image)?.image || biz.logoUrl;
  const whatsapp = (biz.whatsappNumber || '').replace(/[^0-9]/g, '');

  return (
    <div className="bg-white rounded-2xl border-2 border-gray-100 overflow-hidden hover:shadow-lg transition">
      <div className="h-36 bg-cyan-50 flex items-center justify-center overflow-hidden">
        {heroImage ? (
          <img src={heroImage} alt={biz.businessName} className="w-full h-full object-cover" />
        ) : (
          <span className="text-4xl">🏪</span>
        )}
      </div>
      <div className="p-4">
        <p className="font-bold text-gray-900 mb-0.5">{biz.businessName}</p>
        {biz.city && (
          <p className="text-xs text-gray-400 flex items-center gap-1 mb-2"><MapPin size={11} /> {biz.city}</p>
        )}
        {biz.description && <p className="text-xs text-gray-500 line-clamp-2 mb-3">{biz.description}</p>}
        <p className="text-sm font-black text-cyan-600 mb-3">
          {minPrice > 0 ? `from ₦${minPrice.toLocaleString()}` : 'Contact for pricing'}
        </p>
        <div className="flex gap-2">
          {whatsapp && (
            <a
              href={`https://wa.me/${whatsapp}`}
              target="_blank" rel="noreferrer"
              className="flex-1 text-center text-xs font-bold text-white bg-emerald-500 px-3 py-2 rounded-lg hover:bg-emerald-600 transition"
            >
              WhatsApp
            </a>
          )}
          <a
            href="/plan-event"
            className="flex-1 text-center text-xs font-bold text-white bg-gray-900 px-3 py-2 rounded-lg hover:bg-gray-800 transition"
          >
            Request via Plan Event
          </a>
        </div>
      </div>
    </div>
  );
}

export default function MarketplaceCategoryPage() {
  const { slug } = useParams();
  const section = MARKETPLACE_SECTIONS.find(s => s.slug === slug);

  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [city, setCity] = useState('');
  const [customCity, setCustomCity] = useState('');

  useEffect(() => {
    if (section) loadBusinesses(section.type);
  }, [slug]);

  const loadBusinesses = async (type) => {
    setLoading(true);
    try {
      const snap = await getDocs(
        query(collection(db, 'businesses'), where('businessType', '==', type), where('status', '==', 'approved'))
      );
      setBusinesses(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error('Error loading category businesses:', err);
    }
    setLoading(false);
  };

  if (!section) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-3xl mx-auto px-4 py-20 text-center">
          <p className="text-gray-500 mb-4">Category not found.</p>
          <Link to="/marketplace" className="text-cyan-600 font-semibold underline">Back to Marketplace</Link>
        </div>
        <Footer />
      </div>
    );
  }

  const effectiveCity = city === 'Others' ? customCity.trim() : city;

  const filtered = businesses.filter(b => {
    if (effectiveCity && !(b.city || '').toLowerCase().includes(effectiveCity.toLowerCase())) return false;
    if (search && !b.businessName?.toLowerCase().includes(search.toLowerCase()) && !b.description?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-10">
        <Link to="/marketplace" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-4 transition">
          <ArrowLeft size={16} /> Back to Marketplace
        </Link>

        <div className="mb-6">
          <p className="text-xs text-cyan-600 font-bold uppercase tracking-wider">Marketplace</p>
          <h1 className="text-2xl md:text-3xl font-black text-gray-900">{section.label}</h1>
        </div>

        <div className="bg-white rounded-2xl border-2 border-gray-100 p-4 mb-8">
          <div className="flex items-center gap-2 mb-3">
            <Search size={16} className="text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name or description..."
              className="flex-1 text-sm outline-none"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => { setCity(''); setCustomCity(''); }}
              className={`text-xs font-bold px-3 py-1.5 rounded-full border-2 transition ${!city ? 'border-cyan-500 bg-cyan-50 text-cyan-700' : 'border-gray-200 text-gray-500'}`}
            >
              All Cities
            </button>
            {CITIES.map(c => (
              <button
                key={c}
                onClick={() => setCity(c)}
                className={`text-xs font-bold px-3 py-1.5 rounded-full border-2 transition ${city === c ? 'border-cyan-500 bg-cyan-50 text-cyan-700' : 'border-gray-200 text-gray-500'}`}
              >
                {c}
              </button>
            ))}
          </div>
          {city === 'Others' && (
            <input
              type="text"
              value={customCity}
              onChange={e => setCustomCity(e.target.value)}
              placeholder="Type your city..."
              className="mt-3 w-full sm:w-64 text-sm px-3 py-2 border-2 border-cyan-200 rounded-xl outline-none focus:border-cyan-500"
            />
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-cyan-500" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border-2 border-gray-100 p-12 text-center">
            <p className="text-gray-400">No {section.label.toLowerCase()} match your filters yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {filtered.map(biz => <BusinessCard key={biz.id} biz={biz} />)}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}