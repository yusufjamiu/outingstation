// src/components/ReferralCard.jsx
// Display referral link and share options

import React, { useState } from 'react';
import { Copy, Share2, MessageCircle, Mail, Check } from 'lucide-react';

export default function ReferralCard({ referralCode, totalReferrals }) {
  const [copied, setCopied] = useState(false);
  
  const referralLink = `${window.location.origin}/signup?ref=${referralCode}`;
  
  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  const handleWhatsAppShare = () => {
    const message = `Join OutingStation and get ₦300 free credits! Use my referral link: ${referralLink}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  };
  
  const handleEmailShare = () => {
    const subject = 'Join OutingStation - Get ₦300 Free Credits!';
    const body = `I'm using OutingStation to discover amazing events!\n\nSign up with my referral link and we both get ₦300 credits:\n${referralLink}`;
    window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
  };
  
  const handleGenericShare = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Join OutingStation',
        text: 'Get ₦300 free credits when you sign up!',
        url: referralLink
      }).catch(() => {});
    } else {
      handleCopy();
    }
  };
  
  return (
    <div className="bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl p-6 text-white">
      <h3 className="text-xl font-bold mb-2">🎁 Refer & Earn</h3>
      <p className="text-cyan-50 mb-4">
        Share your link and earn ₦300 for every friend who signs up!
      </p>
      
      {/* Stats */}
      <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-cyan-100">Your Referral Code</p>
            <p className="text-2xl font-bold">{referralCode}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-cyan-100">Total Referrals</p>
            <p className="text-2xl font-bold">{totalReferrals || 0}</p>
          </div>
        </div>
      </div>
      
      {/* Referral Link */}
      <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3 mb-4">
        <p className="text-xs text-cyan-100 mb-2">Your Referral Link</p>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={referralLink}
            readOnly
            className="flex-1 bg-white/30 px-3 py-2 rounded-lg text-white text-sm outline-none"
          />
          <button
            onClick={handleCopy}
            className="bg-white text-cyan-600 p-2 rounded-lg hover:bg-cyan-50 transition"
          >
            {copied ? <Check size={20} /> : <Copy size={20} />}
          </button>
        </div>
      </div>
      
      {/* Share Buttons */}
      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={handleWhatsAppShare}
          className="bg-white/20 backdrop-blur-sm hover:bg-white/30 py-3 rounded-xl flex flex-col items-center gap-1 transition"
        >
          <MessageCircle size={20} />
          <span className="text-xs">WhatsApp</span>
        </button>
        <button
          onClick={handleEmailShare}
          className="bg-white/20 backdrop-blur-sm hover:bg-white/30 py-3 rounded-xl flex flex-col items-center gap-1 transition"
        >
          <Mail size={20} />
          <span className="text-xs">Email</span>
        </button>
        <button
          onClick={handleGenericShare}
          className="bg-white/20 backdrop-blur-sm hover:bg-white/30 py-3 rounded-xl flex flex-col items-center gap-1 transition"
        >
          <Share2 size={20} />
          <span className="text-xs">More</span>
        </button>
      </div>
      
      {/* Info */}
      <div className="mt-4 pt-4 border-t border-white/20">
        <p className="text-xs text-cyan-100">
          💡 Both you and your friend get ₦300 credits when they sign up!
        </p>
      </div>
    </div>
  );
}