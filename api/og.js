// api/og.js
//
// ✅ CHANGED — was always serving a separate landing page (with its own
// "Open in App" button) that then navigated away to either the app or
// /shortlets/{id} — meaning the address bar always changed away from
// the short /s/{id} link the moment a real visitor arrived. That broke
// the "copy the link from here and it still works the same way"
// expectation people have from apps like Instagram/Twitter.
//
// Rebuilt to mirror og-proxy.js's own proven bot/human split exactly:
// a real crawler (WhatsApp, Facebook, etc.) gets served a minimal page
// with just the Open Graph meta tags it needs — it never runs
// JavaScript or cares about the address bar. A REAL VISITOR now gets
// served the actual built React app directly (same file og-proxy.js
// itself serves for a normal page load) — no redirect happens at all,
// so the URL bar permanently stays exactly what was shared. React
// Router's own /s/:id and /r/:id routes (added alongside the existing
// /shortlets/:id, /rent-a-ride/:id) render the exact same listing/modal
// once the app boots up client-side.
//
// The "Open in App" prompt moves from being its own page into a small
// banner INSIDE ShortletsPage.jsx / RentARidePage.jsx now, shown only
// when the URL matches this short-link pattern on a phone — see those
// files' own comments for that half of this change.

import fs from 'fs';
import path from 'path';

const COLLECTION_BY_TYPE = {
  shortlet: 'shortlets',
  ride: 'rides',
  event: 'events',
};

const PATH_PREFIX_BY_TYPE = {
  shortlet: 's',
  ride: 'r',
  event: 'e',
};

// Same bot-detection regex as og-proxy.js, for consistency — one
// definition of "is this a crawler" across both files would be nicer,
// but they're separate Vercel functions with no shared module between
// them in this project, so duplicated deliberately rather than adding
// import complexity for a five-line regex.
const BOT_REGEX = /facebookexternalhit|twitterbot|pinterest|slackbot|linkedinbot|discordbot|whatsapp|telegrambot|googlebot|bingbot/i;

export default async function handler(req, res) {
  const ua = req.headers['user-agent'] || '';
  const isBot = BOT_REGEX.test(ua);

  const { type } = req.query;
  const collectionId = COLLECTION_BY_TYPE[type];
  const pathPrefix = PATH_PREFIX_BY_TYPE[type] || 's';
  const rawId = req.query.id || '';

  // ✅ Real visitor — serve the actual built React app directly, same
  // file og-proxy.js itself serves. No redirect, no separate landing
  // page — the address bar stays exactly as-is, permanently.
  if (!isBot) {
    try {
      const filePath = path.join(process.cwd(), 'dist', 'index.html');
      const html = fs.readFileSync(filePath, 'utf8');
      res.setHeader('Content-Type', 'text/html');
      return res.status(200).send(html);
    } catch (err) {
      console.error('Error reading dist/index.html:', err);
      res.setHeader('Content-Type', 'text/html');
      return res.status(200).send(`<!DOCTYPE html><html><head><meta charset="UTF-8"/></head><body><div id="root"></div><script type="module" src="/src/main.jsx"></script></body></html>`);
    }
  }

  // ─── Everything below only ever runs for a real crawler ───────────
  let title = 'OutingStation - Everything Your City Has To Offer';
  let description = 'Discover events and places in Lagos, Abuja and more.';
  let image = 'https://www.outingstation.com/og-image.png';

  // Same shareCode extraction as before — the code is always the LAST
  // hyphen-separated segment, the slug portion in front of it may
  // contain any number of hyphens.
  const shareCode = rawId.includes('-') ? rawId.split('-').pop() : rawId;
  const shareUrl = `https://www.outingstation.com/${pathPrefix}/${rawId}`;

  if (collectionId && shareCode) {
    try {
      const projectId = process.env.VITE_FIREBASE_PROJECT_ID;
      const apiKey = process.env.VITE_FIREBASE_API_KEY;

      const queryResponse = await fetch(
        `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            structuredQuery: {
              from: [{ collectionId }],
              where: {
                fieldFilter: {
                  field: { fieldPath: 'shareCode' },
                  op: 'EQUAL',
                  value: { stringValue: shareCode },
                },
              },
              limit: 1,
            },
          }),
        }
      );

      if (queryResponse.ok) {
        const queryData = await queryResponse.json();
        const doc = queryData[0]?.document;

        if (doc?.fields) {
          const fields = doc.fields;
          const listingTitle = fields.title?.stringValue || (type === 'shortlet' ? 'Shortlet' : 'Ride');
          const city = fields.city?.stringValue || '';
          title = `${listingTitle} - OutingStation`;

          if (type === 'shortlet') {
            const price = fields.pricePerNight?.integerValue || fields.pricePerNight?.doubleValue;
            description = price ? `₦${price}/night in ${city}` : `Available in ${city}`;
          } else {
            const tripPrice = fields.tripPrice?.integerValue || fields.tripPrice?.doubleValue;
            const hourPrice = fields.hourPrice?.integerValue || fields.hourPrice?.doubleValue;
            const priceParts = [];
            if (tripPrice) priceParts.push(`₦${tripPrice}/trip`);
            if (hourPrice) priceParts.push(`₦${hourPrice}/hour`);
            description = priceParts.length ? `${priceParts.join(' · ')} in ${city}` : `Available in ${city}`;
          }

          // ⚠️ ASSUMPTION — images stored as an array field named
          // 'images', first entry used as the preview image.
          const imagesArray = fields.images?.arrayValue?.values;
          if (imagesArray && imagesArray.length > 0) {
            image = imagesArray[0]?.stringValue || image;
          }
        }
      } else {
        console.error(`Firestore query failed for ${type} shareCode ${shareCode}: ${queryResponse.status}`);
      }
    } catch (err) {
      console.error(`Error fetching ${type} (shareCode ${shareCode}) for OG preview:`, err);
      // Falls through to the generic OutingStation defaults set above.
    }
  }

  // Minimal page — a crawler never runs this JavaScript or looks past
  // the <head>, so no "Open in App" UI needed here at all; that only
  // matters for a real human, who never reaches this branch anymore.
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${title}</title>
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${description}" />
  <meta property="og:image" content="${image}" />
  <meta property="og:url" content="${shareUrl}" />
  <meta property="og:type" content="website" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${title}" />
  <meta name="twitter:description" content="${description}" />
  <meta name="twitter:image" content="${image}" />
</head>
<body>
  <p>${title}</p>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  return res.status(200).send(html);
}