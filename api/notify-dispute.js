// api/notify-dispute.js
//
// ✅ NEW — closes a real gap: right now, a guest tapping "Report Issue"
// in My Bookings just writes disputeStatus: 'reported' to Firestore and
// nothing else happens. No one at OutingStation is ever notified. For a
// confirmation ("Yes") that's a minor gap; for a DISPUTE it's a real
// problem — money is on hold, a guest has a real complaint, and unless
// someone happens to browse Firestore, nobody knows.
//
// Called from my_bookings_screen.dart's _reportIssue(), right after the
// Firestore write succeeds — fire-and-forget, same pattern as
// osb_profile_screen.dart's _triggerRecipientCreation(). A failure here
// never blocks the guest's own "issue reported" confirmation, since the
// dispute IS genuinely recorded in Firestore either way; this is just
// the alert on top of that.
//
// Uses the same Gmail credentials already configured for
// paystack-webhook.js's confirmation emails — no new environment
// variables needed.

import nodemailer from 'nodemailer';

// ⚠️ ASSUMPTION — admin@outingstation.com matches the Reply-To address
// already used in paystack-webhook.js's booking confirmation emails
// (visible in the screenshot you shared earlier). Change this if the
// real inbox that should receive dispute alerts is different.
const ADMIN_EMAIL = 'admin@outingstation.com';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { bookingId, listingTitle, guestEmail, amount, disputeReason, type } = req.body;

    if (!bookingId || !disputeReason) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
    });

    await transporter.sendMail({
      from: `"OutingStation Alerts" <${process.env.GMAIL_USER}>`,
      to: ADMIN_EMAIL,
      subject: `🚨 Dispute reported — ${listingTitle || 'Booking'}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
          <div style="background: #FEF2F2; border: 2px solid #FCA5A5; border-radius: 12px; padding: 20px;">
            <p style="margin: 0 0 4px; color: #991B1B; font-weight: 800; font-size: 13px; text-transform: uppercase; letter-spacing: 1px;">Dispute Reported</p>
            <h2 style="margin: 0 0 16px; color: #7F1D1D; font-size: 18px;">${listingTitle || 'Booking'}</h2>
            <table cellpadding="0" cellspacing="0" style="width: 100%; font-size: 13px; color: #374151;">
              <tr><td style="padding: 4px 0; font-weight: 700;">Booking Type:</td><td>${type === 'shortlet' ? 'Shortlet' : 'Ride'}</td></tr>
              <tr><td style="padding: 4px 0; font-weight: 700;">Booking ID:</td><td style="font-family: monospace;">${bookingId}</td></tr>
              <tr><td style="padding: 4px 0; font-weight: 700;">Guest:</td><td>${guestEmail || 'Unknown'}</td></tr>
              <tr><td style="padding: 4px 0; font-weight: 700;">Amount:</td><td>₦${Number(amount || 0).toLocaleString()}</td></tr>
            </table>
            <div style="margin-top: 16px; padding: 14px; background: white; border-radius: 8px;">
              <p style="margin: 0 0 4px; font-weight: 700; font-size: 12px; color: #991B1B;">Guest's Message:</p>
              <p style="margin: 0; font-size: 13px; color: #374151;">${disputeReason}</p>
            </div>
            <p style="margin: 16px 0 0; font-size: 12px; color: #991B1B;">
              This booking's payout is held until resolved. Review it in the admin dashboard.
            </p>
          </div>
        </div>
      `,
    });

    console.log(`✅ Dispute alert sent for booking ${bookingId}`);
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('❌ notify-dispute error:', error);
    // ✅ Still 200, not 500 — the dispute itself is already safely
    // recorded in Firestore regardless of whether this alert succeeds.
    // A failed email shouldn't read to the caller as "the report
    // itself failed," since it didn't.
    return res.status(200).json({ success: false, emailFailed: true });
  }
}