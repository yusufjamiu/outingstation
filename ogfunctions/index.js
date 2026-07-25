const { onRequest, onCall } = require("firebase-functions/v2/https");
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
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

// ✅ NEW — scheduled function, applies pending business name changes 30
// days after they were requested. See applyPendingBusinessNames.js for
// the actual logic; this just registers it as a deployed function,
// alongside "og" above, which is untouched.
exports.applyPendingBusinessNames = require('./applyPendingBusinessNames').applyPendingBusinessNames;

// ✅ Fires a push notification (FCM) every time a notification doc is
// created in the "notifications" collection. Uses the launcher icon —
// stable on both Android and iOS, confirmed working end-to-end.
exports.sendPushOnNotification = onDocumentCreated('notifications/{notifId}', async (event) => {
  const data = event.data.data();
  console.log('sendPushOnNotification triggered, data:', JSON.stringify(data));

  if (!data.userId) {
    console.log('No userId on notification doc — skipping');
    return;
  }

  const userSnap = await db.collection('users').doc(data.userId).get();
  const tokens = userSnap.data()?.fcmTokens || [];
  console.log('Found tokens:', tokens.length, tokens);

  if (!tokens.length) {
    console.log('No fcmTokens for user — skipping');
    return;
  }

  const response = await admin.messaging().sendEachForMulticast({
    tokens,
    notification: {
      title: data.title || 'OutingStation',
      body: data.message || '',
    },
    android: {
      notification: {
        icon: 'ic_launcher',
        color: '#5ADAEE',
      },
    },
    data: {
      eventId: data.eventId || '',
      link: data.link || '',
      type: data.type || 'general',
    },
  });

  console.log('FCM send result — success:', response.successCount, 'failure:', response.failureCount);

  const deadTokenErrorCodes = [
    'messaging/registration-token-not-registered',
    'messaging/invalid-registration-token',
  ];

  const deadTokens = [];
  response.responses.forEach((r, i) => {
    if (!r.success) {
      console.log(`Token ${i} failed:`, r.error?.code, r.error?.message);
      if (deadTokenErrorCodes.includes(r.error?.code)) {
        deadTokens.push(tokens[i]);
      }
    }
  });

  if (deadTokens.length) {
    await userSnap.ref.update({
      fcmTokens: admin.firestore.FieldValue.arrayRemove(...deadTokens),
    });
  }
});

// ✅ NEW — callable from the web admin. Broadcasts a "new event published"
// push to every device subscribed to the "Outingstation" topic. Triggered
// from EventSubmissionsPage.jsx right after an event is approved/published.
exports.notifyNewEventPublished = onCall(async (request) => {
  const { title, eventId } = request.data;
  if (!title) {
    throw new Error('title is required');
  }

  await admin.messaging().send({
    topic: 'Outingstation',
    notification: {
      title: 'New on OutingStation 🎉',
      body: title,
    },
    android: {
      notification: {
        icon: 'ic_launcher',
        color: '#5ADAEE',
      },
    },
    data: {
      eventId: eventId || '',
      type: 'new_event',
    },
  });

  return { success: true };
});