// api/paystack-webhook.js
// Vercel Serverless Function - Using Firebase Web SDK (like frontend!)
// ✅ ADDED: Credit deduction after successful payment

import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc, updateDoc, increment, serverTimestamp } from 'firebase/firestore';

// Initialize Firebase (same as frontend)
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
};

// Initialize Firebase app (only once)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);

// Helper: Generate ticket ID
function generateTicketId() {
  return `OS-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
}

// Helper: Format event date
function formatEventDate(event) {
  if (event.eventDuration === 'single' && event.date) {
    const date = event.date.toDate ? event.date.toDate() : new Date(event.date);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
    });
  } else if (event.placeAvailability) {
    return event.placeAvailability;
  }
  return 'TBD';
}

// Helper: Format event time
function formatEventTime(event) {
  if (event.eventDuration === 'single' && event.time) {
    return event.time;
  } else if (event.openingTime && event.closingTime) {
    return `${event.openingTime} - ${event.closingTime}`;
  }
  return 'TBD';
}

// ✅ NEW: Apply credits to transaction (FIFO - oldest first)
function applyCreditsToTransaction(creditsHistory, amountToUse) {
  const activeCredits = creditsHistory
    .filter(credit => credit.status === 'active' && credit.amount > 0)
    .sort((a, b) => new Date(a.earnedAt) - new Date(b.earnedAt)); // FIFO - oldest first

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

// ✅ NEW: Deduct credits from user account
async function deductCreditsFromUser(userId, creditsApplied) {
  if (!userId || !creditsApplied || creditsApplied <= 0) {
    console.log('No credits to deduct');
    return;
  }

  try {
    console.log(`💳 Deducting ₦${creditsApplied} credits from user ${userId}`);

    // Get user document
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      console.error('User not found:', userId);
      return;
    }

    const userData = userDoc.data();
    const creditsHistory = userData.creditsHistory || [];

    // Calculate which credits to deduct (FIFO)
    const creditsToDeduct = applyCreditsToTransaction(creditsHistory, creditsApplied);

    if (creditsToDeduct.length === 0) {
      console.warn('No active credits found to deduct');
      return;
    }

    // Update credits history
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

    // Update user document
    await updateDoc(userRef, {
      creditsHistory: updatedCreditsHistory,
      totalCredits: increment(-creditsApplied),
      updatedAt: new Date()
    });

    console.log(`✅ Successfully deducted ₦${creditsApplied} credits`);
    console.log(`📊 Deducted from ${creditsToDeduct.length} credit(s)`);
  } catch (err) {
    console.error('❌ Error deducting credits:', err);
  }
}

// ✅ UPDATED: Generate email HTML with credits info
function generateTicketEmail(ticketData, eventData) {
  const showCredits = ticketData.creditsApplied && ticketData.creditsApplied > 0;
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Your OutingStation Ticket</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f7fafc;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f7fafc; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <tr>
            <td style="background: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%); padding: 40px 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 32px;">🎉 Ticket Confirmed!</h1>
              <p style="color: #e0f2fe; margin: 10px 0 0 0;">OutingStation</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px; text-align: center; background-color: #f0fdfa;">
              <p style="margin: 0 0 10px 0; color: #0f766e; font-size: 14px; font-weight: 600;">YOUR TICKET ID</p>
              <div style="background-color: #ffffff; border: 3px dashed #06b6d4; border-radius: 12px; padding: 20px;">
                <p style="margin: 0; font-size: 28px; font-weight: bold; color: #0891b2; font-family: monospace;">${ticketData.ticketId}</p>
              </div>
              <p style="margin: 15px 0 0 0; color: #64748b; font-size: 13px;">Show this ID at the event entrance</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px;">
              <h2 style="color: #1e293b; margin: 0 0 20px 0;">${eventData.title}</h2>
              <p><strong>📅 Date:</strong> ${ticketData.eventDate}</p>
              <p><strong>🕐 Time:</strong> ${ticketData.eventTime}</p>
              <p><strong>📍 Location:</strong> ${eventData.address || eventData.location}</p>
              <p><strong>👤 Name:</strong> ${ticketData.buyerName}</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px; background-color: #f8fafc;">
              <h3 style="margin-top: 0;">Payment Summary</h3>
              <p style="margin: 5px 0;">Ticket Price (${ticketData.quantity}x): ₦${ticketData.ticketPrice.toLocaleString()}</p>
              <p style="margin: 5px 0;">Service Fee: ₦${ticketData.serviceFee.toLocaleString()}</p>
              <p style="margin: 5px 0;">Payment Processing: ₦${ticketData.paystackFee.toLocaleString()}</p>
              ${showCredits ? `
              <p style="margin: 5px 0; color: #10b981; font-weight: bold;">Credits Applied: -₦${ticketData.creditsApplied.toLocaleString()}</p>
              ` : ''}
              <p style="margin: 15px 0 0 0;"><strong>Total Paid: ₦${ticketData.totalPaid.toLocaleString()}</strong></p>
              ${showCredits ? `
              <p style="margin: 10px 0 0 0; font-size: 12px; color: #10b981;">💰 You saved ₦${ticketData.creditsApplied.toLocaleString()} with credits!</p>
              ` : ''}
            </td>
          </tr>
          <tr>
            <td style="padding: 30px; text-align: center; background-color: #0891b2;">
              <p style="margin: 0; color: #ffffff;">Thank you for using OutingStation! 🎉</p>
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

// ✅ UPDATED: Extract metadata (handles credits_applied field!)
function extractMetadata(paymentData) {
  const rawMetadata = paymentData.metadata || {};
  
  // Try custom_fields format first (web)
  if (rawMetadata.custom_fields && Array.isArray(rawMetadata.custom_fields)) {
    const metadata = rawMetadata.custom_fields.reduce((acc, field) => {
      acc[field.variable_name] = field.value;
      return acc;
    }, {});
    
    // Return with consistent field names
    return {
      eventId: metadata.event_id || metadata.eventId,
      eventTitle: metadata.event_title || metadata.eventTitle,
      quantity: metadata.quantity,
      buyerName: metadata.buyer_name || metadata.buyerName,
      buyerPhone: metadata.buyer_phone || metadata.buyerPhone,
      ticketPrice: metadata.ticket_price || metadata.ticketPrice,
      serviceFee: metadata.service_fee || metadata.serviceFee,
      subtotal: metadata.subtotal,
      creditsApplied: metadata.credits_applied || 0, // ✅ NEW
      totalAmount: metadata.total_amount || metadata.totalPaid,
    };
  }
  
  // Otherwise use direct fields (mobile or fallback)
  return {
    eventId: rawMetadata.eventId || rawMetadata.event_id,
    eventTitle: rawMetadata.eventTitle || rawMetadata.event_title,
    quantity: rawMetadata.quantity,
    buyerName: rawMetadata.buyerName || rawMetadata.buyer_name,
    buyerPhone: rawMetadata.buyerPhone || rawMetadata.buyer_phone,
    ticketPrice: rawMetadata.ticketPrice || rawMetadata.ticket_price,
    serviceFee: rawMetadata.serviceFee || rawMetadata.service_fee,
    subtotal: rawMetadata.subtotal,
    creditsApplied: rawMetadata.credits_applied || rawMetadata.creditsApplied || 0, // ✅ NEW
    totalAmount: rawMetadata.total_amount || rawMetadata.totalAmount,
  };
}

// Main webhook handler
export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verify Paystack signature
    const hash = crypto
      .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY)
      .update(JSON.stringify(req.body))
      .digest('hex');

    if (hash !== req.headers['x-paystack-signature']) {
      console.log('Invalid signature');
      return res.status(400).json({ error: 'Invalid signature' });
    }

    const event = req.body;

    // Only process successful payments
    if (event.event !== 'charge.success') {
      return res.status(200).json({ message: 'Event ignored' });
    }

    const paymentData = event.data;
    
    // ✅ UPDATED: Extract metadata (includes credits!)
    const metadata = extractMetadata(paymentData);
    
    console.log('📦 Metadata extracted:', metadata);

    // Get event details from Firestore
    const eventRef = doc(db, 'events', metadata.eventId);
    const eventDoc = await getDoc(eventRef);

    if (!eventDoc.exists()) {
      console.error('Event not found:', metadata.eventId);
      return res.status(404).json({ error: 'Event not found' });
    }

    const eventData = eventDoc.data();

    // ✅ NEW: Find user by email to deduct credits
    let userId = null;
    try {
      // Try to find user by email
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', paymentData.customer.email));
      const userSnapshot = await getDocs(q);
      
      if (!userSnapshot.empty) {
        userId = userSnapshot.docs[0].id;
        console.log(`✅ Found user: ${userId}`);
      }
    } catch (err) {
      console.warn('Could not find user:', err.message);
    }

    // ✅ NEW: Deduct credits if applicable
    if (userId && metadata.creditsApplied && metadata.creditsApplied > 0) {
      await deductCreditsFromUser(userId, metadata.creditsApplied);
    }

    // Generate ticket
    const ticketId = generateTicketId();
    const ticketData = {
      ticketId,
      eventId: metadata.eventId,
      eventTitle: eventData.title,
      buyerName: metadata.buyerName,
      buyerEmail: paymentData.customer.email,
      buyerPhone: metadata.buyerPhone || 'N/A',
      quantity: parseInt(metadata.quantity) || 1,
      ticketPrice: parseInt(metadata.ticketPrice) || 0,
      serviceFee: parseInt(metadata.serviceFee) || 0,
      paystackFee: Math.round((paymentData.amount / 100) * 0.015 + 100),
      subtotal: parseInt(metadata.subtotal) || 0, // ✅ NEW
      creditsApplied: parseInt(metadata.creditsApplied) || 0, // ✅ NEW
      totalPaid: parseInt(metadata.totalAmount) || (paymentData.amount / 100),
      paymentReference: paymentData.reference,
      purchasedAt: serverTimestamp(),
      checkedIn: false,
      eventDate: formatEventDate(eventData),
      eventTime: formatEventTime(eventData),
      status: 'valid',
      userId: userId || null // ✅ NEW: Store user ID if found
    };

    console.log('🎟️ Creating ticket:', ticketId);

    // Save ticket to Firestore
    await setDoc(doc(db, 'tickets', ticketId), ticketData);

    // Update event tickets sold count
    await updateDoc(eventRef, {
      ticketsSold: increment(ticketData.quantity)
    });

    console.log('📧 Sending email to:', paymentData.customer.email);

    // Send email
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD
      }
    });

    await transporter.sendMail({
      from: `"OutingStation" <${process.env.GMAIL_USER}>`,
      to: paymentData.customer.email,
      subject: `🎉 Your Ticket for ${eventData.title}`,
      html: generateTicketEmail(ticketData, eventData)
    });

    console.log('✅ Ticket generated and email sent:', ticketId);

    return res.status(200).json({ 
      success: true, 
      ticketId,
      creditsDeducted: metadata.creditsApplied || 0 // ✅ NEW
    });

  } catch (error) {
    console.error('❌ Webhook error:', error);
    return res.status(500).json({ 
      error: 'Webhook processing failed',
      message: error.message 
    });
  }
}