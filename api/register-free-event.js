import nodemailer from 'nodemailer';
import { initializeApp, getApps } from 'firebase/app';
import {
  getFirestore, doc, getDoc, setDoc, updateDoc,
  increment, serverTimestamp, collection, query, where, getDocs
} from 'firebase/firestore';

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

function generateTicketId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const random = Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `OS-${new Date().getFullYear()}-${random}`;
}

function formatEventDate(event) {
  if (event.date) {
    const date = event.date.toDate ? event.date.toDate() : new Date(event.date);
    return date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  }
  if (event.startDate) {
    const date = event.startDate.toDate ? event.startDate.toDate() : new Date(event.startDate);
    return date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  }
  return 'TBD';
}

function formatEventTime(event) {
  if (event.time) return event.time;
  if (event.dailyStartTime) return `${event.dailyStartTime} - ${event.dailyEndTime || ''}`;
  return 'TBD';
}

function generateFreeRegistrationEmail(ticketData, eventData) {
  const verifyUrl = `https://www.outingstation.com/verify-ticket/${ticketData.ticketId}`;
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(verifyUrl)}&color=0e7490&bgcolor=ffffff`;
  const guestLines = (ticketData.guests || [])
    .map(g => `<tr><td style="padding: 3px 0; font-size: 13px; color: #475569;">+ ${g.name}</td></tr>`)
    .join('');

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Registration Confirmed</title></head>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#f0f9ff;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f9ff;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,0.12);">
        <tr>
          <td style="background:linear-gradient(135deg,#06b6d4,#0e7490);padding:36px;text-align:center;">
            <p style="color:rgba(255,255,255,0.75);margin:0 0 6px;font-size:12px;font-weight:700;letter-spacing:3px;text-transform:uppercase;">OutingStation</p>
            <h1 style="color:#ffffff;margin:0;font-size:26px;font-weight:900;">✅ You're Registered!</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 32px;">
            <h2 style="margin:0 0 10px;color:#0f172a;font-size:20px;font-weight:800;">${eventData.title}</h2>
            <table cellpadding="0" cellspacing="0">
              <tr><td style="padding: 3px 0; font-size: 14px; color: #475569;">📅&nbsp;&nbsp;${ticketData.eventDate}</td></tr>
              <tr><td style="padding: 3px 0; font-size: 14px; color: #475569;">🕐&nbsp;&nbsp;${ticketData.eventTime}</td></tr>
              <tr><td style="padding: 3px 0; font-size: 14px; color: #475569;">📍&nbsp;&nbsp;${eventData.address || eventData.location || 'TBD'}</td></tr>
            </table>
            <div style="border-top: 2px dashed #cbd5e1; margin: 16px 0;"></div>
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="vertical-align: top; padding-right: 20px;">
                  <div style="background: linear-gradient(135deg, #ecfeff, #e0f2fe); border: 2px dashed #06b6d4; border-radius: 14px; padding: 14px 18px; margin-bottom: 14px;">
                    <p style="margin: 0 0 4px; font-size: 10px; color: #0891b2; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px;">Registration ID</p>
                    <p style="margin: 0; font-size: 18px; font-weight: 900; color: #0e7490; font-family: 'Courier New', monospace;">${ticketData.ticketId}</p>
                  </div>
                  <p style="margin: 0 0 2px; font-size: 10px; color: #94a3b8; font-weight: 700; text-transform: uppercase;">Registered By</p>
                  <p style="margin: 0 0 10px; font-size: 14px; color: #1e293b; font-weight: 700;">${ticketData.buyerName}</p>
                  ${ticketData.groupSize > 1 ? `
                  <p style="margin: 0 0 2px; font-size: 10px; color: #94a3b8; font-weight: 700; text-transform: uppercase;">Group (${ticketData.groupSize} people)</p>
                  <table cellpadding="0" cellspacing="0">${guestLines}</table>` : ''}
                </td>
                <td style="vertical-align: top; width: 150px; text-align: center;">
                  <div style="background: white; border: 2px solid #bae6fd; border-radius: 14px; padding: 10px; display: inline-block;">
                    <img src="${qrImageUrl}" alt="QR Code" width="126" height="126" style="display: block; border-radius: 6px;" />
                  </div>
                  <p style="margin: 8px 0 0; font-size: 11px; color: #94a3b8;">Scan at entrance</p>
                </td>
              </tr>
            </table>
            ${ticketData.groupSize > 1 ? `
            <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 12px; padding: 14px 18px; margin-top: 16px;">
              <p style="margin: 0; font-size: 13px; color: #92400e; line-height: 1.6;">
                ⚠️ <strong>Please arrive together.</strong> This registration covers all ${ticketData.groupSize} people listed above.
              </p>
            </div>` : ''}
          </td>
        </tr>
        <tr>
          <td style="background:linear-gradient(135deg,#0891b2,#0e7490);padding:24px 32px;text-align:center;">
            <p style="margin:0;color:rgba(255,255,255,0.75);font-size:12px;">© ${new Date().getFullYear()} OutingStation</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      eventId, buyerName, buyerEmail, buyerPhone,
      groupSize = 1, guests = [], customAnswers = {}
    } = req.body;

    if (!eventId || !buyerName || !buyerEmail || !buyerPhone) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    if (!/\S+@\S+\.\S+/.test(buyerEmail)) {
      return res.status(400).json({ error: 'Invalid email address' });
    }

    const eventRef = doc(db, 'events', eventId);
    const eventSnap = await getDoc(eventRef);
    if (!eventSnap.exists()) {
      return res.status(404).json({ error: 'Event not found' });
    }
    const eventData = eventSnap.data();

    if (eventData.ticketingOption !== 'free_registration') {
      return res.status(400).json({ error: 'This event does not use free registration' });
    }

    // ✅ Enforce organizer's group size cap (hard platform ceiling of 6)
    const maxGroupSize = Math.min(eventData.maxGroupSize || 1, 6);
    const safeGroupSize = Math.max(1, Math.min(parseInt(groupSize) || 1, maxGroupSize));

    // ✅ Capacity check
    const currentSold = eventData.ticketsSold || 0;
    const capacity = eventData.ticketsAvailable || null;
    if (capacity != null && currentSold + safeGroupSize > capacity) {
      return res.status(400).json({ error: 'Not enough spots remaining for this group size' });
    }

    // ✅ Dedupe — one registration per email per event
    const normalizedEmail = buyerEmail.toLowerCase().trim();
    const existingQuery = query(
      collection(db, 'tickets'),
      where('eventId', '==', eventId),
      where('buyerEmail', '==', normalizedEmail)
    );
    const existingSnap = await getDocs(existingQuery);
    if (!existingSnap.empty) {
      return res.status(400).json({ error: 'You have already registered for this event' });
    }

    // ✅ Validate required custom questions
    const questions = eventData.customQuestions || [];
    for (const q of questions) {
      if (q.required && !customAnswers[q.id]) {
        return res.status(400).json({ error: `Missing required answer: ${q.label}` });
      }
    }

    // ✅ Validate guest names present for the chosen group size
    const cleanGuests = (guests || []).slice(0, safeGroupSize - 1).map(g => ({
      name: (g.name || '').trim(),
      email: (g.email || '').trim() || null,
      phone: (g.phone || '').trim() || null,
    }));
    if (cleanGuests.length < safeGroupSize - 1 || cleanGuests.some(g => !g.name)) {
      return res.status(400).json({ error: 'All guest names are required for the selected group size' });
    }

    const ticketId = generateTicketId();

    const ticketData = {
      ticketId,
      eventId,
      eventTitle: eventData.title,
      buyerName: buyerName.trim(),
      buyerEmail: normalizedEmail,
      buyerPhone: buyerPhone.trim(),
      quantity: safeGroupSize,
      groupSize: safeGroupSize,
      guests: cleanGuests,
      customAnswers,
      ticketPrice: 0,
      serviceFee: 0,
      paystackFee: 0,
      subtotal: 0,
      creditsApplied: 0,
      totalPaid: 0,
      paymentReference: null,
      eventDate: formatEventDate(eventData),
      eventTime: formatEventTime(eventData),
      status: 'valid',
      checkedIn: false,
      userId: null,
      purchasedAt: serverTimestamp(),
      tierId: null,
      tierName: null,
      isFreeRegistration: true,
    };

    // NOTE: no payment happened here, so unlike the Paystack webhook this
    // write is not verifying a charge — it's the registration itself.
    await setDoc(doc(db, 'tickets', ticketId), ticketData);

    await updateDoc(eventRef, {
      ticketsSold: increment(safeGroupSize)
    });

    try {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD }
      });
      await transporter.sendMail({
        from: `"OutingStation" <${process.env.GMAIL_USER}>`,
        to: buyerEmail,
        subject: `✅ You're Registered — ${eventData.title}`,
        html: generateFreeRegistrationEmail(ticketData, eventData)
      });
      console.log(`📧 Free registration email sent to: ${buyerEmail}`);
    } catch (emailErr) {
      // Don't fail the whole registration if the email fails to send —
      // the registration itself already succeeded and was saved above.
      console.error('❌ Failed to send registration email:', emailErr);
    }

    console.log(`✅ Free registration saved: ${ticketId} (${safeGroupSize} people) for event ${eventId}`);

    return res.status(200).json({
      success: true,
      ticketId,
      groupSize: safeGroupSize,
    });

  } catch (error) {
    console.error('❌ Free registration error:', error);
    console.error('❌ Stack:', error.stack);
    return res.status(500).json({
      error: 'Registration failed',
      message: error.message
    });
  }
}