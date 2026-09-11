import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { initializeFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);

// Configure Firestore with forced long-polling in browser environments to eliminate
// initial WebSocket connection failures and timeouts behind sandboxed iframes/proxies.
const isBrowser = typeof window !== 'undefined';
export const db = initializeFirestore(app, {
  ...(isBrowser ? { 
    experimentalForceLongPolling: true,
    experimentalLongPollingOptions: {
      timeoutSeconds: 25,
    }
  } : {}),
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
async function testConnection(retries = 2) {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log("Firebase connection verified");
  } catch (error) {
    if (retries > 0 && error instanceof Error && (error.message.includes('unavailable') || error.message.includes('failed') || error.message.includes('offline'))) {
      setTimeout(() => {
        testConnection(retries - 1);
      }, 1500);
      return;
    }
    if (error instanceof Error && (error.message.includes('the client is offline') || error.message.includes('unavailable'))) {
      console.warn("Firestore operating in offline/reconnecting mode. Backend will sync automatically when reachable.");
    } else if (error instanceof Error && error.message.includes('insufficient permissions')) {
      // If rules are tight, this is still a successful network connection
      console.log("Firebase reachable (Permissions restricted)");
    } else {
      console.warn("Firebase connection state:", error);
    }
  }
}

if (isBrowser) {
  // Allow browser network stack and DOM to settle before testing connection
  setTimeout(() => {
    testConnection();
  }, 1000);
} else {
  testConnection();
}
