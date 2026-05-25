import React, { useState } from 'react';
import { Copy, Share2, MessageCircle, Mail, Check, Lock, Unlock } from 'lucide-react';
import {
  canStillRefer,
  getReferralSlotsLeft,
  areCreditsUsable,
  REFERRAL_LIMIT_NORMAL,
  REFERRAL_LIMIT_AMBASSADOR,
  formatCredits,
  calculateAvailableCredits,
} from '../utils/referralUtils';

export default function ReferralCard({
  referralCode,
  totalReferrals = 0,
  isAmbassador = false,
  creditsUnlocked = false,
  creditsHistory = [],
}) {
  const [copied, setCopied] = useState(false);

  const referralLink = `${window.location.origin}/signup?ref=${referralCode}`;
  const limit = isAmbassador ? REFERRAL_LIMIT_AMBASSADOR : REFERRAL_LIMIT_NORMAL;
  const slotsLeft = getReferralSlotsLeft(totalReferrals, isAmbassador);
  const canRefer = canStillRefer(totalReferrals, isAmbassador);
  const creditsUsable = areCreditsUsable(isAmbassador, creditsUnlocked);
  const availableCredits = calculateAvailableCredits(creditsHistory);

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
    <div className="space-y-4">

      {/* ✅ Credits lock status — show for everyone */}
      {/* Ambassadors: always unlocked. Regular users: depends on admin */}
      <div className={`flex items-center gap-3 rounded-xl px-4 py-3 border ${
        creditsUsable
          ? 'bg-emerald-50 border-emerald-200'
          : 'bg-orange-50 border-orange-200'
      }`}>
        {creditsUsable
          ? <Unlock size={18} className="text-emerald-500 flex-shrink-0" />
          : <Lock size={18} className="text-orange-500 flex-shrink-0" />
        }
        <div className="flex-1">
          <p className={`text-sm font-bold ${creditsUsable ? 'text-emerald-800' : 'text-orange-800'}`}>
            Credits {creditsUsable ? 'Unlocked ✅' : 'Locked 🔒'}
          </p>
          <p className={`text-xs ${creditsUsable ? 'text-emerald-600' : 'text-orange-600'}`}>
            {creditsUsable
              ? availableCredits > 0
                ? `You have ${formatCredits(availableCredits)} ready to use on ticket purchases`
                : 'Your credits are active and ready to use'
              : (
                <span>
                  Your credits are pending admin approval.{' '}
                  <a href="/credit-unlock-request" className="underline font-semibold">
                    Click here to request unlock →
                  </a>
                </span>
              )}
          </p>
        </div>
        {!creditsUsable && availableCredits > 0 && (
          <div className="text-right flex-shrink-0">
            <p className="text-sm text-orange-600 font-bold">{formatCredits(availableCredits)}</p>
            <p className="text-xs text-orange-400">pending</p>
          </div>
        )}
      </div>

      {/* Main referral card */}
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
              <p className="text-2xl font-bold tracking-wider">{referralCode}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-cyan-100">Referrals</p>
              <p className="text-2xl font-bold">{totalReferrals} / {limit}</p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-3">
            <div className="w-full bg-white/20 rounded-full h-2">
              <div
                className="bg-white h-2 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, (totalReferrals / limit) * 100)}%` }}
              />
            </div>
            <p className="text-xs text-cyan-100 mt-1">
              {canRefer
                ? `${slotsLeft} slot${slotsLeft !== 1 ? 's' : ''} remaining`
                : '🎉 Referral limit reached!'}
            </p>
          </div>
        </div>

        {/* Referral Link */}
        {canRefer ? (
          <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3 mb-4">
            <p className="text-xs text-cyan-100 mb-2">Your Referral Link</p>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={referralLink}
                readOnly
                className="flex-1 bg-white/30 px-3 py-2 rounded-lg text-white text-sm outline-none truncate"
              />
              <button
                onClick={handleCopy}
                className="bg-white text-cyan-600 p-2 rounded-lg hover:bg-cyan-50 transition flex-shrink-0"
              >
                {copied ? <Check size={20} /> : <Copy size={20} />}
              </button>
            </div>
            {copied && (
              <p className="text-xs text-cyan-200 mt-1.5">✓ Link copied to clipboard!</p>
            )}
          </div>
        ) : (
          <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 mb-4 text-center">
            <p className="text-sm font-semibold">🎉 You've reached your referral limit!</p>
            <p className="text-xs text-cyan-100 mt-1">
              {isAmbassador
                ? `You've maxed out the ambassador limit of ${REFERRAL_LIMIT_AMBASSADOR} referrals.`
                : `Want to refer more? Contact us to become an Ambassador and refer up to ${REFERRAL_LIMIT_AMBASSADOR} people.`}
            </p>
          </div>
        )}

        {/* Share Buttons */}
        {canRefer && (
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
        )}

        {/* Info */}
        <div className="mt-4 pt-4 border-t border-white/20">
          <p className="text-xs text-cyan-100">
            💡 Both you and your friend get ₦300 credits when they sign up and are approved!
          </p>
        </div>
      </div>
    </div>
  );
}