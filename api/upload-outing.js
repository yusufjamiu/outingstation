// ✅ NEW — receives raw video bytes from the Flutter app, uploads to Bunny
// Stream (create video record, then push the bytes), returns the playback
// URL + thumbnail URL the app needs to save the Outing doc in Firestore.

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { title } = req.query;
  const libraryId = process.env.BUNNY_LIBRARY_ID;
  const apiKey = process.env.BUNNY_API_KEY;
  const pullZone = process.env.BUNNY_PULL_ZONE;

  if (!title) {
    return res.status(400).json({ error: 'Missing title query param' });
  }

  try {
    const createResponse = await fetch(
      `https://video.bunnycdn.com/library/${libraryId}/videos`,
      {
        method: 'POST',
        headers: {
          AccessKey: apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title }),
      }
    );

    if (!createResponse.ok) {
      const errText = await createResponse.text();
      console.error('❌ Bunny create video failed:', errText);
      return res.status(502).json({ error: 'Failed to create video record' });
    }

    const { guid: videoId } = await createResponse.json();

    const uploadResponse = await fetch(
      `https://video.bunnycdn.com/library/${libraryId}/videos/${videoId}`,
      {
        method: 'PUT',
        headers: {
          AccessKey: apiKey,
        },
        body: req,
        duplex: 'half',
      }
    );

    if (!uploadResponse.ok) {
      const errText = await uploadResponse.text();
      console.error('❌ Bunny upload failed:', errText);
      return res.status(502).json({ error: 'Failed to upload video' });
    }

    return res.status(200).json({
      videoId,
      videoUrl: `https://${pullZone}/${videoId}/playlist.m3u8`,
      thumbnailUrl: `https://${pullZone}/${videoId}/thumbnail.jpg`,
    });
  } catch (e) {
    console.error('❌ Error in upload-outing:', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
}