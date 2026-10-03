import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { initializeFirestore, getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);

// Initialize Firestore with the provisioned database ID and enable experimentalForceLongPolling
// with standard HTTP requests (useFetchStreams: false) to prevent WebChannel streaming handshake
// timeouts in browser iframes and proxied preview environments.
initializeFirestore(app, {
  experimentalForceLongPolling: true,
  ...({ useFetchStreams: false } as Record<string, unknown>),
}, firebaseConfig.firestoreDatabaseId);

// Export db instance as mandated by Firebase skill.
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

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

// Validate connection to Firestore as mandated by documentation with progressive retries
// to accommodate initial handshake latency in iframe sandboxes.
async function testConnection(maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await getDocFromServer(doc(db, 'test', 'connection'));
      console.log("Firebase connection verified");
      return;
    } catch (error: unknown) {
      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 1500));
        continue;
      }
      if (error instanceof Error && error.message.includes('the client is offline')) {
        console.error("Please check your Firebase configuration.");
      }
    }
  }
}

testConnection().catch(() => {});
