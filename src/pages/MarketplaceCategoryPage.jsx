import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { Search, MapPin, ArrowLeft, BadgeCheck, X } from 'lucide-react';
import { MARKETPLACE_SECTIONS } from './MarketplacePage';

const CITIES = ['Lagos', 'Abuja', 'Ibadan', 'Ilorin', 'Port Harcourt', 'Kano', 'Enugu', 'Others'];

// ✅ same tick logic as mobile: gold if both approved, blue if only
// Gov ID, green if only CAC, nothing for Basic (no tick at all)
function VerificationTick({ biz, size = 14 }) {
  const govApproved = biz.govIdStatus === 'approved';
  const cacApproved = biz.cacStatus === 'approved';
  if (govApproved && cacApproved) return <BadgeCheck size={size} className="text-amber-500 flex-shrink-0" />;
  if (cacApproved) return <BadgeCheck size={size} className="text-emerald-500 flex-shrink-0" />;
  if (govApproved) return <BadgeCheck size={size} className="text-blue-500 flex-shrink-0" />;
  return null;
}

function getPackages(biz) {
  return biz.pricingTiers?.length
    ? biz.pricingTiers
    : (biz.hourlyPackages || []).map(p => ({ name: `${p.hours} hrs`, price: p.price, image: null, description: p.description }));
}

// ✅ FIXED — was showing a package's photo instead of the shop's own logo.
// Priority reversed: shop's actual logo comes first now, package image
// only as a fallback when there's no logo at all.
function BusinessCard({ biz, onOpen }) {
  const packages = getPackages(biz);
  const minPrice = packages.length ? Math.min(...packages.map(p => p.price || 0)) : 0;
  const heroImage = biz.logoUrl || packages.find(p => p.image)?.image;
  const whatsapp = (biz.whatsappNumber || '').replace(/[^0-9]/g, '');

  return (
    <div
      onClick={() => onOpen(biz)}
      className="bg-white rounded-2xl border-2 border-gray-100 overflow-hidden hover:shadow-lg transition cursor-pointer"
    >
      <div className="h-36 bg-cyan-50 flex items-center justify-center overflow-hidden">
        {heroImage ? (
          <img src={heroImage} alt={biz.businessName} className="w-full h-full object-cover" />
        ) : (
          <span className="text-4xl">🏪</span>
        )}
      </div>
      <div className="p-4">
        <p className="font-bold text-gray-900 mb-0.5 flex items-center gap-1">
          {biz.businessName} <VerificationTick biz={biz} />
        </p>
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
              onClick={e => e.stopPropagation()}
              className="flex-1 text-center text-xs font-bold text-white bg-emerald-500 px-3 py-2 rounded-lg hover:bg-emerald-600 transition"
            >
              WhatsApp
            </a>
          )}
          <a
            href="/plan-event"
            onClick={e => e.stopPropagation()}
            className="flex-1 text-center text-xs font-bold text-white bg-gray-900 px-3 py-2 rounded-lg hover:bg-gray-800 transition"
          >
            Request via Plan Event
          </a>
        </div>
      </div>
    </div>
  );
}

// ✅ NEW — shop detail modal. This is what "clicking a shop" now actually
// opens — full info plus every package listed under it.
function ShopDetailModal({ biz, onClose, onOpenPackage }) {
  const packages = getPackages(biz);
  const whatsapp = (biz.whatsappNumber || '').replace(/[^0-9]/g, '');

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div
        className="bg-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white flex justify-end p-3 border-b border-gray-100">
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-full transition"><X size={18} /></button>
        </div>
        {biz.logoUrl && (
          <div className="h-40 bg-cyan-50">
            <img src={biz.logoUrl} alt={biz.businessName} className="w-full h-full object-cover" />
          </div>
        )}
        <div className="p-5">
          <p className="text-lg font-black text-gray-900 flex items-center gap-1.5">
            {biz.businessName} <VerificationTick biz={biz} size={16} />
          </p>
          {biz.city && <p className="text-sm text-gray-400 flex items-center gap-1 mt-1"><MapPin size={13} /> {biz.city}</p>}
          {biz.description && <p className="text-sm text-gray-600 mt-3">{biz.description}</p>}

          {whatsapp && (
            <a
              href={`https://wa.me/${whatsapp}`}
              target="_blank" rel="noreferrer"
              className="mt-4 block text-center text-sm font-bold text-white bg-emerald-500 px-4 py-3 rounded-xl hover:bg-emerald-600 transition"
            >
              Contact on WhatsApp
            </a>
          )}

          {packages.length > 0 && (
            <div className="mt-6">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Packages</p>
              <div className="space-y-2">
                {packages.map((pkg, i) => (
                  <button
                    key={i}
                    onClick={() => onOpenPackage(biz, pkg)}
                    className="w-full flex items-center gap-3 bg-gray-50 hover:bg-gray-100 rounded-xl p-3 transition text-left"
                  >
                    <div className="w-12 h-12 rounded-lg bg-cyan-50 flex-shrink-0 overflow-hidden flex items-center justify-center">
                      {pkg.image ? <img src={pkg.image} alt={pkg.name} className="w-full h-full object-cover" /> : <span className="text-lg">📦</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-900 truncate">{pkg.name}</p>
                      <p className="text-xs text-cyan-600 font-bold">₦{(pkg.price || 0).toLocaleString()}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ✅ NEW — focused single-package view, matching mobile exactly: just
// that one package's image, price, description, and a WhatsApp button
// pre-filled mentioning the package by name.
// ✅ NEW — simple full-screen lightbox, opened by clicking any package
// image. Same idea as mobile's InteractiveViewer, just a click-to-close
// overlay since browsers already support native pinch/scroll zoom.
function ImageLightbox({ url, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/90 z-[60] flex items-center justify-center p-4" onClick={onClose}>
      <button onClick={onClose} className="absolute top-4 right-4 text-white p-2 hover:bg-white/10 rounded-full transition">
        <X size={28} />
      </button>
      <img src={url} alt="" className="max-w-full max-h-full object-contain rounded-lg" onClick={e => e.stopPropagation()} />
    </div>
  );
}

function PackageDetailModal({ biz, pkg, onClose }) {
  const [lightboxUrl, setLightboxUrl] = useState(null);
  const whatsapp = (biz.whatsappNumber || '').replace(/[^0-9]/g, '');
  const message = encodeURIComponent(`Hi, I'm interested in "${pkg.name}" from ${biz.businessName} on OutingStation.`);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-md" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-white flex justify-end p-3 border-b border-gray-100">
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-full transition"><X size={18} /></button>
        </div>
        <div className="p-5">
          <div
            className={`h-44 bg-cyan-50 rounded-2xl overflow-hidden flex items-center justify-center mb-4 ${pkg.image ? 'cursor-zoom-in' : ''}`}
            onClick={() => pkg.image && setLightboxUrl(pkg.image)}
          >
            {pkg.image ? <img src={pkg.image} alt={pkg.name} className="w-full h-full object-cover" /> : <span className="text-4xl">📦</span>}
          </div>
          <p className="text-lg font-black text-gray-900">{pkg.name}</p>
          <p className="text-sm text-gray-500">{biz.businessName}</p>
          <p className="text-xl font-black text-cyan-600 mt-2">₦{(pkg.price || 0).toLocaleString()}</p>
          {pkg.description && <p className="text-sm text-gray-600 mt-3">{pkg.description}</p>}
          {whatsapp && (
            <a
              href={`https://wa.me/${whatsapp}?text=${message}`}
              target="_blank" rel="noreferrer"
              className="mt-5 block text-center text-sm font-bold text-white bg-emerald-500 px-4 py-3 rounded-xl hover:bg-emerald-600 transition"
            >
              Contact on WhatsApp
            </a>
          )}
        </div>
      </div>
      {lightboxUrl && <ImageLightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />}
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
  const [selectedShop, setSelectedShop] = useState(null);
  const [selectedPackage, setSelectedPackage] = useState(null); // { biz, pkg }

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
    if (search && !b.businessName?.toLowerCase().includes(search.toLowerCase()) && !b.description?.toLowerCase().includes(search.toLowerCase()) && !b.city?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  // gold > green > blue > unverified. Stable in modern JS engines.
  const tickRank = (b) => {
    const gov = b.govIdStatus === 'approved';
    const cac = b.cacStatus === 'approved';
    if (gov && cac) return 3;
    if (cac) return 2;
    if (gov) return 1;
    return 0;
  };
  filtered.sort((a, b) => tickRank(b) - tickRank(a));

  // ✅ NEW — flattened package list across every filtered business, for
  // the standalone Browse Packages section. Was completely missing before.
  const allPackages = filtered.flatMap(biz =>
    getPackages(biz).map(pkg => ({ biz, pkg }))
  );

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
              placeholder="Search by name, description, or city..."
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
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {filtered.map(biz => <BusinessCard key={biz.id} biz={biz} onOpen={setSelectedShop} />)}
            </div>

            {/* ✅ NEW — Browse Packages section. Was entirely missing before. */}
            {allPackages.length > 0 && (
              <div className="mt-12">
                <p className="text-xs text-cyan-600 font-bold uppercase tracking-wider mb-1">Browse Packages</p>
                <h2 className="text-xl font-black text-gray-900 mb-5">Individual packages across {section.label.toLowerCase()}</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {allPackages.map(({ biz, pkg }, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedPackage({ biz, pkg })}
                      className="flex items-center gap-3 bg-white border-2 border-gray-100 hover:border-cyan-300 hover:shadow-md rounded-2xl p-3 transition text-left"
                    >
                      <div className="w-14 h-14 rounded-xl bg-cyan-50 flex-shrink-0 overflow-hidden flex items-center justify-center">
                        {pkg.image ? <img src={pkg.image} alt={pkg.name} className="w-full h-full object-cover" /> : <span className="text-xl">📦</span>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-900 truncate">{pkg.name}</p>
                        <p className="text-xs text-gray-400 truncate flex items-center gap-1">
                          {biz.businessName} <VerificationTick biz={biz} size={11} />
                        </p>
                        <p className="text-sm font-black text-cyan-600 mt-0.5">₦{(pkg.price || 0).toLocaleString()}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
      <Footer />

      {selectedShop && (
        <ShopDetailModal
          biz={selectedShop}
          onClose={() => setSelectedShop(null)}
          onOpenPackage={(biz, pkg) => { setSelectedShop(null); setSelectedPackage({ biz, pkg }); }}
        />
      )}
      {selectedPackage && (
        <PackageDetailModal
          biz={selectedPackage.biz}
          pkg={selectedPackage.pkg}
          onClose={() => setSelectedPackage(null)}
        />
      )}
    </div>
  );
}