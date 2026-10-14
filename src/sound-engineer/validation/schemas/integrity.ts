// src/sound-engineer/validation/schemas/integrity.ts
// Abstract integrity metadata and technology-neutral verification types
// Phase 1C.5h: Preserves integrity abstractions without hardcoding cryptographic coupling

import { z } from "zod";

/**
 * Abstract record integrity metadata representing a tamper-evident seal.
 * Technology-neutral: algorithm, serialization format, and signer identity are abstract fields.
 */
export const recordIntegrityMetadataSchema = z
  .object({
    /** Cryptographic or deterministic digest string */
    integrity_digest: z.string().min(1, "integrity_digest must not be empty"),
    /** Algorithm name (e.g. SHA-256, HMAC-SHA256, ED25519) */
    algorithm: z.string().min(1, "algorithm must not be empty"),
    /** ISO 8601 UTC timestamp of sealing */
    sealed_at: z.string().datetime({ message: "sealed_at must be an ISO 8601 UTC timestamp" }),
    /** Optional identifier of the sealing system, process, or official */
    signer_identity: z.string().min(1).optional(),
    /** Optional canonical serialization format indicator (e.g. RFC-8785, CANONICAL-JSON) */
    canonical_serialization_format: z.string().min(1).optional(),
  })
  .strict();

export type RecordIntegrityMetadata = Readonly<z.infer<typeof recordIntegrityMetadataSchema>>;

/**
 * Abstract version integrity reference representing a composite digest over bound version matrices.
 */
export const versionIntegrityReferenceSchema = z
  .object({
    /** Composite integrity digest across all bound version references */
    composite_digest: z.string().min(1, "composite_digest must not be empty"),
    /** Algorithm used to compute composite digest */
    algorithm: z.string().min(1, "algorithm must not be empty"),
    /** ISO 8601 UTC timestamp of calculation */
    sealed_at: z.string().datetime({ message: "sealed_at must be an ISO 8601 UTC timestamp" }),
    /** Optional map of component name to individual component digest */
    component_digests: z.record(z.string(), z.string()).optional(),
  })
  .strict();

export type VersionIntegrityReference = Readonly<z.infer<typeof versionIntegrityReferenceSchema>>;

/**
 * Single architecture tier version entry with version string and verifiable integrity reference.
 */
export const architectureVersionEntrySchema = z
  .object({
    version: z.string().min(1, "version must not be empty"),
    integrity_ref: z.string().min(1, "integrity_ref must not be empty"),
  })
  .strict();

export type ArchitectureVersionEntry = Readonly<z.infer<typeof architectureVersionEntrySchema>>;

/**
 * Frozen Architecture Version Matrix: Explicit traceability for all upstream phases.
 * CRITICAL GOVERNANCE: Must not be collapsed into a single string or hash.
 *
 * WP-01 CORRECTIVE SCHEMA AMENDMENT REQUIRED BY FROZEN WP-05 CONTRACT:
 * Augmented with 1C.5h_architecture_version (v0.1j + integrity_ref) to satisfy explicit
 * detailed-baseline traceability required by TT_Phase_1C.5h_Implementation_and_Build_Plan_v0.1h.txt
 * without substituting for the complete upstream architecture matrix.
 */
export const architectureVersionMatrixSchema = z
  .object({
    "1C.5a_version": architectureVersionEntrySchema,
    "1C.5b_version": architectureVersionEntrySchema,
    "1C.5c_version": architectureVersionEntrySchema,
    "1C.5d_version": architectureVersionEntrySchema,
    "1C.5e_version": architectureVersionEntrySchema,
    "1C.5f_version": architectureVersionEntrySchema,
    "1C.5g_version": architectureVersionEntrySchema,
    "1C.5h_mandate_version": architectureVersionEntrySchema,
    "1C.5h_architecture_version": architectureVersionEntrySchema,
  })
  .strict();

export type ArchitectureVersionMatrix = Readonly<z.infer<typeof architectureVersionMatrixSchema>>;

/**
 * Pluggable Technology-Neutral Integrity Provider interface.
 * Abstract interface separating algorithm mechanics from record definition.
 */
export interface IntegrityProvider {
  readonly algorithmName: string;
  computeDigest(payload: unknown): string;
  verifyDigest(payload: unknown, expectedDigest: string): boolean;
}

/**
 * Helper to compute a canonical deterministic string representation of a JSON payload.
 * Sorts object keys deterministically.
 */
export function canonicalizeJson(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalizeJson(item)).join(",")}]`;
  }
  const obj = value as Record<string, unknown>;
  const sortedKeys = Object.keys(obj).sort();
  const pairs = sortedKeys.map((k) => `${JSON.stringify(k)}:${canonicalizeJson(obj[k])}`);
  return `{${pairs.join(",")}}`;
}
