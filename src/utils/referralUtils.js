// src/utils/referralUtils.js
// Utilities for referral code generation and credit management

/**
 * Generate a unique referral code from user's name
 */
export function generateReferralCode(name, uid) {
  // Take first part of name, uppercase, remove spaces
  const namePart = name
    .split(' ')[0]
    .toUpperCase()
    .replace(/[^A-Z]/g, '')
    .substring(0, 6);
  
  // Take last 4 chars of UID
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
  const maxAllowed = Math.floor(totalAmount * 0.5); // 50% of total
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
    
    creditsToDeduct.push({
      creditId: credit.id,
      amountUsed: useAmount
    });
    
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