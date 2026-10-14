// src/sound-engineer/validation/storage/auditLedger.ts
// ValidationAuditLedger: Append-only, tamper-evident audit ledger for Phase 1C.5h records and relationship edges.
// Uses technology-neutral IntegrityProvider and canonical JSON serialization.

import { defensiveClone, deepFreeze } from "../../contracts/immutability";
import { canonicalizeJson, IntegrityProvider } from "../schemas/integrity";
import { RelationshipEdge } from "../graph/edgeTypes";
import {
  AuditLedgerEntry,
  AuditLedgerEntryType,
  DefaultSha256IntegrityProvider,
  LEDGER_GENESIS_PREVIOUS_DIGEST,
  LedgerVerificationResult,
} from "./ledgerTypes";

export interface AppendEntryParams<T = unknown> {
  readonly entryType: AuditLedgerEntryType;
  readonly entityKind: string;
  readonly entityId: string;
  readonly payload: T;
  readonly timestamp?: string;
}

/**
 * Append-Only, Tamper-Evident Validation Audit Ledger for Phase 1C.5h.
 * Every appended entry cryptographically links to the previous entry's integrity reference.
 * Strictly immutable: normal mutation or deletion operations are prohibited.
 */
export class ValidationAuditLedger {
  private readonly entries: AuditLedgerEntry[] = [];
  private readonly integrityProvider: IntegrityProvider;

  constructor(integrityProvider?: IntegrityProvider) {
    this.integrityProvider = integrityProvider ?? new DefaultSha256IntegrityProvider();
  }

  public getIntegrityProvider(): IntegrityProvider {
    return this.integrityProvider;
  }

  public getEntryCount(): number {
    return this.entries.length;
  }

  public getLatestEntry(): AuditLedgerEntry | undefined {
    if (this.entries.length === 0) return undefined;
    return this.entries[this.entries.length - 1];
  }

  public getEntryBySequence(sequenceNumber: number): AuditLedgerEntry | undefined {
    return this.entries[sequenceNumber];
  }

  public getEntries(): ReadonlyArray<AuditLedgerEntry> {
    return deepFreeze(this.entries.map((e) => defensiveClone(e)));
  }

  /**
   * Appends a governed record payload into the audit ledger.
   */
  public appendRecord<T = unknown>(
    entityKind: string,
    entityId: string,
    payload: T,
    timestamp?: string
  ): Readonly<AuditLedgerEntry<T>> {
    return this.appendEntry({
      entryType: "RECORD",
      entityKind,
      entityId,
      payload,
      timestamp,
    });
  }

  /**
   * Appends an immutable governed relationship edge into the audit ledger.
   */
  public appendEdge(
    edge: RelationshipEdge,
    timestamp?: string
  ): Readonly<AuditLedgerEntry<RelationshipEdge>> {
    return this.appendEntry({
      entryType: "RELATIONSHIP_EDGE",
      entityKind: edge.edgeType,
      entityId: edge.edgeId,
      payload: edge,
      timestamp: timestamp ?? edge.createdAt,
    });
  }

  /**
   * Core append operation. Monotonically sequences entries, derives previousDigest linkage,
   * calculates verifiable entryDigest, and freezes the sealed entry.
   */
  public appendEntry<T = unknown>(
    params: AppendEntryParams<T>
  ): Readonly<AuditLedgerEntry<T>> {
    const sequenceNumber = this.entries.length;
    const timestamp = params.timestamp ?? new Date().toISOString();
    const entryId = `entry_seq_${sequenceNumber}_${params.entityId}`;

    // Deterministic previous-digest linkage:
    // First block links to explicit genesis constant; subsequent blocks link to prior entry digest.
    const previousDigest =
      sequenceNumber === 0
        ? LEDGER_GENESIS_PREVIOUS_DIGEST
        : this.entries[sequenceNumber - 1].entryDigest;

    const clonedPayload = defensiveClone(params.payload);

    // Canonical content to hash for entry integrity
    const hashableContent = {
      sequenceNumber,
      entryId,
      entryType: params.entryType,
      entityKind: params.entityKind,
      entityId: params.entityId,
      timestamp,
      payload: clonedPayload,
      previousDigest,
    };

    const canonicalSerialized = canonicalizeJson(hashableContent);
    const entryDigest = this.integrityProvider.computeDigest(canonicalSerialized);

    const sealedEntry: AuditLedgerEntry<T> = deepFreeze({
      sequenceNumber,
      entryId,
      entryType: params.entryType,
      entityKind: params.entityKind,
      entityId: params.entityId,
      timestamp,
      payload: clonedPayload as Readonly<T>,
      previousDigest,
      entryDigest,
    });

    this.entries.push(sealedEntry as AuditLedgerEntry);
    return sealedEntry;
  }

  /**
   * Verifies the cryptographic chain integrity of the entire audit ledger.
   * Detects:
   * 1. Modified historical payloads
   * 2. Modified previous-integrity references
   * 3. Modified entry digests
   * 4. Removed or reordered entries
   * 5. Forged entries without valid chain linkage
   */
  public verifyLedger(): LedgerVerificationResult {
    const totalEntries = this.entries.length;

    for (let i = 0; i < totalEntries; i++) {
      const entry = this.entries[i];

      // 1. Monotonic sequence check
      if (entry.sequenceNumber !== i) {
        return {
          isValid: false,
          totalEntries,
          corruptedSequenceNumber: i,
          failureReason: `Sequence break at index ${i}: expected sequenceNumber ${i}, found ${entry.sequenceNumber}.`,
        };
      }

      // 2. Previous digest linkage check
      const expectedPreviousDigest =
        i === 0 ? LEDGER_GENESIS_PREVIOUS_DIGEST : this.entries[i - 1].entryDigest;

      if (entry.previousDigest !== expectedPreviousDigest) {
        return {
          isValid: false,
          totalEntries,
          corruptedSequenceNumber: i,
          failureReason: `Previous digest mismatch at sequence ${i}: expected "${expectedPreviousDigest}", found "${entry.previousDigest}".`,
        };
      }

      // 3. Recompute canonical digest
      const hashableContent = {
        sequenceNumber: entry.sequenceNumber,
        entryId: entry.entryId,
        entryType: entry.entryType,
        entityKind: entry.entityKind,
        entityId: entry.entityId,
        timestamp: entry.timestamp,
        payload: entry.payload,
        previousDigest: entry.previousDigest,
      };

      const canonicalSerialized = canonicalizeJson(hashableContent);
      const isDigestValid = this.integrityProvider.verifyDigest(
        canonicalSerialized,
        entry.entryDigest
      );

      if (!isDigestValid) {
        return {
          isValid: false,
          totalEntries,
          corruptedSequenceNumber: i,
          failureReason: `Digest verification failed at sequence ${i}: entry payload or metadata has been tampered with.`,
        };
      }
    }

    return {
      isValid: true,
      totalEntries,
    };
  }
}
