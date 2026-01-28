import React from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-4xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
            Privacy Policy
          </h1>
          <p className="text-lg text-gray-600 mb-2">
            Your privacy matters to us.
          </p>
          <p className="text-gray-600">
            OutingStation collects only the information necessary to provide our services, including:
          </p>
        </div>

        {/* Privacy Content */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-8">
          <div className="space-y-6">
            {/* Data 1 */}
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-gray-400 rounded-full flex-shrink-0 mt-2"></div>
              <p className="text-gray-700">
                Name and email (for accounts)
              </p>
            </div>

            {/* Data 2 */}
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-gray-400 rounded-full flex-shrink-0 mt-2"></div>
              <p className="text-gray-700">
                City preference (optional)
              </p>
            </div>

            {/* Data 3 */}
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-gray-400 rounded-full flex-shrink-0 mt-2"></div>
              <p className="text-gray-700">
                Event interactions (saved events)
              </p>
            </div>

            {/* Commitment Section */}
            <div className="mt-8 pt-6 border-t border-gray-200 space-y-4">
              <p className="text-gray-900 font-medium">
                We do not sell or share your personal data with third parties for marketing purposes.
              </p>
              <p className="text-gray-700">
                Your data is securely stored using trusted services and is used only to improve your experience on the platform.
              </p>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}