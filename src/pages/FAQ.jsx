import React from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

export default function FAQ() {
  const faqs = [
    {
      question: 'What is OutingStation?',
      answer: 'OutingStation is a platform that helps users discover events and experiences around them and helps organizers promote their events.'
    },
    {
      question: 'Do I need an account to browse events?',
      answer: 'No. You can browse and view events without signing up.'
    },
    {
      question: 'When do I need an account?',
      answer: 'You\'ll need an account to:\n• Save events\n• Create and manage events\n• Access your profile'
    },
    {
      question: 'Is OutingStation free?',
      answer: 'Yes. Browsing and saving events is free. Event listing policies may evolve as the platform grows.'
    },
    {
      question: 'What types of events are allowed?',
      answer: 'We support:\n• Tech & business events\n• Arts & culture\n• Education & workshops\n• University events\n• Religious & community gatherings\n• Webinars and virtual events\n• And more'
    },
    {
      question: 'Can I list online events?',
      answer: 'Yes. We have a dedicated webinar category for virtual events.'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-4xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
            Frequently Asked Questions
          </h1>
          <p className="text-lg text-gray-600">
            We provide you the most previously asked questions.
          </p>
        </div>

        {/* FAQ List */}
        <div className="space-y-6">
          {faqs.map((faq, index) => (
            <div 
              key={index} 
              className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-8"
            >
              {/* Question */}
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 flex items-start gap-2">
                <span className="w-2 h-2 bg-gray-900 rounded-full flex-shrink-0 mt-2"></span>
                {faq.question}
              </h2>

              {/* Answer */}
              <div className="text-gray-700 whitespace-pre-line pl-4">
                {faq.answer}
              </div>
            </div>
          ))}
        </div>
      </div>

      <Footer />
    </div>
  );
}