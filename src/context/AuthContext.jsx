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
import { doc, setDoc, getDoc, updateDoc, serverTimestamp, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../firebase';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

// ✅ Generate unique referral code
function generateReferralCode(name, uid) {
  const namePart = (name || 'USER').replace(/\s+/g, '').toUpperCase().slice(0, 6);
  const uidPart = uid.slice(0, 4).toUpperCase();
  const year = new Date().getFullYear();
  return `${namePart}${uidPart}`;
}

// ✅ Validate referral code exists
async function validateReferralCode(code) {
  if (!code || code.trim() === '') return false;
  
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('referralCode', '==', code.toUpperCase()));
    const snapshot = await getDocs(q);
    return !snapshot.empty;
  } catch (error) {
    console.error('Error validating referral code:', error);
    return false;
  }
}

// ✅ Award referral credits
async function awardReferralCredits(newUserId, newUserName, referrerCode) {
  try {
    console.log('🎁 Awarding referral credits for code:', referrerCode);

    // Find referrer by code
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('referralCode', '==', referrerCode));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      console.warn('⚠️ No user found with referral code:', referrerCode);
      return;
    }

    const referrerDoc = snapshot.docs[0];
    const referrerId = referrerDoc.id;
    const referrerData = referrerDoc.data();
    const referrerName = referrerData.name || 'User';

    console.log('✅ Found referrer:', referrerName, referrerId);

    // Create credit for referrer (₦300)
    const referrerCredit = {
      id: `credit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      amount: 300,
      originalAmount: 300,
      usedAmount: 0,
      status: 'active',
      reason: `Referral bonus - ${newUserName} joined`,
      earnedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(), // 90 days
    };

    // Create credit for new user (₦300)
    const newUserCredit = {
      id: `credit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      amount: 300,
      originalAmount: 300,
      usedAmount: 0,
      status: 'active',
      reason: 'Referral bonus - Signup reward',
      earnedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
    };

    // Update referrer's credits
    const referrerRef = doc(db, 'users', referrerId);
    const referrerSnapshot = await getDoc(referrerRef);
    const referrerCreditsHistory = referrerSnapshot.data()?.creditsHistory || [];
    const referrerTotalCredits = referrerSnapshot.data()?.totalCredits || 0;

    await updateDoc(referrerRef, {
      creditsHistory: [...referrerCreditsHistory, referrerCredit],
      totalCredits: referrerTotalCredits + 300,
      totalReferrals: (referrerSnapshot.data()?.totalReferrals || 0) + 1,
      updatedAt: serverTimestamp(),
    });

    console.log('✅ Credit awarded to referrer:', referrerName);

    // Update new user's credits
    const newUserRef = doc(db, 'users', newUserId);
    const newUserSnapshot = await getDoc(newUserRef);
    const newUserCreditsHistory = newUserSnapshot.data()?.creditsHistory || [];

    await updateDoc(newUserRef, {
      creditsHistory: [...newUserCreditsHistory, newUserCredit],
      totalCredits: 300,
      updatedAt: serverTimestamp(),
    });

    console.log('✅ Credit awarded to new user:', newUserName);
  } catch (error) {
    console.error('❌ Error awarding referral credits:', error);
  }
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // ✅ FIXED: Ensure user document exists with ALL required fields
  async function ensureUserDocument(user, additionalData = {}) {
    const userRef = doc(db, 'users', user.uid);
    
    // Check if document already exists
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      // ✅ Generate unique referral code
      const referralCode = generateReferralCode(
        additionalData.name || user.displayName,
        user.uid
      );

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
        lastLoginAt: serverTimestamp(),
        
        // ✅ CREDITS FIELDS (CRITICAL!)
        creditsHistory: [],
        totalCredits: 0,
        referralCode: referralCode,
        totalReferrals: 0,
        
        // ✅ Add referredBy if referral code was used
        ...(additionalData.referralCode ? { referredBy: additionalData.referralCode.toUpperCase() } : {}),
      };

      await setDoc(userRef, userData, { merge: true });
      console.log('✅ User document created with referral code:', referralCode);
      
      // ✅ Award referral credits if applicable
      if (additionalData.referralCode) {
        const isValid = await validateReferralCode(additionalData.referralCode);
        if (isValid) {
          await awardReferralCredits(
            user.uid,
            userData.name,
            additionalData.referralCode.toUpperCase()
          );
        }
      }
      
      return userData;
    } else {
      // Update last login for existing user
      console.log('✅ User document exists, updating lastLoginAt');
      await updateDoc(userRef, {
        lastLoginAt: serverTimestamp(),
        isNewUser: false,
      });
      
      return userSnap.data();
    }
  }

  // ✅ Email/Password Signup
  async function signup(email, password, name, city = '', phone = '', referralCode = '') {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // ✅ Create user document with referral code
      await ensureUserDocument(user, { name, city, phone, referralCode });

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
      await ensureUserDocument(userCredential.user);
      return userCredential;
    } catch (error) {
      console.error('❌ Login error:', error);
      throw error;
    }
  }

  // ✅ Google Sign-In
  async function loginWithGoogle(referralCode = '') {
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // ✅ Pass referral code for new Google users
      await ensureUserDocument(user, { referralCode });

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

  // ✅ Get User Data
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
          const userData = await ensureUserDocument(user);
          setUserProfile(userData);
        } catch (error) {
          console.error('❌ Error ensuring user document:', error);
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