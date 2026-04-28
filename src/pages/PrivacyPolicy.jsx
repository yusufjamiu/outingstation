import React from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { Shield, Database, Users, Lock, Cookie, Trash2, Mail } from 'lucide-react';

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
          <p className="text-sm text-gray-500">
            Last Updated: April 2026
          </p>
        </div>

        {/* Introduction */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-8 mb-8">
          <p className="text-gray-700 leading-relaxed">
            OutingStation Limited ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our website and mobile application (collectively, the "Platform"). Please read this policy carefully.
          </p>
        </div>

        {/* Section 1: Information We Collect */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-8 mb-8">
          <div className="flex items-center gap-3 mb-6">
            <Database className="text-cyan-500" size={24} />
            <h2 className="text-2xl font-bold text-gray-900">1. Information We Collect</h2>
          </div>

          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Personal Information:</h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-cyan-400 rounded-full flex-shrink-0 mt-2"></div>
                  <p className="text-gray-700">
                    <strong>Name and Email:</strong> Required for account creation and communication
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-cyan-400 rounded-full flex-shrink-0 mt-2"></div>
                  <p className="text-gray-700">
                    <strong>Phone Number:</strong> Required for event updates, ticket confirmations, and WhatsApp notifications
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-cyan-400 rounded-full flex-shrink-0 mt-2"></div>
                  <p className="text-gray-700">
                    <strong>City/Location:</strong> Optional, helps personalize event recommendations
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-cyan-400 rounded-full flex-shrink-0 mt-2"></div>
                  <p className="text-gray-700">
                    <strong>Payment Information:</strong> Processed securely through Paystack (we do not store card details)
                  </p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Usage Information:</h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-cyan-400 rounded-full flex-shrink-0 mt-2"></div>
                  <p className="text-gray-700">Events you view, save, or purchase tickets for</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-cyan-400 rounded-full flex-shrink-0 mt-2"></div>
                  <p className="text-gray-700">Device information (browser type, operating system)</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-cyan-400 rounded-full flex-shrink-0 mt-2"></div>
                  <p className="text-gray-700">Log data (IP address, access times, pages viewed)</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: How We Use Your Information */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-8 mb-8">
          <div className="flex items-center gap-3 mb-6">
            <Users className="text-cyan-500" size={24} />
            <h2 className="text-2xl font-bold text-gray-900">2. How We Use Your Information</h2>
          </div>

          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-cyan-400 rounded-full flex-shrink-0 mt-2"></div>
              <p className="text-gray-700">
                <strong>Provide Services:</strong> Process ticket purchases, send confirmations, and deliver event updates
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-cyan-400 rounded-full flex-shrink-0 mt-2"></div>
              <p className="text-gray-700">
                <strong>Communication:</strong> Send event reminders, notifications, and platform updates via email and WhatsApp
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-cyan-400 rounded-full flex-shrink-0 mt-2"></div>
              <p className="text-gray-700">
                <strong>Personalization:</strong> Recommend events based on your location and preferences
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-cyan-400 rounded-full flex-shrink-0 mt-2"></div>
              <p className="text-gray-700">
                <strong>Security:</strong> Prevent fraud, ensure platform safety, and verify user identities
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-cyan-400 rounded-full flex-shrink-0 mt-2"></div>
              <p className="text-gray-700">
                <strong>Improvement:</strong> Analyze usage patterns to enhance user experience and platform features
              </p>
            </div>
          </div>
        </div>

        {/* Section 3: Third-Party Services */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-8 mb-8">
          <div className="flex items-center gap-3 mb-6">
            <Shield className="text-cyan-500" size={24} />
            <h2 className="text-2xl font-bold text-gray-900">3. Third-Party Services</h2>
          </div>

          <p className="text-gray-700 mb-4">We use trusted third-party services to operate our platform:</p>

          <div className="space-y-4">
            <div className="bg-gray-50 rounded-xl p-4">
              <h3 className="font-semibold text-gray-900 mb-2">Paystack</h3>
              <p className="text-gray-700 text-sm">Processes all payments securely. We do not store your payment card details.</p>
              <a href="https://paystack.com/privacy" target="_blank" rel="noopener noreferrer" className="text-cyan-500 text-sm hover:underline">
                View Paystack Privacy Policy →
              </a>
            </div>

            <div className="bg-gray-50 rounded-xl p-4">
              <h3 className="font-semibold text-gray-900 mb-2">Firebase (Google)</h3>
              <p className="text-gray-700 text-sm">Hosts our database, authentication, and cloud storage.</p>
              <a href="https://firebase.google.com/support/privacy" target="_blank" rel="noopener noreferrer" className="text-cyan-500 text-sm hover:underline">
                View Firebase Privacy Policy →
              </a>
            </div>

            <div className="bg-gray-50 rounded-xl p-4">
              <h3 className="font-semibold text-gray-900 mb-2">Cloudinary</h3>
              <p className="text-gray-700 text-sm">Stores and delivers event images and media.</p>
              <a href="https://cloudinary.com/privacy" target="_blank" rel="noopener noreferrer" className="text-cyan-500 text-sm hover:underline">
                View Cloudinary Privacy Policy →
              </a>
            </div>

            <div className="bg-gray-50 rounded-xl p-4">
              <h3 className="font-semibold text-gray-900 mb-2">WhatsApp Business API (Meta)</h3>
              <p className="text-gray-700 text-sm">Sends event notifications and ticket confirmations via WhatsApp.</p>
              <a href="https://www.whatsapp.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-cyan-500 text-sm hover:underline">
                View WhatsApp Privacy Policy →
              </a>
            </div>
          </div>
        </div>

        {/* Section 4: Cookies */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-8 mb-8">
          <div className="flex items-center gap-3 mb-6">
            <Cookie className="text-cyan-500" size={24} />
            <h2 className="text-2xl font-bold text-gray-900">4. Cookies and Tracking</h2>
          </div>

          <p className="text-gray-700 mb-4">OutingStation uses cookies to:</p>

          <div className="space-y-3 mb-6">
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-cyan-400 rounded-full flex-shrink-0 mt-2"></div>
              <p className="text-gray-700">Keep users logged in</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-cyan-400 rounded-full flex-shrink-0 mt-2"></div>
              <p className="text-gray-700">Remember your preferences and saved events</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-cyan-400 rounded-full flex-shrink-0 mt-2"></div>
              <p className="text-gray-700">Improve site performance and user experience</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-cyan-400 rounded-full flex-shrink-0 mt-2"></div>
              <p className="text-gray-700">Understand how the platform is used</p>
            </div>
          </div>

          <p className="text-gray-700">
            You can manage or disable cookies through your browser settings. Note that disabling cookies may affect platform functionality.
          </p>
        </div>

        {/* Section 5: Data Sharing */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-8 mb-8">
          <div className="flex items-center gap-3 mb-6">
            <Lock className="text-cyan-500" size={24} />
            <h2 className="text-2xl font-bold text-gray-900">5. Data Sharing and Disclosure</h2>
          </div>

          <div className="space-y-4">
            <p className="text-gray-900 font-semibold">
              We do NOT sell or share your personal data with third parties for marketing purposes.
            </p>

            <p className="text-gray-700">We may share your information only in these cases:</p>

            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-cyan-400 rounded-full flex-shrink-0 mt-2"></div>
                <p className="text-gray-700">
                  <strong>Event Organizers:</strong> Your name and email when you purchase tickets (necessary for event entry)
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-cyan-400 rounded-full flex-shrink-0 mt-2"></div>
                <p className="text-gray-700">
                  <strong>Service Providers:</strong> Trusted third-party services listed above to operate our platform
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-cyan-400 rounded-full flex-shrink-0 mt-2"></div>
                <p className="text-gray-700">
                  <strong>Legal Requirements:</strong> When required by law or to protect our rights and safety
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Section 6: Data Security */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-8 mb-8">
          <div className="flex items-center gap-3 mb-6">
            <Shield className="text-cyan-500" size={24} />
            <h2 className="text-2xl font-bold text-gray-900">6. Data Security</h2>
          </div>

          <p className="text-gray-700 mb-4">
            Your data is securely stored using industry-standard encryption and trusted cloud services. We implement appropriate technical and organizational measures to protect your information from unauthorized access, loss, or misuse.
          </p>

          <p className="text-gray-700">
            However, no method of transmission over the internet is 100% secure. While we strive to protect your data, we cannot guarantee absolute security.
          </p>
        </div>

        {/* Section 7: Your Rights */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-8 mb-8">
          <div className="flex items-center gap-3 mb-6">
            <Trash2 className="text-cyan-500" size={24} />
            <h2 className="text-2xl font-bold text-gray-900">7. Your Rights</h2>
          </div>

          <p className="text-gray-700 mb-4">You have the right to:</p>

          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-cyan-400 rounded-full flex-shrink-0 mt-2"></div>
              <p className="text-gray-700">
                <strong>Access:</strong> Request a copy of your personal data
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-cyan-400 rounded-full flex-shrink-0 mt-2"></div>
              <p className="text-gray-700">
                <strong>Correction:</strong> Update or correct inaccurate information
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-cyan-400 rounded-full flex-shrink-0 mt-2"></div>
              <p className="text-gray-700">
                <strong>Deletion:</strong> Request deletion of your account and personal data
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-cyan-400 rounded-full flex-shrink-0 mt-2"></div>
              <p className="text-gray-700">
                <strong>Opt-Out:</strong> Unsubscribe from marketing emails (event notifications will still be sent for purchased tickets)
              </p>
            </div>
          </div>

          <div className="mt-6 p-4 bg-cyan-50 rounded-xl">
            <p className="text-gray-700">
              To exercise these rights, please contact us at{' '}
              <Link to="/contact" className="text-cyan-600 font-semibold hover:underline">
                our contact page
              </Link>{' '}
              or email{' '}
              <a href="mailto:admin@outingstation.com" className="text-cyan-600 font-semibold hover:underline">
                admin@outingstation.com
              </a>
            </p>
          </div>
        </div>

        {/* Section 8: Data Retention */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Data Retention</h2>
          <p className="text-gray-700">
            We retain your personal information for as long as your account is active or as needed to provide services. If you request account deletion, we will remove your data within 30 days, except where retention is required by law (e.g., transaction records for tax purposes).
          </p>
        </div>

        {/* Section 9: Children's Privacy */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">9. Children's Privacy</h2>
          <p className="text-gray-700">
            OutingStation is not intended for users under the age of 13. We do not knowingly collect personal information from children under 13. If you believe we have collected data from a child, please contact us immediately.
          </p>
        </div>

        {/* Section 10: Changes to Policy */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">10. Changes to This Policy</h2>
          <p className="text-gray-700">
            We may update this Privacy Policy from time to time. We will notify you of significant changes by posting the new policy on this page and updating the "Last Updated" date. Continued use of the platform after changes constitutes acceptance of the updated policy.
          </p>
        </div>

        {/* Contact Section */}
        <div className="bg-gradient-to-br from-cyan-50 to-white rounded-2xl shadow-sm border border-cyan-100 p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-4">
            <Mail className="text-cyan-500" size={24} />
            <h2 className="text-2xl font-bold text-gray-900">Contact Us</h2>
          </div>

          <p className="text-gray-700 mb-4">
            If you have questions about this Privacy Policy or how we handle your data, please contact us:
          </p>

          <div className="space-y-2">
            <p className="text-gray-700">
              <strong>Email:</strong>{' '}
              <a href="mailto:admin@outingstation.com" className="text-cyan-600 hover:underline">
                admin@outingstation.com
              </a>
            </p>
            <p className="text-gray-700">
              <strong>Company:</strong> OutingStation Limited (CAC Registered)
            </p>
            <p className="text-gray-700">
              <strong>Location:</strong> Nigeria
            </p>
          </div>

          <Link 
            to="/contact"
            className="inline-block mt-4 bg-gradient-to-r from-cyan-400 to-cyan-500 text-white px-6 py-3 rounded-xl font-medium hover:shadow-lg transition-shadow"
          >
            Visit Contact Page
          </Link>
        </div>
      </div>

      <Footer />
    </div>
  );
}