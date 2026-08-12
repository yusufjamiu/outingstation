import { initializeApp, getApps } from 'firebase/app';
import {
  getFirestore, collection, query, where, getDocs,
  doc, getDoc, updateDoc, setDoc, serverTimestamp
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);

// ✅ CHANGED — plan change: this is now pure referral tracking, not a
// payout engine. No tiers, no ₦ amounts, no payment status. Ambassadors
// are paid manually/upfront outside the app; this just records how many
// referrals happened per 30-day cycle so admin and the ambassador can
// both see the history.
const CYCLE_DAYS = 30;

function daysSince(timestamp) {
  if (!timestamp) return null;
  const startMs = timestamp.toDate ? timestamp.toDate().getTime() : new Date(timestamp).getTime();
  return Math.floor((Date.now() - startMs) / (1000 * 60 * 60 * 24));
}

export default async function handler(req, res) {
  // ── Auth guard ─────────────────────────────────────────────────────────
  // Vercel Cron calls this with `Authorization: Bearer ${CRON_SECRET}`
  // (set CRON_SECRET in your Vercel project's environment variables —
  // same value referenced in vercel.json's cron config). This stops
  // anyone else from hitting the endpoint and force-rolling everyone's
  // cycle early.
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // NOTE: this two-field equality query (isAmbassador + earningActivated)
    // may prompt Firestore to ask for a composite index the first time it
    // runs — if the cron logs a "requires an index" error, the error
    // message includes a direct link to create it with one click.
    //
    // NOTE — field name kept as "earningActivated" even though this is now
    // tracking, not earning, to avoid a Firestore field rename touching
    // this cron, the admin toggle, and the security rules all at once.
    // Only ambassadors with tracking explicitly activated by an admin
    // participate in the cycle rollover (see AdminAmbassadorApplications.jsx's
    // "Activate Tracking" toggle). Approved-but-not-activated ambassadors
    // still accrue totalReferrals/cycleReferrals but have no active cycle
    // to roll over.
    const ambassadorsSnap = await getDocs(
      query(
        collection(db, 'users'),
        where('isAmbassador', '==', true),
        where('earningActivated', '==', true)
      )
    );

    let rolledOver = 0;
    let skipped = 0;
    const results = [];

    for (const userDoc of ambassadorsSnap.docs) {
      const uid = userDoc.id;
      const userData = userDoc.data();
      const elapsed = daysSince(userData.cycleStartAt);

      // No cycleStartAt yet (shouldn't happen after the AuthContext
      // backfill, but guard anyway) or cycle still running — leave alone.
      if (elapsed === null || elapsed < CYCLE_DAYS) {
        skipped++;
        continue;
      }

      const cycleReferrals = userData.cycleReferrals || 0;

      const earningsRef = doc(db, 'ambassadorEarnings', uid);
      const earningsSnap = await getDoc(earningsRef);
      const earningsData = earningsSnap.exists() ? earningsSnap.data() : {};
      const cycleHistory = earningsData.cycleHistory || [];

      // ✅ CHANGED — archived entry is now just a referral-count record,
      // no amount/status. Past cycleHistory entries from before this
      // change may still have amount/status fields on them; the UI
      // simply ignores those now rather than needing a data migration.
      const archivedCycle = {
        cycleStart: userData.cycleStartAt,
        cycleEnd: serverTimestamp(),
        referrals: cycleReferrals,
      };

      await setDoc(earningsRef, {
        ...earningsData,
        cycleHistory: [...cycleHistory, archivedCycle],
        updatedAt: serverTimestamp(),
      }, { merge: true });

      await updateDoc(doc(db, 'users', uid), {
        cycleStartAt: serverTimestamp(),
        cycleReferrals: 0,
      });

      rolledOver++;
      results.push({ uid, cycleReferrals });
      console.log(`✅ Rolled over cycle for ${uid}: ${cycleReferrals} referrals`);
    }

    console.log(`✅ Rollover complete — ${rolledOver} rolled over, ${skipped} still in-cycle`);

    return res.status(200).json({
      success: true,
      rolledOver,
      skipped,
      results,
    });
  } catch (error) {
    console.error('❌ Rollover cron error:', error);
    return res.status(500).json({ error: 'Rollover failed', message: error.message });
  }
}