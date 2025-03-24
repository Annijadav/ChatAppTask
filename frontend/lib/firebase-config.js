import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
    apiKey: "AIzaSyCG0dB0drZX1ojkP1V5ByP1Rpqk_lKMMLw",
    authDomain: "chatappauth-99184.firebaseapp.com",
    projectId: "chatappauth-99184",
    storageBucket: "chatappauth-99184.firebasestorage.app",
    messagingSenderId: "948155946643",
    appId: "1:948155946643:web:f167df8268df1abe261f66",
    measurementId: "G-0RS0SPGNWJ"
};

// Initialize Firebase only if no apps exist
const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);

export { app, auth };
