import React from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

export default function CookiePolicy() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-4xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
            Cookie Policy
          </h1>
          <p className="text-lg text-gray-600">
            OutingStation uses cookies to:
          </p>
        </div>

        {/* Cookie Content */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-8">
          <div className="space-y-6">
            {/* Cookie 1 */}
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-gray-400 rounded-full flex-shrink-0 mt-2"></div>
              <p className="text-gray-700">
                Keep users logged in
              </p>
            </div>

            {/* Cookie 2 */}
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-gray-400 rounded-full flex-shrink-0 mt-2"></div>
              <p className="text-gray-700">
                Improve site performance
              </p>
            </div>

            {/* Cookie 3 */}
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-gray-400 rounded-full flex-shrink-0 mt-2"></div>
              <p className="text-gray-700">
                Understand how the platform is used
              </p>
            </div>

            {/* Info Section */}
            <div className="mt-8 pt-6 border-t border-gray-200 space-y-4">
              <p className="text-gray-700">
                Cookies help us deliver a better experience. You can manage or disable cookies through your browser settings.
              </p>
              <p className="text-gray-900 font-medium">
                By continuing to use OutingStation, you consent to our use of cookies.
              </p>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}