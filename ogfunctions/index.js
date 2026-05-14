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
      // Extract slug safely
      const slug = req.path.split("/").filter(Boolean).pop();

      console.log("PATH:", req.path);
      console.log("SLUG:", slug);

      // Query Firestore
      const snapshot = await db
        .collection("events")
        .where("slug", "==", slug)
        .limit(1)
        .get();

      console.log("DOCS FOUND:", snapshot.size);

      // Redirect home if no event found
      if (snapshot.empty) {
        return res.redirect("https://www.outingstation.com");
      }

      const event = snapshot.docs[0].data();

      const title = event.title || "OutingStation";

      const description =
        event.description ||
        "Discover events and places on OutingStation";

      const image =
        event.imageUrl ||
        "https://www.outingstation.com/og-image.png";

      const url = `https://www.outingstation.com/e/${slug}`;

      // Send OG HTML
      res.set("Content-Type", "text/html");

      return res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />

<title>${title}</title>

<meta property="og:title" content="${title}" />
<meta property="og:description" content="${description}" />
<meta property="og:image" content="${image}" />
<meta property="og:url" content="${url}" />
<meta property="og:type" content="website" />

<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${title}" />
<meta name="twitter:description" content="${description}" />
<meta name="twitter:image" content="${image}" />

<meta http-equiv="refresh" content="0; url=${url}" />
</head>

<body>
Redirecting...
</body>
</html>
      `);
    } catch (err) {
      console.error("OG function error:", err);
      return res.redirect("https://www.outingstation.com");
    }
  }
);