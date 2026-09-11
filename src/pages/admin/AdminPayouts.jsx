import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { Wallet, MapPin, Car, CheckCircle2 } from 'lucide-react';

// ✅ CHANGED — was Payouts-only. Now covers Refunds too, since refunds
// are now ALSO fully manual (refund.js no longer calls Paystack's
// Refund API automatically — see its own comment for why: genuine
// uncertainty around settlement-based refund deduction once money has
// actually reached the bank, not yet proven by a real test). Same
// underlying reasoning as Payouts: better to have a human confirm each
// one right now than risk something failing silently days after a
// guest expects their money.
//
// ⚠️ One real difference between the two sections below, worth knowing:
// - PAYOUTS have no webhook watching for them — Transfers aren't
//   happening at all yet, so "Mark as Paid" is the ONLY way this ever
//   gets recorded as done.
// - REFUNDS still get created through Paystack's own system once admin
//   processes one by hand in their dashboard — and Paystack fires the
//   same refund.processed webhook regardless of whether a refund was
//   created via API or manually in the dashboard. So a refund's status
//   updates to 'refunded' AUTOMATICALLY once it actually completes —
//   the "Mark as Refunded" button in that section is a manual override
//   for edge cases (e.g. the webhook didn't fire for some reason), not
//   the primary way it's expected to resolve.

export default function AdminPayouts() {
  const [tab, setTab] = useState('payouts'); // 'payouts' | 'refunds'
  const [statusView, setStatusView] = useState('owed'); // 'owed' | 'done'
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState('');

  useEffect(() => { loadBookings(); }, [tab]);

  const loadBookings = async () => {
    setLoading(true);
    try {
      if (tab === 'payouts') {
        const snap = await getDocs(query(collection(db, 'bookings'), where('confirmationStatus', '==', 'confirmed')));
        const list = snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(b => b.payoutStatus === 'manual_pending' || b.payoutStatus === 'paid_out')
          .sort((a, b) => (b.payoutMarkedAt?.seconds || 0) - (a.payoutMarkedAt?.seconds || 0));

        // ✅ NEW — closes the "only shows bank NAME, not the account
        // number" gap. Unlike a refund (which goes back to the guest's
        // original payment method automatically — nothing to look up),
        // a payout genuinely needs admin to see the owner's actual
        // account number to send it manually. Fetched from the SAME
        // businesses/ doc osb_profile_screen.dart's Payout section
        // already writes bankAccountNumber/bankName/accountName to —
        // one fetch per unique agency, not per booking, to avoid
        // hitting Firestore once per row for agencies that appear
        // multiple times in this list.
        const agencyIds = [...new Set(list.map(b => b.agencyId).filter(Boolean))];
        const agencyBankDetails = {};
        await Promise.all(agencyIds.map(async (agencyId) => {
          try {
            const bizDoc = await getDoc(doc(db, 'businesses', agencyId));
            if (bizDoc.exists()) {
              const biz = bizDoc.data();
              agencyBankDetails[agencyId] = {
                bankName: biz.bankName || 'Not set',
                accountNumber: biz.bankAccountNumber || 'Not set',
                accountName: biz.accountName || '',
              };
            }
          } catch (err) {
            console.error(`Failed to load bank details for agency ${agencyId}:`, err);
          }
        }));

        setBookings(list.map(b => ({ ...b, _bankDetails: agencyBankDetails[b.agencyId] || null })));
      } else {
        // ✅ NEW — refunds. No single "== confirmed" filter to start
        // from since a refund can happen on a booking at any
        // confirmation stage; filters directly on refundStatus instead.
        const snap = await getDocs(query(collection(db, 'bookings'), where('refundStatus', 'in', ['manual_pending', 'refunded'])));
        const list = snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .sort((a, b) => (b.cancelledAt?.seconds || 0) - (a.cancelledAt?.seconds || 0));
        setBookings(list);
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const markPayoutPaid = async (bookingId) => {
    if (!window.confirm('Confirm you have ALREADY sent this payment manually in Paystack? This cannot be undone from here.')) return;
    setActingId(bookingId);
    try {
      await updateDoc(doc(db, 'bookings', bookingId), { payoutStatus: 'paid_out', payoutMarkedAt: serverTimestamp() });
      setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, payoutStatus: 'paid_out' } : b));
    } catch (err) {
      console.error(err);
      alert('Failed to update. Please try again.');
    }
    setActingId('');
  };

  // ✅ Manual override — see file-level comment. Normally
  // paystack-webhook.js's refund.processed branch does this
  // automatically once the refund actually completes.
  const markRefundDone = async (bookingId) => {
    if (!window.confirm('Confirm you have ALREADY processed this refund manually in Paystack? This cannot be undone from here.')) return;
    setActingId(bookingId);
    try {
      await updateDoc(doc(db, 'bookings', bookingId), { refundStatus: 'refunded' });
      setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, refundStatus: 'refunded' } : b));
    } catch (err) {
      console.error(err);
      alert('Failed to update. Please try again.');
    }
    setActingId('');
  };

  const isPayouts = tab === 'payouts';
  const owedField = isPayouts ? 'payoutStatus' : 'refundStatus';
  const doneValue = isPayouts ? 'paid_out' : 'refunded';
  const amountField = isPayouts ? 'ownerPayout' : 'refundAmount';

  const visible = bookings.filter(b => statusView === 'owed' ? b[owedField] === 'manual_pending' : b[owedField] === doneValue);
  const totalOwed = bookings.filter(b => b[owedField] === 'manual_pending').reduce((sum, b) => sum + Number(b[amountField] || 0), 0);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-xl font-black text-gray-900 flex items-center gap-2">
            <Wallet size={22} className="text-cyan-500" /> Money
          </h1>
          <p className="text-sm text-gray-500 mt-1">Payouts to owners and refunds to guests — both fully manual pending Paystack Compliance approval.</p>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        {[['payouts', 'Payouts (to owners)'], ['refunds', 'Refunds (to guests)']].map(([key, label]) => (
          <button
            key={key}
            onClick={() => { setTab(key); setStatusView('owed'); }}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition ${tab === key ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600'}`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setStatusView('owed')}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition ${statusView === 'owed' ? (isPayouts ? 'bg-cyan-500 text-white' : 'bg-red-500 text-white') : 'bg-gray-100 text-gray-600'}`}
        >
          Owed
        </button>
        <button
          onClick={() => setStatusView('done')}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition ${statusView === 'done' ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-600'}`}
        >
          {isPayouts ? 'Paid' : 'Refunded'}
        </button>
      </div>

      {statusView === 'owed' && totalOwed > 0 && (
        <div className={`rounded-2xl px-5 py-4 mb-6 border ${isPayouts ? 'bg-cyan-50 border-cyan-200' : 'bg-red-50 border-red-200'}`}>
          <p className={`text-xs font-bold uppercase tracking-wide ${isPayouts ? 'text-cyan-700' : 'text-red-700'}`}>Total currently owed</p>
          <p className={`text-2xl font-black mt-1 ${isPayouts ? 'text-cyan-900' : 'text-red-900'}`}>₦{totalOwed.toLocaleString()}</p>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-gray-400">Loading...</p>
      ) : visible.length === 0 ? (
        <div className="bg-white rounded-3xl border-2 border-gray-100 p-10 text-center">
          <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={22} className="text-gray-300" />
          </div>
          <h4 className="font-bold text-gray-800 mb-1">{statusView === 'owed' ? 'Nothing owed right now' : 'Nothing marked done yet'}</h4>
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map(b => {
            const isShortlet = b.type === 'shortlet';
            const isActing = actingId === b.id;
            return (
              <div key={b.id} className="bg-white rounded-2xl border-2 border-gray-100 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    {isShortlet ? <MapPin size={16} className="text-amber-600" /> : <Car size={16} className="text-cyan-600" />}
                    <div>
                      <p className="font-bold text-gray-900 text-sm">{b.listingTitle}</p>
                      <p className="text-xs text-gray-400">
                        {isPayouts ? (b.agencyName || 'Unknown agency') : b.guestEmail} · {isShortlet ? 'Shortlet' : 'Ride'}
                      </p>
                    </div>
                  </div>
                  <span className={`text-lg font-black flex-shrink-0 ${isPayouts ? 'text-cyan-600' : 'text-red-600'}`}>
                    ₦{Number(b[amountField] || 0).toLocaleString()}
                  </span>
                </div>

                <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
                  {!isPayouts && <span className="font-mono">{b.paymentReference}</span>}
                  <span className="font-mono text-gray-400">{b.id}</span>
                </div>

                {/* ✅ CHANGED — refunds no longer go through Paystack's
                    own refund mechanism at all (same balance/settlement
                    risk either way, automatic or manual-in-dashboard).
                    Now sent as a direct bank transfer, same as an owner
                    payout, using the account details the GUEST provided
                    directly at cancellation time — this is the
                    PRIMARY info admin needs to actually send it. */}
                {!isPayouts && (
                  <div className="mt-2 bg-gray-50 rounded-lg px-3 py-2">
                    {b.refundBankName && b.refundAccountNumber ? (
                      <>
                        <p className="text-xs text-gray-600">
                          <span className="font-semibold text-gray-800">{b.refundBankName}</span> — {b.refundAccountNumber}
                        </p>
                        {b.refundAccountName && (
                          <p className="text-xs text-gray-500 mt-0.5">{b.refundAccountName}</p>
                        )}
                      </>
                    ) : (
                      <p className="text-xs text-red-500">No bank details provided by guest yet.</p>
                    )}
                    {/* Secondary cross-reference — Paystack's own record
                        of the original payment method, useful to
                        confirm the guest's provided details roughly
                        match how they actually paid. */}
                    {b.refundDestination && (
                      <p className="text-xs text-gray-400 mt-1">Originally paid via: {b.refundDestination}</p>
                    )}
                  </div>
                )}

                {/* ✅ NEW — closes the "only shows bank name, not the
                    account number" gap. Unlike a refund, a payout
                    genuinely needs the full account number visible so
                    admin can actually send it manually in Paystack. */}
                {isPayouts && (
                  <div className="mt-2 bg-gray-50 rounded-lg px-3 py-2">
                    {b._bankDetails ? (
                      <>
                        <p className="text-xs text-gray-600">
                          <span className="font-semibold text-gray-800">{b._bankDetails.bankName}</span> — {b._bankDetails.accountNumber}
                        </p>
                        {b._bankDetails.accountName && (
                          <p className="text-xs text-gray-500 mt-0.5">{b._bankDetails.accountName}</p>
                        )}
                      </>
                    ) : (
                      <p className="text-xs text-red-500">No bank details on file for this agency yet.</p>
                    )}
                  </div>
                )}

                {statusView === 'owed' ? (
                  <button
                    onClick={() => isPayouts ? markPayoutPaid(b.id) : markRefundDone(b.id)}
                    disabled={isActing}
                    className="mt-4 w-full flex items-center justify-center gap-2 bg-emerald-50 text-emerald-700 py-2.5 rounded-xl text-sm font-bold hover:bg-emerald-100 transition disabled:opacity-50"
                  >
                    <CheckCircle2 size={15} /> {isPayouts ? 'Mark as Paid' : 'Mark as Refunded'}
                  </button>
                ) : (
                  <div className="mt-4 bg-gray-50 rounded-xl px-3 py-2.5 flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-emerald-600" />
                    <p className="text-xs font-bold text-gray-700">{isPayouts ? 'Marked paid' : 'Refunded'}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}