// api/notify-driver-assigned.js
//
// ✅ NEW — closes the "how will user know" gap for driver assignment.
// Right now, an agency assigning a driver in osb_bookings_screen.dart or
// OSBDashboard.jsx's Bookings tab just writes to Firestore — the guest
// only ever finds out if they happen to reopen My Bookings. Called from
// both of those, right after the Firestore write succeeds. Uses the
// booking's own guestEmail field, which is always present (captured at
// booking creation from the signed-in guest), so no email-lookup
// problem here unlike the owner-notification gaps flagged elsewhere.

import nodemailer from 'nodemailer';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { guestEmail, listingTitle, driverName, driverPhone } = req.body;

    if (!guestEmail || !driverName) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
    });

    await transporter.sendMail({
      from: `"OutingStation" <${process.env.GMAIL_USER}>`,
      to: guestEmail,
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
    });

    console.log(`✅ Driver-assigned email sent to: ${guestEmail}`);
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('❌ notify-driver-assigned error:', error);
    return res.status(200).json({ success: false, emailFailed: true });
  }
}