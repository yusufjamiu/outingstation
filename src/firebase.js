import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyC6ERKqVd6IlqC6yo0_dfCI9wBivDHTRvk",
  authDomain: "outingstation-app.firebaseapp.com",
  projectId: "outingstation-app",
  storageBucket: "outingstation-app.firebasestorage.app",
  messagingSenderId: "775142188021",
  appId: "1:775142188021:web:5d7b920a29131a9228f6bc",
  measurementId: "G-J4DWTE4VGX"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;