import assert from 'node:assert/strict';
import { generateKeyPairSync, sign } from 'node:crypto';
import { once } from 'node:events';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { GenerateContentResponse } from '@google/genai';
import { createServerApp } from '../../server.ts';
import { resolveServerProjectId } from '../server/auth/tokenVerifier.ts';

test('server.ts protects deployed HTTP routes and sanitizes upstream failures', { timeout: 15000 }, async t => {
  t.mock.method(console, 'error', () => {});
  const originalEnv = process.env;
  process.env = { ...originalEnv, NODE_ENV: 'production', APP_ENV: 'development', FIREBASE_PROJECT_ID: 'tone-translator-dev' };
  t.after(() => { process.env = originalEnv; });
  const dist = await mkdtemp(join(tmpdir(), 'tt-deployed-http-'));
  t.after(() => rm(dist, { recursive: true, force: true }));
  await writeFile(join(dist, 'index.html'), '<meta name="tt-app-environment" content="development">');
  await writeFile(join(dist, 'tone-translator-source.zip'), 'private archive fixture');
  await writeFile(join(dist, 'public.txt'), 'public asset fixture');

  // Supply a local signing key to the real Firebase verifier, bypassing certificate fetching.
  const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const now = Math.floor(Date.now() / 1000);
  const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
  function token(project: string) {
    const header = encode({ alg: 'RS256', kid: 'fixture' });
    const payload = encode({
      aud: project, iss: 'https://securetoken.google.com/' + project,
      sub: 'fixture-admin', iat: now, auth_time: now, exp: now + 300, admin: true,
      email: 'cclackerz@gmail.com', email_verified: true,
    });
    const data = header + '.' + payload;
    return data + '.' + sign('RSA-SHA256', Buffer.from(data), privateKey).toString('base64url');
  }
  const devToken = token('tone-translator-dev');
  const wrongToken = token('other-firebase-project');
  const privateError = 'private provider error fixture';
  let mode: 'success' | 'before' | 'after' = 'success';
  function content(text: string) {
    return Object.assign(new GenerateContentResponse(), {
      candidates: [{ content: { parts: [{ text }] } }],
      modelVersion: 'fixture-model',
    });
  }
  const generateContent = t.mock.fn(async () => {
    if (mode === 'before') throw new Error(privateError);
    return content('{"fixture":true}');
  });
  const generateContentStream = t.mock.fn(async () => {
    if (mode === 'before') throw new Error(privateError);
    return (async function* () {
      yield content('fixture chunk');
      if (mode === 'after') throw new Error(privateError);
    })();
  });
  const app = await createServerApp(
    { models: { generateContent, generateContentStream } },
    { expectedProjectId: resolveServerProjectId(), customCerts: { fixture: publicKey.export({ type: 'spki', format: 'pem' }).toString() } },
    'development',
    dist,
  );
  const server = createServer(app).listen(0, '127.0.0.1');
  t.after(() => {
    server.closeAllConnections();
    server.close();
  });
  await once(server, 'listening');
  const base = 'http://127.0.0.1:' + (server.address() as AddressInfo).port;
  function request(path: string, bearer?: string, body?: object) {
    const headers = new Headers();
    if (bearer) headers.set('Authorization', 'Bearer ' + bearer);
    if (body) headers.set('Content-Type', 'application/json');
    return fetch(base + path, {
      method: body ? 'POST' : 'GET', headers, body: JSON.stringify(body),
      signal: AbortSignal.timeout(3000),
    });
  }
  const generate = '/api/gemini/generate';
  const stream = '/api/gemini/stream';
  for (const route of [generate, '/api/gemini/tone-profile', '/api/gemini/translate-tone', stream]) {
    await t.test(route + ' authenticates before calling Gemini', async () => {
      const upstream = route === stream ? generateContentStream : generateContent;
      const callsBefore = upstream.mock.callCount();
      for (const [bearer, status, code] of [
        [undefined, 401, 'MISSING_AUTHORIZATION_HEADER'],
        [wrongToken, 403, 'WRONG_PROJECT'],
      ] as const) {
        const response = await request(route, bearer, {});
        assert.equal(response.status, status);
        assert.equal((await response.json()).code, code);
      }
      assert.equal(upstream.mock.callCount(), callsBefore);
      const response = await request(route, devToken, { contents: 'fixture', textPrompt: 'fixture', prompt: 'fixture' });
      assert.equal(response.status, 200);
      assert.equal(upstream.mock.callCount(), callsBefore + 1);
      if (route === stream) {
        assert.equal(await response.text(), 'data: {"text":"fixture chunk"}\n\ndata: [DONE]\n\n');
      } else {
        assert.equal((await response.json()).execution.returnedModelVersion, 'fixture-model');
      }
    });
  }

  await t.test('source denials take precedence over deployed static serving', async () => {
    assert.equal(await (await request('/public.txt')).text(), 'public asset fixture');
    for (const route of ['/api/export-source', '/tone-translator-source.zip']) {
      const response = await request(route, devToken);
      assert.equal(response.status, 403, route);
      assert.deepEqual(await response.json(), { error: 'Source archive export is disabled', code: 'FORBIDDEN' });
    }
  });

  await t.test('generate returns a generic failure envelope', async () => {
    mode = 'before';
    const response = await request(generate, devToken, {});
    assert.equal(response.status, 502);
    const body = await response.text();
    assert.equal(JSON.parse(body).error, 'Tone request failed (generation/unknown).');
    assert.ok(!body.includes(privateError));
  });

  await t.test('stream failure before headers returns a generic error', async () => {
    mode = 'before';
    const response = await request(stream, devToken, {});
    assert.equal(response.status, 500);
    assert.deepEqual(await response.json(), { error: 'Streaming failed' });
  });

  await t.test('stream failure after headers sends a generic SSE error and closes', async () => {
    mode = 'after';
    const response = await request(stream, devToken, {});
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('content-type'), 'text/event-stream');
    assert.equal(await response.text(), 'data: {"text":"fixture chunk"}\n\ndata: {"error":"Stream error"}\n\n');
  });
});
