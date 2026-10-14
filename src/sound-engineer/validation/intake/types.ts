// src/sound-engineer/validation/intake/types.ts
// Authoritative types for Phase 1C.5h WP-03: Validation Intake & Sealed Handoff Package Verification.
// Bound to frozen specification v0.1j Section 8 and Implementation Plan v0.1h WP-03.

import { z } from "zod";
import { ValidationIntakeRecord } from "../schemas/records";
import { RelationshipEdge } from "../graph/edgeTypes";
import { AuditLedgerEntry } from "../storage/ledgerTypes";

/**
 * The exact seven Phase 1C.5g prerequisite gates required for intake acceptance.
 * CRITICAL GOVERNANCE: Exact 7 gate names. Zero invented or renamed gates permitted.
 */
export const PHASE_1C5G_GATE_NAMES = [
  "Structural Mapping Complete",
  "Architectural Compatibility Verified",
  "Provenance & Lineage Sealed",
  "Shadow Execution Exercised",
  "Differential Analysis Documented",
  "Rollback Path Operational",
  "Handoff Package Assembled",
] as const;

export type Phase1C5gGateName = (typeof PHASE_1C5G_GATE_NAMES)[number];

export const phase1C5gGateNameSchema = z.enum([
  "Structural Mapping Complete",
  "Architectural Compatibility Verified",
  "Provenance & Lineage Sealed",
  "Shadow Execution Exercised",
  "Differential Analysis Documented",
  "Rollback Path Operational",
  "Handoff Package Assembled",
]);

/**
 * Token structure certifying completion of a single Phase 1C.5g gate.
 */
export const gateCompletionTokenSchema = z
  .object({
    gate_name: z.string().min(1, "gate_name must not be empty"),
    status: z.enum(["COMPLETE", "PASS"]),
    token_id: z.string().min(1).optional(),
    sealed_at: z.string().datetime().optional(),
    authorized_by: z.string().min(1).optional(),
  })
  .strict();

export type GateCompletionToken = Readonly<z.infer<typeof gateCompletionTokenSchema>>;

/**
 * The incoming sealed MigrationHandoffPackageRecord artifact envelope from Phase 1C.5g.
 */
export interface MigrationHandoffPackage {
  /** Unique stable package identifier */
  readonly package_id: string;
  /** Package classification discriminator */
  readonly package_type?: string;
  /** Originating phase identifier (must indicate Phase 1C.5g) */
  readonly source_phase?: string;
  /** Phase 1C.5g migration batch identifier */
  readonly migration_batch_id: string;
  /** Requesting migration coordinator or pipeline identity */
  readonly requested_by: string;
  /** Declared scope assertion text/identifier */
  readonly declared_scope: string;
  /** Map of upstream architecture version identifiers (1C.5a through 1C.5g) */
  readonly frozen_upstream_versions: Readonly<Record<string, string>>;
  /** Declared target platform runtime version */
  readonly target_platform_declared_version: string;
  /** Seven Phase 1C.5g gate completion tokens */
  readonly gates: ReadonlyArray<GateCompletionToken> | Readonly<Record<string, unknown>>;
  /** Independently verifiable integrity reference of the package */
  readonly integrity_ref: string;
  /** Optional distinct data payload used to verify integrity_ref */
  readonly payload_data?: unknown;
  /** Digital signature certifying Phase 1C.5g official authorization */
  readonly signature: string;
  /** Signer identity (e.g. key ID, username, or certificate reference) */
  readonly signer_identity: string;
  /** Authorized role of signer (evaluated via injectable HandoffSignatureVerifier policy) */
  readonly signer_role: string;
}

/**
 * Result returned upon intake processing.
 */
export interface IntakeProcessingResult {
  /** Governed intake outcome: strictly INTAKE_ACCEPTED or INTAKE_REJECTED */
  readonly status: "INTAKE_ACCEPTED" | "INTAKE_REJECTED";
  /** Canonical Record 1 */
  readonly intakeRecord: ValidationIntakeRecord;
  /** Source package identifier */
  readonly handoffPackageId: string;
  /** Optional diagnostic explanation if rejected */
  readonly rejectionReason?: string;
  /** Governed DERIVED_FROM_HANDOFF relationship edge (present when identifiable package_id exists) */
  readonly relationshipEdge?: RelationshipEdge;
  /** Audit ledger entry sealing the intake record */
  readonly ledgerEntry?: AuditLedgerEntry;
  /** Audit ledger entry sealing the relationship edge if created */
  readonly edgeLedgerEntry?: AuditLedgerEntry;
  /** Flag indicating idempotent replay of an already accepted package */
  readonly isReplay?: boolean;
}
