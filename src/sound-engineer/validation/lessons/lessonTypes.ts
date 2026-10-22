// src/sound-engineer/validation/lessons/lessonTypes.ts
// Phase 1C.5h WP-26: Candidate Lesson Boundary & Phase 1C.5e/f Governance Integration Types.
// Bound to frozen specification v0.1j Section 30, Phase 1C.5f Section 14, and Implementation Plan v0.1h WP-26.

import {
  ValidationScopeRecord,
  ValidationUncertaintyRecord,
  ValidationExecutionRecord,
  ValidationVersionBindingRecord,
  ObjectiveEvidenceRecord,
  PerceptualEvaluationRecord,
  UATEvaluationRecord,
  ValidationFailureRecord,
} from "../schemas/records";
import { RecordIntegrityMetadata } from "../schemas/integrity";

/**
 * Permitted canonical evidence categories supporting a Candidate Lesson formulation.
 * Bound to Section 30.1 and Build Plan WP-26 Item 4.
 *
 * CRITICAL ARCHITECTURAL BOUNDARY:
 * At least one valid empirical validation evidence source is required.
 * Phase 1C.5h does NOT require multiple executions, fixtures, or universal sample sizes (1C.5f §14.3).
 */
export type SupportingEvidenceKind =
  | "ObjectiveEvidenceRecord"
  | "PerceptualEvaluationRecord"
  | "UATEvaluationRecord"
  | "ValidationFailureRecord";

/**
 * Thin canonical reference identifying a supporting validation evidence record.
 * Preserves canonical record kind and entity ID without creating a parallel shadow schema.
 */
export interface SupportingEvidenceReference {
  /** Canonical record type discriminator */
  readonly evidenceKind: SupportingEvidenceKind;
  /** Governed entity identifier (e.g. objective_evidence_id, perceptual_evidence_id, uat_id, failure_id) */
  readonly evidenceId: string;
  /** Brief human-auditable observation summary */
  readonly observationSummary?: string;
}

/**
 * Thin canonical reference bound to canonical ValidationScopeRecord (Record 02).
 * Preserves canonical scope identity and explicit affected unit boundaries without schema duplication.
 */
export interface CandidateLessonScopeReference {
  /** Reference to canonical ValidationScopeRecord (Record 02) */
  readonly scopeRecordRef: string;
  /** Canonical gear units or component identifiers to which this lesson applies */
  readonly affectedUnits: ReadonlyArray<string>;
}

/**
 * Thin canonical reference bound to canonical ValidationUncertaintyRecord (Record 16).
 * Preserves epistemic limitations and canonical uncertainty identity without schema duplication.
 */
export interface CandidateLessonUncertaintyReference {
  /** Reference to canonical ValidationUncertaintyRecord (Record 16) */
  readonly uncertaintyRecordRef: string;
  /** Authoritative uncertainty source classification from Record 16 */
  readonly uncertaintySource: string;
}

/**
 * Governed Candidate Lesson Evidence Package.
 * Bound to Section 30.1, Section 30.2, and Build Plan WP-26 Item 4.
 *
 * CRITICAL ARCHITECTURAL IDENTITY:
 * - CandidateLessonEvidencePackage is a governed composite evidence artifact.
 * - It is NOT Record 23 (Phase 1C.5h strictly defines 22 records in Section 33).
 * - It is NOT an active knowledge object.
 * - It targets inherited Phase 1C.5e/f Candidate Lesson quarantine.
 * - Phase 1C.5h possesses zero authority to promote it into active knowledge.
 * - WP-26 does not assign or own inherited governance lifecycle states.
 */
export interface CandidateLessonEvidencePackage {
  /** Deterministic package identifier (e.g. "CLEP_<uuid>") */
  readonly packageId: string;
  /** ISO 8601 UTC timestamp of package formulation */
  readonly formulatedAt: string;
  /** Explicit statement of the proposed generalizable sound-engineering insight/hypothesis */
  readonly proposedInsight: string;
  /** Strongly typed references to supporting empirical validation evidence (at least 1 required) */
  readonly supportingEvidence: ReadonlyArray<SupportingEvidenceReference>;
  /** Bounded gear/processing scope reference (bound to Record 02) */
  readonly scopeRef: CandidateLessonScopeReference;
  /** Preserved uncertainty reference (bound to Record 16) */
  readonly uncertaintyRef: CandidateLessonUncertaintyReference;
  /** Reference to originating ValidationExecutionRecord (Record 09) */
  readonly executionRecordRef: string;
  /** Phase 1C.5f RunTrace reference */
  readonly runTraceRef: string;
  /** Optional reference to ValidationVersionBindingRecord (Record 03) */
  readonly versionBindingRef?: string;
  /**
   * Optional reference to Stage 14 Engineering Review evidence.
   * EXPLICIT ARCHITECTURAL FENCE:
   * Stage 14 is observational/review evidence only.
   * Stage 14 is NOT quarantine authority, knowledge governance, or promotion authority.
   */
  readonly stage14ReviewRef?: string;
  /** Tamper-evident integrity metadata sealing this package */
  readonly integrityMetadata: RecordIntegrityMetadata;
}

/**
 * Factual receipt confirming successful placement into Phase 1C.5e/f quarantine storage.
 * Bound to Section 30.2 and Build Plan WP-26 Item 4.
 *
 * CRITICAL GOVERNANCE:
 * Acknowledges placement into quarantine isolation only (`status: "QUARANTINED"`).
 * Contains zero synthetic promotion statuses.
 */
export interface CandidateLessonQuarantineReceipt {
  /** Deterministic receipt identifier (e.g. "CLQR_<uuid>") */
  readonly receiptId: string;
  /** Identifier of the quarantined CandidateLessonEvidencePackage */
  readonly lessonPackageId: string;
  /** ISO 8601 UTC timestamp of quarantine placement */
  readonly quarantinedAt: string;
  /** Factual quarantine placement status */
  readonly status: "QUARANTINED";
  /** Verifiable integrity digest of the received package */
  readonly packageIntegrityDigest: string;
  /** Optional quarantine repository/sink identifier */
  readonly quarantineRepositoryId?: string;
}

/**
 * Port/Capability interface for handing Candidate Lesson evidence into inherited Phase 1C.5e/f quarantine.
 *
 * CRITICAL CAPABILITY RESTRICTION:
 * Exposes strictly quarantine-handoff capability.
 * Contains ZERO promotion, approval, rejection, or active knowledge write methods.
 */
export interface CandidateLessonQuarantineSink {
  quarantineLesson(
    lessonPackage: CandidateLessonEvidencePackage
  ): Promise<CandidateLessonQuarantineReceipt>;
}

/**
 * Input contract for formulating a Candidate Lesson evidence package.
 * Allows passing either canonical governed record instances or structured thin references.
 */
export interface FormulateCandidateLessonInput {
  /** Explicit statement of the proposed generalizable sound-engineering insight */
  readonly proposedInsight: string;
  /**
   * At least one supporting validation evidence item.
   * May be a canonical record (Record 10, 11, 12, or 14) or a pre-resolved SupportingEvidenceReference.
   */
  readonly supportingEvidence: ReadonlyArray<
    | SupportingEvidenceReference
    | ObjectiveEvidenceRecord
    | PerceptualEvaluationRecord
    | UATEvaluationRecord
    | ValidationFailureRecord
  >;
  /** Canonical ValidationScopeRecord (Record 02) or structured scope reference */
  readonly scope: ValidationScopeRecord | CandidateLessonScopeReference;
  /** Canonical ValidationUncertaintyRecord (Record 16) or structured uncertainty reference */
  readonly uncertainty: ValidationUncertaintyRecord | CandidateLessonUncertaintyReference;
  /** Canonical ValidationExecutionRecord (Record 09) or its identifier */
  readonly execution: ValidationExecutionRecord | string;
  /** Phase 1C.5f RunTrace reference (defaults to execution.trace_ref if execution is a record) */
  readonly runTraceRef?: string;
  /** Optional VersionBinding (Record 03) or its identifier */
  readonly versionBinding?: ValidationVersionBindingRecord | string;
  /** Optional Stage 14 Engineering Review reference (observational context only) */
  readonly stage14ReviewRef?: string;
}

/**
 * Result returned upon successful candidate lesson formulation and quarantine handoff.
 */
export interface CandidateLessonHandoffResult {
  /** The sealed, immutable CandidateLessonEvidencePackage */
  readonly package: CandidateLessonEvidencePackage;
  /** The factual quarantine placement receipt */
  readonly receipt: CandidateLessonQuarantineReceipt;
}

/**
 * Error thrown when a Candidate Lesson package violates formulation validation rules.
 */
export class InvalidCandidateLessonPackageError extends Error {
  public readonly validationErrors: ReadonlyArray<string>;

  constructor(message: string, validationErrors: ReadonlyArray<string> = []) {
    super(message);
    this.name = "InvalidCandidateLessonPackageError";
    this.validationErrors = validationErrors;
    Object.setPrototypeOf(this, InvalidCandidateLessonPackageError.prototype);
  }
}

/**
 * Error thrown when handoff into inherited quarantine fails, is rejected, or returns an invalid receipt.
 */
export class QuarantineHandoffError extends Error {
  public readonly details?: unknown;

  constructor(message: string, details?: unknown) {
    super(message);
    this.name = "QuarantineHandoffError";
    this.details = details;
    Object.setPrototypeOf(this, QuarantineHandoffError.prototype);
  }
}
