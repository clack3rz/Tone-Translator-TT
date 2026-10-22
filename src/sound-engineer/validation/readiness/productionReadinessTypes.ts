// src/sound-engineer/validation/readiness/productionReadinessTypes.ts
// Authoritative types and interfaces for Phase 1C.5h WP-21:
// Four-Pillar Production Readiness Assessment Synthesis (Record 20).
// Bound to frozen specification v0.1j Section 25 & Table 13.

import {
  PILLAR_READINESS_STATUSES,
  PillarReadinessStatus,
} from "../schemas/enums";
import {
  EvidenceConflictRecord,
  ObjectiveEvidenceRecord,
  PerceptualEvaluationRecord,
  PillarEvaluations,
  pillarEvaluationsSchema,
  ProductionReadinessAssessmentRecord,
  productionReadinessAssessmentRecordSchema,
  RegressionAssessmentRecord,
  UATEvaluationRecord,
  ValidationCase,
  ValidationExecutionRecord,
  ValidationFailureRecord,
  ValidationFixtureRecord,
  ValidationOutcomeRecord,
  ValidationPackage,
  ValidationScopeRecord,
  ValidationUncertaintyRecord,
  ValidationVersionBindingRecord,
} from "../schemas/records";
import { ValidationRelationshipGraph } from "../graph/relationshipGraph";
import { ValidationAuditLedger } from "../storage/auditLedger";

export {
  PILLAR_READINESS_STATUSES,
  type PillarReadinessStatus,
  type PillarEvaluations,
  type ProductionReadinessAssessmentRecord,
  pillarEvaluationsSchema,
  productionReadinessAssessmentRecordSchema,
};

/**
 * The exact eight frozen Hard Blockers defined in frozen specification v0.1j Section 25.2 & Table 13.
 * CRITICAL ARCHITECTURAL CONSTITUTION: All eight hard blockers must be implemented.
 * Subsets or older 5-blocker drafts are strictly prohibited.
 */
export const FROZEN_HARD_BLOCKERS = {
  /** 1. Unresolved material genuine regression within requested authorization scope */
  BLOCKER_01_UNRESOLVED_GENUINE_REGRESSION:
    "BLOCKER-01: Unresolved material genuine regression within requested authorization scope",

  /** 2. Target-platform preset export failure, crash, or serialization corruption */
  BLOCKER_02_EXPORT_FAILURE_CORRUPTION:
    "BLOCKER-02: Target-platform preset export failure, crash, or serialization corruption",

  /** 3. Failure or unverified state of automated rollback (PATH-ROLLBACK) */
  BLOCKER_03_ROLLBACK_FAILED_OR_UNVERIFIED:
    "BLOCKER-03: Failure or unverified state of automated rollback (PATH-ROLLBACK)",

  /** 4. Missing, broken, or unverifiable Phase 1C.5f provenance / traceability */
  BLOCKER_04_PROVENANCE_TRACEABILITY_BROKEN:
    "BLOCKER-04: Missing, broken, or unverifiable Phase 1C.5f provenance / traceability",

  /** 5. Contaminated, miscalibrated, or missing Golden fixtures */
  BLOCKER_05_FIXTURE_CONTAMINATED_OR_MISSING:
    "BLOCKER-05: Contaminated, miscalibrated, or missing Golden fixtures",

  /** 6. Requested authorization scope broader than actually tested scope */
  BLOCKER_06_SCOPE_INFLATION:
    "BLOCKER-06: Requested authorization scope broader than actually tested scope",

  /** 7. Unresolved critical uncertainty regarding production tone safety */
  BLOCKER_07_CRITICAL_TONE_UNCERTAINTY:
    "BLOCKER-07: Unresolved critical uncertainty regarding production tone safety",

  /** 8. Unresolved upstream architectural violation across Phases 1C.5a through 1C.5g */
  BLOCKER_08_UPSTREAM_ARCHITECTURAL_VIOLATION:
    "BLOCKER-08: Unresolved upstream architectural violation across Phases 1C.5a through 1C.5g",
} as const;

export type FrozenHardBlocker =
  (typeof FROZEN_HARD_BLOCKERS)[keyof typeof FROZEN_HARD_BLOCKERS];

/**
 * Explicit typed interface for consuming Rollback Verification evidence (WP-27 dependency boundary).
 * Until WP-27 is implemented, WP-21 consumes rollback evidence exclusively via this typed boundary.
 */
export interface RollbackVerificationEvidence {
  readonly rollback_verified: boolean;
  readonly path_prod_isolated?: boolean;
  readonly path_rollback_verified_under_load?: boolean;
  readonly recovery_time_objective_met?: boolean;
  readonly telemetry_stop_criteria_configured?: boolean;
  readonly verification_timestamp?: string;
  readonly evidence_ref?: string;
  readonly failure_reason?: string;
  readonly version_binding_ref?: string;
  readonly is_stale?: boolean;
}

/**
 * Upstream architectural governance state across Phases 1C.5a through 1C.5g.
 */
export interface UpstreamGovernanceState {
  readonly reasoning_lifecycle_stages_completed?: number; // e.g. 14
  readonly principles_complied?: boolean; // 21 Principles
  readonly causal_explainability_verified?: boolean;
  readonly provenance_intact?: boolean;
  readonly ungrounded_reasoning_detected?: boolean;
  readonly candidate_lesson_quarantined?: boolean;
  readonly upstream_violations?: readonly string[]; // Active violations across 1C.5a–1C.5g
}

/**
 * Input parameters for Production Readiness Synthesis (Record 20).
 */
export interface ProductionReadinessSynthesisInput {
  readonly packageRecord: ValidationPackage;
  readonly scopeRecord: ValidationScopeRecord;
  readonly requestedScope?: readonly string[];
  readonly versionBinding?: ValidationVersionBindingRecord;
  readonly validationOutcome?: ValidationOutcomeRecord;
  readonly objectiveEvidence?: readonly ObjectiveEvidenceRecord[];
  readonly perceptualEvaluations?: readonly PerceptualEvaluationRecord[];
  readonly uatEvaluations?: readonly UATEvaluationRecord[];
  readonly regressionAssessments?: readonly RegressionAssessmentRecord[];
  readonly failureAttributions?: readonly ValidationFailureRecord[];
  readonly evidenceConflicts?: readonly EvidenceConflictRecord[];
  readonly uncertaintyRecords?: readonly ValidationUncertaintyRecord[];
  readonly fixtureRecords?: readonly ValidationFixtureRecord[];
  readonly executionRecords?: readonly ValidationExecutionRecord[];
  readonly availableCases?: readonly ValidationCase[];
  readonly rollbackEvidence?: RollbackVerificationEvidence;
  readonly upstreamGovernanceState?: UpstreamGovernanceState;
  readonly timestamp?: string;
  readonly graph?: ValidationRelationshipGraph;
  readonly auditLedger?: ValidationAuditLedger;
}

/**
 * Result returned by the ProductionReadinessSynthesizer.
 */
export interface ProductionReadinessSynthesisResult {
  readonly assessmentRecord: ProductionReadinessAssessmentRecord;
  readonly pillarEvaluations: PillarEvaluations;
  readonly hardBlockersPresent: readonly string[];
  readonly gate8Eligible: boolean;
  readonly synthesisRationale: string;
}
