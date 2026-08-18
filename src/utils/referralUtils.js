// src/utils/referralUtils.js
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

// ── Referral code generation ────────────────────────────────────────────────

/**
 * Builds NAME + 4-digit number from the user's uid (deterministic).
 */
function baseReferralCode(name, uid) {
  let namePart = (name.split(' ')[0] || 'USER')
    .toUpperCase()
    .replace(/[^A-Z]/g, '')
    .substring(0, 6);
  if (!namePart) namePart = 'USER';

  return `${namePart}${numericSuffix(uid)}`;
}

/**
 * Turns the uid into a stable 4-digit number (0000–9999).
 */
function numericSuffix(uid) {
  let hash = 0;
  for (let i = 0; i < uid.length; i++) {
    hash = (hash * 31 + uid.charCodeAt(i)) & 0x7fffffff;
  }
  return String(hash % 10000).padStart(4, '0');
}

/**
 * Generates a referral code and guarantees it's not already taken.
 * If the base code exists, bumps the number by 1 and checks again.
 */
export async function generateUniqueReferralCode(name, uid) {
  let code = baseReferralCode(name, uid);
  const namePart = code.slice(0, -4);
  let number = parseInt(code.slice(-4), 10);

  while (true) {
    const codeRef = doc(db, 'referralCodes', code);
    const snap = await getDoc(codeRef);

    if (!snap.exists()) {
      await setDoc(codeRef, { uid, createdAt: serverTimestamp() });
      return code;
    }

    number = (number + 1) % 10000;
    code = `${namePart}${String(number).padStart(4, '0')}`;
  }
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