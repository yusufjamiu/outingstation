// src/utils/referralUtils.js

/**
 * Generate a unique referral code from user's name
 */
export function generateReferralCode(name, uid) {
  const namePart = name
    .split(' ')[0]
    .toUpperCase()
    .replace(/[^A-Z]/g, '')
    .substring(0, 6);
  const uidPart = uid.substring(uid.length - 4).toUpperCase();
  return `${namePart}${uidPart}`;
}

/**
 * Format credits for display
 */
export function formatCredits(amount) {
  return `₦${amount.toLocaleString()}`;
}

/**
 * Calculate total available credits (active + non-expired)
 */
export function calculateAvailableCredits(creditsHistory) {
  if (!creditsHistory || creditsHistory.length === 0) return 0;
  const now = new Date();
  return creditsHistory
    .filter(credit =>
      credit.status === 'active' &&
      new Date(credit.expiresAt) > now &&
      credit.amount > 0
    )
    .reduce((sum, credit) => sum + credit.amount, 0);
}

/**
 * Get credits sorted by expiry (oldest first - FIFO)
 */
export function getActiveCredits(creditsHistory) {
  if (!creditsHistory || creditsHistory.length === 0) return [];
  const now = new Date();
  return creditsHistory
    .filter(credit =>
      credit.status === 'active' &&
      new Date(credit.expiresAt) > now &&
      credit.amount > 0
    )
    .sort((a, b) => new Date(a.expiresAt) - new Date(b.expiresAt));
}

/**
 * Calculate how much credit can be applied (max 50% of total)
 */
export function calculateMaxCreditUsage(totalAmount, availableCredits) {
  const maxAllowed = Math.floor(totalAmount * 0.5);
  return Math.min(maxAllowed, availableCredits);
}

/**
 * Apply credits to transaction (FIFO - oldest first)
 */
export function applyCreditsToTransaction(creditsHistory, amountToUse) {
  const activeCredits = getActiveCredits(creditsHistory);
  let remaining = amountToUse;
  let creditsToDeduct = [];
  for (let credit of activeCredits) {
    if (remaining <= 0) break;
    const useAmount = Math.min(credit.amount, remaining);
    creditsToDeduct.push({ creditId: credit.id, amountUsed: useAmount });
    remaining -= useAmount;
  }
  return {
    totalApplied: amountToUse - remaining,
    creditsToDeduct: creditsToDeduct
  };
}

/**
 * Calculate days until credit expires
 */
export function getDaysUntilExpiry(expiryDate) {
  const now = new Date();
  const expiry = new Date(expiryDate);
  const diffTime = expiry - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

// ✅ NEW — Referral limits
export const REFERRAL_LIMIT_NORMAL = 20;      // regular users
export const REFERRAL_LIMIT_AMBASSADOR = 100; // ambassadors

/**
 * Check if user can still refer more people
 */
export function canStillRefer(totalReferrals, isAmbassador) {
  const limit = isAmbassador ? REFERRAL_LIMIT_AMBASSADOR : REFERRAL_LIMIT_NORMAL;
  return (totalReferrals || 0) < limit;
}

/**
 * Get remaining referral slots
 */
export function getReferralSlotsLeft(totalReferrals, isAmbassador) {
  const limit = isAmbassador ? REFERRAL_LIMIT_AMBASSADOR : REFERRAL_LIMIT_NORMAL;
  return Math.max(0, limit - (totalReferrals || 0));
}

/**
 * Check if user's credits are usable
 * Ambassadors: always usable
 * Regular users: only if admin has unlocked them
 */
export function areCreditsUsable(isAmbassador, creditsUnlocked) {
  if (isAmbassador) return true;
  return creditsUnlocked === true;
}