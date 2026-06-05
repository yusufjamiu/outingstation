import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import SEO from '../../components/SEO';
import {
  Calendar, Clock, MapPin, DollarSign, Users, Share2, Heart,
  ExternalLink, Mail, Phone, Globe, Bookmark, ArrowLeft,
  CheckCircle, Navigation, Ticket, CreditCard, Lock, Layers
} from 'lucide-react';
import {
  doc, getDoc, collection, getDocs,
  updateDoc, arrayUnion, arrayRemove, query, where
} from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import { formatEventDateFull, formatEventTime } from '../../utils/dateTimeHelpers';
import { PaystackButton } from 'react-paystack';
import {
  formatCredits,
  calculateAvailableCredits,
  calculateMaxCreditUsage,
  areCreditsUsable,
  hasUsedCreditsOnEvent,
  canApplyCreditsToTicket,
} from '../../utils/referralUtils';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const openInMaps = (event) => {
  if (event.mapLocation) { window.open(event.mapLocation, '_blank'); return; }
  const location = event.address || event.location;
  if (!location) { toast.error('No location information available'); return; }
  window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`, '_blank');
};

const calculateServiceFee = (event) => {
  if (event.serviceFeeType === 'fixed') return event.serviceFeeAmount || 100;
  if (event.serviceFeeType === 'percentage') return Math.round((event.ticketPrice || 0) * ((event.serviceFeePercentage || 2) / 100));
  return 0;
};

const calculatePaystackFee = (event) => {
  const subtotal = (event.ticketPrice || 0) + calculateServiceFee(event);
  return Math.round((subtotal * 0.015) + 100);
};

const calculateTotal = (event) => {
  return (event.ticketPrice || 0) + calculateServiceFee(event) + calculatePaystackFee(event);
};

const generateTicketId = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const random = Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `OS-${new Date().getFullYear()}-${random}`;
};

// ─── Image Carousel ───────────────────────────────────────────────────────────

function EventImageCarousel({ event, isPlace }) {
  const allImages = [
    ...(event.imageUrl ? [event.imageUrl] : []),
    ...(event.images || []).filter(img => img && img !== event.imageUrl),
  ].slice(0, 10);

  if (allImages.length === 0) {
    allImages.push('https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200&q=80');
  }

  const [currentIndex, setCurrentIndex] = useState(0);
  const [showFullScreen, setShowFullScreen] = useState(false);

  const prev = (e) => {
    e?.stopPropagation();
    setCurrentIndex(i => (i - 1 + allImages.length) % allImages.length);
  };

  const next = (e) => {
    e?.stopPropagation();
    setCurrentIndex(i => (i + 1) % allImages.length);
  };

  useEffect(() => {
    if (!showFullScreen) return;
    const handleKey = (e) => {
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'ArrowRight') next();
      if (e.key === 'Escape') setShowFullScreen(false);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [showFullScreen]);

  return (
    <>
      <div className="relative rounded-2xl overflow-hidden mb-6 shadow-lg group">
        <div
          className="relative h-64 sm:h-96 cursor-zoom-in"
          onClick={() => setShowFullScreen(true)}
        >
          <img
            src={allImages[currentIndex]}
            alt={event.title}
            className="w-full h-full object-cover transition-all duration-500"
            onError={(e) => {
              e.target.src = 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200&q=80';
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent pointer-events-none" />

          {allImages.length > 1 && (
            <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-sm text-white px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 z-10">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
                <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
              </svg>
              {currentIndex + 1} / {allImages.length}
            </div>
          )}

          <div className="absolute top-4 right-28 bg-black/40 backdrop-blur-sm text-white px-2.5 py-1.5 rounded-full text-xs font-medium opacity-0 group-hover:opacity-100 transition z-10 flex items-center gap-1">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
            </svg>
            View
          </div>

          {allImages.length > 1 && (
            <button
              onClick={prev}
              className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2.5 rounded-full transition opacity-0 group-hover:opacity-100 z-10"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                <path d="M15 18l-6-6 6-6"/>
              </svg>
            </button>
          )}

          {allImages.length > 1 && (
            <button
              onClick={next}
              className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2.5 rounded-full transition opacity-0 group-hover:opacity-100 z-10"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                <path d="M9 18l6-6-6-6"/>
              </svg>
            </button>
          )}

          {allImages.length > 1 && (
            <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-1.5 z-10 pointer-events-auto">
              {allImages.map((_, i) => (
                <button
                  key={i}
                  onClick={(e) => { e.stopPropagation(); setCurrentIndex(i); }}
                  className={`transition-all duration-300 rounded-full ${
                    i === currentIndex ? 'w-5 h-2 bg-white' : 'w-2 h-2 bg-white/50 hover:bg-white/80'
                  }`}
                />
              ))}
            </div>
          )}

          <div className="absolute top-4 right-4 flex flex-col gap-2 z-10">
            {event.eventType && (
              <span className="bg-purple-500 text-white px-4 py-2 rounded-full text-sm font-semibold">
                {event.eventType === 'campus' && '🎓 Campus'}
                {event.eventType === 'webinar' && '📹 Virtual'}
                {event.eventType === 'regular' && '🎉 Event'}
              </span>
            )}
            {isPlace && (
              <span className="bg-orange-500 text-white px-4 py-2 rounded-full text-sm font-semibold">
                📍 PLACE
              </span>
            )}
          </div>

          <div className="absolute z-10" style={{ top: '1rem', left: allImages.length > 1 ? '7rem' : '1rem' }}>
            <span className="bg-white/90 backdrop-blur-sm text-cyan-500 px-4 py-2 rounded-full text-sm font-semibold">
              #{event.category}
            </span>
          </div>

          {event.isFree && (
            <div className="absolute right-4 z-10" style={{ bottom: allImages.length > 1 ? '3rem' : '1rem' }}>
              <span className="bg-emerald-500 text-white px-4 py-2 rounded-lg font-semibold">
                Free {isPlace ? 'Entry' : 'Event'}
              </span>
            </div>
          )}
        </div>

        {allImages.length > 1 && (
          <div className="flex gap-2 p-3 bg-white overflow-x-auto">
            {allImages.map((img, i) => (
              <button
                key={i}
                onClick={() => setCurrentIndex(i)}
                className={`flex-shrink-0 w-16 h-12 rounded-lg overflow-hidden border-2 transition-all duration-200 ${
                  i === currentIndex
                    ? 'border-cyan-500 scale-105 shadow-md'
                    : 'border-transparent opacity-60 hover:opacity-100 hover:border-gray-300'
                }`}
              >
                <img
                  src={img}
                  alt={`Photo ${i + 1}`}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.src = 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=200';
                  }}
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {showFullScreen && (
        <div
          className="fixed inset-0 bg-black/96 z-50 flex items-center justify-center"
          onClick={() => setShowFullScreen(false)}
        >
          <button
            onClick={() => setShowFullScreen(false)}
            className="absolute top-4 right-4 text-white bg-white/20 hover:bg-white/30 p-3 rounded-full transition z-10"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>

          <div className="absolute top-4 left-1/2 -translate-x-1/2 text-white text-sm font-medium bg-white/20 px-4 py-2 rounded-full z-10">
            {currentIndex + 1} / {allImages.length}
          </div>

          <img
            src={allImages[currentIndex]}
            alt={event.title}
            className="max-w-[90vw] max-h-[80vh] object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            onError={(e) => {
              e.target.src = 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200&q=80';
            }}
          />

          {allImages.length > 1 && (
            <button
              onClick={prev}
              className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/40 text-white p-3 rounded-full transition"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                <path d="M15 18l-6-6 6-6"/>
              </svg>
            </button>
          )}

          {allImages.length > 1 && (
            <button
              onClick={next}
              className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/40 text-white p-3 rounded-full transition"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                <path d="M9 18l6-6-6-6"/>
              </svg>
            </button>
          )}

          {allImages.length > 1 && (
            <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2 px-4 overflow-x-auto py-2">
              {allImages.map((img, i) => (
                <button
                  key={i}
                  onClick={(e) => { e.stopPropagation(); setCurrentIndex(i); }}
                  className={`flex-shrink-0 w-14 h-10 rounded-md overflow-hidden border-2 transition-all ${
                    i === currentIndex
                      ? 'border-cyan-400 scale-110 shadow-lg'
                      : 'border-white/30 opacity-50 hover:opacity-100 hover:border-white/60'
                  }`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}

// ─── Compact Ticket Modal ─────────────────────────────────────────────────────

function CompactTicketModal({ ticketData, onClose }) {
  const qrCanvasRef = useRef(null);
  const verifyUrl = `https://www.outingstation.com/verify-ticket/${ticketData.ticketId}`;

  useEffect(() => {
    generateQRCode();
  }, [ticketData]);

  const generateQRCode = async () => {
    try {
      const QRCode = (await import('qrcode')).default;
      if (qrCanvasRef.current) {
        await QRCode.toCanvas(qrCanvasRef.current, verifyUrl, {
          width: 100,
          margin: 1,
          color: { dark: '#0e7490', light: '#ffffff' }
        });
      }
    } catch (err) {
      console.error('QR error:', err);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[90vh] overflow-y-auto">

        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 sticky top-0 bg-white z-10 rounded-t-3xl">
          <div className="flex items-center gap-2">
            <CheckCircle className="text-emerald-500" size={20} />
            <div>
              <p className="text-sm font-bold text-gray-900">Payment Successful!</p>
              <p className="text-xs text-gray-400">Check your email for ticket</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-full transition">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className="p-4">
          <div style={{
            background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
            borderRadius: 14, padding: '14px 16px', marginBottom: 12,
            position: 'relative', overflow: 'hidden'
          }}>
            <div style={{
              position: 'absolute', top: -16, right: -16,
              width: 70, height: 70, borderRadius: '50%',
              background: 'rgba(255,255,255,0.1)'
            }} />
            <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
              <span style={{
                background: 'rgba(255,255,255,0.2)', borderRadius: 6,
                padding: '2px 8px', fontSize: 9, fontWeight: 800,
                color: 'white', letterSpacing: 1.5, textTransform: 'uppercase'
              }}>OutingStation</span>
              <span style={{
                background: 'rgba(255,255,255,0.15)', borderRadius: 6,
                padding: '2px 7px', fontSize: 9, color: 'rgba(255,255,255,0.85)'
              }}>🎟️ E-Ticket</span>
              {ticketData.tierName && (
                <span style={{
                  background: 'rgba(255,255,255,0.25)', borderRadius: 6,
                  padding: '2px 8px', fontSize: 9, fontWeight: 700,
                  color: 'white', letterSpacing: 0.5
                }}>{ticketData.tierName}</span>
              )}
            </div>
            <p style={{ color: 'white', fontSize: 14, fontWeight: 800, margin: '0 0 6px', lineHeight: 1.3 }}>
              {ticketData.eventTitle}
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {ticketData.eventDate && (
                <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: 10 }}>📅 {ticketData.eventDate}</span>
              )}
              {ticketData.eventLocation && (
                <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: 10 }}>📍 {ticketData.eventLocation}</span>
              )}
            </div>
          </div>

          <div style={{
            background: 'white', borderRadius: 10, padding: '8px 12px',
            marginBottom: 10, border: '1.5px solid #e0f2fe',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between'
          }}>
            <div>
              <p style={{ fontSize: 8, color: '#64748b', margin: '0 0 2px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8 }}>Ticket ID</p>
              <p style={{ fontSize: 13, fontWeight: 900, color: '#0e7490', margin: 0, fontFamily: 'monospace', letterSpacing: 0.8 }}>
                {ticketData.ticketId}
              </p>
            </div>
            <div style={{ background: '#ecfdf5', borderRadius: 6, padding: '3px 8px', fontSize: 10, fontWeight: 800, color: '#059669' }}>
              ✓ VALID
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 10 }}>
            <div style={{ flex: 1 }}>
              <MiniRow label="Name" value={ticketData.buyerName} />
              <MiniRow label="Email" value={ticketData.buyerEmail} />
              <MiniRow label="Phone" value={ticketData.buyerPhone} />
              {ticketData.tierName && (
                <MiniRow label="Tier" value={ticketData.tierName} />
              )}
              <MiniRow label="Qty" value={`${ticketData.quantity} ticket${ticketData.quantity > 1 ? 's' : ''}`} />
              <MiniRow label="Paid" value={`₦${ticketData.totalPaid?.toLocaleString()}`} highlight />
              {ticketData.creditsApplied > 0 && (
                <MiniRow label="Credits" value={`-₦${ticketData.creditsApplied?.toLocaleString()}`} />
              )}
            </div>
            <div style={{ flexShrink: 0, textAlign: 'center' }}>
              <div style={{
                background: 'white', padding: 6, borderRadius: 10,
                border: '1.5px solid #bae6fd', display: 'inline-block'
              }}>
                <canvas ref={qrCanvasRef} style={{ width: 90, height: 90, display: 'block' }} />
              </div>
              <p style={{ fontSize: 8, color: '#94a3b8', marginTop: 4, textAlign: 'center' }}>Scan to verify</p>
            </div>
          </div>

          <div style={{
            background: '#f9fafb', borderRadius: 8, padding: '7px 10px',
            border: '1px solid #e5e7eb', marginBottom: 10
          }}>
            <p style={{ fontSize: 8, color: '#9ca3af', margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: 0.8, fontWeight: 700 }}>Payment Ref</p>
            <p style={{ fontSize: 10, color: '#374151', margin: 0, fontFamily: 'monospace', fontWeight: 600 }}>
              {ticketData.paymentRef}
            </p>
          </div>

          <div style={{
            background: 'linear-gradient(135deg, #ecfeff, #e0f2fe)',
            borderRadius: 8, padding: '8px 10px',
            border: '1px solid #a5f3fc', marginBottom: 12
          }}>
            <p style={{ fontSize: 10, color: '#0e7490', margin: 0, lineHeight: 1.5 }}>
              🎉 Show QR code or Ticket ID at the entrance. Ticket also sent to your email.
            </p>
          </div>
        </div>

        <div className="px-4 pb-6 space-y-2">
          <button
            onClick={() => window.open(verifyUrl, '_blank')}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-500 to-cyan-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:shadow-lg transition"
          >
            <ExternalLink size={15} />
            View Ticket Online
          </button>
          <button
            onClick={onClose}
            className="w-full py-2 text-gray-400 hover:text-gray-600 text-sm font-medium transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function MiniRow({ label, value, highlight }) {
  return (
    <div style={{ marginBottom: 7 }}>
      <p style={{ fontSize: 8, color: '#9ca3af', margin: '0 0 1px', textTransform: 'uppercase', letterSpacing: 0.8, fontWeight: 700 }}>
        {label}
      </p>
      <p style={{ fontSize: 11, margin: 0, color: highlight ? '#0e7490' : '#111827', fontWeight: highlight ? 800 : 500 }}>
        {value}
      </p>
    </div>
  );
}

// ─── Ticket Tier Selector ─────────────────────────────────────────────────────

function TicketTierSelector({ tiers, selectedTier, onSelect }) {
  const now = new Date();
  return (
    <div className="space-y-2 mb-4">
      <p className="text-sm font-bold text-gray-800 flex items-center gap-2">
        <Layers size={16} className="text-cyan-600" />
        Select Ticket Type
      </p>
      {tiers.map((tier, i) => {
        const isExpired = tier.saleEndDate && new Date(tier.saleEndDate) < now;
        const isSoldOut = tier.quantity != null && (tier.sold ?? 0) >= tier.quantity;
        const unavailable = isExpired || isSoldOut;
        const isSelected = selectedTier?.id === tier.id;
        const remaining = tier.quantity != null ? tier.quantity - (tier.sold ?? 0) : null;

        return (
          <button
            key={tier.id || i}
            type="button"
            disabled={unavailable}
            onClick={() => !unavailable && onSelect(tier)}
            className={`w-full text-left p-3.5 rounded-xl border-2 transition-all ${
              unavailable
                ? 'border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed'
                : isSelected
                ? 'border-cyan-500 bg-cyan-50 shadow-md'
                : 'border-gray-200 bg-white hover:border-cyan-300 hover:bg-cyan-50/50'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                  isSelected ? 'border-cyan-500 bg-cyan-500' : 'border-gray-300'
                }`}>
                  {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-gray-800">{tier.name}</p>
                    {i === 0 && !unavailable && (
                      <span className="text-xs bg-cyan-100 text-cyan-700 px-1.5 py-0.5 rounded font-semibold">Popular</span>
                    )}
                    {isExpired && <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-semibold">Expired</span>}
                    {isSoldOut && <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-semibold">Sold Out</span>}
                  </div>
                  {tier.benefits && <p className="text-xs text-gray-500 mt-0.5">{tier.benefits}</p>}
                  {remaining != null && remaining <= 20 && !isSoldOut && (
                    <p className="text-xs text-orange-500 mt-0.5">⚡ Only {remaining} left</p>
                  )}
                  {tier.saleEndDate && !isExpired && (
                    <p className="text-xs text-gray-400 mt-0.5">Ends {new Date(tier.saleEndDate).toLocaleDateString()}</p>
                  )}
                </div>
              </div>
              <div className="text-right flex-shrink-0 ml-3">
                <p className="text-sm font-black text-cyan-600">₦{Number(tier.price).toLocaleString()}</p>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ─── Ticket Purchase Section ──────────────────────────────────────────────────

// ✅ CHANGE 1: Added onPurchaseComplete prop
const TicketPurchaseSection = ({ event, currentUser, navigate, onPurchaseComplete }) => {
  const [buyerName, setBuyerName] = useState(currentUser?.displayName || '');
  const [buyerEmail, setBuyerEmail] = useState(currentUser?.email || '');
  const [buyerPhone, setBuyerPhone] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [showPaystackButton, setShowPaystackButton] = useState(false);
  const [availableCredits, setAvailableCredits] = useState(0);
  const [useCredits, setUseCredits] = useState(false);
  const [creditsToApply, setCreditsToApply] = useState(0);
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [ticketData, setTicketData] = useState(null);

  // ✅ Credit state
  const [isAmbassador, setIsAmbassador] = useState(false);
  const [creditsUnlocked, setCreditsUnlocked] = useState(false);
  const [creditUsedOnEvents, setCreditUsedOnEvents] = useState([]);

  // ✅ Tier state
  const hasTiers = event.hasTicketTiers && event.ticketTiers?.length > 0;
  const firstAvailableTier = hasTiers
    ? event.ticketTiers.find(t => {
        const isExpired = t.saleEndDate && new Date(t.saleEndDate) < new Date();
        const isSoldOut = t.quantity != null && (t.sold ?? 0) >= t.quantity;
        return !isExpired && !isSoldOut;
      }) || event.ticketTiers[0]
    : null;
  const [selectedTier, setSelectedTier] = useState(firstAvailableTier);

  const ticketId = useRef(generateTicketId());
  const paymentRef = useRef(`OS-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);

  useEffect(() => {
    const loadUserData = async () => {
      if (!currentUser) return;
      try {
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setAvailableCredits(calculateAvailableCredits(data.creditsHistory || []));
          setIsAmbassador(data.isAmbassador === true);
          setCreditsUnlocked(data.creditsUnlocked === true);
          setCreditUsedOnEvents(data.creditUsedOnEvents || []);
        }
      } catch (err) {
        console.error('Error loading user data:', err);
      }
    };
    loadUserData();
  }, [currentUser]);

  // ✅ All credit conditions
  const creditsUsable = areCreditsUsable(isAmbassador, creditsUnlocked);
  const alreadyUsedCreditsOnEvent = hasUsedCreditsOnEvent(creditUsedOnEvents, event.id);
  const canUseCredits = canApplyCreditsToTicket(
    isAmbassador,
    creditsUnlocked,
    quantity,
    creditUsedOnEvents,
    event.id
  );

  // ✅ Use selected tier price if tiers exist, otherwise fall back to event.ticketPrice
  const activeTicketPrice = hasTiers && selectedTier ? selectedTier.price : (event.ticketPrice || 0);

  const ticketPrice = activeTicketPrice;
  const serviceFee = calculateServiceFee(event);
  const paystackFee = calculatePaystackFee(event);
  // ✅ Recalculate total using active tier price
  const baseTotal = ticketPrice + serviceFee + paystackFee;
  const totalBeforeCredits = baseTotal * quantity;
  const maxCreditsAllowed = calculateMaxCreditUsage(totalBeforeCredits, availableCredits);
  const actualCreditsApplied = useCredits && canUseCredits
    ? Math.min(creditsToApply || maxCreditsAllowed, maxCreditsAllowed)
    : 0;
  const finalTotal = totalBeforeCredits - actualCreditsApplied;

  // ✅ Tickets remaining — tier-aware
  const ticketsRemaining = hasTiers && selectedTier
    ? (selectedTier.quantity != null ? selectedTier.quantity - (selectedTier.sold ?? 0) : 9999)
    : (event.ticketsAvailable || 0) - (event.ticketsSold || 0);

  // ✅ Reset credits if quantity > 1
  useEffect(() => {
    if (quantity > 1) setUseCredits(false);
  }, [quantity]);

  useEffect(() => {
    setCreditsToApply(useCredits && canUseCredits ? maxCreditsAllowed : 0);
  }, [useCredits, maxCreditsAllowed, canUseCredits]);

  // ✅ Reset paystack button when tier changes
  useEffect(() => {
    setShowPaystackButton(false);
  }, [selectedTier]);

  const handlePaymentSuccess = async (reference) => {
    // ✅ Record credit usage on this event
    if (actualCreditsApplied > 0 && currentUser) {
      try {
        await updateDoc(doc(db, 'users', currentUser.uid), {
          creditUsedOnEvents: arrayUnion(event.id),
        });
      } catch (err) {
        console.error('Error recording credit usage:', err);
      }
    }

    const newTicket = {
      ticketId: ticketId.current,
      eventId: event.id,
      eventTitle: event.title,
      eventDate: formatEventDateFull(event),
      eventLocation: event.location || event.address || '',
      eventImageUrl: event.imageUrl || '',
      buyerName,
      buyerEmail,
      buyerPhone,
      quantity,
      ticketPrice,
      // ✅ Include tier info in ticket
      tierName: selectedTier?.name || null,
      tierId: selectedTier?.id || null,
      serviceFee: serviceFee * quantity,
      paystackFee: paystackFee * quantity,
      totalPaid: finalTotal,
      creditsApplied: actualCreditsApplied,
      paymentRef: reference.reference || paymentRef.current,
      status: 'valid',
    };
    setTicketData(newTicket);
    setShowTicketModal(true);
    toast.success('🎉 Payment successful! Check your email for your ticket.', { duration: 5000 });

    // ✅ FIX: Pass tierId+qty to parent so it updates event state optimistically
    // Do NOT call loadEventDetails — it triggers setLoading(true), unmounts this
    // component, and re-fetches Firestore before the webhook has time to update it
    if (onPurchaseComplete) onPurchaseComplete(selectedTier?.id, quantity);
  };

  const handlePaymentClose = () => {
    toast.error('Payment cancelled');
  };

  const handleProceedToPayment = () => {
    // ✅ Validate tier selection
    if (hasTiers && !selectedTier) {
      toast.error('Please select a ticket type');
      return;
    }
    if (!buyerName || !buyerEmail || !buyerPhone) {
      toast.error('Please enter your name, email, and phone number');
      return;
    }
    if (quantity < 1) { toast.error('Please select at least 1 ticket'); return; }
    if (quantity > ticketsRemaining) {
      toast.error(`Only ${ticketsRemaining} tickets remaining`);
      return;
    }
    setShowPaystackButton(true);
  };

  const paystackConfig = {
    reference: paymentRef.current,
    email: buyerEmail,
    amount: finalTotal * 100,
    publicKey: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY,
    metadata: {
      custom_fields: [
        { display_name: 'EID', variable_name: 'eid', value: event.id },
        { display_name: 'TID', variable_name: 'tid', value: ticketId.current },
        { display_name: 'Name', variable_name: 'buyer_name', value: buyerName },
        { display_name: 'Phone', variable_name: 'buyer_phone', value: buyerPhone },
        // ✅ Include tier in Paystack metadata
        { display_name: 'Tier', variable_name: 'tier_name', value: selectedTier?.name || 'Standard' },
        // ✅ FIX: tier_id must be in custom_fields — Paystack drops direct metadata fields in webhook
        { display_name: 'TierID', variable_name: 'tier_id', value: selectedTier?.id || '' },
        { display_name: 'Price', variable_name: 'ticket_price', value: String(ticketPrice) },
        { display_name: 'Fee', variable_name: 'service_fee', value: String(serviceFee) },
        { display_name: 'Qty', variable_name: 'quantity', value: String(quantity) },
        { display_name: 'Sub', variable_name: 'subtotal', value: String(totalBeforeCredits) },
        { display_name: 'Cr', variable_name: 'credits_applied', value: String(actualCreditsApplied) },
        { display_name: 'Tot', variable_name: 'total_amount', value: String(finalTotal) },
      ],
      event_id: event.id,
      ticket_id: ticketId.current,
      tier_id: selectedTier?.id || null,
      total_amount: finalTotal,
    },
  };

  // ✅ Smart credits message logic
  const getCreditsMessage = () => {
    if (!currentUser || availableCredits === 0) return null;
    if (!creditsUsable) return { type: 'locked' };
    if (alreadyUsedCreditsOnEvent) return { type: 'used' };
    if (quantity > 1) return { type: 'qty' };
    return { type: 'available' };
  };

  const creditsMessage = getCreditsMessage();

  return (
    <>
      <div className="bg-white rounded-xl p-6 shadow-sm border-2 border-cyan-100">
        <div className="flex items-center gap-2 mb-4">
          <Ticket className="text-cyan-500" size={24} />
          <h3 className="text-xl font-bold text-gray-900">Purchase Tickets</h3>
        </div>

        <div className="bg-cyan-50 rounded-lg p-3 mb-4">
          <p className="text-sm text-gray-700">
            <span className="font-semibold">{ticketsRemaining >= 9999 ? 'Unlimited' : ticketsRemaining}</span> tickets remaining
            {hasTiers && selectedTier && <span className="text-gray-500 text-xs"> · {selectedTier.name}</span>}
          </p>
          {ticketsRemaining < 10 && ticketsRemaining > 0 && ticketsRemaining < 9999 && (
            <p className="text-xs text-orange-600 mt-1">⚠️ Selling fast!</p>
          )}
          {ticketsRemaining === 0 && (
            <p className="text-xs text-red-600 mt-1">❌ Sold out!</p>
          )}
        </div>

        {/* ✅ Tier selector — shown only when event has tiers */}
        {hasTiers && (
          <TicketTierSelector
            tiers={event.ticketTiers}
            selectedTier={selectedTier}
            onSelect={(tier) => setSelectedTier(tier)}
          />
        )}

        <div className="space-y-3 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
            <input type="text" value={buyerName} onChange={(e) => setBuyerName(e.target.value)}
              placeholder="John Doe"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-transparent" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
            <input type="email" value={buyerEmail} onChange={(e) => setBuyerEmail(e.target.value)}
              placeholder="john@example.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-transparent" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number *</label>
            <input type="tel" value={buyerPhone} onChange={(e) => setBuyerPhone(e.target.value)}
              placeholder="+234 800 000 0000"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-transparent" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
            <input type="number" value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              min="1" max={ticketsRemaining >= 9999 ? 10 : ticketsRemaining}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-transparent" />
          </div>
        </div>

        {/* ✅ Smart credits section */}
        {creditsMessage && (
          <>
            {/* Locked */}
            {creditsMessage.type === 'locked' && (
              <div className="bg-orange-50 border-2 border-orange-200 rounded-lg p-4 mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <Lock size={16} className="text-orange-500" />
                  <p className="text-sm font-bold text-orange-800">Credits Locked 🔒</p>
                </div>
                <p className="text-xs text-orange-600 mb-3">
                  You have {formatCredits(availableCredits)} in credits but they are pending admin approval.
                </p>
                
                <a href="/credit-unlock-request"
                  className="inline-flex items-center gap-1.5 text-xs bg-orange-500 text-white px-3 py-1.5 rounded-lg font-semibold hover:bg-orange-600 transition"
                >
                  🔓 Request Credit Unlock →
                </a>
              </div>
            )}

            {/* Already used on this event */}
            {creditsMessage.type === 'used' && (
              <div className="bg-gray-50 border-2 border-gray-200 rounded-lg p-4 mb-4">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle size={16} className="text-gray-400" />
                  <p className="text-sm font-bold text-gray-600">Credits Already Used for This Event</p>
                </div>
                <p className="text-xs text-gray-500">
                  You already used credits when purchasing a ticket for this event.
                  Credits can only be used once per event.
                </p>
              </div>
            )}

            {/* Quantity > 1 */}
            {creditsMessage.type === 'qty' && (
              <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 mb-4">
                <div className="flex items-center gap-2 mb-1">
                  <CreditCard size={16} className="text-blue-500" />
                  <p className="text-sm font-bold text-blue-800">Credits Only Available for Single Ticket</p>
                </div>
                <p className="text-xs text-blue-600">
                  Credits can only be applied when purchasing 1 ticket at a time.
                  Reduce quantity to 1 to use your {formatCredits(availableCredits)} credits.
                </p>
              </div>
            )}

            {/* Available — show toggle */}
            {creditsMessage.type === 'available' && (
              <div className="bg-purple-50 rounded-lg p-4 mb-4 border-2 border-purple-200">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <CreditCard className="text-purple-600" size={20} />
                    <span className="font-semibold text-gray-900">Use Credits</span>
                    
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={useCredits}
                      onChange={(e) => setUseCredits(e.target.checked)} className="sr-only peer" />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                  </label>
                </div>
                <div className="text-sm">
                  <p className="text-gray-700 mb-1">
                    Available: <span className="font-bold text-purple-600">{formatCredits(availableCredits)}</span>
                  </p>
                  <p className="text-xs text-gray-500">
                    💡 Credits can only be used for 1 ticket per event
                  </p>
                  {useCredits && (
                    <p className="text-green-600 font-medium mt-1">
                      ✓ Applying {formatCredits(actualCreditsApplied)} (Max 50%)
                    </p>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {/* Price Breakdown */}
        <div className="bg-gray-50 rounded-lg p-4 mb-4">
          <p className="text-sm font-semibold text-gray-900 mb-2">Price Breakdown:</p>
          <div className="space-y-1 text-sm">
            {/* ✅ Show selected tier name in breakdown */}
            {hasTiers && selectedTier && (
              <div className="flex justify-between text-xs text-gray-500 pb-1 border-b border-gray-200 mb-1">
                <span>Tier:</span>
                <span className="font-semibold text-cyan-600">{selectedTier.name}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-600">Ticket Price ({quantity}x):</span>
              <span className="font-medium">{formatCredits(ticketPrice * quantity)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Service Fee:</span>
              <span className="font-medium">{formatCredits(serviceFee * quantity)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Payment Processing:</span>
              <span className="font-medium">{formatCredits(paystackFee * quantity)}</span>
            </div>
            {actualCreditsApplied > 0 && (
              <>
                <div className="border-t pt-2 mt-2 flex justify-between">
                  <span className="text-gray-700">Subtotal:</span>
                  <span className="font-medium">{formatCredits(totalBeforeCredits)}</span>
                </div>
                <div className="flex justify-between text-green-600">
                  <span>Credits Applied:</span>
                  <span className="font-bold">-{formatCredits(actualCreditsApplied)}</span>
                </div>
              </>
            )}
            <div className="border-t pt-2 mt-2 flex justify-between">
              <span className="font-bold text-gray-900">Total:</span>
              <span className="font-bold text-cyan-600 text-lg">{formatCredits(finalTotal)}</span>
            </div>
          </div>
        </div>

        {ticketsRemaining > 0 ? (
          showPaystackButton ? (
            <PaystackButton
              {...paystackConfig}
              text={`Pay ${formatCredits(finalTotal)}`}
              onSuccess={handlePaymentSuccess}
              onClose={handlePaymentClose}
              className="w-full bg-gradient-to-r from-cyan-400 to-cyan-500 text-white py-3 rounded-xl font-semibold hover:shadow-lg transition"
            />
          ) : (
            <button
              onClick={handleProceedToPayment}
              className="w-full bg-gradient-to-r from-cyan-400 to-cyan-500 text-white py-3 rounded-xl font-semibold hover:shadow-lg transition flex items-center justify-center gap-2"
            >
              <Ticket size={20} />
              {/* ✅ Show tier name in button */}
              {hasTiers && selectedTier ? `Buy ${selectedTier.name} Ticket` : 'Proceed to Payment'}
            </button>
          )
        ) : (
          <button disabled className="w-full bg-gray-300 text-gray-500 py-3 rounded-xl font-semibold cursor-not-allowed">
            Sold Out
          </button>
        )}

        <p className="text-xs text-gray-500 text-center mt-3">
          🔒 Secure payment powered by Paystack
        </p>
      </div>

      {showTicketModal && ticketData && (
        <CompactTicketModal
          ticketData={ticketData}
          onClose={() => setShowTicketModal(false)}
        />
      )}
    </>
  );
};

// ─── Handle Register ──────────────────────────────────────────────────────────

const handleRegister = (event, currentUser, navigate) => {
  toast.dismiss();

  if (event.subCategory === 'places') {
    toast((t) => (
      <div className="flex flex-col gap-3">
        <div>
          <p className="font-semibold">📍 Visit Place</p>
          <p className="text-sm text-gray-600 mt-1">
            This is a permanent place. Visit the location to purchase tickets or pay entry fees if applicable.
          </p>
        </div>
        <div className="flex gap-2">
          {event.mapLocation && (
            <button onClick={() => { openInMaps(event); toast.dismiss(t.id); }}
              className="flex-1 px-4 py-2 bg-cyan-500 text-white rounded-lg font-medium hover:bg-cyan-600">
              View Map
            </button>
          )}
          <button onClick={() => toast.dismiss(t.id)}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200">
            Got it
          </button>
        </div>
      </div>
    ), { duration: Infinity, icon: '🏪', id: 'place-info' });
    return;
  }

  if (event.ticketingOption === 'outingstation' && event.ticketingEnabled) {
    const ticketSection = document.getElementById('ticket-purchase-section');
    if (ticketSection) {
      ticketSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // ✅ Different message for tier events
      toast.success(
        event.hasTicketTiers
          ? '👇 Select your ticket type below'
          : '👇 Fill in your details below to purchase tickets'
      );
    }
    return;
  }

  if (event.ticketingOption === 'external' && event.externalTicketLink) {
    toast((t) => (
      <div className="flex flex-col gap-3">
        <div>
          <p className="font-semibold">🎟️ External Ticketing</p>
          <p className="text-sm text-gray-600 mt-1">{event.title}</p>
          <p className="text-sm font-semibold text-cyan-600 mt-1">
            Price: ₦{event.price?.toLocaleString()}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { window.open(event.externalTicketLink, '_blank'); toast.dismiss(t.id); }}
            className="flex-1 px-4 py-2 bg-cyan-500 text-white rounded-lg font-medium hover:bg-cyan-600">
            Buy Tickets
          </button>
          <button onClick={() => toast.dismiss(t.id)}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200">
            Cancel
          </button>
        </div>
      </div>
    ), { duration: Infinity, id: 'external-ticket-info' });
    return;
  }

  if (event.isFree || event.ticketingOption === 'none') {
    toast((t) => (
      <div className="flex flex-col gap-3">
        <div>
          <p className="font-semibold">🎉 Free Event - You're All Set!</p>
          <p className="text-sm text-gray-600 mt-1">
            This event is completely free! Just show up at the venue on the event day.
          </p>
          <div className="mt-3 bg-cyan-50 rounded-lg p-3 text-sm">
            <p className="font-medium text-gray-800 mb-1">📅 Event Details:</p>
            <p className="text-gray-700"><strong>Date:</strong> {formatEventDateFull(event)}</p>
            <p className="text-gray-700"><strong>Location:</strong> {event.location || event.address || 'TBD'}</p>
          </div>
          {(event.organizerEmail || event.organizerPhone) && (
            <div className="mt-2 text-sm text-gray-700">
              <p className="font-medium mb-1">Questions? Contact the organizer:</p>
              {event.organizerEmail && <p>📧 {event.organizerEmail}</p>}
              {event.organizerPhone && <p>📞 {event.organizerPhone}</p>}
            </div>
          )}
        </div>
        <button onClick={() => toast.dismiss(t.id)}
          className="px-4 py-2 bg-cyan-500 text-white rounded-lg font-medium hover:bg-cyan-600">
          Got it, thanks!
        </button>
      </div>
    ), { duration: Infinity, icon: '🎉', id: 'free-event-info' });
    return;
  }
};

// ─── Main Component ───────────────────────────────────────────────────────────

export default function EventDetails() {
  const { id, slug } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const [event, setEvent] = useState(null);
  const [similarEvents, setSimilarEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);

  useEffect(() => {
    loadEventDetails();
    checkIfSaved();
  }, [id, slug, currentUser]);

  useEffect(() => {
    return () => { toast.dismiss(); };
  }, []);

  // ✅ FIX: Optimistically update tier sold count in parent state — no Firestore re-fetch
  // Re-fetching causes a race condition: webhook hasn't fired yet so Firestore
  // still shows old sold count, making the tier appear available again
  const handlePurchaseComplete = (tierId, qty) => {
    if (!tierId || !event?.ticketTiers) return;
    setEvent(prev => ({
      ...prev,
      ticketTiers: prev.ticketTiers.map(t =>
        t.id === tierId ? { ...t, sold: (t.sold || 0) + qty } : t
      )
    }));
  };

  const loadEventDetails = async () => {
    try {
      setLoading(true);
      let eventData = null;

      if (id) {
        const eventDoc = await getDoc(doc(db, 'events', id));
        if (!eventDoc.exists()) { navigate('/events'); return; }
        eventData = { id: eventDoc.id, ...eventDoc.data() };
      } else if (slug) {
        const q = query(collection(db, 'events'), where('slug', '==', slug));
        const snapshot = await getDocs(q);
        if (snapshot.empty) { navigate('/events'); return; }
        eventData = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
      }

      setEvent(eventData);

      const eventsSnapshot = await getDocs(collection(db, 'events'));
      const similar = eventsSnapshot.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(e => e.id !== eventData.id && e.category === eventData.category && e.status === 'published')
        .slice(0, 3);
      setSimilarEvents(similar);
    } catch (err) {
      console.error('Error loading event:', err);
    }
    setLoading(false);
  };

  const checkIfSaved = async () => {
    if (!currentUser) { setSaved(false); return; }
    try {
      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      if (userDoc.exists()) {
        setSaved((userDoc.data().savedEvents || []).includes(id || event?.id));
      }
    } catch (err) {
      console.error('Error checking saved status:', err);
    }
  };

  const handleSaveToggle = async () => {
    if (!currentUser) {
      toast.error('Please login to save events', { icon: '🔒' });
      setTimeout(() => navigate('/login'), 1000);
      return;
    }
    try {
      const userRef = doc(db, 'users', currentUser.uid);
      const eventId = event?.id;
      if (saved) {
        await updateDoc(userRef, { savedEvents: arrayRemove(eventId) });
        setSaved(false);
        toast.success('Event removed from saved', { icon: '💔' });
      } else {
        await updateDoc(userRef, { savedEvents: arrayUnion(eventId) });
        setSaved(true);
        toast.success('Event saved!', { icon: '❤️' });
      }
    } catch (err) {
      console.error('Error toggling save:', err);
      toast.error('Failed to save. Try again.', { icon: '❌' });
    }
  };

  const handleShare = (platform) => {
    const shareUrl = event?.slug
      ? `https://www.outingstation.com/e/${event.slug}`
      : `https://www.outingstation.com/event/${event.id}`;
    const text = `Check out this event: ${event.title}`;
    const shareUrls = {
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
      twitter: `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(text)}`,
      whatsapp: `https://wa.me/?text=${encodeURIComponent(text + ' ' + shareUrl)}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`,
    };
    if (platform === 'copy') {
      navigator.clipboard.writeText(shareUrl);
      toast.success('Link copied!', { icon: '📋' });
    } else {
      window.open(shareUrls[platform], '_blank');
    }
    setShowShareMenu(false);
  };

  if (loading) {
    return (
      <>
        <SEO />
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
        <SEO title="Event Not Found - OutingStation" />
        <div className="min-h-screen bg-gray-50">
          <Navbar />
          <div className="max-w-4xl mx-auto px-4 py-20 text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Event Not Found</h1>
            <Link to="/events" className="text-cyan-500 hover:underline">Back to Events</Link>
          </div>
          <Footer />
        </div>
      </>
    );
  }

  const isPlace = event.subCategory === 'places';
  const eventDate = formatEventDateFull(event);
  const eventTime = formatEventTime(event);
  const hasOutingStationTicketing = event.ticketingOption === 'outingstation' && event.ticketingEnabled;
  // ✅ Tier flag for sidebar
  const hasTiers = event.hasTicketTiers && event.ticketTiers?.length > 0;
  const canonicalUrl = event.slug
    ? `https://www.outingstation.com/e/${event.slug}`
    : `https://www.outingstation.com/event/${event.id}`;

  return (
    <>
      <SEO
        title={`${event.title} - OutingStation`}
        description={event.description?.substring(0, 155) || `Join ${event.title} - an amazing ${isPlace ? 'place' : 'event'} in ${event.location || 'Nigeria'}`}
        image={event.imageUrl}
        url={canonicalUrl}
        type="article"
        keywords={`${event.category}, ${event.location}, ${isPlace ? 'places' : 'events'} Nigeria, ${event.eventType} events, ${event.isFree ? 'free events' : 'paid events'}`}
      />

      <div className="min-h-screen bg-gray-50">
        <Navbar />

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition">
            <ArrowLeft size={20} />
            <span>Back</span>
          </button>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

            <div className="lg:col-span-2">
              <EventImageCarousel event={event} isPlace={isPlace} />

              <div className="flex items-start justify-between mb-6">
                <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 flex-1">{event.title}</h1>
                <div className="flex gap-2 ml-4">
                  <button onClick={handleSaveToggle}
                    className={`p-3 rounded-full transition ${saved ? 'bg-red-50 text-red-500' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                    {saved ? <Heart size={24} className="fill-current" /> : <Heart size={24} />}
                  </button>
                  <div className="relative">
                    <button onClick={() => setShowShareMenu(!showShareMenu)}
                      className="p-3 bg-gray-100 text-gray-600 rounded-full hover:bg-gray-200 transition">
                      <Share2 size={24} />
                    </button>
                    {showShareMenu && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setShowShareMenu(false)}></div>
                        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                          <button onClick={() => handleShare('facebook')} className="w-full px-4 py-2 text-left hover:bg-gray-100 text-sm">Share on Facebook</button>
                          <button onClick={() => handleShare('twitter')} className="w-full px-4 py-2 text-left hover:bg-gray-100 text-sm">Share on Twitter</button>
                          <button onClick={() => handleShare('whatsapp')} className="w-full px-4 py-2 text-left hover:bg-gray-100 text-sm">Share on WhatsApp</button>
                          <button onClick={() => handleShare('linkedin')} className="w-full px-4 py-2 text-left hover:bg-gray-100 text-sm">Share on LinkedIn</button>
                          <hr className="my-2" />
                          <button onClick={() => handleShare('copy')} className="w-full px-4 py-2 text-left hover:bg-gray-100 text-sm">Copy Link</button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 mb-6 shadow-sm">
                <h2 className="text-xl font-bold text-gray-900 mb-4">About This {isPlace ? 'Place' : 'Event'}</h2>
                <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                  {event.description || 'No description available.'}
                </p>
              </div>

              {hasOutingStationTicketing && (
                <div id="ticket-purchase-section" className="mb-6">
                  {/* ✅ CHANGE 3: Pass onPurchaseComplete so tier counts refresh after purchase */}
                  <TicketPurchaseSection event={event} currentUser={currentUser} navigate={navigate} onPurchaseComplete={handlePurchaseComplete} />
                </div>
              )}

              {(event.university || event.platform || event.religionType) && (
                <div className="bg-white rounded-xl p-6 mb-6 shadow-sm">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">Additional Information</h2>
                  <div className="space-y-3">
                    {event.university && (
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-gray-700">University:</span>
                        <span className="text-gray-600">{event.university}</span>
                      </div>
                    )}
                    {event.platform && (
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-gray-700">Platform:</span>
                        <span className="text-gray-600">{event.platform}</span>
                      </div>
                    )}
                    {event.platformLink && (
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-gray-700">Join Link:</span>
                        <a href={event.platformLink} target="_blank" rel="noopener noreferrer"
                          className="text-cyan-500 hover:underline flex items-center gap-1">
                          Join Meeting <ExternalLink size={16} />
                        </a>
                      </div>
                    )}
                    {event.religionType && (
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-gray-700">Religion:</span>
                        <span className="text-gray-600">{event.religionType}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {(event.organizerName || event.organizerEmail || event.organizerPhone) && (
                <div className="bg-white rounded-xl p-6 mb-6 shadow-sm">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">
                    {isPlace ? 'Contact Information' : 'Organizer'}
                  </h2>
                  <div className="space-y-3">
                    {event.organizerName && (
                      <div className="flex items-center gap-3">
                        <Users size={20} className="text-gray-400" />
                        <span className="text-gray-700">{event.organizerName}</span>
                      </div>
                    )}
                    {event.organizerEmail && (
                      <div className="flex items-center gap-3">
                        <Mail size={20} className="text-gray-400" />
                        <a href={`mailto:${event.organizerEmail}`} className="text-cyan-500 hover:underline">{event.organizerEmail}</a>
                      </div>
                    )}
                    {event.organizerPhone && (
                      <div className="flex items-center gap-3">
                        <Phone size={20} className="text-gray-400" />
                        <a href={`tel:${event.organizerPhone}`} className="text-cyan-500 hover:underline">{event.organizerPhone}</a>
                      </div>
                    )}
                    {event.organizerWebsite && (
                      <div className="flex items-center gap-3">
                        <Globe size={20} className="text-gray-400" />
                        <a href={event.organizerWebsite} target="_blank" rel="noopener noreferrer"
                          className="text-cyan-500 hover:underline">Visit Website</a>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl p-6 shadow-lg sticky top-6">
                <h2 className="text-xl font-bold text-gray-900 mb-6">
                  {isPlace ? 'Place Details' : 'Event Details'}
                </h2>
                <div className="space-y-4 mb-6">
                  <div className="flex items-start gap-3">
                    <Calendar size={20} className="text-cyan-500 mt-1 flex-shrink-0" />
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{isPlace ? 'Availability' : 'Date'}</p>
                      <p className="text-gray-600 text-sm">{eventDate}</p>
                    </div>
                  </div>
                  {eventTime && eventTime !== 'TBD' && (
                    <div className="flex items-start gap-3">
                      <Clock size={20} className="text-cyan-500 mt-1 flex-shrink-0" />
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">{isPlace ? 'Hours' : 'Time'}</p>
                        <p className="text-gray-600 text-sm">{eventTime}</p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-start gap-3">
                    <MapPin size={20} className="text-cyan-500 mt-1 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900 text-sm">Location</p>
                      {event.address ? (
                        <>
                          <p className="text-gray-600 text-sm mb-1">{event.address}</p>
                          {event.location && <p className="text-gray-500 text-xs mb-2">📍 {event.location}</p>}
                        </>
                      ) : (
                        <p className="text-gray-600 text-sm mb-2">{event.location || 'Online'}</p>
                      )}
                      {(event.mapLocation || event.address) && event.location?.toLowerCase() !== 'online' && (
                        <button onClick={() => openInMaps(event)}
                          className="text-cyan-500 text-xs font-medium hover:underline flex items-center gap-1">
                          <Navigation size={14} />
                          Open in Maps
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <DollarSign size={20} className="text-cyan-500 mt-1 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900 text-sm">{isPlace ? 'Entry Fee' : 'Price'}</p>
                      {/* ✅ Show tier prices in sidebar */}
                      {hasTiers ? (
                        <div className="space-y-1 mt-1">
                          {event.ticketTiers.slice(0, 4).map((tier, i) => (
                            <div key={i} className="flex justify-between items-center">
                              <span className="text-gray-600 text-xs">{tier.name}</span>
                              <span className="font-semibold text-xs text-cyan-600">₦{Number(tier.price).toLocaleString()}</span>
                            </div>
                          ))}
                          {event.ticketTiers.length > 4 && (
                            <p className="text-xs text-gray-400">+{event.ticketTiers.length - 4} more tiers</p>
                          )}
                        </div>
                      ) : (
                        <p className="text-gray-600 text-sm">
                          {hasOutingStationTicketing ? (
                            <span className="font-semibold">₦{event.ticketPrice?.toLocaleString()}</span>
                          ) : event.isFree ? (
                            <span className="text-emerald-600 font-semibold">Free</span>
                          ) : (
                            <span className="font-semibold">₦{event.price?.toLocaleString() || 'Contact Organizer'}</span>
                          )}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <button
                    onClick={() => handleRegister(event, currentUser, navigate)}
                    className="w-full bg-gradient-to-r from-cyan-400 to-cyan-500 text-white py-3 rounded-xl font-semibold hover:shadow-lg transition flex items-center justify-center gap-2"
                  >
                    <CheckCircle size={20} />
                    {/* ✅ Button label — "Select Ticket" for tier events */}
                    {hasOutingStationTicketing
                      ? (hasTiers ? 'Select Ticket' : 'Buy Tickets')
                      : isPlace ? 'Get Info'
                      : (event.isFree ? 'Register' : 'Buy Tickets')}
                  </button>

                  <button
                    onClick={handleSaveToggle}
                    className={`w-full py-3 rounded-xl font-semibold transition flex items-center justify-center gap-2 ${
                      saved ? 'bg-red-50 text-red-500 border-2 border-red-200' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <Bookmark size={20} className={saved ? 'fill-current' : ''} />
                    {saved ? 'Saved' : `Save ${isPlace ? 'Place' : 'Event'}`}
                  </button>

                  {!currentUser && (
                    <p className="text-xs text-center text-gray-400">
                      <Link to="/signup" className="text-cyan-500 hover:underline font-medium">
                        Create an account
                      </Link>{' '}
                      to save events & get personalized picks
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {similarEvents.length > 0 && (
            <div className="mt-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Similar Events</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {similarEvents.map((similar) => (
                  <Link
                    key={similar.id}
                    to={similar.slug ? `/e/${similar.slug}` : `/event/${similar.id}`}
                    className="bg-white rounded-xl overflow-hidden shadow-md hover:shadow-xl transition group"
                  >
                    <div className="relative h-48">
                      <img
                        src={similar.imageUrl || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&q=80'}
                        alt={similar.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                      />
                      {similar.isFree && (
                        <span className="absolute top-3 right-3 bg-emerald-500 text-white text-xs px-3 py-1 rounded-lg font-semibold">Free</span>
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="font-bold text-gray-900 mb-2 group-hover:text-cyan-500 transition line-clamp-2">{similar.title}</h3>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Calendar size={14} />
                        <span>{formatEventDateFull(similar)}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </main>

        <Footer />
      </div>
    </>
  );
}