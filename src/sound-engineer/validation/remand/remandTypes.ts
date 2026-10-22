// src/sound-engineer/validation/remand/remandTypes.ts
// Phase 1C.5h WP-25: Defect Remand Packaging & Multi-Destination Routing Subsystem Types.
// Bound to frozen specification v0.1j Section 29, Table 17, and Implementation Plan v0.1h WP-25.

import {
  ValidationFailureRecord,
  ValidationVersionBindingRecord,
  ValidationCase,
  ValidationFixtureRecord,
} from "../schemas/records";
import { FailureMateriality } from "../schemas/enums";
import { RecordIntegrityMetadata } from "../schemas/integrity";
import { RemandDestinationInfo } from "../attribution/attributionTypes";

/**
 * Factual internal tracking status for a defect remand.
 * CRITICAL ARCHITECTURAL BOUNDARY:
 * These are strictly internal WP-25 tracking states. They are NOT global
 * governance statuses, enterprise workflow states, or formal lifecycle FSM enums.
 * - OUTSTANDING: Remand package has been dispatched; no upstream handoff return has been received.
 * - RETURNED: Upstream remediation handoff reference has been received and recorded.
 */
export type RemandLifecycleStatus = "OUTSTANDING" | "RETURNED";

/**
 * Factual tracking metadata recording remand dispatch and upstream handoff return.
 * Bound to Section 29.3 ASCII flow and Build Plan WP-25 Item 4.
 */
export interface RemandHandoffTracking {
  /** Unique identifier for this remand occurrence (e.g. REMAND_<uuid>) */
  readonly remandId: string;
  /** Reference to the governed ValidationFailureRecord (Record 14) */
  readonly failureId: string;
  /** ISO 8601 UTC timestamp of remand dispatch */
  readonly remandedAt: string;
  /** Human-readable upstream recipient description from Table 17 */
  readonly recipient: string;
  /** Authoritative upstream GovernanceEntity endpoint identifier */
  readonly governanceEntityId: string;
  /** Factual tracking status (OUTSTANDING until upstream handoff return is recorded) */
  readonly status: RemandLifecycleStatus;
  /** Upstream handoff package or candidate build identifier upon remediation return */
  readonly handoffReturnRef?: string;
  /** ISO 8601 UTC timestamp when upstream handoff return was recorded */
  readonly returnedAt?: string;
}

/**
 * Quantitative elapsed duration and unremediated status for an individual remand.
 * Bound to Build Plan WP-25 Failure Modes & Mitigations (remand aging tracker).
 * CRITICAL GOVERNANCE:
 * Preserves canonical Record 14 FailureMateriality. Zero synthetic SLA severity tiers permitted.
 */
export interface RemandAgeRecord {
  readonly remandId: string;
  readonly failureId: string;
  readonly materiality: FailureMateriality;
  readonly remandedAt: string;
  readonly elapsedMs: number;
  readonly isUnremediated: boolean;
  /** Populated strictly when thresholdMs is explicitly supplied by caller; undefined otherwise */
  readonly exceedsThreshold?: boolean;
}

/**
 * Governed Defect Remand Package.
 * Bound to Section 29.1, Section 29.3, and Build Plan WP-25 Item 4.
 *
 * CRITICAL ARCHITECTURAL IDENTITY:
 * DefectRemandPackage is a governed composite artifact composed from authoritative
 * Phase 1C.5h records and evidence. It is NOT a new numbered Record (e.g., Record 23),
 * nor a mutable business object. It preserves immutable references to canonical evidence.
 */
export interface DefectRemandPackage {
  /** Deterministic package identifier (e.g. DRP_<uuid>) */
  readonly packageId: string;

  /** Governed Record 14 failure record documenting the anomaly and root attribution */
  readonly failureRecord: ValidationFailureRecord;

  /** Execution trace reference linking execution to Phase 1C.5f causal lineage */
  readonly executionTraceRef: string;

  /** Governed Record 03 version binding locking exact code, prompts, platform, and fixture versions */
  readonly versionBinding: ValidationVersionBindingRecord;

  /** Governed Record 05 validation case specifying the reproducible test question and bounds */
  readonly validationCase: ValidationCase;

  /** Governed Record 08 fixture record specifying the golden benchmark audio / preset */
  readonly fixtureRecord: ValidationFixtureRecord;

  /** Immutable fixture stem reference identifying payload digest and calibration level */
  readonly fixtureStemRef: {
    readonly fixtureId: string;
    readonly payloadDigest: string;
    readonly calibrationSpec: string;
  };

  /** Observed vs. expected measurement proof isolating the failure symptom */
  readonly measurementEvidence: {
    readonly rawMeasurements: Readonly<Record<string, unknown>>;
    readonly objectiveEvidenceId?: string;
    readonly criteriaRef: string;
  };

  /** Authoritative Table 17 routing metadata matching the isolated failure attribution */
  readonly routing: RemandDestinationInfo;

  /** Factual tracking metadata recording dispatch and remediation return */
  readonly tracking: RemandHandoffTracking;

  /** Cryptographic / deterministic integrity seal over the composite package contents */
  readonly packageIntegrity: RecordIntegrityMetadata;
}
