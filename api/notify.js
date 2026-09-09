// api/notify.js
//
// ✅ CONSOLIDATED — this file replaces four separate routes:
// notify-dispute.js, notify-dispute-resolved.js,
// notify-business-approved.js, and notify-driver-assigned.js.
//
// Why: Vercel's Hobby plan hard-caps a deployment at 12 Serverless
// Functions. Every file under api/ counts as one, and this project
// crossed that limit (16 files, confirmed via the actual Vercel error:
// "No more than 12 Serverless Functions can be added to a Deployment on
// the Hobby plan"). These four files were all doing the same underlying
// thing — build an HTML email, send it via nodemailer — with different
// templates. Merging them into one file dispatching on a `type` field
// keeps every email exactly as it was, just under one roof instead of
// four, freeing up 3 function slots for what's still coming
// (transfer.js's logic, folded into refund.js rather than as a new
// file, and the two cron jobs still ahead).
//
// Callers: update each call site to POST to /api/notify with the
// appropriate `type` added to the existing body — nothing else about
// the request shape changes. See the bottom of this file for the exact
// type values.

import nodemailer from 'nodemailer';

// ⚠️ ASSUMPTION — carried over unchanged from notify-dispute.js: matches
// the Reply-To address already used in paystack-webhook.js's booking
// confirmation emails. Change here if the real admin inbox differs.
const ADMIN_EMAIL = 'admin@outingstation.com';

// ⚠️ FIXED — renamed the destructured param from `type` to `bookingType`
// to avoid colliding with the outer dispatch `type` field
// ('dispute_reported' etc.) that selects WHICH email to send. The
// original four separate files each safely used `type` for the
// booking's own type ('shortlet'/'ride') since there was no dispatch
// field to collide with; merging them into one dispatcher creates that
// collision, so callers now send this as `bookingType` instead. See the
// call-site updates in my_bookings_screen.dart /
// osb_bookings_screen.dart / OSBDashboard.jsx.
function buildDisputeReportedEmail({ bookingId, listingTitle, guestEmail, amount, disputeReason, bookingType }) {
  return {
    to: ADMIN_EMAIL,
    from: `"OutingStation Alerts" <${process.env.GMAIL_USER}>`,
    subject: `🚨 Dispute reported — ${listingTitle || 'Booking'}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
        <div style="background: #FEF2F2; border: 2px solid #FCA5A5; border-radius: 12px; padding: 20px;">
          <p style="margin: 0 0 4px; color: #991B1B; font-weight: 800; font-size: 13px; text-transform: uppercase; letter-spacing: 1px;">Dispute Reported</p>
          <h2 style="margin: 0 0 16px; color: #7F1D1D; font-size: 18px;">${listingTitle || 'Booking'}</h2>
          <table cellpadding="0" cellspacing="0" style="width: 100%; font-size: 13px; color: #374151;">
            <tr><td style="padding: 4px 0; font-weight: 700;">Booking Type:</td><td>${bookingType === 'shortlet' ? 'Shortlet' : 'Ride'}</td></tr>
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
  };
}

function buildDisputeResolvedEmail({ bookingId, listingTitle, guestEmail, amount, decision }) {
  const isRefund = decision === 'resolved_refund_guest';
  return {
    to: guestEmail,
    from: `"OutingStation" <${process.env.GMAIL_USER}>`,
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
  };
}

function buildBusinessApprovedEmail({ ownerEmail, businessName, businessType }) {
  const isListingType = businessType === 'Shortlet' || businessType === 'Ride Provider';
  const nextStepLabel = businessType === 'Shortlet'
    ? 'add your first property listing'
    : businessType === 'Ride Provider'
    ? 'add your first vehicle'
    : 'set up your pricing and business hours';
  return {
    to: ownerEmail,
    from: `"OutingStation Business" <${process.env.GMAIL_USER}>`,
    subject: `✅ ${businessName} is approved!`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
        <div style="background: #ECFEFF; border-radius: 16px; padding: 28px; text-align: center;">
          <p style="margin: 0 0 6px; color: #0891B2; font-weight: 700; font-size: 12px; text-transform: uppercase; letter-spacing: 1.5px;">OutingStation Business</p>
          <h1 style="margin: 0 0 8px; color: #0F172A; font-size: 24px;">You're approved! 🎉</h1>
          <p style="margin: 0 0 20px; color: #475569; font-size: 14px;">
            <strong>${businessName}</strong> is now live on OutingStation.
          </p>
          <div style="background: white; border-radius: 12px; padding: 18px; text-align: left;">
            <p style="margin: 0; font-size: 13px; color: #334155; line-height: 1.6;">
              Open the app and head to OSB to ${nextStepLabel}${isListingType ? ' — guests can book it the moment it goes live' : ''}.
            </p>
          </div>
        </div>
      </div>
    `,
  };
}

function buildDriverAssignedEmail({ guestEmail, listingTitle, driverName, driverPhone }) {
  return {
    to: guestEmail,
    from: `"OutingStation" <${process.env.GMAIL_USER}>`,
    subject: `🚗 Your driver is assigned — ${listingTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
        <div style="background: #EFF6FF; border-radius: 16px; padding: 24px;">
          <p style="margin: 0 0 4px; color: #1D4ED8; font-weight: 700; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Driver Assigned</p>
          <h2 style="margin: 0 0 16px; color: #0F172A; font-size: 18px;">${listingTitle}</h2>
          <div style="background: white; border-radius: 12px; padding: 16px;">
            <p style="margin: 0 0 4px; font-size: 15px; font-weight: 700; color: #0F172A;">${driverName}</p>
            <p style="margin: 0; font-size: 14px; color: #475569;">${driverPhone || ''}</p>
          </div>
          <p style="margin: 16px 0 0; font-size: 12px; color: #64748B;">
            View full trip details anytime under Profile → My Bookings in the app.
          </p>
        </div>
      </div>
    `,
  };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { type } = req.body;

  try {
    let email;
    switch (type) {
      case 'dispute_reported': {
        const { bookingId, disputeReason } = req.body;
        if (!bookingId || !disputeReason) {
          return res.status(400).json({ error: 'Missing required fields' });
        }
        email = buildDisputeReportedEmail(req.body);
        break;
      }
      case 'dispute_resolved': {
        const { bookingId, guestEmail, decision } = req.body;
        if (!bookingId || !guestEmail || !decision) {
          return res.status(400).json({ error: 'Missing required fields' });
        }
        email = buildDisputeResolvedEmail(req.body);
        break;
      }
      case 'business_approved': {
        const { ownerEmail, businessName } = req.body;
        if (!ownerEmail || !businessName) {
          return res.status(400).json({ error: 'Missing required fields' });
        }
        email = buildBusinessApprovedEmail(req.body);
        break;
      }
      case 'driver_assigned': {
        const { guestEmail, driverName } = req.body;
        if (!guestEmail || !driverName) {
          return res.status(400).json({ error: 'Missing required fields' });
        }
        email = buildDriverAssignedEmail(req.body);
        break;
      }
      default:
        return res.status(400).json({ error: `Unknown notification type: ${type}` });
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
    });

    await transporter.sendMail({
      from: email.from,
      to: email.to,
      subject: email.subject,
      html: email.html,
    });

    console.log(`✅ Notification sent (${type}) to: ${email.to}`);
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error(`❌ notify.js error (type: ${type}):`, error);
    // ✅ Still 200, not 500 — matches every one of the four original
    // files' behavior: whatever Firestore write triggered this
    // notification already succeeded independently. A failed email
    // shouldn't read to the caller as "the underlying action failed,"
    // since it didn't.
    return res.status(200).json({ success: false, emailFailed: true });
  }
}

// ─── Call shapes, one per type ──────────────────────────────────────────
// { type: 'dispute_reported', bookingId, listingTitle, guestEmail, amount, disputeReason, bookingType }
// { type: 'dispute_resolved', bookingId, listingTitle, guestEmail, amount, decision }
// { type: 'business_approved', ownerEmail, businessName, businessType }
// { type: 'driver_assigned', guestEmail, listingTitle, driverName, driverPhone }