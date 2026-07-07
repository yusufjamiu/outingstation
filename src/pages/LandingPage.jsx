import SEO from '../components/SEO';
import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import CategoryGrid from '../components/CategoryGrid';
import FeaturedEvents from '../components/FeaturedEvents';
import UniversitySelector from '../components/UniversitySelector';
import WebinarSection from '../components/WebinarSection';
import HowItWorks from '../components/HowItWorks';
import EcosystemSection from '../components/EcosystemSection';
import PlanEventCTA from '../components/PlanEventCTA';
import CreateEventCTA from '../components/CreateEventCTA';
import GrowYourBusinessCTA from '../components/GrowYourBusinessCTA';
import AppDownloadSection from '../components/AppDownloadSection';
import EventsCarousel from '../components/EventsCarousel';
import concertImage from '../assets/concertImage.jpg';
import { MapPin, Calendar, ShieldCheck } from 'lucide-react';
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase';

export default function LandingPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState('Lagos');
  const [currentText, setCurrentText] = useState(0);
  const [fade, setFade] = useState(true);
  const [tickerEvents, setTickerEvents] = useState([]);
  const [totalUpcomingEvents, setTotalUpcomingEvents] = useState(0);
  const [upcomingEvents, setUpcomingEvents] = useState([]); // ✅ shared with EventsCarousel — one fetch, not two
  const [aboutVisible, setAboutVisible] = useState(false);
  const [featuresVisible, setFeaturesVisible] = useState([false, false, false]);
  const aboutRef = useRef(null);
  const featuresRef = useRef([]);

  const rotatingTexts = [
  "Find what's happening near you, or plan your own event from scratch.",
  "From concerts in Lagos to hangouts in Abuja, find your next experience.",
  "Ask Outing AI, and let it find your next move.",
  "Book a hall, decorator, caterer and DJ in one flow with Plan My Event.",
  "Your guide to what's happening around you, on and off campus.",
];

  const features = [
  "Search or filter by category, city, date and price, or just ask Outing AI to find exactly what you're looking for.",
  "See full details on any event or place, then buy tickets, save favourites, and share with friends.",
  "Ready to host something yourself? Start a plan and we'll help you book the pieces, one step at a time."
];

  const fallbackTicker = [
    { name: 'Tech Summit Lagos', city: 'Lagos', date: 'Tomorrow', status: 'soon' },
    { name: 'Comedy Night Abuja', city: 'Abuja', date: 'This Friday', status: 'live' },
    { name: 'Food Festival VI', city: 'Lagos', date: 'Sat, Apr 19', status: 'amber' },
    { name: 'Startup Pitch Night', city: 'Abuja', date: 'Mon, Apr 21', status: 'soon' },
    { name: 'Afrobeats Concert', city: 'Lagos', date: 'Tonight', status: 'live' },
    { name: 'Career Fair 2026', city: 'Lagos', date: 'Wed, Apr 23', status: 'amber' },
  ];

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setAboutVisible(true);
        } else {
          setAboutVisible(false);
        }
      },
      { threshold: 0.2 }
    );
    if (aboutRef.current) observer.observe(aboutRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const observers = featuresRef.current.map((el, i) => {
      if (!el) return null;
      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setTimeout(() => {
              setFeaturesVisible(prev => {
                const updated = [...prev];
                updated[i] = true;
                return updated;
              });
            }, i * 150);
          } else {
            setFeaturesVisible(prev => {
              const updated = [...prev];
              updated[i] = false;
              return updated;
            });
          }
        },
        { threshold: 0.5 }
      );
      obs.observe(el);
      return obs;
    });
    return () => observers.forEach(o => o && o.disconnect());
  }, []);

  useEffect(() => {
    const loadTickerEvents = async () => {
  try {
    const snapshot = await getDocs(collection(db, 'events'));
    const now = new Date();

    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const events = snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(e => e.status === 'published' && e.date)
      .map(e => {
        const d = e.date?.toDate ? e.date.toDate() : new Date(e.date);
        return { ...e, _date: d };
      })
      .filter(e => e._date >= today)
      .sort((a, b) => a._date - b._date);

    setTotalUpcomingEvents(events.length);
    setUpcomingEvents(events); // ✅ EventsCarousel now derives its display from this, no second fetch

    const eventsForTicker = events
      .slice(0, 8)
      .map(e => {
        const d = e._date;
        const isToday = d.toDateString() === today.toDateString();
        const isTomorrow = d.toDateString() === tomorrow.toDateString();

        let dateLabel = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
        let status = 'amber';

        if (isToday) { dateLabel = 'Tonight'; status = 'live'; }
        else if (isTomorrow) { dateLabel = 'Tomorrow'; status = 'soon'; }

        return {
          name: e.title || e.name,
          city: (e.location || 'Lagos').split(',')[0].trim(),
          date: dateLabel,
          status,
        };
      });

    setTickerEvents(eventsForTicker.length >= 3 ? eventsForTicker : [...eventsForTicker, ...fallbackTicker].slice(0, 6));
  } catch (err) {
    console.error('Ticker load error:', err);
    setTickerEvents(fallbackTicker);
  }
};

    loadTickerEvents();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setCurrentText((prev) => (prev + 1) % rotatingTexts.length);
        setFade(true);
      }, 500);
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  const handleSearch = () => {
    if (searchQuery.trim()) {
      navigate('/events?search=' + searchQuery + '&city=' + selectedCity);
    } else {
      navigate('/events?city=' + selectedCity);
    }
  };

  return (
    <>
      <SEO />
      <style>{`
        @keyframes ticker {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-ticker {
          animation: ticker 25s linear infinite;
        }
        .animate-ticker:hover {
          animation-play-state: paused;
        }
      `}</style>

      <div className="min-h-screen bg-gray-50">
        <Navbar />

        <section className="bg-gradient-to-br from-cyan-50 to-white px-4">
          <div className="bg-gradient-to-br from-cyan-50 via-white to-cyan-50 pt-8 pb-8 px-4 md:px-6 relative overflow-hidden">
            <div className="absolute top-40 left-10 w-64 h-64 bg-cyan-100 rounded-full opacity-30 blur-3xl"></div>
            <div className="absolute bottom-20 right-20 w-96 h-96 bg-cyan-100 rounded-full opacity-20 blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-80 h-80 bg-cyan-200 rounded-full opacity-20 blur-3xl"></div>

            <div className="max-w-7xl mx-auto relative z-10">
              <div className="text-center mb-8">
                <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold mb-4">
                  One App.{' '}
                  <span className="text-cyan-400 italic">Many Experiences.</span>
                </h1>
                <p className={'text-gray-500 text-sm md:text-base lg:text-lg px-4 max-w-xl mx-auto transition-opacity duration-500 ' + (fade ? 'opacity-100' : 'opacity-0')}>
                  {rotatingTexts[currentText]}
                </p>
              </div>

              <div className="flex flex-col lg:flex-row items-center justify-center gap-4 mb-8 md:mb-16">
                <div className="flex items-center bg-white rounded-full shadow-lg px-4 md:px-6 py-3 md:py-4 w-full lg:max-w-2xl">
                  <MapPin className="text-cyan-400 mr-2 md:mr-3 flex-shrink-0" size={20} />
                  <input
                    type="text"
                    placeholder="Search address, event"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                    className="flex-1 outline-none text-gray-600 text-sm md:text-base min-w-0"
                  />
                  <span className="text-gray-400 mx-2 md:mx-4">|</span>
                  <select
                    value={selectedCity}
                    onChange={(e) => setSelectedCity(e.target.value)}
                    className="outline-none text-gray-600 bg-transparent text-sm md:text-base mr-2 md:mr-6"
                  >
                    <option>Lagos</option>
                    <option>Abuja</option>
                  </select>
                  <button
                    onClick={handleSearch}
                    className="hidden md:block bg-gradient-to-r from-cyan-400 to-cyan-500 text-white px-8 py-3 rounded-full hover:shadow-lg transition"
                  >
                    Explore
                  </button>
                </div>
                <button
                  onClick={handleSearch}
                  className="md:hidden w-full bg-gradient-to-r from-cyan-400 to-cyan-500 text-white px-8 py-3 rounded-full hover:shadow-lg transition"
                >
                  Explore
                </button>
                <Link to="/events">
                  <button className="w-auto mx-auto lg:w-auto bg-gray-900 text-cyan-400 px-6 md:px-8 py-3 md:py-4 rounded-full font-medium shadow-lg hover:shadow-xl hover:shadow-cyan-500/20 transition-shadow flex items-center justify-center gap-2">
                    <Calendar size={20} />
                    View All Events
                  </button>
                </Link>
              </div>

              <div className="pb-14 md:pb-6 relative">
                <EventsCarousel events={upcomingEvents} />
                {totalUpcomingEvents > 0 && (
                  <div className="absolute -bottom-3 left-4 md:left-8 bg-white rounded-2xl shadow-lg px-4 py-2.5 flex items-center gap-2 z-20">
                    <ShieldCheck size={18} className="text-cyan-500 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-bold text-gray-900 leading-tight">{totalUpcomingEvents}+</p>
                      <p className="text-[10px] text-gray-500 leading-tight">Live & Upcoming Events</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Create Event CTA */}
        <CreateEventCTA />

        {/* Plan My Event CTA */}
        <PlanEventCTA />

        {/* Grow Your Business CTA */}
        <GrowYourBusinessCTA />

        <section className="bg-gray-50 py-16 md:py-24 px-4 md:px-6">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

              <div className="relative">
                <svg className="absolute -top-16 right-0 w-48 h-32 text-cyan-400 hidden lg:block" viewBox="0 0 200 150" fill="none">
                  <path d="M10 80 Q 60 20, 100 60 T 180 40" stroke="currentColor" strokeWidth="2" strokeDasharray="8,8" fill="none" />
                  <path d="M175 35 L180 40 L175 45 M180 40 L172 40" stroke="currentColor" strokeWidth="2" fill="none" />
                </svg>
                <div className="relative">
                  <div className="absolute -left-6 -top-6 w-full h-full bg-cyan-400 rounded-3xl"></div>
                  <div className="relative bg-gray-800 rounded-3xl overflow-hidden shadow-2xl h-64 md:h-96 lg:h-[500px]">
                    <img src={concertImage} alt="Crowd at event" className="w-full h-full object-cover" />
                  </div>
                </div>
              </div>

              <div ref={aboutRef} className="overflow-hidden">
                <p className={'text-gray-500 text-sm md:text-base mb-3 transition-all duration-500 ' + (aboutVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4')}>
                  Your AI-powered guide to experiences around you
                </p>
                <h2 className={'text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-8 transition-all duration-500 ' + (aboutVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5')} style={{ transitionDelay: '100ms' }}>
                  Discover More Than Just Events
                </h2>
                <h3 className={'text-xl md:text-2xl font-semibold text-cyan-400 mb-4 transition-all duration-500 ' + (aboutVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-5')} style={{ transitionDelay: '200ms' }}>
                  What Outing Station Does.
                </h3>
                <p className={'text-gray-600 text-base md:text-lg mb-6 leading-relaxed transition-all duration-500 ' + (aboutVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3')} style={{ transitionDelay: '300ms' }}>
                  OutingStation started as a way to find out what's happening around you. It's grown into a place where you can plan your own, too, from a hall to a DJ, without juggling five different people.
                </p>

                <p className={'text-xs text-gray-400 tracking-widest mb-2 transition-all duration-500 ' + (aboutVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2')} style={{ transitionDelay: '400ms' }}>
                  HAPPENING NOW & SOON
                </p>

                <div className={'border-t border-b border-gray-100 py-3 mb-8 overflow-hidden transition-all duration-500 ' + (aboutVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4')} style={{ transitionDelay: '500ms' }}>
                  {tickerEvents.length > 0 && (
                    <div className="flex animate-ticker w-max">
                      {[...tickerEvents, ...tickerEvents].map((event, i) => (
                        <div key={i} className="flex items-center gap-2 px-6 whitespace-nowrap">
                          <div className={'w-2 h-2 rounded-full flex-shrink-0 ' + (event.status === 'live' ? 'bg-red-400' : event.status === 'amber' ? 'bg-amber-400' : 'bg-cyan-400')} />
                          <span className="text-sm font-medium text-gray-800">{event.name}</span>
                          <span className="text-gray-300">·</span>
                          <span className="text-xs text-gray-500">{event.city} · {event.date}</span>
                          {event.status === 'live' ? (
                            <span className="text-xs font-medium bg-red-50 text-red-600 border border-red-200 rounded px-2 py-0.5">Live</span>
                          ) : (
                            <span className="text-xs font-medium bg-emerald-50 text-emerald-600 border border-emerald-200 rounded px-2 py-0.5">Soon</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-6 mb-10">
                  {features.map((feature, i) => (
                    <div
                      key={i}
                      ref={el => featuresRef.current[i] = el}
                      className={'flex gap-4 transition-all duration-600 ' + (featuresVisible[i] ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4')}
                    >
                      <div className="relative w-1 bg-gray-100 flex-shrink-0 rounded-full overflow-hidden" style={{ minHeight: '100%' }}>
                        <div
                          className={'absolute top-0 left-0 w-full bg-cyan-400 rounded-full transition-all duration-700 ' + (featuresVisible[i] ? 'h-full' : 'h-0')}
                          style={{ transitionDelay: featuresVisible[i] ? i * 150 + 'ms' : '0ms' }}
                        />
                      </div>
                      <p className="text-gray-700 text-sm md:text-base">{feature}</p>
                    </div>
                  ))}
                </div>

                <div className={'transition-all duration-500 ' + (aboutVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3')} style={{ transitionDelay: '1000ms' }}>
                  <Link to="/events">
                    <button className="bg-gradient-to-r from-cyan-400 to-cyan-500 text-white px-10 py-4 rounded-full font-medium shadow-lg hover:shadow-xl transition-shadow mx-auto lg:mx-0 block">
                      View All Events
                    </button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        <EcosystemSection />

        <section className="py-2 px-4 bg-white">
          <div className="max-w-7xl mx-auto">
            <CategoryGrid />
          </div>
        </section>

        <FeaturedEvents />
        <WebinarSection />
        <HowItWorks />

        <AppDownloadSection />

        <Footer />
      </div>
    </>
  );
}