import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  GoogleAuthProvider,
  setPersistence,
  browserLocalPersistence,
  signInWithPopup, 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged as firebaseAuthStateChanged 
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyCG0dB0drZX1ojkP1V5ByP1Rpqk_lKMMLw",
    authDomain: "chatappauth-99184.firebaseapp.com",
    projectId: "chatappauth-99184",
    storageBucket: "chatappauth-99184.firebasestorage.app",
    messagingSenderId: "948155946643",
    appId: "1:948155946643:web:f167df8268df1abe261f66",
    measurementId: "G-0RS0SPGNWJ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

// Set persistence to LOCAL
setPersistence(auth, browserLocalPersistence);

// Auth functions
export const loginWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return { success: true, user: result.user };
  } catch (error) {
    console.error("Google login error:", error);
    // Check if the error is due to popup being closed or blocked
    if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/popup-blocked') {
      return { success: false, error: 'Login popup was closed or blocked' };
    }
    return { success: false, error: error.message };
  }
};

export const signupWithEmail = (email, password) => createUserWithEmailAndPassword(auth, email, password);
export const loginWithEmail = (email, password) => signInWithEmailAndPassword(auth, email, password);

// Add getUserData function
export const getUserData = async (uid) => {
  try {
    const user = auth.currentUser;
    if (!user) return null;
    
    return {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      emailVerified: user.emailVerified,
      providerData: user.providerData,
      metadata: {
        lastSignInTime: user.metadata.lastSignInTime,
        creationTime: user.metadata.creationTime
      }
    };
  } catch (error) {
    console.error("Error getting user data:", error);
    return null;
  }
};

// Add function to get Firebase ID token
export const getFirebaseIdToken = async () => {
  try {
    const user = auth.currentUser;
    if (!user) return null;
    return await user.getIdToken();
  } catch (error) {
    console.error("Error getting ID token:", error);
    return null;
  }
};

// Make sure to export auth
export { auth };

let isInitialized = false;

// Export the auth state change handler with initialization check
export const onAuthStateChanged = (callback) => {
  return firebaseAuthStateChanged(auth, (user) => {
    if (!isInitialized) {
      isInitialized = true;
      callback(user);
    } else {
      // Only trigger callback if there's a real auth state change
      if (user !== auth.currentUser) {
        callback(user);
      }
    }
  });
};

// Add a helper to reset initialization state (useful for testing/logout)
export const resetAuthState = () => {
  isInitialized = false;
};

// Modify logout to reset the initialization state
export const logout = async () => {
  try {
    await signOut(auth);
    resetAuthState();
    return { success: true };
  } catch (error) {
    console.error('Logout error:', error);
    throw error;
  }
};