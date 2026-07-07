import { useState, useEffect, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, MapPin, ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';

// ✅ FIX: this used to run its own getDocs(collection(db, 'events')) fetch,
// completely separately from LandingPage's ticker — meaning every landing
// page load read the entire events collection TWICE. Now the parent fetches
// once and passes the already-filtered list down as `events`.
export default function EventsCarousel({ events: rawEvents = [] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [itemsPerView, setItemsPerView] = useState(1);
  const intervalRef = useRef(null);

  const events = useMemo(() => {
    return rawEvents.slice(0, 8).map(e => ({
      id: e.id,
      slug: e.slug || null,
      title: e.title || e.name,
      image: e.imageUrl || e.image || e.coverImage || '',
      category: e.category || 'Event',
      city: (e.location || 'Lagos').split(',')[0].trim(),
      date: e._date
        ? e._date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
        : '',
    }));
  }, [rawEvents]);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const update = () => setItemsPerView(mq.matches ? 3 : 1);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    const maxIndex = Math.max(0, events.length - itemsPerView);
    setActiveIndex(prev => Math.min(prev, maxIndex));
  }, [itemsPerView, events.length]);

  const maxIndex = Math.max(0, events.length - itemsPerView);

  useEffect(() => {
    if (events.length <= itemsPerView) return;
    intervalRef.current = setInterval(() => {
      setActiveIndex(prev => (prev >= maxIndex ? 0 : prev + 1));
    }, 4000);
    return () => clearInterval(intervalRef.current);
  }, [events, itemsPerView, maxIndex]);

  const goTo = (i) => {
    clearInterval(intervalRef.current);
    setActiveIndex(Math.max(0, Math.min(i, maxIndex)));
  };

  const goDelta = (delta) => {
    clearInterval(intervalRef.current);
    setActiveIndex(prev => Math.max(0, Math.min(prev + delta, maxIndex)));
  };

  if (events.length === 0) return null;

  const slideWidthPct = 100 / itemsPerView;

  return (
    <div className="w-full max-w-6xl mx-auto px-4">
      <div className="relative">
        <div className="relative w-full overflow-hidden rounded-2xl" style={{ height: 'clamp(240px, 34vw, 380px)' }}>
          <div
            className="flex h-full transition-transform duration-500 ease-out"
            style={{ transform: `translateX(-${activeIndex * slideWidthPct}%)` }}
          >
            {events.map((event) => (
              <Link
                to={event.slug ? `/e/${event.slug}` : (event.id ? `/event/${event.id}` : '/events')}
                key={event.id}
                className="relative h-full flex-shrink-0 px-1.5 md:px-2.5"
                style={{ width: `${slideWidthPct}%` }}
              >
                <div className="relative w-full h-full rounded-2xl overflow-hidden shadow-xl">
                  <div className="absolute inset-0 bg-gray-900">
                    {event.image && (
                      <img src={event.image} alt={event.title} className="w-full h-full object-cover" />
                    )}
                  </div>

                  <div className="absolute top-3 left-3">
                    <span className="bg-cyan-400 text-white text-xs font-semibold px-3 py-1.5 rounded-full">
                      #{event.category}
                    </span>
                  </div>

                  <div
                    className="absolute bottom-0 left-0 right-0 px-4 py-3.5 border-t border-white/10"
                    style={{
                      backgroundColor: 'rgba(10, 22, 40, 0.82)',
                      backdropFilter: 'blur(8px)',
                      WebkitBackdropFilter: 'blur(8px)',
                    }}
                  >
                    <p className="text-white text-base font-semibold truncate">{event.title}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="flex items-center gap-1 text-xs text-gray-300 flex-shrink-0">
                        <Calendar size={13} />
                        {event.date}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-gray-300 min-w-0">
                        <MapPin size={13} className="text-cyan-400 flex-shrink-0" />
                        <span className="truncate">{event.city}</span>
                      </span>
                      <span className="ml-auto flex-shrink-0 bg-cyan-400 text-white text-xs font-semibold px-3 py-1.5 rounded-full flex items-center gap-1">
                        View <ArrowRight size={12} />
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {maxIndex > 0 && (
          <>
            <button
              onClick={() => goDelta(-1)}
              disabled={activeIndex === 0}
              aria-label="Previous event"
              className="hidden md:flex absolute -left-5 top-1/2 -translate-y-1/2 z-20 w-10 h-10 items-center justify-center rounded-full bg-white shadow-md hover:shadow-lg transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={20} className="text-gray-700" />
            </button>
            <button
              onClick={() => goDelta(1)}
              disabled={activeIndex === maxIndex}
              aria-label="Next event"
              className="hidden md:flex absolute -right-5 top-1/2 -translate-y-1/2 z-20 w-10 h-10 items-center justify-center rounded-full bg-white shadow-md hover:shadow-lg transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight size={20} className="text-gray-700" />
            </button>
          </>
        )}
      </div>

      {maxIndex > 0 && (
        <div className="flex items-center justify-center gap-1.5 mt-4">
          {Array.from({ length: maxIndex + 1 }).map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              aria-label={`Go to slide ${i + 1}`}
              className={
                'h-1.5 rounded-full transition-all ' +
                (i === activeIndex ? 'w-5 bg-cyan-400' : 'w-1.5 bg-gray-300')
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}