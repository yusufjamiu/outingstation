import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  const slug = req.query.slug;
  const ua = req.headers['user-agent'] || '';

  const isBot =
    /facebookexternalhit|Twitterbot|Pinterest|Slackbot|LinkedInBot|Discordbot|WhatsApp/i.test(
      ua
    );

  // SOCIAL BOTS
  if (isBot && slug) {
    const ogUrl = `https://www.outingstation.com/og/${slug}`;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta property="og:title" content="OutingStation Event" />
  <meta property="og:description" content="Discover events on OutingStation" />
  <meta property="og:image" content="${ogUrl}" />
  <meta property="og:url" content="https://www.outingstation.com/e/${slug}" />
  <meta property="og:type" content="website" />

  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:image" content="${ogUrl}" />
</head>
<body>
  Redirecting...
</body>
</html>
`;

    res.setHeader('Content-Type', 'text/html');
    return res.status(200).send(html);
  }

  // NORMAL USERS
  const filePath = path.join(process.cwd(), 'dist', 'index.html');
  const html = fs.readFileSync(filePath, 'utf8');

  res.setHeader('Content-Type', 'text/html');
  return res.status(200).send(html);
}