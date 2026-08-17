// SessionBookingSection.jsx — guest-facing booking UI for an Experience.
// Mirrors TicketPurchaseSection.jsx's shape (session picker instead of
// tier picker, guest count instead of ticket quantity, Paystack +
// QR confirmation the same way), but skips ticket tiers, credits, and
// the service-fee/Paystack-fee breakdown entirely — experiences charge
// exactly pricePerPerson × guestCount, nothing added on top, since the
// host's payout is handled separately via the 48hr remittance flow
// already agreed for OutingStation-ticketed experiences.
//
// bookingMethod === 'contact' skips payment altogether and shows a
// "Contact Host" panel instead (WhatsApp/phone), since that experience
// was never meant to go through checkout at all.
import React, { useState, useRef, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Calendar, Clock, Users, CheckCircle, ExternalLink, MessageCircle, Phone } from 'lucide-react';
import { PaystackButton } from 'react-paystack';

const generateBookingId = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const random = Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `EXP-${new Date().getFullYear()}-${random}`;
};

const formatSessionDate = (dateStr) => {
  if (!dateStr) return 'No date';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return dateStr;
  }
};

const formatSessionTime = (timeStr) => {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':').map(Number);
  if (Number.isNaN(h)) return timeStr;
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m || 0).padStart(2, '0')} ${period}`;
};

// Lightweight confirmation modal — same visual language as
// EventDetails.jsx's CompactTicketModal, but self-contained here rather
// than shared/imported, to avoid coupling two independently-editable
// pages together over a small bit of markup.
function BookingConfirmedModal({ booking, onClose }) {
  const qrCanvasRef = useRef(null);
  const verifyUrl = `https://www.outingstation.com/verify-ticket/${booking.bookingId}`;

  useEffect(() => {
    (async () => {
      try {
        const QRCode = (await import('qrcode')).default;
        if (qrCanvasRef.current) {
          await QRCode.toCanvas(qrCanvasRef.current, verifyUrl, {
            width: 100, margin: 1, color: { dark: '#9333ea', light: '#ffffff' },
          });
        }
      } catch (err) {
        console.error('QR error:', err);
      }
    })();
  }, [booking]);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 sticky top-0 bg-white z-10 rounded-t-3xl">
          <div className="flex items-center gap-2">
            <CheckCircle className="text-emerald-500" size={20} />
            <div>
              <p className="text-sm font-bold text-gray-900">Booking Confirmed!</p>
              <p className="text-xs text-gray-400">Check your email for details</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-full transition">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className="p-4">
          <div style={{
            background: 'linear-gradient(135deg, #a855f7 0%, #ec4899 100%)',
            borderRadius: 14, padding: '14px 16px', marginBottom: 12, position: 'relative', overflow: 'hidden',
          }}>
            <div style={{ position: 'absolute', top: -16, right: -16, width: 70, height: 70, borderRadius: '50%', background: 'rgba(255,255,255,0.1)' }} />
            <span style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 6, padding: '2px 8px', fontSize: 9, fontWeight: 800, color: 'white', letterSpacing: 1.5, textTransform: 'uppercase' }}>
              ✨ Experience
            </span>
            <p style={{ color: 'white', fontSize: 14, fontWeight: 800, margin: '10px 0 6px', lineHeight: 1.3 }}>{booking.experienceTitle}</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: 10 }}>📅 {booking.sessionDate}</span>
              <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: 10 }}>🕐 {booking.sessionTime}</span>
            </div>
          </div>

          <div style={{ background: 'white', borderRadius: 10, padding: '8px 12px', marginBottom: 10, border: '1.5px solid #f3e8ff', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontSize: 8, color: '#64748b', margin: '0 0 2px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8 }}>Booking ID</p>
              <p style={{ fontSize: 13, fontWeight: 900, color: '#9333ea', margin: 0, fontFamily: 'monospace', letterSpacing: 0.8 }}>{booking.bookingId}</p>
            </div>
            <div style={{ background: '#ecfdf5', borderRadius: 6, padding: '3px 8px', fontSize: 10, fontWeight: 800, color: '#059669' }}>✓ VALID</div>
          </div>

          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 10 }}>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 8, color: '#9ca3af', margin: '0 0 1px', textTransform: 'uppercase', letterSpacing: 0.8, fontWeight: 700 }}>Name</p>
              <p style={{ fontSize: 11, margin: '0 0 6px', color: '#111827', fontWeight: 500 }}>{booking.buyerName}</p>
              <p style={{ fontSize: 8, color: '#9ca3af', margin: '0 0 1px', textTransform: 'uppercase', letterSpacing: 0.8, fontWeight: 700 }}>Guests</p>
              <p style={{ fontSize: 11, margin: '0 0 6px', color: '#111827', fontWeight: 500 }}>{booking.guestCount}</p>
              <p style={{ fontSize: 8, color: '#9ca3af', margin: '0 0 1px', textTransform: 'uppercase', letterSpacing: 0.8, fontWeight: 700 }}>Paid</p>
              <p style={{ fontSize: 13, margin: 0, color: '#9333ea', fontWeight: 800 }}>₦{booking.amountPaid?.toLocaleString()}</p>
            </div>
            <div style={{ flexShrink: 0, textAlign: 'center' }}>
              <div style={{ background: 'white', padding: 6, borderRadius: 10, border: '1.5px solid #f3e8ff', display: 'inline-block' }}>
                <canvas ref={qrCanvasRef} style={{ width: 90, height: 90, display: 'block' }} />
              </div>
              <p style={{ fontSize: 8, color: '#94a3b8', marginTop: 4, textAlign: 'center' }}>Scan to verify</p>
            </div>
          </div>

          <div style={{ background: 'linear-gradient(135deg, #faf5ff, #fdf2f8)', borderRadius: 8, padding: '8px 10px', border: '1px solid #f3e8ff' }}>
            <p style={{ fontSize: 10, color: '#9333ea', margin: 0, lineHeight: 1.5 }}>
              🎉 Show this QR code or your Booking ID at the venue. Details also sent to your email.
            </p>
          </div>
        </div>

        <div className="px-4 pb-6 space-y-2">
          <button onClick={() => window.open(verifyUrl, '_blank')}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white py-2.5 rounded-xl text-sm font-semibold hover:shadow-lg transition">
            <ExternalLink size={15} /> View Booking Online
          </button>
          <button onClick={onClose} className="w-full py-2 text-gray-400 hover:text-gray-600 text-sm font-medium transition">Close</button>
        </div>
      </div>
    </div>
  );
}

export default function SessionBookingSection({ experience, currentUser, onBookingComplete }) {
  const sessions = experience.sessions || [];
  const now = new Date(new Date().toDateString());
  const upcomingSessions = sessions.filter(s => !s.date || new Date(s.date) >= now);

  const [selectedSessionId, setSelectedSessionId] = useState(upcomingSessions[0]?.id || '');
  const [buyerName, setBuyerName] = useState(currentUser?.displayName || '');
  const [buyerEmail, setBuyerEmail] = useState(currentUser?.email || '');
  const [buyerPhone, setBuyerPhone] = useState('');
  const [guestCount, setGuestCount] = useState(experience.minGuests || 1);
  const [showPaystackButton, setShowPaystackButton] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [bookingResult, setBookingResult] = useState(null);

  const bookingId = useRef(generateBookingId());
  const paymentRef = useRef(`OS-EXP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);

  const selectedSession = sessions.find(s => s.id === selectedSessionId);
  const spotsRemaining = selectedSession
    ? Math.max(0, (selectedSession.totalSpots || 0) - (selectedSession.bookedSpots || 0))
    : 0;

  const minGuests = experience.minGuests || 1;
  const maxGuestsAllowed = experience.maxGuests
    ? Math.min(experience.maxGuests, spotsRemaining || experience.maxGuests)
    : spotsRemaining;

  const pricePerPerson = experience.pricePerPerson || 0;
  const totalAmount = pricePerPerson * guestCount;

  useEffect(() => {
    setShowPaystackButton(false);
  }, [selectedSessionId, guestCount]);

  const isContactOnly = experience.bookingMethod === 'contact';

  const handleProceedToPayment = () => {
    if (!selectedSessionId) { toast.error('Please select a session'); return; }
    if (!buyerName || !buyerEmail || !buyerPhone) {
      toast.error('Please enter your name, email, and phone number');
      return;
    }
    if (guestCount < minGuests) { toast.error(`Minimum ${minGuests} guest(s) required`); return; }
    if (guestCount > spotsRemaining) { toast.error(`Only ${spotsRemaining} spot(s) left in this session`); return; }
    setShowPaystackButton(true);
  };

  const handlePaymentSuccess = (reference) => {
    const result = {
      bookingId: bookingId.current,
      experienceTitle: experience.title,
      sessionDate: formatSessionDate(selectedSession?.date),
      sessionTime: formatSessionTime(selectedSession?.time),
      buyerName, buyerEmail, buyerPhone,
      guestCount,
      amountPaid: totalAmount,
      paymentRef: reference.reference || paymentRef.current,
    };
    setBookingResult(result);
    setShowConfirmModal(true);
    toast.success('🎉 Booking confirmed! Check your email.', { duration: 5000 });
    if (onBookingComplete) onBookingComplete(selectedSessionId, guestCount);
  };

  const handlePaymentClose = () => {
    toast.error('Payment cancelled');
  };

  const paystackConfig = {
    reference: paymentRef.current,
    email: buyerEmail,
    amount: totalAmount * 100,
    publicKey: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY,
    metadata: {
      custom_fields: [
        { display_name: 'PurchaseType', variable_name: 'purchase_type', value: 'experience_booking' },
        { display_name: 'ExperienceID', variable_name: 'experience_id', value: experience.id },
        { display_name: 'SessionID', variable_name: 'session_id', value: selectedSessionId },
        { display_name: 'BookingID', variable_name: 'booking_id', value: bookingId.current },
        { display_name: 'Name', variable_name: 'buyer_name', value: buyerName },
        { display_name: 'Phone', variable_name: 'buyer_phone', value: buyerPhone },
        { display_name: 'Guests', variable_name: 'guest_count', value: String(guestCount) },
        { display_name: 'PricePerPerson', variable_name: 'price_per_person', value: String(pricePerPerson) },
        { display_name: 'Total', variable_name: 'total_amount', value: String(totalAmount) },
      ],
      purchase_type: 'experience_booking',
      experience_id: experience.id,
      session_id: selectedSessionId,
      booking_id: bookingId.current,
      total_amount: totalAmount,
    },
  };

  const whatsappHref = experience.organizerPhone
    ? `https://wa.me/${experience.organizerPhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hi, I'm interested in booking "${experience.title}" on OutingStation.`)}`
    : null;

  return (
    <>
      <div className="bg-white rounded-xl p-6 shadow-sm border-2 border-purple-100">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-2xl">✨</span>
          <h3 className="text-xl font-bold text-gray-900">Book a Session</h3>
        </div>

        {sessions.length === 0 ? (
          <div className="text-center py-8">
            <Calendar size={32} className="mx-auto text-gray-300 mb-2" />
            <p className="text-sm text-gray-500">No sessions scheduled yet — check back soon.</p>
          </div>
        ) : (
          <>
            {/* Session picker */}
            <div className="space-y-2 mb-4">
              <p className="text-sm font-bold text-gray-800 flex items-center gap-2">
                <Calendar size={16} className="text-purple-600" /> Select a Session
              </p>
              {sessions.map(session => {
                const remaining = Math.max(0, (session.totalSpots || 0) - (session.bookedSpots || 0));
                const isPast = session.date && new Date(session.date) < now;
                const soldOut = remaining === 0;
                const unavailable = isPast || soldOut;
                const isSelected = selectedSessionId === session.id;
                return (
                  <button
                    key={session.id}
                    type="button"
                    disabled={unavailable}
                    onClick={() => setSelectedSessionId(session.id)}
                    className={`w-full text-left p-3.5 rounded-xl border-2 transition-all ${
                      unavailable
                        ? 'border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed'
                        : isSelected
                        ? 'border-purple-500 bg-purple-50 shadow-md'
                        : 'border-gray-200 bg-white hover:border-purple-300 hover:bg-purple-50/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-bold text-gray-800">{formatSessionDate(session.date)}</p>
                        <p className="text-xs text-gray-500 flex items-center gap-1"><Clock size={11} /> {formatSessionTime(session.time)}</p>
                      </div>
                      <div className="text-right">
                        {isPast ? (
                          <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-semibold">Past</span>
                        ) : soldOut ? (
                          <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-semibold">Sold Out</span>
                        ) : (
                          <span className="text-xs text-purple-600 font-semibold">{remaining} spot{remaining !== 1 ? 's' : ''} left</span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {isContactOnly ? (
              /* Contact Host — no checkout, just a way to reach the host directly */
              <div className="bg-purple-50 border-2 border-purple-100 rounded-xl p-4">
                <p className="text-sm text-gray-700 mb-3">This host takes bookings directly — message them to confirm your spot.</p>
                <div className="flex gap-2">
                  {whatsappHref && (
                    <a href={whatsappHref} target="_blank" rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-2 bg-emerald-500 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-emerald-600 transition">
                      <MessageCircle size={16} /> WhatsApp
                    </a>
                  )}
                  {experience.organizerPhone && (
                    <a href={`tel:${experience.organizerPhone}`}
                      className="flex-1 flex items-center justify-center gap-2 bg-gray-100 text-gray-700 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-200 transition">
                      <Phone size={16} /> Call
                    </a>
                  )}
                </div>
              </div>
            ) : (
              <>
                <div className="space-y-3 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                    <input type="text" value={buyerName} onChange={(e) => setBuyerName(e.target.value)}
                      placeholder="John Doe"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-400 focus:border-transparent" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                    <input type="email" value={buyerEmail} onChange={(e) => setBuyerEmail(e.target.value)}
                      placeholder="john@example.com"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-400 focus:border-transparent" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number *</label>
                    <input type="tel" value={buyerPhone} onChange={(e) => setBuyerPhone(e.target.value)}
                      placeholder="+234 800 000 0000"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-400 focus:border-transparent" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 flex items-center gap-1.5">
                      <Users size={14} /> Number of Guests
                    </label>
                    <input type="number" value={guestCount}
                      onChange={(e) => setGuestCount(Math.max(minGuests, parseInt(e.target.value) || minGuests))}
                      min={minGuests} max={maxGuestsAllowed || minGuests}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-400 focus:border-transparent" />
                    {experience.maxGuests && (
                      <p className="text-xs text-gray-400 mt-1">Min {minGuests}, max {experience.maxGuests} per booking</p>
                    )}
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">₦{pricePerPerson.toLocaleString()} × {guestCount} guest{guestCount !== 1 ? 's' : ''}</span>
                    <span className="font-medium">₦{totalAmount.toLocaleString()}</span>
                  </div>
                  <div className="border-t pt-2 mt-2 flex justify-between">
                    <span className="font-bold text-gray-900">Total:</span>
                    <span className="font-bold text-purple-600 text-lg">₦{totalAmount.toLocaleString()}</span>
                  </div>
                </div>

                {spotsRemaining > 0 ? (
                  showPaystackButton ? (
                    <PaystackButton
                      {...paystackConfig}
                      text={`Pay ₦${totalAmount.toLocaleString()}`}
                      onSuccess={handlePaymentSuccess}
                      onClose={handlePaymentClose}
                      className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 rounded-xl font-semibold hover:shadow-lg transition"
                    />
                  ) : (
                    <button onClick={handleProceedToPayment}
                      className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 rounded-xl font-semibold hover:shadow-lg transition flex items-center justify-center gap-2">
                      Proceed to Payment
                    </button>
                  )
                ) : (
                  <button disabled className="w-full bg-gray-300 text-gray-500 py-3 rounded-xl font-semibold cursor-not-allowed">
                    {selectedSessionId ? 'Session Full' : 'Select a Session'}
                  </button>
                )}

                <p className="text-xs text-gray-500 text-center mt-3">🔒 Secure payment powered by Paystack</p>
              </>
            )}
          </>
        )}
      </div>

      {showConfirmModal && bookingResult && (
        <BookingConfirmedModal booking={bookingResult} onClose={() => setShowConfirmModal(false)} />
      )}
    </>
  );
}