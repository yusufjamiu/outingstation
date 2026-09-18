// api/og.js
//
// CHANGED — was always serving a separate landing page (with its own
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
//
// NEW — added an 'outing' branch (Moments/short-video posts, shared
// via outings_feed_screen.dart's own share button). Resolved by a
// shareCode query, same pattern as shortlet/ride/experience below —
// outing links read {slug}-{shareCode}, not a raw document id.

import fs from 'fs';
import path from 'path';

const COLLECTION_BY_TYPE = {
  shortlet: 'shortlets',
  ride: 'rides',
  event: 'events',
  outing: 'outings', // NEW
};

const PATH_PREFIX_BY_TYPE = {
  shortlet: 's',
  ride: 'r',
  event: 'e',
  outing: 'o', // NEW
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

  // Real visitor — serve the actual built React app directly, same
  // file og-proxy.js itself serves. No redirect, no separate landing
  // page — the address bar stays exactly as-is, permanently.
  if (!isBot) {
    try {
      const filePath = path.join(process.cwd(), 'dist', 'index.html');
      const html = fs.readFileSync(filePath, 'utf8');
      res.setHeader('Content-Type', 'text/html');
      // FIXED — a real, serious bug: the crawler-facing response
      // below sets a 1-HOUR cache with no Vary header at all, which
      // means Vercel's CDN caches purely by URL — it has no way to
      // know a bot and a real browser should ever get different
      // content for the SAME url. Once any crawler (WhatsApp's own
      // preview fetch, for instance) hit a link once, every SUBSEQUENT
      // visitor — bot or genuine human — got served that same cached
      // bot-only page for up to an hour, which is exactly the
      // "just shows the bare title, no real app" symptom reported.
      // Vary: User-Agent tells the CDN to cache bot and human responses
      // SEPARATELY for the same URL, closing this off entirely.
      res.setHeader('Vary', 'User-Agent');
      return res.status(200).send(html);
    } catch (err) {
      console.error('Error reading dist/index.html:', err);
      res.setHeader('Content-Type', 'text/html');
      res.setHeader('Vary', 'User-Agent');
      return res.status(200).send(`<!DOCTYPE html><html><head><meta charset="UTF-8"/></head><body><div id="root"></div><script type="module" src="/src/main.jsx"></script></body></html>`);
    }
  }

  // ─── Everything below only ever runs for a real crawler ───────────
  let title = 'OutingStation - Everything Your City Has To Offer';
  let description = 'Discover events and places in Lagos, Abuja and more.';
  let image = 'https://www.outingstation.com/og-image.png';
  const shareUrl = `https://www.outingstation.com/${pathPrefix}/${rawId}`;

  try {
    const projectId = process.env.VITE_FIREBASE_PROJECT_ID;
    const apiKey = process.env.VITE_FIREBASE_API_KEY;

    if (type === 'event') {
      // CHANGED — was only ever checking the `events` collection.
      // EventDetails.jsx (the real, live component this link renders
      // through) actually has a FOUR-WAY fallback chain for a single
      // /event/{id} or /e/{id} link: events → businesses → shortlets →
      // experiences — confirmed directly from its own loadEventDetails
      // function. A short link to an Experience or a business "Place"
      // was correctly RENDERING already (since the real app has that
      // fallback built in), but the PREVIEW card shown before someone
      // even taps through never reflected it — a crawler hitting this
      // endpoint only ever checked `events`, so anything resolved via
      // fallback #2, #3, or #4 showed the generic OutingStation
      // default instead of its real title/photo. Mirrors the exact
      // same chain and field mappings EventDetails.jsx itself uses, in
      // the same order, so the preview always matches what a real
      // visitor actually sees once they land.
      let fields = null;
      let matchedVia = 'events';

      const byIdRes = await fetch(
        `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/events/${rawId}?key=${apiKey}`
      );
      if (byIdRes.ok) {
        const data = await byIdRes.json();
        if (data.fields) fields = data.fields;
      }

      if (!fields) {
        const queryRes = await fetch(
          `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              structuredQuery: {
                from: [{ collectionId: 'events' }],
                where: { fieldFilter: { field: { fieldPath: 'slug' }, op: 'EQUAL', value: { stringValue: rawId } } },
                limit: 1,
              },
            }),
          }
        );
        if (queryRes.ok) {
          const queryData = await queryRes.json();
          fields = queryData[0]?.document?.fields || null;
        }
      }

      // Fallback #2 — businesses (a "Place")
      if (!fields) {
        const bizRes = await fetch(
          `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/businesses/${rawId}?key=${apiKey}`
        );
        if (bizRes.ok) {
          const data = await bizRes.json();
          if (data.fields) { fields = data.fields; matchedVia = 'businesses'; }
        }
      }

      // NEW — same shareCode fallback as the experiences one below.
      // Resorts/Restaurants (businesses) now generate shareCode-based
      // links too, not just the raw ID.
      if (!fields) {
        const shareCode = rawId.includes('-') ? rawId.split('-').pop() : rawId;
        const bizQueryRes = await fetch(
          `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              structuredQuery: {
                from: [{ collectionId: 'businesses' }],
                where: { fieldFilter: { field: { fieldPath: 'shareCode' }, op: 'EQUAL', value: { stringValue: shareCode } } },
                limit: 1,
              },
            }),
          }
        );
        if (bizQueryRes.ok) {
          const queryData = await bizQueryRes.json();
          const doc = queryData[0]?.document;
          if (doc?.fields) { fields = doc.fields; matchedVia = 'businesses'; }
        }
      }

      // Fallback #3 — shortlets
      if (!fields) {
        const shortletRes = await fetch(
          `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/shortlets/${rawId}?key=${apiKey}`
        );
        if (shortletRes.ok) {
          const data = await shortletRes.json();
          if (data.fields) { fields = data.fields; matchedVia = 'shortlets'; }
        }
      }

      // Fallback #4 — experiences
      if (!fields) {
        const expRes = await fetch(
          `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/experiences/${rawId}?key=${apiKey}`
        );
        if (expRes.ok) {
          const data = await expRes.json();
          if (data.fields) { fields = data.fields; matchedVia = 'experiences'; }
        }
      }

      // NEW — closes the same mismatch just fixed in EventDetails.jsx:
      // experience share links now embed a genuine shareCode
      // ("slug-abc123"), not the raw document ID — a direct fetch by
      // that string was never going to match. Falls back to a
      // shareCode query, same pattern already proven for Shortlet/Ride.
      if (!fields) {
        const shareCode = rawId.includes('-') ? rawId.split('-').pop() : rawId;
        const expQueryRes = await fetch(
          `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              structuredQuery: {
                from: [{ collectionId: 'experiences' }],
                where: { fieldFilter: { field: { fieldPath: 'shareCode' }, op: 'EQUAL', value: { stringValue: shareCode } } },
                limit: 1,
              },
            }),
          }
        );
        if (expQueryRes.ok) {
          const queryData = await expQueryRes.json();
          const doc = queryData[0]?.document;
          if (doc?.fields) { fields = doc.fields; matchedVia = 'experiences'; }
        }
      }

      if (fields) {
        if (matchedVia === 'events') {
          title = `${fields.title?.stringValue || 'Event'} - OutingStation`;
          description = fields.description?.stringValue?.substring(0, 150) || description;
          image = fields.imageUrl?.stringValue || image;
        } else if (matchedVia === 'businesses') {
          // Matches EventDetails.jsx's own businesses mapping:
          // title: biz.businessName, imageUrl: biz.logoUrl.
          title = `${fields.businessName?.stringValue || 'Place'} - OutingStation`;
          const city = fields.city?.stringValue || '';
          description = city ? `Discover this place in ${city}.` : description;
          image = fields.logoUrl?.stringValue || image;
        } else if (matchedVia === 'shortlets') {
          const listingTitle = fields.title?.stringValue || 'Shortlet';
          const city = [fields.area?.stringValue, fields.city?.stringValue].filter(Boolean).join(', ');
          title = `${listingTitle} - OutingStation`;
          description = city ? `Available in ${city}.` : description;
          const imagesArray = fields.images?.arrayValue?.values;
          if (imagesArray && imagesArray.length > 0) image = imagesArray[0]?.stringValue || image;
        } else if (matchedVia === 'experiences') {
          // Matches EventDetails.jsx's own experiences mapping exactly:
          // title: exp.title, imageUrl: exp.imageUrl || images[0].
          const expTitle = fields.title?.stringValue || 'Experience';
          const city = fields.city?.stringValue || '';
          const price = fields.pricePerPerson?.integerValue || fields.pricePerPerson?.doubleValue;
          title = `${expTitle} - OutingStation`;
          description = price ? `₦${price}/person${city ? ` in ${city}` : ''}` : (fields.description?.stringValue?.substring(0, 150) || description);
          const imagesArray = fields.images?.arrayValue?.values;
          image = fields.imageUrl?.stringValue || (imagesArray && imagesArray.length > 0 ? imagesArray[0]?.stringValue : null) || image;
        }
      }
    } else if (type === 'outing') {
      // Outing links read {slug}-{shareCode}, a short 6-character
      // code, not the raw 20-character Firestore document id.
      // Resolved by a shareCode QUERY, same runQuery pattern used for
      // shortlet/ride/experience shareCode lookups above.
      //
      // FIXED — a real bug from the previous edit: the error-logging
      // line below referenced "outingRes", a variable name that only
      // existed in the OLD direct-by-id version of this branch. Once
      // this was rewritten to use a shareCode query instead (the
      // variable renamed to outingQueryRes), that log line was never
      // updated to match — meaning if a shareCode ever failed to
      // resolve, this would throw a ReferenceError (undefined
      // variable) instead of just logging cleanly and falling through
      // to the generic OutingStation preview defaults. Fixed by
      // logging the shareCode itself instead of a response object that
      // may not even exist in this branch (the "if (shareCode)" guard
      // above means outingQueryRes is never declared at all when
      // shareCode is empty).
      const shareCode = rawId.includes('-') ? rawId.split('-').pop() : rawId;
      let fields = null;
      if (shareCode) {
        const outingQueryRes = await fetch(
          `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              structuredQuery: {
                from: [{ collectionId: 'outings' }],
                where: { fieldFilter: { field: { fieldPath: 'shareCode' }, op: 'EQUAL', value: { stringValue: shareCode } } },
                limit: 1,
              },
            }),
          }
        );
        if (outingQueryRes.ok) {
          const queryData = await outingQueryRes.json();
          fields = queryData[0]?.document?.fields || null;
        } else {
          console.error(`Firestore query failed for outing shareCode ${shareCode}: ${outingQueryRes.status}`);
        }
      }
      if (fields) {
        const posterName = fields.posterName?.stringValue || 'Someone';
        const caption = fields.caption?.stringValue || '';
        title = `${posterName} on OutingStation`;
        description = caption ? caption.substring(0, 150) : 'Check out this Outing on OutingStation.';

        const postType = fields.postType?.stringValue || 'video';
        if (postType === 'video') {
          image = fields.thumbnailUrl?.stringValue || image;
        } else {
          const imagesArray = fields.imageUrls?.arrayValue?.values;
          if (imagesArray && imagesArray.length > 0) {
            image = imagesArray[0]?.stringValue || image;
          }
        }
      }
    } else {
      // Shortlet / Ride — shareCode-based lookup, unchanged from before.
      const shareCode = rawId.includes('-') ? rawId.split('-').pop() : rawId;
      if (collectionId && shareCode) {
        const queryResponse = await fetch(
          `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              structuredQuery: {
                from: [{ collectionId }],
                where: { fieldFilter: { field: { fieldPath: 'shareCode' }, op: 'EQUAL', value: { stringValue: shareCode } } },
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
      }
    }
  } catch (err) {
    console.error(`Error fetching ${type} (${rawId}) for OG preview:`, err);
    // Falls through to the generic OutingStation defaults set above.
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
  // FIXED — see the matching comment on the human branch above for
  // the full reasoning. Without this, this exact response (meant only
  // for crawlers) was the one silently served to every real visitor
  // too, for up to an hour after any bot request touched the same URL.
  res.setHeader('Vary', 'User-Agent');
  return res.status(200).send(html);
}