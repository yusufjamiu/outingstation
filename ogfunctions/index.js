const { onRequest } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();

exports.og = onRequest(
  {
    region: "us-central1",
    invoker: "public",
  },
  async (req, res) => {
    try {
      const slug = req.path.split("/").filter(Boolean).pop();

      console.log("PATH:", req.path);
      console.log("SLUG:", slug);

      const userAgent = req.headers['user-agent'] || '';
      const isBot = /facebookexternalhit|twitterbot|linkedinbot|whatsapp|googlebot|slackbot|telegrambot|discordbot|bingbot|applebot|pinterest/i.test(userAgent);

      const snapshot = await db
        .collection("events")
        .where("slug", "==", slug)
        .limit(1)
        .get();

      if (snapshot.empty) {
        return res.redirect(302, "https://www.outingstation.com/events");
      }

      const event = snapshot.docs[0].data();
      const eventId = snapshot.docs[0].id;

      // ✅ Real browser — redirect to /event/:id
      if (!isBot) {
        return res.redirect(302, `https://www.outingstation.com/event/${eventId}`);
      }

      // ✅ Bot — serve OG tags only, NO refresh redirect
      const title = event.title || "OutingStation";
      const description = event.description?.substring(0, 155) || "Discover events on OutingStation";
      const image = event.imageUrl || "https://www.outingstation.com/og-image.png";
      const url = `https://www.outingstation.com/e/${slug}`;

      res.set("Content-Type", "text/html");
      res.set("Cache-Control", "public, max-age=3600");

      return res.send(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${title} - OutingStation</title>
<meta name="description" content="${description}" />
<meta property="og:title" content="${title}" />
<meta property="og:description" content="${description}" />
<meta property="og:image" content="${image}" />
<meta property="og:url" content="${url}" />
<meta property="og:type" content="website" />
<meta property="og:site_name" content="OutingStation" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${title}" />
<meta name="twitter:description" content="${description}" />
<meta name="twitter:image" content="${image}" />
</head>
<body>
<a href="https://www.outingstation.com/event/${eventId}">${title}</a>
</body>
</html>`);

    } catch (err) {
      console.error("OG function error:", err);
      return res.redirect(302, "https://www.outingstation.com");
    }
  }
);