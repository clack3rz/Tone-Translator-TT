import assert from 'node:assert/strict';
import { test } from 'node:test';
import { deleteApp, getApps } from 'firebase/app';
import { getFirestore, terminate } from 'firebase/firestore';
import productionConfig from '../../firebase-applet-config.json';
import { EnvironmentConfigurationError } from '../config/environment';
import { initializeFirebase } from '../services/initializeFirebase';

const devFixtureAppId = '1:481224650201:web:fixture-not-a-registered-app';
const devFixtureApiKey = 'fixture-public-web-key';

test('initializes DEV Auth and explicitly selects default Firestore', async (t) => {
  const { auth, db } = initializeFirebase('development', devFixtureAppId, devFixtureApiKey);
  t.after(async () => {
    await terminate(db);
    await deleteApp(auth.app);
  });
  assert.equal(auth.app.options.projectId, 'tone-translator-dev');
  assert.equal(auth.app.options.appId, devFixtureAppId);
  assert.equal(auth.app.options.apiKey, devFixtureApiKey);
  assert.equal(db, getFirestore(auth.app, '(default)'));
});

test('initializes PROD Auth and selects the existing named Firestore', async (t) => {
  const { auth, db } = initializeFirebase('production', undefined, undefined);
  t.after(async () => {
    await terminate(db);
    await deleteApp(auth.app);
  });
  assert.deepEqual(auth.app.options, productionConfig);
  assert.equal(db, getFirestore(auth.app, 'ai-studio-ef4040f3-440d-4474-8687-76f6a8d34fe6'));
  assert.notEqual(db, getFirestore(auth.app, '(default)'));
});

test('rejects missing DEV identifiers and PROD identifiers in DEV before SDK initialization', () => {
  for (const [appId, apiKey] of [
    [undefined, devFixtureApiKey],
    [devFixtureAppId, undefined],
    [productionConfig.appId, devFixtureApiKey],
    [devFixtureAppId, productionConfig.apiKey],
  ]) {
    assert.throws(() => initializeFirebase('development', appId, apiKey), EnvironmentConfigurationError);
    assert.equal(getApps().length, 0);
  }
});

test('rejects missing and unknown environment selection before SDK initialization', () => {
  for (const appEnvironment of [undefined, '', 'staging']) {
    assert.throws(() => initializeFirebase(appEnvironment, undefined, undefined), EnvironmentConfigurationError);
    assert.equal(getApps().length, 0);
  }
});
