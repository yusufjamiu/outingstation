import { createContext, useContext, useState, useEffect } from 'react';
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from './AuthContext';

const SavedEventsContext = createContext();

export function useSavedEvents() {
  return useContext(SavedEventsContext);
}

export function SavedEventsProvider({ children }) {
  const [savedEventIds, setSavedEventIds] = useState([]);
  const [loading, setLoading] = useState(false);
  const { currentUser } = useAuth();

  // Load saved events from Firestore when user logs in
  useEffect(() => {
    if (currentUser) {
      loadSavedEvents();
    } else {
      setSavedEventIds([]);
    }
  }, [currentUser]);

  const loadSavedEvents = async () => {
    if (!currentUser) return;
    try {
      setLoading(true);
      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        setSavedEventIds(data.savedEvents || []);
      }
    } catch (err) {
      console.error('Error loading saved events:', err);
    }
    setLoading(false);
  };

  // Check if an event is saved
  const isEventSaved = (eventId) => {
    return savedEventIds.includes(eventId);
  };

  // Toggle save/unsave event
  const toggleSaveEvent = async (eventId) => {
    if (!currentUser) {
      // Not logged in — could redirect to login or show a prompt
      return false;
    }

    const userRef = doc(db, 'users', currentUser.uid);
    const alreadySaved = savedEventIds.includes(eventId);

    try {
      if (alreadySaved) {
        // Remove from saved
        await updateDoc(userRef, {
          savedEvents: arrayRemove(eventId)
        });
        setSavedEventIds(prev => prev.filter(id => id !== eventId));
      } else {
        // Add to saved
        await updateDoc(userRef, {
          savedEvents: arrayUnion(eventId)
        });
        setSavedEventIds(prev => [...prev, eventId]);
      }
      return !alreadySaved; // returns new state: true = saved, false = unsaved
    } catch (err) {
      console.error('Error toggling saved event:', err);
      return alreadySaved;
    }
  };

  // Get count of saved events
  const savedCount = savedEventIds.length;

  const value = {
    savedEventIds,
    isEventSaved,
    toggleSaveEvent,
    savedCount,
    loading,
    refreshSavedEvents: loadSavedEvents
  };

  return (
    <SavedEventsContext.Provider value={value}>
      {children}
    </SavedEventsContext.Provider>
  );
}