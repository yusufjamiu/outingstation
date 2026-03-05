// src/utils/eventFilters.js

/**
 * Check if an event is upcoming (not past)
 * @param {Object} event - Event object from Firestore
 * @returns {boolean} - true if event is upcoming, false if past
 */
export const isUpcomingEvent = (event) => {
  const now = new Date();
  
  // For single-day events
  if (event.eventDuration === 'single' && event.date) {
    const eventDate = event.date.toDate ? event.date.toDate() : new Date(event.date);
    // Add 1 day buffer - hide event day after it happens
    const eventEndOfDay = new Date(
      eventDate.getFullYear(),
      eventDate.getMonth(),
      eventDate.getDate(),
      23,
      59,
      59
    );
    return eventEndOfDay > now;
  }
  
  // For multi-day events
  if (event.eventDuration === 'multi' && event.endDate) {
    const endDate = event.endDate.toDate ? event.endDate.toDate() : new Date(event.endDate);
    const eventEndOfDay = new Date(
      endDate.getFullYear(),
      endDate.getMonth(),
      endDate.getDate(),
      23,
      59,
      59
    );
    return eventEndOfDay > now;
  }
  
  // For recurring/permanent events - always show
  if (event.eventDuration === 'recurring' || event.eventDuration === 'permanent') {
    return true;
  }
  
  // If no date info or unknown duration, show it (edge case)
  return true;
};

/**
 * Filter array of events to only upcoming ones
 * @param {Array} events - Array of event objects
 * @returns {Array} - Filtered array of upcoming events
 */
export const filterUpcomingEvents = (events) => {
  return events.filter(isUpcomingEvent);
};