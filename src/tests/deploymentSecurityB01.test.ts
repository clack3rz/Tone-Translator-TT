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
  AuthVerificationError,
  VerifiedTokenPayload,
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

    // Protected diagnostic / export-source route
    app.get('/api/export-source', devAuthMiddleware, (req, res) => {
      const user = (req as any).user;
      const isDeployed = process.env.NODE_ENV === 'production' || !!process.env.APP_ENV;
      if (isDeployed && user?.email !== 'cclackerz@gmail.com') {
        res.status(403).json({ error: 'Source archive export is disabled in deployed environments', code: 'FORBIDDEN' });
        return;
      }
      res.status(200).json({ archive: 'source.zip ready' });
    });

    testServer = http.createServer(app);
    wss = new WebSocketServer({ server: testServer, path: '/live' });

    wss.on('connection', (clientWs: WebSocket) => {
      let authenticated = false;

      const authTimeout = setTimeout(() => {
        if (!authenticated && clientWs.readyState === WebSocket.OPEN) {
          clientWs.send(JSON.stringify({ error: 'Authentication timeout: Valid Firebase ID token required.' }));
          clientWs.close(4401, 'Unauthorized');
        }
      }, 500);

      clientWs.on('message', async (data) => {
        try {
          const parsed = JSON.parse(data.toString());
          if (!authenticated) {
            const token = parsed.token || parsed.auth;
            if (token) {
              try {
                const user = await verifyFirebaseIdToken(token, {
                  expectedProjectId: DEV_PROJECT_ID,
                  customCerts: mockCerts,
                });
                authenticated = true;
                clearTimeout(authTimeout);
                clientWs.send(JSON.stringify({ type: 'authenticated', uid: user.uid }));
                return;
              } catch (err: any) {
                clientWs.send(JSON.stringify({ error: err.message || 'Authentication failed' }));
                clientWs.close(4401, 'Unauthorized');
                return;
              }
            }

            clientWs.send(JSON.stringify({ error: 'Unauthenticated: Initial authentication message required.' }));
            clientWs.close(4401, 'Unauthorized');
            return;
          }

          if (parsed.audio) {
            clientWs.send(JSON.stringify({ receivedAudio: true, bytes: parsed.audio.length }));
          }
        } catch {
          clientWs.close(4400, 'Bad Request');
        }
      });

      clientWs.on('close', () => {
        clearTimeout(authTimeout);
      });
    });

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
      exp: Math.floor(Date.now() / 1000) - 120, // Expired 2 minutes ago
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
  it('SEC-09: Rejects unauthenticated access to /api/export-source with 401', async () => {
    const res = await fetch(`http://127.0.0.1:${testServerPort}/api/export-source`);
    assert.equal(res.status, 401);
  });

  it('SEC-10: Rejects non-admin users from /api/export-source in deployed mode with 403', async () => {
    process.env.APP_ENV = 'development';
    try {
      const nonAdminToken = createTestJwt({
        email: 'regular-user@example.com',
      });

      const res = await fetch(`http://127.0.0.1:${testServerPort}/api/export-source`, {
        headers: { Authorization: `Bearer ${nonAdminToken}` },
      });

      assert.equal(res.status, 403);
      const body = await res.json();
      assert.equal(body.code, 'FORBIDDEN');
    } finally {
      delete process.env.APP_ENV;
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

    assert.ok(messages.some(m => m.receivedAudio === true));
    ws.close();
  });

  // 14. Preservation of Public Endpoints
  it('SEC-15: Public health check endpoint /api/health remains accessible without token', async () => {
    const res = await fetch(`http://127.0.0.1:${testServerPort}/api/health`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.status, 'ok');
  });

  // 15. Server Project Resolution Logic
  it('SEC-16: Server resolves tone-translator-dev by default or APP_ENV=development', () => {
    delete process.env.FIREBASE_PROJECT_ID;
    delete process.env.APP_ENV;
    delete process.env.NODE_ENV;

    assert.equal(resolveServerProjectId(), 'tone-translator-dev');

    process.env.APP_ENV = 'production';
    assert.equal(resolveServerProjectId(), 'gen-lang-client-0299754092');

    process.env.FIREBASE_PROJECT_ID = 'custom-dev-project';
    assert.equal(resolveServerProjectId(), 'custom-dev-project');

    delete process.env.FIREBASE_PROJECT_ID;
    delete process.env.APP_ENV;
  });
});
