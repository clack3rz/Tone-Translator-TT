/**
 * Stage 3A Slice 1: pure configuration contract and fail-closed validation.
 * No Firebase initialization, credential resolution or cloud operations here.
 * Do not use NODE_ENV to infer an application environment.
 */
export type AppEnvironment = 'development' | 'production';

export interface FirebaseClientSettings {
  projectId: string;
  appId: string;
  apiKey: string;
  authDomain: string;
  firestoreDatabaseId: string;
  storageBucket?: string;
}

export interface ValidatedEnvironmentConfig {
  appEnvironment: AppEnvironment;
  firebase: Readonly<FirebaseClientSettings>;
}

const RESOURCE_IDENTITIES = {
  development: {
    projectId: 'tone-translator-dev',
    projectNumber: '481224650201',
    authDomain: 'tone-translator-dev.firebaseapp.com',
    firestoreDatabaseId: '(default)',
  },
  production: {
    projectId: 'gen-lang-client-0299754092',
    projectNumber: '249847063938',
    authDomain: 'gen-lang-client-0299754092.firebaseapp.com',
    firestoreDatabaseId: 'ai-studio-ef4040f3-440d-4474-8687-76f6a8d34fe6',
  },
} as const;

export class EnvironmentConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EnvironmentConfigurationError';
  }
}

function nonempty(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.trim() === value;
}

function objectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Accepts explicit input rather than reading globals. The caller must provide
 * APP_ENV and the project-specific Firebase web configuration independently.
 * Public Firebase web apiKey is required for SDK initialization but is never
 * treated as a server credential or authorization proof.
 */
export function validateEnvironmentConfig(
  appEnvironment: unknown,
  firebase: unknown,
): ValidatedEnvironmentConfig {
  if (appEnvironment !== 'development' && appEnvironment !== 'production') {
    throw new EnvironmentConfigurationError('APP_ENV must be explicitly development or production');
  }
  if (!objectRecord(firebase)) {
    throw new EnvironmentConfigurationError('Firebase configuration must be an object');
  }

  const required = ['projectId', 'appId', 'apiKey', 'authDomain', 'firestoreDatabaseId'] as const;
  for (const field of required) {
    if (!nonempty(firebase[field])) {
      throw new EnvironmentConfigurationError(`Missing or invalid Firebase configuration: ${field}`);
    }
  }
  if (firebase.storageBucket !== undefined && !nonempty(firebase.storageBucket)) {
    throw new EnvironmentConfigurationError('Invalid Firebase configuration: storageBucket');
  }

  const expected = RESOURCE_IDENTITIES[appEnvironment];
  for (const field of ['projectId', 'authDomain', 'firestoreDatabaseId'] as const) {
    if (firebase[field] !== expected[field]) {
      throw new EnvironmentConfigurationError(`Firebase ${field} does not match APP_ENV`);
    }
  }

  // Firebase web App IDs encode the GCP project number. This rejects a copied
  // PROD App ID in DEV even when the project ID has been edited.
  const appId = firebase.appId as string;
  if (!appId.startsWith(`1:${expected.projectNumber}:web:`) ||
      appId.length <= `1:${expected.projectNumber}:web:`.length) {
    throw new EnvironmentConfigurationError('Firebase appId does not match APP_ENV project number');
  }

  // If Storage is configured, require a bucket under the selected project.
  // No bucket is required until that resource is explicitly registered.
  const storageBucket = firebase.storageBucket as string | undefined;
  if (storageBucket && storageBucket !== `${expected.projectId}.firebasestorage.app` &&
      storageBucket !== `${expected.projectId}.appspot.com`) {
    throw new EnvironmentConfigurationError('Firebase storageBucket does not match APP_ENV');
  }

  return Object.freeze({
    appEnvironment,
    firebase: Object.freeze({
      projectId: firebase.projectId as string,
      appId,
      apiKey: firebase.apiKey as string,
      authDomain: firebase.authDomain as string,
      firestoreDatabaseId: firebase.firestoreDatabaseId as string,
      ...(storageBucket === undefined ? {} : { storageBucket }),
    }),
  });
}
