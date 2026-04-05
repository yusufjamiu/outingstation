import { X, Copy, Check, ExternalLink } from 'lucide-react';
import { useState } from 'react';

export default function ManageLinkModal({ event, onClose }) {
  const [copied, setCopied] = useState(false);

  if (!event || !event.manageKey) {
    return null;
  }

  const manageLink = `https://outingstation.com/manage/${event.manageKey}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(manageLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenLink = () => {
    window.open(manageLink, '_blank');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <Check className="text-green-600" size={24} />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Event Created Successfully! 🎉</h2>
            </div>
            <p className="text-gray-600 ml-12">{event.title}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <X size={24} />
          </button>
        </div>

        {/* Manage Link Section */}
        <div className="bg-gradient-to-br from-cyan-50 to-blue-50 rounded-xl p-6 mb-6 border-2 border-cyan-200">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-2xl">🔗</span>
            <h3 className="text-lg font-bold text-gray-900">Organizer Management Link</h3>
          </div>
          
          <p className="text-sm text-gray-700 mb-4">
            Share this link with the event organizer so they can:
          </p>
          
          <ul className="text-sm text-gray-700 mb-4 space-y-1 ml-4">
            <li>✅ View all ticket sales</li>
            <li>✅ Check attendees in at the door</li>
            <li>✅ Export attendee list to CSV</li>
            <li>✅ See real-time stats and revenue</li>
          </ul>

          {/* Link Display */}
          <div className="bg-white rounded-lg p-4 border border-cyan-300 mb-4">
            <p className="text-xs text-gray-500 mb-2 font-medium">MANAGEMENT LINK</p>
            <p className="text-sm font-mono text-cyan-700 break-all">
              {manageLink}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleCopy}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition font-medium"
            >
              {copied ? (
                <>
                  <Check size={20} />
                  Copied!
                </>
              ) : (
                <>
                  <Copy size={20} />
                  Copy Link
                </>
              )}
            </button>
            
            <button
              onClick={handleOpenLink}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-medium"
            >
              <ExternalLink size={20} />
              Test Link
            </button>
          </div>
        </div>

        {/* Important Notes */}
        <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200 mb-6">
          <p className="text-sm font-semibold text-yellow-800 mb-2">⚠️ Important Notes:</p>
          <ul className="text-sm text-yellow-700 space-y-1">
            <li>• Keep this link private - anyone with it can manage the event</li>
            <li>• The link never expires and works even after the event</li>
            <li>• You can regenerate it anytime from the Admin Tickets page</li>
            <li>• Organizer doesn't need an account to use it</li>
          </ul>
        </div>

        {/* Event Stats */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-xs text-gray-500 mb-1">Ticket Price</p>
            <p className="text-lg font-bold text-gray-900">₦{event.ticketPrice?.toLocaleString()}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-xs text-gray-500 mb-1">Available Tickets</p>
            <p className="text-lg font-bold text-gray-900">{event.ticketsAvailable}</p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition font-medium"
          >
            Got it, thanks!
          </button>
        </div>
      </div>
    </div>
  );
}