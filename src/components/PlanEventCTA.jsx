import React from 'react';
import { Link } from 'react-router-dom';
import { Building2, UtensilsCrossed, Music, Palette, ArrowRight } from 'lucide-react';

const STOPS = [
  { icon: Building2, label: 'Venue' },
  { icon: Palette, label: 'Decor' },
  { icon: UtensilsCrossed, label: 'Catering' },
  { icon: Music, label: 'DJ & MC' },
];

export default function PlanEventCTA() {
  return (
    <section className="bg-[#47A2B6] py-16 md:py-24 px-4 md:px-6 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full opacity-10 blur-3xl"></div>
      <div className="absolute bottom-0 left-0 w-72 h-72 bg-gray-900 rounded-full opacity-10 blur-3xl"></div>

      <div className="max-w-5xl mx-auto relative z-10 text-center">
        <p className="text-white text-sm font-semibold tracking-wide mb-3">PLAN MY EVENT</p>
        <h2 className="text-3xl md:text-5xl font-bold text-white mb-4 leading-tight">
          Planning A Birthday, Wedding, Or Party?
        </h2>
        <p className="text-cyan-50 text-base md:text-lg max-w-2xl mx-auto mb-10">
          Walk through one guided flow and pick a hall, decorator, caterer, DJ, MC and more.
          Skip whatever you don't need, we'll handle the rest.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3 md:gap-4 mb-10">
          {STOPS.map((s, i) => {
            const Icon = s.icon;
            return (
              <React.Fragment key={s.label}>
                <div className="flex flex-col items-center gap-2">
                  <div className="w-14 h-14 rounded-2xl bg-white border border-white flex items-center justify-center shadow-sm">
                    <Icon size={22} className="text-[#47A2B6]" />
                  </div>
                  <span className="text-xs text-cyan-50 font-medium">{s.label}</span>
                </div>
                {i < STOPS.length - 1 && (
                  <ArrowRight size={16} className="text-white/30 hidden sm:block" />
                )}
              </React.Fragment>
            );
          })}
        </div>

        <Link
          to="/plan-event"
          className="inline-flex items-center gap-2 bg-gray-900 text-white px-10 py-4 rounded-full font-medium shadow-lg hover:shadow-xl hover:shadow-gray-900/20 transition-shadow text-base md:text-lg"
        >
          Start Planning
          <ArrowRight size={18} />
        </Link>
      </div>
    </section>
  );
}