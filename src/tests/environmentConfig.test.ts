import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EnvironmentConfigurationError, validateEnvironmentConfig } from '../config/environment';

const dev = () => ({
  projectId: 'tone-translator-dev',
  authDomain: 'tone-translator-dev.firebaseapp.com',
  firestoreDatabaseId: '(default)',
  appId: '1:481224650201:web:fixture-not-a-registered-app',
  apiKey: 'fixture-public-web-key',
  storageBucket: 'tone-translator-dev.firebasestorage.app',
});

const prod = () => ({
  projectId: 'gen-lang-client-0299754092',
  authDomain: 'gen-lang-client-0299754092.firebaseapp.com',
  firestoreDatabaseId: 'ai-studio-ef4040f3-440d-4474-8687-76f6a8d34fe6',
  appId: '1:249847063938:web:fixture-not-a-registered-app',
  apiKey: 'fixture-public-web-key',
  storageBucket: 'gen-lang-client-0299754092.firebasestorage.app',
});

function mustReject(env: unknown, config: unknown, label: string) {
  assert.throws(() => validateEnvironmentConfig(env, config), EnvironmentConfigurationError, label);
}

test('AT-01 valid DEV configuration selects explicit default Firestore database', () => {
  const result = validateEnvironmentConfig('development', dev());
  assert.equal(result.appEnvironment, 'development');
  assert.equal(result.firebase.projectId, 'tone-translator-dev');
  assert.equal(result.firebase.firestoreDatabaseId, '(default)');
  assert.ok(Object.isFrozen(result));
  assert.ok(Object.isFrozen(result.firebase));
});

test('AT-02 valid PROD configuration selects existing named database', () => {
  const result = validateEnvironmentConfig('production', prod());
  assert.equal(result.appEnvironment, 'production');
  assert.equal(result.firebase.firestoreDatabaseId, 'ai-studio-ef4040f3-440d-4474-8687-76f6a8d34fe6');
});

test('AT-03 missing environment fails closed', () => {
  for (const value of [undefined, null, '', false]) mustReject(value, dev(), 'missing APP_ENV');
});

test('AT-04 unknown environment fails closed, including NODE_ENV values', () => {
  for (const value of ['dev', 'prod', 'test', 'staging', 'Production', '']) {
    mustReject(value, dev(), 'unknown APP_ENV');
  }
});

test('AT-05 DEV with PROD project fails closed', () => {
  mustReject('development', { ...dev(), projectId: prod().projectId }, 'PROD project');
});

test('AT-06 DEV with PROD database fails closed', () => {
  mustReject('development', { ...dev(), firestoreDatabaseId: prod().firestoreDatabaseId }, 'PROD database');
});

test('AT-07 DEV with PROD Auth domain fails closed', () => {
  mustReject('development', { ...dev(), authDomain: prod().authDomain }, 'PROD Auth domain');
});

test('AT-08 PROD with DEV resource identifiers fails closed', () => {
  for (const field of ['projectId', 'authDomain', 'firestoreDatabaseId', 'appId', 'storageBucket'] as const) {
    mustReject('production', { ...prod(), [field]: dev()[field] }, field);
  }
});

test('AT-09 missing or invalid required fields fail closed', () => {
  for (const field of ['projectId', 'authDomain', 'firestoreDatabaseId', 'appId', 'apiKey'] as const) {
    mustReject('development', { ...dev(), [field]: undefined }, field);
    mustReject('development', { ...dev(), [field]: ' ' }, field);
  }
  mustReject('development', null, 'no configuration');
  mustReject('development', [], 'array config');
  mustReject('development', { ...dev(), storageBucket: '' }, 'invalid optional bucket');
});

test('APP_ENV/project number and Storage cross-environment mix are rejected', () => {
  mustReject('development', { ...dev(), appId: prod().appId }, 'PROD Firebase app ID');
  mustReject('development', { ...dev(), storageBucket: prod().storageBucket }, 'PROD Storage bucket');
});

test('Validation makes no Firebase or cloud calls and does not mutate inputs', () => {
  const candidate = dev();
  const before = JSON.stringify(candidate);
  validateEnvironmentConfig('development', candidate);
  assert.equal(JSON.stringify(candidate), before);
});
