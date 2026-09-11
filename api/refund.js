// api/refund.js
//
// ✅ NEW — the server-side half of the cancellation flow. Triggered by
// my_bookings_screen.dart's _triggerRefund(), right after the client
// marks a booking confirmationStatus: 'cancelled'. Everything this route
// does is re-verified and re-calculated independently here — the client
// only ever sends a bookingId, nothing else is trusted from it. This
// mirrors the exact same trust model as paystack-webhook.js: the client
// signals intent, the server is the only source of truth for money.
//
// Refund mechanics confirmed directly against Paystack's own docs before
// building this (see conversation): refunds deduct from your NEXT
// settlement (or your Paystack balance, if Registered Business + Manual
// Payouts) — no recipient code needed, no OTP, unlike Transfers. If the
// upcoming settlement/balance can't cover it, the refund simply fails
// and Paystack sends a refund.failed webhook — handled in
// paystack-webhook.js's new refund event branch, not here (this route's
// job ends once the refund request is submitted to Paystack; refunds
// are async, same as transfers).

import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, doc, getDoc, updateDoc, serverTimestamp, collection, query, where, getDocs } from 'firebase/firestore';
import nodemailer from 'nodemailer';

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);

// ✅ Mirrors the exact policy tiers established throughout this build —
// osb_shortlet_manage_screen.dart's Cancellation Policy step,
// shortlet_detail_screen.dart's display, and rent_a_ride_screen.dart's
// flat Ride policy. Kept in sync deliberately with the same calculation
// in my_bookings_screen.dart's _refundPercentage getter — that copy is
// only ever a PREVIEW; this is the one that actually determines what
// gets refunded.
function calculateRefundPercentage({ isShortlet, cancellationPolicy, hoursUntil }) {
  if (hoursUntil === null) return 0;

  if (isShortlet) {
    const days = hoursUntil / 24;
    switch (cancellationPolicy) {
      case 'strict':
        return days >= 14 ? 1.0 : 0.0;
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
    // Ride — single flat policy, no tiers.
    if (hoursUntil >= 2) return 1.0;
    if (hoursUntil >= 1) return 0.5;
    return 0.0;
  }
}

// ─── lifecycle check — the 24hr reminder / 48hr auto-release cron ────────
// ✅ NEW — was originally going to be its own file (cron/booking-lifecycle.js),
// but that would have pushed this project back over Vercel's 12-function
// Hobby plan limit the moment it was added. Folded into refund.js instead,
// triggered by Vercel Cron hitting this same route with a GET request
// (see vercel.json's cron config, which needs `{"path": "/api/refund?cron=1",
// "schedule": "0 */6 * * *"}` or similar — runs every few hours, not once a
// day, so a booking's window is caught reasonably close to when it opens
// rather than waiting up to 24hrs for the next daily run).
//
// Two passes each run, over every booking where paymentStatus is 'paid'
// and confirmationStatus is still 'pending' (not yet confirmed, not
// cancelled, no open dispute):
//
//   1. REMINDER — the confirm-window just opened (24hrs past check-in
//      for Shortlet, right after trip time for Ride — same threshold as
//      my_bookings_screen.dart's _showsConfirmPrompt) and no reminder's
//      been sent yet. Emails the guest, marks reminderSentAt so it never
//      re-sends on a later run.
//
//   2. AUTO-RELEASE — 48+ hours have passed with still no guest
//      response. Sets confirmationStatus: 'confirmed' automatically —
//      functionally identical to the guest tapping "Yes" themselves.
//
// ⚠️ HONEST GAP — same as everywhere else in this build: auto-release
// only ever flips confirmationStatus to 'confirmed'. It does NOT itself
// trigger a payout to the owner — that still needs transfer.js's logic
// (planned as a new action folded into THIS file once built, same
// reasoning as this consolidation), which is separately blocked on your
// Paystack Compliance Documents step. Right now, auto-release correctly
// unblocks a booking from sitting stuck forever waiting on a guest who
// never responds — it does not yet mean money moved.
async function handleLifecycleCheck(req, res) {
  const now = new Date();
  const results = { remindersSent: 0, autoReleased: 0, errors: 0 };

  try {
    const snap = await getDocs(query(
      collection(db, 'bookings'),
      where('paymentStatus', '==', 'paid'),
      where('confirmationStatus', '==', 'pending')
    ));

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
    });

    for (const bookingDoc of snap.docs) {
      const booking = bookingDoc.data();
      const bookingId = bookingDoc.id;

      try {
        const isShortlet = booking.type === 'shortlet';
        const relevantDate = isShortlet ? booking.checkInDate : booking.tripDateTime;
        if (!relevantDate) continue;

        // Same threshold as my_bookings_screen.dart's _showsConfirmPrompt
        // and MyBookingsPage.jsx's showsConfirmPrompt — window opens
        // 24hrs after check-in (Shortlet) or right at trip time (Ride).
        const windowOpensAt = isShortlet
          ? new Date(relevantDate.toDate().getTime() + 24 * 60 * 60 * 1000)
          : relevantDate.toDate();
        const hoursSinceWindowOpened = (now.getTime() - windowOpensAt.getTime()) / (1000 * 60 * 60);

        if (hoursSinceWindowOpened < 0) continue; // window hasn't opened yet

        // ─── Pass 1: reminder, once ───
        if (hoursSinceWindowOpened >= 0 && !booking.reminderSentAt) {
          await transporter.sendMail({
            from: `"OutingStation" <${process.env.GMAIL_USER}>`,
            to: booking.guestEmail,
            subject: `Reminder — confirm your ${isShortlet ? 'stay' : 'trip'}: ${booking.listingTitle}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
                <div style="background: #F8FAFC; border-radius: 16px; padding: 24px;">
                  <h2 style="margin: 0 0 12px; color: #0F172A; font-size: 18px;">${booking.listingTitle}</h2>
                  <p style="margin: 0 0 16px; font-size: 14px; color: #374151; line-height: 1.6;">
                    ${isShortlet ? 'Did you check in successfully?' : 'Was your ride completed?'} Let us know in the app so we can release your host's payment.
                  </p>
                  <p style="margin: 0; font-size: 12px; color: #64748B;">
                    Open Profile → My Bookings to confirm, or report an issue if something went wrong.
                  </p>
                </div>
              </div>
            `,
          });
          await updateDoc(doc(db, 'bookings', bookingId), { reminderSentAt: serverTimestamp() });
          results.remindersSent++;
          console.log(`📧 Reminder sent for booking ${bookingId}`);
        }

        // ─── Pass 2: auto-release after 48hrs ───
        if (hoursSinceWindowOpened >= 48) {
          await updateDoc(doc(db, 'bookings', bookingId), {
            confirmationStatus: 'confirmed',
            autoConfirmedAt: serverTimestamp(),
          });
          results.autoReleased++;
          console.log(`✅ Auto-released booking ${bookingId} after 48hrs of no guest response`);
        }
      } catch (bookingErr) {
        console.error(`❌ Lifecycle check failed for booking ${bookingId}:`, bookingErr);
        results.errors++;
      }
    }

    // ─── Pass 3: flag newly-confirmed bookings for manual payout ───
    // ✅ NEW — separate query, deliberately not folded into the loop
    // above: that loop only ever sees PENDING bookings (guests who
    // haven't confirmed yet). A booking reaches 'confirmed' two
    // different ways — the guest tapping "Yes" directly in the app
    // (client-side, never touches this cron at all), or Pass 2 above
    // auto-releasing it — so catching BOTH paths needs its own query
    // over confirmed bookings, checked for whether they've already been
    // flagged (payoutStatus set) rather than assuming only today's
    // auto-releases need marking.
    //
    // ⚠️ HONEST GAP, same shape as everywhere else in this build: this
    // only ever marks payoutStatus: 'manual_pending' and alerts admin —
    // it does NOT send any money. transfer.js's actual logic (blocked on
    // Manual Payouts + Compliance approval) is what would eventually
    // replace this pass with real automation; until then, this is the
    // bridge that makes sure a booking owed a payout is at least VISIBLE
    // and ALERTED on, not silently forgotten.
    try {
      const confirmedSnap = await getDocs(query(
        collection(db, 'bookings'),
        where('confirmationStatus', '==', 'confirmed')
      ));
      const needsPayoutFlag = confirmedSnap.docs.filter(d => !d.data().payoutStatus);

      if (needsPayoutFlag.length > 0) {
        const transporter2 = nodemailer.createTransport({
          service: 'gmail',
          auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
        });
        for (const bookingDoc of needsPayoutFlag) {
          const booking = bookingDoc.data();
          try {
            await updateDoc(doc(db, 'bookings', bookingDoc.id), {
              payoutStatus: 'manual_pending',
              payoutMarkedAt: serverTimestamp(),
            });
            await transporter2.sendMail({
              from: `"OutingStation Alerts" <${process.env.GMAIL_USER}>`,
              to: 'admin@outingstation.com',
              subject: `💰 Payout owed — ${booking.listingTitle}`,
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
                  <div style="background: #ECFEFF; border-radius: 16px; padding: 24px;">
                    <p style="margin: 0 0 4px; color: #0891B2; font-weight: 700; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Manual Payout Needed</p>
                    <h2 style="margin: 0 0 16px; color: #0F172A; font-size: 18px;">${booking.listingTitle}</h2>
                    <p style="margin: 0 0 8px; font-size: 14px; color: #374151;">Agency: ${booking.agencyName || 'Unknown'}</p>
                    <p style="margin: 0 0 16px; font-size: 20px; font-weight: 800; color: #0891B2;">₦${Number(booking.ownerPayout || 0).toLocaleString()}</p>
                    <p style="margin: 0; font-size: 12px; color: #64748B;">
                      Automated transfers are still pending Paystack Compliance approval. Process this manually and mark it paid in the admin Payouts view once sent.
                    </p>
                  </div>
                </div>
              `,
            });
            results.payoutsFlagged = (results.payoutsFlagged || 0) + 1;
            console.log(`💰 Flagged booking ${bookingDoc.id} for manual payout — admin alerted`);
          } catch (payoutErr) {
            console.error(`❌ Failed to flag payout for booking ${bookingDoc.id}:`, payoutErr);
            results.errors++;
          }
        }
      }
    } catch (payoutPassErr) {
      console.error('❌ Payout-flagging pass failed:', payoutPassErr);
    }

    console.log(`✅ Lifecycle check complete:`, results);
    return res.status(200).json({ success: true, ...results });
  } catch (error) {
    console.error('❌ Lifecycle check error:', error);
    return res.status(500).json({ error: 'Lifecycle check failed' });
  }
}

export default async function handler(req, res) {
  // ✅ NEW — Vercel Cron always triggers via GET, so this route now
  // branches: GET runs the lifecycle check, POST keeps doing exactly
  // what it already did (refund processing). Protected by a shared
  // secret so a random request can't trigger the lifecycle check —
  // matches Vercel's own documented pattern for securing cron endpoints.
  // ⚠️ Requires CRON_SECRET to be set in Vercel's environment variables
  // — pick any long random string and set it there; vercel.json's cron
  // config needs the exact same value in its Authorization header.
  if (req.method === 'GET') {
    const authHeader = req.headers.authorization;
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    return handleLifecycleCheck(req, res);
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // ✅ NEW — 'source' distinguishes the two genuinely different reasons
    // a refund can happen. A guest CANCELLATION is refunded based on the
    // cancellation POLICY (a percentage that depends on how close to
    // check-in/trip it is). An admin DISPUTE resolution is a different
    // thing entirely — admin looked at a specific complaint and decided
    // the guest is owed their money back; that's not a timing calculation,
    // it's a full refund of the subtotal (the fee still never refunds,
    // same rule either way). Conflating these was a real bug: this route
    // originally only knew how to do the first kind, so
    // AdminDisputes.jsx's "Side with Guest" button had nothing to
    // actually call — it just recorded a decision that never moved any
    // money.
    const { bookingId, source } = req.body;
    const isDisputeRefund = source === 'admin_dispute';
    // ✅ NEW — the double-booking safety net's refund path. Triggered by
    // paystack-webhook.js when it catches a genuine scheduling conflict
    // at the one moment a payment is confirmed real. Always 100% — the
    // guest did nothing wrong here, this is entirely a system-timing
    // issue, so no cancellation-policy percentage should ever apply.
    const isConflictRefund = source === 'booking_conflict';

    if (!bookingId) {
      return res.status(400).json({ error: 'Missing bookingId' });
    }

    const bookingRef = doc(db, 'bookings', bookingId);
    const bookingSnap = await getDoc(bookingRef);
    if (!bookingSnap.exists()) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    const booking = bookingSnap.data();

    // ─── Re-verify eligibility server-side — never trust the client ───
    if (booking.paymentStatus !== 'paid') {
      return res.status(400).json({ error: 'Booking was never paid — nothing to refund' });
    }

    if (isDisputeRefund) {
      // Dispute path — the eligibility gate is completely different from
      // cancellation. This route re-checks the ACTUAL disputeStatus on
      // the booking itself (not trusting the client's claim that admin
      // resolved it), same "server is the only source of truth" pattern
      // as everywhere else in this file.
      if (booking.disputeStatus !== 'resolved_refund_guest') {
        return res.status(400).json({ error: 'Booking dispute was not resolved in favor of a refund' });
      }
    } else {
      // Cancellation path — original checks, unchanged.
      if (booking.confirmationStatus !== 'cancelled') {
        return res.status(400).json({ error: 'Booking is not marked cancelled' });
      }
      if (booking.disputeStatus === 'reported') {
        return res.status(400).json({ error: 'Booking has an open dispute — cannot auto-refund' });
      }
    }

    // ✅ Double-processing guard — if a refund was already initiated or
    // completed for this booking, don't process it again. Covers both a
    // client retry and any race condition. Applies to both refund paths.
    if (booking.refundStatus === 'pending' || booking.refundStatus === 'refunded') {
      console.log(`⚠️ Refund already ${booking.refundStatus} for booking ${bookingId}, skipping`);
      return res.status(200).json({ success: true, message: 'Already processed' });
    }
    if (!booking.paymentReference) {
      return res.status(400).json({ error: 'No payment reference on this booking' });
    }

    const isShortlet = booking.type === 'shortlet';
    const subtotal = booking.subtotal || 0;

    // ─── Calculate the refund amount — the paths diverge here ───
    let refundPercentage;
    if (isDisputeRefund || isConflictRefund) {
      // A dispute refund is always the FULL subtotal — admin already
      // made the judgment call that the guest is owed it back; there's
      // no policy percentage to apply on top of that decision. A
      // conflict refund is the same for a different reason — see the
      // isConflictRefund declaration above.
      refundPercentage = 1.0;
    } else {
      // Cancellation path — original policy-based calculation, unchanged.
      const relevantDate = isShortlet ? booking.checkInDate : booking.tripDateTime;
      const hoursUntil = relevantDate ? (relevantDate.toDate().getTime() - Date.now()) / (1000 * 60 * 60) : null;

      let cancellationPolicy = 'flexible';
      if (isShortlet) {
        const listingDoc = await getDoc(doc(db, 'shortlets', booking.listingId));
        cancellationPolicy = listingDoc.exists() ? (listingDoc.data().cancellationPolicy || 'flexible') : 'flexible';
      }
      refundPercentage = calculateRefundPercentage({ isShortlet, cancellationPolicy, hoursUntil });
    }

    let refundAmount = Math.round(subtotal * refundPercentage);

    // ✅ Hard guard matching Paystack's own rule: never request more
    // than what was actually charged. amountPaid is the true charged
    // figure (set by the webhook from Paystack's own data, not the
    // client) — refundAmount can never exceed it regardless of what the
    // percentage math produces.
    if (refundAmount > (booking.amountPaid || 0)) {
      refundAmount = booking.amountPaid || 0;
    }

    // ✅ NEW — the double-loss guard. If this booking's payout was
    // ALREADY sent to the owner (payoutStatus: 'paid_out', set from the
    // admin Payouts view once a manual transfer was actually made), a
    // refund here would pull the same money out of OUR balance a SECOND
    // time — Paystack's Refund API only knows about the original
    // charge, it has no awareness that we already sent the owner's cut
    // out separately, and it can't claw back a transfer automatically.
    // Real risk, not hypothetical: OutingStation would be down both the
    // payout already sent AND the refund just issued, with nothing
    // coming back to offset it. Refuses to call Paystack in this case —
    // this becomes a human problem (contacting the owner directly to
    // return the money) rather than something the API can resolve, so
    // it's flagged for manual reconciliation instead of silently
    // creating a loss.
    if (booking.payoutStatus === 'paid_out') {
      await updateDoc(bookingRef, {
        refundStatus: 'manual_reconciliation',
        refundPercentage,
        refundAmount,
      });
      console.error(`⚠️ ADMIN ATTENTION — booking ${bookingId} cancelled AFTER its payout was already sent. Refund blocked to prevent double-loss. Contact the owner (${booking.agencyName || 'unknown agency'}) directly to arrange returning ₦${refundAmount}.`);
      return res.status(200).json({ success: true, manualReconciliationNeeded: true });
    }

    // ─── No refund owed — still valid (0% cancellation policy), just skip Paystack ───
    // Note: this branch is only realistically reachable via the
    // cancellation path — a dispute refund is always refundPercentage =
    // 1.0, so it can never land here with refundAmount <= 0 unless
    // subtotal itself was 0.
    if (refundAmount <= 0) {
      await updateDoc(bookingRef, {
        refundStatus: 'not_eligible',
        refundPercentage,
        refundAmount: 0,
        // ✅ FIXED — cancelledAt only makes sense for the cancellation
        // path; a dispute resolution already has its own
        // disputeResolvedAt timestamp (set by AdminDisputes.jsx) and was
        // never a "cancellation" to begin with.
        ...(isDisputeRefund ? {} : { cancelledAt: serverTimestamp() }),
      });
      console.log(`ℹ️ Booking ${bookingId} — 0% refund, no Paystack call made`);
      return res.status(200).json({ success: true, refundAmount: 0 });
    }

    // ✅ CHANGED — was calling Paystack's Refund API automatically at
    // this point. Now deliberately does NOT — same "everything manual
    // for now" decision already made for owner payouts, extended to
    // refunds too, given the genuine uncertainty around how Paystack's
    // settlement-based refund deduction behaves once money has actually
    // reached the bank (our one real test happened only 3 minutes after
    // payment, before T+1 settlement — it proved the mechanism works
    // while funds are still in the Paystack balance, not the harder
    // case). Rather than risk a refund failing unpredictably days after
    // a guest expects it, this marks the booking for manual processing
    // and alerts admin immediately — same shape as the payout-flagging
    // pass in handleLifecycleCheck above, just triggered by cancellation
    // instead of confirmation.
    //
    // Once admin actually processes this in Paystack's own dashboard,
    // paystack-webhook.js's existing refund.processed/refund.failed
    // branch still fires normally (Paystack sends that webhook
    // regardless of whether a refund was created via API or by hand in
    // the dashboard) — so refundStatus still gets moved to 'refunded'
    // automatically once it actually completes. This code doesn't need
    // to change for that; it already does the right thing.
    // ✅ NEW — closes the "admin can't see which account this goes
    // back to" gap. Important distinction worth being clear about: a
    // REFUND is never sent to a bank account you specify — Paystack
    // automatically sends it back to whatever the guest ORIGINALLY paid
    // with (their card, or the bank account they transferred from).
    // There's nothing for admin to type in. What was genuinely missing
    // was just VISIBILITY into what that original payment method was,
    // for confidence before confirming — this fetches it from Paystack's
    // own transaction record (via the stored paymentReference) and
    // saves a human-readable summary directly on the booking, so
    // AdminPayouts.jsx can show it without a live API call from the
    // browser.
    let refundDestination = 'See Paystack dashboard for payment method';
    try {
      const verifyRes = await fetch(`https://api.paystack.co/transaction/verify/${booking.paymentReference}`, {
        headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` },
      });
      const verifyData = await verifyRes.json();
      const auth = verifyData?.data?.authorization;
      if (auth) {
        if (auth.channel === 'card') {
          refundDestination = `Card ending ${auth.last4 || '????'} (${auth.bank || auth.card_type || 'Unknown bank'})`;
        } else if (auth.channel === 'bank' || auth.channel === 'bank_transfer') {
          refundDestination = `Bank transfer — ${auth.bank || 'Unknown bank'}`;
        } else if (auth.channel) {
          refundDestination = `${auth.channel} — ${auth.bank || 'Unknown bank'}`;
        }
      }
    } catch (verifyErr) {
      console.error('⚠️ Could not fetch payment method for refund destination display:', verifyErr);
      // Falls back to the default string above — this is a nice-to-have
      // for admin visibility, never worth blocking the actual refund
      // flag over.
    }

    // ✅ FIXED — was trying to include Paystack's own
    // `authorization.account_name` in parentheses, e.g. "Bank transfer
    // — OPay (Guest Name)". Confirmed via a real refund (OPay channel)
    // that Paystack doesn't reliably populate that field for every
    // channel — it was silently just missing, no name shown at all.
    // Switched to the booking's OWN guestName field instead, which is
    // always reliably available (captured directly at checkout, not
    // dependent on what Paystack's API happens to return) — this now
    // always shows the guest's name regardless of payment channel.
    if (booking.guestName) {
      refundDestination = `${refundDestination} — Guest: ${booking.guestName}`;
    }

    await updateDoc(bookingRef, {
      refundStatus: 'manual_pending',
      refundPercentage,
      refundAmount,
      refundDestination,
      ...(isDisputeRefund ? {} : { cancelledAt: serverTimestamp() }),
    });

    try {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
      });
      await transporter.sendMail({
        from: `"OutingStation Alerts" <${process.env.GMAIL_USER}>`,
        to: 'admin@outingstation.com',
        subject: `💸 Refund owed — ${booking.listingTitle}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
            <div style="background: #FEF2F2; border-radius: 16px; padding: 24px;">
              <p style="margin: 0 0 4px; color: #DC2626; font-weight: 700; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Manual Refund Needed</p>
              <h2 style="margin: 0 0 16px; color: #0F172A; font-size: 18px;">${booking.listingTitle}</h2>
              <p style="margin: 0 0 8px; font-size: 14px; color: #374151;">Guest: ${booking.guestEmail}</p>
              <p style="margin: 0 0 16px; font-size: 20px; font-weight: 800; color: #DC2626;">₦${Number(refundAmount).toLocaleString()}</p>
              <p style="margin: 0 0 8px; font-size: 12px; color: #64748B;">Paystack reference: <strong>${booking.paymentReference}</strong></p>
              <p style="margin: 0 0 8px; font-size: 12px; color: #64748B;">Refunds to: <strong>${refundDestination}</strong></p>
              <p style="margin: 0; font-size: 12px; color: #64748B;">
                Process this manually in Paystack's dashboard using the reference above. Once completed there, it updates automatically here — no need to mark it manually.
              </p>
            </div>
          </div>
        `,
      });
      console.log(`📧 Admin alerted of manual refund needed for booking ${bookingId}`);
    } catch (emailErr) {
      console.error('❌ Failed to send manual-refund admin alert:', emailErr);
    }

    console.log(`💸 Booking ${bookingId} flagged for manual refund — ₦${refundAmount} (${isDisputeRefund ? 'dispute resolution' : `${Math.round(refundPercentage * 100)}% cancellation policy`})`);
    return res.status(200).json({ success: true, refundAmount, refundPercentage, manual: true });
  } catch (error) {
    console.error('❌ refund.js error:', error);
    return res.status(500).json({ error: 'Failed to process refund' });
  }
}