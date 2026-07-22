import crypto from 'crypto';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { title } = req.body;
  const libraryId = process.env.BUNNY_LIBRARY_ID;
  const apiKey = process.env.BUNNY_API_KEY;
  const pullZone = process.env.BUNNY_PULL_ZONE;

  if (!title) {
    return res.status(400).json({ error: 'Missing title' });
  }

  try {
    // Step 1 — create the video record (tiny request, no file bytes)
    const createResponse = await fetch(
      `https://video.bunnycdn.com/library/${libraryId}/videos`,
      {
        method: 'POST',
        headers: { AccessKey: apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      }
    );

    if (!createResponse.ok) {
      const errText = await createResponse.text();
      console.error('❌ Bunny create video failed:', errText);
      return res.status(502).json({ error: 'Failed to create video record' });
    }

    const { guid: videoId } = await createResponse.json();

    // Step 2 — compute a signed, time-limited TUS upload authorization
    // (valid 1 hour) — lets the CLIENT upload directly to Bunny without
    // ever holding the real API key.
    const expiration = Math.floor(Date.now() / 1000) + 3600;
    const signature = crypto
      .createHash('sha256')
      .update(`${libraryId}${apiKey}${expiration}${videoId}`)
      .digest('hex');

    return res.status(200).json({
      videoId,
      libraryId,
      signature,
      expiration,
      pullZone,
    });
  } catch (e) {
    console.error('❌ Error in create-outing-upload:', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
}