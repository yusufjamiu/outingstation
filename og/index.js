const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();

// ✅ Helper to get event by slug or ID
async function getEvent(slugOrId) {
  // Try by slug first
  const slugQuery = await db.collection("events")
    .where("slug", "==", slugOrId)
    .limit(1)
    .get();

  if (!slugQuery.empty) {
    return slugQuery.docs[0].data();
  }

  // Try by ID
  const byId = await db.collection("events").doc(slugOrId).get();
  if (byId.exists) {
    return byId.data();
  }

  return null;
}

// ✅ OG preview function
exports.og = functions.https.onRequest(async (req, res) => {
  try {
    const slugOrId = req.path.replace("/", "").split("?")[0];

    if (!slugOrId) {
      return res.redirect("https://www.outingstation.com");
    }

    const event = await getEvent(slugOrId);

    if (!event) {
      // ✅ Event not found — redirect to home with default OG
      return res.send(`<!DOCTYPE html>
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
</html>`);
    }

    const title = event.title || "OutingStation Event";
    const description = event.description
      ? event.description.substring(0, 200)
      : "Discover amazing events on OutingStation";
    const image = event.imageUrl || "https://www.outingstation.com/og-image.png";
    const slug = event.slug || event.id;
    const url = `https://www.outingstation.com/e/${slug}`;
    const price = event.isFree ? "Free" : `₦${event.price}`;
    const location = event.location || "Lagos, Nigeria";

    const fullDescription = `${description} | 📍 ${location} | 💰 ${price}`;

    // ✅ Return OG HTML — bots get this, users get redirected
    return res.send(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>${title} - OutingStation</title>

  <!-- OG Tags -->
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${fullDescription}" />
  <meta property="og:image" content="${image}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:url" content="${url}" />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="OutingStation" />

  <!-- Twitter Tags -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${title}" />
  <meta name="twitter:description" content="${fullDescription}" />
  <meta name="twitter:image" content="${image}" />

  <!-- ✅ Redirect real users to the React app -->
  <script>
    var isBot = /bot|crawler|spider|crawling|facebookexternalhit|Twitterbot|WhatsApp|TelegramBot|LinkedInBot|Slackbot/i.test(navigator.userAgent);
    if (!isBot) {
      window.location.href = "${url}";
    }
  </script>
</head>
<body>
  <h1>${title}</h1>
  <p>${fullDescription}</p>
  <p><a href="${url}">View on OutingStation</a></p>
</body>
</html>`);

  } catch (error) {
    console.error("OG function error:", error);
    return res.redirect("https://www.outingstation.com");
  }
});