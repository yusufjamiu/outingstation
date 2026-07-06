import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, MapPin, School, Briefcase, Sparkles, ClipboardList, Store, ArrowRight } from 'lucide-react';

const PILLARS = [
  {
    title: 'Events',
    desc: 'Concerts, parties, meetups and more happening around you.',
    icon: Calendar,
    to: '/events',
    color: 'bg-cyan-50 text-cyan-500',
  },
  {
    title: 'Places',
    desc: 'Restaurants, lounges, cinemas and spots worth checking out.',
    icon: MapPin,
    to: '/places',
    color: 'bg-orange-50 text-orange-500',
  },
  {
    title: 'Campus',
    desc: 'Everything happening at your school, one tab away.',
    icon: School,
    to: '/campus-events',
    color: 'bg-purple-50 text-purple-500',
  },
  // ✅ PAUSED — bring back later. Kept exactly as-is so it's a one-line
  // uncomment, not a rebuild, when Opportunities is ready to relaunch.
  // {
  //   title: 'Opportunities',
  //   desc: 'Internships, scholarships, webinars and competitions.',
  //   icon: Briefcase,
  //   to: '/opportunities',
  //   color: 'bg-emerald-50 text-emerald-500',
  // },
  {
    title: 'Business',
    desc: 'List your services or your stall and get discovered.',
    icon: Store,
    to: '/business/register',
    color: 'bg-amber-50 text-amber-500',
    isNew: true,
  },
  {
    title: 'Outing AI',
    desc: 'Tell it what you\u2019re in the mood for. It finds it.',
    icon: Sparkles,
    to: '/',
    color: 'bg-pink-50 text-pink-500',
  },
  {
    title: 'Plan My Event',
    desc: 'Book a hall, decorator, caterer and DJ in one flow.',
    icon: ClipboardList,
    to: '/plan-event',
    color: 'bg-cyan-50 text-cyan-500',
    highlight: true,
  },
];

export default function EcosystemSection() {
  const [visible, setVisible] = useState([]);
  const refs = useRef([]);

  useEffect(() => {
    const observers = refs.current.map((el, i) => {
      if (!el) return null;
      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setTimeout(() => {
              setVisible(prev => (prev.includes(i) ? prev : [...prev, i]));
            }, i * 80);
          }
        },
        { threshold: 0.2 }
      );
      obs.observe(el);
      return obs;
    });
    return () => observers.forEach(o => o && o.disconnect());
  }, []);

  return (
    <section className="bg-white py-16 md:py-20 px-4 md:px-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <p className="text-cyan-500 text-sm font-semibold tracking-wide mb-2">THE ECOSYSTEM</p>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900">One App. Every Part Of Your Outing.</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {PILLARS.map((p, i) => {
            const Icon = p.icon;
            const isVisible = visible.includes(i);
            return (
              <Link
                key={p.title}
                ref={el => (refs.current[i] = el)}
                to={p.to}
                className={
                  'group relative rounded-2xl p-6 border-2 transition-all duration-500 hover:-translate-y-1 hover:shadow-lg ' +
                  (p.highlight
                    ? 'border-cyan-400 bg-gradient-to-br from-cyan-50 to-white'
                    : 'border-gray-100 hover:border-cyan-300') +
                  ' ' +
                  (isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4')
                }
              >
                {(p.highlight || p.isNew) && (
                  <span className="absolute -top-3 right-4 bg-cyan-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                    New
                  </span>
                )}
                <div className={'w-12 h-12 rounded-xl flex items-center justify-center mb-4 ' + p.color}>
                  <Icon size={22} />
                </div>
                <h3 className="font-bold text-gray-900 mb-1.5 flex items-center gap-1.5">
                  {p.title}
                  <ArrowRight size={14} className="text-gray-300 group-hover:text-cyan-500 group-hover:translate-x-1 transition-all" />
                </h3>
                <p className="text-sm text-gray-500 leading-relaxed">{p.desc}</p>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}