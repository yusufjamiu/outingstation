const { onRequest, onCall } = require("firebase-functions/v2/https");
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { onSchedule } = require("firebase-functions/v2/scheduler");
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

// ✅ NEW — runs daily at 9am Lagos time. Sends two reminder stages per
// event: 3 days before, and 24 hours before, to everyone who saved that
// event. Tracks which stages have already fired per event (via fields
// on the event doc) so each stage only fires once, even if this runs
// more than once on the same day for any reason.
exports.sendEventReminders = onSchedule(
  { schedule: "0 9 * * *", timeZone: "Africa/Lagos" },
  async () => {
    const now = new Date();

    const startOfDayOffset = (daysAhead) => {
      const d = new Date(now);
      d.setDate(d.getDate() + daysAhead);
      d.setHours(0, 0, 0, 0);
      return d;
    };
    const endOfDayOffset = (daysAhead) => {
      const d = startOfDayOffset(daysAhead);
      d.setHours(23, 59, 59, 999);
      return d;
    };

    const stages = [
      { daysAhead: 3, field: 'reminderSent3Day', title: 'Coming up in 3 days 📅', body: (t) => `${t} is happening in 3 days — plan your outing!` },
      { daysAhead: 1, field: 'reminderSent1Day', title: 'Happening Tomorrow! ⏰', body: (t) => `${t} is happening tomorrow. Don't miss it!` },
    ];

    const usersSnap = await db.collection('users').get();
    const users = usersSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    for (const stage of stages) {
      const startTs = admin.firestore.Timestamp.fromDate(startOfDayOffset(stage.daysAhead));
      const endTs = admin.firestore.Timestamp.fromDate(endOfDayOffset(stage.daysAhead));

      const eventsSnap = await db
        .collection('events')
        .where('date', '>=', startTs)
        .where('date', '<=', endTs)
        .get();

      for (const eventDoc of eventsSnap.docs) {
        const event = eventDoc.data();
        const eventId = eventDoc.id;

        // Skip if this stage's reminder was already sent for this event
        if (event[stage.field]) continue;

        const usersWhoSaved = users.filter(u =>
          Array.isArray(u.savedEvents) && u.savedEvents.includes(eventId)
        );

        if (usersWhoSaved.length) {
          const writes = usersWhoSaved.map(user =>
            db.collection('notifications').add({
              userId: user.id,
              title: stage.title,
              message: stage.body(event.title),
              type: 'event_reminder',
              eventId,
              read: false,
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
            })
          );
          await Promise.all(writes);
          console.log(`[${stage.field}] Sent to ${usersWhoSaved.length} users for "${event.title}"`);
        }

        // Mark this stage as sent, regardless of whether anyone had saved
        // it, so we don't keep re-checking this event/stage every day
        await eventDoc.ref.update({ [stage.field]: true });
      }
    }
  }
);