import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CreditCard, Gift, Copy, Share2, Check } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import {
  formatCredits,
  getActiveCredits,
  canStillRefer,
  getReferralSlotsLeft,
  REFERRAL_LIMIT_NORMAL,
  REFERRAL_LIMIT_AMBASSADOR,
} from '../../utils/referralUtils';

export default function RewardsPage() {
  const navigate  = useNavigate();
  const { currentUser } = useAuth();
  const [userData, setUserData] = useState(null);
  const [copied, setCopied]     = useState(false);

  useEffect(() => {
    if (!currentUser) return;
    const unsub = onSnapshot(
      doc(db, 'users', currentUser.uid),
      (snap) => { if (snap.exists()) setUserData(snap.data()); },
      (err)  => console.error('RewardsPage snapshot error:', err)
    );
    return unsub;
  }, [currentUser]);

  const isAmbassador    = userData?.isAmbassador    === true;
  const creditsUnlocked = userData?.creditsUnlocked === true;
  const totalCredits    = userData?.totalCredits    || 0;
  const activeCredits   = getActiveCredits(userData?.creditsHistory || []);
  const referralCode    = userData?.referralCode    || '';
  const totalReferrals  = userData?.totalReferrals  || 0;
  const referralLimit   = isAmbassador ? REFERRAL_LIMIT_AMBASSADOR : REFERRAL_LIMIT_NORMAL;
  const slotsLeft       = getReferralSlotsLeft(totalReferrals, isAmbassador);
  const canRefer        = canStillRefer(totalReferrals, isAmbassador);
  const referralLink    = `https://outingstation.com/signup?ref=${referralCode}`;
  const creditAmount    = isAmbassador ? '₦500' : '₦300';

  const copyLink = async () => {
    await navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareLink = async () => {
    const text = `Join OutingStation and get ${creditAmount} free credits! Use my referral code: ${referralCode}\n\n${referralLink}`;
    if (navigator.share) {
      await navigator.share({ title: 'Join OutingStation!', text });
    } else {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 max-w-2xl mx-auto">

      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-full transition">
          <ArrowLeft size={20} className="text-gray-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Rewards</h1>
          <p className="text-sm text-gray-500">Credits, referrals & earnings</p>
        </div>
      </div>

      {/* ── Credits balance card ──────────────────────────────────────────── */}
      <div className="bg-gradient-to-br from-cyan-500 to-blue-600 text-white rounded-2xl p-5 sm:p-6 mb-5 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <CreditCard size={22} />
            <h2 className="text-lg font-bold">Available Credits</h2>
          </div>
          {/* ✅ Lock/unlock status */}
          {isAmbassador || creditsUnlocked ? (
            <span className="text-xs bg-emerald-400/30 border border-emerald-300/50 px-3 py-1 rounded-full font-semibold">
              ✅ Active
            </span>
          ) : (
            <button
              onClick={() => navigate('/credit-unlock-request')}
              className="text-xs bg-white/20 border border-white/30 px-3 py-1 rounded-full font-semibold hover:bg-white/30 transition"
            >
              🔒 Request Unlock →
            </button>
          )}
        </div>

        {/* Balance */}
        <p className="text-5xl font-black tracking-tight mb-1">{formatCredits(totalCredits)}</p>
        <p className="text-sm text-white/60 mb-4">
          {isAmbassador || creditsUnlocked
            ? 'Usable on ticket purchases at checkout'
            : 'Pending admin approval to use on purchases'}
        </p>

        {/* How to earn */}
        <div className="bg-white/10 rounded-xl p-3">
          <p className="text-xs font-bold text-white/80 mb-2 uppercase tracking-wide">How to Earn More</p>
          <div className="space-y-2">
            {[
              ['👥', `Refer a friend — earn ${creditAmount} per signup`],
              ['🎉', 'List an event — earn credits on approval'],
              ['📍', 'List a place — earn credits on approval'],
            ].map(([emoji, text]) => (
              <div key={text} className="flex items-center gap-2 text-xs text-white/80">
                <span>{emoji}</span><span>{text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Credit history ────────────────────────────────────────────────── */}
      {activeCredits.length > 0 && (
        <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm mb-5">
          <h3 className="text-base font-bold text-gray-900 mb-4">Credit History</h3>
          <div className="space-y-3">
            {activeCredits.map((credit) => (
              <div key={credit.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Gift size={14} className="text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">{credit.reason || 'Credit earned'}</p>
                    {credit.earnedAt && (
                      <p className="text-xs text-gray-400">
                        {new Date(credit.earnedAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    )}
                  </div>
                </div>
                <p className="text-sm font-bold text-emerald-600">{formatCredits(credit.amount)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Referral card ─────────────────────────────────────────────────── */}
      {referralCode && (
        <div className="bg-gradient-to-br from-cyan-600 to-blue-700 text-white rounded-2xl p-5 sm:p-6 mb-5 shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-bold">Invite Friends</h3>
            <span className="text-xs bg-white/20 border border-white/30 px-3 py-1 rounded-full font-semibold">
              {totalReferrals}/{referralLimit} referrals
            </span>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-white/20 rounded-full h-1.5 mb-1">
            <div
              className="bg-white h-1.5 rounded-full transition-all"
              style={{ width: `${Math.min((totalReferrals / referralLimit) * 100, 100)}%` }}
            />
          </div>
          <p className="text-xs text-white/60 mb-4">
            {canRefer ? `${slotsLeft} slot${slotsLeft !== 1 ? 's' : ''} remaining` : '🎉 Referral limit reached!'}
          </p>

          <p className="text-sm text-white/70 mb-4">
            {isAmbassador ? '⭐ Ambassador: Earn ₦500 per referral!' : `Share your code & earn ₦300 per signup`}
          </p>

          {/* Code box */}
          <div className="bg-white rounded-xl p-4 mb-4 flex items-center justify-between">
            <p className="text-2xl font-black text-cyan-600 tracking-widest font-mono">{referralCode}</p>
            <button onClick={copyLink} className="flex items-center gap-1.5 text-sm font-semibold text-cyan-600 hover:text-cyan-700 transition">
              {copied ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>

          {/* Share buttons */}
          {canRefer && (
            <div className="grid grid-cols-3 gap-2">
              <a
                href={`https://wa.me/?text=${encodeURIComponent(`Join OutingStation and get ${creditAmount} free credits! Use my referral code: ${referralCode}\n\n${referralLink}`)}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-1.5 py-2.5 border border-white/40 rounded-xl text-xs font-bold hover:bg-white/10 transition"
              >
                WhatsApp
              </a>
              <a
                href={`mailto:?subject=${encodeURIComponent('Join OutingStation!')}&body=${encodeURIComponent(`Join OutingStation and get ${creditAmount} free credits! Use my referral code: ${referralCode}\n\n${referralLink}`)}`}
                className="flex items-center justify-center gap-1.5 py-2.5 border border-white/40 rounded-xl text-xs font-bold hover:bg-white/10 transition"
              >
                Email
              </a>
              <button
                onClick={shareLink}
                className="flex items-center justify-center gap-1.5 py-2.5 border border-white/40 rounded-xl text-xs font-bold hover:bg-white/10 transition"
              >
                <Share2 size={13} /> More
              </button>
            </div>
          )}

          {!canRefer && (
            <div className="bg-white/10 rounded-xl p-3 text-center text-sm text-white/80">
              {isAmbassador
                ? `🎉 You've maxed out the ambassador limit of ${referralLimit} referrals!`
                : '🎉 Limit reached! Contact us to become an Ambassador.'}
            </div>
          )}
        </div>
      )}

      {/* ── AI prompt info ────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm mb-5">
        <h3 className="text-base font-bold text-gray-900 mb-3">🤖 Outing AI Credits</h3>
        <div className="space-y-2 text-sm text-gray-600">
          <div className="flex items-center justify-between py-2 border-b border-gray-50">
            <span>Free prompts per day</span>
            <span className="font-bold text-cyan-600">3 prompts</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-gray-50">
            <span>Cost per extra prompt</span>
            <span className="font-bold text-orange-500">₦50 credits</span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span>Free prompts reset</span>
            <span className="font-bold text-gray-700">Every 24 hours</span>
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-3">
          Credits are automatically deducted when you've used your 3 free daily prompts. Earn more credits by referring friends or listing events and places.
        </p>
      </div>

    </div>
  );
}