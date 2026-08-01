import React from 'react';
import { Smartphone } from 'lucide-react';

// Update these when the iOS build ships
const ANDROID_LIVE = true;
const IOS_LIVE = true;
const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.outingstation';
// ✅ FIXED — was left empty (a syntax error on its own), now the real
// live App Store link.
const APP_STORE_URL = 'https://apps.apple.com/ng/app/outingstation/id6774141538';

export default function AppDownloadSection() {
  return (
    <section className="bg-gradient-to-br from-cyan-50 to-white py-16 px-4 md:px-6">
      <div className="max-w-4xl mx-auto text-center">
        <div className="w-14 h-14 bg-cyan-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
          <Smartphone size={26} className="text-cyan-500" />
        </div>
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">Take OutingStation With You</h2>
        <p className="text-gray-500 mb-8 max-w-lg mx-auto">
          Get the app for faster browsing, saved events on the go, and push alerts when something near you sells out.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <a
            href={ANDROID_LIVE ? PLAY_STORE_URL : undefined}
            target="_blank"
            rel="noreferrer"
            className={
              'flex items-center gap-3 px-6 py-3 rounded-2xl border-2 transition ' +
              (ANDROID_LIVE
                ? 'border-gray-800 bg-gray-900 hover:bg-gray-800 cursor-pointer'
                : 'border-gray-200 bg-gray-50 cursor-not-allowed')
            }
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill={ANDROID_LIVE ? '#ffffff' : '#9ca3af'}>
              <path d="M17.6 9.48l1.84-3.18c.16-.31.04-.69-.26-.85-.29-.15-.65-.06-.83.22l-1.88 3.24a11.463 11.463 0 00-9.94 0L4.65 5.67c-.19-.29-.58-.38-.87-.2-.28.18-.37.54-.22.83L5.4 9.48C2.62 11.17 0.77 14.02 0.5 17.3h23c-.27-3.28-2.12-6.13-4.9-7.82zM7 15.25a1.25 1.25 0 110-2.5 1.25 1.25 0 010 2.5zm10 0a1.25 1.25 0 110-2.5 1.25 1.25 0 010 2.5z"/>
            </svg>
            <div className="text-left">
              <div className={'text-xs ' + (ANDROID_LIVE ? 'text-gray-300' : 'text-gray-400')}>Get it on</div>
              <div className={'text-sm font-bold ' + (ANDROID_LIVE ? 'text-white' : 'text-gray-400')}>Google Play</div>
            </div>
          </a>

          {/* ✅ FIXED — was hardcoded to the disabled "coming soon" state
          regardless of IOS_LIVE, and had no href at all since
          APP_STORE_URL was empty. Now mirrors the Google Play button's
          own conditional pattern exactly, using IOS_LIVE like it was
          clearly meant to. */}
          <a
            href={IOS_LIVE ? APP_STORE_URL : undefined}
            target="_blank"
            rel="noreferrer"
            className={
              'flex items-center gap-3 px-6 py-3 rounded-2xl border-2 transition ' +
              (IOS_LIVE
                ? 'border-gray-800 bg-gray-900 hover:bg-gray-800 cursor-pointer'
                : 'border-gray-200 bg-gray-50 cursor-not-allowed')
            }
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill={IOS_LIVE ? '#ffffff' : '#9ca3af'}>
              <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8.94-.15 1.85-.9 3.14-.82.55.03 2.1.22 3.08 1.68-.08.05-1.84 1.08-1.82 3.22.02 2.55 2.24 3.4 2.27 3.41-.02.06-.36 1.22-1.18 2.42-.7 1.03-1.44 2.06-2.57 2.24zM12.03 7.25c-.15-1.7 1.28-3.17 2.9-3.25.22 1.6-1.5 3.4-2.9 3.25z"/>
            </svg>
            <div className="text-left">
              <div className={'text-xs ' + (IOS_LIVE ? 'text-gray-300' : 'text-gray-400')}>
                {IOS_LIVE ? 'Download on the' : 'Coming soon on'}
              </div>
              <div className={'text-sm font-bold ' + (IOS_LIVE ? 'text-white' : 'text-gray-400')}>App Store</div>
            </div>
          </a>
        </div>
      </div>
    </section>
  );
}