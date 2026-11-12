import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';
import type { FirebaseClientSettings } from '../config/environment';

export function initializeFirebase(config: Readonly<FirebaseClientSettings>) {
  const app = initializeApp(config);
  const db = initializeFirestore(app, {
    experimentalForceLongPolling: true,
    ...({ useFetchStreams: false } as Record<string, unknown>),
  }, config.firestoreDatabaseId);

  return { auth: getAuth(app), db };
}
