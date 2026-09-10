/**
 * migrate_event_locations.cjs
 *
 * ONE-TIME migration script — fixes existing `events` documents (in the
 * `events` collection) whose `location` field is free text (e.g. "Lagos,
 * Nigeria", "Ikeja, Lagos", "lagos") so it matches one of the app's fixed
 * dropdown values exactly ("Lagos"). Any leftover text that isn't the
 * city itself (e.g. "Ikeja", "Nigeria") is folded into `address` instead
 * of being thrown away, unless `address` is already set.
 *
 * Skips opportunity-type events (eventType === "opportunities") — those
 * use a separate, short OPPORTUNITY_CITIES list in the form and were not
 * changed by the dropdown migration.
 *
 * Mirrors migrate_user_cities.cjs's approach (same confidence tiers, same
 * CITY_TO_STATE lookup, same auth) since matching a clean city out of a
 * free-text venue address carries the same risk profile as the city
 * field on users.
 *
 * ── SETUP ──────────────────────────────────────────────────────────────
 * 1. npm install firebase-admin
 * 2. Authenticate with your own Google account (no key file needed):
 *      gcloud auth application-default login
 *      gcloud config set project outingstation-app
 *
 * ── USAGE ──────────────────────────────────────────────────────────────
 *   node migrate_event_locations.cjs
 *       → DRY RUN (default). Reports what it WOULD change. Writes nothing.
 *
 *   node migrate_event_locations.cjs --apply
 *       → Writes the safe (exact case/whitespace) fixes.
 *
 *   node migrate_event_locations.cjs --apply --include-fuzzy
 *       → Also writes lower-confidence matches: state-name substrings
 *         (e.g. "Lagos State" → "Lagos") and known-city lookups
 *         (e.g. "Ilorin" → "Kwara", "Abuja" → "FCT (Abuja)"). Review the
 *         dry-run output for these first — they're best-effort guesses.
 *
 * Always run the plain dry run first and actually read the output before
 * passing --apply. This writes to your live events collection.
 */

const admin = require('firebase-admin');

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: 'outingstation-app',
});

const db = admin.firestore();

// Same list used in AdminEventForm.jsx / AdminPlaceForm.jsx. Keep this in
// sync if that list ever changes. ("Others" isn't a dropdown option in
// the event form, so it's left out here unlike migrate_user_cities.cjs.)
const VALID_CITIES = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue',
  'Borno', 'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu',
  'FCT (Abuja)', 'Gombe', 'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina',
  'Kebbi', 'Kogi', 'Kwara', 'Lagos', 'Nasarawa', 'Niger', 'Ogun', 'Ondo',
  'Osun', 'Oyo', 'Plateau', 'Rivers', 'Sokoto', 'Taraba', 'Yobe', 'Zamfara',
];

// Same table as migrate_user_cities.cjs. Add more entries here as you see
// them show up in the "unmatched" list on future runs.
const CITY_TO_STATE = {
  'ilorin': 'Kwara',
  'abuja': 'FCT (Abuja)',
  'ibadan': 'Oyo',
  'jos': 'Plateau',
  'abeokuta': 'Ogun',
  'ikorodu': 'Lagos',
  'iwo': 'Osun',
  'agege': 'Lagos',
  'ikeja': 'Lagos',
  'lekki': 'Lagos',
  'surulere': 'Lagos',
  'yaba': 'Lagos',
  'kano city': 'Kano',
  'enugu city': 'Enugu',
  'benin city': 'Edo',
  'benin': 'Edo',
  'port harcourt': 'Rivers',
  'calabar': 'Cross River',
  'uyo': 'Akwa Ibom',
  'owerri': 'Imo',
  'awka': 'Anambra',
  'akure': 'Ondo',
  'osogbo': 'Osun',
  'ado ekiti': 'Ekiti',
  'minna': 'Niger',
  'lokoja': 'Kogi',
  'makurdi': 'Benue',
  'gombe city': 'Gombe',
  'bauchi city': 'Bauchi',
  'sokoto city': 'Sokoto',
  'katsina city': 'Katsina',
  'kaduna city': 'Kaduna',
  'maiduguri': 'Borno',
  'yenagoa': 'Bayelsa',
  'asaba': 'Delta',
  'warri': 'Delta',
};

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function wordBoundaryRegex(term) {
  return new RegExp(`\\b${escapeRegex(term)}\\b`, 'i');
}

const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const INCLUDE_FUZZY = args.includes('--include-fuzzy');

// Given the raw location string and the matched city, pulls out whatever
// text in `raw` isn't the city itself (e.g. "Ikeja, Lagos" with match
// "Lagos" → leftover "Ikeja"), so it can be preserved in `address`
// instead of silently dropped.
function extractLeftover(raw, matchedCity) {
  const cityLower = matchedCity.toLowerCase().replace(' (abuja)', '');
  return raw
    .split(',')
    .map(s => s.trim())
    .filter(s => s && s.toLowerCase() !== cityLower)
    .join(', ');
}

/**
 * Tries to map a raw location string onto one of VALID_CITIES.
 * Returns { match, confidence, leftover }. confidence is:
 *   'exact' — already correct, nothing to do
 *   'safe'  — case/whitespace difference only (e.g. "lagos " -> "Lagos")
 *   'fuzzy' — either (a) a known city/town found via CITY_TO_STATE lookup
 *             (e.g. "Ilorin" -> "Kwara"), or (b) a valid state name found
 *             as a whole word inside the raw string (e.g. "Lagos State"
 *             -> "Lagos"). Both are best-effort, reviewed before writing.
 *   'none'  — no reasonable match found at all
 */
function classifyLocation(raw) {
  if (!raw || typeof raw !== 'string') return { match: null, confidence: 'none', leftover: '' };
  const trimmed = raw.trim();
  if (trimmed === '' || trimmed.toLowerCase() === 'null') return { match: null, confidence: 'none', leftover: '' };

  if (VALID_CITIES.includes(trimmed)) {
    return { match: trimmed, confidence: 'exact', leftover: '' };
  }

  const lower = trimmed.toLowerCase();
  const caseMatch = VALID_CITIES.find(c => c.toLowerCase() === lower);
  if (caseMatch) {
    return { match: caseMatch, confidence: 'safe', leftover: '' };
  }

  const cityKeys = Object.keys(CITY_TO_STATE).sort((a, b) => b.length - a.length);
  for (const cityKey of cityKeys) {
    if (wordBoundaryRegex(cityKey).test(lower)) {
      const match = CITY_TO_STATE[cityKey];
      return { match, confidence: 'fuzzy', leftover: extractLeftover(trimmed, match) };
    }
  }

  const sortedByLength = [...VALID_CITIES].sort((a, b) => b.length - a.length);
  const containsMatch = sortedByLength.find(c => wordBoundaryRegex(c).test(trimmed));
  if (containsMatch) {
    return { match: containsMatch, confidence: 'fuzzy', leftover: extractLeftover(trimmed, containsMatch) };
  }

  return { match: null, confidence: 'none', leftover: '' };
}

async function run() {
  console.log(APPLY ? '🚀 LIVE RUN — changes will be written' : '🔍 DRY RUN — no changes will be written (pass --apply to write)');
  console.log(INCLUDE_FUZZY ? '   (including fuzzy/substring/city matches)\n' : '   (safe matches only — pass --include-fuzzy to also apply guesses)\n');

  const snapshot = await db.collection('events').get();
  console.log(`Found ${snapshot.size} event documents.\n`);

  const results = { exact: 0, safe: [], fuzzy: [], none: [], skippedOpportunity: 0 };
  let batch = db.batch();
  let batchCount = 0;
  let totalWritten = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data();

    if (data.eventType === 'opportunities') {
      results.skippedOpportunity++;
      continue;
    }

    const raw = data.location;
    const { match, confidence, leftover } = classifyLocation(raw);

    if (confidence === 'exact') {
      results.exact++;
      continue;
    }

    if (confidence === 'none') {
      results.none.push({ id: doc.id, title: data.title, raw });
      continue;
    }

    const existingAddress = (data.address || '').trim();
    const newAddress = existingAddress || leftover;

    const entry = { id: doc.id, title: data.title, raw, match, confidence, existingAddress, newAddress };
    if (confidence === 'safe') results.safe.push(entry);
    if (confidence === 'fuzzy') results.fuzzy.push(entry);

    const shouldWrite = APPLY && (confidence === 'safe' || (confidence === 'fuzzy' && INCLUDE_FUZZY));
    if (shouldWrite) {
      batch.update(doc.ref, { location: match, address: newAddress });
      batchCount++;
      totalWritten++;
      if (batchCount >= 450) {
        await batch.commit();
        batch = db.batch();
        batchCount = 0;
      }
    }
  }

  if (batchCount > 0) await batch.commit();

  console.log('── Summary ──────────────────────────────────────');
  console.log(`Skipped (opportunity):   ${results.skippedOpportunity}`);
  console.log(`Already correct:         ${results.exact}`);
  console.log(`Safe fixes (case/space): ${results.safe.length}${APPLY ? ' — written' : ' — would write'}`);
  console.log(`Fuzzy guesses:           ${results.fuzzy.length}${APPLY && INCLUDE_FUZZY ? ' — written' : ' — NOT written (needs --include-fuzzy)'}`);
  console.log(`No match at all:         ${results.none.length} — left untouched, needs manual review\n`);

  if (results.safe.length > 0) {
    console.log('── Safe fixes ────────────────────────────────────');
    results.safe.forEach(r => console.log(`  ${r.id} "${r.title || '(no title)'}": location "${r.raw}" → "${r.match}"   address "${r.existingAddress}" → "${r.newAddress}"`));
    console.log('');
  }

  if (results.fuzzy.length > 0) {
    console.log('── Fuzzy guesses (review these) ──────────────────');
    results.fuzzy.forEach(r => console.log(`  ${r.id} "${r.title || '(no title)'}": location "${r.raw}" → "${r.match}"   address "${r.existingAddress}" → "${r.newAddress}"`));
    console.log('');
  }

  if (results.none.length > 0) {
    console.log('── Unmatched — left alone, check manually ────────');
    results.none.forEach(r => console.log(`  ${r.id} "${r.title || '(no title)'}": "${r.raw}"`));
    console.log('');
  }

  if (APPLY) {
    console.log(`✅ Done. ${totalWritten} document(s) updated.`);
  } else {
    console.log('ℹ️  This was a dry run — nothing was written. Re-run with --apply once you\'ve reviewed the list above.');
  }
}

run().catch(err => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
