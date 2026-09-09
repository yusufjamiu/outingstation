import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { AlertTriangle, MapPin, Car, CheckCircle2, XCircle } from 'lucide-react';

// ✅ NEW — the admin-side half of closing the dispute-visibility gap.
// notify-dispute.js already emails admin the moment a guest reports an
// issue; this is where admin actually SEES and works through the full
// list, rather than only ever hearing about one at a time via email.
//
// ⚠️ HONEST SCOPE NOTE — "Resolve" here only ever writes a resolution
// NOTE (disputeStatus: 'resolved_refund_guest' | 'resolved_release_owner')
// and a timestamp. It does NOT itself trigger a refund or a transfer —
// refund.js and transfer.js don't exist yet. This screen records the
// admin's DECISION; actually executing that decision (moving money) is
// separate work still ahead. Marking this clearly in the UI itself
// (not just this comment) so nobody mistakes "Resolved" here for "money
// has moved."

export default function AdminDisputes() {
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [resolvingId, setResolvingId] = useState('');
  const [showResolved, setShowResolved] = useState(false);

  useEffect(() => { loadDisputes(); }, []);

  const loadDisputes = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(query(collection(db, 'bookings'), where('disputeStatus', '!=', null)));
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setDisputes(list);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  // ✅ Records the admin's decision only — see the scope note at the top
  // of this file. `isAdmin()` has unrestricted write access to bookings/
  // in the Firestore rules, same override every other admin action in
  // this codebase already relies on.
  const resolveDispute = async (bookingId, decision) => {
    setResolvingId(bookingId);
    try {
      await updateDoc(doc(db, 'bookings', bookingId), {
        disputeStatus: decision, // 'resolved_refund_guest' | 'resolved_release_owner'
        disputeResolvedAt: serverTimestamp(),
      });
      setDisputes(prev => prev.map(d => d.id === bookingId ? { ...d, disputeStatus: decision } : d));

      // ✅ NEW — tells the GUEST the outcome. Fire-and-forget, same
      // pattern as notify-dispute.js's own call site — a failed email
      // never undoes the resolution itself, which is already recorded
      // above regardless. See notify-dispute-resolved.js's file-level
      // comment for the honest gap on why this can't also email the
      // owner yet.
      const resolved = disputes.find(d => d.id === bookingId);
      if (resolved) {
        fetch('https://www.outingstation.com/api/notify-dispute-resolved', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bookingId,
            listingTitle: resolved.listingTitle,
            guestEmail: resolved.guestEmail,
            amount: resolved.amount,
            decision,
          }),
        }).catch(err => console.error('notify-dispute-resolved failed:', err));
      }

      // ✅ FIXED — this button previously only ever recorded the
      // decision in Firestore; nothing here actually moved any money.
      // Now, siding with the guest triggers refund.js with
      // source: 'admin_dispute', which refunds the FULL subtotal (not a
      // cancellation-policy percentage — a dispute isn't a timing
      // calculation, it's admin's judgment that the guest is owed it
      // back). refund.js independently re-verifies the booking's
      // disputeStatus is actually 'resolved_refund_guest' before doing
      // anything — this call is just the trigger, not the authority.
      if (decision === 'resolved_refund_guest') {
        fetch('https://www.outingstation.com/api/refund', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bookingId, source: 'admin_dispute' }),
        }).catch(err => console.error('refund trigger failed:', err));
      }
    } catch (err) {
      console.error(err);
      alert('Failed to update dispute. Please try again.');
    }
    setResolvingId('');
  };

  const visibleDisputes = disputes.filter(d =>
    showResolved ? d.disputeStatus?.startsWith('resolved') : d.disputeStatus === 'reported'
  );

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-black text-gray-900 flex items-center gap-2">
            <AlertTriangle size={22} className="text-red-500" /> Disputes
          </h1>
          <p className="text-sm text-gray-500 mt-1">Booking issues guests have reported, awaiting review.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowResolved(false)}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition ${!showResolved ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-600'}`}
          >
            Open
          </button>
          <button
            onClick={() => setShowResolved(true)}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition ${showResolved ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-600'}`}
          >
            Resolved
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-gray-400">Loading...</p>
      ) : visibleDisputes.length === 0 ? (
        <div className="bg-white rounded-3xl border-2 border-gray-100 p-10 text-center">
          <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={22} className="text-gray-300" />
          </div>
          <h4 className="font-bold text-gray-800 mb-1">{showResolved ? 'No resolved disputes yet' : 'No open disputes'}</h4>
          <p className="text-sm text-gray-400">{showResolved ? '' : "You're all caught up."}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {visibleDisputes.map(d => {
            const isShortlet = d.type === 'shortlet';
            const isResolving = resolvingId === d.id;
            return (
              <div key={d.id} className="bg-white rounded-2xl border-2 border-red-100 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    {isShortlet ? <MapPin size={16} className="text-amber-600" /> : <Car size={16} className="text-cyan-600" />}
                    <div>
                      <p className="font-bold text-gray-900 text-sm">{d.listingTitle}</p>
                      <p className="text-xs text-gray-400">{isShortlet ? 'Shortlet' : 'Ride'} · {d.guestEmail}</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-gray-50 text-gray-600 flex-shrink-0">
                    ₦{Number(d.amount || 0).toLocaleString()}
                  </span>
                </div>

                <div className="mt-3 bg-red-50 border border-red-100 rounded-xl p-3">
                  <p className="text-xs font-bold text-red-700 mb-1">Guest's report:</p>
                  <p className="text-sm text-red-900">{d.disputeReason}</p>
                </div>

                <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
                  <span>Owner would receive: <strong className="text-gray-700">₦{Number(d.ownerPayout || 0).toLocaleString()}</strong></span>
                  <span className="font-mono text-gray-400">{d.id}</span>
                </div>

                {d.disputeStatus === 'reported' ? (
                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={() => resolveDispute(d.id, 'resolved_refund_guest')}
                      disabled={isResolving}
                      className="flex-1 flex items-center justify-center gap-2 bg-blue-50 text-blue-700 py-2.5 rounded-xl text-sm font-bold hover:bg-blue-100 transition disabled:opacity-50"
                    >
                      <XCircle size={15} /> Side with Guest (Refund)
                    </button>
                    <button
                      onClick={() => resolveDispute(d.id, 'resolved_release_owner')}
                      disabled={isResolving}
                      className="flex-1 flex items-center justify-center gap-2 bg-emerald-50 text-emerald-700 py-2.5 rounded-xl text-sm font-bold hover:bg-emerald-100 transition disabled:opacity-50"
                    >
                      <CheckCircle2 size={15} /> Side with Owner (Release)
                    </button>
                  </div>
                ) : (
                  <div className="mt-4 bg-gray-50 rounded-xl px-3 py-2.5 flex items-center gap-2">
                    {d.disputeStatus === 'resolved_refund_guest' ? (
                      <XCircle size={14} className="text-blue-600" />
                    ) : (
                      <CheckCircle2 size={14} className="text-emerald-600" />
                    )}
                    <p className="text-xs font-bold text-gray-700">
                      Resolved — {d.disputeStatus === 'resolved_refund_guest' ? 'sided with guest (refund pending)' : 'sided with owner (release pending)'}
                    </p>
                  </div>
                )}
                {/* ⚠️ Honest, visible scope note — see file-level comment. */}
                {d.disputeStatus === 'reported' && (
                  <p className="mt-2 text-[11px] text-gray-400">
                    This records your decision only — the actual refund/transfer isn't automated yet.
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}