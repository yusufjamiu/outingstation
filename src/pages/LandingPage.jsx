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
import campusImage from '../assets/campus.jpg';
import studentsImage from '../assets/students.jpg';
import concertImage from '../assets/concertImage.jpg';
import heroImage3 from '../assets/heroImage3.jpg';
import heroImage2 from '../assets/heroImage2.jpg';
import heroImage01 from '../assets/heroImage01.jpg';
import { MapPin, Grid } from 'lucide-react';
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase';

export default function LandingPage() {
  const navigate = useNavigate();
  const [userCount, setUserCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState('Lagos');
  const [currentText, setCurrentText] = useState(0);
  const [fade, setFade] = useState(true);
  const [tickerEvents, setTickerEvents] = useState([]);
  const [aboutVisible, setAboutVisible] = useState(false);
  const [featuresVisible, setFeaturesVisible] = useState([false, false, false]);

  const aboutRef = useRef(null);
  const featuresRef = useRef([]);

  const rotatingTexts = [
    "From conferences in Lagos to tech meetups in Abuja, find your next unforgettable experience!",
    "From campus parties to business summits, discover events that matter to you!",
    "From weekend hangouts to career workshops, never miss out on what's happening!",
    "From live concerts to food festivals, your next adventure starts here!"
  ];

  const features = [
    "Quickly find diverse events, from university gatherings to virtual webinars, happening nearby or online",
    "Filter events by category, city, date, and price to pinpoint exactly what you're looking for.",
    "Get all essential information, including location, time, and pricing, with convenient options to share or save events."
  ];

  const fallbackTicker = [
    { name: 'Tech Summit Lagos', city: 'Lagos', date: 'Tomorrow', status: 'soon' },
    { name: 'Comedy Night Abuja', city: 'Abuja', date: 'This Friday', status: 'live' },
    { name: 'Food Festival VI', city: 'Lagos', date: 'Sat, Apr 19', status: 'amber' },
    { name: 'Startup Pitch Night', city: 'Abuja', date: 'Mon, Apr 21', status: 'soon' },
    { name: 'Afrobeats Concert', city: 'Lagos', date: 'Tonight', status: 'live' },
    { name: 'Career Fair 2026', city: 'Lagos', date: 'Wed, Apr 23', status: 'amber' },
  ];

  // Intersection Observer for about section
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

// Intersection Observer for each feature bullet
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

  // Load ticker events from Firestore
  useEffect(() => {
    const loadTickerEvents = async () => {
      try {
        const now = new Date();
        const nextWeek = new Date();
        nextWeek.setDate(now.getDate() + 7);

        const q = query(
          collection(db, 'events'),
          where('date', '>=', now.toISOString().split('T')[0]),
          where('date', '<=', nextWeek.toISOString().split('T')[0]),
          orderBy('date', 'asc'),
          limit(8)
        );

        const snapshot = await getDocs(q);

        if (snapshot.empty) {
          setTickerEvents(fallbackTicker);
          return;
        }

        const today = now.toISOString().split('T')[0];
        const tomorrow = new Date(now);
        tomorrow.setDate(now.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().split('T')[0];

        const events = snapshot.docs.map(doc => {
          const data = doc.data();
          const eventDate = data.date;
          let dateLabel = eventDate;
          let status = 'soon';

          if (eventDate === today) {
            dateLabel = 'Tonight';
            status = 'live';
          } else if (eventDate === tomorrowStr) {
            dateLabel = 'Tomorrow';
            status = 'soon';
          } else {
            const d = new Date(eventDate);
            dateLabel = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
            status = 'amber';
          }

          return {
            name: data.title || data.name,
            city: data.city || 'Lagos',
            date: dateLabel,
            status,
          };
        });

        setTickerEvents(events.length >= 4 ? events : [...events, ...fallbackTicker].slice(0, 6));
      } catch (err) {
        console.error('Ticker load error:', err);
        setTickerEvents(fallbackTicker);
      }
    };

    loadTickerEvents();
  }, []);

  useEffect(() => {
    loadUserCount();
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

  const loadUserCount = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'users'));
      setUserCount(snapshot.size);
    } catch (err) {
      console.error('Error loading user count:', err);
      setUserCount(0);
    }
    setLoading(false);
  };

  const handleSearch = () => {
    if (searchQuery.trim()) {
      navigate(`/events?search=${searchQuery}&city=${selectedCity}`);
    } else {
      navigate(`/events?city=${selectedCity}`);
    }
  };

  const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
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

        {/* Hero Section */}
        <section className="bg-gradient-to-br from-cyan-50 to-white px-4">
          <div className="bg-gradient-to-br from-cyan-50 via-white to-cyan-50 pt-8 pb-8 px-4 md:px-6 relative overflow-hidden">
            <div className="absolute top-40 left-10 w-64 h-64 bg-cyan-100 rounded-full opacity-30 blur-3xl"></div>
            <div className="absolute bottom-20 right-20 w-96 h-96 bg-cyan-100 rounded-full opacity-20 blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-80 h-80 bg-cyan-200 rounded-full opacity-20 blur-3xl"></div>

            <div className="max-w-7xl mx-auto relative z-10">
              <div className="text-center mb-8">
                <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold mb-4">
                  Discover <span className="text-cyan-400 italic">Events</span> Happening{' '}
                  <br className="hidden sm:block" />
                  Near You
                </h1>
                <p className={'text-gray-500 text-sm md:text-base lg:text-lg px-4 max-w-xl mx-auto transition-opacity duration-500 ' + (fade ? 'opacity-100' : 'opacity-0')}>
                  {rotatingTexts[currentText]}
                </p>
              </div>

              <div className="flex flex-col lg:flex-row items-center justify-center gap-4 mb-16">
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
                <Link to="/categories">
                  <button className="w-full lg:w-auto bg-white text-gray-700 px-6 md:px-8 py-3 md:py-4 rounded-full font-medium shadow-lg hover:shadow-xl transition-shadow flex items-center justify-center gap-2">
                    <Grid size={20} />
                    Browse by Category
                  </button>
                </Link>
              </div>

              {/* Images Grid */}
              <div className="flex items-start justify-center gap-4 md:gap-6">
                <div className="relative flex-shrink-0">
                  <div className="w-44 h-44 sm:w-56 sm:h-56 md:w-64 md:h-64 bg-gradient-to-br from-orange-200 to-pink-200 rounded-2xl overflow-hidden shadow-xl">
                    <img src={heroImage01} alt="Friends outdoors" className="w-full h-full object-cover" />
                  </div>
                  <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-cyan-400 to-cyan-500 text-white px-3 sm:px-6 py-2 sm:py-3 rounded-2xl shadow-xl whitespace-nowrap">
                    <div className="flex items-center gap-2 md:gap-4">
                      <div>
                        {loading ? (
                          <div className="text-xl sm:text-2xl md:text-3xl font-bold">...</div>
                        ) : (
                          <div className="text-xl sm:text-2xl md:text-3xl font-bold">{formatNumber(userCount)}</div>
                        )}
                        <div className="text-xs opacity-90">Trusted Users</div>
                      </div>
                      <div className="flex -space-x-2">
                        <div className="w-5 h-5 sm:w-7 sm:h-7 md:w-8 md:h-8 rounded-full bg-red-400 border-2 border-white"></div>
                        <div className="w-5 h-5 sm:w-7 sm:h-7 md:w-8 md:h-8 rounded-full bg-yellow-400 border-2 border-white"></div>
                        <div className="w-5 h-5 sm:w-7 sm:h-7 md:w-8 md:h-8 rounded-full bg-blue-400 border-2 border-white"></div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-3 md:gap-6 flex-shrink-0">
                  <div className="w-44 h-28 sm:w-56 sm:h-32 md:w-64 md:h-40 bg-gradient-to-br from-blue-200 to-purple-200 rounded-2xl overflow-hidden shadow-xl">
                    <img src={heroImage2} alt="Conference" className="w-full h-full object-cover" />
                  </div>
                  <div className="w-44 h-28 sm:w-56 sm:h-32 md:w-64 md:h-40 bg-gradient-to-br from-amber-200 to-orange-200 rounded-2xl overflow-hidden shadow-xl">
                    <img src={heroImage3} alt="Workshop" className="w-full h-full object-cover" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* About Section */}
        <section className="bg-gray-50 py-16 md:py-24 px-4 md:px-6">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

              {/* Left Side - Image */}
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

              {/* Right Side - Content with animations */}
              <div ref={aboutRef} className="overflow-hidden">

                <p className={'text-gray-500 text-sm md:text-base mb-3 transition-all duration-500 ' + (aboutVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4')}>
                  We bring you the events happening near you
                </p>

                <h2 className={'text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-8 transition-all duration-500 ' + (aboutVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5')} style={{ transitionDelay: '100ms' }}>
                  Discover Local Happenings
                </h2>

                <h3 className={'text-xl md:text-2xl font-semibold text-cyan-400 mb-4 transition-all duration-500 ' + (aboutVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-5')} style={{ transitionDelay: '200ms' }}>
                  What Outing Station Does.
                </h3>

                <p className={'text-gray-600 text-base md:text-lg mb-6 leading-relaxed transition-all duration-500 ' + (aboutVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3')} style={{ transitionDelay: '300ms' }}>
                  Outing Station is a platform for discovering, browsing, and managing diverse events, from local gatherings to virtual webinars, with features like city-based search, category filters, and detailed event information.
                </p>

                {/* Ticker Label */}
                <p className={'text-xs text-gray-400 tracking-widest mb-2 transition-all duration-500 ' + (aboutVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2')} style={{ transitionDelay: '400ms' }}>
                  HAPPENING NOW & SOON
                </p>

                {/* Ticker */}
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

                {/* Feature Bullets with growing cyan bar */}
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
                          style={{ transitionDelay: featuresVisible[i] ? `${i * 150}ms` : '0ms' }}
                        />
                      </div>
                      <p className="text-gray-700 text-sm md:text-base">{feature}</p>
                    </div>
                  ))}
                </div>

                {/* Button */}
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

        {/* Categories */}
        <section className="py-2 px-4 bg-white">
          <div className="max-w-7xl mx-auto">
            <CategoryGrid />
          </div>
        </section>

        {/* University Events */}
        <section className="bg-gradient-to-br from-gray-100 to-gray-50 py-16 md:py-24 px-4 md:px-6">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div className="relative order-1 lg:order-1">
                <div className="rounded-3xl overflow-hidden shadow-2xl">
                  <img src={campusImage} alt="University campus" className="w-full h-64 md:h-80 lg:h-96 object-cover" />
                </div>
                <div className="absolute bottom-0 right-0 lg:right-12 transform translate-y-8 w-64 md:w-80 rounded-3xl overflow-hidden shadow-2xl border-4 border-white">
                  <img src={studentsImage} alt="Students hanging out" className="w-full h-48 md:h-56 object-cover" />
                </div>
              </div>
              <div className="order-2 lg:order-2">
                <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight">
                  Discover University Events
                </h2>
                <p className="text-gray-600 text-base md:text-lg mb-8 leading-relaxed">
                  From guest lectures to campus parties, find out what's happening at your school. Connect with your community and never miss a beat.
                </p>
                <Link to="/campus-events" className="inline-block bg-gradient-to-r from-cyan-400 to-cyan-500 text-white px-10 py-4 rounded-full font-medium shadow-lg hover:shadow-xl transition-shadow text-base md:text-lg">
                  Select University
                </Link>
              </div>
            </div>
          </div>
        </section>

        <div className="mt-12">
          <UniversitySelector />
        </div>

        <FeaturedEvents />
        <WebinarSection />
        <HowItWorks />
        <Footer />
      </div>
    </>
  );
}