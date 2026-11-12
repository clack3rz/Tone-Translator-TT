import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';
import productionConfig from '../../firebase-applet-config.json';
import { EnvironmentConfigurationError, validateEnvironmentConfig } from '../config/environment';

export function initializeFirebase(
  appEnvironment: unknown,
  devAppId: unknown,
  devApiKey: unknown,
) {
  const candidate = appEnvironment === 'development'
    ? {
        projectId: 'tone-translator-dev',
        authDomain: 'tone-translator-dev.firebaseapp.com',
        firestoreDatabaseId: '(default)',
        appId: devAppId,
        apiKey: devApiKey,
      }
    : productionConfig;

  const config = validateEnvironmentConfig(appEnvironment, candidate);
  if (config.appEnvironment === 'development' && config.firebase.apiKey === productionConfig.apiKey) {
    throw new EnvironmentConfigurationError('Firebase DEV apiKey must belong to the DEV web app');
  }

  // Keep the existing PROD SDK options, including fields outside the validation contract.
  const app = initializeApp(config.appEnvironment === 'production' ? productionConfig : config.firebase);
  const db = initializeFirestore(app, {
    experimentalForceLongPolling: true,
    ...({ useFetchStreams: false } as Record<string, unknown>),
  }, config.firebase.firestoreDatabaseId);

  return { auth: getAuth(app), db };
}
