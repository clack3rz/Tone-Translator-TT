// src/sound-engineer/validation/uncertainty/uncertaintyTypes.ts
// Phase 1C.5h WP-18: Uncertainty Modeling & Risk Accounting Type Definitions.
// Bound to frozen specification v0.1j Section 22.3, Table 15, Axiom 4, and Implementation Plan v0.1h WP-18.

import {
  UNCERTAINTY_SOURCES,
  UncertaintySource,
  UNCERTAINTY_GATE_8_IMPACTS,
  UncertaintyGate8Impact,
} from "../schemas/enums";
import {
  EvidenceConflictRecord,
  ValidationFailureRecord,
  ValidationPackage,
  ValidationScopeRecord,
  ValidationUncertaintyRecord,
} from "../schemas/records";

export {
  UNCERTAINTY_SOURCES,
  type UncertaintySource,
  UNCERTAINTY_GATE_8_IMPACTS,
  type UncertaintyGate8Impact,
  type ValidationUncertaintyRecord,
};

/**
 * Input parameters supplied to a governed RiskProfile for evaluation.
 */
export interface UncertaintyEvaluationInput {
  readonly uncertaintySource: UncertaintySource;
  readonly affectedScope: ReadonlyArray<string>;
  readonly packageId: string;
  readonly severity?: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  readonly details?: string;
  readonly residualUncertaintyScore?: number | string;
  readonly conflictRecord?: EvidenceConflictRecord;
  readonly failureRecord?: ValidationFailureRecord;
  readonly sampleSizeActual?: number;
  readonly sampleSizeRequired?: number;
  readonly untestedDomainElements?: ReadonlyArray<string>;
  readonly proposedMonitoring?: ReadonlyArray<string>;
}

/**
 * Result of a governed production risk profile evaluation.
 * Note: internalCalculatedRiskScore is purely internal for auditing and NEVER persisted to Record 16.
 */
export interface GovernedRiskEvaluationResult {
  readonly potentialProductionRisk: string;
  readonly gate8Impact: UncertaintyGate8Impact;
  readonly requiredMonitoringIfAuthorized: ReadonlyArray<string>;
  readonly internalCalculatedRiskScore?: number;
}

/**
 * Governed production risk profile interface.
 * Implements deterministic risk analysis for specific evaluation domains.
 */
export interface RiskProfile {
  readonly profileRef: string;
  readonly description: string;
  readonly domain?: string;
  readonly evaluateRisk: (input: UncertaintyEvaluationInput) => GovernedRiskEvaluationResult;
}

/**
 * Comprehensive input for creating an immutable ValidationUncertaintyRecord (Record 16).
 */
export interface RecordUncertaintyInput {
  readonly uncertaintyId?: string;
  readonly packageId: string;
  readonly packageRecord?: ValidationPackage;
  readonly scopeRecord?: ValidationScopeRecord;
  readonly uncertaintySource: UncertaintySource;
  readonly affectedScope: ReadonlyArray<string>;
  readonly riskProfileRef: string;
  readonly details?: string;
  readonly severity?: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  readonly residualUncertaintyScore?: number | string;
  readonly conflictRecord?: EvidenceConflictRecord;
  readonly failureRecord?: ValidationFailureRecord;
  readonly sampleSizeActual?: number;
  readonly sampleSizeRequired?: number;
  readonly untestedDomainElements?: ReadonlyArray<string>;
  readonly customPotentialRisk?: string;
  readonly customGate8Impact?: UncertaintyGate8Impact;
  readonly customRequiredMonitoring?: ReadonlyArray<string>;
}

/**
 * Specific input for MISSING_EVIDENCE uncertainty.
 */
export interface MissingEvidenceInput {
  readonly uncertaintyId?: string;
  readonly packageId: string;
  readonly packageRecord?: ValidationPackage;
  readonly scopeRecord?: ValidationScopeRecord;
  readonly affectedScope: ReadonlyArray<string>;
  readonly riskProfileRef: string;
  readonly missingEvidenceDescription: string;
  readonly severity?: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  readonly customPotentialRisk?: string;
  readonly customGate8Impact?: UncertaintyGate8Impact;
  readonly customRequiredMonitoring?: ReadonlyArray<string>;
}

/**
 * Specific input for CONFLICTING_EVIDENCE uncertainty.
 */
export interface ConflictingEvidenceInput {
  readonly uncertaintyId?: string;
  readonly packageId: string;
  readonly packageRecord?: ValidationPackage;
  readonly scopeRecord?: ValidationScopeRecord;
  readonly conflictRecord: EvidenceConflictRecord;
  readonly riskProfileRef: string;
  readonly affectedScope?: ReadonlyArray<string>;
  readonly details?: string;
  readonly severity?: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  readonly customPotentialRisk?: string;
  readonly customGate8Impact?: UncertaintyGate8Impact;
  readonly customRequiredMonitoring?: ReadonlyArray<string>;
}

/**
 * Specific input for INSUFFICIENT_SAMPLE_SIZE uncertainty.
 */
export interface InsufficientSampleSizeInput {
  readonly uncertaintyId?: string;
  readonly packageId: string;
  readonly packageRecord?: ValidationPackage;
  readonly scopeRecord?: ValidationScopeRecord;
  readonly affectedScope: ReadonlyArray<string>;
  readonly riskProfileRef: string;
  readonly sampleSizeActual: number;
  readonly sampleSizeRequired: number;
  readonly details?: string;
  readonly severity?: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  readonly customPotentialRisk?: string;
  readonly customGate8Impact?: UncertaintyGate8Impact;
  readonly customRequiredMonitoring?: ReadonlyArray<string>;
}

/**
 * Specific input for UNTESTED_EDGE_DOMAIN uncertainty.
 */
export interface UntestedEdgeDomainInput {
  readonly uncertaintyId?: string;
  readonly packageId: string;
  readonly packageRecord?: ValidationPackage;
  readonly scopeRecord?: ValidationScopeRecord;
  readonly affectedScope: ReadonlyArray<string>;
  readonly riskProfileRef: string;
  readonly untestedDomainElements: ReadonlyArray<string>;
  readonly details?: string;
  readonly severity?: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  readonly customPotentialRisk?: string;
  readonly customGate8Impact?: UncertaintyGate8Impact;
  readonly customRequiredMonitoring?: ReadonlyArray<string>;
}

/**
 * Specific input for CALIBRATION_AMBIGUITY uncertainty.
 */
export interface CalibrationAmbiguityInput {
  readonly uncertaintyId?: string;
  readonly packageId: string;
  readonly packageRecord?: ValidationPackage;
  readonly scopeRecord?: ValidationScopeRecord;
  readonly affectedScope: ReadonlyArray<string>;
  readonly riskProfileRef: string;
  readonly fixtureRef?: string;
  readonly calibrationDivergenceDescription: string;
  readonly details?: string;
  readonly severity?: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  readonly customPotentialRisk?: string;
  readonly customGate8Impact?: UncertaintyGate8Impact;
  readonly customRequiredMonitoring?: ReadonlyArray<string>;
}

/**
 * Specific input for UNKNOWN_FAILURE_CAUSE uncertainty.
 */
export interface UnknownFailureCauseInput {
  readonly uncertaintyId?: string;
  readonly packageId: string;
  readonly packageRecord?: ValidationPackage;
  readonly scopeRecord?: ValidationScopeRecord;
  readonly failureRecord: ValidationFailureRecord;
  readonly riskProfileRef: string;
  readonly residualRiskEvidence: string;
  readonly affectedScope?: ReadonlyArray<string>;
  readonly details?: string;
  readonly severity?: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  readonly customPotentialRisk?: string;
  readonly customGate8Impact?: UncertaintyGate8Impact;
  readonly customRequiredMonitoring?: ReadonlyArray<string>;
}

/**
 * Specific input for TARGET_PLATFORM_VERSION_INSTABILITY uncertainty.
 */
export interface TargetPlatformVersionInstabilityInput {
  readonly uncertaintyId?: string;
  readonly packageId: string;
  readonly packageRecord?: ValidationPackage;
  readonly scopeRecord?: ValidationScopeRecord;
  readonly affectedScope: ReadonlyArray<string>;
  readonly riskProfileRef: string;
  readonly targetPlatformName: string;
  readonly targetVersion: string;
  readonly instabilityDescription: string;
  readonly details?: string;
  readonly severity?: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  readonly customPotentialRisk?: string;
  readonly customGate8Impact?: UncertaintyGate8Impact;
  readonly customRequiredMonitoring?: ReadonlyArray<string>;
}

/**
 * Emission result when an uncertainty finding is recorded.
 */
export interface UncertaintyRecordResult {
  readonly uncertaintyRecord: ValidationUncertaintyRecord;
  readonly evaluation: GovernedRiskEvaluationResult;
  readonly isForcesBlock: boolean;
  readonly isAllowsConditional: boolean;
  readonly isAcceptableLowRisk: boolean;
}
