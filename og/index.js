const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();

async function getEvent(slugOrId) {
  const slugQuery = await db.collection("events")
    .where("slug", "==", slugOrId)
    .limit(1)
    .get();

  if (!slugQuery.empty) {
    return slugQuery.docs[0].data();
  }

  const byId = await db.collection("events").doc(slugOrId).get();
  if (byId.exists) {
    return byId.data();
  }

  return null;
}

exports.og = functions.https.onRequest(async (req, res) => {
  try {
    const slugOrId = req.path.replace(/^\//, "").split("?")[0];

    if (!slugOrId) {
      return res.redirect("https://www.outingstation.com");
    }

    const event = await getEvent(slugOrId);

    const defaultHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta property="og:title" content="OutingStation - Everything Your City Has To Offer" />
  <meta property="og:description" content="Discover events and places in Lagos, Abuja, Ibadan and more." />
  <meta property="og:image" content="https://www.outingstation.com/og-image.png" />
  <meta property="og:url" content="https://www.outingstation.com" />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="OutingStation" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="OutingStation - Everything Your City Has To Offer" />
  <meta name="twitter:description" content="Discover events and places in Lagos, Abuja, Ibadan and more." />
  <meta name="twitter:image" content="https://www.outingstation.com/og-image.png" />
  <script>window.location.href = "https://www.outingstation.com";</script>
</head>
<body>Redirecting...</body>
</html>`;

    if (!event) {
      res.setHeader('Content-Type', 'text/html');
      return res.status(200).send(defaultHtml);
    }

    const title = event.title || "OutingStation Event";
    const description = event.description
      ? event.description.substring(0, 200)
      : "Discover amazing events on OutingStation";
    const image = event.imageUrl || "https://www.outingstation.com/og-image.png";
    const eventId = event.id || slugOrId;
    const slug = event.slug || slugOrId;
    const price = event.isFree ? "Free" : `₦${event.price}`;
    const location = event.location || "Lagos, Nigeria";
    const fullDescription = `${description} | 📍 ${location} | 💰 ${price}`;

    // ✅ Redirect to /event/:id not /e/:slug to avoid loop
    const redirectUrl = `https://www.outingstation.com/event/${eventId}`;

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>${title} - OutingStation</title>
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${fullDescription}" />
  <meta property="og:image" content="${image}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:url" content="https://www.outingstation.com/e/${slug}" />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="OutingStation" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${title}" />
  <meta name="twitter:description" content="${fullDescription}" />
  <meta name="twitter:image" content="${image}" />
  <script>
    var isBot = /bot|crawler|spider|facebookexternalhit|Twitterbot|WhatsApp|TelegramBot|LinkedInBot|Slackbot/i.test(navigator.userAgent);
    if (!isBot) {
      window.location.href = "${redirectUrl}";
    }
  </script>
</head>
<body>
  <h1>${title}</h1>
  <p>${fullDescription}</p>
  <p><a href="${redirectUrl}">View on OutingStation</a></p>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Cache-Control', 's-maxage=3600');
    return res.status(200).send(html);

  } catch (error) {
    console.error("OG function error:", error);
    return res.redirect("https://www.outingstation.com");
  }
});