// src/utils/bookingHelpers.js
//
// ✅ NEW — extracted from MyBookingsPage.jsx specifically to avoid a
// circular import: Navbar.jsx needs bookingAwaitsConfirmation() for its
// own badge, but MyBookingsPage.jsx already imports Navbar (to render it
// on the page) — importing FROM MyBookingsPage.jsx back INTO Navbar.jsx
// would have created a real circular dependency between the two. It
// likely would have worked in practice (neither side calls the other's
// export at module-load time), but "probably fine" isn't worth the risk
// on a function this small — a proper shared module is the correct fix,
// not a shortcut that happens not to break today.
//
// Mirrors my_bookings_screen.dart's (Flutter) bookingAwaitsConfirmation()
// exactly — same eligibility check, kept in sync deliberately across
// every surface that shows this: MyBookingsPage.jsx's card highlight,
// Navbar.jsx's dropdown badge, and their Flutter equivalents
// (main_screen.dart's nav badge, home_screen.dart's banner,
// settings_screen.dart's Profile strip).

export function bookingAwaitsConfirmation(booking) {
  if (booking.paymentStatus !== 'paid') return false;
  if (booking.confirmationStatus === 'confirmed') return false;
  if (booking.confirmationStatus === 'cancelled') return false;
  if (booking.disputeStatus === 'reported') return false;

  const isShortlet = booking.type === 'shortlet';
  const now = new Date();
  const relevantDate = isShortlet ? booking.checkInDate : booking.tripDateTime;
  if (!relevantDate) return false;

  const windowOpensAt = isShortlet
    ? new Date(relevantDate.toDate().getTime() + 24 * 60 * 60 * 1000)
    : relevantDate.toDate();

  return now > windowOpensAt;
}