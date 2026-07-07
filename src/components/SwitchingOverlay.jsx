import React from 'react';
import { Store } from 'lucide-react';
import OutingStationLogo from '../assets/image.png';

// ✅ Shown briefly whenever the business switcher changes selection —
// applies the same way regardless of business type (Service Provider or
// Event Vendor), only the small label near the bottom differs.
export default function SwitchingOverlay({ business, category }) {
  if (!business) return null;

  const typeLabel = category === 'Event Vendor' ? 'Vendor Page' : 'Business Page';

  return (
    <div className="fixed inset-0 bg-gray-900 z-[100] flex flex-col items-center justify-center">
      <div className="relative w-32 h-32 mb-6">
        <div className="absolute inset-0 rounded-full border-4 border-gray-700 border-t-cyan-400 border-r-cyan-400 animate-spin" />
        <div className="absolute inset-2 rounded-full bg-white flex items-center justify-center overflow-hidden">
          {business.logoUrl ? (
            <img src={business.logoUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <Store size={40} className="text-cyan-500" />
          )}
        </div>
      </div>

      <p className="text-white text-lg font-medium">Switching to {business.businessName}...</p>

      <div className="absolute bottom-16 flex flex-col items-center gap-3">
        <span className="text-gray-400 text-xs font-bold uppercase tracking-widest">{typeLabel}</span>
        <img src={OutingStationLogo} alt="OutingStation" className="w-10 h-10 rounded-xl" />
      </div>
    </div>
  );
}