// src/utils/dateTimeHelpers.js
// ✅ CENTRALIZED date/time formatting for consistency across the app

/**
 * Format event date based on event type
 * @param {Object} event - Event object with date fields
 * @returns {string} Formatted date string
 */
export const formatEventDate = (event) => {
  if (!event) return 'TBD';
  
  // ✅ PLACES - Show availability
  if (event.subCategory === 'places') {
    return event.placeAvailability || 'Always Open';
  }
  
  // ✅ RECURRING EVENTS
  if (event.eventDuration === 'recurring') {
    const patterns = {
      'daily': 'Daily',
      'weekly': `Every ${event.recurringDay || 'Week'}`,
      'weekends': 'Every Weekend',
      'weekdays': 'Mon-Fri'
    };
    return patterns[event.recurringPattern] || 'Recurring';
  }
  
  // ✅ MULTI-DAY EVENTS
  if (event.eventDuration === 'multi' && event.startDate && event.endDate) {
    const startDate = event.startDate.toDate ? event.startDate.toDate() : new Date(event.startDate);
    const endDate = event.endDate.toDate ? event.endDate.toDate() : new Date(event.endDate);
    
    const startFormatted = startDate.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric'
    });
    const endFormatted = endDate.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
    
    return `${startFormatted} - ${endFormatted}`;
  }
  
  // ✅ SINGLE DAY EVENTS
  if (event.date) {
    const date = event.date.toDate ? event.date.toDate() : new Date(event.date);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short',
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  }
  
  // ✅ Fallback to startDate
  if (event.startDate) {
    const date = event.startDate.toDate ? event.startDate.toDate() : new Date(event.startDate);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short',
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  }
  
  return 'TBD';
};

/**
 * Format event time based on event type
 * @param {Object} event - Event object with time fields
 * @returns {string} Formatted time string
 */
export const formatEventTime = (event) => {
  if (!event) return '';
  
  // ✅ PLACES - Opening hours
  if (event.subCategory === 'places') {
    if (event.openingTime && event.closingTime) {
      return `${event.openingTime} - ${event.closingTime}`;
    }
    return '';
  }
  
  // ✅ RECURRING EVENTS
  if (event.eventDuration === 'recurring' && event.recurringTime) {
    return event.recurringTime;
  }
  
  // ✅ MULTI-DAY EVENTS
  if (event.eventDuration === 'multi') {
    if (event.dailyStartTime && event.dailyEndTime) {
      return `${event.dailyStartTime} - ${event.dailyEndTime}`;
    }
    if (event.dailyStartTime) {
      return event.dailyStartTime;
    }
    return '';
  }
  
  // ✅ SINGLE DAY EVENTS
  if (event.time) {
    return event.time;
  }
  
  // ✅ Fallbacks
  if (event.dailyStartTime) {
    return event.dailyStartTime;
  }
  
  if (event.recurringTime) {
    return event.recurringTime;
  }
  
  return '';
};

/**
 * Get full detailed date for event details page
 * @param {Object} event - Event object
 * @returns {string} Full formatted date
 */
export const formatEventDateFull = (event) => {
  if (!event) return 'TBD';
  
  // ✅ PLACES
  if (event.subCategory === 'places') {
    return event.placeAvailability || 'Always Open';
  }
  
  // ✅ RECURRING EVENTS
  if (event.eventDuration === 'recurring') {
    const patterns = {
      'daily': 'Daily',
      'weekly': `Every ${event.recurringDay || 'Week'}`,
      'weekends': 'Every Weekend (Saturday & Sunday)',
      'weekdays': 'Every Weekday (Monday - Friday)'
    };
    return patterns[event.recurringPattern] || 'Recurring Event';
  }
  
  // ✅ MULTI-DAY EVENTS
  if (event.eventDuration === 'multi' && event.startDate && event.endDate) {
    const startDate = event.startDate.toDate ? event.startDate.toDate() : new Date(event.startDate);
    const endDate = event.endDate.toDate ? event.endDate.toDate() : new Date(event.endDate);
    
    const startFormatted = startDate.toLocaleDateString('en-US', { 
      weekday: 'long',
      month: 'long', 
      day: 'numeric', 
      year: 'numeric' 
    });
    const endFormatted = endDate.toLocaleDateString('en-US', { 
      weekday: 'long',
      month: 'long', 
      day: 'numeric', 
      year: 'numeric' 
    });
    
    return `${startFormatted} to ${endFormatted}`;
  }
  
  // ✅ SINGLE DAY EVENTS
  if (event.date) {
    const date = event.date.toDate ? event.date.toDate() : new Date(event.date);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  }
  
  if (event.startDate) {
    const date = event.startDate.toDate ? event.startDate.toDate() : new Date(event.startDate);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  }
  
  return 'TBD';
};

/**
 * Check if event is happening soon (within 7 days)
 * @param {Object} event - Event object
 * @returns {boolean} True if event is within 7 days
 */
export const isEventSoon = (event) => {
  if (!event || event.subCategory === 'places' || event.eventDuration === 'recurring') {
    return false;
  }
  
  const eventDate = event.date?.toDate?.() || event.startDate?.toDate?.() || null;
  if (!eventDate) return false;
  
  const now = new Date();
  const diffTime = eventDate - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays >= 0 && diffDays <= 7;
};

/**
 * Check if event has passed
 * @param {Object} event - Event object
 * @returns {boolean} True if event is in the past
 */
export const isEventPast = (event) => {
  if (!event || event.subCategory === 'places' || event.eventDuration === 'recurring') {
    return false;
  }
  
  const eventDate = event.endDate?.toDate?.() || event.date?.toDate?.() || null;
  if (!eventDate) return false;
  
  const now = new Date();
  return eventDate < now;
};