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
  const { type } = req.query;
  const collectionId = COLLECTION_BY_TYPE[type];
  const pathPrefix = PATH_PREFIX_BY_TYPE[type] || 's';

  let title = 'OutingStation - Everything Your City Has To Offer';
  let description = 'Discover events and places in Lagos, Abuja and more.';
  let image = 'https://www.outingstation.com/og-image.png';

  // ✅ CHANGED — was extracting a raw 20-character Firestore ID from
  // the end of the incoming string. Now looks up by a genuine short
  // code instead (e.g. "coxzy-coxzy-3f8k2p" → code "3f8k2p"), matching
  // Events' own pattern — a real stored field, found via query, not a
  // shortened re-encoding of the ID (which isn't mathematically
  // possible without losing the ability to reverse it). The code is
  // always the LAST hyphen-separated segment — the slug portion in
  // front of it may contain any number of hyphens, the code itself
  // never does (see shortlet_detail_screen.dart / RideDetailSheet's
  // _generateShareCode — lowercase alphanumeric only).
  const rawId = req.query.id || '';
  const shareCode = rawId.includes('-') ? rawId.split('-').pop() : rawId;

  const shareUrl = `https://www.outingstation.com/${pathPrefix}/${rawId}`;
  let destinationPath = `/e/${rawId}`;
  let destinationUrl = `https://www.outingstation.com${destinationPath}`;

  if (!collectionId || !shareCode) {
    res.setHeader('Content-Type', 'text/html');
    return res.status(200).send(`<!DOCTYPE html><html><head><script>window.location.replace("https://www.outingstation.com");</script></head><body></body></html>`);
  }

  try {
    const projectId = process.env.VITE_FIREBASE_PROJECT_ID;
    const apiKey = process.env.VITE_FIREBASE_API_KEY;

    // ✅ Query by shareCode — same runQuery REST pattern already proven
    // for Events' own bySlug lookup.
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
        destinationPath = type === 'shortlet' ? `/shortlets/${rawId}` : `/rent-a-ride/${rawId}`;
        destinationUrl = `https://www.outingstation.com${destinationPath}`;

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
      } else {
        // No listing found for this code — land on the grid rather
        // than a broken preview; reasonable fallback for a stale/
        // invalid share link.
        destinationPath = type === 'shortlet' ? '/shortlets' : '/rent-a-ride';
        destinationUrl = `https://www.outingstation.com${destinationPath}`;
      }
    } else {
      console.error(`Firestore query failed for ${type} shareCode ${shareCode}: ${queryResponse.status}`);
    }
  } catch (err) {
    console.error(`Error fetching ${type} (shareCode ${shareCode}) for OG preview:`, err);
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
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    body { font-family: -apple-system, sans-serif; margin: 0; padding: 24px; text-align: center; background: #FAFAFA; }
    img { width: 72px; height: 72px; border-radius: 18px; margin-top: 40px; }
    h1 { font-size: 18px; color: #0F172A; margin: 16px 0 4px; }
    p { font-size: 13px; color: #64748B; margin: 0 0 24px; }
    .btn { display: block; width: 100%; max-width: 320px; margin: 0 auto 12px; padding: 14px; border-radius: 14px; font-weight: 700; font-size: 14px; text-decoration: none; box-sizing: border-box; }
    .primary { background: #5ADAEE; color: #0F172A; }
    .secondary { background: white; color: #0F172A; border: 1px solid #E2E8F0; }
  </style>
</head>
<body>
  <img src="https://www.outingstation.com/og-image.png" alt="OutingStation" />
  <h1>${title}</h1>
  <p>${description}</p>
  <a class="btn primary" id="open-app-btn" href="#">Open in App</a>
  <a class="btn secondary" href="${destinationUrl}">Continue on Web</a>

  <script>
    // ✅ NEW — the "Open in App" mechanism. Deliberately NOT an
    // automatic silent redirect attempt — mobile browsers have gotten
    // strict about blocking exactly that pattern (ad networks abused it
    // for years), and a visible button the person actually taps is far
    // more reliable to test and reason about. Custom scheme
    // ("outingstation://...") works regardless of install method —
    // unlike Universal Links, it doesn't depend on Apple/Google's own
    // domain-verification handshake completing correctly.
    //
    // Desktop visitors never see this attempt at all — there's no app
    // or store to send them to — they land straight on the web
    // destination via the same auto-redirect this page always did.
    const ua = navigator.userAgent || '';
    const isIOS = /iPhone|iPad|iPod/i.test(ua);
    const isAndroid = /Android/i.test(ua);
    const isMobile = isIOS || isAndroid;

    // ✅ FIXED — was "outingstation://${pathPrefix}/${rawId}". Confirmed
    // via direct testing that a custom scheme parses the segment right
    // after "//" as the URI's HOST, not a path segment — so
    // "outingstation://s/abc" arrives with host "s" and path "/abc",
    // never a path segment array containing "s" at all. Using a query
    // parameter instead sidesteps that ambiguity entirely — parses
    // identically regardless of scheme.
    const appLink = "outingstation://open?type=${type}&id=" + encodeURIComponent("${rawId}");
    const iosStoreLink = "https://apps.apple.com/ng/app/outingstation/id6774141538";
    const androidStoreLink = "https://play.google.com/store/apps/details?id=com.outingstation";
    const webLink = "${destinationUrl}";

    if (!isMobile) {
      // Desktop — no app to open, go straight to web, same as before.
      window.location.replace(webLink);
    } else {
      document.getElementById('open-app-btn').addEventListener('click', function (e) {
        e.preventDefault();
        const fallbackTimer = setTimeout(function () {
          // If we're still here after this delay, the app never caught
          // the custom scheme — most likely it isn't installed. Send
          // them to download it rather than silently failing.
          window.location.href = isIOS ? iosStoreLink : androidStoreLink;
        }, 1500);

        // If the app DOES open, the tab is backgrounded — cancel the
        // store-redirect timer so it doesn't fire when they come back.
        document.addEventListener('visibilitychange', function onHide() {
          if (document.hidden) {
            clearTimeout(fallbackTimer);
            document.removeEventListener('visibilitychange', onHide);
          }
        });

        window.location.href = appLink;
      });
    }
  </script>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html');
  res.setHeader('Cache-Control', 's-maxage=3600');
  return res.status(200).send(html);
}