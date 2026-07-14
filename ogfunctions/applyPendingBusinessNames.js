// ogfunctions/applyPendingBusinessNames.js
//
// ✅ Scheduled Cloud Function — runs once daily, finds any business with a
// pending name change requested 30+ days ago, and applies it.
//
// ✅ FIXED — matches your existing og function's style exactly: classic
// admin SDK (require("firebase-admin")), no separate initializeApp() call
// here since index.js already calls it once when the app loads. Calling
// it a second time would throw a duplicate-app error.

const { onSchedule } = require("firebase-functions/v2/scheduler");
const admin = require("firebase-admin");

const db = admin.firestore();

exports.applyPendingBusinessNames = onSchedule(
  {
    schedule: "every 24 hours",
    region: "us-central1",
  },
  async (event) => {
    const thirtyDaysAgo = admin.firestore.Timestamp.fromMillis(
      Date.now() - 30 * 24 * 60 * 60 * 1000
    );

    const snapshot = await db
      .collection("businesses")
      .where("pendingBusinessName", "!=", null)
      .get();

    let applied = 0;

    for (const doc of snapshot.docs) {
      const data = doc.data();
      const requestedAt = data.pendingBusinessNameRequestedAt;

      if (!requestedAt) continue; // safety — skip malformed records
      if (requestedAt.toMillis() > thirtyDaysAgo.toMillis()) continue; // not due yet

      await doc.ref.update({
        businessName: data.pendingBusinessName,
        pendingBusinessName: null,
        pendingBusinessNameRequestedAt: null,
      });
      applied++;
    }

    console.log(`applyPendingBusinessNames: applied ${applied} name change(s)`);
  }
);