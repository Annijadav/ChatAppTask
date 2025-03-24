import { initializeApp } from "firebase/app";
import { getAuth, signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyCG0dB0drZX1ojkP1V5ByP1Rpqk_lKMMLw",
  authDomain: "chatappauth-99184.firebaseapp.com",
  projectId: "chatappauth-99184",
  storageBucket: "chatappauth-99184.firebasestorage.app",
  messagingSenderId: "948155946643",
  appId: "1:948155946643:web:f167df8268df1abe261f66",
  measurementId: "G-0RS0SPGNWJ"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const analytics = getAnalytics(app);
const provider = new GoogleAuthProvider();

export { auth, provider, signInWithPopup };
