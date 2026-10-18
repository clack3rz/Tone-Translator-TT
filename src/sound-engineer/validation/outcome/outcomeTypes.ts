// src/sound-engineer/validation/outcome/outcomeTypes.ts
// Phase 1C.5h WP-19: Governed Validation Outcome Synthesis & Decision Engine Type Definitions.
// Bound to frozen specification v0.1j Section 23, Table 11, Table 13, and Implementation Plan v0.1h WP-19.

import {
  VALIDATION_OUTCOME_CLASSES,
  ValidationOutcomeClass,
} from "../schemas/enums";
import {
  EvidenceConflictRecord,
  ObjectiveEvidenceRecord,
  PerceptualEvaluationRecord,
  RegressionAssessmentRecord,
  UATEvaluationRecord,
  ValidationExecutionRecord,
  ValidationFailureRecord,
  ValidationOutcomeRecord,
  ValidationPackage,
  ValidationScopeRecord,
  ValidationUncertaintyRecord,
  ValidationVersionBindingRecord,
} from "../schemas/records";
import { RelationshipEdge } from "../graph/edgeTypes";
import { ProfileApplicabilityResult } from "../profiles/types";
import { UncertaintyThresholdProfile } from "./uncertaintyThresholdResolver";

export {
  VALIDATION_OUTCOME_CLASSES,
  type ValidationOutcomeClass,
  type ValidationOutcomeRecord,
};

/**
 * The eight canonical production-readiness hard blockers defined in frozen Table 13.
 * These represent governed blocking conditions that disqualify a candidate from clean PASS.
 */
export const GOVERNED_HARD_BLOCKERS = {
  BLOCK_01_REGRESSION: "BLOCK-01: Regression",
  BLOCK_02_EXPORT_CRASH: "BLOCK-02: Export Crash",
  BLOCK_03_ROLLBACK_FAIL: "BLOCK-03: Rollback Fail",
  BLOCK_04_PROVENANCE: "BLOCK-04: Provenance",
  BLOCK_05_INSTABILITY: "BLOCK-05: Instability",
  BLOCK_06_SCOPE_INFLATION: "BLOCK-06: Scope Inflation",
  BLOCK_07_CONTAMINATION: "BLOCK-07: Contamination",
  BLOCK_08_UNCERTAINTY: "BLOCK-08: Uncertainty",
} as const;

export type GovernedHardBlocker =
  (typeof GOVERNED_HARD_BLOCKERS)[keyof typeof GOVERNED_HARD_BLOCKERS];

/**
 * Structured breakdown of objective evidence for Record 17 objective_summary.
 */
export interface ObjectiveSummaryData {
  readonly total_evaluations: number;
  readonly passed_count: number;
  readonly failed_count: number;
  readonly borderline_count: number;
  readonly not_applicable_count: number;
  readonly by_category: Record<
    string,
    { passed: number; failed: number; borderline: number; not_applicable: number }
  >;
  readonly out_of_tolerance_metrics: ReadonlyArray<{
    readonly metric_category: string;
    readonly execution_id: string;
    readonly delta: number;
    readonly tolerance_evaluation: string;
  }>;
}

/**
 * Structured breakdown of perceptual evidence for Record 17 perceptual_summary.
 */
export interface PerceptualSummaryData {
  readonly total_evaluations: number;
  readonly pass_count: number;
  readonly fail_count: number;
  readonly inconclusive_count: number;
  readonly by_role: Record<
    string,
    { pass: number; fail: number; inconclusive: number }
  >;
  readonly evaluations: ReadonlyArray<{
    readonly perceptual_evidence_id: string;
    readonly evaluator_role: string;
    readonly methodology: string;
    readonly evaluation_outcome: string;
    readonly confidence: string;
  }>;
}

/**
 * Structured breakdown of UAT evidence for Record 17 uat_summary.
 */
export interface UATSummaryData {
  readonly total_scenarios: number;
  readonly completed_successfully_count: number;
  readonly completed_with_friction_count: number;
  readonly failed_count: number;
  readonly fitness_accepted_count: number;
  readonly fitness_rejected_count: number;
  readonly fitness_conditionally_accepted_count: number;
  readonly blockers_identified: ReadonlyArray<string>;
}

/**
 * Structured breakdown of regression evidence for Record 17 regression_summary.
 */
export interface RegressionSummaryData {
  readonly total_assessments: number;
  readonly intentional_correction_count: number;
  readonly neutral_divergence_count: number;
  readonly genuine_regression_count: number;
  readonly unresolved_count: number;
  readonly material_genuine_regression_count: number;
  readonly blocks_gate_8_count: number;
}

/**
 * Comprehensive input supplied to the ValidationOutcomeSynthesizer.
 */
export interface SynthesizeOutcomeInput {
  /** Optional deterministic outcome record ID */
  readonly outcomeId?: string;

  /** The governing ValidationPackage (Record 06) */
  readonly packageRecord: ValidationPackage;

  /** The governing ValidationScopeRecord (Record 02) */
  readonly scopeRecord: ValidationScopeRecord;

  /** The governing ValidationVersionBindingRecord (Record 03) */
  readonly versionBindingRecord: ValidationVersionBindingRecord;

  /** Executions performed under this package */
  readonly executionRecords?: ReadonlyArray<ValidationExecutionRecord>;

  /** Objective evidence records (Record 10) */
  readonly objectiveEvidence?: ReadonlyArray<ObjectiveEvidenceRecord>;

  /** Perceptual evaluation records (Record 11) */
  readonly perceptualEvidence?: ReadonlyArray<PerceptualEvaluationRecord>;

  /** UAT evaluation records (Record 12) */
  readonly uatEvidence?: ReadonlyArray<UATEvaluationRecord>;

  /** Regression assessment records (Record 13) */
  readonly regressionAssessments?: ReadonlyArray<RegressionAssessmentRecord>;

  /** Competing evidence conflict records (Record 15) */
  readonly conflictRecords?: ReadonlyArray<EvidenceConflictRecord>;

  /** Preserved uncertainty records (Record 16) */
  readonly uncertaintyRecords?: ReadonlyArray<ValidationUncertaintyRecord>;

  /** Validation failure records (Record 14) */
  readonly failureRecords?: ReadonlyArray<ValidationFailureRecord>;

  /** Governed applicability result from WP-07 (optional; computed automatically if omitted) */
  readonly applicabilityResult?: ProfileApplicabilityResult;

  /** Declared active hard blockers (Table 13) */
  readonly hardBlockersPresent?: ReadonlyArray<string>;

  /** Explicit operational rollback verification flag */
  readonly rollbackOperationalityVerified?: boolean;

  /** Validation intake verification flag (default true) */
  readonly intakeAccepted?: boolean;

  /** Tamper-evident 1C.5f provenance seal verification flag (default true) */
  readonly provenanceVerified?: boolean;

  /** Fixture calibration and contamination status flag (default true) */
  readonly fixturesVerified?: boolean;

  /** Target platform preset export loading verification flag (default true) */
  readonly targetPlatformExportVerified?: boolean;

  /** Governed uncertainty threshold profile reference */
  readonly uncertaintyThresholdProfileRef?: string;

  /** Custom or supplementary conditions imposed for CONDITIONAL outcomes */
  readonly customConditions?: ReadonlyArray<string>;

  /** Optional technical summary verdict override */
  readonly summaryVerdictOverride?: string;
}

/**
 * Comprehensive result of outcome synthesis.
 */
export interface OutcomeSynthesisResult {
  /** The immutable, deep-frozen, cryptographically sealed ValidationOutcomeRecord (Record 17) */
  readonly outcomeRecord: ValidationOutcomeRecord;

  /** The synthesized exact outcome class */
  readonly outcomeClass: ValidationOutcomeClass;

  /** Convenience boolean flags */
  readonly isPass: boolean;
  readonly isFail: boolean;
  readonly isBlocked: boolean;
  readonly isConditional: boolean;

  /** Active hard blockers identified during synthesis */
  readonly activeBlockers: ReadonlyArray<string>;

  /** Open unresolved issues (conflicts, residual risks, material failures) */
  readonly unresolvedIssues: ReadonlyArray<string>;

  /** Mandatory conditions imposed if CONDITIONAL */
  readonly conditionsImposed: ReadonlyArray<string>;

  /** Synthesis technical narrative */
  readonly summaryVerdict: string;

  /** Profile applicability diagnostics */
  readonly applicabilityDiagnostics: ReadonlyArray<string>;

  /** Relationship graph edges created during synthesis */
  readonly edgesCreated: ReadonlyArray<RelationshipEdge>;
}
