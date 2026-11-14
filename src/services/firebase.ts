/// <reference types="vite/client" />

import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { doc, getDocFromServer } from 'firebase/firestore';
import firebaseClientConfig from '../config/firebaseClientConfig';
import { initializeFirebase } from './initializeFirebase';

export const { auth, db } = initializeFirebase(firebaseClientConfig);

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

/**
 * Returns a valid Firebase ID token for the currently authenticated user,
 * or null if no user is signed in.
 */
export const getAuthIdToken = async (forceRefresh = false): Promise<string | null> => {
  const currentUser = auth.currentUser;
  if (!currentUser) return null;
  return await currentUser.getIdToken(forceRefresh);
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
