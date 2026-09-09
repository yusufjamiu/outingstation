// api/paystack/create-recipient.js
//
// ✅ NEW — the missing link between osb_profile_screen.dart's Payout
// section (which only ever writes raw bankAccountNumber/bankCode/
// bankName to Firestore) and actually being able to send that owner
// money. Paystack requires a "transfer recipient" object — created once
// per bank account via POST /transferrecipient — before any transfer()
// call can reference it. This route creates that recipient and stores
// the returned recipient_code back on the business doc.
//
// PAYSTACK_SECRET_KEY is used here and only here in this file, same
// "server never lets the client touch the secret key" rule already
// established for initialize.js — the client only ever sends a
// businessId, never bank details directly, and gets back nothing but a
// success/failure signal.
//
// Bank details are read FROM FIRESTORE, not trusted from the request
// body — the client already saved them via the Firestore rule's
// owner-write path in a separate step; this route re-reads that same
// doc rather than accepting a second, unverified copy of the same
// numbers from the client. This also means create-recipient can be
// safely re-triggered (e.g. retried after a network failure) without
// the client needing to resend sensitive bank details a second time.
//
// recipientCode is written back via a plain Firestore write from this
// server route — matches the businesses/ Firestore rule's server-only
// update path for recipientCode (the one clause in that rule with no
// isAuthenticated() check at all, since it's never meant to be reached
// by a normal signed-in user's client call).

import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';

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

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { businessId } = req.body;

    if (!businessId) {
      return res.status(400).json({ error: 'Missing required field: businessId' });
    }

    // ─── Read the bank details straight from Firestore ──────────────
    const businessRef = doc(db, 'businesses', businessId);
    const businessSnap = await getDoc(businessRef);

    if (!businessSnap.exists()) {
      return res.status(404).json({ error: 'Business not found' });
    }
    const business = businessSnap.data();

    const { bankAccountNumber, bankCode, bankName, accountName, businessName } = business;

    if (!bankAccountNumber || !bankCode) {
      return res.status(400).json({ error: 'This business has no bank account on file yet' });
    }

    // ✅ Idempotency — if a recipient already exists for these exact
    // bank details, don't create a duplicate one on Paystack's side.
    // Only skips if the account number matches what the existing
    // recipientCode was created against — if the owner changed banks
    // since, recipientLastAccountNumber won't match and this falls
    // through to create a fresh recipient for the new details.
    if (business.recipientCode && business.recipientLastAccountNumber === bankAccountNumber) {
      console.log(`ℹ️ Recipient already exists for business ${businessId}, skipping creation`);
      return res.status(200).json({ success: true, recipientCode: business.recipientCode, alreadyExisted: true });
    }

    // ─── Create the recipient on Paystack ────────────────────────────
    const paystackRes = await fetch('https://api.paystack.co/transferrecipient', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'nuban',
        // Paystack requires a name on the recipient — prefer the
        // resolved/typed account holder name if present, falling back
        // to the business name so this never fails just because the
        // optional accountName field was left blank at save time.
        name: accountName || businessName || 'OutingStation Business',
        account_number: bankAccountNumber,
        bank_code: bankCode,
        currency: 'NGN',
      }),
    });

    const data = await paystackRes.json();

    if (!data.status) {
      console.error('❌ Paystack create-recipient failed:', data.message);
      return res.status(400).json({ error: data.message || 'Failed to create transfer recipient' });
    }

    const recipientCode = data.data.recipient_code;

    // ─── Write recipientCode back — server-only field ────────────────
    // Matches the businesses/ Firestore rule's recipientCode update
    // clause exactly, which has no isAuthenticated() check specifically
    // because it's meant to be written only from trusted server context
    // like this route, never from a signed-in user's own client call.
    await updateDoc(businessRef, {
      recipientCode,
      recipientCodeUpdatedAt: serverTimestamp(),
      // Tracked so the idempotency check above can tell whether a
      // *new* bank account was saved since this recipient was created,
      // and correctly re-create rather than silently reuse a stale one.
      recipientLastAccountNumber: bankAccountNumber,
    });

    console.log(`✅ Transfer recipient created for business ${businessId}: ${recipientCode}`);

    return res.status(200).json({ success: true, recipientCode });
  } catch (error) {
    console.error('❌ Paystack create-recipient error:', error);
    return res.status(500).json({ error: 'Failed to create transfer recipient' });
  }
}