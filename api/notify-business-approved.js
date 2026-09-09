// api/notify-business-approved.js
//
// ✅ NEW — closes a confirmed gap: AdminBusinesses.jsx's approve action
// only ever showed a toast to the ADMIN ("✅ Business approved"). The
// business owner — who's been waiting to actually start listing — was
// never told at all. Confirmed by checking the file directly: no
// sendMail/nodemailer call existed anywhere in that approve handler.
//
// Called from AdminBusinesses.jsx right after the Firestore status
// update to 'approved' succeeds. Uses the businesses/ doc's own
// `ownerEmail` field — confirmed present, written at registration time
// in osb_registration_screen.dart from the signed-in user's own
// FirebaseAuth email, so no Firebase Admin SDK lookup is needed here
// (unlike the owner-notification gap flagged in
// notify-dispute-resolved.js, which hit exactly that missing-email
// problem for a different notification).

import nodemailer from 'nodemailer';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { ownerEmail, businessName, businessType } = req.body;

    if (!ownerEmail || !businessName) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Same "what happens next" framing for whichever business type this
    // is, since the actual next step differs — Shortlet/Ride land on
    // adding a listing, everything else lands on a generic "add
    // pricing/hours" step.
    const isListingType = businessType === 'Shortlet' || businessType === 'Ride Provider';
    const nextStepLabel = businessType === 'Shortlet'
      ? 'add your first property listing'
      : businessType === 'Ride Provider'
      ? 'add your first vehicle'
      : 'set up your pricing and business hours';

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
    });

    await transporter.sendMail({
      from: `"OutingStation Business" <${process.env.GMAIL_USER}>`,
      to: ownerEmail,
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
    });

    console.log(`✅ Approval email sent to: ${ownerEmail}`);
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('❌ notify-business-approved error:', error);
    return res.status(200).json({ success: false, emailFailed: true });
  }
}