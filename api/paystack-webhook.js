import crypto from 'crypto';
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
    return date.toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
  }
  if (event.startDate) {
    const date = event.startDate.toDate ? event.startDate.toDate() : new Date(event.startDate);
    return date.toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
  }
  if (event.recurringPattern) return `Every ${event.recurringDay || event.recurringPattern}`;
  if (event.placeAvailability) return event.placeAvailability;
  return 'TBD';
}

function formatEventTime(event) {
  if (event.time) return event.time;
  if (event.dailyStartTime) return `${event.dailyStartTime} - ${event.dailyEndTime || ''}`;
  if (event.recurringTime) return event.recurringTime;
  if (event.openingTime && event.closingTime) return `${event.openingTime} - ${event.closingTime}`;
  return 'TBD';
}

function applyCreditsToTransaction(creditsHistory, amountToUse) {
  const activeCredits = creditsHistory
    .filter(credit => credit.status === 'active' && credit.amount > 0)
    .sort((a, b) => new Date(a.earnedAt) - new Date(b.earnedAt));

  const creditsToDeduct = [];
  let remainingToUse = amountToUse;

  for (const credit of activeCredits) {
    if (remainingToUse <= 0) break;
    const availableAmount = credit.amount - (credit.usedAmount || 0);
    const amountUsed = Math.min(availableAmount, remainingToUse);
    if (amountUsed > 0) {
      creditsToDeduct.push({
        id: credit.id,
        amountUsed,
        newUsedAmount: (credit.usedAmount || 0) + amountUsed,
        newRemainingAmount: availableAmount - amountUsed
      });
      remainingToUse -= amountUsed;
    }
  }
  return creditsToDeduct;
}

async function deductCreditsFromUser(userId, creditsApplied) {
  if (!userId || !creditsApplied || creditsApplied <= 0) return;
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    if (!userDoc.exists()) return;

    const userData = userDoc.data();
    const creditsHistory = userData.creditsHistory || [];
    const creditsToDeduct = applyCreditsToTransaction(creditsHistory, creditsApplied);
    if (creditsToDeduct.length === 0) return;

    const updatedCreditsHistory = creditsHistory.map(credit => {
      const deduction = creditsToDeduct.find(c => c.id === credit.id);
      if (deduction) {
        return {
          ...credit,
          usedAmount: deduction.newUsedAmount,
          amount: deduction.newRemainingAmount,
          status: deduction.newRemainingAmount === 0 ? 'used' : 'active'
        };
      }
      return credit;
    });

    await updateDoc(userRef, {
      creditsHistory: updatedCreditsHistory,
      totalCredits: increment(-creditsApplied),
      updatedAt: new Date()
    });

    console.log(`✅ Deducted ₦${creditsApplied} credits from user ${userId}`);
  } catch (err) {
    console.error('❌ Error deducting credits:', err);
  }
}

async function findUserByEmail(email) {
  try {
    const q = query(collection(db, 'users'), where('email', '==', email));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) return snapshot.docs[0].id;
    return null;
  } catch (err) {
    console.error('❌ Error finding user:', err);
    return null;
  }
}

function extractMetadata(paymentData) {
  const rawMetadata = paymentData.metadata || {};

  if (rawMetadata.custom_fields && Array.isArray(rawMetadata.custom_fields)) {
    const metadata = rawMetadata.custom_fields.reduce((acc, field) => {
      acc[field.variable_name] = field.value;
      return acc;
    }, {});

    return {
      ticketId: metadata.ticket_id || metadata.ticketId || null,
      eventId: metadata.event_id || metadata.eventId,
      eventTitle: metadata.event_title || metadata.eventTitle,
      quantity: parseInt(metadata.quantity) || 1,
      buyerName: metadata.buyer_name || metadata.buyerName,
      buyerPhone: metadata.buyer_phone || metadata.buyerPhone,
      ticketPrice: parseInt(metadata.ticket_price || metadata.ticketPrice) || 0,
      serviceFee: parseInt(metadata.service_fee || metadata.serviceFee) || 0,
      subtotal: parseInt(metadata.subtotal) || 0,
      creditsApplied: parseInt(metadata.credits_applied) || 0,
      totalAmount: parseInt(metadata.total_amount || metadata.totalPaid) || 0,
    };
  }

  return {
    ticketId: rawMetadata.ticket_id || rawMetadata.ticketId || null,
    eventId: rawMetadata.eventId || rawMetadata.event_id,
    eventTitle: rawMetadata.eventTitle || rawMetadata.event_title,
    quantity: parseInt(rawMetadata.quantity) || 1,
    buyerName: rawMetadata.buyerName || rawMetadata.buyer_name,
    buyerPhone: rawMetadata.buyerPhone || rawMetadata.buyer_phone,
    ticketPrice: parseInt(rawMetadata.ticketPrice || rawMetadata.ticket_price) || 0,
    serviceFee: parseInt(rawMetadata.serviceFee || rawMetadata.service_fee) || 0,
    subtotal: parseInt(rawMetadata.subtotal) || 0,
    creditsApplied: parseInt(rawMetadata.credits_applied || rawMetadata.creditsApplied) || 0,
    totalAmount: parseInt(rawMetadata.total_amount || rawMetadata.totalAmount || rawMetadata.totalPaid) || 0,
  };
}

function generateTicketEmail(ticketData, eventData) {
  const showCredits = ticketData.creditsApplied && ticketData.creditsApplied > 0;
  const verifyUrl = `https://www.outingstation.com/verify-ticket/${ticketData.ticketId}`;
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(verifyUrl)}&color=0e7490&bgcolor=ffffff`;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your OutingStation Ticket</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f0f9ff;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f0f9ff; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 8px 32px rgba(0,0,0,0.12);">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #06b6d4 0%, #0891b2 60%, #0e7490 100%); padding: 44px 36px; text-align: center; position: relative;">
              <p style="color: rgba(255,255,255,0.75); margin: 0 0 6px; font-size: 12px; font-weight: 700; letter-spacing: 3px; text-transform: uppercase;">OutingStation</p>
              <h1 style="color: #ffffff; margin: 0 0 8px; font-size: 30px; font-weight: 900;">🎉 You're Going!</h1>
              <p style="color: #e0f2fe; margin: 0; font-size: 15px;">Your ticket has been confirmed</p>
            </td>
          </tr>

          <!-- Event info -->
          <tr>
            <td style="padding: 28px 36px 16px;">
              <h2 style="margin: 0 0 12px; color: #0f172a; font-size: 22px; font-weight: 800; line-height: 1.3;">${eventData.title}</h2>
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding: 3px 0; font-size: 14px; color: #475569;">📅&nbsp;&nbsp;${ticketData.eventDate}</td>
                </tr>
                <tr>
                  <td style="padding: 3px 0; font-size: 14px; color: #475569;">🕐&nbsp;&nbsp;${ticketData.eventTime}</td>
                </tr>
                <tr>
                  <td style="padding: 3px 0; font-size: 14px; color: #475569;">📍&nbsp;&nbsp;${eventData.address || eventData.location || 'TBD'}</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding: 0 36px;">
              <div style="border-top: 2px dashed #cbd5e1; position: relative;">
                <div style="position: absolute; left: -20px; top: -10px; width: 20px; height: 20px; background: #f0f9ff; border-radius: 50%;"></div>
                <div style="position: absolute; right: -20px; top: -10px; width: 20px; height: 20px; background: #f0f9ff; border-radius: 50%;"></div>
              </div>
            </td>
          </tr>

          <!-- Ticket body: details + QR -->
          <tr>
            <td style="padding: 24px 36px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <!-- Left: ticket details -->
                  <td style="vertical-align: top; padding-right: 24px;">

                    <!-- Ticket ID -->
                    <div style="background: linear-gradient(135deg, #ecfeff, #e0f2fe); border: 2px dashed #06b6d4; border-radius: 14px; padding: 16px 20px; margin-bottom: 16px;">
                      <p style="margin: 0 0 4px; font-size: 10px; color: #0891b2; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px;">Ticket ID</p>
                      <p style="margin: 0; font-size: 20px; font-weight: 900; color: #0e7490; font-family: 'Courier New', monospace; letter-spacing: 1px;">${ticketData.ticketId}</p>
                    </div>

                    <!-- Buyer details -->
                    <table cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td style="padding-bottom: 10px;">
                          <p style="margin: 0 0 2px; font-size: 10px; color: #94a3b8; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">Ticket Holder</p>
                          <p style="margin: 0; font-size: 14px; color: #1e293b; font-weight: 700;">${ticketData.buyerName}</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding-bottom: 10px;">
                          <p style="margin: 0 0 2px; font-size: 10px; color: #94a3b8; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">Email</p>
                          <p style="margin: 0; font-size: 13px; color: #1e293b; font-weight: 500;">${ticketData.buyerEmail}</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding-bottom: 10px;">
                          <p style="margin: 0 0 2px; font-size: 10px; color: #94a3b8; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">Phone</p>
                          <p style="margin: 0; font-size: 13px; color: #1e293b; font-weight: 500;">${ticketData.buyerPhone}</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding-bottom: 10px;">
                          <p style="margin: 0 0 2px; font-size: 10px; color: #94a3b8; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">Quantity</p>
                          <p style="margin: 0; font-size: 14px; color: #1e293b; font-weight: 700;">${ticketData.quantity} ticket${ticketData.quantity > 1 ? 's' : ''}</p>
                        </td>
                      </tr>
                      <tr>
                        <td>
                          <p style="margin: 0 0 2px; font-size: 10px; color: #94a3b8; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">Amount Paid</p>
                          <p style="margin: 0; font-size: 20px; color: #0891b2; font-weight: 900;">₦${ticketData.totalPaid?.toLocaleString()}</p>
                          ${showCredits ? `<p style="margin: 3px 0 0; font-size: 11px; color: #10b981; font-weight: 600;">💰 Saved ₦${ticketData.creditsApplied?.toLocaleString()} with credits</p>` : ''}
                        </td>
                      </tr>
                    </table>
                  </td>

                  <!-- Right: QR Code -->
                  <td style="vertical-align: top; width: 160px; text-align: center;">
                    <div style="background: white; border: 2px solid #bae6fd; border-radius: 14px; padding: 12px; display: inline-block;">
                      <img src="${qrImageUrl}" alt="QR Code" width="136" height="136" style="display: block; border-radius: 6px;" />
                    </div>
                    <p style="margin: 8px 0 0; font-size: 11px; color: #94a3b8; text-align: center; line-height: 1.4;">Scan at<br/>entrance</p>
                    <div style="margin-top: 8px; background: #ecfdf5; border-radius: 8px; padding: 4px 8px;">
                      <p style="margin: 0; font-size: 10px; color: #059669; font-weight: 700;">✓ VALID</p>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Entry notice -->
          <tr>
            <td style="padding: 0 36px 24px;">
              <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 14px 18px;">
                <p style="margin: 0; font-size: 13px; color: #166534; line-height: 1.6;">
                  🎟️ <strong>Entry Instructions:</strong> Show this email (QR code or Ticket ID) at the venue entrance. Screenshot or print for offline access.
                </p>
              </div>
            </td>
          </tr>

          <!-- Price breakdown -->
          <tr>
            <td style="padding: 0 36px 24px;">
              <div style="background: #f8fafc; border-radius: 12px; padding: 18px 20px;">
                <p style="margin: 0 0 14px; font-size: 13px; font-weight: 800; color: #374151; text-transform: uppercase; letter-spacing: 0.5px;">Payment Breakdown</p>
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="font-size: 13px; color: #6b7280; padding: 4px 0;">Ticket Price (${ticketData.quantity}x)</td>
                    <td style="font-size: 13px; color: #374151; text-align: right; font-weight: 600;">₦${(ticketData.ticketPrice * ticketData.quantity).toLocaleString()}</td>
                  </tr>
                  <tr>
                    <td style="font-size: 13px; color: #6b7280; padding: 4px 0;">Service Fee</td>
                    <td style="font-size: 13px; color: #374151; text-align: right; font-weight: 600;">₦${ticketData.serviceFee?.toLocaleString()}</td>
                  </tr>
                  <tr>
                    <td style="font-size: 13px; color: #6b7280; padding: 4px 0;">Payment Processing</td>
                    <td style="font-size: 13px; color: #374151; text-align: right; font-weight: 600;">₦${ticketData.paystackFee?.toLocaleString()}</td>
                  </tr>
                  ${showCredits ? `
                  <tr>
                    <td style="font-size: 13px; color: #10b981; padding: 4px 0; font-weight: 700;">Credits Applied</td>
                    <td style="font-size: 13px; color: #10b981; text-align: right; font-weight: 700;">-₦${ticketData.creditsApplied?.toLocaleString()}</td>
                  </tr>` : ''}
                  <tr>
                    <td colspan="2" style="padding: 6px 0;">
                      <div style="border-top: 1px solid #e5e7eb;"></div>
                    </td>
                  </tr>
                  <tr>
                    <td style="font-size: 15px; color: #111827; font-weight: 800; padding-top: 6px;">Total Paid</td>
                    <td style="font-size: 16px; color: #0891b2; text-align: right; font-weight: 900; padding-top: 6px;">₦${ticketData.totalPaid?.toLocaleString()}</td>
                  </tr>
                </table>
              </div>
            </td>
          </tr>

          <!-- Payment reference -->
          <tr>
            <td style="padding: 0 36px 28px;">
              <p style="margin: 0 0 4px; font-size: 10px; color: #94a3b8; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">Payment Reference</p>
              <p style="margin: 0; font-size: 12px; color: #64748b; font-family: 'Courier New', monospace;">${ticketData.paymentReference}</p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background: linear-gradient(135deg, #0891b2, #0e7490); padding: 28px 36px; text-align: center;">
              <p style="margin: 0 0 6px; color: #ffffff; font-size: 16px; font-weight: 800;">See you at the event! 🎊</p>
              <p style="margin: 0 0 12px; color: rgba(255,255,255,0.75); font-size: 13px;">Have questions? We're here to help.</p>
              <a href="mailto:admin@outingstation.com" style="display: inline-block; background: rgba(255,255,255,0.15); color: #ffffff; text-decoration: none; padding: 8px 20px; border-radius: 20px; font-size: 13px; font-weight: 600;">admin@outingstation.com</a>
              <p style="margin: 16px 0 0; color: rgba(255,255,255,0.4); font-size: 11px;">© ${new Date().getFullYear()} OutingStation • outingstation.com</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const hash = crypto
      .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY)
      .update(JSON.stringify(req.body))
      .digest('hex');

    if (hash !== req.headers['x-paystack-signature']) {
      console.log('❌ Invalid signature');
      return res.status(400).json({ error: 'Invalid signature' });
    }

    const event = req.body;

    if (event.event !== 'charge.success') {
      return res.status(200).json({ message: 'Event ignored' });
    }

    const paymentData = event.data;
    const metadata = extractMetadata(paymentData);

    console.log('📦 Processing payment:', paymentData.customer.email);
    console.log('📦 Metadata:', JSON.stringify(metadata, null, 2));

    // Find user
    const userId = await findUserByEmail(paymentData.customer.email);

    // Deduct credits
    if (userId && metadata.creditsApplied > 0) {
      await deductCreditsFromUser(userId, metadata.creditsApplied);
    }

    // Load event
    const eventDoc = await getDoc(doc(db, 'events', metadata.eventId));
    if (!eventDoc.exists()) {
      console.error('❌ Event not found:', metadata.eventId);
      return res.status(404).json({ error: 'Event not found' });
    }
    const eventData = eventDoc.data();

    // ✅ Use ticketId from frontend metadata if provided, else generate new
    const ticketId = metadata.ticketId || generateTicketId();

    const paystackFee = Math.round((paymentData.amount / 100) * 0.015 + 100);

    const ticketData = {
      ticketId,
      eventId: metadata.eventId,
      eventTitle: eventData.title,
      buyerName: metadata.buyerName || 'Guest',
      buyerEmail: paymentData.customer.email,
      buyerPhone: metadata.buyerPhone || 'N/A',
      quantity: metadata.quantity,
      ticketPrice: metadata.ticketPrice,
      serviceFee: metadata.serviceFee,
      paystackFee,
      subtotal: metadata.subtotal,
      creditsApplied: metadata.creditsApplied,
      totalPaid: metadata.totalAmount,
      paymentReference: paymentData.reference,
      eventDate: formatEventDate(eventData),
      eventTime: formatEventTime(eventData),
      status: 'valid',
      checkedIn: false,
      userId: userId || null,
      purchasedAt: serverTimestamp(),
    };

    // Save ticket (use ticketId as doc ID for easy lookup)
    await setDoc(doc(db, 'tickets', ticketId), ticketData);

    // Update ticketsSold
    await updateDoc(doc(db, 'events', metadata.eventId), {
      ticketsSold: increment(metadata.quantity)
    });

    // Send email
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD
      }
    });

    await transporter.sendMail({
      from: `"OutingStation Tickets" <${process.env.GMAIL_USER}>`,
      to: paymentData.customer.email,
      subject: `🎉 Your Ticket for ${eventData.title} — ${ticketId}`,
      html: generateTicketEmail(ticketData, eventData)
    });

    console.log(`✅ Ticket created: ${ticketId}`);
    console.log(`📧 Email sent to: ${paymentData.customer.email}`);

    return res.status(200).json({
      success: true,
      ticketId,
      creditsDeducted: metadata.creditsApplied
    });

  } catch (error) {
    console.error('❌ Webhook error:', error);
    return res.status(500).json({
      error: 'Webhook processing failed',
      message: error.message
    });
  }
}