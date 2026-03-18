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
  sendEmailVerification // ✅ ADDED
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // ✅ Email/Password Signup
  async function signup(email, password, name, city = '', phone = '') {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    await setDoc(doc(db, 'users', user.uid), {
      name,
      email,
      phone,
      city,
      savedEvents: [],
      isNewUser: true,
      role: 'user',
      createdAt: new Date(),
      updatedAt: new Date()
    });

    return userCredential;
  }

  // ✅ Email/Password Login - UPDATED to return userCredential
  async function login(email, password) {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    
    // ✅ Mark as returning user after login
    const userRef = doc(db, 'users', userCredential.user.uid);
    await updateDoc(userRef, {
      isNewUser: false,
      lastLoginAt: new Date()
    });

    return userCredential; // ✅ RETURN userCredential for verification check
  }

  // ✅ Google Sign-In
  async function loginWithGoogle() {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    const user = result.user;

    // Check if user doc exists already
    const docRef = doc(db, 'users', user.uid);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      // New Google user - create profile
      await setDoc(docRef, {
        name: user.displayName || '',
        email: user.email || '',
        phone: user.phoneNumber || '',
        city: '',
        avatar: user.photoURL || '',
        savedEvents: [],
        isNewUser: true,
        role: 'user',
        createdAt: new Date(),
        updatedAt: new Date()
      });
    } else {
      // Returning Google user
      await updateDoc(docRef, {
        isNewUser: false,
        lastLoginAt: new Date()
      });
    }

    return result;
  }

  // ✅ NEW: Resend Verification Email
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
      updatedAt: new Date()
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
        const docRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setUserProfile(docSnap.data());
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
    resendVerificationEmail // ✅ ADDED
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}