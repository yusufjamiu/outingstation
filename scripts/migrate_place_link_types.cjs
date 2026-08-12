/**
 * migrate_place_link_types.cjs
 *
 * ONE-TIME migration script — fixes existing `outings` documents that
 * are tagged to a place but still carry the old `linkType: 'event'`
 * (written before the tagging screen started giving places their own
 * `linkType: 'place'`). Without this, an Outing tagged to a place
 * before that fix keeps showing its category ("Family & Kids Fun")
 * instead of the place's real name on the "View ... Details" button —
 * even though tapping it still navigates correctly, since both linkTypes
 * fetch from the same `events` collection under the hood.
 *
 * This only touches the `linkType` field. Caption, media, likes,
 * comments, everything else on the outing is left completely untouched.
 *
 * ── SETUP ──────────────────────────────────────────────────────────────
 * 1. npm install firebase-admin
 * 2. Authenticate with your own Google account (no key file needed —
 *    same as migrate_user_cities.cjs; skip this if you've already done
 *    it once, the login persists):
 *      brew install --cask google-cloud-sdk
 *      gcloud auth application-default login
 *      gcloud config set project outingstation-app
 *
 * ── USAGE ──────────────────────────────────────────────────────────────
 *   node migrate_place_link_types.cjs
 *       → DRY RUN (default). Reports what it WOULD change. Writes nothing.
 *
 *   node migrate_place_link_types.cjs --apply
 *       → Actually writes the fix.
 *
 * Always run the plain dry run first and read the output before
 * passing --apply. This writes to your live outings collection.
 */

const admin = require('firebase-admin');

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: 'outingstation-app',
});

const db = admin.firestore();

const args = process.argv.slice(2);
const APPLY = args.includes('--apply');

async function run() {
  console.log(APPLY ? '🚀 LIVE RUN — changes will be written' : '🔍 DRY RUN — no changes will be written (pass --apply to write)');
  console.log('');

  const snapshot = await db.collection('outings').where('linkType', '==', 'event').get();
  console.log(`Found ${snapshot.size} outing(s) with linkType 'event'.\n`);

  // Cache event lookups — multiple outings often tag the same place/event,
  // no reason to re-fetch the same events doc repeatedly.
  const eventCache = new Map();

  const toFix = [];
  const alreadyCorrect = [];
  const brokenLinks = [];

  for (const doc of snapshot.docs) {
    const outing = doc.data();
    const linkedId = outing.linkedId;

    if (!linkedId) {
      brokenLinks.push({ id: doc.id, reason: 'no linkedId set' });
      continue;
    }

    let eventData = eventCache.get(linkedId);
    if (eventData === undefined) {
      const eventDoc = await db.collection('events').doc(linkedId).get();
      eventData = eventDoc.exists ? eventDoc.data() : null;
      eventCache.set(linkedId, eventData);
    }

    if (!eventData) {
      brokenLinks.push({ id: doc.id, reason: `linked event ${linkedId} not found` });
      continue;
    }

    if (eventData.subCategory === 'places') {
      toFix.push({
        id: doc.id,
        eventId: linkedId,
        eventTitle: eventData.title || '(untitled)',
        caption: (outing.caption || '').slice(0, 40),
      });
    } else {
      alreadyCorrect.push(doc.id);
    }
  }

  // ── Write phase ──────────────────────────────────────────────────────
  let totalWritten = 0;
  if (APPLY && toFix.length > 0) {
    let batch = db.batch();
    let batchCount = 0;
    for (const item of toFix) {
      batch.update(db.collection('outings').doc(item.id), { linkType: 'place' });
      batchCount++;
      totalWritten++;
      if (batchCount >= 450) {
        await batch.commit();
        batch = db.batch();
        batchCount = 0;
      }
    }
    if (batchCount > 0) await batch.commit();
  }

  // ── Summary ──────────────────────────────────────────────────────────
  console.log('── Summary ──────────────────────────────────────');
  console.log(`Genuine events (left alone):     ${alreadyCorrect.length}`);
  console.log(`Places needing the fix:          ${toFix.length}${APPLY ? ' — written' : ' — would write'}`);
  console.log(`Broken links (skipped):           ${brokenLinks.length}\n`);

  if (toFix.length > 0) {
    console.log('── Places to fix ──────────────────────────────────');
    toFix.forEach(item =>
      console.log(`  outing ${item.id}  →  place "${item.eventTitle}"  (caption: "${item.caption}...")`)
    );
    console.log('');
  }

  if (brokenLinks.length > 0) {
    console.log('── Broken links — needs manual review ─────────────');
    brokenLinks.forEach(item => console.log(`  outing ${item.id}: ${item.reason}`));
    console.log('');
  }

  if (APPLY) {
    console.log(`✅ Done. ${totalWritten} outing(s) updated.`);
  } else {
    console.log('ℹ️  This was a dry run — nothing was written. Re-run with --apply once you\'ve reviewed the list above.');
  }
}

run().catch(err => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
