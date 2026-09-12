// api/og.js
//
// ✅ FIXED — was api/og/[type]/[id].js, a DOUBLE-nested dynamic route
// (a [type] folder containing a [id].js file). Confirmed via direct
// testing that even hitting this exact path (bypassing every rewrite
// entirely) fell through to the React app instead of ever reaching the
// function — React Router's own "No routes matched" warning fired,
// meaning Vercel served index.html for this path, not the function.
// The file itself was verified present and correct in Vercel's source
// viewer, ruling out a deploy/caching issue — this points at Vercel's
// build step not reliably registering a doubly-nested dynamic folder
// structure as an actual invokable function. Rebuilt as ONE flat file
// with no dynamic folders at all — type and id now arrive as query
// parameters instead of path segments, entirely sidestepping whatever
// limitation caused the original structure to silently fail.
//
// Same job as before: serves real Open Graph meta tags (title,
// description, image) for a specific Shortlet or Ride listing, then
// redirects a real visitor into the actual React app. vercel.json's
// rewrites now map /s/{id} → /api/og?type=shortlet&id={id} and
// /r/{id} → /api/og?type=ride&id={id}.

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
  // shareUrl is the short link shown in og:url and put in the shared
  // text message; destinationUrl is where a real (non-bot) visitor
  // actually gets redirected — the dedicated route per listing, synced
  // with the existing modal.
  const shareUrl = `https://www.outingstation.com/${pathPrefix}/${id}`;
  const destinationPath = type === 'shortlet' ? `/shortlets/${id}` : type === 'ride' ? `/rent-a-ride/${id}` : `/e/${id}`;
  const destinationUrl = `https://www.outingstation.com${destinationPath}`;

  if (!collectionId || !id) {
    // Unknown type or missing id — still redirect somewhere sane rather
    // than error out.
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
          // 'images', first entry used as the preview image. Adjust
          // here if the actual stored field name differs.
          const imagesArray = fields.images?.arrayValue?.values;
          if (imagesArray && imagesArray.length > 0) {
            image = imagesArray[0]?.stringValue || image;
          }
        }
      }
    } else {
      console.error(`Firestore fetch failed for ${type}/${id}: ${response.status}`);
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