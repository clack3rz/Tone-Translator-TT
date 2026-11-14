import { once } from 'node:events';
import { attachLiveHandler } from '../server/liveHandler';
import { denySourceExport } from '../server/sourceExport';
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';
import express from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import { generateKeyPairSync, sign as cryptoSign } from 'crypto';
import {
  verifyFirebaseIdToken,
  createAuthMiddleware,
  resolveServerProjectId,
  clearCertCache
} from '../server/auth/tokenVerifier';

describe('Stage 3B — Focused Deployment Security & Endpoint Protection', () => {
  // Generate deterministic RSA-2048 keypair for cryptographic token testing
  const { privateKey, publicKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });

  const { privateKey: wrongPrivateKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });

  const TEST_KID = 'tt-security-test-key-01';
  const DEV_PROJECT_ID = 'tone-translator-dev';
  const PROD_PROJECT_ID = 'gen-lang-client-0299754092';

  const mockCerts: Record<string, string> = {
    [TEST_KID]: publicKey,
  };

  /**
   * Helper to craft valid or invalid test JWTs
   */
  function createTestJwt(
    payloadOverrides: Record<string, any> = {},
    options: {
      kid?: string;
      useWrongKey?: boolean;
      tamperSignature?: boolean;
    } = {}
  ): string {
    const header = {
      alg: 'RS256',
      kid: options.kid || TEST_KID,
      typ: 'JWT',
    };

    const now = Math.floor(Date.now() / 1000);
    const payload = {
      iss: `https://securetoken.google.com/${DEV_PROJECT_ID}`,
      aud: DEV_PROJECT_ID,
      auth_time: now - 10,
      sub: 'test-user-uid-12345',
      iat: now - 10,
      exp: now + 3600,
      email: 'tester@tone-translator.dev',
      email_verified: true,
      ...payloadOverrides,
    };

    const headerB64 = Buffer.from(JSON.stringify(header)).toString('base64url');
    const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const dataToSign = `${headerB64}.${payloadB64}`;

    const keyToUse = options.useWrongKey ? wrongPrivateKey : privateKey;
    let signature = cryptoSign('RSA-SHA256', Buffer.from(dataToSign, 'utf8'), keyToUse).toString('base64url');

    if (options.tamperSignature) {
      signature = signature.substring(0, signature.length - 4) + 'AAAA';
    }

    return `${headerB64}.${payloadB64}.${signature}`;
  }

  // Set up mock test Express & WebSocket server
  let testServer: http.Server;
  let testServerPort: number;
  let wss: WebSocketServer;
  let upstreamConnections = 0;
  const upstreamClosures: number[] = [];
  let audioFrames = 0;
  let connectGate: Promise<void> | undefined;

  before(async () => {
    clearCertCache();
    const app = express();
    app.use(express.json());

    // Public health endpoint
    app.get('/api/health', (_req, res) => {
      res.status(200).json({ status: 'ok' });
    });

    const devAuthMiddleware = createAuthMiddleware({
      expectedProjectId: DEV_PROJECT_ID,
      customCerts: mockCerts,
    });

    // Protected Gemini test endpoints
    app.post('/api/gemini/generate', devAuthMiddleware, (req, res) => {
      res.status(200).json({ text: 'mock generation success', user: (req as any).user });
    });

    app.post('/api/gemini/stream', devAuthMiddleware, (_req, res) => {
      res.status(200).json({ status: 'stream started' });
    });

    app.post('/api/gemini/tone-profile', devAuthMiddleware, (_req, res) => {
      res.status(200).json({ status: 'profile generated' });
    });

    app.get('/api/export-source', denySourceExport);

    testServer = http.createServer(app);
    wss = new WebSocketServer({ server: testServer, path: '/live' });

    attachLiveHandler(wss, {
      connect: async () => {
        const connectionId = ++upstreamConnections;
        if (connectGate) await connectGate;
        return {
          sendRealtimeInput: () => { audioFrames++; },
          close: () => { upstreamClosures.push(connectionId); },
        };
      },
    }, { expectedProjectId: DEV_PROJECT_ID, customCerts: mockCerts });

    await new Promise<void>((resolve) => {
      testServer.listen(0, '127.0.0.1', () => {
        const addr = testServer.address() as any;
        testServerPort = addr.port;
        resolve();
      });
    });
  });

  after(async () => {
    wss.close();
    await new Promise<void>((resolve) => testServer.close(() => resolve()));
  });

  // 1. Missing Authentication
  it('SEC-01: Rejects HTTP request missing Authorization header with 401', async () => {
    const res = await fetch(`http://127.0.0.1:${testServerPort}/api/gemini/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: 'test prompt' }),
    });

    assert.equal(res.status, 401);
    const body = await res.json();
    assert.equal(body.code, 'MISSING_AUTHORIZATION_HEADER');
  });

  // 2. Malformed Authorization Header Format
  it('SEC-02: Rejects non-Bearer Authorization headers with 401 INVALID_HEADER_FORMAT', async () => {
    const res = await fetch(`http://127.0.0.1:${testServerPort}/api/gemini/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic dXNlcjpwYXNz',
      },
      body: JSON.stringify({ contents: 'test' }),
    });

    assert.equal(res.status, 401);
    const body = await res.json();
    assert.equal(body.code, 'INVALID_HEADER_FORMAT');
  });

  // 3. Malformed Token Structure
  it('SEC-03: Rejects malformed tokens (not 3 dot-separated segments) with 401', async () => {
    const res = await fetch(`http://127.0.0.1:${testServerPort}/api/gemini/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer not-a-valid-jwt-token',
      },
      body: JSON.stringify({ contents: 'test' }),
    });

    assert.equal(res.status, 401);
    const body = await res.json();
    assert.equal(body.code, 'MALFORMED_TOKEN');
  });

  // 4. Expired Token
  it('SEC-04: Rejects expired tokens with 401 TOKEN_EXPIRED', async () => {
    const expiredToken = createTestJwt({
      exp: Math.floor(Date.now() / 1000) - 1,
    });

    const res = await fetch(`http://127.0.0.1:${testServerPort}/api/gemini/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${expiredToken}`,
      },
      body: JSON.stringify({ contents: 'test' }),
    });

    assert.equal(res.status, 401);
    const body = await res.json();
    assert.equal(body.code, 'TOKEN_EXPIRED');
  });

  // 5. Wrong Firebase Project ID
  it('SEC-05: Rejects tokens issued for PROD project with 403 WRONG_PROJECT on DEV server', async () => {
    const prodToken = createTestJwt({
      aud: PROD_PROJECT_ID,
      iss: `https://securetoken.google.com/${PROD_PROJECT_ID}`,
    });

    const res = await fetch(`http://127.0.0.1:${testServerPort}/api/gemini/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${prodToken}`,
      },
      body: JSON.stringify({ contents: 'test' }),
    });

    assert.equal(res.status, 403);
    const body = await res.json();
    assert.equal(body.code, 'WRONG_PROJECT');
  });

  // 6. Wrong Issuer
  it('SEC-06: Rejects tokens with forged issuer with 403 WRONG_ISSUER', async () => {
    const forgedIssuerToken = createTestJwt({
      aud: DEV_PROJECT_ID,
      iss: 'https://attacker.example.com/fake-issuer',
    });

    const res = await fetch(`http://127.0.0.1:${testServerPort}/api/gemini/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${forgedIssuerToken}`,
      },
      body: JSON.stringify({ contents: 'test' }),
    });

    assert.equal(res.status, 403);
    const body = await res.json();
    assert.equal(body.code, 'WRONG_ISSUER');
  });

  // 7. Invalid Cryptographic Signature
  it('SEC-07: Rejects tokens signed by untrusted private key with 401 INVALID_SIGNATURE', async () => {
    const untrustedToken = createTestJwt({}, { useWrongKey: true });

    const res = await fetch(`http://127.0.0.1:${testServerPort}/api/gemini/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${untrustedToken}`,
      },
      body: JSON.stringify({ contents: 'test' }),
    });

    assert.equal(res.status, 401);
    const body = await res.json();
    assert.equal(body.code, 'INVALID_SIGNATURE');
  });

  // 8. Successful Authorised Request
  it('SEC-08: Allows authenticated request with valid DEV ID token with 200 OK', async () => {
    const validToken = createTestJwt({
      sub: 'dev-engineer-99',
      email: 'engineer@tone-translator.dev',
    });

    const res = await fetch(`http://127.0.0.1:${testServerPort}/api/gemini/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${validToken}`,
      },
      body: JSON.stringify({ contents: 'translate AC/DC Plexi crunch' }),
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.text, 'mock generation success');
    assert.equal(body.user.uid, 'dev-engineer-99');
    assert.equal(body.user.email, 'engineer@tone-translator.dev');
  });

  // 9. Sensitive Diagnostic Route /api/export-source Protection
  it('denies source export both anonymously and with the former admin identity', async () => {
    const adminToken = createTestJwt({ email: 'cclackerz@gmail.com' });
    for (const headers of [{}, { Authorization: `Bearer ${adminToken}` }]) {
      const response = await fetch(`http://127.0.0.1:${testServerPort}/api/export-source`, { headers });
      assert.equal(response.status, 403);
      assert.equal((await response.json()).code, 'FORBIDDEN');
    }
  });

  // 10. WebSocket Rejection on Unauthenticated Audio Streaming
  it('SEC-11: Rejects WebSocket /live connection that sends audio before authentication with 4401', async () => {
    const ws = new WebSocket(`ws://127.0.0.1:${testServerPort}/live`);

    const closePromise = new Promise<{ code: number; reason: string }>((resolve) => {
      ws.on('close', (code, reason) => {
        resolve({ code, reason: reason.toString() });
      });
    });

    await new Promise((resolve) => ws.on('open', resolve));
    // Premature audio transmission before authentication
    ws.send(JSON.stringify({ audio: 'UklGRiQAAABXQVZFZm10IBAAAAABAAEA' }));

    const { code } = await closePromise;
    assert.equal(code, 4401);
  });

  // 11. WebSocket Rejection on Authentication Timeout
  it('SEC-12: Closes WebSocket /live with 4401 on authentication timeout', async () => {
    const ws = new WebSocket(`ws://127.0.0.1:${testServerPort}/live`);

    const closePromise = new Promise<{ code: number; reason: string }>((resolve) => {
      ws.on('close', (code, reason) => {
        resolve({ code, reason: reason.toString() });
      });
    });

    const { code } = await closePromise;
    assert.equal(code, 4401);
  });

  // 12. WebSocket Rejection on Wrong Project Token
  it('SEC-13: Rejects WebSocket /live authentication with PROD token on DEV server', async () => {
    const ws = new WebSocket(`ws://127.0.0.1:${testServerPort}/live`);

    const closePromise = new Promise<{ code: number; reason: string }>((resolve) => {
      ws.on('close', (code, reason) => {
        resolve({ code, reason: reason.toString() });
      });
    });

    await new Promise((resolve) => ws.on('open', resolve));

    const prodToken = createTestJwt({
      aud: PROD_PROJECT_ID,
      iss: `https://securetoken.google.com/${PROD_PROJECT_ID}`,
    });

    ws.send(JSON.stringify({ type: 'auth', token: prodToken }));

    const { code } = await closePromise;
    assert.equal(code, 4401);
  });

  // 13. WebSocket Successful Authentication & Session Readiness
  it('SEC-14: Authenticates WebSocket /live with valid DEV token and accepts audio', async () => {
    const ws = new WebSocket(`ws://127.0.0.1:${testServerPort}/live`);

    const messages: any[] = [];
    ws.on('message', (data) => {
      messages.push(JSON.parse(data.toString()));
    });

    await new Promise((resolve) => ws.on('open', resolve));

    const validToken = createTestJwt({
      sub: 'ws-guitarist-42',
      email: 'guitarist@tone-translator.dev',
    });

    ws.send(JSON.stringify({ type: 'auth', token: validToken }));

    // Wait for authentication acknowledgement
    await new Promise((resolve) => setTimeout(resolve, 100));

    assert.ok(messages.some(m => m.type === 'authenticated' && m.uid === 'ws-guitarist-42'));

    // Send audio payload once authenticated
    ws.send(JSON.stringify({ audio: 'UklGRiQAAABXQVZFZm10IBAAAAABAAEA' }));
    await new Promise((resolve) => setTimeout(resolve, 100));

    assert.equal(audioFrames, 1);
    const closed = once(ws, 'close');
    ws.close();
    await closed;
  });

  // 14. Preservation of Public Endpoints
  it('SEC-15: Public health check endpoint /api/health remains accessible without token', async () => {
    const res = await fetch(`http://127.0.0.1:${testServerPort}/api/health`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.status, 'ok');
  });

  it('requires explicit server environment and rejects a mismatched project', () => {
    const previous = process.env.APP_ENV;
    const project = process.env.FIREBASE_PROJECT_ID;
    try {
      delete process.env.APP_ENV;
      delete process.env.FIREBASE_PROJECT_ID;
      assert.throws(() => resolveServerProjectId());
      process.env.APP_ENV = 'development';
      assert.equal(resolveServerProjectId(), DEV_PROJECT_ID);
      process.env.FIREBASE_PROJECT_ID = PROD_PROJECT_ID;
      assert.throws(() => resolveServerProjectId());
      process.env.APP_ENV = 'production';
      assert.equal(resolveServerProjectId(), PROD_PROJECT_ID);
    } finally {
      if (previous === undefined) delete process.env.APP_ENV;
      else process.env.APP_ENV = previous;
      if (project === undefined) delete process.env.FIREBASE_PROJECT_ID;
      else process.env.FIREBASE_PROJECT_ID = project;
    }
  });

  it('fails closed when an expired certificate cache cannot refresh', async t => {
    const originalFetch = globalThis.fetch;
    let calls = 0;
    t.after(() => { globalThis.fetch = originalFetch; clearCertCache(); });
    globalThis.fetch = async () => ++calls === 1
      ? Response.json(mockCerts, { headers: { 'Cache-Control': 'max-age=0' } })
      : new Response(null, { status: 503 });
    const options = { expectedProjectId: DEV_PROJECT_ID };
    const token = createTestJwt();
    await verifyFirebaseIdToken(token, options);
    await assert.rejects(verifyFirebaseIdToken(token, options), { code: 'CERTIFICATES_UNAVAILABLE' });
  });

  it('accepts a valid upgrade bearer token through the same Live handler', { timeout: 5000 }, async () => {
    const ws = new WebSocket(`ws://127.0.0.1:${testServerPort}/live`, {
      headers: { Authorization: `Bearer ${createTestJwt()}` },
    });
    try {
      const [data] = await once(ws, 'message');
      assert.equal(JSON.parse(String(data)).type, 'authenticated');
    } finally {
      const closed = once(ws, 'close');
      ws.close();
      await closed;
    }
  });

  it('closes the upstream session at token expiry', { timeout: 5000 }, async () => {
    const connectionId = upstreamConnections + 1;
    const ws = new WebSocket(`ws://127.0.0.1:${testServerPort}/live`);
    const closed = once(ws, 'close');
    await once(ws, 'open');
    const ready = once(ws, 'message');
    ws.send(JSON.stringify({ token: createTestJwt({ exp: Math.floor(Date.now() / 1000) + 2 }) }));
    assert.equal(JSON.parse(String((await ready)[0])).type, 'authenticated');
    assert.equal((await closed)[0], 4401);
    assert.equal(upstreamClosures.filter(id => id === connectionId).length, 1);
  });

  it('closes a late upstream session after the client disconnects', { timeout: 5000 }, async () => {
    const connectionId = upstreamConnections + 1;
    const connections = upstreamConnections;
    let release!: () => void;
    connectGate = new Promise(resolve => { release = resolve; });
    const ws = new WebSocket(`ws://127.0.0.1:${testServerPort}/live`);
    try {
      await once(ws, 'open');
      const token = createTestJwt();
      ws.send(JSON.stringify({ token }));
      ws.send(JSON.stringify({ token }));
      for (let check = 0; check < 100 && upstreamConnections === connections; check++) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      assert.equal(upstreamConnections, connections + 1);
      const closed = once(ws, 'close');
      ws.close();
      await closed;
      assert.equal(upstreamConnections, connections + 1);
      release();
      await new Promise(resolve => setImmediate(resolve));
      assert.equal(upstreamClosures.filter(id => id === connectionId).length, 1);
    } finally {
      release();
      connectGate = undefined;
      ws.terminate();
    }
  });
});
