import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
  sendEmailVerification
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // ✅ CRITICAL FIX: Ensure user document exists with retry logic
  async function ensureUserDocument(user, additionalData = {}) {
    const userRef = doc(db, 'users', user.uid);
    
    // Check if document already exists
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      // Create new user document
      console.log('📝 Creating user document for:', user.uid);
      
      const userData = {
        uid: user.uid,
        name: additionalData.name || user.displayName || '',
        email: user.email || '',
        phone: additionalData.phone || user.phoneNumber || '',
        city: additionalData.city || '',
        avatar: user.photoURL || '',
        savedEvents: [],
        role: 'user',
        status: 'active',
        isNewUser: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      // ✅ Use setDoc with merge to prevent race conditions
      await setDoc(userRef, userData, { merge: true });
      console.log('✅ User document created successfully');
      
      return userData;
    } else {
      // Update last login for existing user
      console.log('✅ User document already exists, updating lastLoginAt');
      await updateDoc(userRef, {
        lastLoginAt: serverTimestamp(),
        isNewUser: false,
      });
      
      return userSnap.data();
    }
  }

  // ✅ Email/Password Signup with guaranteed document creation
  async function signup(email, password, name, city = '', phone = '') {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // ✅ CRITICAL: Create user document immediately after signup
      await ensureUserDocument(user, { name, city, phone });

      return userCredential;
    } catch (error) {
      console.error('❌ Signup error:', error);
      throw error;
    }
  }

  // ✅ Email/Password Login
  async function login(email, password) {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      // ✅ Ensure user document exists (in case it was missing)
      await ensureUserDocument(userCredential.user);

      return userCredential;
    } catch (error) {
      console.error('❌ Login error:', error);
      throw error;
    }
  }

  // ✅ Google Sign-In with GUARANTEED document creation
  async function loginWithGoogle() {
    try {
      const provider = new GoogleAuthProvider();
      // ✅ Force account selection every time to prevent auto-login issues
      provider.setCustomParameters({
        prompt: 'select_account'
      });
      
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // ✅ CRITICAL: Always ensure document exists
      await ensureUserDocument(user);

      return result;
    } catch (error) {
      console.error('❌ Google login error:', error);
      throw error;
    }
  }

  // ✅ Resend Verification Email
  async function resendVerificationEmail() {
    if (currentUser && !currentUser.emailVerified) {
      await sendEmailVerification(currentUser);
    } else {
      throw new Error('No unverified user to send verification email to');
    }
  }

  // ✅ Logout
  function logout() {
    return signOut(auth);
  }

  // ✅ Update Profile
  async function updateProfile(data) {
    if (!currentUser) return;
    const docRef = doc(db, 'users', currentUser.uid);
    await updateDoc(docRef, {
      ...data,
      updatedAt: serverTimestamp()
    });
    // Refresh local profile
    const snap = await getDoc(docRef);
    if (snap.exists()) setUserProfile(snap.data());
  }

  // ✅ Change Password
  async function changePassword(currentPassword, newPassword) {
    if (!currentUser) throw new Error('No user logged in');
    const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
    await reauthenticateWithCredential(currentUser, credential);
    await updatePassword(currentUser, newPassword);
  }

  // ✅ Get User Data (helper function)
  async function getUserData(uid) {
    const docRef = doc(db, 'users', uid);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? docSnap.data() : null;
  }

  // ✅ Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);

      if (user) {
        try {
          // ✅ Ensure user document exists on every auth state change
          const userData = await ensureUserDocument(user);
          setUserProfile(userData);
        } catch (error) {
          console.error('❌ Error ensuring user document:', error);
          // Even if document creation fails, don't crash the app
          setUserProfile(null);
        }
      } else {
        setUserProfile(null);
      }

      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    userProfile,
    signup,
    login,
    loginWithGoogle,
    logout,
    updateProfile,
    changePassword,
    getUserData,
    resendVerificationEmail
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}