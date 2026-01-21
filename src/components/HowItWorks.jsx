import React from 'react';
import { MapPin, Ticket, PartyPopper, ArrowRight } from 'lucide-react';

const HowItWorks = () => {
  const steps = [
    {
      number: '1',
      icon: MapPin,
      title: 'Choose Your City',
      description: 'Select from our network of vibrant locations, to find exactly what\'s happening near you.'
    },
    {
      number: '2',
      icon: Ticket,
      title: 'Discover Events',
      description: 'Browse curated lists filtered by date, category or vibe to find your perfect match.'
    },
    {
      number: '3',
      icon: PartyPopper,
      title: 'Attend and Enjoy!',
      description: 'Get your registration done instantly, head out and make unforgettable memories with friends.'
    }
  ];

  return (
    <section className="bg-gradient-to-br from-gray-50 to-white py-16 md:py-24 px-4 md:px-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
            How Does <span className="text-cyan-400">OutingStation</span> Work?
          </h2>
          <p className="text-gray-600 text-base md:text-lg max-w-4xl mx-auto leading-relaxed">
            We connect you with the heartbeat of your city whether you're looking for an underground concert, cultural festivals, tour or art exhibition. OutingStation curates the best local event so you never miss out.
          </p>
        </div>

        {/* Steps */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12 mb-12 relative">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <div key={index} className="relative">
                {/* Arrow between steps (desktop only) */}
                {index < steps.length - 1 && (
                  <div className="hidden md:block absolute top-20 left-full w-full -translate-x-1/2 z-0">
                    <svg 
                      className="w-full h-8 text-gray-300" 
                      viewBox="0 0 100 20"
                      fill="none"
                    >
                      <path 
                        d="M5 10 L90 10" 
                        stroke="currentColor" 
                        strokeWidth="2"
                        strokeDasharray="4,4"
                      />
                      <path 
                        d="M85 5 L95 10 L85 15" 
                        stroke="currentColor" 
                        strokeWidth="2"
                        fill="none"
                      />
                    </svg>
                  </div>
                )}

                {/* Step Card */}
                <div className="text-center relative z-10">
                  {/* Icon Circle */}
                  <div className="relative inline-block mb-6">
                    {/* Number Badge */}
                    <div className="absolute -top-2 -right-2 w-7 h-7 bg-cyan-400 text-white rounded-full flex items-center justify-center text-sm font-bold z-10">
                      {step.number}
                    </div>
                    {/* Icon Container */}
                    <div className="w-20 h-20 bg-white border-4 border-gray-100 rounded-full flex items-center justify-center shadow-md">
                      <Icon className="text-cyan-400" size={32} />
                    </div>
                  </div>

                  {/* Title */}
                  <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-3">
                    {step.title}
                  </h3>

                  {/* Description */}
                  <p className="text-gray-600 text-sm md:text-base leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* CTA Button */}
        <div className="text-center mt-12">
          <button className="inline-flex items-center gap-2 bg-gradient-to-r from-cyan-400 to-cyan-500 text-white px-10 py-4 rounded-full font-medium shadow-lg hover:shadow-xl transition-all group">
            Get Started Now
            <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;