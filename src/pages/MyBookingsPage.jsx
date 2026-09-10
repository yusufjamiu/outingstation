import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { X, MapPin, Phone, Car, Home as HomeIcon } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

// ✅ NEW — the web half of My Bookings. Web guests have had zero way to
// see or manage a booking until now; only my_bookings_screen.dart
// (Flutter) had this. Mirrors that screen's logic exactly — same status
// states, same reveal-after-payment rules, same cancellation policy math
// — so a guest gets an identical experience regardless of platform.
//
// ⚠️ Same honesty as the Flutter screen: tapping "Yes" here only ever
// writes confirmationStatus: 'confirmed' to Firestore — it does not
// itself release escrow or trigger a payout, since transfer.js and the
// logic that watches for that status change don't exist yet.

const _kShortletBrown = '#B45309';
const _kRideBlue = '#1D4ED8';

function StatusPill({ booking }) {
  const paymentStatus = booking.paymentStatus || 'pending';
  const confirmationStatus = booking.confirmationStatus || 'pending';
  const disputeStatus = booking.disputeStatus;

  let color, bg, label;
  if (disputeStatus === 'resolved_refund_guest') {
    color = '#1D4ED8'; bg = '#DBEAFE'; label = 'Refund Approved';
  } else if (disputeStatus === 'resolved_release_owner') {
    color = '#15803D'; bg = '#DCFCE7'; label = 'Resolved';
  } else if (disputeStatus === 'reported') {
    color = '#DC2626'; bg = '#FEE2E2'; label = 'Issue Reported';
  } else if (confirmationStatus === 'cancelled') {
    const isRefunded = booking.refundStatus === 'refunded';
    color = isRefunded ? '#1D4ED8' : '#64748B';
    bg = isRefunded ? '#DBEAFE' : '#F1F5F9';
    label = isRefunded ? 'Refunded' : 'Cancelled';
  } else if (paymentStatus !== 'paid') {
    color = '#C2410C'; bg = '#FFEDD5'; label = 'Payment Pending';
  } else if (confirmationStatus === 'confirmed') {
    color = '#15803D'; bg = '#DCFCE7'; label = 'Completed';
  } else {
    color = '#1D4ED8'; bg = '#DBEAFE'; label = 'Held in Escrow';
  }

  return (
    <span className="text-[10px] font-bold px-2 py-1 rounded-full flex-shrink-0" style={{ color, backgroundColor: bg }}>
      {label}
    </span>
  );
}

// Same policy tiers established throughout this build (Shortlet's
// flexible/moderate/strict, Ride's flat 2hr/1hr) — kept in sync
// deliberately with refund.js's own copy of this same calculation.
// This is only ever a PREVIEW shown to the guest; refund.js recalculates
// authoritatively, server-side, off its own copy of the data.
function calculateRefundPercentage({ isShortlet, cancellationPolicy, hoursUntil }) {
  if (hoursUntil === null) return 0;
  if (isShortlet) {
    const days = hoursUntil / 24;
    switch (cancellationPolicy) {
      case 'strict': return days >= 14 ? 1.0 : 0.0;
      case 'moderate':
        if (days >= 7) return 1.0;
        if (days >= 3) return 0.5;
        return 0.0;
      case 'flexible':
      default:
        if (hoursUntil >= 48) return 1.0;
        if (hoursUntil >= 24) return 0.5;
        return 0.0;
    }
  } else {
    if (hoursUntil >= 2) return 1.0;
    if (hoursUntil >= 1) return 0.5;
    return 0.0;
  }
}

function BookingDetailModal({ booking: initialBooking, onClose, onUpdated }) {
  const [booking, setBooking] = useState(initialBooking);
  const [listingData, setListingData] = useState(null);
  const [loadingListing, setLoadingListing] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showReportForm, setShowReportForm] = useState(false);
  const [reportReason, setReportReason] = useState('');

  const isShortlet = booking.type === 'shortlet';
  const accent = isShortlet ? _kShortletBrown : _kRideBlue;
  const isPaid = booking.paymentStatus === 'paid';

  useEffect(() => {
    const loadListing = async () => {
      try {
        const collectionName = isShortlet ? 'shortlets' : 'rides';
        const listingDoc = await getDoc(doc(db, collectionName, booking.listingId));
        setListingData(listingDoc.exists() ? listingDoc.data() : null);
      } catch (err) {
        console.error(err);
      }
      setLoadingListing(false);
    };
    loadListing();
  }, [booking.listingId, isShortlet]);

  const hoursUntil = (() => {
    const relevantDate = isShortlet ? booking.checkInDate : booking.tripDateTime;
    if (!relevantDate) return null;
    return (relevantDate.toDate().getTime() - Date.now()) / (1000 * 60 * 60);
  })();

  const refundPercentage = calculateRefundPercentage({
    isShortlet,
    cancellationPolicy: listingData?.cancellationPolicy || 'flexible',
    hoursUntil,
  });

  const canCancel = isPaid
    && booking.confirmationStatus !== 'confirmed'
    && booking.confirmationStatus !== 'cancelled'
    && booking.disputeStatus !== 'reported';

  const showsConfirmPrompt = (() => {
    if (!isPaid) return false;
    if (booking.confirmationStatus === 'confirmed') return false;
    if (booking.confirmationStatus === 'cancelled') return false;
    if (booking.disputeStatus === 'reported') return false;
    const now = new Date();
    if (isShortlet) {
      if (!booking.checkInDate) return false;
      const checkIn = booking.checkInDate.toDate();
      return now > new Date(checkIn.getTime() + 24 * 60 * 60 * 1000);
    } else {
      if (!booking.tripDateTime) return false;
      return now > booking.tripDateTime.toDate();
    }
  })();

  const handleCancel = async () => {
    const subtotal = booking.subtotal || 0;
    const refundPreview = Math.round(subtotal * refundPercentage);
    const message = refundPercentage > 0
      ? `Based on the cancellation policy, you'll receive ₦${refundPreview.toLocaleString()} back (${Math.round(refundPercentage * 100)}% of the ${isShortlet ? 'stay cost' : 'trip fare'}). The service fee is never refunded. This can't be undone.`
      : `Based on the cancellation policy, this cancellation is not eligible for a refund. This can't be undone.`;
    if (!window.confirm(`Cancel this booking?\n\n${message}`)) return;

    setSubmitting(true);
    try {
      await updateDoc(doc(db, 'bookings', booking.id), { confirmationStatus: 'cancelled' });
      setBooking(prev => ({ ...prev, confirmationStatus: 'cancelled' }));
      onUpdated();

      fetch('https://www.outingstation.com/api/refund', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId: booking.id }),
      }).catch(err => console.error('refund trigger failed:', err));

      alert('Booking cancelled. Your refund is being processed.');
    } catch (err) {
      console.error(err);
      alert('Something went wrong. Please try again.');
    }
    setSubmitting(false);
  };

  const handleConfirmSuccess = async () => {
    if (!window.confirm(
      isShortlet
        ? "This releases your host's payment and can't be undone. Only confirm if you actually checked in successfully."
        : "This releases the driver's payment and can't be undone. Only confirm if your trip actually happened."
    )) return;

    setSubmitting(true);
    try {
      await updateDoc(doc(db, 'bookings', booking.id), { confirmationStatus: 'confirmed' });
      setBooking(prev => ({ ...prev, confirmationStatus: 'confirmed' }));
      onUpdated();
      alert('Thanks for confirming!');
    } catch (err) {
      console.error(err);
      alert('Something went wrong. Please try again.');
    }
    setSubmitting(false);
  };

  const handleReportIssue = async () => {
    if (!reportReason.trim()) return;
    setSubmitting(true);
    try {
      await updateDoc(doc(db, 'bookings', booking.id), {
        disputeStatus: 'reported',
        disputeReason: reportReason.trim(),
      });
      setBooking(prev => ({ ...prev, disputeStatus: 'reported', disputeReason: reportReason.trim() }));
      onUpdated();

      // ✅ FIXED — was calling the now-removed /api/notify-dispute
      // (merged into /api/notify to stay under Vercel's 12-function
      // Hobby limit). booking.type renamed to bookingType to avoid
      // colliding with the new dispatch 'type' field.
      fetch('https://www.outingstation.com/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'dispute_reported',
          bookingId: booking.id,
          listingTitle: booking.listingTitle,
          guestEmail: booking.guestEmail,
          amount: booking.amount,
          disputeReason: reportReason.trim(),
          bookingType: booking.type,
        }),
      }).catch(err => console.error('notify (dispute_reported) failed:', err));

      setShowReportForm(false);
      alert('Issue reported. Our team will review it.');
    } catch (err) {
      console.error(err);
      alert('Something went wrong. Please try again.');
    }
    setSubmitting(false);
  };

  const fmtDate = (ts) => ts ? ts.toDate().toLocaleDateString() : '—';
  const fmtDateTime = (ts) => ts ? ts.toDate().toLocaleString() : '—';

  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-md max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-white flex justify-between items-center p-4 border-b border-gray-100 z-10">
          <p className="text-sm font-bold text-gray-900">Booking Details</p>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-full transition"><X size={18} /></button>
        </div>

        <div className="p-5">
          <div className="flex items-center gap-3 mb-2">
            {booking.listingImage && (
              <img src={booking.listingImage} alt={booking.listingTitle} className="w-16 h-16 rounded-xl object-cover" />
            )}
            <div>
              <p className="text-base font-bold text-gray-900">{booking.listingTitle}</p>
              <div className="mt-1"><StatusPill booking={booking} /></div>
            </div>
          </div>

          {isShortlet ? (
            <>
              <p className="text-xs text-gray-500 mt-4 mb-1 font-bold">Check-in / Check-out</p>
              <p className="text-sm text-gray-800 mb-4">{fmtDate(booking.checkInDate)} → {fmtDate(booking.checkOutDate)}</p>
            </>
          ) : (
            <>
              <p className="text-xs text-gray-500 mt-4 mb-1 font-bold">Trip Date</p>
              <p className="text-sm text-gray-800 mb-4">{fmtDateTime(booking.tripDateTime)}</p>
            </>
          )}

          {isShortlet && (
            <div className="bg-gray-50 rounded-xl p-3 mb-4">
              <p className="text-xs font-bold text-gray-700 flex items-center gap-1 mb-1"><MapPin size={12} /> Location</p>
              {loadingListing ? (
                <p className="text-xs text-gray-400">Loading...</p>
              ) : !isPaid ? (
                <p className="text-xs text-gray-500">Full address will be shown once your payment is confirmed.</p>
              ) : (
                <p className="text-sm text-gray-800 font-semibold">{listingData?.fullAddress || 'Address not available — contact the host via the agency.'}</p>
              )}
            </div>
          )}

          {!isShortlet && (
            <div className="bg-gray-50 rounded-xl p-3 mb-4">
              <p className="text-xs font-bold text-gray-700 flex items-center gap-1 mb-1"><Car size={12} /> Driver</p>
              {!isPaid ? (
                <p className="text-xs text-gray-500">Driver details will be shared once your payment is confirmed.</p>
              ) : booking.assignedDriverName ? (
                <div className="flex items-center gap-2">
                  <div>
                    <p className="text-sm font-bold text-gray-800">{booking.assignedDriverName}</p>
                    {booking.assignedDriverPhone && (
                      <p className="text-xs text-gray-500 flex items-center gap-1"><Phone size={10} /> {booking.assignedDriverPhone}</p>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-gray-500">A driver will be assigned by the agency closer to your trip.</p>
              )}
            </div>
          )}

          <div className="bg-white border border-gray-200 rounded-xl p-3 mb-4 space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">{isShortlet ? 'Stay cost' : 'Trip fare'}</span>
              <span className="text-gray-800">₦{Number(booking.subtotal || 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Service fee (non-refundable)</span>
              <span className="text-gray-800">₦{Number(booking.platformFee || 0).toLocaleString()}</span>
            </div>
            <div className="border-t border-gray-100 pt-1.5 flex justify-between text-sm font-bold">
              <span className="text-gray-900">Total Paid</span>
              <span style={{ color: accent }}>₦{Number(booking.amount || 0).toLocaleString()}</span>
            </div>
          </div>

          {canCancel && (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 mb-4">
              <p className="text-xs text-gray-600 mb-2">
                {refundPercentage > 0
                  ? `Cancelling now refunds ${Math.round(refundPercentage * 100)}% of the ${isShortlet ? 'stay cost' : 'trip fare'} (service fee is never refunded).`
                  : 'Cancelling now is not eligible for a refund, based on the cancellation policy.'}
              </p>
              <button
                onClick={handleCancel}
                disabled={submitting}
                className="w-full border border-red-500 text-red-600 text-sm font-bold py-2 rounded-xl hover:bg-red-50 transition disabled:opacity-50"
              >
                Cancel Booking
              </button>
            </div>
          )}

          {(booking.disputeStatus === 'reported' || (booking.disputeStatus || '').startsWith('resolved')) && (
            <div className={`rounded-xl p-3 mb-4 ${booking.disputeStatus === 'reported' ? 'bg-red-50' : 'bg-green-50'}`}>
              <p className={`text-xs font-bold mb-1 ${booking.disputeStatus === 'reported' ? 'text-red-700' : 'text-green-700'}`}>
                {booking.disputeStatus === 'reported' ? 'Issue Reported' : 'Issue Resolved'}
              </p>
              <p className="text-xs text-gray-700 mb-1">{booking.disputeReason}</p>
              <p className={`text-[11px] ${booking.disputeStatus === 'reported' ? 'text-red-600' : 'text-green-700'}`}>
                {booking.disputeStatus === 'reported'
                  ? 'Payment is on hold while our team reviews this.'
                  : booking.disputeStatus === 'resolved_refund_guest'
                    ? 'Our team reviewed this and approved a refund.'
                    : "Our team reviewed this and released the host's payment."}
              </p>
            </div>
          )}

          {showsConfirmPrompt && (
            <div className="rounded-xl p-4 mb-2" style={{ backgroundColor: `${accent}0F` }}>
              <p className="text-sm font-bold text-gray-900">{isShortlet ? 'Did you check in successfully?' : 'Was your ride completed?'}</p>
              <p className="text-[11px] text-gray-500 mt-1 mb-3">This cannot be reversed once confirmed — only tap Yes if it actually happened.</p>
              {!showReportForm ? (
                <div className="flex gap-2">
                  <button onClick={handleConfirmSuccess} disabled={submitting} className="flex-1 bg-green-600 text-white text-sm font-bold py-2 rounded-xl hover:bg-green-700 transition disabled:opacity-50">Yes</button>
                  <button onClick={() => setShowReportForm(true)} disabled={submitting} className="flex-1 border border-red-500 text-red-600 text-sm font-bold py-2 rounded-xl hover:bg-red-50 transition disabled:opacity-50">Report Issue</button>
                </div>
              ) : (
                <div className="space-y-2">
                  <textarea
                    value={reportReason}
                    onChange={e => setReportReason(e.target.value)}
                    placeholder="What went wrong?"
                    rows={3}
                    className="w-full border border-gray-300 rounded-lg text-sm p-2"
                  />
                  <div className="flex gap-2">
                    <button onClick={() => setShowReportForm(false)} className="flex-1 border border-gray-200 text-gray-600 text-sm py-2 rounded-xl">Cancel</button>
                    <button onClick={handleReportIssue} disabled={submitting || !reportReason.trim()} className="flex-1 bg-red-600 text-white text-sm font-bold py-2 rounded-xl hover:bg-red-700 transition disabled:opacity-50">Submit</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MyBookingsPage() {
  const { currentUser } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('active');
  const [selectedBooking, setSelectedBooking] = useState(null);

  useEffect(() => { loadBookings(); }, [currentUser]);

  const loadBookings = async () => {
    if (!currentUser) { setLoading(false); return; }
    setLoading(true);
    try {
      const snap = await getDocs(query(collection(db, 'bookings'), where('guestId', '==', currentUser.uid)));
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setBookings(list);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const activeBookings = bookings.filter(b => b.paymentStatus === 'paid' && b.confirmationStatus !== 'confirmed' && b.confirmationStatus !== 'cancelled');
  const completedBookings = bookings.filter(b => b.confirmationStatus === 'confirmed' || b.confirmationStatus === 'cancelled');
  const pendingBookings = bookings.filter(b => b.paymentStatus !== 'paid');

  const visibleBookings = tab === 'active' ? activeBookings : tab === 'completed' ? completedBookings : pendingBookings;

  const handleUpdated = () => {
    loadBookings();
    if (selectedBooking) {
      getDoc(doc(db, 'bookings', selectedBooking.id)).then(snap => {
        if (snap.exists()) setSelectedBooking({ id: snap.id, ...snap.data() });
      });
    }
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-2xl mx-auto px-4 py-24 text-center">
          <p className="text-lg font-bold text-gray-800">Please log in to view your bookings.</p>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-xl font-black text-gray-900 mb-4">My Bookings</h1>

        <div className="flex gap-2 mb-6">
          {[['active', 'Active'], ['completed', 'Completed'], ['pending', 'Pending']].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition ${tab === key ? 'bg-gray-900 text-white' : 'bg-white text-gray-500 border border-gray-200'}`}
            >
              {label}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-sm text-gray-400">Loading...</p>
        ) : visibleBookings.length === 0 ? (
          <div className="bg-white rounded-3xl border-2 border-gray-100 p-10 text-center">
            <p className="text-sm text-gray-400">
              {tab === 'active' ? 'No active bookings yet.' : tab === 'completed' ? 'No completed bookings yet.' : 'No pending payments.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {visibleBookings.map(b => {
              const isShortlet = b.type === 'shortlet';
              const subtitle = isShortlet
                ? (b.checkInDate && b.checkOutDate ? `${b.checkInDate.toDate().toLocaleDateString()} → ${b.checkOutDate.toDate().toLocaleDateString()}` : 'Dates unavailable')
                : (b.tripDateTime ? b.tripDateTime.toDate().toLocaleString() : 'Trip date unavailable');
              return (
                <button
                  key={b.id}
                  onClick={() => setSelectedBooking(b)}
                  className="w-full bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3 text-left hover:border-gray-300 transition"
                >
                  {b.listingImage ? (
                    <img src={b.listingImage} alt={b.listingTitle} className="w-14 h-14 rounded-xl object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-14 h-14 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
                      {isShortlet ? <HomeIcon size={20} className="text-gray-400" /> : <Car size={20} className="text-gray-400" />}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900 truncate">{b.listingTitle}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <StatusPill booking={b} />
                      <span className="text-xs font-bold" style={{ color: isShortlet ? _kShortletBrown : _kRideBlue }}>
                        ₦{Number(b.amount || 0).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
      <Footer />

      {selectedBooking && (
        <BookingDetailModal
          booking={selectedBooking}
          onClose={() => setSelectedBooking(null)}
          onUpdated={handleUpdated}
        />
      )}
    </div>
  );
}