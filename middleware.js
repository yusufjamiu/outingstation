import { NextResponse } from 'next/server';

export const config = {
  matcher: '/e/:slug*',
};

export default async function middleware(req) {
  const ua = req.headers.get('user-agent') || '';
  
  const isBot = /whatsapp|facebookexternalhit|twitterbot|linkedinbot|googlebot|slackbot|telegrambot/i.test(ua);

  if (isBot) {
    const slug = req.nextUrl.pathname.replace('/e/', '');
    const ogUrl = new URL(`/api/og/event/${slug}?bySlug=true`, req.url);
    return NextResponse.rewrite(ogUrl);
  }

  return NextResponse.next();
}