// api/paystack-webhook.js
// Vercel Serverless Function for Paystack Webhook

import crypto from 'crypto';
import nodemailer from 'nodemailer';
import admin from 'firebase-admin';

// Initialize Firebase Admin (only once)
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: process.env.FIREBASE_PROJECT_ID,
  });
}

const db = admin.firestore();

// Helper: Generate ticket ID
function generateTicketId() {
  return `OS-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
}

// Helper: Format event date
function formatEventDate(event) {
  if (event.eventDuration === 'single' && event.date) {
    const date = event.date.toDate();
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

// Helper: Generate email HTML
function generateTicketEmail(ticketData, eventData) {
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
              <h3>Payment Summary</h3>
              <p>Ticket Price (${ticketData.quantity}x): ₦${ticketData.ticketPrice.toLocaleString()}</p>
              <p>Service Fee: ₦${ticketData.serviceFee.toLocaleString()}</p>
              <p>Payment Processing: ₦${ticketData.paystackFee.toLocaleString()}</p>
              <p><strong>Total Paid: ₦${ticketData.totalPaid.toLocaleString()}</strong></p>
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
    
    // Extract metadata
    const metadata = paymentData.metadata.custom_fields.reduce((acc, field) => {
      acc[field.variable_name] = field.value;
      return acc;
    }, {});

    console.log('Payment successful:', paymentData.reference);

    // Get event details from Firestore
    const eventRef = db.collection('events').doc(metadata.event_id);
    const eventDoc = await eventRef.get();

    if (!eventDoc.exists) {
      console.error('Event not found:', metadata.event_id);
      return res.status(404).json({ error: 'Event not found' });
    }

    const eventData = eventDoc.data();

    // Generate ticket
    const ticketId = generateTicketId();
    const ticketData = {
      ticketId,
      eventId: metadata.event_id,
      eventTitle: eventData.title,
      buyerName: metadata.buyer_name,
      buyerEmail: paymentData.customer.email,
      quantity: parseInt(metadata.quantity) || 1,
      ticketPrice: parseInt(metadata.ticket_price) || 0,
      serviceFee: parseInt(metadata.service_fee) || 0,
      paystackFee: Math.round((paymentData.amount / 100) * 0.015 + 100),
      totalPaid: paymentData.amount / 100,
      paymentReference: paymentData.reference,
      purchasedAt: admin.firestore.FieldValue.serverTimestamp(),
      checkedIn: false,
      eventDate: formatEventDate(eventData),
      eventTime: formatEventTime(eventData),
      status: 'valid'
    };

    // Save ticket to Firestore
    await db.collection('tickets').doc(ticketId).set(ticketData);

    // Update event tickets sold count
    await eventRef.update({
      ticketsSold: admin.firestore.FieldValue.increment(ticketData.quantity)
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
      from: `"OutingStation" <${process.env.GMAIL_USER}>`,
      to: paymentData.customer.email,
      subject: `🎉 Your Ticket for ${eventData.title}`,
      html: generateTicketEmail(ticketData, eventData)
    });

    console.log('✅ Ticket generated and email sent:', ticketId);

    return res.status(200).json({ 
      success: true, 
      ticketId 
    });

  } catch (error) {
    console.error('Webhook error:', error);
    return res.status(500).json({ 
      error: 'Webhook processing failed',
      message: error.message 
    });
  }
}