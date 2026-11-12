import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync, readdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import productionConfig from '../../firebase-applet-config.json';

const serverKey = 'slice3-server-only-test-sentinel';
const publicKey = 'slice3-firebase-web-test-fixture';

function run(args: string[], overrides: Record<string, string>) {
  const env = {
    ...process.env,
    APP_ENV: '',
    VITE_APP_ENV: '',
    GEMINI_API_KEY: '',
    VITE_DEV_FIREBASE_APP_ID: '1:481224650201:web:bce622e1892d9872567dc8',
    VITE_DEV_FIREBASE_API_KEY: '',
    NODE_ENV: 'production',
    ...overrides,
  };
  const result = spawnSync(process.execPath, args, { env, encoding: 'utf8', timeout: 60_000 });
  assert.ifError(result.error);
  return { status: result.status, output: result.stdout + result.stderr };
}

test('server entry rejects invalid configuration before startup', () => {
  const valid = { APP_ENV: 'development', VITE_APP_ENV: 'development', GEMINI_API_KEY: serverKey };
  const cases = [
    [{ APP_ENV: '' }, /APP_ENV must be explicitly/],
    [{ APP_ENV: 'staging' }, /APP_ENV must be explicitly/],
    [{ VITE_APP_ENV: '' }, /VITE_APP_ENV must match/],
    [{ VITE_APP_ENV: 'production' }, /VITE_APP_ENV must match/],
    [{ GEMINI_API_KEY: '', GOOGLE_API_KEY: 'fallback-key' }, /server-side GEMINI_API_KEY is required/],
    [{ GEMINI_API_KEY: '   ' }, /server-side GEMINI_API_KEY is required/],
    [{ GEMINI_API_KEY: 'MY_GEMINI_API_KEY' }, /server-side GEMINI_API_KEY is required/],
  ] as const;

  for (const [override, expected] of cases) {
    const result = run(['server.ts'], { ...valid, ...override });
    assert.equal(result.status, 1, result.output);
    assert.match(result.output, expected);
    assert.doesNotMatch(result.output, /Server started|Building browser assets/);
    assert.ok(!result.output.includes(serverKey));
  }
});

test('build selects one Firebase target and excludes server secrets from DEV output', () => {
  const outDir = mkdtempSync(join(tmpdir(), 'tt-slice3-'));
  const args = ['node_modules/vite/bin/vite.js', 'build', '--outDir', outDir, '--emptyOutDir'];
  try {
    const dev = { VITE_APP_ENV: 'development', GEMINI_API_KEY: serverKey, VITE_GEMINI_API_KEY: serverKey };
    for (const key of ['', productionConfig.apiKey, serverKey]) {
      const result = run(args, { ...dev, VITE_DEV_FIREBASE_API_KEY: key });
      assert.notEqual(result.status, 0, result.output);
      assert.match(result.output, /Firebase configuration: apiKey|must be the DEV Firebase web key/);
      assert.ok(!result.output.includes(serverKey));
    }

    const prod = run(args, { VITE_APP_ENV: 'production' });
    assert.equal(prod.status, 0, prod.output);
    const prodIndex = readFileSync(join(outDir, 'index.html'), 'utf8');
    assert.ok(prodIndex.includes('<meta name="tt-app-environment" content="production">'));
    assert.ok(readdirSync(outDir).includes('tone-translator-source.zip'));
    const prodAssets = readdirSync(join(outDir, 'assets'))
      .filter(name => name.endsWith('.js'))
      .map(name => readFileSync(join(outDir, 'assets', name), 'utf8')).join('\n');
    for (const field of ['projectId', 'firestoreDatabaseId', 'authDomain', 'appId'] as const) {
      assert.ok(prodAssets.includes(productionConfig[field]), `Missing PROD ${field}`);
    }
    assert.ok(!prodAssets.includes('tone-translator-dev.firebaseapp.com'));

    const result = run(args, { ...dev, VITE_DEV_FIREBASE_API_KEY: publicKey });
    assert.equal(result.status, 0, result.output);
    const files = readdirSync(outDir, { recursive: true, withFileTypes: true }).filter(file => file.isFile());
    assert.ok(!files.some(file => file.name.endsWith('.zip')));
    const bundle = files.map(file => readFileSync(join(file.parentPath, file.name), 'utf8')).join('\n');
    for (const expected of [
      '<meta name="tt-app-environment" content="development">',
      'tone-translator-dev.firebaseapp.com',
      '1:481224650201:web:bce622e1892d9872567dc8',
      publicKey,
    ]) {
      assert.ok(bundle.includes(expected), `Missing expected DEV build content: ${expected}`);
    }
    for (const [label, forbidden] of Object.entries({
      ...productionConfig,
      productionProjectNumber: productionConfig.appId.split(':')[1],
      gemini: serverKey,
    })) {
      assert.ok(!forbidden || !bundle.includes(forbidden), `Unexpected ${label} in DEV output`);
    }
  } finally {
    rmSync(outDir, { recursive: true, force: true });
  }
});
