import React from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-4xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
            Terms of Service
          </h1>
          <p className="text-lg text-gray-600">
            By using OutingStation, you agree to the following terms:
          </p>
        </div>

        {/* Terms Content */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-8">
          <div className="space-y-6">
            {/* Term 1 */}
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-gray-400 rounded-full flex-shrink-0 mt-2"></div>
              <p className="text-gray-700">
                Users are responsible for the accuracy of information they provide.
              </p>
            </div>

            {/* Term 2 */}
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-gray-400 rounded-full flex-shrink-0 mt-2"></div>
              <p className="text-gray-700">
                Event organizers must ensure event details are truthful and lawful.
              </p>
            </div>

            {/* Term 3 */}
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-gray-400 rounded-full flex-shrink-0 mt-2"></div>
              <p className="text-gray-700">
                OutingStation is not responsible for event cancellations, changes, or disputes between users and organizers.
              </p>
            </div>

            {/* Term 4 */}
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-gray-400 rounded-full flex-shrink-0 mt-2"></div>
              <p className="text-gray-700">
                We reserve the right to remove content that violates our guidelines or applicable laws.
              </p>
            </div>

            {/* Term 5 */}
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-gray-400 rounded-full flex-shrink-0 mt-2"></div>
              <p className="text-gray-700">
                Misuse of the platform may result in account suspension or removal.
              </p>
            </div>

            {/* Update Notice */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <p className="text-gray-900 font-medium">
                These terms may be updated from time to time. Continued use of the platform means you accept any changes.
              </p>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}