import type { Request, Response, NextFunction } from 'express';
import { createPublicKey, verify as cryptoVerify } from 'crypto';

export interface VerifiedTokenPayload {
  uid: string;
  sub: string;
  aud: string;
  iss: string;
  iat: number;
  exp: number;
  auth_time: number;
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
  firebase?: {
    identities?: Record<string, string[]>;
    sign_in_provider?: string;
  };
  [key: string]: unknown;
}

export interface TokenVerifierOptions {
  expectedProjectId?: string;
  certsUrl?: string;
  customCerts?: Record<string, string>;
  clockSkewSeconds?: number;
}

const GOOGLE_CERTS_URL = 'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';
const CLOCK_SKEW_DEFAULT = 60; // 60 seconds clock skew tolerance

// In-memory cache for Google public x509 certificates
let cachedCerts: Record<string, string> | null = null;
let certsExpiryTime = 0;
let cachedCertsUrl: string | undefined;

/**
 * Resolves the expected Firebase project ID for server-side verification.
 * DEV: 'tone-translator-dev'
 * PROD: 'gen-lang-client-0299754092'
 */
export function resolveServerProjectId(override?: string): string {
  const env = process.env.APP_ENV;
  const expected = override ?? (env === 'development' ? 'tone-translator-dev'
    : env === 'production' ? 'gen-lang-client-0299754092' : undefined);
  if (!expected || !/^[a-z][a-z0-9-]{4,28}[a-z0-9]$/.test(expected) ||
      (!override && process.env.FIREBASE_PROJECT_ID !== undefined && process.env.FIREBASE_PROJECT_ID !== expected)) {
    throw new Error('Invalid Firebase server project configuration');
  }
  return expected;
}

/**
 * Fetches Google's public certificates used to sign Firebase ID tokens.
 * Reuses certificates only for the freshness lifetime specified by Google.
 */
export async function getGooglePublicCerts(customCerts?: Record<string, string>, certsUrl = GOOGLE_CERTS_URL): Promise<Record<string, string>> {
  if (customCerts && Object.keys(customCerts).length > 0) {
    return customCerts;
  }

  const now = Date.now();
  if (cachedCerts && cachedCertsUrl === certsUrl && now < certsExpiryTime) {
    return cachedCerts;
  }

  try {
    const res = await fetch(certsUrl, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(4500),
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch Google public certs: HTTP ${res.status}`);
    }

    const data = (await res.json()) as Record<string, string>;
    if (!data || typeof data !== 'object' || Array.isArray(data) ||
        !Object.values(data).length || Object.values(data).some(value => typeof value !== 'string')) {
      throw new Error('Invalid certificate response format from Google');
    }

    // Determine cache expiration from Cache-Control header
    const cacheControl = res.headers.get('cache-control') || '';
    const maxAgeMatch = cacheControl.match(/(?:^|,)\s*max-age=(\d+)(?:\s*,|$)/i);
    const age = Number(res.headers.get('age') ?? '0');
    const maxAgeSec = /(?:^|,)\s*(?:no-cache|no-store)\b/i.test(cacheControl)
      ? 0 : Math.max(0, Number(maxAgeMatch?.[1] ?? 0) - age);

    cachedCerts = data;
    cachedCertsUrl = certsUrl;
    certsExpiryTime = now + (maxAgeSec * 1000);

    return data;
  } catch {
    throw new AuthVerificationError('Signing certificates unavailable', 'CERTIFICATES_UNAVAILABLE', 503);
  }
}

/**
 * Clears certificate cache (useful for testing and key rotations).
 */
export function clearCertCache(): void {
  cachedCerts = null;
  certsExpiryTime = 0;
}

export class AuthVerificationError extends Error {
  code: string;
  statusCode: number;

  constructor(message: string, code: string, statusCode = 401) {
    super(message);
    this.name = 'AuthVerificationError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

/**
 * Verifies a Firebase ID token (JWT) using Google's public keys and project configuration.
 */
export async function verifyFirebaseIdToken(
  token: string,
  options: TokenVerifierOptions = {}
): Promise<VerifiedTokenPayload> {
  if (!token || typeof token !== 'string') {
    throw new AuthVerificationError('Token is missing or empty', 'MISSING_TOKEN', 401);
  }

  const parts = token.trim().split('.');
  if (parts.length !== 3) {
    throw new AuthVerificationError('Malformed token: must have 3 segments', 'MALFORMED_TOKEN', 401);
  }

  const [headerB64, payloadB64, signatureB64] = parts;

  let header: { alg?: string; kid?: string; typ?: string };
  let payload: Record<string, any>;

  try {
    header = JSON.parse(Buffer.from(headerB64, 'base64url').toString('utf8'));
  } catch {
    throw new AuthVerificationError('Invalid token header encoding', 'INVALID_HEADER', 401);
  }

  try {
    payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
  } catch {
    throw new AuthVerificationError('Invalid token payload encoding', 'INVALID_PAYLOAD', 401);
  }

  if (header?.alg !== 'RS256') {
    throw new AuthVerificationError(`Unsupported algorithm: ${header.alg}. Expected RS256.`, 'UNSUPPORTED_ALGORITHM', 401);
  }

  if (typeof header.kid !== 'string' || !header.kid) {
    throw new AuthVerificationError('Token header missing key identifier (kid)', 'MISSING_KID', 401);
  }

  const expectedProjectId = resolveServerProjectId(options.expectedProjectId);
  const clockSkew = options.clockSkewSeconds ?? CLOCK_SKEW_DEFAULT;
  const nowSec = Math.floor(Date.now() / 1000);

  // 1. Audience check (Audience must match expected Firebase project ID)
  if (payload?.aud !== expectedProjectId) {
    throw new AuthVerificationError(
      `Token audience '${payload.aud}' does not match expected project '${expectedProjectId}'`,
      'WRONG_PROJECT',
      403
    );
  }

  // 2. Issuer check (Issuer must match https://securetoken.google.com/<expectedProjectId>)
  const expectedIssuer = `https://securetoken.google.com/${expectedProjectId}`;
  if (payload.iss !== expectedIssuer) {
    throw new AuthVerificationError(
      `Token issuer '${payload.iss}' does not match expected issuer '${expectedIssuer}'`,
      'WRONG_ISSUER',
      403
    );
  }

  // 3. Subject check (Subject must be a non-empty string UID)
  if (!payload.sub || typeof payload.sub !== 'string' || payload.sub.trim() === '' || payload.sub.length > 128) {
    throw new AuthVerificationError('Token sub (UID) is missing or invalid', 'INVALID_SUB', 401);
  }

  // 4. Expiration check
  if (!Number.isSafeInteger(payload.exp)) {
    throw new AuthVerificationError('Token exp is missing or non-numeric', 'INVALID_EXP', 401);
  }
  if (payload.exp <= nowSec) {
    throw new AuthVerificationError('Token has expired', 'TOKEN_EXPIRED', 401);
  }

  // 5. Issued-at check
  if (!Number.isSafeInteger(payload.iat)) {
    throw new AuthVerificationError('Token iat is missing or non-numeric', 'INVALID_IAT', 401);
  }
  if (payload.iat - clockSkew > nowSec) {
    throw new AuthVerificationError('Token was issued in the future', 'TOKEN_ISSUED_FUTURE', 401);
  }

  if (!Number.isSafeInteger(payload.auth_time) || payload.auth_time <= 0 || payload.auth_time - clockSkew > nowSec) {
    throw new AuthVerificationError('Invalid authentication time', 'INVALID_AUTH_TIME', 401);
  }

  // 6. Cryptographic signature check against Google public certs
  const certs = await getGooglePublicCerts(options.customCerts, options.certsUrl);
  const certPem = Object.hasOwn(certs, header.kid) ? certs[header.kid] : undefined;

  if (!certPem) {
    throw new AuthVerificationError(`No public certificate found matching token kid: ${header.kid}`, 'UNKNOWN_KID', 401);
  }

  try {
    const dataToVerify = Buffer.from(`${headerB64}.${payloadB64}`, 'utf8');
    const signature = Buffer.from(signatureB64, 'base64url');
    const publicKey = createPublicKey(certPem);

    const isValidSignature = cryptoVerify('RSA-SHA256', dataToVerify, publicKey, signature);
    if (!isValidSignature) {
      throw new AuthVerificationError('Cryptographic token signature verification failed', 'INVALID_SIGNATURE', 401);
    }
  } catch (sigErr: any) {
    if (sigErr instanceof AuthVerificationError) {
      throw sigErr;
    }
    throw new AuthVerificationError(`Signature verification error: ${sigErr?.message || String(sigErr)}`, 'INVALID_SIGNATURE', 401);
  }

  if (payload.exp <= Math.floor(Date.now() / 1000)) {
    throw new AuthVerificationError('Token has expired', 'TOKEN_EXPIRED', 401);
  }
  return {
    ...payload,
    uid: payload.sub,
    sub: payload.sub,
    aud: payload.aud,
    iss: payload.iss,
    iat: payload.iat,
    exp: payload.exp,
  } as VerifiedTokenPayload;
}

/**
 * Express middleware to enforce Firebase ID token authentication on protected routes.
 */
export function createAuthMiddleware(options: TokenVerifierOptions = {}) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      res.status(401).json({
        error: 'Unauthorized: Authentication required',
        code: 'MISSING_AUTHORIZATION_HEADER',
      });
      return;
    }

    if (!authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        error: 'Unauthorized: Malformed Authorization header. Expected Bearer token format.',
        code: 'INVALID_HEADER_FORMAT',
      });
      return;
    }

    const token = authHeader.substring(7).trim();
    if (!token) {
      res.status(401).json({
        error: 'Unauthorized: Bearer token is empty',
        code: 'EMPTY_BEARER_TOKEN',
      });
      return;
    }

    try {
      const verifiedUser = await verifyFirebaseIdToken(token, options);
      (req as any).user = verifiedUser;
      next();
    } catch (err: any) {
      const statusCode = err instanceof AuthVerificationError ? err.statusCode : 401;
      const errorCode = err instanceof AuthVerificationError ? err.code : 'UNAUTHORIZED';
      res.status(statusCode).json({
        error: statusCode === 503 ? 'Authentication temporarily unavailable' : 'Unauthorized: Token verification failed',
        code: errorCode,
      });
    }
  };
}
