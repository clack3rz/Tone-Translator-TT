// src/sound-engineer/validation/storage/ledgerTypes.ts
// Authoritative types and technology-neutral integrity provider for Phase 1C.5h Validation Audit Ledger.
// Bound to frozen specification v0.1j and Implementation Plan v0.1h WP-02.

import { canonicalizeJson, IntegrityProvider } from "../schemas/integrity";

/**
 * Deterministic constant representing the genesis previous digest.
 * Non-architectural implementation plumbing guaranteeing deterministic ledger root.
 */
export const LEDGER_GENESIS_PREVIOUS_DIGEST =
  "GENESIS_0000000000000000000000000000000000000000000000000000000000000000";

/**
 * Governed audit ledger entry type discriminator.
 */
export type AuditLedgerEntryType = "RECORD" | "RELATIONSHIP_EDGE";

/**
 * Immutable historical entry structure recorded into the append-only Validation Audit Ledger.
 */
export interface AuditLedgerEntry<T = unknown> {
  /** Monotonic 0-indexed sequence number */
  readonly sequenceNumber: number;
  /** Unique deterministic entry identifier: entry_${sequenceNumber}_${entityId} */
  readonly entryId: string;
  /** Entry classification discriminator */
  readonly entryType: AuditLedgerEntryType;
  /** Governed entity kind or record name */
  readonly entityKind: string;
  /** Identifier of the governed record or edge */
  readonly entityId: string;
  /** ISO 8601 UTC timestamp when the entry was sealed into the ledger */
  readonly timestamp: string;
  /** Immutable payload of the governed record or relationship edge */
  readonly payload: Readonly<T>;
  /** Cryptographic or deterministic digest of the preceding ledger entry */
  readonly previousDigest: string;
  /** Verifiable entry digest over this entry's canonical content */
  readonly entryDigest: string;
}

/**
 * Result returned by ledger verification audit.
 */
export interface LedgerVerificationResult {
  readonly isValid: boolean;
  readonly totalEntries: number;
  readonly corruptedSequenceNumber?: number;
  readonly failureReason?: string;
}

// ---------------------------------------------------------------------------
// Standard FIPS 180-2 SHA-256 implementation (pure TypeScript / 0 dependencies)
// Guarantees synchronous, platform-neutral execution in both Node and Vite browser bundles
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

export function computeSha256Hex(data: string): string {
  const bytes = new TextEncoder().encode(data);
  const bitLength = bytes.length * 8;

  // Pre-processing: calculate padded length
  const extraBytes = (bytes.length + 9) % 64;
  const paddingLength = extraBytes === 0 ? 0 : 64 - extraBytes;
  const totalLength = bytes.length + 1 + paddingLength + 8;
  const padded = new Uint8Array(totalLength);
  padded.set(bytes, 0);
  padded[bytes.length] = 0x80;

  // Append length in bits as 64-bit big-endian integer
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

  const hexParts = [h0, h1, h2, h3, h4, h5, h6, h7].map((num) =>
    num.toString(16).padStart(8, "0")
  );
  return hexParts.join("");
}

/**
 * Concrete Technology-Neutral Integrity Provider implementing SHA-256 with canonical JSON serialization.
 * [CURRENT IMPLEMENTATION CHOICE — NON-CONSTITUTIONAL / REPLACEABLE]:
 * Implements the abstract IntegrityProvider contract without architectural lock-in.
 */
export class DefaultSha256IntegrityProvider implements IntegrityProvider {
  public readonly algorithmName = "SHA-256";

  public computeDigest(payload: unknown): string {
    const canonicalString =
      typeof payload === "string" ? payload : canonicalizeJson(payload);
    return computeSha256Hex(canonicalString);
  }

  public verifyDigest(payload: unknown, expectedDigest: string): boolean {
    const computed = this.computeDigest(payload);
    return computed === expectedDigest;
  }
}
