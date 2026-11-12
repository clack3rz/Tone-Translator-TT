import productionConfig from '../../firebase-applet-config.json';
import { EnvironmentConfigurationError, validateEnvironmentConfig } from './environment';

export function selectFirebaseClientConfig(env: Record<string, unknown>) {
  const target = env.VITE_APP_ENV;
  if (target !== 'development') {
    validateEnvironmentConfig(target, productionConfig);
    return productionConfig;
  }

  const appId = '1:481224650201:web:bce622e1892d9872567dc8';
  if (env.VITE_DEV_FIREBASE_APP_ID !== undefined && env.VITE_DEV_FIREBASE_APP_ID !== appId) {
    throw new EnvironmentConfigurationError('VITE_DEV_FIREBASE_APP_ID must match the registered DEV web app');
  }
  const apiKey = env.VITE_DEV_FIREBASE_API_KEY;
  if (apiKey === productionConfig.apiKey || (apiKey && apiKey === env.GEMINI_API_KEY)) {
    throw new EnvironmentConfigurationError('VITE_DEV_FIREBASE_API_KEY must be the DEV Firebase web key');
  }
  return validateEnvironmentConfig(target, {
    projectId: 'tone-translator-dev',
    authDomain: 'tone-translator-dev.firebaseapp.com',
    firestoreDatabaseId: '(default)',
    appId,
    apiKey,
  }).firebase;
}
