// src/sound-engineer/validation/evaluation/acousticEvaluationTypes.ts
// Authoritative types and interfaces for Phase 1C.5h WP-14:
// Multi-Dimensional Acoustic Evaluation & Orthogonal Tolerance Engine.
// Bound to frozen specification v0.1j Section 19, Invariant 2, Invariant 7, and Plan Override v0.1h.

import { MetricToleranceRule } from "../evidence/objectiveTypes";

/**
 * The six mutually orthogonal acoustic evaluation dimensions governed by Section 19.2.
 * CRITICAL GOVERNANCE: These dimensions must remain independent.
 * Anti-Scalar Collapse: No scalar composite or averaging allowed.
 */
export const ACOUSTIC_EVALUATION_DIMENSIONS = {
  SPECTRAL: "SPECTRAL",
  DYNAMIC: "DYNAMIC",
  HARMONIC: "HARMONIC",
  PHASE: "PHASE",
  PLAYABILITY: "PLAYABILITY",
  MIX_CONTEXT: "MIX_CONTEXT",
} as const;

export type AcousticEvaluationDimension =
  (typeof ACOUSTIC_EVALUATION_DIMENSIONS)[keyof typeof ACOUSTIC_EVALUATION_DIMENSIONS];

export const ALL_ACOUSTIC_DIMENSIONS: ReadonlyArray<AcousticEvaluationDimension> = [
  ACOUSTIC_EVALUATION_DIMENSIONS.SPECTRAL,
  ACOUSTIC_EVALUATION_DIMENSIONS.DYNAMIC,
  ACOUSTIC_EVALUATION_DIMENSIONS.HARMONIC,
  ACOUSTIC_EVALUATION_DIMENSIONS.PHASE,
  ACOUSTIC_EVALUATION_DIMENSIONS.PLAYABILITY,
  ACOUSTIC_EVALUATION_DIMENSIONS.MIX_CONTEXT,
] as const;

/**
 * Applicability states for individual acoustic dimensions.
 * Distinguishes clearly between applicable evaluated, applicable missing evidence,
 * not applicable, and unevaluable due to missing tolerance criteria.
 */
export const DIMENSION_APPLICABILITY_STATES = {
  APPLICABLE_EVALUATED: "APPLICABLE_EVALUATED",
  APPLICABLE_MISSING_EVIDENCE: "APPLICABLE_MISSING_EVIDENCE",
  NOT_APPLICABLE: "NOT_APPLICABLE",
  UNEVALUABLE_MISSING_TOLERANCE: "UNEVALUABLE_MISSING_TOLERANCE",
} as const;

export type DimensionApplicabilityState =
  (typeof DIMENSION_APPLICABILITY_STATES)[keyof typeof DIMENSION_APPLICABILITY_STATES];

/**
 * Status resulting from evaluating an orthogonal dimension.
 */
export const DIMENSION_EVALUATION_STATUSES = {
  MET: "MET",
  FAILED: "FAILED",
  BORDERLINE: "BORDERLINE",
  UNEVALUABLE: "UNEVALUABLE",
  NOT_APPLICABLE: "NOT_APPLICABLE",
} as const;

export type DimensionEvaluationStatus =
  (typeof DIMENSION_EVALUATION_STATUSES)[keyof typeof DIMENSION_EVALUATION_STATUSES];

/**
 * Governed tolerance criteria specification for a single orthogonal dimension.
 * Criticality is profile/tolerance governed (never hardcoded as universally critical).
 */
export interface DimensionToleranceSpec {
  readonly dimension: AcousticEvaluationDimension;
  readonly toleranceSpecRef: string;
  readonly isCritical: boolean;
  readonly gearTopology?: string;
  readonly targetComponentClass?: string;
  readonly rules: ReadonlyArray<MetricToleranceRule>;
  readonly qualitativeCriteria?: ReadonlyArray<string>;
  readonly description?: string;
}

/**
 * Preserved evaluation outcome for an individual orthogonal dimension.
 * Maintains dimensional independence, evidence linkage, and failure reasons losslessly.
 */
export interface DimensionEvaluationResult {
  readonly dimension: AcousticEvaluationDimension;
  readonly applicabilityState: DimensionApplicabilityState;
  readonly evaluationStatus: DimensionEvaluationStatus;
  readonly isCritical: boolean;
  readonly toleranceSpecRef?: string;
  readonly evidenceRefs: ReadonlyArray<string>;
  readonly objectiveEvidenceRefs: ReadonlyArray<string>;
  readonly perceptualEvidenceRefs: ReadonlyArray<string>;
  readonly observedDeltas: Readonly<Record<string, number>>;
  readonly findings: ReadonlyArray<string>;
  readonly failureReason?: string;
  readonly unevaluableReason?: string;
}

/**
 * State representing the overall evaluation synthesis without scalar collapse.
 */
export const ACOUSTIC_SYNTHESIS_STATES = {
  FULLY_EVALUABLE: "FULLY_EVALUABLE",
  CRITICAL_FAILURE_PRESENT: "CRITICAL_FAILURE_PRESENT",
  NON_CRITICAL_FAILURE_PRESENT: "NON_CRITICAL_FAILURE_PRESENT",
  PARTIALLY_UNEVALUABLE: "PARTIALLY_UNEVALUABLE",
  COMPLETELY_UNEVALUABLE: "COMPLETELY_UNEVALUABLE",
  NO_APPLICABLE_DIMENSIONS: "NO_APPLICABLE_DIMENSIONS",
} as const;

export type AcousticSynthesisState =
  (typeof ACOUSTIC_SYNTHESIS_STATES)[keyof typeof ACOUSTIC_SYNTHESIS_STATES];

/**
 * Internal immutable evaluation result produced by AcousticEvaluationSynthesizer.
 * NOTE: WP-14 does NOT own a new 23rd record; this is a typed internal synthesis bundle.
 * Anti-Scalar Collapse: Does NOT include scalar averages, composite scores, or percentage grades.
 */
export interface AcousticEvaluationSynthesis {
  readonly evaluationId: string;
  readonly caseRef: string;
  readonly packageRef?: string;
  readonly componentClass?: string;
  readonly gearTopology?: string;
  readonly synthesisState: AcousticSynthesisState;
  readonly hasCriticalFailure: boolean;
  readonly perDimensionResults: Readonly<Record<AcousticEvaluationDimension, DimensionEvaluationResult>>;
  readonly applicableDimensions: ReadonlyArray<AcousticEvaluationDimension>;
  readonly evaluatedDimensions: ReadonlyArray<AcousticEvaluationDimension>;
  readonly failingDimensions: ReadonlyArray<AcousticEvaluationDimension>;
  readonly criticalFailingDimensions: ReadonlyArray<AcousticEvaluationDimension>;
  readonly unevaluableDimensions: ReadonlyArray<AcousticEvaluationDimension>;
  readonly allEvidenceRefs: ReadonlyArray<string>;
  readonly synthesisTimestamp: string;
}
