import React from 'react';
import { Link } from 'react-router-dom';
import { Store, Inbox, Wallet, TrendingUp, ArrowRight } from 'lucide-react';

const STOPS = [
  { icon: Store, label: 'List Business' },
  { icon: Inbox, label: 'Requests' },
  { icon: Wallet, label: 'Get Booked' },
  { icon: TrendingUp, label: 'Grow' },
];

export default function GrowYourBusinessCTA() {
  return (
    <section className="bg-gradient-to-br from-gray-900 via-gray-900 to-cyan-700 py-16 md:py-24 px-4 md:px-6 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-400 rounded-full opacity-10 blur-3xl"></div>
      <div className="absolute bottom-0 left-0 w-72 h-72 bg-cyan-400 rounded-full opacity-10 blur-3xl"></div>

      <div className="max-w-5xl mx-auto relative z-10 text-center">
        <p className="text-cyan-300 text-sm font-semibold tracking-wide mb-3">LIST YOUR SERVICES</p>
        <h2 className="text-3xl md:text-5xl font-bold text-white mb-4 leading-tight">
          DJ, Caterer, Decorator, Or Vendor?
        </h2>
        <p className="text-gray-300 text-base md:text-lg max-w-2xl mx-auto mb-10">
          List your services or your stall, and get discovered by people actively planning events
          or organizers looking for vendors. Requests come to you.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3 md:gap-4 mb-10">
          {STOPS.map((s, i) => {
            const Icon = s.icon;
            return (
              <React.Fragment key={s.label}>
                <div className="flex flex-col items-center gap-2">
                  <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center">
                    <Icon size={22} className="text-cyan-300" />
                  </div>
                  <span className="text-xs text-gray-300 font-medium">{s.label}</span>
                </div>
                {i < STOPS.length - 1 && (
                  <ArrowRight size={16} className="text-gray-600 hidden sm:block" />
                )}
              </React.Fragment>
            );
          })}
        </div>

        <Link
          to="/business/register"
          className="inline-flex items-center gap-2 bg-gradient-to-r from-cyan-400 to-cyan-500 text-white px-10 py-4 rounded-full font-medium shadow-lg hover:shadow-xl hover:shadow-cyan-500/20 transition-shadow text-base md:text-lg"
        >
          List Your Business
          <ArrowRight size={18} />
        </Link>
      </div>
    </section>
  );
}