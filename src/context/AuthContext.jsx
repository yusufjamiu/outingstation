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
import { doc, setDoc, getDoc, updateDoc, serverTimestamp, collection, query, where, getDocs, runTransaction } from 'firebase/firestore';
import { auth, db } from '../firebase';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

// ✅ Generate unique referral code
function generateReferralCode(name, uid) {
  const namePart = (name || 'USER').replace(/\s+/g, '').toUpperCase().slice(0, 6);
  const uidPart = uid.slice(0, 4).toUpperCase();
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

    // ✅ Check if referrer is an ambassador
    const isAmbassador = referrerData.isAmbassador === true;
    const referrerCreditAmount = isAmbassador ? 500 : 300;

    console.log('✅ Found referrer:', referrerName, referrerId);
    console.log('⭐ Is Ambassador:', isAmbassador, '→ Credit amount: ₦', referrerCreditAmount);

    // ✅ Create credit for referrer (₦500 for ambassadors, ₦300 for regular users)
    const referrerCredit = {
      id: `credit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      amount: referrerCreditAmount,
      originalAmount: referrerCreditAmount,
      usedAmount: 0,
      status: 'active',
      reason: `Referral bonus - ${newUserName} joined${isAmbassador ? ' (Ambassador reward)' : ''}`,
      earnedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
    };

    // ✅ Create credit for new user (always ₦300)
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

    // ✅ Update referrer's credits
    const referrerRef = doc(db, 'users', referrerId);
    const referrerSnapshot = await getDoc(referrerRef);
    const referrerCreditsHistory = referrerSnapshot.data()?.creditsHistory || [];
    const referrerTotalCredits = referrerSnapshot.data()?.totalCredits || 0;

    await updateDoc(referrerRef, {
      creditsHistory: [...referrerCreditsHistory, referrerCredit],
      totalCredits: referrerTotalCredits + referrerCreditAmount,
      totalReferrals: (referrerSnapshot.data()?.totalReferrals || 0) + 1,
      updatedAt: serverTimestamp(),
    });

    console.log('✅ Credit awarded to referrer:', referrerName, '₦', referrerCreditAmount);

    // ✅ Update new user's credits
    const newUserRef = doc(db, 'users', newUserId);
    const newUserSnapshot = await getDoc(newUserRef);
    const newUserCreditsHistory = newUserSnapshot.data()?.creditsHistory || [];

    await updateDoc(newUserRef, {
      creditsHistory: [...newUserCreditsHistory, newUserCredit],
      totalCredits: 300,
      updatedAt: serverTimestamp(),
    });

    console.log('✅ Credit awarded to new user:', newUserName, '₦300');
  } catch (error) {
    console.error('❌ Error awarding referral credits:', error);
  }
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // ✅ REWRITTEN — now runs the check-then-write as a single Firestore
  // transaction instead of a plain getDoc() + setDoc()/updateDoc(). This
  // is the actual fix for signup silently losing name/city/phone.
  //
  // The earlier version patched only the "existing document" branch to
  // backfill city/phone — but that only helps if one call's getDoc() runs
  // AFTER the other call's write has already landed. createUserWithEmail-
  // AndPassword() fires the onAuthStateChanged listener below almost
  // immediately, which calls ensureUserDocument(user) with NO
  // additionalData — racing signup()'s own ensureUserDocument(user,
  // {name, city, phone, referralCode}) call. Both calls' getDoc() reads
  // can easily both return "doesn't exist" before either write lands
  // (neither call knows about the other), so BOTH take the "create new
  // document" branch — and the listener's payload explicitly includes
  // phone:'' and city:'' (not omitted), so if its write reaches Firestore
  // after signup()'s write, it silently stomps the real data with blanks.
  // No amount of patching the "existing" branch fixes that specific
  // interleaving, because neither call ever saw the doc as existing.
  //
  // A transaction closes this properly: Firestore detects when two
  // transactions conflict over the same document and automatically
  // retries the loser. On retry, that call's transaction.get() sees the
  // doc now DOES exist (the other transaction already committed it), so
  // it correctly falls into the backfill branch with its own real data —
  // regardless of which call "wins" the race to create the document.
  async function ensureUserDocument(user, additionalData = {}) {
    console.log('🔍 ensureUserDocument called for:', user.uid);
    console.log('📦 Additional data:', additionalData);

    const userRef = doc(db, 'users', user.uid);
    let wasCreated = false;
    let resultData = null;

    try {
      resultData = await runTransaction(db, async (transaction) => {
        const userSnap = await transaction.get(userRef);

        if (!userSnap.exists()) {
          console.log('🆕 Creating NEW user document (transaction)');

          const userName = additionalData.name ||
                          user.displayName ||
                          user.email?.split('@')[0] ||
                          'User';

          const referralCode = generateReferralCode(userName, user.uid);

          const userData = {
            uid: user.uid,
            name: userName,
            email: user.email || '',
            phone: additionalData.phone || user.phoneNumber || '',
            city: additionalData.city || '',
            avatar: user.photoURL || '',
            savedEvents: [],
            role: 'user',
            status: 'active',
            isNewUser: true,
            assignedCampuses: [],
            isCampusAmbassador: false,
            isAmbassador: false,
            ambassadorSince: null,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            lastLoginAt: serverTimestamp(),
            creditsHistory: [],
            totalCredits: 0,
            referralCode: referralCode,
            totalReferrals: 0,
            eventsListed: 0,
            ...(additionalData.referralCode ? { referredBy: additionalData.referralCode.toUpperCase() } : {}),
          };

          transaction.set(userRef, userData, { merge: true });
          wasCreated = true;
          return userData;
        } else {
          console.log('👤 User document exists (transaction), checking fields...');

          const existingData = userSnap.data();
          const updates = {
            lastLoginAt: serverTimestamp(),
            isNewUser: false,
          };

          if (!existingData.name || existingData.name === 'User') {
            const newName = additionalData.name ||
                           user.displayName ||
                           user.email?.split('@')[0] ||
                           'User';
            updates.name = newName;
            console.log('🔧 Fixing missing name:', newName);
          }

          if ((!existingData.city || existingData.city === '') && additionalData.city) {
            updates.city = additionalData.city;
            console.log('🔧 Backfilling missing city:', additionalData.city);
          }
          if ((!existingData.phone || existingData.phone === '') && additionalData.phone) {
            updates.phone = additionalData.phone;
            console.log('🔧 Backfilling missing phone:', additionalData.phone);
          }

          if (!existingData.referralCode) {
            const userName = existingData.name || updates.name || 'User';
            const newReferralCode = generateReferralCode(userName, user.uid);
            updates.referralCode = newReferralCode;
            console.log('🔧 Adding missing referral code:', newReferralCode);
          }

          if (!existingData.hasOwnProperty('totalCredits')) updates.totalCredits = 0;
          if (!existingData.hasOwnProperty('totalReferrals')) updates.totalReferrals = 0;
          if (!existingData.hasOwnProperty('eventsListed')) updates.eventsListed = 0;
          if (!existingData.hasOwnProperty('creditsHistory')) updates.creditsHistory = [];
          if (!existingData.hasOwnProperty('isAmbassador')) updates.isAmbassador = false;
          if (!existingData.hasOwnProperty('assignedCampuses')) updates.assignedCampuses = [];
          if (!existingData.hasOwnProperty('isCampusAmbassador')) updates.isCampusAmbassador = false;
          if (!existingData.email && user.email) updates.email = user.email;
          if (!existingData.avatar && user.photoURL) updates.avatar = user.photoURL;

          transaction.update(userRef, updates);
          wasCreated = false;
          return { ...existingData, ...updates };
        }
      });

      console.log('✅ Transaction committed. Created new doc:', wasCreated);

      // ✅ Referral credit awarding stays OUTSIDE the transaction — it's
      // its own separate multi-document read/write and doesn't need to be
      // atomic with the user doc creation itself. Only runs the first
      // time this specific call actually created the document, matching
      // the original behavior (never re-runs on subsequent logins).
      if (wasCreated && additionalData.referralCode) {
        console.log('🎁 Awarding referral credits...');
        const isValid = await validateReferralCode(additionalData.referralCode);
        if (isValid) {
          await awardReferralCredits(user.uid, resultData.name, additionalData.referralCode.toUpperCase());
        }
      }

      return resultData;
    } catch (error) {
      console.error('❌ Error in ensureUserDocument:', error);
      throw error;
    }
  }

  async function signup(email, password, name, city = '', phone = '', referralCode = '') {
    try {
      console.log('📧 Email signup starting...');
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      console.log('✅ Firebase Auth user created:', user.uid);

      await ensureUserDocument(user, { name, city, phone, referralCode });

      return userCredential;
    } catch (error) {
      console.error('❌ Signup error:', error);
      throw error;
    }
  }

  async function login(email, password) {
    try {
      console.log('🔐 Email login starting...');
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      console.log('✅ Firebase Auth login successful:', userCredential.user.uid);
      
      await ensureUserDocument(userCredential.user);

      return userCredential;
    } catch (error) {
      console.error('❌ Login error:', error);
      throw error;
    }
  }

  async function loginWithGoogle(referralCode = '') {
    try {
      console.log('🔵 Google login starting...');
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      console.log('✅ Google Auth successful:', user.uid);

      await ensureUserDocument(user, { referralCode });

      return result;
    } catch (error) {
      console.error('❌ Google login error:', error);
      throw error;
    }
  }

  async function resendVerificationEmail() {
    if (currentUser && !currentUser.emailVerified) {
      await sendEmailVerification(currentUser);
    } else {
      throw new Error('No unverified user to send verification email to');
    }
  }

  function logout() {
    return signOut(auth);
  }

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

  async function changePassword(currentPassword, newPassword) {
    if (!currentUser) throw new Error('No user logged in');
    const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
    await reauthenticateWithCredential(currentUser, credential);
    await updatePassword(currentUser, newPassword);
  }

  async function getUserData(uid) {
    const docRef = doc(db, 'users', uid);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? docSnap.data() : null;
  }

  useEffect(() => {
    console.log('🎧 Setting up auth listener...');
    
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log('🔔 Auth state changed:', user ? user.uid : 'No user');
      
      setCurrentUser(user);

      if (user) {
        try {
          console.log('📥 Fetching user data...');
          const userData = await ensureUserDocument(user);
          console.log('✅ User profile loaded:', userData.name);
          setUserProfile(userData);
        } catch (error) {
          console.error('❌ Error loading user profile:', error);
          setUserProfile(null);
        }
      } else {
        setUserProfile(null);
      }

      setLoading(false);
    });

    return () => {
      console.log('🔌 Cleaning up auth listener');
      unsubscribe();
    };
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