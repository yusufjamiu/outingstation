// api/paystack.js
//
// ✅ CONSOLIDATED — replaces api/paystack/initialize.js and
// api/paystack/create-recipient.js. Same reason as api/notify.js: Vercel's
// Hobby plan hard-caps a deployment at 12 Serverless Functions, and this
// project crossed that limit (confirmed via the real Vercel error).
// These two files were functionally distinct (one starts a payment, the
// other creates a transfer recipient) but both exist purely as thin
// wrappers around a Paystack API call using PAYSTACK_SECRET_KEY, so they
// merge cleanly under one roof with an `action` dispatch field, exactly
// like the notify consolidation. Every line of actual logic from both
// original files is preserved unchanged below — only the file boundary
// and the way a request selects which one to run has changed.
//
// Callers: update the endpoint from /api/paystack/initialize or
// /api/paystack/create-recipient to /api/paystack, with `action: 'initialize'`
// or `action: 'create_recipient'` added to the existing request body —
// nothing else about either request shape changes.

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

// ─── initialize — starts a Paystack transaction, called before checkout ───
// Called by the mobile app (and can be reused by web) BEFORE opening
// Paystack checkout. This is the only place PAYSTACK_SECRET_KEY is ever
// used for initialization — it never leaves the server. The client gets
// back an authorization_url, which is all flutter_paystack_plus needs to
// open the checkout WebView (see its docs: "you must provide either
// secretKey or authorizationUrl — but not both", and Paystack's own docs:
// "Don't make an API request to the Initialize Transaction endpoint
// directly on your mobile app because it requires your secret key.")
//
// Final payment confirmation still happens exactly where it already did —
// paystack-webhook.js, triggered by Paystack's own server-to-server
// webhook call once the charge succeeds. This route only starts the
// transaction; it is not the source of truth for whether payment happened.
async function handleInitialize(req, res) {
  const { email, amount, reference, metadata, callback_url } = req.body;

  if (!email || !amount || !reference) {
    return res.status(400).json({ error: 'Missing required fields: email, amount, reference' });
  }

  const paystackRes = await fetch('https://api.paystack.co/transaction/initialize', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      amount, // must already be in kobo — same convention the app already used
      reference,
      currency: 'NGN',
      callback_url: callback_url || 'https://outingstation.com',
      metadata,
    }),
  });

  const data = await paystackRes.json();

  if (!data.status) {
    console.error('❌ Paystack initialize failed:', data.message);
    return res.status(400).json({ error: data.message || 'Paystack initialization failed' });
  }

  // Only ever return what the client needs to open checkout — never
  // anything derived from the secret key, and never the key itself.
  return res.status(200).json({
    authorization_url: data.data.authorization_url,
    access_code: data.data.access_code,
    reference: data.data.reference,
  });
}

// ─── create_recipient — creates a Paystack transfer recipient ─────────────
// The missing link between osb_profile_screen.dart's Payout section
// (which only ever writes raw bankAccountNumber/bankCode/bankName to
// Firestore) and actually being able to send that owner money. Paystack
// requires a "transfer recipient" object — created once per bank account
// via POST /transferrecipient — before any transfer() call can reference
// it. This creates that recipient and stores the returned recipient_code
// back on the business doc.
//
// Bank details are read FROM FIRESTORE, not trusted from the request
// body — the client already saved them via the Firestore rule's
// owner-write path in a separate step; this re-reads that same doc
// rather than accepting a second, unverified copy of the same numbers
// from the client. This also means it can be safely re-triggered (e.g.
// retried after a network failure) without the client needing to resend
// sensitive bank details a second time.
async function handleCreateRecipient(req, res) {
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
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { action } = req.body;

  try {
    switch (action) {
      case 'initialize':
        return await handleInitialize(req, res);
      case 'create_recipient':
        return await handleCreateRecipient(req, res);
      default:
        return res.status(400).json({ error: `Unknown action: ${action}` });
    }
  } catch (error) {
    console.error(`❌ Paystack route error (action: ${action}):`, error);
    return res.status(500).json({ error: action === 'create_recipient' ? 'Failed to create transfer recipient' : 'Failed to initialize payment' });
  }
}