// api/notify-dispute-resolved.js
//
// ✅ NEW — closes the second half of the gap flagged: AdminDisputes.jsx
// records a resolution decision, but until now nothing told either party
// it had happened. Called from AdminDisputes.jsx's resolveDispute(),
// right after the Firestore write succeeds.
//
// ⚠️ HONEST GAP — this only emails the GUEST. The owner's email isn't
// stored anywhere this route can reach: it only exists on their Firebase
// Auth account, and every server-side file in this codebase (this one
// included) uses the Firebase CLIENT SDK, not the Admin SDK — the client
// SDK has no way to look up an arbitrary user's email by uid the way
// admin.auth().getUser(uid) would. Two real options to close this,
// neither of which this file can do on its own:
//   1. Store the owner's email directly on the businesses/ doc at
//      registration time (simplest — a field, not a new dependency).
//   2. Add firebase-admin as a dependency to this route specifically,
//      so it can call admin.auth().getUser(ownerId).email.
// Until one of those happens, the owner finds out about a resolved
// dispute the same way they find out about anything else: checking
// their own OSB Bookings tab, which osb_bookings_screen.dart /
// OSBDashboard.jsx's Bookings section already show the outcome in.

import nodemailer from 'nodemailer';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { bookingId, listingTitle, guestEmail, amount, decision } = req.body;

    if (!bookingId || !guestEmail || !decision) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const isRefund = decision === 'resolved_refund_guest';

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
    });

    await transporter.sendMail({
      from: `"OutingStation" <${process.env.GMAIL_USER}>`,
      to: guestEmail,
      subject: isRefund ? `✅ Refund approved — ${listingTitle}` : `Your dispute has been reviewed — ${listingTitle}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
          <div style="background: ${isRefund ? '#EFF6FF' : '#F0FDF4'}; border-radius: 16px; padding: 24px;">
            <h2 style="margin: 0 0 12px; color: #0F172A; font-size: 18px;">${listingTitle}</h2>
            <p style="margin: 0 0 16px; font-size: 14px; color: #374151; line-height: 1.6;">
              ${isRefund
                ? `We've reviewed the issue you reported and approved a refund of ₦${Number(amount || 0).toLocaleString()}. It will be processed back to your original payment method.`
                : `We've reviewed the issue you reported. After looking into it, we've released the booking as completed and the host's payment has been approved.`}
            </p>
            <p style="margin: 0; font-size: 12px; color: #64748B;">
              Questions about this decision? Reply to this email or reach us in the app.
            </p>
          </div>
        </div>
      `,
    });

    console.log(`✅ Dispute resolution email sent for booking ${bookingId}`);
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('❌ notify-dispute-resolved error:', error);
    // ✅ Still 200 — the resolution is already safely recorded in
    // Firestore by the caller regardless of whether this email sends.
    return res.status(200).json({ success: false, emailFailed: true });
  }
}