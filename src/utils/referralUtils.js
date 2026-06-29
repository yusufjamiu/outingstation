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
  return `₦${Number(amount).toLocaleString()}`;
}

/**
 * Calculate total available credits
 * ✅ No expiry — credits never expire
 */
export function calculateAvailableCredits(creditsHistory) {
  if (!creditsHistory || creditsHistory.length === 0) return 0;
  return creditsHistory
    .filter(credit => credit.status === 'active' && credit.amount > 0)
    .reduce((sum, credit) => sum + credit.amount, 0);
}

/**
 * Get active credits sorted by date earned (oldest first - FIFO)
 * ✅ No expiry check
 */
export function getActiveCredits(creditsHistory) {
  if (!creditsHistory || creditsHistory.length === 0) return [];
  return creditsHistory
    .filter(credit => credit.status === 'active' && credit.amount > 0)
    .sort((a, b) => new Date(a.earnedAt) - new Date(b.earnedAt));
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
  const creditsToDeduct = [];
  for (const credit of activeCredits) {
    if (remaining <= 0) break;
    const useAmount = Math.min(credit.amount, remaining);
    creditsToDeduct.push({ creditId: credit.id, amountUsed: useAmount });
    remaining -= useAmount;
  }
  return {
    totalApplied: amountToUse - remaining,
    creditsToDeduct,
  };
}

// ── Referral limits ───────────────────────────────────────────────────────────

export const REFERRAL_LIMIT_NORMAL      = 20;
export const REFERRAL_LIMIT_AMBASSADOR  = 100;

export function canStillRefer(totalReferrals, isAmbassador) {
  const limit = isAmbassador ? REFERRAL_LIMIT_AMBASSADOR : REFERRAL_LIMIT_NORMAL;
  return (totalReferrals || 0) < limit;
}

export function getReferralSlotsLeft(totalReferrals, isAmbassador) {
  const limit = isAmbassador ? REFERRAL_LIMIT_AMBASSADOR : REFERRAL_LIMIT_NORMAL;
  return Math.max(0, limit - (totalReferrals || 0));
}

// ── Credit usability ──────────────────────────────────────────────────────────

export function areCreditsUsable(isAmbassador, creditsUnlocked) {
  if (isAmbassador) return true;
  return creditsUnlocked === true;
}

export function hasUsedCreditsOnEvent(creditUsedOnEvents, eventId) {
  if (!creditUsedOnEvents || !Array.isArray(creditUsedOnEvents)) return false;
  return creditUsedOnEvents.includes(eventId);
}

export function canApplyCreditsToTicket(
  isAmbassador,
  creditsUnlocked,
  quantity,
  creditUsedOnEvents,
  eventId
) {
  if (!areCreditsUsable(isAmbassador, creditsUnlocked)) return false;
  if (quantity !== 1) return false;
  if (hasUsedCreditsOnEvent(creditUsedOnEvents, eventId)) return false;
  return true;
}