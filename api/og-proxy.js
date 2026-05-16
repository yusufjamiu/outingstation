import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  const slug = req.query.slug;
  const ua = req.headers['user-agent'] || '';

  const isBot = /facebookexternalhit|twitterbot|pinterest|slackbot|linkedinbot|discordbot|whatsapp|telegrambot|googlebot|bingbot/i.test(ua);

  if (isBot && slug) {
    try {
      // ✅ Proxy to Cloud Run — it has all OG logic already
      const ogUrl = `https://og-vawapehfla-uc.a.run.app/${slug}`;
      const response = await fetch(ogUrl);
      const html = await response.text();

      res.setHeader('Content-Type', 'text/html');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      return res.status(200).send(html);
    } catch (err) {
      console.error('Proxy error:', err);
    }
  }

  // ✅ Real user — serve React app
  try {
    const filePath = path.join(process.cwd(), 'dist', 'index.html');
    const html = fs.readFileSync(filePath, 'utf8');
    res.setHeader('Content-Type', 'text/html');
    return res.status(200).send(html);
  } catch {
    res.setHeader('Content-Type', 'text/html');
    return res.status(200).send(`<!DOCTYPE html><html><head><meta charset="UTF-8"/></head><body><div id="root"></div><script type="module" src="/src/main.jsx"></script></body></html>`);
  }
}