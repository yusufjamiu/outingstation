// api/paystack/initialize.js
//
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

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
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
  } catch (error) {
    console.error('❌ Paystack initialize error:', error);
    return res.status(500).json({ error: 'Failed to initialize payment' });
  }
}