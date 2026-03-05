import React from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { Mail, MessageCircle, Globe } from 'lucide-react';


export default function ContactUs() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-4xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
            Contact Us
          </h1>
          <p className="text-lg text-gray-600">
            Question?, Suggestion?, We'd love to hear from you!
          </p>
        </div>

        {/* Contact Info Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 mb-8">
          <div className="space-y-6">
            {/* Email */}
            <div className="flex items-start gap-4">
              <Mail className="text-cyan-500 flex-shrink-0 mt-1" size={20} />
              <div>
                <p className="text-gray-600 mb-1">Email:</p>
                <a 
                  href="mailto:Admin@outingstation.com" 
                  className="text-gray-900 font-medium hover:text-cyan-500 transition underline"
                >
                  Admin@outingstation.com
                </a>
              </div>
            </div>

            {/* Phone */}
            <div className="flex items-start gap-4">
  <MessageCircle className="text-green-500 flex-shrink-0 mt-1" size={20} />
  <div>
    <p className="text-gray-600 mb-1">WhatsApp:</p>
    <div className="space-y-1">
      <a 
        href="https://wa.me/2347045189590" 
        target="_blank"
        rel="noopener noreferrer"
        className="text-gray-900 font-medium hover:text-green-500 transition block"
      >
        +2347045189590
      </a>

      <a 
        href="https://wa.me/2349030373510" 
        target="_blank"
        rel="noopener noreferrer"
        className="text-gray-900 font-medium hover:text-green-500 transition block"
      >
        +2349030373510
      </a>
    </div>
  </div>
</div>

            {/* Website
            <div className="flex items-start gap-4">
              <Globe className="text-cyan-500 flex-shrink-0 mt-1" size={20} />
              <div>
                <p className="text-gray-600 mb-1">Website:</p>
                <a 
                  href="https://www.outingstation.com" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-900 font-medium hover:text-cyan-500 transition underline"
                >
                  www.outingstation.com
                </a>
              </div>
            </div> */}
          </div>

          {/* Response Time */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-gray-900 font-medium">
              We aim to respond as quickly as possible!
            </p>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}