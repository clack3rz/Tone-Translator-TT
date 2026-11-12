/// <reference types="vite/client" />

import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { doc, getDocFromServer } from 'firebase/firestore';
import { initializeFirebase } from './initializeFirebase';

// Vite exposes only explicitly public inputs. Node callers use the same explicit
// selection without inferring it from NODE_ENV.
const env = import.meta.env ?? process.env;
export const { auth, db } = initializeFirebase(
  env.VITE_APP_ENV,
  env.VITE_DEV_FIREBASE_APP_ID,
  env.VITE_DEV_FIREBASE_API_KEY,
);

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
