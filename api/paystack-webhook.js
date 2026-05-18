import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { initializeApp, getApps } from 'firebase/app';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  increment,
  serverTimestamp,
  collection,
  query,
  where,
  getDocs
} from 'firebase/firestore';

export const config = {
  api: {
    bodyParser: true
  }
};

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
};

const app =
  getApps().length === 0
    ? initializeApp(firebaseConfig)
    : getApps()[0];

const db = getFirestore(app);

/* =========================================================
   HELPERS
========================================================= */

function generateTicketId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

  const random = Array.from({ length: 8 }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join('');

  return `OS-${new Date().getFullYear()}-${random}`;
}

function formatEventDate(event) {
  if (event.date) {
    const date = event.date.toDate
      ? event.date.toDate()
      : new Date(event.date);

    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  if (event.startDate) {
    const date = event.startDate.toDate
      ? event.startDate.toDate()
      : new Date(event.startDate);

    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  if (event.recurringPattern) {
    return `Every ${event.recurringDay || event.recurringPattern}`;
  }

  if (event.placeAvailability) {
    return event.placeAvailability;
  }

  return 'TBD';
}

function formatEventTime(event) {
  if (event.time) return event.time;

  if (event.dailyStartTime) {
    return `${event.dailyStartTime} - ${event.dailyEndTime || ''}`;
  }

  if (event.recurringTime) {
    return event.recurringTime;
  }

  if (event.openingTime && event.closingTime) {
    return `${event.openingTime} - ${event.closingTime}`;
  }

  return 'TBD';
}

/* =========================================================
   USER LOOKUP
========================================================= */

async function findUserByEmail(email) {
  try {
    const q = query(
      collection(db, 'users'),
      where('email', '==', email)
    );

    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      return snapshot.docs[0].id;
    }

    return null;
  } catch (error) {
    console.error('❌ Error finding user:', error);
    return null;
  }
}

/* =========================================================
   CREDIT SYSTEM
========================================================= */

function applyCreditsToTransaction(creditsHistory, amountToUse) {
  const activeCredits = creditsHistory
    .filter(
      (credit) =>
        credit.status === 'active' && credit.amount > 0
    )
    .sort(
      (a, b) =>
        new Date(a.earnedAt) - new Date(b.earnedAt)
    );

  const creditsToDeduct = [];
  let remainingToUse = amountToUse;

  for (const credit of activeCredits) {
    if (remainingToUse <= 0) break;

    const availableAmount =
      credit.amount - (credit.usedAmount || 0);

    const amountUsed = Math.min(
      availableAmount,
      remainingToUse
    );

    if (amountUsed > 0) {
      creditsToDeduct.push({
        id: credit.id,
        amountUsed,
        newUsedAmount:
          (credit.usedAmount || 0) + amountUsed,
        newRemainingAmount:
          availableAmount - amountUsed
      });

      remainingToUse -= amountUsed;
    }
  }

  return creditsToDeduct;
}

async function deductCreditsFromUser(
  userId,
  creditsApplied
) {
  if (
    !userId ||
    !creditsApplied ||
    creditsApplied <= 0
  ) {
    return;
  }

  try {
    const userRef = doc(db, 'users', userId);

    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) return;

    const userData = userDoc.data();

    const creditsHistory =
      userData.creditsHistory || [];

    const creditsToDeduct =
      applyCreditsToTransaction(
        creditsHistory,
        creditsApplied
      );

    if (creditsToDeduct.length === 0) return;

    const updatedCreditsHistory =
      creditsHistory.map((credit) => {
        const deduction = creditsToDeduct.find(
          (c) => c.id === credit.id
        );

        if (deduction) {
          return {
            ...credit,
            usedAmount: deduction.newUsedAmount,
            amount: deduction.newRemainingAmount,
            status:
              deduction.newRemainingAmount === 0
                ? 'used'
                : 'active'
          };
        }

        return credit;
      });

    await updateDoc(userRef, {
      creditsHistory: updatedCreditsHistory,
      totalCredits: increment(-creditsApplied),
      updatedAt: new Date()
    });

    console.log(
      `✅ Deducted ₦${creditsApplied} credits from ${userId}`
    );
  } catch (error) {
    console.error(
      '❌ Error deducting credits:',
      error
    );
  }
}

/* =========================================================
   METADATA PARSER
========================================================= */

function extractMetadata(paymentData) {
  let rawMetadata = paymentData.metadata || {};

  /* ---------------------------------------------
     CASE 1: STRINGIFIED JSON
  --------------------------------------------- */

  if (typeof rawMetadata === 'string') {
    try {
      rawMetadata = JSON.parse(rawMetadata);

      console.log(
        '✅ Parsed metadata string successfully'
      );
    } catch (error) {
      console.error(
        '❌ Failed parsing metadata string:',
        error.message
      );

      /* ---------------------------------------------
         REGEX FALLBACK
      --------------------------------------------- */

      const str = rawMetadata;

      const extract = (key) => {
        const match = str.match(
          new RegExp(
            `"variable_name":"${key}","value":"([^"]+)"`
          )
        );

        return match ? match[1] : null;
      };

      return {
        ticketId: extract('ticket_id'),
        eventId: extract('event_id'),
        eventTitle: extract('event_title'),
        quantity:
          parseInt(extract('quantity')) || 1,
        buyerName: extract('buyer_name'),
        buyerPhone: extract('buyer_phone'),
        ticketPrice:
          parseInt(extract('ticket_price')) || 0,
        serviceFee:
          parseInt(extract('service_fee')) || 0,
        subtotal:
          parseInt(extract('subtotal')) || 0,
        creditsApplied:
          parseInt(extract('credits_applied')) || 0,
        totalAmount:
          parseInt(extract('total_amount')) ||
          Math.round(paymentData.amount / 100)
      };
    }
  }

  /* ---------------------------------------------
     CASE 2: custom_fields
  --------------------------------------------- */

  if (
    rawMetadata.custom_fields &&
    Array.isArray(rawMetadata.custom_fields)
  ) {
    const fields =
      rawMetadata.custom_fields.reduce(
        (acc, field) => {
          acc[field.variable_name] = field.value;
          return acc;
        },
        {}
      );

    return {
      ticketId:
        fields.ticket_id ||
        fields.ticketId ||
        null,

      eventId:
        fields.event_id ||
        fields.eventId ||
        rawMetadata.event_id ||
        rawMetadata.eventId,

      eventTitle:
        fields.event_title ||
        fields.eventTitle,

      quantity:
        parseInt(fields.quantity) || 1,

      buyerName:
        fields.buyer_name ||
        fields.buyerName,

      buyerPhone:
        fields.buyer_phone ||
        fields.buyerPhone,

      ticketPrice:
        parseInt(
          fields.ticket_price ||
            fields.ticketPrice
        ) || 0,

      serviceFee:
        parseInt(
          fields.service_fee ||
            fields.serviceFee
        ) || 0,

      subtotal:
        parseInt(fields.subtotal) || 0,

      creditsApplied:
        parseInt(
          fields.credits_applied ||
            fields.creditsApplied
        ) || 0,

      totalAmount:
        parseInt(
          fields.total_amount ||
            fields.totalAmount
        ) ||
        Math.round(paymentData.amount / 100)
    };
  }

  /* ---------------------------------------------
     CASE 3: DIRECT OBJECT
  --------------------------------------------- */

  return {
    ticketId:
      rawMetadata.ticket_id ||
      rawMetadata.ticketId ||
      null,

    eventId:
      rawMetadata.event_id ||
      rawMetadata.eventId,

    eventTitle:
      rawMetadata.event_title ||
      rawMetadata.eventTitle,

    quantity:
      parseInt(rawMetadata.quantity) || 1,

    buyerName:
      rawMetadata.buyer_name ||
      rawMetadata.buyerName,

    buyerPhone:
      rawMetadata.buyer_phone ||
      rawMetadata.buyerPhone,

    ticketPrice:
      parseInt(
        rawMetadata.ticket_price ||
          rawMetadata.ticketPrice
      ) || 0,

    serviceFee:
      parseInt(
        rawMetadata.service_fee ||
          rawMetadata.serviceFee
      ) || 0,

    subtotal:
      parseInt(rawMetadata.subtotal) || 0,

    creditsApplied:
      parseInt(
        rawMetadata.credits_applied ||
          rawMetadata.creditsApplied
      ) || 0,

    totalAmount:
      parseInt(
        rawMetadata.total_amount ||
          rawMetadata.totalAmount
      ) || 0
  };
}

/* =========================================================
   EMAIL TEMPLATE
========================================================= */

function generateTicketEmail(
  ticketData,
  eventData
) {
  const verifyUrl = `https://www.outingstation.com/verify-ticket/${ticketData.ticketId}`;

  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
    verifyUrl
  )}`;

  return `
  <html>
    <body style="font-family:Arial;background:#f5f5f5;padding:20px;">
      <div style="max-width:600px;margin:auto;background:#fff;border-radius:12px;padding:30px;">
        
        <h1 style="color:#0891b2;">
          🎉 Ticket Confirmed
        </h1>

        <h2>${eventData.title}</h2>

        <p>
          <strong>Date:</strong>
          ${ticketData.eventDate}
        </p>

        <p>
          <strong>Time:</strong>
          ${ticketData.eventTime}
        </p>

        <p>
          <strong>Location:</strong>
          ${
            eventData.address ||
            eventData.location ||
            'TBD'
          }
        </p>

        <hr />

        <p>
          <strong>Ticket ID:</strong>
          ${ticketData.ticketId}
        </p>

        <p>
          <strong>Name:</strong>
          ${ticketData.buyerName}
        </p>

        <p>
          <strong>Email:</strong>
          ${ticketData.buyerEmail}
        </p>

        <p>
          <strong>Quantity:</strong>
          ${ticketData.quantity}
        </p>

        <p>
          <strong>Total Paid:</strong>
          ₦${ticketData.totalPaid.toLocaleString()}
        </p>

        <div style="margin-top:30px;text-align:center;">
          <img
            src="${qrImageUrl}"
            width="200"
            height="200"
          />
        </div>

        <p style="margin-top:20px;">
          Show this QR code at the entrance.
        </p>

      </div>
    </body>
  </html>
  `;
}

/* =========================================================
   MAIN WEBHOOK
========================================================= */

export default async function handler(
  req,
  res
) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Method not allowed'
    });
  }

  try {
    /* ---------------------------------------------
       VERIFY PAYSTACK SIGNATURE
    --------------------------------------------- */

    const hash = crypto
      .createHmac(
        'sha512',
        process.env.PAYSTACK_SECRET_KEY
      )
      .update(JSON.stringify(req.body))
      .digest('hex');

    const signature =
      req.headers['x-paystack-signature'];

    if (hash !== signature) {
      console.log('❌ Invalid signature');

      return res.status(400).json({
        error: 'Invalid signature'
      });
    }

    /* ---------------------------------------------
       EVENT
    --------------------------------------------- */

    const event = req.body;

    if (event.event !== 'charge.success') {
      return res.status(200).json({
        message: 'Event ignored'
      });
    }

    const paymentData = event.data;

    console.log(
      '📦 Processing payment:',
      paymentData.reference
    );

    /* ---------------------------------------------
       IDEMPOTENCY CHECK
    --------------------------------------------- */

    const existingTicketQuery = query(
      collection(db, 'tickets'),
      where(
        'paymentReference',
        '==',
        paymentData.reference
      )
    );

    const existingSnapshot = await getDocs(
      existingTicketQuery
    );

    if (!existingSnapshot.empty) {
      console.log(
        '⚠️ Ticket already exists for payment reference'
      );

      return res.status(200).json({
        success: true,
        message: 'Ticket already processed'
      });
    }

    /* ---------------------------------------------
       METADATA
    --------------------------------------------- */

    const metadata =
      extractMetadata(paymentData);

    console.log(
      '📦 Extracted metadata:',
      metadata
    );

    if (!metadata.eventId) {
      console.error(
        '❌ Missing eventId in metadata'
      );

      return res.status(400).json({
        error: 'Missing eventId'
      });
    }

    /* ---------------------------------------------
       LOAD EVENT
    --------------------------------------------- */

    const eventRef = doc(
      db,
      'events',
      metadata.eventId
    );

    const eventDoc = await getDoc(eventRef);

    if (!eventDoc.exists()) {
      console.error(
        '❌ Event not found:',
        metadata.eventId
      );

      return res.status(404).json({
        error: 'Event not found'
      });
    }

    const eventData = eventDoc.data();

    /* ---------------------------------------------
       FIND USER
    --------------------------------------------- */

    const userId = await findUserByEmail(
      paymentData.customer.email
    );

    /* ---------------------------------------------
       DEDUCT CREDITS
    --------------------------------------------- */

    if (
      userId &&
      metadata.creditsApplied > 0
    ) {
      await deductCreditsFromUser(
        userId,
        metadata.creditsApplied
      );
    }

    /* ---------------------------------------------
       GENERATE TICKET
    --------------------------------------------- */

    const ticketId =
      metadata.ticketId ||
      generateTicketId();

    const totalPaid =
      metadata.totalAmount > 0
        ? metadata.totalAmount
        : Math.round(paymentData.amount / 100);

    const paystackFee = Math.round(
      paymentData.amount / 100 * 0.015 + 100
    );

    const ticketData = {
      ticketId,

      eventId: metadata.eventId,

      eventTitle: eventData.title,

      buyerName:
        metadata.buyerName ||
        paymentData.customer.first_name ||
        'Guest',

      buyerEmail:
        paymentData.customer.email,

      buyerPhone:
        metadata.buyerPhone ||
        paymentData.customer.phone ||
        'N/A',

      quantity: metadata.quantity,

      ticketPrice: metadata.ticketPrice,

      serviceFee: metadata.serviceFee,

      subtotal: metadata.subtotal,

      paystackFee,

      creditsApplied:
        metadata.creditsApplied,

      totalPaid,

      paymentReference:
        paymentData.reference,

      paymentStatus:
        paymentData.status,

      currency:
        paymentData.currency || 'NGN',

      eventDate:
        formatEventDate(eventData),

      eventTime:
        formatEventTime(eventData),

      checkedIn: false,

      status: 'valid',

      userId: userId || null,

      createdAt: serverTimestamp(),

      purchasedAt: serverTimestamp()
    };

    /* ---------------------------------------------
       SAVE TICKET
    --------------------------------------------- */

    await setDoc(
      doc(db, 'tickets', ticketId),
      ticketData
    );

    console.log(
      `✅ Ticket saved: ${ticketId}`
    );

    /* ---------------------------------------------
       UPDATE EVENT STATS
    --------------------------------------------- */

    await updateDoc(eventRef, {
      ticketsSold: increment(
        metadata.quantity
      )
    });

    console.log(
      '✅ Event ticket count updated'
    );

    /* ---------------------------------------------
       SEND EMAIL
    --------------------------------------------- */

    const transporter =
      nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.GMAIL_USER,
          pass:
            process.env.GMAIL_APP_PASSWORD
        }
      });

    await transporter.sendMail({
      from: `"OutingStation Tickets" <${process.env.GMAIL_USER}>`,
      to: paymentData.customer.email,
      subject: `🎉 Your Ticket for ${eventData.title}`,

      html: generateTicketEmail(
        ticketData,
        eventData
      )
    });

    console.log(
      `📧 Ticket email sent to ${paymentData.customer.email}`
    );

    /* ---------------------------------------------
       SUCCESS RESPONSE
    --------------------------------------------- */

    return res.status(200).json({
      success: true,
      ticketId,
      eventId: metadata.eventId,
      reference: paymentData.reference
    });

  } catch (error) {
    console.error(
      '❌ WEBHOOK ERROR:',
      error
    );

    console.error(error.stack);

    return res.status(500).json({
      error: 'Webhook processing failed',
      message: error.message
    });
  }
}