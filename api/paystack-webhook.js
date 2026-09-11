import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { initializeApp, getApps } from 'firebase/app';
import {
  getFirestore, doc, getDoc, setDoc, updateDoc, addDoc,
  increment, serverTimestamp, collection, query, where, getDocs,
  runTransaction
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

// Same date/time formatting as EventDetails.jsx / SessionBookingSection.jsx
// use client-side, duplicated here since this webhook runs server-side with
// no shared utils module — kept in sync manually if either changes.
function formatSessionDate(dateStr) {
  if (!dateStr) return 'TBD';
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  } catch {
    return dateStr;
  }
}

function formatSessionTime(timeStr) {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':').map(Number);
  if (Number.isNaN(h)) return timeStr;
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m || 0).padStart(2, '0')} ${period}`;
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

async function updateTierSoldCount(eventId, tierId, tierName, quantity) {
  if (!eventId) return;
  if (!tierId && !tierName) {
    console.log('⚠️ updateTierSoldCount: no tierId or tierName — skipping');
    return;
  }

  try {
    const eventRef = doc(db, 'events', eventId);
    const eventSnap = await getDoc(eventRef);
    if (!eventSnap.exists()) return;

    const eventData = eventSnap.data();
    const tiers = eventData.ticketTiers || [];
    if (tiers.length === 0) return;

    let matched = false;
    const updatedTiers = tiers.map(tier => {
      const matchById = tierId && tier.id && tier.id === tierId;
      const matchByName = !matchById && tierName && tier.name === tierName;
      if (matchById || matchByName) {
        matched = true;
        return { ...tier, sold: (tier.sold || 0) + quantity };
      }
      return tier;
    });

    if (!matched) {
      console.log(`⚠️ No tier matched for tierId="${tierId}" tierName="${tierName}" — sold count NOT updated`);
      return;
    }

    await updateDoc(eventRef, { ticketTiers: updatedTiers });
    console.log(`✅ Tier sold count saved to Firestore`);
  } catch (err) {
    console.error('❌ Error updating tier sold count:', err);
  }
}

// same pattern as updateTierSoldCount, but for vendor stand "filled" counts
async function updateStandFilledCount(eventId, standId) {
  if (!eventId || !standId) {
    console.log('⚠️ updateStandFilledCount: missing eventId or standId — skipping');
    return;
  }
  try {
    const eventRef = doc(db, 'events', eventId);
    const eventSnap = await getDoc(eventRef);
    if (!eventSnap.exists()) return;

    const eventData = eventSnap.data();
    const stands = eventData.vendorStands || [];
    if (stands.length === 0) return;

    let matched = false;
    const updatedStands = stands.map(stand => {
      if (stand.id === standId) {
        matched = true;
        return { ...stand, filled: (stand.filled || 0) + 1 };
      }
      return stand;
    });

    if (!matched) {
      console.log(`⚠️ No stand matched for standId="${standId}" — filled count NOT updated`);
      return;
    }

    await updateDoc(eventRef, { vendorStands: updatedStands });
    console.log(`✅ Stand filled count saved to Firestore`);
  } catch (err) {
    console.error('❌ Error updating stand filled count:', err);
  }
}

// DISABLED — ambassador 50% commission distribution turned off.
// Function body commented out below and left in place (unused) in case
// this needs to be re-enabled later. See call site further down (also
// commented out) for where this was invoked.
async function distributeAmbassadorCommission(eventData, eventId, serviceFee, quantity) {
  return;

  /*
  if (!serviceFee || serviceFee <= 0) return;

  try {
    const totalServiceFee = serviceFee * quantity;
    const commissionPool = Math.floor(totalServiceFee * 0.5);
    if (commissionPool <= 0) {
      console.log('ℹ️ Commission pool is 0 — skipping');
      return;
    }

    const eventType = eventData.eventType || 'regular';
    const isCampusEvent = eventType === 'campus';
    const eventUniversity = (eventData.university || '').toLowerCase().trim();
    const eventCity = (eventData.location || eventData.city || '').toLowerCase().trim();

    const ambassadorsSnap = await getDocs(
      query(collection(db, 'users'), where('isAmbassador', '==', true))
    );
    const allAmbassadors = ambassadorsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    let qualifiedAmbassadors = [];

    if (isCampusEvent) {
      qualifiedAmbassadors = allAmbassadors.filter(amb => {
        if (!amb.isCampusAmbassador) return false;
        if ((amb.totalReferrals || 0) < 100) return false;
        const assignedCampuses = amb.assignedCampuses || [];
        return assignedCampuses.some(c =>
          c.toLowerCase().includes(eventUniversity) ||
          eventUniversity.includes(c.toLowerCase())
        ) || (amb.university || '').toLowerCase().trim() === eventUniversity;
      });
    } else {
      qualifiedAmbassadors = allAmbassadors.filter(amb => {
        if (amb.isCampusAmbassador) return false;
        if ((amb.totalReferrals || 0) < 100) return false;
        if (amb.ambassadorType !== 'city') return false;
        const ambCity = (amb.city || '').toLowerCase().trim();
        return ambCity === eventCity || ambCity.includes(eventCity) || eventCity.includes(ambCity);
      });
    }

    if (qualifiedAmbassadors.length === 0) {
      console.log('ℹ️ No qualified ambassadors — commission not distributed');
      return;
    }

    const sharePerAmbassador = Math.floor(commissionPool / qualifiedAmbassadors.length);
    if (sharePerAmbassador <= 0) return;

    for (const amb of qualifiedAmbassadors) {
      try {
        const earningsRef = doc(db, 'ambassadorEarnings', amb.id);
        const earningsSnap = await getDoc(earningsRef);
        const transaction = {
          amount: sharePerAmbassador,
          eventId: eventId || '',
          eventTitle: eventData.title || '',
          eventType,
          type: 'commission',
          date: new Date().toISOString(),
        };

        if (earningsSnap.exists()) {
          const transactions = earningsSnap.data().transactions || [];
          await updateDoc(earningsRef, {
            totalEarned: increment(sharePerAmbassador),
            availableBalance: increment(sharePerAmbassador),
            updatedAt: serverTimestamp(),
            transactions: [...transactions.slice(-49), transaction],
          });
        } else {
          await setDoc(earningsRef, {
            ambassadorId: amb.id,
            ambassadorName: amb.name || '',
            ambassadorEmail: amb.email || '',
            ambassadorType: isCampusEvent ? 'campus' : 'city',
            totalEarned: sharePerAmbassador,
            availableBalance: sharePerAmbassador,
            totalPaidOut: 0,
            updatedAt: serverTimestamp(),
            transactions: [transaction],
          });
        }
      } catch (err) {
        console.error(`❌ Failed to credit ambassador ${amb.id}:`, err);
      }
    }
  } catch (err) {
    console.error('❌ Commission distribution error:', err);
  }
  */
}

// Extract metadata — now also extracts purchase_type + vendor stand fields
// + experience booking fields (experienceId, sessionId, bookingId,
// guestCount, pricePerPerson). Same three-path structure as before
// (string fallback / custom_fields array / flat object) — experience
// fields added to all three so extraction stays consistent regardless
// of how Paystack happens to serialize a given payload.
function extractMetadata(paymentData) {
  let rawMetadata = paymentData.metadata || {};

  if (typeof rawMetadata === 'string') {
    try {
      rawMetadata = JSON.parse(rawMetadata);
    } catch (e) {
      const str = rawMetadata;
      const extract = (key) => {
        const match = str.match(new RegExp(`"variable_name":"${key}","value":"([^"]+)"`));
        return match ? match[1] : null;
      };

      const eventId = extract('eid') || extract('event_id');
      const ticketId = extract('tid') || extract('ticket_id');
      const buyerName = extract('buyer_name');
      const buyerPhone = extract('buyer_phone');
      const quantity = extract('quantity');
      const ticketPrice = extract('ticket_price');
      const serviceFee = extract('service_fee');
      const subtotal = extract('subtotal');
      const creditsApplied = extract('credits_applied');
      const totalAmount = extract('total_amount');
      const tierId = extract('tier_id');
      const tierName = extract('tier_name');
      const purchaseType = extract('purchase_type');
      const standId = extract('stand_id');
      const standName = extract('stand_name');
      const standPrice = extract('stand_price');
      const businessName = extract('business_name');
      const businessType = extract('business_type');
      const whatsappNumber = extract('whatsapp_number');
      const applicationId = extract('application_id');
      const groupCode = extract('group_code');
      // NEW — experience booking fields
      const experienceId = extract('experience_id');
      const sessionId = extract('session_id');
      const bookingId = extract('booking_id');
      const guestCount = extract('guest_count');
      const pricePerPerson = extract('price_per_person');

      return {
        ticketId,
        eventId,
        eventTitle: null,
        quantity: parseInt(quantity) || 1,
        buyerName,
        buyerPhone,
        ticketPrice: parseInt(ticketPrice) || 0,
        serviceFee: parseInt(serviceFee) || 0,
        subtotal: parseInt(subtotal) || 0,
        creditsApplied: parseInt(creditsApplied) || 0,
        totalAmount: totalAmount
          ? parseInt(totalAmount)
          : Math.round(paymentData.amount / 100),
        tierId: tierId || null,
        tierName: tierName || null,
        purchaseType: purchaseType || 'ticket',
        standId: standId || null,
        standName: standName || null,
        standPrice: parseInt(standPrice) || 0,
        businessName: businessName || null,
        businessType: businessType || null,
        whatsappNumber: whatsappNumber || null,
        applicationId: applicationId || null,
        groupCode: groupCode || null,
        experienceId: experienceId || null,
        sessionId: sessionId || null,
        bookingId: bookingId || null,
        guestCount: parseInt(guestCount) || 1,
        pricePerPerson: parseInt(pricePerPerson) || 0,
      };
    }
  }

  if (rawMetadata.custom_fields && Array.isArray(rawMetadata.custom_fields)) {
    const fields = rawMetadata.custom_fields.reduce((acc, field) => {
      acc[field.variable_name] = field.value;
      return acc;
    }, {});

    const eventId = fields.eid || fields.event_id || fields.eventId ||
                    rawMetadata.event_id || rawMetadata.eventId;
    const ticketId = fields.tid || fields.ticket_id || fields.ticketId || null;
    const totalAmount = parseInt(fields.total_amount || fields.tot || fields.totalAmount) || 0;
    const tierId = fields.tier_id || fields.tierId || rawMetadata.tier_id || rawMetadata.tierId || null;
    const tierName = fields.tier_name || fields.tierName || rawMetadata.tier_name || rawMetadata.tierName || null;
    const purchaseType = fields.purchase_type || rawMetadata.purchase_type || 'ticket';
    const standId = fields.stand_id || null;
    const standName = fields.stand_name || null;
    const standPrice = parseInt(fields.stand_price) || 0;
    const businessName = fields.business_name || null;
    const businessType = fields.business_type || null;
    const whatsappNumber = fields.whatsapp_number || null;
    const applicationId = fields.application_id || rawMetadata.application_id || null;
    const groupCode = fields.group_code || rawMetadata.group_code || null;
    // NEW — experience booking fields
    const experienceId = fields.experience_id || rawMetadata.experience_id || null;
    const sessionId = fields.session_id || rawMetadata.session_id || null;
    const bookingId = fields.booking_id || rawMetadata.booking_id || null;
    const guestCount = fields.guest_count || rawMetadata.guest_count || null;
    const pricePerPerson = fields.price_per_person || rawMetadata.price_per_person || null;

    return {
      ticketId,
      eventId,
      eventTitle: fields.event_title || fields.eventTitle,
      quantity: parseInt(fields.quantity || fields.qty) || 1,
      buyerName: fields.buyer_name || fields.buyerName,
      buyerPhone: fields.buyer_phone || fields.buyerPhone,
      ticketPrice: parseInt(fields.ticket_price || fields.ticketPrice) || 0,
      serviceFee: parseInt(fields.service_fee || fields.serviceFee) || 0,
      subtotal: parseInt(fields.subtotal || fields.sub) || 0,
      creditsApplied: parseInt(fields.credits_applied || fields.creditsApplied) || 0,
      totalAmount: totalAmount > 0 ? totalAmount : Math.round(paymentData.amount / 100),
      tierId,
      tierName,
      purchaseType,
      standId,
      standName,
      standPrice,
      businessName,
      businessType,
      whatsappNumber,
      applicationId,
      groupCode,
      experienceId,
      sessionId,
      bookingId,
      guestCount: parseInt(guestCount) || 1,
      pricePerPerson: parseInt(pricePerPerson) || 0,
    };
  }

  const eventId = rawMetadata.event_id || rawMetadata.eventId;
  return {
    ticketId: rawMetadata.ticket_id || rawMetadata.ticketId || null,
    eventId,
    eventTitle: rawMetadata.event_title || rawMetadata.eventTitle,
    quantity: parseInt(rawMetadata.quantity) || 1,
    buyerName: rawMetadata.buyer_name || rawMetadata.buyerName,
    buyerPhone: rawMetadata.buyer_phone || rawMetadata.buyerPhone,
    ticketPrice: parseInt(rawMetadata.ticket_price || rawMetadata.ticketPrice) || 0,
    serviceFee: parseInt(rawMetadata.service_fee || rawMetadata.serviceFee) || 0,
    subtotal: parseInt(rawMetadata.subtotal) || 0,
    creditsApplied: parseInt(rawMetadata.credits_applied || rawMetadata.creditsApplied) || 0,
    totalAmount: parseInt(rawMetadata.total_amount || rawMetadata.totalAmount || rawMetadata.totalPaid) || 0,
    tierId: rawMetadata.tier_id || rawMetadata.tierId || null,
    tierName: rawMetadata.tier_name || rawMetadata.tierName || null,
    purchaseType: rawMetadata.purchase_type || 'ticket',
    standId: rawMetadata.stand_id || null,
    standName: rawMetadata.stand_name || null,
    standPrice: parseInt(rawMetadata.stand_price) || 0,
    businessName: rawMetadata.business_name || null,
    businessType: rawMetadata.business_type || null,
    whatsappNumber: rawMetadata.whatsapp_number || null,
    groupCode: rawMetadata.group_code || rawMetadata.groupCode || null,
    // NEW — experience booking fields
    experienceId: rawMetadata.experience_id || rawMetadata.experienceId || null,
    sessionId: rawMetadata.session_id || rawMetadata.sessionId || null,
    bookingId: rawMetadata.booking_id || rawMetadata.bookingId || null,
    guestCount: parseInt(rawMetadata.guest_count || rawMetadata.guestCount) || 1,
    pricePerPerson: parseInt(rawMetadata.price_per_person || rawMetadata.pricePerPerson) || 0,
  };
}

function generateTicketEmail(ticketData, eventData) {
  const showCredits = ticketData.creditsApplied && ticketData.creditsApplied > 0;
  const showTier = ticketData.tierName && ticketData.tierName.trim().length > 0;
  const verifyUrl = `https://www.outingstation.com/verify-ticket/${ticketData.ticketId}`;
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(verifyUrl)}&color=0e7490&bgcolor=ffffff`;

  return `<!DOCTYPE html>
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

          <tr>
            <td style="background: linear-gradient(135deg, #06b6d4 0%, #0891b2 60%, #0e7490 100%); padding: 44px 36px; text-align: center;">
              <p style="color: rgba(255,255,255,0.75); margin: 0 0 6px; font-size: 12px; font-weight: 700; letter-spacing: 3px; text-transform: uppercase;">OutingStation</p>
              <h1 style="color: #ffffff; margin: 0 0 8px; font-size: 30px; font-weight: 900;">🎉 You're Going!</h1>
              <p style="color: #e0f2fe; margin: 0; font-size: 15px;">Your ticket has been confirmed</p>
              ${showTier ? `
              <div style="display: inline-block; margin-top: 14px; background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.4); border-radius: 20px; padding: 6px 18px;">
                <span style="color: #ffffff; font-size: 13px; font-weight: 800; letter-spacing: 0.5px;">🎟️ ${ticketData.tierName} Ticket</span>
              </div>` : ''}
            </td>
          </tr>

          <tr>
            <td style="padding: 28px 36px 16px;">
              <h2 style="margin: 0 0 12px; color: #0f172a; font-size: 22px; font-weight: 800; line-height: 1.3;">${eventData.title}</h2>
              <table cellpadding="0" cellspacing="0">
                <tr><td style="padding: 3px 0; font-size: 14px; color: #475569;">📅&nbsp;&nbsp;${ticketData.eventDate}</td></tr>
                <tr><td style="padding: 3px 0; font-size: 14px; color: #475569;">🕐&nbsp;&nbsp;${ticketData.eventTime}</td></tr>
                <tr><td style="padding: 3px 0; font-size: 14px; color: #475569;">📍&nbsp;&nbsp;${eventData.address || eventData.location || 'TBD'}</td></tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding: 0 36px;">
              <div style="border-top: 2px dashed #cbd5e1;"></div>
            </td>
          </tr>

          <tr>
            <td style="padding: 24px 36px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="vertical-align: top; padding-right: 24px;">
                    <div style="background: linear-gradient(135deg, #ecfeff, #e0f2fe); border: 2px dashed #06b6d4; border-radius: 14px; padding: 16px 20px; margin-bottom: 16px;">
                      <p style="margin: 0 0 4px; font-size: 10px; color: #0891b2; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px;">Ticket ID</p>
                      <p style="margin: 0; font-size: 20px; font-weight: 900; color: #0e7490; font-family: 'Courier New', monospace; letter-spacing: 1px;">${ticketData.ticketId}</p>
                    </div>
                    <table cellpadding="0" cellspacing="0" width="100%">
                      <tr><td style="padding-bottom: 10px;">
                        <p style="margin: 0 0 2px; font-size: 10px; color: #94a3b8; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">Ticket Holder</p>
                        <p style="margin: 0; font-size: 14px; color: #1e293b; font-weight: 700;">${ticketData.buyerName}</p>
                      </td></tr>
                      <tr><td style="padding-bottom: 10px;">
                        <p style="margin: 0 0 2px; font-size: 10px; color: #94a3b8; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">Email</p>
                        <p style="margin: 0; font-size: 13px; color: #1e293b; font-weight: 500;">${ticketData.buyerEmail}</p>
                      </td></tr>
                      <tr><td style="padding-bottom: 10px;">
                        <p style="margin: 0 0 2px; font-size: 10px; color: #94a3b8; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">Phone</p>
                        <p style="margin: 0; font-size: 13px; color: #1e293b; font-weight: 500;">${ticketData.buyerPhone}</p>
                      </td></tr>
                      ${showTier ? `
                      <tr><td style="padding-bottom: 10px;">
                        <p style="margin: 0 0 2px; font-size: 10px; color: #94a3b8; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">Ticket Type</p>
                        <p style="margin: 0; font-size: 14px; color: #0891b2; font-weight: 800;">${ticketData.tierName}</p>
                      </td></tr>` : ''}
                      ${ticketData.invitedBy ? `
                      <tr><td style="padding-bottom: 10px;">
                        <p style="margin: 0 0 2px; font-size: 10px; color: #94a3b8; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">Invited By</p>
                        <p style="margin: 0; font-size: 14px; color: #9333ea; font-weight: 800;">${ticketData.invitedBy}</p>
                      </td></tr>` : ''}
                      <tr><td style="padding-bottom: 10px;">
                        <p style="margin: 0 0 2px; font-size: 10px; color: #94a3b8; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">Quantity</p>
                        <p style="margin: 0; font-size: 14px; color: #1e293b; font-weight: 700;">${ticketData.quantity} ticket${ticketData.quantity > 1 ? 's' : ''}</p>
                      </td></tr>
                      <tr><td>
                        <p style="margin: 0 0 2px; font-size: 10px; color: #94a3b8; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">Amount Paid</p>
                        <p style="margin: 0; font-size: 20px; color: #0891b2; font-weight: 900;">₦${ticketData.totalPaid?.toLocaleString()}</p>
                        ${showCredits ? `<p style="margin: 3px 0 0; font-size: 11px; color: #10b981; font-weight: 600;">💰 Saved ₦${ticketData.creditsApplied?.toLocaleString()} with credits</p>` : ''}
                      </td></tr>
                    </table>
                  </td>
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

          <tr>
            <td style="padding: 0 36px 24px;">
              <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 14px 18px;">
                <p style="margin: 0; font-size: 13px; color: #166534; line-height: 1.6;">
                  🎟️ <strong>Entry Instructions:</strong> Show this email (QR code or Ticket ID) at the venue entrance. Screenshot or print for offline access.
                </p>
              </div>
            </td>
          </tr>

          <tr>
            <td style="padding: 0 36px 24px;">
              <div style="background: #f8fafc; border-radius: 12px; padding: 18px 20px;">
                <p style="margin: 0 0 14px; font-size: 13px; font-weight: 800; color: #374151; text-transform: uppercase; letter-spacing: 0.5px;">Payment Breakdown</p>
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="font-size: 13px; color: #6b7280; padding: 4px 0;">Ticket Price${showTier ? ` (${ticketData.tierName})` : ''} ×${ticketData.quantity}</td>
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
                    <td colspan="2" style="padding: 6px 0;"><div style="border-top: 1px solid #e5e7eb;"></div></td>
                  </tr>
                  <tr>
                    <td style="font-size: 15px; color: #111827; font-weight: 800; padding-top: 6px;">Total Paid</td>
                    <td style="font-size: 16px; color: #0891b2; text-align: right; font-weight: 900; padding-top: 6px;">₦${ticketData.totalPaid?.toLocaleString()}</td>
                  </tr>
                </table>
              </div>
            </td>
          </tr>

          <tr>
            <td style="padding: 0 36px 28px;">
              <p style="margin: 0 0 4px; font-size: 10px; color: #94a3b8; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">Payment Reference</p>
              <p style="margin: 0; font-size: 12px; color: #64748b; font-family: 'Courier New', monospace;">${ticketData.paymentReference}</p>
            </td>
          </tr>

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
</html>`;
}

// simple confirmation email for vendor stand applications
function generateStandConfirmationEmail(appData, eventData) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Vendor Stand Application</title></head>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#f0f9ff;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f9ff;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,0.12);">
        <tr>
          <td style="background:linear-gradient(135deg,#06b6d4,#0e7490);padding:36px;text-align:center;">
            <p style="color:rgba(255,255,255,0.75);margin:0 0 6px;font-size:12px;font-weight:700;letter-spacing:3px;text-transform:uppercase;">OutingStation</p>
            <h1 style="color:#ffffff;margin:0;font-size:26px;font-weight:900;">🛒 Application Received!</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 32px;">
            <h2 style="margin:0 0 10px;color:#0f172a;font-size:20px;font-weight:800;">${eventData.title}</h2>
            <p style="margin:0 0 16px;color:#475569;font-size:14px;">Your vendor stand application for <strong>${appData.standName}</strong> has been received and payment confirmed.</p>
            <div style="background:#f8fafc;border-radius:12px;padding:16px;margin-bottom:16px;">
              <p style="margin:0 0 6px;font-size:13px;color:#6b7280;">Business: <strong style="color:#111827;">${appData.businessName}</strong></p>
              <p style="margin:0 0 6px;font-size:13px;color:#6b7280;">What you sell: <strong style="color:#111827;">${appData.businessType}</strong></p>
              <p style="margin:0;font-size:13px;color:#6b7280;">Amount paid: <strong style="color:#0891b2;">₦${appData.amountPaid?.toLocaleString()}</strong></p>
            </div>
            <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:12px;padding:14px 16px;">
              <p style="margin:0;font-size:13px;color:#92400e;line-height:1.6;">⏳ <strong>Next step:</strong> The event organizer will review your application. You'll be contacted on WhatsApp once approved.</p>
            </div>
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

// NEW — confirmation email for an Experience session booking. Same
// visual language as generateTicketEmail (gradient header, dashed
// booking-ID card, QR block) but purple/pink to match
// SessionBookingSection.jsx's confirmation modal, and shows guest count
// + session date/time instead of tier/ticket-quantity fields.
function generateExperienceBookingEmail(bookingData, experienceData) {
  const verifyUrl = `https://www.outingstation.com/verify-ticket/${bookingData.bookingId}`;
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(verifyUrl)}&color=9333ea&bgcolor=ffffff`;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your OutingStation Experience Booking</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #faf5ff;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #faf5ff; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 8px 32px rgba(0,0,0,0.12);">

          <tr>
            <td style="background: linear-gradient(135deg, #a855f7 0%, #ec4899 100%); padding: 44px 36px; text-align: center;">
              <p style="color: rgba(255,255,255,0.75); margin: 0 0 6px; font-size: 12px; font-weight: 700; letter-spacing: 3px; text-transform: uppercase;">OutingStation</p>
              <h1 style="color: #ffffff; margin: 0 0 8px; font-size: 30px; font-weight: 900;">✨ Booking Confirmed!</h1>
              <p style="color: #fce7f3; margin: 0; font-size: 15px;">Your spot has been reserved</p>
            </td>
          </tr>

          <tr>
            <td style="padding: 28px 36px 16px;">
              <h2 style="margin: 0 0 12px; color: #0f172a; font-size: 22px; font-weight: 800; line-height: 1.3;">${experienceData.title}</h2>
              <table cellpadding="0" cellspacing="0">
                <tr><td style="padding: 3px 0; font-size: 14px; color: #475569;">📅&nbsp;&nbsp;${bookingData.sessionDate}</td></tr>
                <tr><td style="padding: 3px 0; font-size: 14px; color: #475569;">🕐&nbsp;&nbsp;${bookingData.sessionTime}</td></tr>
                <tr><td style="padding: 3px 0; font-size: 14px; color: #475569;">📍&nbsp;&nbsp;${experienceData.address || experienceData.city || 'TBD'}</td></tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding: 0 36px;">
              <div style="border-top: 2px dashed #e9d5ff;"></div>
            </td>
          </tr>

          <tr>
            <td style="padding: 24px 36px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="vertical-align: top; padding-right: 24px;">
                    <div style="background: linear-gradient(135deg, #faf5ff, #fdf2f8); border: 2px dashed #a855f7; border-radius: 14px; padding: 16px 20px; margin-bottom: 16px;">
                      <p style="margin: 0 0 4px; font-size: 10px; color: #9333ea; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px;">Booking ID</p>
                      <p style="margin: 0; font-size: 20px; font-weight: 900; color: #9333ea; font-family: 'Courier New', monospace; letter-spacing: 1px;">${bookingData.bookingId}</p>
                    </div>
                    <table cellpadding="0" cellspacing="0" width="100%">
                      <tr><td style="padding-bottom: 10px;">
                        <p style="margin: 0 0 2px; font-size: 10px; color: #94a3b8; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">Guest</p>
                        <p style="margin: 0; font-size: 14px; color: #1e293b; font-weight: 700;">${bookingData.buyerName}</p>
                      </td></tr>
                      <tr><td style="padding-bottom: 10px;">
                        <p style="margin: 0 0 2px; font-size: 10px; color: #94a3b8; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">Email</p>
                        <p style="margin: 0; font-size: 13px; color: #1e293b; font-weight: 500;">${bookingData.buyerEmail}</p>
                      </td></tr>
                      <tr><td style="padding-bottom: 10px;">
                        <p style="margin: 0 0 2px; font-size: 10px; color: #94a3b8; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">Phone</p>
                        <p style="margin: 0; font-size: 13px; color: #1e293b; font-weight: 500;">${bookingData.buyerPhone}</p>
                      </td></tr>
                      <tr><td style="padding-bottom: 10px;">
                        <p style="margin: 0 0 2px; font-size: 10px; color: #94a3b8; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">Guests</p>
                        <p style="margin: 0; font-size: 14px; color: #1e293b; font-weight: 700;">${bookingData.guestCount} guest${bookingData.guestCount > 1 ? 's' : ''}</p>
                      </td></tr>
                      <tr><td>
                        <p style="margin: 0 0 2px; font-size: 10px; color: #94a3b8; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">Amount Paid</p>
                        <p style="margin: 0; font-size: 20px; color: #9333ea; font-weight: 900;">₦${bookingData.amountPaid?.toLocaleString()}</p>
                      </td></tr>
                    </table>
                  </td>
                  <td style="vertical-align: top; width: 160px; text-align: center;">
                    <div style="background: white; border: 2px solid #f3e8ff; border-radius: 14px; padding: 12px; display: inline-block;">
                      <img src="${qrImageUrl}" alt="QR Code" width="136" height="136" style="display: block; border-radius: 6px;" />
                    </div>
                    <p style="margin: 8px 0 0; font-size: 11px; color: #94a3b8; text-align: center; line-height: 1.4;">Scan at<br/>check-in</p>
                    <div style="margin-top: 8px; background: #ecfdf5; border-radius: 8px; padding: 4px 8px;">
                      <p style="margin: 0; font-size: 10px; color: #059669; font-weight: 700;">✓ VALID</p>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding: 0 36px 24px;">
              <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 14px 18px;">
                <p style="margin: 0; font-size: 13px; color: #166534; line-height: 1.6;">
                  ✨ <strong>Check-in Instructions:</strong> Show this email (QR code or Booking ID) to the host when you arrive.
                </p>
              </div>
            </td>
          </tr>

          <tr>
            <td style="padding: 0 36px 28px;">
              <p style="margin: 0 0 4px; font-size: 10px; color: #94a3b8; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">Payment Reference</p>
              <p style="margin: 0; font-size: 12px; color: #64748b; font-family: 'Courier New', monospace;">${bookingData.paymentReference}</p>
            </td>
          </tr>

          <tr>
            <td style="background: linear-gradient(135deg, #9333ea, #ec4899); padding: 28px 36px; text-align: center;">
              <p style="margin: 0 0 6px; color: #ffffff; font-size: 16px; font-weight: 800;">See you there! ✨</p>
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
</html>`;
}

// ✅ NEW — confirmation email for both shortlet_booking and ride_booking
// purchase types. Shared by both since the content that actually differs
// (a check-in date range vs a trip/hour price) is small enough to
// interpolate inline rather than justifying two near-duplicate templates.
// Booking ID doubles as a QR-verifiable reference, same pattern as
// experience bookings and tickets — points at the same /verify-ticket/
// route, which already looks up any doc by id regardless of collection
// pattern used elsewhere in this codebase.
function generateBookingConfirmationEmail(bookingData, listingData, type) {
  const isShortlet = type === 'shortlet';
  // ✅ FIXED — was per-type Shortlet-brown/Ride-blue accent colors,
  // invented rather than using OutingStation's actual brand palette.
  // Now uses the real brand colors consistently for both booking types:
  // primary cyan #5ADAEE for accents/highlights, secondary #47A2B6 as
  // the solid header band (dark enough for white text to stay readable,
  // which the lighter primary alone wouldn't be), and the same light
  // cyan wash (#ECFEFF) already used as the background color throughout
  // the OSB screens in this app.
  const accentColor = '#5ADAEE';
  const headerColor = '#47A2B6';
  const accentBg = '#ECFEFF';
  const label = isShortlet ? 'Shortlet' : 'Ride';

  const detailsRows = isShortlet
    ? `<tr><td style="padding: 3px 0; font-size: 14px; color: #475569;">📅&nbsp;&nbsp;Check-in: ${bookingData.checkInDateFormatted}</td></tr>
       <tr><td style="padding: 3px 0; font-size: 14px; color: #475569;">📅&nbsp;&nbsp;Check-out: ${bookingData.checkOutDateFormatted}</td></tr>
       <tr><td style="padding: 3px 0; font-size: 14px; color: #475569;">🌙&nbsp;&nbsp;${bookingData.nights} night${bookingData.nights === 1 ? '' : 's'}</td></tr>`
    : `<tr><td style="padding: 3px 0; font-size: 14px; color: #475569;">🚗&nbsp;&nbsp;${listingData.vehicleType || 'Vehicle'}</td></tr>`;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your OutingStation ${label} Booking</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: ${accentBg};">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: ${accentBg}; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 8px 32px rgba(0,0,0,0.12);">

          <tr>
            <td style="background: ${headerColor}; padding: 44px 36px; text-align: center;">
              <p style="color: rgba(255,255,255,0.75); margin: 0 0 6px; font-size: 12px; font-weight: 700; letter-spacing: 3px; text-transform: uppercase;">OutingStation</p>
              <h1 style="color: #ffffff; margin: 0 0 8px; font-size: 30px; font-weight: 900;">✅ Payment Received!</h1>
              <p style="color: #ffffff; opacity: 0.9; margin: 0; font-size: 15px;">Your payment is held securely until your ${isShortlet ? 'stay' : 'trip'} is confirmed</p>
            </td>
          </tr>

          <tr>
            <td style="padding: 28px 36px 16px;">
              <h2 style="margin: 0 0 12px; color: #0f172a; font-size: 22px; font-weight: 800; line-height: 1.3;">${bookingData.listingTitle}</h2>
              <p style="margin: 0 0 12px; font-size: 13px; color: #64748b;">${bookingData.agencyName || ''}</p>
              <table cellpadding="0" cellspacing="0">
                ${detailsRows}
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding: 0 36px;">
              <div style="border-top: 2px dashed ${accentColor}55;"></div>
            </td>
          </tr>

          <tr>
            <td style="padding: 24px 36px;">
              <div style="background: ${accentBg}; border: 2px dashed ${accentColor}; border-radius: 14px; padding: 16px 20px; margin-bottom: 16px;">
                <p style="margin: 0 0 4px; font-size: 10px; color: ${accentColor}; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px;">Booking Reference</p>
                <p style="margin: 0; font-size: 18px; font-weight: 900; color: ${accentColor}; font-family: 'Courier New', monospace; letter-spacing: 1px;">${bookingData.paymentReference}</p>
              </div>
              <table cellpadding="0" cellspacing="0" width="100%">
                <tr><td style="padding-bottom: 8px;">
                  <table cellpadding="0" cellspacing="0" width="100%">
                    <tr>
                      <td style="font-size: 13px; color: #64748b; padding: 3px 0;">${isShortlet ? `₦${Number(bookingData.pricePerNight || 0).toLocaleString()} × ${bookingData.nights || 0} night${(bookingData.nights || 0) === 1 ? '' : 's'}` : 'Trip fare'}</td>
                      <td align="right" style="font-size: 13px; color: #0f172a; font-weight: 600; padding: 3px 0;">₦${Number(bookingData.subtotal || 0).toLocaleString()}</td>
                    </tr>
                    <tr>
                      <td style="font-size: 13px; color: #64748b; padding: 3px 0;">Service fee</td>
                      <td align="right" style="font-size: 13px; color: #0f172a; font-weight: 600; padding: 3px 0;">₦${Number(bookingData.platformFee || 0).toLocaleString()}</td>
                    </tr>
                    <tr><td colspan="2" style="padding: 6px 0;"><div style="border-top: 1px solid #e2e8f0;"></div></td></tr>
                    <tr>
                      <td style="font-size: 10px; color: #94a3b8; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; padding-top: 2px;">Amount Paid</td>
                      <td align="right" style="font-size: 22px; color: ${accentColor}; font-weight: 900; padding-top: 2px;">₦${Number(bookingData.amount || 0).toLocaleString()}</td>
                    </tr>
                  </table>
                </td></tr>
              </table>
              <p style="margin: 10px 0 0; font-size: 11px; color: #94a3b8; line-height: 1.5;">
                The service fee is non-refundable. If this booking is cancelled, any refund follows the ${isShortlet ? "property's cancellation policy" : "trip's cancellation policy"} and applies to the ${isShortlet ? 'stay cost' : 'trip fare'} only.
              </p>
              <p style="margin: 16px 0 0; font-size: 12px; color: #64748b; line-height: 1.6;">
                ${isShortlet
                  ? "The property's full address will be shared once your booking is confirmed. You'll be asked to confirm check-in 24 hours after your check-in date."
                  : "Your driver's details will be shared once the agency assigns one for your trip. You'll be asked to confirm your trip is complete afterward."}
              </p>
              <p style="margin: 12px 0 0; font-size: 12px; color: #64748b; line-height: 1.6;">
                Track this booking anytime under <strong>Profile → My Bookings</strong> in the app.
              </p>
            </td>
          </tr>

          <tr>
            <td style="background: #f8fafc; padding: 20px 36px; text-align: center;">
              <p style="margin: 0; font-size: 11px; color: #94a3b8;">Questions? Reply to this email or reach us in the app.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
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

    // ─── REFUND EVENTS ──────────────────────────────────────────────────────
    // ✅ NEW — refund.js only ever INITIATES a refund (Paystack refunds are
    // async, same as transfers). This is what confirms whether it actually
    // completed. Placed before the charge.success gate below, which would
    // otherwise ignore these event types entirely.
    //
    // Looked up by paymentReference via a query, not a direct doc lookup —
    // Paystack's refund webhook payload identifies the refund by the
    // original TRANSACTION reference, not by our Firestore booking ID,
    // so there's no bookingId to look up directly the way the
    // charge.success branches below can.
    if (event.event === 'refund.processed' || event.event === 'refund.failed') {
      const refundData = event.data;
      const transactionReference = refundData.transaction?.reference;

      if (!transactionReference) {
        console.error('❌ Refund webhook missing transaction reference');
        return res.status(200).json({ message: 'Missing transaction reference' });
      }

      const bookingsSnap = await getDocs(query(
        collection(db, 'bookings'),
        where('paymentReference', '==', transactionReference)
      ));

      if (bookingsSnap.empty) {
        console.error(`❌ No booking found for refunded transaction: ${transactionReference}`);
        return res.status(200).json({ message: 'Booking not found' });
      }

      const bookingDoc = bookingsSnap.docs[0];
      const booking = bookingDoc.data();
      const isSuccess = event.event === 'refund.processed';

      await updateDoc(doc(db, 'bookings', bookingDoc.id), {
        refundStatus: isSuccess ? 'refunded' : 'failed',
        // Escrow can never be released to the owner once refunded — this
        // is the terminal state transfer.js (once built) needs to check
        // against, so a refunded booking can never ALSO be paid out.
        escrowStatus: isSuccess ? 'refunded' : booking.escrowStatus,
      });
      console.log(`${isSuccess ? '✅' : '❌'} Refund ${event.event} for booking ${bookingDoc.id}`);

      // Only email the guest once the refund actually completes — a
      // failed refund gets surfaced to admin instead (see below), not
      // the guest, since a failure needs a human to investigate before
      // anyone commits to a promise about when money will arrive.
      if (isSuccess) {
        try {
          const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD }
          });
          await transporter.sendMail({
            from: `"OutingStation" <${process.env.GMAIL_USER}>`,
            to: booking.guestEmail,
            subject: `✅ Refund completed — ${booking.listingTitle}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
                <div style="background: #EFF6FF; border-radius: 16px; padding: 24px;">
                  <h2 style="margin: 0 0 12px; color: #0F172A; font-size: 18px;">${booking.listingTitle}</h2>
                  <p style="margin: 0; font-size: 14px; color: #374151; line-height: 1.6;">
                    Your refund of ₦${Number(booking.refundAmount || 0).toLocaleString()} has been processed and should reflect in your account shortly.
                  </p>
                </div>
              </div>
            `,
          });
          console.log(`📧 Refund confirmation sent to: ${booking.guestEmail}`);
        } catch (emailErr) {
          console.error('❌ Failed to send refund confirmation email:', emailErr);
        }
      } else {
        console.error(`⚠️ ADMIN ATTENTION — refund failed for booking ${bookingDoc.id}, guest ${booking.guestEmail}. Needs manual review.`);
        // Note: no automated admin email for this yet — same shape as
        // notify-dispute.js could be reused here later, flagged rather
        // than silently built as a guess at what admin actually wants
        // for this specific failure case.
      }

      return res.status(200).json({ success: true, event: event.event });
    }

    if (event.event !== 'charge.success') {
      return res.status(200).json({ message: 'Event ignored' });
    }

    const paymentData = event.data;
    const metadata = extractMetadata(paymentData);
    console.log('📦 Processing payment:', paymentData.customer.email, '| type:', metadata.purchaseType);

    // ─── EXPERIENCE BOOKING branch ─────────────────────────────────────────
    // Placed BEFORE the generic `if (!metadata.eventId)` guard below —
    // experience bookings key off experienceId, not eventId, so they'd
    // always fail that check if this branch came after it (the way
    // vendor_stand and ticket purchases both correctly require eventId).
    if (metadata.purchaseType === 'experience_booking') {
      if (!metadata.experienceId) {
        console.error('❌ CRITICAL: experienceId missing from experience_booking metadata!');
        return res.status(400).json({ error: 'Missing experienceId in metadata' });
      }
      if (!metadata.sessionId) {
        console.error('❌ CRITICAL: sessionId missing from experience_booking metadata!');
        return res.status(400).json({ error: 'Missing sessionId in metadata' });
      }

      // Idempotency — mirrors the tickets-collection check further down
      const existingBookingQuery = query(
        collection(db, 'experienceBookings'),
        where('paymentReference', '==', paymentData.reference)
      );
      const existingBookingSnap = await getDocs(existingBookingQuery);
      if (!existingBookingSnap.empty) {
        console.log('⚠️ Booking already exists for this payment');
        return res.status(200).json({ success: true, message: 'Already processed' });
      }

      const expDoc = await getDoc(doc(db, 'experiences', metadata.experienceId));
      if (!expDoc.exists()) {
        console.error('❌ Experience not found:', metadata.experienceId);
        return res.status(404).json({ error: 'Experience not found' });
      }
      const expData = expDoc.data();

      const bookingId = metadata.bookingId || `EXP-${new Date().getFullYear()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
      const totalPaid = metadata.totalAmount > 0 ? metadata.totalAmount : Math.round(paymentData.amount / 100);
      const guestCount = metadata.guestCount || 1;

      // Bump the matched session's bookedSpots inside a transaction —
      // same "best-effort, never block an already-paid booking" policy
      // as the groupCode transaction below for paid event tickets: the
      // customer has already paid, so this proceeds and logs a warning
      // even if it would push the session over its totalSpots, rather
      // than silently dropping their booking. Real overbooking
      // prevention happens client-side in SessionBookingSection before
      // Paystack ever opens.
      let sessionSnapshot = null;
      try {
        await runTransaction(db, async (transaction) => {
          const freshExpSnap = await transaction.get(doc(db, 'experiences', metadata.experienceId));
          if (!freshExpSnap.exists()) return;
          const freshExpData = freshExpSnap.data();
          const sessions = freshExpData.sessions || [];
          const sessionIndex = sessions.findIndex(s => s.id === metadata.sessionId);
          if (sessionIndex === -1) {
            console.warn(`⚠️ Session "${metadata.sessionId}" not found on experience — booking still created, session count NOT updated`);
            return;
          }
          const session = sessions[sessionIndex];
          const newBooked = (session.bookedSpots || 0) + guestCount;
          if (session.totalSpots && newBooked > session.totalSpots) {
            console.warn(`⚠️ Session now exceeds totalSpots (${newBooked}/${session.totalSpots}) — payment already succeeded, booking created anyway`);
          }
          sessionSnapshot = { date: session.date, time: session.time };
          const updatedSessions = sessions.map((s, i) => i === sessionIndex ? { ...s, bookedSpots: newBooked } : s);
          transaction.update(doc(db, 'experiences', metadata.experienceId), { sessions: updatedSessions });
        });
      } catch (txErr) {
        console.error('❌ Session booking transaction failed (booking still recorded):', txErr);
      }

      const bookingData = {
        bookingId,
        experienceId: metadata.experienceId,
        experienceTitle: expData.title,
        sessionId: metadata.sessionId,
        sessionDate: sessionSnapshot ? formatSessionDate(sessionSnapshot.date) : 'TBD',
        sessionTime: sessionSnapshot ? formatSessionTime(sessionSnapshot.time) : '',
        buyerName: metadata.buyerName || paymentData.customer.first_name || 'Guest',
        buyerEmail: paymentData.customer.email,
        buyerPhone: metadata.buyerPhone || paymentData.customer.phone || 'N/A',
        guestCount,
        pricePerPerson: metadata.pricePerPerson || 0,
        amountPaid: totalPaid,
        paidStatus: 'paid',
        paymentReference: paymentData.reference,
        checkedIn: false,
        // Location snapshot, stored on the booking itself so
        // VerifyTicket.jsx's QR scan page can show it without a second
        // lookup — mirrors how ticketData.eventLocation is a stored
        // snapshot rather than a live join. The confirmation email
        // already reads location straight off expData (it has the full
        // experience doc in scope), so this addition is purely for the
        // scan page and any future admin/host views.
        experienceLocation: expData.address || expData.city || null,
        mapsLink: expData.mapsLink || null,
        // CHANGED — was agencyId/agencyName, denormalized from a
        // business the experience no longer belongs to (experiences
        // don't require a business account, same as events). Storing
        // the host's own contact info instead — actually populated on
        // every experience doc, and what AdminExperienceBookings.jsx's
        // "Host" column now displays.
        organizerName: expData.organizerName || null,
        organizerEmail: expData.organizerEmail || null,
        createdAt: serverTimestamp(),
      };

      await setDoc(doc(db, 'experienceBookings', bookingId), bookingData);
      console.log(`✅ Experience booking saved: ${bookingId}`);

      try {
        const transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD }
        });
        await transporter.sendMail({
          from: `"OutingStation" <${process.env.GMAIL_USER}>`,
          to: paymentData.customer.email,
          subject: `✨ Your Booking for ${expData.title} — ${bookingId}`,
          html: generateExperienceBookingEmail(bookingData, expData)
        });
        console.log(`📧 Experience booking confirmation sent to: ${paymentData.customer.email}`);
      } catch (emailErr) {
        console.error('❌ Failed to send experience booking email:', emailErr);
      }

      return res.status(200).json({ success: true, purchaseType: 'experience_booking', bookingId });
    }

    // ─── SHORTLET / RIDE BOOKING branch ────────────────────────────────────
    // Placed BEFORE the generic `if (!metadata.eventId)` guard below, same
    // reasoning as experience_booking above — bookings key off bookingId,
    // not eventId, so they'd always fail that check if this branch came
    // after it.
    //
    // Structurally this follows the VENDOR STAND pattern, not the
    // experience_booking one: the bookings/ doc already exists BEFORE
    // payment (created client-side in shortlet_booking_screen.dart /
    // rent_a_ride_screen.dart's future booking screen, with
    // paymentStatus: 'pending', escrowStatus: 'none' — exactly what the
    // bookings/ Firestore create rule requires). This webhook only ever
    // CONFIRMS payment on that pre-created doc, moving it into escrow —
    // it never creates the booking itself. That matters because a
    // booking needs to exist and be identifiable (so a guest can see
    // "pending payment" in My Bookings, and so the checkout reference can
    // point at something) even before Paystack confirms anything.
    //
    // Money is held in escrow here (escrowStatus: 'held'), NOT released
    // to the owner — release happens later, from the guest's check-in/
    // trip-complete confirmation, a 48hr auto-release cron, or an admin
    // resolving a dispute in the owner's favor. None of those exist yet;
    // this webhook branch is only step one (payment confirmed → escrow
    // held), matching exactly what the bookings/ Firestore rule already
    // scopes this route to (paymentStatus, escrowStatus, amountPaid,
    // platformFee, ownerPayout, paymentReference, paidAt — and NOT
    // confirmationStatus, which only the guest can set).
    if (metadata.purchaseType === 'shortlet_booking' || metadata.purchaseType === 'ride_booking') {
      if (!metadata.bookingId) {
        console.error('❌ CRITICAL: bookingId missing from booking payment metadata!');
        return res.status(400).json({ error: 'Missing bookingId in metadata' });
      }

      const bookingRef = doc(db, 'bookings', metadata.bookingId);
      const bookingSnap = await getDoc(bookingRef);
      if (!bookingSnap.exists()) {
        console.error('❌ Booking not found:', metadata.bookingId);
        return res.status(404).json({ error: 'Booking not found' });
      }
      const bookingData = bookingSnap.data();

      // Idempotency — don't double-process the same payment. Checked
      // against the doc's own paymentStatus, same as vendor_stand does,
      // rather than a separate collection query — cheaper, and the doc
      // is already fetched above.
      if (bookingData.paymentStatus === 'paid') {
        console.log('⚠️ This booking was already marked paid');
        return res.status(200).json({ success: true, message: 'Already processed' });
      }

      const isShortlet = metadata.purchaseType === 'shortlet_booking';
      const listingCollection = isShortlet ? 'shortlets' : 'rides';

      // amountPaid trusted from what Paystack actually charged (kobo →
      // naira), not from the booking doc's own 'amount' field — same
      // "trust the payment processor over the client-supplied number"
      // instinct as every other branch in this file.
      const amountPaid = Math.round(paymentData.amount / 100);

      // Same 10% platform fee as vendor stands — OutingStation takes a
      // cut, the rest is what's owed to the agency once escrow releases.
      // Computed off amountPaid (what Paystack actually charged) minus
      // the subtotal-only portion the booking doc already worked out
      // client-side, so this stays correct even if amountPaid differs
      // slightly from what the client calculated (e.g. a stale price
      // between page load and checkout).
      const PLATFORM_FEE_PERCENTAGE = 0.10;
      const subtotal = bookingData.subtotal ?? Math.round(amountPaid / (1 + PLATFORM_FEE_PERCENTAGE));
      const platformFee = Math.round(subtotal * PLATFORM_FEE_PERCENTAGE);
      const ownerPayout = amountPaid - platformFee;

      // ─── Layer 2 of the double-booking fix ──────────────────────────
      // ✅ NEW — the actual safety net. The client-side check
      // (shortlet_booking_screen.dart / ride_booking_screen.dart and
      // their web equivalents) reduces the LIKELIHOOD of a
      // double-booking but can't fully prevent one — two guests could
      // both pass that check within seconds of each other, before
      // either has actually paid, since Paystack payment isn't instant.
      // This webhook is the one moment we know for CERTAIN a payment
      // genuinely completed, so it re-checks for a real conflict right
      // here, against every OTHER already-paid, non-cancelled booking
      // for this same listing (excluding this one).
      //
      // ⚠️ Same default-duration assumption as the client-side Ride
      // check for a 'trip' mode booking — see ride_booking_screen.dart's
      // _kDefaultTripBlockHours comment for the full reasoning.
      const DEFAULT_TRIP_BLOCK_HOURS = 3;
      let hasConflict = false;
      try {
        const otherBookingsSnap = await getDocs(query(
          collection(db, 'bookings'),
          where('listingId', '==', bookingData.listingId),
          where('paymentStatus', '==', 'paid')
        ));
        for (const otherDoc of otherBookingsSnap.docs) {
          if (otherDoc.id === metadata.bookingId) continue; // never compare against itself
          const other = otherDoc.data();
          if (other.confirmationStatus === 'cancelled') continue;

          if (isShortlet) {
            const otherCheckIn = other.checkInDate?.toDate();
            const otherCheckOut = other.checkOutDate?.toDate();
            const thisCheckIn = bookingData.checkInDate?.toDate();
            const thisCheckOut = bookingData.checkOutDate?.toDate();
            if (!otherCheckIn || !otherCheckOut || !thisCheckIn || !thisCheckOut) continue;
            if (thisCheckIn < otherCheckOut && thisCheckOut > otherCheckIn) { hasConflict = true; break; }
          } else {
            const otherStart = other.tripDateTime?.toDate();
            const thisStart = bookingData.tripDateTime?.toDate();
            if (!otherStart || !thisStart) continue;
            const otherHours = other.bookingMode === 'hour' ? (other.hours || 1) : DEFAULT_TRIP_BLOCK_HOURS;
            const thisHours = bookingData.bookingMode === 'hour' ? (bookingData.hours || 1) : DEFAULT_TRIP_BLOCK_HOURS;
            const otherEnd = new Date(otherStart.getTime() + otherHours * 60 * 60 * 1000);
            const thisEnd = new Date(thisStart.getTime() + thisHours * 60 * 60 * 1000);
            if (thisStart < otherEnd && thisEnd > otherStart) { hasConflict = true; break; }
          }
        }
      } catch (conflictCheckErr) {
        console.error('❌ Double-booking conflict check failed:', conflictCheckErr);
        // Fails OPEN here specifically, unlike the client-side checks —
        // by this point the guest has genuinely already been charged;
        // refusing to confirm a real payment over a check that itself
        // failed would be worse than the rare conflict this check
        // exists to catch. Logged loudly so it's never silent either way.
      }

      if (hasConflict) {
        // The charge is real and already happened — that can't be
        // undone by refusing to acknowledge it. What CAN happen: mark it
        // paid (honest about the fact), immediately cancel it (it can
        // never actually be honored), and trigger a full, automatic
        // refund — the guest did nothing wrong here, this is entirely a
        // system-timing issue, not something their cancellation policy
        // percentage should apply to.
        await updateDoc(bookingRef, {
          paymentStatus: 'paid',
          escrowStatus: 'held',
          amountPaid,
          platformFee,
          ownerPayout,
          paymentReference: paymentData.reference,
          paidAt: serverTimestamp(),
          bookingConflict: true,
          confirmationStatus: 'cancelled',
        });
        console.error(`⚠️ DOUBLE-BOOKING CONFLICT — booking ${metadata.bookingId} for listing ${bookingData.listingId} overlaps an already-paid booking. Auto-cancelling and triggering a full refund.`);

        try {
          await fetch('https://www.outingstation.com/api/refund', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bookingId: metadata.bookingId, source: 'booking_conflict' }),
          });
        } catch (refundTriggerErr) {
          console.error('❌ Failed to trigger conflict refund:', refundTriggerErr);
        }

        // Guest gets a plain, honest explanation — not the normal
        // booking confirmation email, since this booking was never
        // actually going to be honored.
        try {
          const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD }
          });
          await transporter.sendMail({
            from: `"OutingStation" <${process.env.GMAIL_USER}>`,
            to: paymentData.customer.email,
            subject: `We're sorry — a scheduling conflict on ${bookingData.listingTitle}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
                <div style="background: #FEF2F2; border-radius: 16px; padding: 24px;">
                  <h2 style="margin: 0 0 12px; color: #0F172A; font-size: 18px;">${bookingData.listingTitle}</h2>
                  <p style="margin: 0 0 16px; font-size: 14px; color: #374151; line-height: 1.6;">
                    We're sorry — your payment went through, but these dates/time were booked by someone else moments before you. This booking has been cancelled and you'll receive a full refund of ₦${amountPaid.toLocaleString()}.
                  </p>
                  <p style="margin: 0; font-size: 12px; color: #64748B;">Our team has already been notified and your refund is being processed.</p>
                </div>
              </div>
            `,
          });
        } catch (conflictEmailErr) {
          console.error('❌ Failed to send conflict apology email:', conflictEmailErr);
        }

        return res.status(200).json({ success: true, conflict: true, bookingId: metadata.bookingId });
      }

      await updateDoc(bookingRef, {
        paymentStatus: 'paid',
        escrowStatus: 'held',
        amountPaid,
        platformFee,
        ownerPayout,
        paymentReference: paymentData.reference,
        paidAt: serverTimestamp(),
      });
      console.log(`✅ Booking ${metadata.bookingId} marked paid — escrow held, agency owed ₦${ownerPayout} once released, platform fee ₦${platformFee}`);

      // Confirmation email — fetch the listing for its title/agency
      // (already denormalized onto the booking doc at creation time, but
      // re-fetching keeps this consistent with how every other branch in
      // this file re-fetches its parent doc rather than trusting a
      // client-supplied snapshot for anything shown in an email).
      try {
        const listingDoc = await getDoc(doc(db, listingCollection, bookingData.listingId));
        const listingData = listingDoc.exists() ? listingDoc.data() : {};

        const emailBookingData = {
          ...bookingData,
          amount: amountPaid,
          // ✅ FIXED — was letting these fall through from the spread
          // above, which is the PRE-payment snapshot (fetched via
          // getDoc before this webhook's own updateDoc call) — i.e. the
          // client's original numbers, not the server-recomputed ones
          // this function just calculated a few lines up. Explicitly
          // overriding with the authoritative values so the email always
          // shows exactly what was actually charged and split, even in
          // the (should-be-rare) case those ever drift from what the
          // client originally proposed.
          subtotal,
          platformFee,
          paymentReference: paymentData.reference,
          checkInDateFormatted: bookingData.checkInDate ? formatEventDate({ date: bookingData.checkInDate }) : null,
          checkOutDateFormatted: bookingData.checkOutDate ? formatEventDate({ date: bookingData.checkOutDate }) : null,
        };

        const transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD }
        });
        await transporter.sendMail({
          from: `"OutingStation" <${process.env.GMAIL_USER}>`,
          to: paymentData.customer.email,
          subject: `✅ Payment Confirmed — ${bookingData.listingTitle}`,
          html: generateBookingConfirmationEmail(emailBookingData, listingData, isShortlet ? 'shortlet' : 'ride')
        });
        console.log(`📧 Booking confirmation sent to: ${paymentData.customer.email}`);
      } catch (emailErr) {
        console.error('❌ Failed to send booking confirmation email:', emailErr);
      }

      // ✅ NEW — closes the "how will OSB know?" gap: right up until now,
      // an owner only ever found out about a paid booking by manually
      // opening their own Bookings tab. Wrapped in its OWN try/catch,
      // separate from the guest email block above — a failure sending to
      // the owner should never be able to affect (or be affected by)
      // whether the guest's own confirmation email went out, since
      // they're two independent notifications about the same event.
      try {
        const businessDoc = await getDoc(doc(db, 'businesses', bookingData.agencyId));
        const ownerEmail = businessDoc.exists() ? businessDoc.data().ownerEmail : null;

        if (ownerEmail) {
          const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD }
          });
          const isShortletLabel = isShortlet ? 'Shortlet' : 'Ride';
          await transporter.sendMail({
            from: `"OutingStation Business" <${process.env.GMAIL_USER}>`,
            to: ownerEmail,
            subject: `🎉 New ${isShortletLabel} booking — ${bookingData.listingTitle}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
                <div style="background: #ECFEFF; border-radius: 16px; padding: 24px;">
                  <p style="margin: 0 0 4px; color: #0891B2; font-weight: 700; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">New Booking</p>
                  <h2 style="margin: 0 0 16px; color: #0F172A; font-size: 20px;">${bookingData.listingTitle}</h2>
                  <p style="margin: 0 0 16px; font-size: 14px; color: #374151;">
                    A guest just paid ₦${Number(amountPaid).toLocaleString()} — you'll receive ₦${Number(ownerPayout).toLocaleString()} once the booking is confirmed.
                  </p>
                  ${!isShortlet ? '<p style="margin: 0 0 16px; font-size: 13px; color: #92400E; background: #FFFBEB; padding: 10px 14px; border-radius: 8px;">Don\'t forget to assign a driver from your OSB Bookings tab.</p>' : ''}
                  <p style="margin: 0; font-size: 12px; color: #64748B;">View full details under Bookings in your OSB dashboard.</p>
                </div>
              </div>
            `,
          });
          console.log(`📧 New booking alert sent to owner: ${ownerEmail}`);
        } else {
          console.log(`⚠️ No ownerEmail on file for agency ${bookingData.agencyId} — owner booking alert skipped`);
        }
      } catch (ownerEmailErr) {
        console.error('❌ Failed to send owner booking-alert email:', ownerEmailErr);
      }

      // Note: booking payments do not generate ambassador commission —
      // same explicit design choice as vendor stands above, not an
      // oversight; revisit if that changes.

      return res.status(200).json({ success: true, purchaseType: metadata.purchaseType, bookingId: metadata.bookingId });
    }

    if (!metadata.eventId) {
      console.error('❌ CRITICAL: eventId missing from metadata!');
      return res.status(400).json({ error: 'Missing eventId in metadata' });
    }

    // ─── VENDOR STAND branch ──────────────────────────────────────────────
    if (metadata.purchaseType === 'vendor_stand') {
      // REWORKED: applications now exist BEFORE payment (created free at
      // apply-time, approved/rejected by the organizer with no money moved).
      // This webhook now confirms PAYMENT on an already-approved application,
      // rather than creating a brand new one.
      if (!metadata.applicationId) {
        console.error('❌ CRITICAL: applicationId missing from vendor_stand payment metadata!');
        return res.status(400).json({ error: 'Missing applicationId in metadata' });
      }

      const appRef = doc(db, 'standApplications', metadata.applicationId);
      const appSnap = await getDoc(appRef);
      if (!appSnap.exists()) {
        console.error('❌ Stand application not found:', metadata.applicationId);
        return res.status(404).json({ error: 'Application not found' });
      }
      const appData = appSnap.data();

      // Idempotency — don't double-process the same payment
      if (appData.paymentStatus === 'paid') {
        console.log('⚠️ This application was already marked paid');
        return res.status(200).json({ success: true, message: 'Already processed' });
      }

      // Safety — only accept payment on an approved application
      if (appData.organizerApprovalStatus !== 'approved') {
        console.error('❌ Payment received for a non-approved application:', metadata.applicationId);
        return res.status(400).json({ error: 'Application is not approved for payment' });
      }

      const amountPaid = appData.standPrice > 0 ? appData.standPrice : Math.round(paymentData.amount / 100);

      // OutingStation takes a 10% platform fee on vendor stand fees;
      // the rest is what's owed to the organizer. Vendor still pays exactly
      // the stand price shown — this split doesn't change what they pay,
      // it's just how the money is accounted for once it's in.
      const PLATFORM_FEE_PERCENTAGE = 0.10;
      const platformFee = Math.round(amountPaid * PLATFORM_FEE_PERCENTAGE);
      const organizerPayout = amountPaid - platformFee;

      await updateDoc(appRef, {
        paymentStatus: 'paid',
        amountPaid,
        platformFee,
        organizerPayout,
        paymentReference: paymentData.reference,
        paidAt: serverTimestamp(),
      });
      console.log(`✅ Stand application ${metadata.applicationId} marked paid — organizer owed ₦${organizerPayout}, platform fee ₦${platformFee}`);

      await updateStandFilledCount(appData.eventId, appData.standId);

      const eventDoc = await getDoc(doc(db, 'events', appData.eventId));
      const eventData = eventDoc.exists() ? eventDoc.data() : { title: appData.eventTitle };

      try {
        const transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD }
        });
        await transporter.sendMail({
          from: `"OutingStation" <${process.env.GMAIL_USER}>`,
          to: paymentData.customer.email,
          subject: `✅ Payment Confirmed — Your Vendor Stand at ${eventData.title}`,
          html: generateStandConfirmationEmail({ ...appData, amountPaid, paymentReference: paymentData.reference }, eventData)
        });
        console.log(`📧 Stand confirmation email sent to: ${paymentData.customer.email}`);
      } catch (emailErr) {
        console.error('❌ Failed to send stand confirmation email:', emailErr);
      }

      // Note: vendor stand fees do not generate ambassador commission —
      // that's a design choice, not an oversight; revisit if that changes.

      return res.status(200).json({ success: true, purchaseType: 'vendor_stand' });
    }

    // ─── TICKET branch (unchanged) ─────────────────────────────────────────
    const existingQuery = query(
      collection(db, 'tickets'),
      where('paymentReference', '==', paymentData.reference)
    );
    const existingSnapshot = await getDocs(existingQuery);
    if (!existingSnapshot.empty) {
      console.log('⚠️ Ticket already exists for this payment');
      return res.status(200).json({ success: true, message: 'Already processed' });
    }

    const userId = await findUserByEmail(paymentData.customer.email);

    if (userId && metadata.creditsApplied > 0) {
      await deductCreditsFromUser(userId, metadata.creditsApplied);
    }

    const eventDoc = await getDoc(doc(db, 'events', metadata.eventId));
    if (!eventDoc.exists()) {
      console.error('❌ Event not found:', metadata.eventId);
      return res.status(404).json({ error: 'Event not found' });
    }
    const eventData = eventDoc.data();

    const ticketId = metadata.ticketId || generateTicketId();

    const totalPaid = metadata.totalAmount > 0
      ? metadata.totalAmount
      : Math.round(paymentData.amount / 100);

    const paystackFee = Math.round((paymentData.amount / 100) * 0.015 + 100);

    // code-gated group tagging for paid events. IMPORTANT: this
    // runs AFTER Paystack has already confirmed payment, so it can never
    // reject/block ticket creation the way register-free-event.js's
    // transaction does for free registrations — the customer already
    // paid, and refusing to issue a ticket at this point would mean
    // taking their money and giving them nothing. So this is
    // deliberately best-effort: it still increments the group's
    // usedGuests atomically (to keep Manage Event's counts accurate),
    // but if that would exceed the group's maxGuests it logs a warning
    // and proceeds anyway rather than blocking. The REAL enforcement —
    // stopping someone from starting checkout on an exhausted group in
    // the first place — has to happen client-side, before Paystack is
    // even opened, in the ticket purchase flow itself.
    let invitedByGroupName = null;
    if (metadata.groupCode) {
      const normalizedCode = metadata.groupCode.toUpperCase().trim();
      try {
        invitedByGroupName = await runTransaction(db, async (transaction) => {
          const freshEventSnap = await transaction.get(doc(db, 'events', metadata.eventId));
          if (!freshEventSnap.exists()) return null;
          const freshEventData = freshEventSnap.data();

          const groups = freshEventData.groupCodes || [];
          const groupIndex = groups.findIndex(g => (g.code || '').toUpperCase() === normalizedCode);
          if (groupIndex === -1) {
            console.warn(`⚠️ Paid ticket referenced unknown group code "${normalizedCode}" — proceeding without group tag`);
            return null;
          }

          const group = groups[groupIndex];
          const newUsedGuests = (group.usedGuests || 0) + (metadata.quantity || 1);
          if (newUsedGuests > (group.maxGuests || 0)) {
            console.warn(`⚠️ Group "${group.groupName}" now exceeds its guest limit (${newUsedGuests}/${group.maxGuests}) — payment already succeeded, issuing ticket anyway`);
          }

          const updatedGroups = groups.map((g, i) =>
            i === groupIndex ? { ...g, usedGuests: newUsedGuests } : g
          );
          transaction.update(doc(db, 'events', metadata.eventId), { groupCodes: updatedGroups });

          return group.groupName;
        });
      } catch (txErr) {
        console.error('❌ Group code transaction failed (ticket still issued):', txErr);
      }
    }

    const ticketData = {
      ticketId,
      eventId: metadata.eventId,
      eventTitle: eventData.title,
      buyerName: metadata.buyerName || paymentData.customer.first_name || 'Guest',
      buyerEmail: paymentData.customer.email,
      buyerPhone: metadata.buyerPhone || paymentData.customer.phone || 'N/A',
      quantity: metadata.quantity,
      ticketPrice: metadata.ticketPrice,
      serviceFee: metadata.serviceFee,
      paystackFee,
      subtotal: metadata.subtotal,
      creditsApplied: metadata.creditsApplied,
      totalPaid,
      paymentReference: paymentData.reference,
      eventDate: formatEventDate(eventData),
      eventTime: formatEventTime(eventData),
      status: 'valid',
      checkedIn: false,
      userId: userId || null,
      purchasedAt: serverTimestamp(),
      tierId: metadata.tierId || null,
      tierName: metadata.tierName || null,
      // same invitedBy/groupCode tagging as free-registration
      // group tickets, so it shows up consistently on the ticket itself
      // and in Manage Event regardless of whether the event was free or paid.
      invitedBy: invitedByGroupName,
      groupCode: metadata.groupCode ? metadata.groupCode.toUpperCase().trim() : null,
      // same reasoning as register-free-event.js's identical
      // field: nothing currently records whether the underlying event
      // was private for an UNLISTED paid event's ticket (invitedBy is
      // only set for group-code purchases). Stamped here so "My Tickets"
      // can split Public vs Private cleanly without a second lookup.
      isPrivateEvent: eventData.visibility === 'private',
    };

    await setDoc(doc(db, 'tickets', ticketId), ticketData);
    console.log(`✅ Ticket saved: ${ticketId}${metadata.tierName ? ` (${metadata.tierName})` : ''}`);

    await updateDoc(doc(db, 'events', metadata.eventId), {
      ticketsSold: increment(metadata.quantity)
    });

    if (metadata.tierId || metadata.tierName) {
      await updateTierSoldCount(
        metadata.eventId,
        metadata.tierId,
        metadata.tierName,
        metadata.quantity
      );
    }

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
      subject: `🎉 Your${metadata.tierName ? ` ${metadata.tierName}` : ''} Ticket for ${eventData.title} — ${ticketId}`,
      html: generateTicketEmail(ticketData, eventData)
    });

    console.log(`✅ Ticket created: ${ticketId}`);
    console.log(`📧 Email sent to: ${paymentData.customer.email}`);

    // DISABLED — ambassador 50% commission distribution turned off.
    // distributeAmbassadorCommission(
    //   { ...eventData, id: metadata.eventId },
    //   metadata.serviceFee,
    //   metadata.quantity
    // ).catch(err => console.error('Commission distribution failed silently:', err));

    return res.status(200).json({
      success: true,
      ticketId,
      tierName: metadata.tierName || null,
      creditsDeducted: metadata.creditsApplied
    });

  } catch (error) {
    console.error('❌ Webhook error:', error);
    console.error('❌ Stack:', error.stack);
    return res.status(500).json({
      error: 'Webhook processing failed',
      message: error.message
    });
  }
}