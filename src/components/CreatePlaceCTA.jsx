import React from 'react';
import { Link } from 'react-router-dom';
import { Image, Clock, DollarSign, TrendingUp, ArrowRight } from 'lucide-react';

const STOPS = [
  { icon: Image, label: 'Add Photos' },
  { icon: Clock, label: 'Set Hours' },
  { icon: DollarSign, label: 'Add Pricing' },
  { icon: TrendingUp, label: 'Go Live' },
];

export default function CreatePlaceCTA() {
  return (
    <section className="bg-white py-16 md:py-24 px-4 md:px-6 relative overflow-hidden border-y-2 border-cyan-100">
      <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-50 rounded-full opacity-60 blur-3xl"></div>
      <div className="absolute bottom-0 left-0 w-72 h-72 bg-cyan-50 rounded-full opacity-60 blur-3xl"></div>

      <div className="max-w-5xl mx-auto relative z-10 text-center">
        <p className="text-cyan-600 text-sm font-semibold tracking-wide mb-3">LIST YOUR PLACE</p>
        <h2 className="text-3xl md:text-5xl font-bold text-gray-900 mb-4 leading-tight">
          Own A Hall, Restaurant, Or Resort?
        </h2>
        <p className="text-gray-600 text-base md:text-lg max-w-2xl mx-auto mb-10">
          Add your venue so people already searching for a place to go can actually find you,
          no ticketing required, just visibility.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3 md:gap-4 mb-10">
          {STOPS.map((s, i) => {
            const Icon = s.icon;
            return (
              <React.Fragment key={s.label}>
                <div className="flex flex-col items-center gap-2">
                  <div className="w-14 h-14 rounded-2xl bg-cyan-50 border-2 border-cyan-100 flex items-center justify-center">
                    <Icon size={22} className="text-cyan-600" />
                  </div>
                  <span className="text-xs text-gray-600 font-medium">{s.label}</span>
                </div>
                {i < STOPS.length - 1 && (
                  <ArrowRight size={16} className="text-gray-300 hidden sm:block" />
                )}
              </React.Fragment>
            );
          })}
        </div>

        <Link
          to="/create-place"
          className="inline-flex items-center gap-2 bg-[#47A2B6] text-white px-10 py-4 rounded-full font-medium shadow-lg hover:shadow-xl transition-shadow text-base md:text-lg"
        >
          List Your Place
          <ArrowRight size={18} />
        </Link>
      </div>
    </section>
  );
}