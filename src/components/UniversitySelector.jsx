import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { MapPin, ArrowRight, School } from "lucide-react";

const UniversitySelector = () => {
  const [visibleCards, setVisibleCards] = useState([]);
  const [headerVisible, setHeaderVisible] = useState(false);
  const cardRefs = useRef([]);
  const headerRef = useRef(null);

  const universities = [
    { name: "University of Lagos (Unilag)", location: "Lagos, Nigeria", iconColor: "bg-blue-100 text-blue-600", hoverBorder: "hover:border-blue-400", slug: "university-of-lagos-unilag" },
    { name: "Obafemi Awolowo University (OAU)", location: "Ile-Ife, Nigeria", iconColor: "bg-green-100 text-green-600", hoverBorder: "hover:border-green-400", slug: "obafemi-awolowo-university-oau" },
    { name: "University of Ibadan (UI)", location: "Ibadan, Nigeria", iconColor: "bg-yellow-100 text-yellow-600", hoverBorder: "hover:border-yellow-400", slug: "university-of-ibadan-ui" },
    { name: "Ahmadu Bello University (ABU)", location: "Zaria, Nigeria", iconColor: "bg-purple-100 text-purple-600", hoverBorder: "hover:border-purple-400", slug: "ahmadu-bello-university-abu" },
    { name: "Covenant University (CU)", location: "Ota, Nigeria", iconColor: "bg-red-100 text-red-600", hoverBorder: "hover:border-red-400", slug: "covenant-university-cu" },
    { name: "University of Ilorin (Unilorin)", location: "Ilorin, Nigeria", iconColor: "bg-indigo-100 text-indigo-600", hoverBorder: "hover:border-indigo-400", slug: "university-of-ilorin-unilorin" },
  ];

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setHeaderVisible(true);
        } else {
          setHeaderVisible(false);
        }
      },
      { threshold: 0.3 }
    );
    if (headerRef.current) observer.observe(headerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const observers = cardRefs.current.map((el, i) => {
      if (!el) return null;
      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setTimeout(() => {
              setVisibleCards(prev => {
                if (prev.includes(i)) return prev;
                return [...prev, i];
              });
            }, i * 100);
          } else {
            setVisibleCards(prev => prev.filter(v => v !== i));
          }
        },
        { threshold: 0.15 }
      );
      obs.observe(el);
      return obs;
    });
    return () => observers.forEach(o => o && o.disconnect());
  }, []);

  return (
    <section className="bg-white py-16 px-6">
      <div className="max-w-5xl mx-auto">

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {universities.map((uni, index) => {
            const isVisible = visibleCards.includes(index);
            return (
              <Link
                key={index}
                ref={el => cardRefs.current[index] = el}
                to={'/campus-events?university=' + encodeURIComponent(uni.name)}
                className={'group border-2 border-gray-100 rounded-xl p-6 transition-all duration-500 hover:shadow-lg hover:-translate-y-1 ' + uni.hoverBorder + ' ' + (isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6')}
              >
                <div className="flex gap-4 items-center">
                  <div className={'w-12 h-12 rounded-full flex-shrink-0 flex items-center justify-center transition-transform duration-300 group-hover:scale-110 ' + uni.iconColor}>
                    <School size={22} />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 group-hover:text-cyan-500 transition-colors">{uni.name}</h3>
                    <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                      <MapPin size={14} /> {uni.location}
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        <div className="text-center mt-10">
          <Link
            to="/campus-events"
            className="inline-flex items-center gap-2 border-2 border-cyan-400 text-cyan-500 px-8 py-3 rounded-full font-medium hover:bg-cyan-400 hover:text-white transition-all duration-300 group"
          >
            Browse all universities
            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

      </div>
    </section>
  );
};

export default UniversitySelector;