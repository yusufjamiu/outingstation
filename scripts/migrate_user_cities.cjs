/**
 * migrate_user_cities.cjs
 *
 * ONE-TIME migration script — fixes existing `users` documents whose
 * `city` field is free text (e.g. "lagos", "Lagos State", "Ikeja, Lagos ")
 * so it matches one of the app's fixed dropdown values exactly
 * ("Lagos"). This is what makes "Nearby" actually work for accounts
 * created before the dropdown fix went in.
 *
 * This does NOT touch `events` — matching a clean city out of a free-text
 * venue address is much less reliable, and a wrong guess there is worse
 * than leaving it alone.
 *
 * ── SETUP ──────────────────────────────────────────────────────────────
 * 1. npm install firebase-admin
 * 2. Authenticate with your own Google account (no key file needed):
 *      brew install --cask google-cloud-sdk
 *      gcloud auth application-default login
 *      gcloud config set project outingstation-app
 *
 * ── USAGE ──────────────────────────────────────────────────────────────
 *   node migrate_user_cities.cjs
 *       → DRY RUN (default). Reports what it WOULD change. Writes nothing.
 *
 *   node migrate_user_cities.cjs --apply
 *       → Writes the safe (exact case/whitespace) fixes.
 *
 *   node migrate_user_cities.cjs --apply --include-fuzzy
 *       → Also writes lower-confidence matches: state-name substrings
 *         (e.g. "Lagos State" → "Lagos") and known-city lookups
 *         (e.g. "Ilorin" → "Kwara", "Abuja" → "FCT (Abuja)"). Review the
 *         dry-run output for these first — they're best-effort guesses,
 *         not certainties, even though the city lookup ones are pretty
 *         reliable for well-known state capitals.
 *
 * Always run the plain dry run first and actually read the output before
 * passing --apply. This writes to your live users collection.
 */

const admin = require('firebase-admin');

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: 'outingstation-app',
});

const db = admin.firestore();

// Same list used everywhere in the app (signup, profile, Outing upload,
// event creation). Keep this in sync if that list ever changes.
const VALID_CITIES = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue',
  'Borno', 'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu',
  'FCT (Abuja)', 'Gombe', 'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina',
  'Kebbi', 'Kogi', 'Kwara', 'Lagos', 'Nasarawa', 'Niger', 'Ogun', 'Ondo',
  'Osun', 'Oyo', 'Plateau', 'Rivers', 'Sokoto', 'Taraba', 'Yobe', 'Zamfara',
  'Others',
];

// ✅ NEW — common Nigerian cities/towns mapped to their state, so
// "Ilorin" -> "Kwara", "Abuja" -> "FCT (Abuja)", etc. instead of being
// left completely unmatched. Add more entries here as you see them show
// up in the "unmatched" list on future runs.
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

// Escapes regex special characters in a city name before building a
// pattern from it (matters for "FCT (Abuja)", which has parentheses).
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Builds a case-insensitive, word-boundary regex for a given term, so
// "Niger" won't accidentally match inside "Nigeria" the way a plain
// substring check would.
function wordBoundaryRegex(term) {
  return new RegExp(`\\b${escapeRegex(term)}\\b`, 'i');
}

const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const INCLUDE_FUZZY = args.includes('--include-fuzzy');

/**
 * Tries to map a raw city string onto one of VALID_CITIES.
 * Returns { match, confidence } where confidence is:
 *   'exact' — already correct, nothing to do
 *   'safe'  — case/whitespace difference only (e.g. "lagos " -> "Lagos")
 *   'fuzzy' — either (a) a known city name found via word-boundary match
 *             (e.g. "Ilorin, Nigeria" -> "Kwara" via the CITY_TO_STATE
 *             lookup), or (b) a valid state name found as a whole word
 *             inside the raw string (e.g. "Lagos State" -> "Lagos").
 *             Both are best-effort, reviewed before writing.
 *   'none'  — no reasonable match found at all
 */
function classifyCity(raw) {
  if (!raw || typeof raw !== 'string') return { match: null, confidence: 'none' };
  const trimmed = raw.trim();
  if (trimmed === '' || trimmed.toLowerCase() === 'null') return { match: null, confidence: 'none' };

  if (VALID_CITIES.includes(trimmed)) {
    return { match: trimmed, confidence: 'exact' };
  }

  const lower = trimmed.toLowerCase();
  const caseMatch = VALID_CITIES.find(c => c.toLowerCase() === lower);
  if (caseMatch) {
    return { match: caseMatch, confidence: 'safe' };
  }

  // Known city/town lookup first (checked before generic state substring
  // matching, and specific enough to trust over a bare substring guess).
  const cityKeys = Object.keys(CITY_TO_STATE).sort((a, b) => b.length - a.length);
  for (const cityKey of cityKeys) {
    if (wordBoundaryRegex(cityKey).test(lower)) {
      return { match: CITY_TO_STATE[cityKey], confidence: 'fuzzy' };
    }
  }

  // Generic state-name-as-whole-word match — longest name first, and
  // word-boundary so "Nigeria" never matches the state "Niger" again.
  const sortedByLength = [...VALID_CITIES].sort((a, b) => b.length - a.length);
  const containsMatch = sortedByLength.find(c => wordBoundaryRegex(c).test(trimmed));
  if (containsMatch) {
    return { match: containsMatch, confidence: 'fuzzy' };
  }

  return { match: null, confidence: 'none' };
}

async function run() {
  console.log(APPLY ? '🚀 LIVE RUN — changes will be written' : '🔍 DRY RUN — no changes will be written (pass --apply to write)');
  console.log(INCLUDE_FUZZY ? '   (including fuzzy/substring/city matches)\n' : '   (safe matches only — pass --include-fuzzy to also apply guesses)\n');

  const snapshot = await db.collection('users').get();
  console.log(`Found ${snapshot.size} user documents.\n`);

  const results = { exact: 0, safe: [], fuzzy: [], none: [] };
  let batch = db.batch();
  let batchCount = 0;
  let totalWritten = 0;

  for (const doc of snapshot.docs) {
    const raw = doc.data().city;
    const { match, confidence } = classifyCity(raw);

    if (confidence === 'exact') {
      results.exact++;
      continue;
    }

    if (confidence === 'none') {
      results.none.push({ id: doc.id, raw });
      continue;
    }

    const entry = { id: doc.id, raw, match, confidence };
    if (confidence === 'safe') results.safe.push(entry);
    if (confidence === 'fuzzy') results.fuzzy.push(entry);

    const shouldWrite = APPLY && (confidence === 'safe' || (confidence === 'fuzzy' && INCLUDE_FUZZY));
    if (shouldWrite) {
      batch.update(doc.ref, { city: match });
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
  console.log(`Already correct:        ${results.exact}`);
  console.log(`Safe fixes (case/space): ${results.safe.length}${APPLY ? ' — written' : ' — would write'}`);
  console.log(`Fuzzy guesses:           ${results.fuzzy.length}${APPLY && INCLUDE_FUZZY ? ' — written' : ' — NOT written (needs --include-fuzzy)'}`);
  console.log(`No match at all:         ${results.none.length} — left untouched, needs manual review\n`);

  if (results.safe.length > 0) {
    console.log('── Safe fixes ────────────────────────────────────');
    results.safe.forEach(r => console.log(`  ${r.id}: "${r.raw}" → "${r.match}"`));
    console.log('');
  }

  if (results.fuzzy.length > 0) {
    console.log('── Fuzzy guesses (review these) ──────────────────');
    results.fuzzy.forEach(r => console.log(`  ${r.id}: "${r.raw}" → "${r.match}"`));
    console.log('');
  }

  if (results.none.length > 0) {
    console.log('── Unmatched — left alone, check manually ────────');
    results.none.forEach(r => console.log(`  ${r.id}: "${r.raw}"`));
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
