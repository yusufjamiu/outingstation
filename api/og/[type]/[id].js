// api/og/[type]/[id].js
//
// ✅ CONSOLIDATED — replaces api/og/event/[id].js, which was genuinely
// dead code in production: vercel.json's /e/ rewrite points DIRECTLY at
// the external Cloud Run service (https://og-vawapehfla-uc.a.run.app),
// never at this file, so it was never actually reached by real traffic.
// Repurposed into one generalized handler covering Shortlet, Ride, AND
// Event (as a working fallback/alternative to Cloud Run) — same
// function slot, net-zero change to Vercel's 12-function Hobby limit.
//
// Closes a real gap: sharing a Shortlet or Ride from the app only ever
// sent plain text (e.g. "Check out coxzy coxzy on OutingStation —
// ₦45/night in Lagos.") with no link at all — nothing for WhatsApp to
// generate a preview card from. This serves real Open Graph meta tags
// (title, description, image) for a specific listing, then redirects a
// real visitor into the actual React app — same pattern already proven
// working for events via Cloud Run, just self-contained here instead.
//
// Route shape: /api/og/[type]/[id] where type is 'shortlet', 'ride', or
// 'event'. Paired with vercel.json rewrites so a shared link looks like
// outingstation.com/s/{id} or outingstation.com/r/{id} — short, clean,
// and only shows the redirect page to bots/crawlers scanning for a
// preview; matches og-proxy.js's own bot-detection pattern for
// consistency, though this file also works correctly if hit directly by
// a real visitor (redirects immediately either way).

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

export default async function handler(req, res) {
  const { type, id } = req.query;
  const collectionId = COLLECTION_BY_TYPE[type];
  const pathPrefix = PATH_PREFIX_BY_TYPE[type] || 's';

  let title = 'OutingStation - Everything Your City Has To Offer';
  let description = 'Discover events and places in Lagos, Abuja and more.';
  let image = 'https://www.outingstation.com/og-image.png';
  // ✅ FIXED — was pointing the redirect at itself (the short /s/{id}
  // link, which is THIS endpoint) instead of the real in-app page a
  // visitor should actually land on. shareUrl is the short link shown
  // in og:url and put in the shared text message; destinationUrl is
  // where a real (non-bot) visitor actually gets redirected — the new
  // dedicated route per listing, synced with the existing modal so
  // browsing still feels exactly the same, just with a real URL behind
  // it now.
  const shareUrl = `https://www.outingstation.com/${pathPrefix}/${id}`;
  const destinationPath = type === 'shortlet' ? `/shortlets/${id}` : type === 'ride' ? `/rent-a-ride/${id}` : `/e/${id}`;
  const destinationUrl = `https://www.outingstation.com${destinationPath}`;

  if (!collectionId) {
    // Unknown type — still redirect somewhere sane rather than error out.
    res.setHeader('Content-Type', 'text/html');
    return res.status(200).send(`<!DOCTYPE html><html><head><script>window.location.replace("https://www.outingstation.com");</script></head><body></body></html>`);
  }

  try {
    const projectId = process.env.VITE_FIREBASE_PROJECT_ID;
    const apiKey = process.env.VITE_FIREBASE_API_KEY;

    const response = await fetch(
      `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collectionId}/${id}?key=${apiKey}`
    );

    if (response.ok) {
      const data = await response.json();
      const fields = data.fields;

      if (fields) {
        if (type === 'event') {
          title = `${fields.title?.stringValue || 'Event'} - OutingStation`;
          description = fields.description?.stringValue?.substring(0, 150) || description;
          image = fields.imageUrl?.stringValue || image;
        } else {
          // Shortlet / Ride — same field shape for both: title, city,
          // images (array), pricePerNight or priceLabel-style pricing.
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
          // 'images', first entry used as the preview image. Matches
          // the field name used elsewhere in this build
          // (shortlet_detail_screen.dart / RideDetailSheet's own image
          // carousels) — adjust here if the actual stored field name
          // differs.
          const imagesArray = fields.images?.arrayValue?.values;
          if (imagesArray && imagesArray.length > 0) {
            image = imagesArray[0]?.stringValue || image;
          }
        }
      }
    }
  } catch (err) {
    console.error(`Error fetching ${type} ${id} for OG preview:`, err);
    // Falls through to the generic OutingStation defaults set above —
    // never worth blocking the redirect over a failed metadata fetch.
  }

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
  <meta http-equiv="refresh" content="0; url=${destinationUrl}" />
  <script>window.location.replace("${destinationUrl}");</script>
</head>
<body>
  <p>Redirecting...</p>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html');
  res.setHeader('Cache-Control', 's-maxage=3600');
  return res.status(200).send(html);
}