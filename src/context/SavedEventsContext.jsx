import React, { createContext, useContext, useState, useEffect } from 'react';

// Create the context
const SavedEventsContext = createContext();

// Custom hook to use the context
export const useSavedEvents = () => {
  const context = useContext(SavedEventsContext);
  if (!context) {
    throw new Error('useSavedEvents must be used within SavedEventsProvider');
  }
  return context;
};

// Provider component
export const SavedEventsProvider = ({ children }) => {
  // Load saved events from localStorage on mount
  const [savedEvents, setSavedEvents] = useState(() => {
    const stored = localStorage.getItem('savedEvents');
    return stored ? JSON.parse(stored) : [];
  });

  // Save to localStorage whenever savedEvents changes
  useEffect(() => {
    localStorage.setItem('savedEvents', JSON.stringify(savedEvents));
  }, [savedEvents]);

  // Check if an event is saved
  const isEventSaved = (eventId) => {
    return savedEvents.some(event => event.id === eventId);
  };

  // Add event to saved
  const saveEvent = (event) => {
    if (!isEventSaved(event.id)) {
      setSavedEvents(prev => [...prev, event]);
      console.log('Event saved:', event.title, 'ID:', event.id);
      return true;
    }
    return false;
  };

  // Remove event from saved
  const unsaveEvent = (eventId) => {
    setSavedEvents(prev => prev.filter(event => event.id !== eventId));
    console.log('Event removed:', eventId);
  };

  // Toggle save status
  const toggleSaveEvent = (event) => {
    if (isEventSaved(event.id)) {
      unsaveEvent(event.id);
      return false; // Now unsaved
    } else {
      saveEvent(event);
      return true; // Now saved
    }
  };

  // Get all saved events
  const getSavedEvents = () => {
    return savedEvents;
  };

  // Get count of saved events
  const getSavedEventsCount = () => {
    return savedEvents.length;
  };

  const value = {
    savedEvents,
    isEventSaved,
    saveEvent,
    unsaveEvent,
    toggleSaveEvent,
    getSavedEvents,
    getSavedEventsCount
  };

  return (
    <SavedEventsContext.Provider value={value}>
      {children}
    </SavedEventsContext.Provider>
  );
};