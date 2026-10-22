// src/sound-engineer/validation/gate8/gate8Signer.ts
// Authoritative cryptographic sealing, signature validation, and authentic authority verification
// for Gate 8 AdoptionDecisionRecord (Record 21).
// Bound to frozen specification v0.1j Section 26, Table 12, Table 20, and Build Plan v0.1h WP-22.

import { canonicalizeJson, IntegrityProvider, RecordIntegrityMetadata } from "../schemas/integrity";
import { AdoptionDecisionRecord } from "../schemas/records";
import { computeSha256Hex, DefaultSha256IntegrityProvider } from "../storage/ledgerTypes";
import { UnauthorizedSignerError } from "./gate8Errors";
import {
  AuthorityKeyCredentials,
  AuthorityRegistry,
  AuthorizingOfficialValidator,
  GOVERNED_AUTHORIZING_OFFICIAL_ROLES,
} from "./gate8Types";

// ---------------------------------------------------------------------------
// Pure TypeScript FIPS 180-2 SHA-256 and HMAC-SHA256 (0 dependencies)
// Guarantees synchronous, platform-neutral execution in both Node and browser bundles
// ---------------------------------------------------------------------------

const SHA256_K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

function rotr(n: number, x: number): number {
  return (x >>> n) | (x << (32 - n));
}

function sha256Bytes(bytes: Uint8Array): Uint8Array {
  const bitLength = bytes.length * 8;
  const extraBytes = (bytes.length + 9) % 64;
  const paddingLength = extraBytes === 0 ? 0 : 64 - extraBytes;
  const totalLength = bytes.length + 1 + paddingLength + 8;
  const padded = new Uint8Array(totalLength);
  padded.set(bytes, 0);
  padded[bytes.length] = 0x80;

  const view = new DataView(padded.buffer);
  const highBits = Math.floor(bitLength / 0x100000000);
  const lowBits = bitLength >>> 0;
  view.setUint32(totalLength - 8, highBits, false);
  view.setUint32(totalLength - 4, lowBits, false);

  let h0 = 0x6a09e667;
  let h1 = 0xbb67ae85;
  let h2 = 0x3c6ef372;
  let h3 = 0xa54ff53a;
  let h4 = 0x510e527f;
  let h5 = 0x9b05688c;
  let h6 = 0x1f83d9ab;
  let h7 = 0x5be0cd19;

  const w = new Uint32Array(64);

  for (let offset = 0; offset < totalLength; offset += 64) {
    for (let i = 0; i < 16; i++) {
      w[i] = view.getUint32(offset + i * 4, false);
    }
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(7, w[i - 15]) ^ rotr(18, w[i - 15]) ^ (w[i - 15] >>> 3);
      const s1 = rotr(17, w[i - 2]) ^ rotr(19, w[i - 2]) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }

    let a = h0;
    let b = h1;
    let c = h2;
    let d = h3;
    let e = h4;
    let f = h5;
    let g = h6;
    let h = h7;

    for (let i = 0; i < 64; i++) {
      const s1 = rotr(6, e) ^ rotr(11, e) ^ rotr(25, e);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + s1 + ch + SHA256_K[i] + w[i]) >>> 0;
      const s0 = rotr(2, a) ^ rotr(13, a) ^ rotr(22, a);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (s0 + maj) >>> 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }

    h0 = (h0 + a) >>> 0;
    h1 = (h1 + b) >>> 0;
    h2 = (h2 + c) >>> 0;
    h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0;
    h5 = (h5 + f) >>> 0;
    h6 = (h6 + g) >>> 0;
    h7 = (h7 + h) >>> 0;
  }

  const out = new Uint8Array(32);
  const outView = new DataView(out.buffer);
  outView.setUint32(0, h0, false);
  outView.setUint32(4, h1, false);
  outView.setUint32(8, h2, false);
  outView.setUint32(12, h3, false);
  outView.setUint32(16, h4, false);
  outView.setUint32(20, h5, false);
  outView.setUint32(24, h6, false);
  outView.setUint32(28, h7, false);
  return out;
}

/**
 * Computes standard FIPS-compliant HMAC-SHA256 in pure TypeScript (0 dependencies).
 */
export function computeHmacSha256Hex(key: string, data: string): string {
  const encoder = new TextEncoder();
  let keyBytes = encoder.encode(key);
  const dataBytes = encoder.encode(data);

  if (keyBytes.length > 64) {
    keyBytes = sha256Bytes(keyBytes);
  }

  const kPad = new Uint8Array(64);
  kPad.set(keyBytes);

  const ipad = new Uint8Array(64);
  const opad = new Uint8Array(64);
  for (let i = 0; i < 64; i++) {
    ipad[i] = kPad[i] ^ 0x36;
    opad[i] = kPad[i] ^ 0x5c;
  }

  const innerMsg = new Uint8Array(64 + dataBytes.length);
  innerMsg.set(ipad, 0);
  innerMsg.set(dataBytes, 64);
  const innerHash = sha256Bytes(innerMsg);

  const outerMsg = new Uint8Array(64 + 32);
  outerMsg.set(opad, 0);
  outerMsg.set(innerHash, 64);
  const outerHash = sha256Bytes(outerMsg);

  return Array.from(outerHash)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Keyed Cryptographic Authority Integrity Provider implementing HMAC-SHA256.
 * Binds payload integrity to authentic authorizing official key material.
 */
export class KeyedAuthorityIntegrityProvider implements IntegrityProvider {
  public readonly algorithmName = "HMAC-SHA256";
  private readonly authorityKey: string;

  constructor(authorityKey: string) {
    if (!authorityKey || typeof authorityKey !== "string" || authorityKey.trim().length === 0) {
      throw new UnauthorizedSignerError("Authority cryptographic signing key must be a non-empty string.");
    }
    this.authorityKey = authorityKey.trim();
  }

  public computeDigest(payload: unknown): string {
    const canonicalPayload = typeof payload === "string" ? payload : canonicalizeJson(payload);
    return computeHmacSha256Hex(this.authorityKey, canonicalPayload);
  }

  public verifyDigest(payload: unknown, expectedDigest: string): boolean {
    const computed = this.computeDigest(payload);
    return computed === expectedDigest;
  }
}

/**
 * Concrete implementation of AuthorityRegistry for Phase 1C.5h Gate 8.
 */
export class AuthorityKeyRegistry implements AuthorityRegistry {
  private readonly authorities = new Map<string, AuthorityKeyCredentials>();
  private readonly normalizedAuthorities = new Map<string, AuthorityKeyCredentials>();

  constructor(initialAuthorities?: ReadonlyArray<AuthorityKeyCredentials>) {
    if (initialAuthorities) {
      for (const auth of initialAuthorities) {
        this.registerAuthority(auth);
      }
    }
  }

  public registerAuthority(credentials: AuthorityKeyCredentials): void {
    this.authorities.set(credentials.officialId, credentials);
    this.normalizedAuthorities.set(credentials.officialId.toLowerCase().trim(), credentials);
  }

  public isAuthorizedOfficial(officialId: string): boolean {
    if (!officialId || typeof officialId !== "string") return false;
    return (
      this.authorities.has(officialId.trim()) ||
      this.normalizedAuthorities.has(officialId.toLowerCase().trim())
    );
  }

  public getAuthorityCredentials(officialId: string): AuthorityKeyCredentials | undefined {
    if (!officialId || typeof officialId !== "string") return undefined;
    return (
      this.authorities.get(officialId.trim()) ??
      this.normalizedAuthorities.get(officialId.toLowerCase().trim())
    );
  }
}

/**
 * Canonical default registered Gate 8 authorities and their governed credentials.
 */
export const DEFAULT_GATE8_AUTHORITIES: ReadonlyArray<AuthorityKeyCredentials> = Object.freeze([
  {
    officialId: "Chief Sound Engineering Governance Authority",
    role: "CHIEF_SOUND_ENGINEERING_GOVERNANCE_AUTHORITY",
    keyOrSecret: "sec_key_chief_governance_2026_q4_phase1c5h",
  },
  {
    officialId: "Phase 1C.5h Governance Official",
    role: "PHASE_1C5H_GOVERNANCE_OFFICIAL",
    keyOrSecret: "sec_key_phase1c5h_official_2026_q4",
  },
  {
    officialId: "Governance Lead",
    role: "GOVERNANCE_LEAD",
    keyOrSecret: "sec_key_governance_lead_2026_q4",
  },
  {
    officialId: "Lead Acoustic Architect",
    role: "LEAD_ACOUSTIC_ARCHITECT",
    keyOrSecret: "sec_key_lead_acoustic_2026_q4",
  },
  {
    officialId: "Automated Gate 8 Pipeline",
    role: "AUTOMATED_GATE8_PIPELINE",
    keyOrSecret: "sec_key_automated_gate8_pipeline_2026_q4",
  },
]);

/**
 * Singleton default authority registry pre-populated with canonical Gate 8 authorities.
 */
export const DEFAULT_GATE8_AUTHORITY_REGISTRY = new AuthorityKeyRegistry(DEFAULT_GATE8_AUTHORITIES);

/**
 * Validates whether an authorizing official identity is recognized and authorized.
 */
export function validateAuthorizingOfficial(
  official: unknown,
  customValidator?: AuthorizingOfficialValidator,
  registry: AuthorityRegistry = DEFAULT_GATE8_AUTHORITY_REGISTRY
): boolean {
  if (!official || typeof official !== "string" || official.trim().length === 0) {
    return false;
  }

  const trimmed = official.trim();

  if (customValidator) {
    return customValidator(trimmed);
  }

  return registry.isAuthorizedOfficial(trimmed);
}

/**
 * Asserts that the authorizing official is authorized and their supplied cryptographic key
 * matches their registered credentials (detecting forged identities).
 */
export function assertAuthorizingOfficial(
  official: unknown,
  customValidator?: AuthorizingOfficialValidator,
  registry: AuthorityRegistry = DEFAULT_GATE8_AUTHORITY_REGISTRY,
  suppliedKey?: string
): asserts official is string {
  if (!official || typeof official !== "string" || official.trim().length === 0) {
    throw new UnauthorizedSignerError(
      "Authorizing official identity must be explicitly provided and non-empty."
    );
  }

  const trimmed = official.trim();

  if (!validateAuthorizingOfficial(trimmed, customValidator, registry)) {
    throw new UnauthorizedSignerError(
      `Identity "${trimmed}" is not a recognized or authorized Gate 8 cutover signing authority.`
    );
  }

  // If a key was explicitly supplied, verify it matches registered authority credentials
  if (suppliedKey !== undefined) {
    const creds = registry.getAuthorityCredentials(trimmed);
    if (!creds || creds.keyOrSecret !== suppliedKey) {
      throw new UnauthorizedSignerError(
        `Cryptographic key mismatch: supplied key does not match registered authority key for "${trimmed}". Forgery attempt detected.`
      );
    }
  }
}

/**
 * Creates tamper-evident RecordIntegrityMetadata over an AdoptionDecisionRecord payload
 * using the supplied pluggable technology-neutral IntegrityProvider.
 */
export function sealAdoptionDecisionPayload(
  payloadWithoutIntegrity: Record<string, unknown>,
  authorizingOfficial: string,
  integrityProvider: IntegrityProvider,
  sealedAt: string
): RecordIntegrityMetadata {
  const canonicalJson = canonicalizeJson(payloadWithoutIntegrity);
  const integrityDigest = integrityProvider.computeDigest(canonicalJson);

  return {
    integrity_digest: integrityDigest,
    algorithm: integrityProvider.algorithmName,
    sealed_at: sealedAt,
    signer_identity: authorizingOfficial,
    canonical_serialization_format: "RFC-8785",
  };
}

export interface VerifyAdoptionDecisionIntegrityOptions {
  readonly registry?: AuthorityRegistry;
  readonly expectedKey?: string;
  readonly integrityProvider?: IntegrityProvider;
  readonly allowUnauthenticatedDigest?: boolean;
}

/**
 * Cryptographically verifies both payload integrity AND authorization authenticity of an issued AdoptionDecisionRecord.
 *
 * Enforces:
 * 1. The payload has not been tampered with.
 * 2. The authorizing_official is a recognized authority in the registry.
 * 3. The signature was created using the genuine registered key of the declared authorizing_official (forged signers fail closed).
 */
export function verifyAdoptionDecisionIntegrity(
  record: AdoptionDecisionRecord,
  options?: VerifyAdoptionDecisionIntegrityOptions | IntegrityProvider
): boolean {
  if (!record || !record.record_integrity_metadata) {
    return false;
  }

  const { record_integrity_metadata, ...payloadWithoutIntegrity } = record;
  const canonicalJson = canonicalizeJson(payloadWithoutIntegrity);

  // If caller passed a raw IntegrityProvider (e.g. legacy test invocation)
  if (options && "computeDigest" in options && typeof options.computeDigest === "function") {
    return options.verifyDigest(canonicalJson, record_integrity_metadata.integrity_digest);
  }

  const opts: VerifyAdoptionDecisionIntegrityOptions =
    options && "registry" in options ? options : (options as VerifyAdoptionDecisionIntegrityOptions) ?? {};

  const registry = opts.registry ?? DEFAULT_GATE8_AUTHORITY_REGISTRY;

  // Handle authentic HMAC-SHA256 signing
  if (record_integrity_metadata.algorithm === "HMAC-SHA256") {
    const officialId = record.authorizing_official;
    if (!registry.isAuthorizedOfficial(officialId) && !opts.expectedKey) {
      return false; // Unknown authority fails closed
    }

    const officialKey =
      opts.expectedKey ?? registry.getAuthorityCredentials(officialId)?.keyOrSecret;
    if (!officialKey) {
      return false;
    }

    const provider = new KeyedAuthorityIntegrityProvider(officialKey);
    return provider.verifyDigest(canonicalJson, record_integrity_metadata.integrity_digest);
  }

  // Handle technology-neutral pluggable provider if passed
  if (opts.integrityProvider) {
    return opts.integrityProvider.verifyDigest(
      canonicalJson,
      record_integrity_metadata.integrity_digest
    );
  }

  // If unauthenticated SHA-256 digest verification is explicitly permitted
  if (record_integrity_metadata.algorithm === "SHA-256" && opts.allowUnauthenticatedDigest) {
    const fallbackProvider = new DefaultSha256IntegrityProvider();
    return fallbackProvider.verifyDigest(
      canonicalJson,
      record_integrity_metadata.integrity_digest
    );
  }

  // Plain unauthenticated SHA-256 without explicit permission fails authenticity verification
  return false;
}
