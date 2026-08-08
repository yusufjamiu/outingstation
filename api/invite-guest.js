// api/invite-guest.js
//
// Issues a comped ticket (₦0, no payment involved) for each invited email
// on a private, invite-only event, and emails each guest their QR code
// ticket directly. Reused from two call sites:
//   1. EventSubmissionsPage.jsx — automatically, right after an
//      invite-only private event is approved, for the organizer's
//      original invite list.
//   2. ManageEvent.jsx's "Invite Guests" panel — later, whenever the
//      organizer adds more guests after the event is already live.
// Both call this same endpoint so ticket generation, dedupe, and the
// email template only exist in one place.

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

// ✅ Invite email — branded "You're Invited!" instead of the free
// registration "You're Registered!" template, since this is a personal
// invitation the guest didn't request, not a form they filled in.
function generateInviteEmail(ticketData, eventData) {
  const verifyUrl = `https://www.outingstation.com/verify-ticket/${ticketData.ticketId}`;
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(verifyUrl)}&color=6d28d9&bgcolor=ffffff`;

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>You're Invited</title></head>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#faf5ff;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#faf5ff;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,0.12);">
        <tr>
          <td style="background:linear-gradient(135deg,#a855f7,#6d28d9);padding:36px;text-align:center;">
            <p style="color:rgba(255,255,255,0.75);margin:0 0 6px;font-size:12px;font-weight:700;letter-spacing:3px;text-transform:uppercase;">OutingStation</p>
            <h1 style="color:#ffffff;margin:0;font-size:26px;font-weight:900;">💌 You're Invited!</h1>
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
                  <div style="background: linear-gradient(135deg, #faf5ff, #f3e8ff); border: 2px dashed #a855f7; border-radius: 14px; padding: 14px 18px; margin-bottom: 14px;">
                    <p style="margin: 0 0 4px; font-size: 10px; color: #7c3aed; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px;">Ticket ID</p>
                    <p style="margin: 0; font-size: 18px; font-weight: 900; color: #6d28d9; font-family: 'Courier New', monospace;">${ticketData.ticketId}</p>
                  </div>
                  <p style="margin: 0 0 2px; font-size: 10px; color: #94a3b8; font-weight: 700; text-transform: uppercase;">You're On The Guest List</p>
                  <p style="margin: 0; font-size: 14px; color: #1e293b; font-weight: 700;">No payment or registration needed — just show this ticket at the door.</p>
                </td>
                <td style="vertical-align: top; width: 150px; text-align: center;">
                  <div style="background: white; border: 2px solid #e9d5ff; border-radius: 14px; padding: 10px; display: inline-block;">
                    <img src="${qrImageUrl}" alt="QR Code" width="126" height="126" style="display: block; border-radius: 6px;" />
                  </div>
                  <p style="margin: 8px 0 0; font-size: 11px; color: #94a3b8;">Scan at entrance</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="background:linear-gradient(135deg,#7c3aed,#6d28d9);padding:24px 32px;text-align:center;">
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
    const { eventId, emails } = req.body;

    if (!eventId || !Array.isArray(emails) || emails.length === 0) {
      return res.status(400).json({ error: 'eventId and a non-empty emails array are required' });
    }

    const eventRef = doc(db, 'events', eventId);
    const eventSnap = await getDoc(eventRef);
    if (!eventSnap.exists()) {
      return res.status(404).json({ error: 'Event not found' });
    }
    const eventData = eventSnap.data();

    // ✅ Normalize + dedupe the incoming list itself (protects against a
    // caller passing the same email twice in one request)
    const normalizedEmails = [...new Set(
      emails.map(e => (e || '').toLowerCase().trim()).filter(e => /\S+@\S+\.\S+/.test(e))
    )];

    if (normalizedEmails.length === 0) {
      return res.status(400).json({ error: 'No valid emails provided' });
    }

    const issued = [];
    const skipped = [];

    let transporter = null;
    try {
      transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD }
      });
    } catch (e) {
      console.error('❌ Could not init mail transporter:', e);
    }

    for (const email of normalizedEmails) {
      try {
        // ✅ Dedupe — don't double-invite someone already on this event's
        // ticket list (whether from an earlier invite batch, or if they
        // separately bought/registered a ticket for the same event).
        const existingQuery = query(
          collection(db, 'tickets'),
          where('eventId', '==', eventId),
          where('buyerEmail', '==', email)
        );
        const existingSnap = await getDocs(existingQuery);
        if (!existingSnap.empty) {
          skipped.push({ email, reason: 'already has a ticket for this event' });
          continue;
        }

        const ticketId = generateTicketId();
        const ticketData = {
          ticketId,
          eventId,
          eventTitle: eventData.title,
          buyerName: email.split('@')[0],
          buyerEmail: email,
          buyerPhone: null,
          quantity: 1,
          groupSize: 1,
          guests: [],
          customAnswers: {},
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
          tierName: 'Invited Guest',
          isFreeRegistration: false,
          // ✅ NEW — marks this ticket as issued via invite rather than
          // purchased/registered. Purely informational for anyone
          // inspecting the ticket doc later (e.g. Manage Event's list);
          // nothing in the check-in/scan flow needs to treat it
          // differently — a valid ticket is a valid ticket at the gate.
          isInvited: true,
          invitedAt: serverTimestamp(),
          // ✅ NEW — invite-only tickets are always from private events by
          // definition, but stamping it explicitly here (rather than
          // relying on callers to infer "isInvited implies private") keeps
          // this field consistent across all three ticket-creation paths,
          // so "My Tickets" can filter on the same field regardless of
          // how the ticket was issued.
          isPrivateEvent: true,
        };

        await setDoc(doc(db, 'tickets', ticketId), ticketData);
        await updateDoc(eventRef, { ticketsSold: increment(1) });

        if (transporter) {
          try {
            await transporter.sendMail({
              from: `"OutingStation" <${process.env.GMAIL_USER}>`,
              to: email,
              subject: `💌 You're Invited — ${eventData.title}`,
              html: generateInviteEmail(ticketData, eventData)
            });
          } catch (emailErr) {
            // Ticket already exists at this point — don't fail the whole
            // invite over a flaky email send, just note it in the response.
            console.error(`❌ Failed to send invite email to ${email}:`, emailErr);
          }
        }

        issued.push({ email, ticketId });
      } catch (err) {
        console.error(`❌ Failed to issue invite for ${email}:`, err);
        skipped.push({ email, reason: 'internal error' });
      }
    }

    return res.status(200).json({
      success: true,
      issuedCount: issued.length,
      skippedCount: skipped.length,
      issued,
      skipped,
    });
  } catch (error) {
    console.error('❌ Invite guest error:', error);
    return res.status(500).json({ error: 'Failed to issue invites', message: error.message });
  }
}