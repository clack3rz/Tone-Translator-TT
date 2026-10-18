// src/sound-engineer/validation/regression/regressionTypes.ts
// Authoritative types and interfaces for Phase 1C.5h WP-15:
// Tripartite Differential Comparison & Regression Detection Engine (Record 13).
// Bound to frozen specification v0.1j Section 13, Section 34, and Implementation Plan v0.1h WP-15.

import {
  RegressionAssessmentRecord,
  ValidationPackage,
  ValidationScopeRecord,
  ValidationVersionBindingRecord,
  ValidationFixtureRecord,
  ValidationExecutionRecord,
  ObjectiveEvidenceRecord,
  PerceptualEvaluationRecord,
} from "../schemas/records";
import {
  RegressionClassification,
  MaterialityScore,
  RegressionDomain,
} from "../schemas/enums";
import { AcousticEvaluationSynthesis } from "../evaluation/acousticEvaluationTypes";
import { RelationshipEdge } from "../graph/edgeTypes";

/**
 * Entity kinds participating in pairwise comparisons.
 */
export type ComparisonEntityKind = "Candidate" | "LegacyOutput" | "GoldenReference";

/**
 * A single pairwise differential comparison result.
 */
export interface PairwiseComparison {
  readonly comparisonId: string;
  readonly sourceEntityId: string;
  readonly sourceEntityKind: ComparisonEntityKind;
  readonly targetEntityId: string;
  readonly targetEntityKind: ComparisonEntityKind;
  readonly divergenceDetected: boolean;
  readonly divergenceMagnitude: number | string;
  readonly metricsDelta: Readonly<Record<string, number | string>>;
  readonly notes: ReadonlyArray<string>;
}

/**
 * The complete tripartite comparison containing all three independent comparisons.
 * A: Candidate vs PATH-PROD
 * B: Candidate vs Golden Reference
 * C: PATH-PROD vs Golden Reference
 */
export interface TripartiteComparisonResult {
  readonly comparisonId: string;
  readonly candidateVsLegacy: PairwiseComparison;
  readonly candidateVsGolden: PairwiseComparison;
  readonly legacyVsGolden: PairwiseComparison;
  readonly primaryDivergenceDetected: boolean;
  readonly primaryDivergenceMagnitude: number | string;
  readonly timestamp: string;
}

/**
 * Governed materiality threshold bounds.
 */
export interface MaterialityThresholds {
  readonly highThreshold: number;
  readonly mediumThreshold: number;
  readonly lowThreshold: number;
}

/**
 * A governed materiality profile binding domain-specific thresholds.
 */
export interface MaterialityProfile {
  readonly materialityProfileRef: string;
  readonly regressionDomain: RegressionDomain;
  readonly thresholds: MaterialityThresholds;
  readonly description: string;
  readonly isGate8BlockingMateriality: (materiality: MaterialityScore) => boolean;
}

/**
 * Governed declaration of intentional architectural correction.
 */
export interface IntentionalCorrectionIntent {
  readonly intentId: string;
  readonly rationale: string;
  readonly approvedChangeRef: string;
  readonly isAuthorized: boolean;
  readonly targetBehaviorDiffSummary?: string;
}

/**
 * Comparison evidence associated with the migration candidate.
 */
export interface CandidateComparisonData {
  readonly execution?: ValidationExecutionRecord;
  readonly objectiveEvidence?: ReadonlyArray<ObjectiveEvidenceRecord>;
  readonly perceptualEvidence?: ReadonlyArray<PerceptualEvaluationRecord>;
  readonly acousticSynthesis?: AcousticEvaluationSynthesis;
  readonly renderedBuffer?: Uint8Array;
}

/**
 * Baseline data associated with PATH-PROD legacy production output.
 */
export interface LegacyOutputData {
  readonly outputId: string;
  readonly executionId?: string;
  readonly objectiveEvidence?: ReadonlyArray<ObjectiveEvidenceRecord>;
  readonly perceptualEvidence?: ReadonlyArray<PerceptualEvaluationRecord>;
  readonly acousticSynthesis?: AcousticEvaluationSynthesis;
  readonly renderedBuffer?: Uint8Array;
}

/**
 * Governed Golden Reference benchmark fixture data.
 */
export interface GoldenReferenceData {
  readonly fixtureRecord: ValidationFixtureRecord;
  readonly payload?: Uint8Array;
  readonly referenceMetrics?: Readonly<Record<string, number | string>>;
}

/**
 * Input parameters for DifferentialAuditingEngine.
 */
export interface DifferentialAuditorInput {
  readonly packageRecord: ValidationPackage;
  readonly scopeRecord: ValidationScopeRecord;
  readonly versionBindingRecord: ValidationVersionBindingRecord;
  readonly candidateData: CandidateComparisonData;
  readonly legacyOutput: LegacyOutputData;
  readonly goldenReference: GoldenReferenceData;
  readonly materialityProfileRef: string;
  readonly regressionDomain?: RegressionDomain;
  readonly intentionalCorrectionIntent?: IntentionalCorrectionIntent;
  readonly customComparisonTarget?: string;
}

/**
 * Result emitted by DifferentialAuditingEngine.
 */
export interface DifferentialAuditResult {
  readonly record: RegressionAssessmentRecord;
  readonly tripartiteComparison: TripartiteComparisonResult;
  readonly edgesCreated: ReadonlyArray<RelationshipEdge>;
}
