export default async function handler(req, res) {
  const { id } = req.query;

  let title = 'OutingStation - Everything Your City Has To Offer';
  let description = 'Discover events and places in Lagos, Abuja and more.';
  let image = 'https://www.outingstation.com/og-image.png';
  const url = `https://www.outingstation.com/event/${id}`;

  try {
    const projectId = process.env.VITE_FIREBASE_PROJECT_ID;
    const apiKey = process.env.VITE_FIREBASE_API_KEY;

    const response = await fetch(
      `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/events/${id}?key=${apiKey}`
    );

    if (response.ok) {
      const data = await response.json();
      const fields = data.fields;

      if (fields) {
        title = `${fields.title?.stringValue || 'Event'} - OutingStation`;
        description = fields.description?.stringValue?.substring(0, 150) || description;
        image = fields.imageUrl?.stringValue || image;
      }
    }
  } catch (err) {
    console.error('Error fetching event:', err);
  }

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
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
  <script>window.location.replace("${url}");</script>
</head>
<body>
  <p>Redirecting...</p>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html');
  res.setHeader('Cache-Control', 's-maxage=3600');
  return res.status(200).send(html);
}