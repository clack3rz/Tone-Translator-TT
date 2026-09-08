import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { initializeFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);

// Configure Firestore with long-polling to prevent proxy/iframe connection timeouts
const isBrowser = typeof window !== 'undefined';
export const db = initializeFirestore(app, {
  ...(isBrowser ? { experimentalForceLongPolling: true } : {}),
}, firebaseConfig.firestoreDatabaseId);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error("Error signing in with Google", error);
    throw error;
  }
};

// Test connection as mandated by documentation
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'system', 'connection_test'));
    console.log("Firebase connection verified");
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    } else if (error instanceof Error && error.message.includes('insufficient permissions')) {
      // If rules are tight, this is still a successful network connection
      console.log("Firebase reachable (Permissions restricted)");
    } else {
      console.warn("Unexpected Firebase connection state:", error);
    }
  }
}

testConnection();
