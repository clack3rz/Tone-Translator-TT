// src/sound-engineer/validation/conflicts/conflictTypes.ts
// Phase 1C.5h WP-17: Evidence Conflict Preservation & Resolution Accounting Types (Record 15).
// Bound to frozen specification v0.1j Section 22, Table 15, Axiom 4, and Implementation Plan v0.1h WP-17.

import {
  ConflictType,
  ConflictResolutionStrategy,
  ConflictResolutionStatus,
  PerceptualConfidenceLevel,
  CONFLICT_TYPES,
  CONFLICT_RESOLUTION_STRATEGIES,
  CONFLICT_RESOLUTION_STATUSES,
  PERCEPTUAL_CONFIDENCE_LEVELS,
} from "../schemas/enums";
import {
  ObjectiveEvidenceRecord,
  PerceptualEvaluationRecord,
  ValidationPackage,
  ValidationScopeRecord,
  ValidationVersionBindingRecord,
  ValidationExecutionRecord,
  EvidenceConflictRecord,
} from "../schemas/records";
import { RelationshipEdge, GraphEdgeEndpoint } from "../graph/edgeTypes";

/**
 * Governed triggers specifying when objective and perceptual evidence conflict.
 */
export interface ConflictDetectionTriggers {
  readonly detectObjectivePassPerceptualFail: boolean;
  readonly detectPerceptualPassObjectiveFail: boolean;
  readonly minPerceptualConfidenceForConflict?: PerceptualConfidenceLevel;
  readonly minObjectiveDeltaSignificance?: number;
}

/**
 * Governed conflict detection profile definition.
 * Prohibits hardcoded universal percentages or universal dB thresholds.
 */
export interface ConflictDetectionProfile {
  readonly profileRef: string;
  readonly description?: string;
  readonly triggers: ConflictDetectionTriggers;
  readonly defaultResolutionStrategy: ConflictResolutionStrategy;
  readonly defaultResolutionStatus: ConflictResolutionStatus;
  readonly defaultUnderlyingAcousticPhenomenon?: string;
  readonly calculateResidualUncertainty?: (
    objective: ObjectiveEvidenceRecord,
    perceptual: PerceptualEvaluationRecord
  ) => number | string;
}

/**
 * Input for detecting conflict between objective and perceptual evidence.
 */
export interface EvidenceConflictDetectorInput {
  readonly packageRecord: ValidationPackage;
  readonly objectiveEvidence: ObjectiveEvidenceRecord;
  readonly perceptualEvidence: PerceptualEvaluationRecord;
  readonly conflictDetectionProfileRef: string;
  readonly scopeRecord?: ValidationScopeRecord;
  readonly versionBindingRecord?: ValidationVersionBindingRecord;
  readonly executionRecord?: ValidationExecutionRecord;
  readonly customConflictId?: string;
  readonly customConflictType?: ConflictType;
  readonly customResolutionStrategy?: ConflictResolutionStrategy;
  readonly customUnderlyingAcousticPhenomenon?: string;
  readonly customDescription?: string;
  readonly customResidualUncertainty?: number | string;
}

/**
 * Input for documenting internal evidence disagreement (Type C: Reviewer, Type D: Metric-vs-Metric)
 * within Record 15 without widening the canonical graph endpoint contract.
 */
export interface DisagreementEvidenceInput {
  readonly packageRecord: ValidationPackage;
  readonly conflictType: ConflictType;
  readonly competingEvidenceRefs: ReadonlyArray<string>;
  readonly conflictDescription: string;
  readonly underlyingAcousticPhenomenon?: string;
  readonly conflictDetectionProfileRef: string;
  readonly customConflictId?: string;
  readonly customResolutionStrategy?: ConflictResolutionStrategy;
  readonly customResidualUncertainty?: number | string;
}

/**
 * Complete result returned by EvidenceConflictDetector.
 */
export interface EvidenceConflictDetectionResult {
  readonly hasConflict: boolean;
  readonly conflictType?: ConflictType;
  readonly record?: EvidenceConflictRecord;
  readonly edge?: RelationshipEdge;
  readonly objectiveEndpoint?: GraphEdgeEndpoint;
  readonly perceptualEndpoint?: GraphEdgeEndpoint;
  readonly resolutionStrategy?: ConflictResolutionStrategy;
  readonly resolutionStatus?: ConflictResolutionStatus;
}
