import React from 'react';
import { Link } from 'react-router-dom';
import { Camera, Ticket, Users, TrendingUp, ArrowRight } from 'lucide-react';

const STOPS = [
  { icon: Camera, label: 'Add Details' },
  { icon: Ticket, label: 'Set Ticketing' },
  { icon: Users, label: 'Go Live' },
  { icon: TrendingUp, label: 'Sell Out' },
];

export default function CreateEventCTA() {
  return (
    <section className="bg-gradient-to-br from-cyan-400 to-cyan-500 py-16 md:py-24 px-4 md:px-6 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-96 h-96 bg-white rounded-full opacity-10 blur-3xl"></div>
      <div className="absolute bottom-0 right-0 w-72 h-72 bg-gray-900 rounded-full opacity-10 blur-3xl"></div>

      <div className="max-w-5xl mx-auto relative z-10 text-center">
        <p className="text-gray-900 text-sm font-semibold tracking-wide mb-3">CREATE AN EVENT OR PLACE</p>
        <h2 className="text-3xl md:text-5xl font-bold text-white mb-4 leading-tight">
          Hosting Something? Own A Venue?
        </h2>
        <p className="text-cyan-50 text-base md:text-lg max-w-2xl mx-auto mb-10">
          List an event with ticketing, or add your hall, restaurant, or resort so people can find it.
          We handle payments, tickets, and check-in for you.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3 md:gap-4 mb-10">
          {STOPS.map((s, i) => {
            const Icon = s.icon;
            return (
              <React.Fragment key={s.label}>
                <div className="flex flex-col items-center gap-2">
                  <div className="w-14 h-14 rounded-2xl bg-white/20 border border-white/20 flex items-center justify-center">
                    <Icon size={22} className="text-white" />
                  </div>
                  <span className="text-xs text-cyan-50 font-medium">{s.label}</span>
                </div>
                {i < STOPS.length - 1 && (
                  <ArrowRight size={16} className="text-white/40 hidden sm:block" />
                )}
              </React.Fragment>
            );
          })}
        </div>

        <Link
          to="/create"
          className="inline-flex items-center gap-2 bg-gray-900 text-white px-10 py-4 rounded-full font-medium shadow-lg hover:shadow-xl hover:shadow-gray-900/20 transition-shadow text-base md:text-lg"
        >
          Create Your Event
          <ArrowRight size={18} />
        </Link>
      </div>
    </section>
  );
}